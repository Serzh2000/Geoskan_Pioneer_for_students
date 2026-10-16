const RAIL_PINNED_STORAGE_KEY = 'geoskan_rail_pinned_v1';
const MOBILE_RAIL_QUERY = '(max-width: 980px)';

/*
 * Рельс инструментов не участвует в раскладке, пока он не нужен: сцена
 * занимает весь экран. Переключатель у левого края показывает инструменты
 * или закрывает открытую панель вместе с рельсом. Наведение не меняет режим.
 */
export function initRailVisibility(): void {
    const rail = document.querySelector('.sidebar-tabs') as HTMLElement | null;
    const toggleButton = document.getElementById('rail-toggle-btn') as HTMLButtonElement | null;
    const panelsHost = document.querySelector('.sidebar-panels') as HTMLElement | null;
    if (!rail || !panelsHost) return;

    const mobileQuery = window.matchMedia(MOBILE_RAIL_QUERY);
    let pinned = false;
    try { pinned = localStorage.getItem(RAIL_PINNED_STORAGE_KEY) === '1'; } catch { /* Session state remains usable. */ }

    // Closing panels stop owning the rail immediately, including during animation.
    const hasOpenPanel = () => !!panelsHost.querySelector('.sidebar-panel.active:not(.is-closing)');

    // Narrow windows lay the rail out as a page of its own, so it is always shown there.
    const isExpanded = () => pinned || hasOpenPanel() || mobileQuery.matches;

    const sync = () => {
        const docked = isExpanded();
        document.body.classList.toggle('is-rail-docked', docked);
        document.body.classList.remove('is-rail-peek');
        // The disclosure owns a reserved slot above the tool icons.
        document.body.classList.toggle('has-open-panel', hasOpenPanel());
        const expanded = docked;
        // There is nothing to fold away in the narrow layout; a button that only flips its own glow is worse than none.
        if (toggleButton) toggleButton.hidden = mobileQuery.matches;
        toggleButton?.setAttribute('aria-pressed', String(expanded));
        toggleButton?.setAttribute('aria-expanded', String(expanded));
        if (toggleButton) {
            toggleButton.title = expanded ? 'Скрыть панели инструментов' : 'Показать панели инструментов';
            toggleButton.setAttribute('aria-label', toggleButton.title);
        }
        toggleButton?.classList.toggle('is-active', expanded);
    };

    toggleButton?.addEventListener('click', () => {
        // One rule for every width: an expanded rail folds away, a hidden one is revealed.
        if (isExpanded()) {
            pinned = false;
            toggleButton?.focus({ preventScroll: true });
            (window as any).closeSidebarPanel?.();
        } else {
            // Just reveal the bare icon rail - it shouldn't guess which tab
            // the user wants and open one for them.
            pinned = true;
        }
        try { localStorage.setItem(RAIL_PINNED_STORAGE_KEY, pinned ? '1' : '0'); } catch { /* Use session state. */ }
        sync();
    });

    window.addEventListener('sidebar-panel-change', sync);

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
