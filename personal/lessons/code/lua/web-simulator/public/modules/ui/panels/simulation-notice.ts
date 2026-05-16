type SimulationNoticePayload = string | {
    title?: string;
    message: string;
    detailsHtml?: string;
    level?: 'warn' | 'info' | 'error';
};

export function initSimulationNotice() {
    const sceneViewportCard = document.querySelector('.scene-viewport-card') as HTMLElement | null;
    if (!sceneViewportCard) return;

    let notice = document.getElementById('simulation-notice') as HTMLDivElement | null;
    if (!notice) {
        notice = document.createElement('div');
        notice.id = 'simulation-notice';
        notice.className = 'simulation-notice';
        notice.setAttribute('role', 'dialog');
        notice.setAttribute('aria-live', 'polite');
        notice.innerHTML = `
            <div class="simulation-notice__header">
                <div class="simulation-notice__title-wrap">
                    <div class="simulation-notice__title">Консоль отладки</div>
                    <div class="simulation-notice__subtitle">Предупреждение сценария</div>
                </div>
                <div class="simulation-notice__toolbar">
                    <button type="button" class="simulation-notice__icon-btn simulation-notice__toggle" aria-label="Свернуть">-</button>
                    <button type="button" class="simulation-notice__icon-btn simulation-notice__close" aria-label="Закрыть">x</button>
                </div>
            </div>
            <div class="simulation-notice__body">
                <div class="simulation-notice__message"></div>
                <div class="simulation-notice__details"></div>
            </div>
        `;
        sceneViewportCard.appendChild(notice);
    }

    const messageEl = notice.querySelector('.simulation-notice__message') as HTMLDivElement | null;
    const detailsEl = notice.querySelector('.simulation-notice__details') as HTMLDivElement | null;
    const subtitleEl = notice.querySelector('.simulation-notice__subtitle') as HTMLDivElement | null;
    const closeBtn = notice.querySelector('.simulation-notice__close') as HTMLButtonElement | null;
    const toggleBtn = notice.querySelector('.simulation-notice__toggle') as HTMLButtonElement | null;
    const titleEl = notice.querySelector('.simulation-notice__title') as HTMLDivElement | null;

    const hideNotice = () => {
        notice?.classList.remove('visible');
        notice?.classList.remove('is-collapsed');
    };

    closeBtn?.addEventListener('click', hideNotice);
    toggleBtn?.addEventListener('click', () => {
        notice?.classList.toggle('is-collapsed');
        if (toggleBtn) {
            toggleBtn.textContent = notice?.classList.contains('is-collapsed') ? '+' : '-';
            toggleBtn.setAttribute('aria-label', notice?.classList.contains('is-collapsed') ? 'Развернуть' : 'Свернуть');
        }
    });
    notice.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('[data-simulation-action="open-mission-guide"]')) {
            (window as any).openMissionGuideModal?.();
        }
    });
    (window as any).showSimulationNotice = (payload: SimulationNoticePayload, fallbackLevel: 'warn' | 'info' | 'error' = 'warn') => {
        if (!notice || !messageEl || !titleEl || !detailsEl || !subtitleEl) return;
        const resolved = typeof payload === 'string'
            ? { title: 'Предупреждение по таймингам', message: payload, detailsHtml: '', level: fallbackLevel }
            : {
                title: payload.title || 'Предупреждение по таймингам',
                message: payload.message,
                detailsHtml: payload.detailsHtml || '',
                level: payload.level || fallbackLevel
            };
        notice.dataset.level = resolved.level === 'info' ? 'warn' : resolved.level;
        titleEl.textContent = 'Консоль отладки';
        subtitleEl.textContent = resolved.title;
        messageEl.textContent = resolved.message;
        detailsEl.innerHTML = resolved.detailsHtml;
        detailsEl.style.display = resolved.detailsHtml ? 'block' : 'none';
        notice.classList.remove('is-collapsed');
        if (toggleBtn) {
            toggleBtn.textContent = '-';
            toggleBtn.setAttribute('aria-label', 'Свернуть');
        }
        notice.classList.add('visible');
    };
}
