const RAIL_PINNED_STORAGE_KEY = 'geoskan_rail_pinned_v1';
const MOBILE_RAIL_QUERY = '(max-width: 980px)';
const PEEK_HIDE_DELAY_MS = 280;

/*
 * Рельс инструментов не участвует в раскладке, пока он не нужен: сцена
 * занимает весь экран. Вызвать его можно наведением на левый край или
 * кнопкой в шапке, которая закрепляет рельс насовсем.
 */
export function initRailVisibility(): void {
    const rail = document.querySelector('.sidebar-tabs') as HTMLElement | null;
    const toggleButton = document.getElementById('rail-toggle-btn') as HTMLButtonElement | null;
    const panelsHost = document.querySelector('.sidebar-panels') as HTMLElement | null;
    if (!rail || !panelsHost) return;

    const mobileQuery = window.matchMedia(MOBILE_RAIL_QUERY);
    const hotzone = document.createElement('div');
    hotzone.className = 'rail-hotzone';
    hotzone.setAttribute('aria-hidden', 'true');
    document.body.appendChild(hotzone);

    let pinned = localStorage.getItem(RAIL_PINNED_STORAGE_KEY) === '1';
    let peeking = false;
    let hideTimer = 0;
    let lastPanelId = document.querySelector('.sidebar-panel.active')?.id || 'editor-panel';

    const hasOpenPanel = () => !!document.querySelector('.sidebar-panel.active');

    const sync = () => {
        const docked = pinned || hasOpenPanel() || mobileQuery.matches;
        document.body.classList.toggle('is-rail-docked', docked);
        document.body.classList.toggle('is-rail-peek', !docked && peeking);
        // The floating corner toggle would otherwise sit right on top of the
        // rail/panel it's toggling once either is actually docked - a real
        // panel already has its own close button, so the corner toggle only
        // needs to reposition (not disappear) for the bare pinned-rail case.
        document.body.classList.toggle('has-open-panel', hasOpenPanel());
        const expanded = pinned || hasOpenPanel();
        toggleButton?.setAttribute('aria-pressed', String(expanded));
        toggleButton?.setAttribute('aria-expanded', String(expanded));
        if (toggleButton) {
            toggleButton.title = expanded ? 'Скрыть панели инструментов' : 'Показать панели инструментов';
            toggleButton.setAttribute('aria-label', toggleButton.title);
        }
        toggleButton?.classList.toggle('is-active', expanded);
    };

    const cancelHide = () => {
        if (!hideTimer) return;
        window.clearTimeout(hideTimer);
        hideTimer = 0;
    };

    const showPeek = () => {
        cancelHide();
        if (peeking) return;
        peeking = true;
        sync();
    };

    const scheduleHidePeek = () => {
        cancelHide();
        hideTimer = window.setTimeout(() => {
            hideTimer = 0;
            peeking = false;
            sync();
        }, PEEK_HIDE_DELAY_MS);
    };

    hotzone.addEventListener('mouseenter', showPeek);
    hotzone.addEventListener('mouseleave', scheduleHidePeek);
    rail.addEventListener('mouseenter', showPeek);
    rail.addEventListener('mouseleave', scheduleHidePeek);

    toggleButton?.addEventListener('click', () => {
        const active = document.querySelector('.sidebar-panel.active');
        if (active || pinned) {
            if (active) lastPanelId = active.id;
            pinned = false;
            (window as any).closeSidebarPanel?.();
        } else {
            // Just reveal the bare icon rail - it shouldn't guess which tab
            // the user wants and open one for them.
            pinned = true;
        }
        localStorage.setItem(RAIL_PINNED_STORAGE_KEY, pinned ? '1' : '0');
        peeking = false;
        cancelHide();
        sync();
        window.setTimeout(sync, 260);
    });

    window.addEventListener('sidebar-panel-change', (event) => {
        const panelId = (event as CustomEvent<{ panelId?: string | null }>).detail?.panelId;
        if (panelId) lastPanelId = panelId;
        sync();
    });

    // Панели открываются и закрываются из sidebar.ts в нескольких местах;
    // наблюдение за классом надёжнее, чем событие в каждой из них.
    new MutationObserver(sync).observe(panelsHost, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });

    if (typeof mobileQuery.addEventListener === 'function') {
        mobileQuery.addEventListener('change', sync);
    } else {
        mobileQuery.addListener(sync);
    }

    sync();
}
