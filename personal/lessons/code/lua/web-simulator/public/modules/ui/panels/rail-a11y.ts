/*
 * Accessibility and the reference shortcut of the left rail (a <nav>).
 *
 * - The rail's panel tabs get aria-current="page" while sidebar.ts marks them
 *   with `.active`; sidebar.ts stays the only owner of that class.
 * - The theme button is an action: it announces itself as "Тема" with
 *   aria-pressed (set by app/theme-toggle.ts); its descriptive text lives in the
 *   tooltip. theme-toggle.ts rewrites aria-label on every change, so the short
 *   name is restored here.
 * - "Справка" opens the code panel and its API reference drawer through the
 *   drawer's own #editor-docs-toggle-btn, and is pressed while that drawer is
 *   open in an open code panel.
 */
const EDITOR_PANEL_ID = 'editor-panel';
const DRAWER_BUTTON_ID = 'editor-docs-toggle-btn';
const THEME_LABEL = 'Тема';

export function initRailA11y(): void {
    const rail = document.querySelector<HTMLElement>('.sidebar-tabs');
    if (!rail) return;

    const panelTabs = () => Array.from(rail.querySelectorAll<HTMLElement>(
        '.sidebar-tab-btn:not(.sidebar-tab-btn--action):not(.sidebar-tab-btn--docs)'
    ));
    const drawerButton = () => document.getElementById(DRAWER_BUTTON_ID);
    const editorPanel = () => document.getElementById(EDITOR_PANEL_ID);
    const editorIsOpen = () => {
        const panel = editorPanel();
        return !!panel && panel.classList.contains('active') && !panel.classList.contains('is-closing');
    };
    const drawerIsOpen = () => drawerButton()?.getAttribute('aria-pressed') === 'true';

    const syncCurrent = () => {
        for (const tab of panelTabs()) {
            if (tab.classList.contains('active')) tab.setAttribute('aria-current', 'page');
            else tab.removeAttribute('aria-current');
        }
    };

    const docsButton = document.getElementById('sidebar-docs-btn');
    const syncDocs = () => {
        docsButton?.setAttribute('aria-pressed', String(editorIsOpen() && drawerIsOpen()));
    };

    const themeButton = document.getElementById('theme-toggle');
    const syncTheme = () => {
        if (themeButton && themeButton.getAttribute('aria-label') !== THEME_LABEL) {
            themeButton.setAttribute('aria-label', THEME_LABEL);
        }
    };

    const syncAll = () => {
        syncCurrent();
        syncDocs();
        syncTheme();
    };

    docsButton?.addEventListener('click', () => {
        const drawer = drawerButton();
        if (!drawer) return;
        const open = editorIsOpen();
        const shown = drawerIsOpen();
        // Everything already visible: the button folds the drawer away again.
        if (open && shown) {
            drawer.click();
        } else {
            // openPanel() toggles an open panel, so only call it for a closed one.
            if (!open) (window as any).openPanel?.(EDITOR_PANEL_ID);
            if (!shown) drawer.click();
        }
        syncDocs();
    });

    if (typeof MutationObserver === 'function') {
        const classObserver = new MutationObserver(syncAll);
        classObserver.observe(rail, { attributes: true, attributeFilter: ['class'], subtree: true });
        const panel = editorPanel();
        if (panel) classObserver.observe(panel, { attributes: true, attributeFilter: ['class'] });
        const drawer = drawerButton();
        if (drawer) new MutationObserver(syncDocs).observe(drawer, { attributes: true, attributeFilter: ['aria-pressed'] });
        if (themeButton) new MutationObserver(syncTheme).observe(themeButton, { attributes: true, attributeFilter: ['aria-label'] });
    }
    window.addEventListener('sidebar-panel-change', syncAll);

    syncAll();
}
