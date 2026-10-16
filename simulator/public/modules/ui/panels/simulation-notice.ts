/*
 * Renderer for script/mission/hardware notices. Entry point is still
 * window.showSimulationNotice(payload, fallbackLevel) (callers: app/script-
 * execution-notice.ts, editor-drone-upload.ts, drone-link-panel.ts, ...).
 *
 * A notice is a soft card: level icon + level word, a short title, a message
 * of one or two sentences, and optional action buttons. Colour is never the
 * only carrier of the level (icon and word are always there).
 * Lifetime (see notice-policy.ts): errors stay until closed; success, info and
 * warnings fade after a time that grows with the text, and wait while the
 * pointer or focus is on the card. Identical repeats are grouped ("x3").
 * Every notice is also kept in a history, browsable via the bell-icon
 * notification center next to the journal button (see editor-terminal.ts).
 */
import { EDITOR_DRAWER_OPEN_EVENT, announceEditorDrawerOpen, setEditorDrawerState } from './editor-drawers.js';
import type { NoticeAction, NoticeLevel } from '../../shared/notice-messages/types.js';
import {
    FALLBACK_TITLES,
    LEVEL_LABELS,
    noticeLifetimeMs,
    noticeRole,
    noticeSignature,
    pickToastToEvict,
    recordNotice,
    splitInlineCode,
    type NoticeEntry
} from './notice-policy.js';

type SimulationNoticePayload = string | {
    title?: string;
    message: string;
    detailsHtml?: string;
    level?: NoticeLevel;
    actions?: NoticeAction[];
};

const MAX_NOTICE_HISTORY = 50;
const MAX_VISIBLE_TOASTS = 3;

const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
const LEVEL_ICONS: Record<NoticeLevel, string> = {
    error: `${SVG_OPEN}<circle cx="12" cy="12" r="9"/><path d="M10 10l4 4m0-4l-4 4"/></svg>`,
    warn: `${SVG_OPEN}<path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636-2.87l-8.106-13.536a1.914 1.914 0 0 0-3.274 0z"/><path d="M12 16h.01"/></svg>`,
    info: `${SVG_OPEN}<circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v4h1"/></svg>`,
    success: `${SVG_OPEN}<circle cx="12" cy="12" r="9"/><path d="M9 12l2 2l4-4"/></svg>`
};
const CLOSE_ICON = `${SVG_OPEN.replace('width="18" height="18"', 'width="16" height="16"')}<path d="M18 6l-12 12"/><path d="M6 6l12 12"/></svg>`;

let notices: NoticeEntry[] = [];

type ToastState = {
    signature: string;
    count: number;
    level: NoticeLevel;
    textLength: number;
    timer: number | undefined;
    remainingMs: number | null;
    startedAt: number;
    paused: boolean;
};

const toastStates = new WeakMap<HTMLElement, ToastState>();

function ensureToastStack(): HTMLElement {
    let stack = document.getElementById('simulation-toast-stack');
    if (!stack) {
        stack = document.createElement('div');
        stack.id = 'simulation-toast-stack';
        stack.className = 'simulation-toast-stack';
        stack.setAttribute('aria-label', 'Уведомления');
        document.body.appendChild(stack);
    }
    return stack;
}

/** Writes text into an element; `code` fragments become <code>. Never uses innerHTML. */
function renderRichText(target: HTMLElement, text: string) {
    target.replaceChildren();
    for (const part of splitInlineCode(text)) {
        if (part.code) {
            const element = document.createElement('code');
            element.textContent = part.text;
            target.appendChild(element);
        } else {
            target.appendChild(document.createTextNode(part.text));
        }
    }
}

