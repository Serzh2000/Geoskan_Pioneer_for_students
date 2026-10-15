const MOBILE_WORKSPACE_QUERY = '(max-width: 980px)';

type WorkspacePage = 'code' | 'scene';

// The editor always occupies the workspace; Ctrl/Cmd+Enter uses the shared run control.
export function initWorkspaceView(): void {
    const container = document.querySelector('.container') as HTMLElement | null;
    const panelsHost = document.querySelector('.sidebar-panels') as HTMLElement | null;
    if (!container || !panelsHost) return;

    const pagePanels = Array.from(
        container.querySelectorAll('[data-mobile-workspace-panel]')
    ) as HTMLElement[];
    const mediaQuery = window.matchMedia(MOBILE_WORKSPACE_QUERY);
    let currentPage: WorkspacePage = 'scene';

    const isEditorOpen = () => !!document.getElementById('editor-panel')?.classList.contains('active');
    const hasOpenPanel = () => !!document.querySelector('.sidebar-panel.active');

    const refreshViewports = () => {
        window.requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize'));
            window.setTimeout(() => window.dispatchEvent(new Event('resize')), 120);
        });
    };

    /*
     * The expanded editor is a desktop-only state: it needs the editor to be the
     * open panel and a window wide enough to have a scene to cover. The class on
     * the panel column tells the editor autofit that its width is not in use.
     */
    const applyExpanded = () => {
        const effective = currentPage === 'code' && !mediaQuery.matches;
        container.dataset.editorExpanded = 'true';
        panelsHost.classList.toggle('is-fullscreen', effective);
    };

    const applyPage = (page: WorkspacePage) => {
        const isMobile = mediaQuery.matches;
        currentPage = page;
        container.dataset.mobileWorkspacePage = page;
        // Desktop uses the same explicit state: it says whether the editor is the open panel.
        container.dataset.workspacePage = page;

        const activePanelId = document.querySelector('.sidebar-panel.active')?.id;
        if (activePanelId) container.dataset.activePanel = activePanelId;
        else delete container.dataset.activePanel;

        pagePanels.forEach((panel) => {
            const isActive = panel.dataset.mobileWorkspacePanel === page;
            // The tools aside stays in the narrow scene page as the icon rail strip
            // (its panel column is hidden by CSS), so navigation never disappears.
            const isRail = panel.dataset.mobileWorkspacePanel === 'code';
            const shouldHide = isMobile ? !isActive && !isRail : false;
            panel.hidden = shouldHide;
            panel.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
        });

        applyExpanded();
        refreshViewports();
    };

    const sync = () => {
        // На узком экране страница «Код» показывает боковую панель целиком,
        // поэтому она нужна для любой открытой панели, а не только редактора.
        applyPage(mediaQuery.matches && hasOpenPanel() ? 'code' : isEditorOpen() ? 'code' : 'scene');
    };

    // Capture phase: Monaco binds Ctrl+Enter to "insert line below", so the event
    // must be taken before the editor sees it. Only keys pressed inside the editor
    // panel are handled; the rest of the page keeps its own shortcuts.
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return;
        if (event.isComposing) return;
        const target = event.target as HTMLElement | null;
        if (!target?.closest?.('#editor-panel')) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat) return;
        const runButton = document.getElementById('run-btn') as HTMLButtonElement | null;
        if (runButton && !runButton.disabled) runButton.click();
    }, true);

    new MutationObserver(sync).observe(panelsHost, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });

    if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', sync);
    } else {
        mediaQuery.addListener(sync);
    }

    sync();
}
