type SimulationNoticePayload = string | {
    title?: string;
    message: string;
    detailsHtml?: string;
    level?: 'warn' | 'info' | 'error';
};

function resolveSimulationNoticeHost() {
    const editorPanelContent = document.querySelector('#editor-panel .panel-content--editor') as HTMLElement | null;
    if (editorPanelContent) {
        return {
            element: editorPanelContent,
            mode: 'editor' as const
        };
    }

    const sceneContainer = document.querySelector('.scene-container') as HTMLElement | null;
    return sceneContainer
        ? {
            element: sceneContainer,
            mode: 'scene' as const
        }
        : null;
}

export function initSimulationNotice() {
    const host = resolveSimulationNoticeHost();
    if (!host?.element) return;

    let notice = document.getElementById('simulation-notice') as HTMLDivElement | null;
    if (!notice) {
        notice = document.createElement('div');
        notice.id = 'simulation-notice';
        notice.className = 'simulation-notice';
        notice.innerHTML = `
            <div class="simulation-notice__header">
                <div class="simulation-notice__title-wrap">
                    <div class="simulation-notice__title">Предупреждение по таймингам</div>
                </div>
                <button type="button" class="simulation-notice__close" aria-label="Скрыть">Понятно</button>
            </div>
            <div class="simulation-notice__body">
                <div class="simulation-notice__message"></div>
                <div class="simulation-notice__details"></div>
            </div>
        `;
    }
    if (notice.parentElement !== host.element) {
        host.element.appendChild(notice);
    }
    notice.classList.toggle('simulation-notice--editor-docked', host.mode === 'editor');

    const messageEl = notice.querySelector('.simulation-notice__message') as HTMLDivElement | null;
    const detailsEl = notice.querySelector('.simulation-notice__details') as HTMLDivElement | null;
    const closeBtn = notice.querySelector('.simulation-notice__close') as HTMLButtonElement | null;
    const titleEl = notice.querySelector('.simulation-notice__title') as HTMLDivElement | null;
    let hideTimer = 0;

    const hideNotice = () => {
        notice?.classList.remove('visible');
    };

    closeBtn?.addEventListener('click', hideNotice);
    notice.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('[data-simulation-action="open-mission-guide"]')) {
            (window as any).openMissionGuideModal?.();
        }
    });
    (window as any).showSimulationNotice = (
        payload: SimulationNoticePayload,
        fallbackLevel: 'warn' | 'info' | 'error' = 'warn'
    ) => {
        if (!notice || !messageEl || !titleEl || !detailsEl) return;
        window.clearTimeout(hideTimer);
        const resolved = typeof payload === 'string'
            ? { title: 'Предупреждение по таймингам', message: payload, detailsHtml: '', level: fallbackLevel }
            : {
                title: payload.title || 'Предупреждение по таймингам',
                message: payload.message,
                detailsHtml: payload.detailsHtml || '',
                level: payload.level || fallbackLevel
            };
        notice.dataset.level = resolved.level;
        titleEl.textContent = resolved.title;
        messageEl.textContent = resolved.message;
        detailsEl.innerHTML = resolved.detailsHtml;
        detailsEl.style.display = resolved.detailsHtml ? 'block' : 'none';
        notice.classList.add('visible');
        hideTimer = window.setTimeout(hideNotice, resolved.detailsHtml ? 12000 : 6500);
    };
}