function runNoticeAction(action: NoticeAction) {
    if (action.kind === 'show-line') {
        // openPanel toggles: calling it with the editor already open would close it and show the scene instead.
        if (!document.querySelector('#editor-panel.active')) (window as any).openPanel?.('editor-panel');
        (window as any).highlightEditorProblem?.({ line: action.line, column: action.column, message: action.message || '' });
        return;
    }
    if (action.kind === 'clear-scene') {
        (window as any).clearSceneObjects?.();
        return;
    }
    if (action.kind === 'open-guide') {
        const win = window as any;
        if (action.lesson !== undefined && win.openMissionGuideLesson) win.openMissionGuideLesson(action.lesson);
        else win.openMissionGuideModal?.();
    }
}

function createActionButtons(actions: NoticeAction[], className: string, afterRun?: () => void): HTMLElement | null {
    if (!actions.length) return null;
    const row = document.createElement('div');
    row.className = `${className}s`;
    for (const action of actions) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = action.label;
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            runNoticeAction(action);
            afterRun?.();
        });
        row.appendChild(button);
    }
    return row;
}

function setCountChip(chip: HTMLElement, count: number) {
    chip.hidden = count < 2;
    chip.textContent = count < 2 ? '' : `×${count}`;
    chip.title = count < 2 ? '' : `Это сообщение повторилось ${count} раз(а)`;
}

function dismissToast(toast: HTMLElement) {
    const state = toastStates.get(toast);
    if (state) window.clearTimeout(state.timer);
    // A toast evicted before its entrance rAF ever added `is-visible` has no
    // transition to wait for - removing the class wouldn't fire
    // transitionend, leaving it stuck in the DOM forever.
    if (!toast.classList.contains('is-visible')) {
        toast.remove();
        return;
    }
    toast.classList.remove('is-visible');
    const remove = () => toast.remove();
    toast.addEventListener('transitionend', remove, { once: true });
    // Reduced motion removes the transition: do not wait for an event that never comes.
    window.setTimeout(remove, 400);
}

function armToastTimer(toast: HTMLElement, durationMs: number | null) {
    const state = toastStates.get(toast);
    if (!state) return;
    window.clearTimeout(state.timer);
    state.remainingMs = durationMs;
    state.startedAt = Date.now();
    if (durationMs === null || state.paused) return;
    state.timer = window.setTimeout(() => dismissToast(toast), durationMs);
}

function pauseToast(toast: HTMLElement) {
    const state = toastStates.get(toast);
    if (!state || state.paused) return;
    state.paused = true;
    window.clearTimeout(state.timer);
    if (state.remainingMs !== null) {
        state.remainingMs = Math.max(1500, state.remainingMs - (Date.now() - state.startedAt));
    }
}

function resumeToast(toast: HTMLElement) {
    const state = toastStates.get(toast);
    if (!state || !state.paused) return;
    state.paused = false;
    armToastTimer(toast, state.remainingMs);
}

