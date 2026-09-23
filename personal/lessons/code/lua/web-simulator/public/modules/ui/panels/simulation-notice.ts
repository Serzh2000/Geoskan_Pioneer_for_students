/*
 * Renderer for script/mission notices produced by
 * app/script-execution-notice.ts (untouched - it still calls
 * window.showSimulationNotice(payload, fallbackLevel) exactly as before).
 *
 * Rendering itself was redone: instead of one big docked banner, each
 * notice spawns a small colored toast (viewport-fixed, top-right) that
 * fades out after 3s. At most 3 toasts are stacked at once - a 4th makes
 * the oldest fade immediately. Every notice is also kept in a scrollable
 * history, browsable via the bell-icon notification center next to the
 * editor's terminal button (see editor-terminal.ts).
 */
import { EDITOR_DRAWER_OPEN_EVENT, announceEditorDrawerOpen } from './editor-drawers.js';

type NoticeLevel = 'warn' | 'info' | 'error';

type SimulationNoticePayload = string | {
    title?: string;
    message: string;
    detailsHtml?: string;
    level?: NoticeLevel;
};

type NoticeRecord = {
    title: string;
    message: string;
    detailsHtml: string;
    level: NoticeLevel;
    time: string;
};

const MAX_NOTICE_HISTORY = 50;
const TOAST_LIFETIME_MS = 3000;
const MAX_VISIBLE_TOASTS = 3;

const LEVEL_LABELS: Record<NoticeLevel, string> = {
    error: 'Ошибка',
    warn: 'Предупреждение',
    info: 'Инфо'
};

const notices: NoticeRecord[] = [];

function ensureToastStack(): HTMLElement {
    let stack = document.getElementById('simulation-toast-stack');
    if (!stack) {
        stack = document.createElement('div');
        stack.id = 'simulation-toast-stack';
        stack.className = 'simulation-toast-stack';
        document.body.appendChild(stack);
    }
    return stack;
}

function dismissToast(toast: HTMLElement) {
    // A toast evicted before its entrance rAF ever added `is-visible` has no
    // transition to wait for - removing the class wouldn't fire
    // transitionend, leaving it stuck in the DOM forever.
    if (!toast.classList.contains('is-visible')) {
        toast.remove();
        return;
    }
    toast.classList.remove('is-visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
}

function spawnToast(notice: NoticeRecord) {
    const stack = ensureToastStack();

    const existing = Array.from(stack.children) as HTMLElement[];
    if (existing.length >= MAX_VISIBLE_TOASTS) {
        dismissToast(existing[0]);
    }

    const toast = document.createElement('div');
    toast.className = `simulation-toast simulation-toast--${notice.level}`;

    const title = document.createElement('div');
    title.className = 'simulation-toast__title';
    title.textContent = notice.title;

    const message = document.createElement('div');
    message.className = 'simulation-toast__message';
    message.textContent = notice.message;

    toast.append(title, message);
    toast.addEventListener('click', () => {
        window.clearTimeout(hideTimer);
        dismissToast(toast);
    });

    stack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    const hideTimer = window.setTimeout(() => dismissToast(toast), TOAST_LIFETIME_MS);
}

function renderNotificationCenter(list: HTMLElement) {
    if (notices.length === 0) {
        list.innerHTML = '<div class="editor-notifications__empty">Уведомлений нет.</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    for (let i = notices.length - 1; i >= 0; i--) {
        const notice = notices[i];
        const item = document.createElement('article');
        item.className = `editor-notifications__item editor-notifications__item--${notice.level}`;

        const meta = document.createElement('div');
        meta.className = 'editor-notifications__meta';
        meta.textContent = `[${notice.time}] ${LEVEL_LABELS[notice.level]}`;

        const title = document.createElement('div');
        title.className = 'editor-notifications__item-title';
        title.textContent = notice.title;

        const message = document.createElement('div');
        message.className = 'editor-notifications__item-message';
        message.textContent = notice.message;

        item.append(meta, title, message);

        if (notice.detailsHtml) {
            const details = document.createElement('div');
            details.className = 'editor-notifications__item-details';
            details.innerHTML = notice.detailsHtml;
            item.appendChild(details);
        }

        fragment.appendChild(item);
    }
    list.replaceChildren(fragment);
}

function updateBadge(badge: HTMLElement | null, unread: number) {
    if (!badge) return;
    badge.textContent = String(unread);
    badge.hidden = unread === 0;
}

export function initSimulationNotice() {
    ensureToastStack();

    const bellBtn = document.getElementById('editor-notifications-toggle-btn');
    const bellBadge = document.getElementById('editor-notifications-badge');
    const centerPanel = document.getElementById('editor-notifications-center');
    const centerList = document.getElementById('editor-notifications-list');
    const centerCloseBtn = document.getElementById('editor-notifications-close-btn');
    const centerClearBtn = document.getElementById('editor-notifications-clear-btn');

    let unreadCount = 0;

    const closeCenter = () => {
        if (!centerPanel || !bellBtn) return;
        centerPanel.hidden = true;
        bellBtn.setAttribute('aria-pressed', 'false');
    };

    bellBtn?.addEventListener('click', () => {
        if (!centerPanel || !centerList) return;
        if (!centerPanel.hidden) {
            closeCenter();
            return;
        }
        announceEditorDrawerOpen('notifications');
        renderNotificationCenter(centerList);
        centerPanel.hidden = false;
        bellBtn.setAttribute('aria-pressed', 'true');
        unreadCount = 0;
        updateBadge(bellBadge, unreadCount);
    });

    // Only one side drawer at a time - they occupy the same docked slot.
    document.addEventListener(EDITOR_DRAWER_OPEN_EVENT, (event) => {
        if ((event as CustomEvent<string>).detail !== 'notifications' && centerPanel && !centerPanel.hidden) closeCenter();
    });

    centerCloseBtn?.addEventListener('click', closeCenter);

    centerClearBtn?.addEventListener('click', () => {
        notices.length = 0;
        closeCenter();
    });

    centerList?.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('[data-simulation-action="open-mission-guide"]')) {
            (window as any).openMissionGuideModal?.();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && centerPanel && !centerPanel.hidden) closeCenter();
    });

    (window as any).showSimulationNotice = (
        payload: SimulationNoticePayload,
        fallbackLevel: NoticeLevel = 'warn'
    ) => {
        const resolved = typeof payload === 'string'
            ? { title: 'Предупреждение по таймингам', message: payload, detailsHtml: '', level: fallbackLevel }
            : {
                title: payload.title || 'Предупреждение по таймингам',
                message: payload.message,
                detailsHtml: payload.detailsHtml || '',
                level: payload.level || fallbackLevel
            };

        const notice: NoticeRecord = {
            title: resolved.title,
            message: resolved.message,
            detailsHtml: resolved.detailsHtml,
            level: resolved.level,
            time: new Date().toLocaleTimeString('ru-RU', { hour12: false })
        };

        notices.push(notice);
        if (notices.length > MAX_NOTICE_HISTORY) {
            notices.splice(0, notices.length - MAX_NOTICE_HISTORY);
        }

        spawnToast(notice);

        if (centerPanel && !centerPanel.hidden && centerList) {
            renderNotificationCenter(centerList);
        } else {
            unreadCount += 1;
            updateBadge(bellBadge, unreadCount);
        }
    };
}