function spawnToast(notice: NoticeEntry) {
    const stack = ensureToastStack();
    const signature = noticeSignature(notice);
    const textLength = notice.title.length + notice.message.length;
    const duration = noticeLifetimeMs(notice.level, textLength);

    // The same notice is already on screen: count it instead of stacking a copy.
    const existingToasts = Array.from(stack.children) as HTMLElement[];
    const duplicate = existingToasts.find((candidate) => toastStates.get(candidate)?.signature === signature);
    if (duplicate) {
        const state = toastStates.get(duplicate)!;
        state.count += 1;
        setCountChip(duplicate.querySelector('.simulation-toast__count') as HTMLElement, state.count);
        armToastTimer(duplicate, duration);
        return;
    }

    const evictIndex = pickToastToEvict(existingToasts.map((candidate) => toastStates.get(candidate)?.level || 'info'), MAX_VISIBLE_TOASTS);
    if (evictIndex >= 0) dismissToast(existingToasts[evictIndex]);

    const toast = document.createElement('div');
    toast.className = `simulation-toast simulation-toast--${notice.level}`;
    toast.setAttribute('role', noticeRole(notice.level));
    toast.tabIndex = -1;

    const icon = document.createElement('span');
    icon.className = 'simulation-toast__icon';
    icon.innerHTML = LEVEL_ICONS[notice.level];

    const body = document.createElement('div');
    body.className = 'simulation-toast__body';

    const head = document.createElement('div');
    head.className = 'simulation-toast__head';
    const level = document.createElement('span');
    level.className = 'simulation-toast__level';
    level.textContent = LEVEL_LABELS[notice.level];
    const count = document.createElement('span');
    count.className = 'simulation-toast__count';
    setCountChip(count, notice.count);
    head.append(level, count);

    const title = document.createElement('div');
    title.className = 'simulation-toast__title';
    title.textContent = notice.title;

    const message = document.createElement('div');
    message.className = 'simulation-toast__message';
    renderRichText(message, notice.message);

    body.append(head, title, message);
    const actions = createActionButtons(notice.actions, 'simulation-toast__action', () => dismissToast(toast));
    if (actions) body.appendChild(actions);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'simulation-toast__close';
    close.setAttribute('aria-label', 'Закрыть уведомление');
    close.title = 'Закрыть (Esc)';
    close.innerHTML = CLOSE_ICON;
    close.addEventListener('click', (event) => {
        event.stopPropagation();
        dismissToast(toast);
    });

    toast.append(icon, body, close);
    toastStates.set(toast, {
        signature,
        count: notice.count,
        level: notice.level,
        textLength,
        timer: undefined,
        remainingMs: duration,
        startedAt: Date.now(),
        paused: false
    });

    // A click on the card text closes it; selecting text or pressing a button does not.
    toast.addEventListener('click', () => {
        if (String(window.getSelection?.() || '')) return;
        dismissToast(toast);
    });
    toast.addEventListener('pointerenter', () => pauseToast(toast));
    toast.addEventListener('pointerleave', () => resumeToast(toast));
    toast.addEventListener('focusin', () => pauseToast(toast));
    toast.addEventListener('focusout', () => resumeToast(toast));

    stack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    armToastTimer(toast, duration);
}

function dismissNewestToast(): boolean {
    const stack = document.getElementById('simulation-toast-stack');
    const last = stack?.lastElementChild as HTMLElement | null;
    if (!last) return false;
    dismissToast(last);
    return true;
}

function renderNotificationCenter(list: HTMLElement) {
    // Nothing to clear when the list is empty.
    (document.getElementById('editor-notifications-clear-btn') as HTMLButtonElement | null)?.toggleAttribute('disabled', notices.length === 0);
    if (notices.length === 0) {
        list.innerHTML = '<div class="editor-notifications__empty">' + '<svg class="editor-empty__icon" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6"/><path d="M9 17v1a3 3 0 0 0 6 0v-1"/></svg>' + '<strong>Пока всё спокойно</strong><span>Здесь появятся подсказки и сообщения об ошибках, когда вы запустите программу.</span></div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    for (let i = notices.length - 1; i >= 0; i--) {
        const notice = notices[i];
        const item = document.createElement('article');
        item.className = `editor-notifications__item editor-notifications__item--${notice.level}`;

        const meta = document.createElement('div');
        meta.className = 'editor-notifications__meta';
        const icon = document.createElement('span');
        icon.className = 'editor-notifications__icon';
        icon.innerHTML = LEVEL_ICONS[notice.level];
        const levelWord = document.createElement('span');
        levelWord.className = 'editor-notifications__level';
        levelWord.textContent = LEVEL_LABELS[notice.level];
        const time = document.createElement('span');
        time.className = 'editor-notifications__time';
        time.textContent = notice.time;
        meta.append(icon, levelWord, time);
        if (notice.count > 1) {
            const count = document.createElement('span');
            count.className = 'editor-notifications__count';
            count.textContent = `×${notice.count}`;
            count.title = `Это сообщение повторилось ${notice.count} раз(а)`;
            meta.appendChild(count);
        }

        const title = document.createElement('div');
        title.className = 'editor-notifications__item-title';
        title.textContent = notice.title;

        const message = document.createElement('div');
        message.className = 'editor-notifications__item-message';
        renderRichText(message, notice.message);

        item.append(meta, title, message);

        const actions = createActionButtons(notice.actions, 'editor-notifications__action');
        if (actions) item.appendChild(actions);

        if (notice.detailsHtml) {
            const more = document.createElement('details');
            more.className = 'editor-notifications__more';
            const summary = document.createElement('summary');
            summary.textContent = 'Подробности и пример';
            const details = document.createElement('div');
            details.className = 'editor-notifications__item-details';
            details.innerHTML = notice.detailsHtml;
            more.append(summary, details);
            item.appendChild(more);
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
        setEditorDrawerState(centerPanel, bellBtn, false, 'уведомления');
    };

    bellBtn?.addEventListener('click', () => {
        if (!centerPanel || !centerList) return;
        if (!centerPanel.hidden) {
            closeCenter();
            return;
        }
        announceEditorDrawerOpen('notifications');
        renderNotificationCenter(centerList);
        setEditorDrawerState(centerPanel, bellBtn, true, 'уведомления');
        unreadCount = 0;
        updateBadge(bellBadge, unreadCount);
    });

    // Only one side drawer at a time - they occupy the same docked slot.
    document.addEventListener(EDITOR_DRAWER_OPEN_EVENT, (event) => {
        if ((event as CustomEvent<string>).detail !== 'notifications' && centerPanel && !centerPanel.hidden) closeCenter();
    });

    centerCloseBtn?.addEventListener('click', closeCenter);
    if (centerPanel && bellBtn) setEditorDrawerState(centerPanel, bellBtn, false, 'уведомления');

    centerClearBtn?.addEventListener('click', () => {
        notices = [];
        unreadCount = 0;
        updateBadge(bellBadge, unreadCount);
        if (centerList) renderNotificationCenter(centerList);
    });

    centerList?.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('[data-simulation-action="open-mission-guide"]')) {
            (window as any).openMissionGuideModal?.();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || event.defaultPrevented) return;
        if (centerPanel && !centerPanel.hidden && document.getElementById('editor-panel')?.classList.contains('active')) {
            event.preventDefault();
            closeCenter();
            return;
        }
        // Esc closes the newest toast, but only when it would not steal Esc from a field or dialog.
        const active = document.activeElement as HTMLElement | null;
        const insideStack = Boolean(active?.closest('#simulation-toast-stack'));
        if (insideStack || !active || active === document.body) {
            if (dismissNewestToast()) event.preventDefault();
        }
    });

    (window as any).showSimulationNotice = (
        payload: SimulationNoticePayload,
        fallbackLevel: NoticeLevel = 'warn'
    ) => {
        const source = typeof payload === 'string' ? { message: payload } : payload;
        const level: NoticeLevel = (typeof payload === 'string' ? undefined : payload.level) || fallbackLevel;

        const entry: NoticeEntry = {
            title: source.title || FALLBACK_TITLES[level],
            message: source.message,
            detailsHtml: ('detailsHtml' in source && source.detailsHtml) || '',
            level,
            actions: ('actions' in source && source.actions) || [],
            time: new Date().toLocaleTimeString('ru-RU', { hour12: false }),
            count: 1
        };

        const recorded = recordNotice(notices, entry, MAX_NOTICE_HISTORY);
        notices = recorded.history;

        const centerIsOpen = Boolean(centerPanel && !centerPanel.hidden && centerList);
        // With the notification center open the notice is already on screen in its list: a toast on top of it would
        // show the same card twice (and cover the list).
        if (!centerIsOpen) {
            // A repeat shows its running total, not "x1".
            spawnToast(recorded.merged ?? entry);
        }

        if (centerIsOpen && centerList) {
            renderNotificationCenter(centerList);
        } else if (!recorded.merged) {
            unreadCount += 1;
            updateBadge(bellBadge, unreadCount);
        }
    };
}
