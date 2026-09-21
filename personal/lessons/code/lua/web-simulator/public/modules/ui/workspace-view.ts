const MOBILE_WORKSPACE_QUERY = '(max-width: 980px)';

type WorkspacePage = 'code' | 'scene';

/*
 * «Код» и «Сцена» — не отдельный переключатель, а обычная панель («Код»
 * открывается тем же openPanel('editor-panel'), что и любая другая панель
 * рельса) и её отсутствие. Этот модуль только следит, открыта ли она, чтобы
 * переключить рабочую область: на узком экране — какая половина видима, на
 * широком — отдаёт редактору всю ширину вместо совместного использования со
 * сценой.
 */
export function initWorkspaceView(): void {
    const container = document.querySelector('.container') as HTMLElement | null;
    const panelsHost = document.querySelector('.sidebar-panels') as HTMLElement | null;
    if (!container || !panelsHost) return;

    const pagePanels = Array.from(
        container.querySelectorAll('[data-mobile-workspace-panel]')
    ) as HTMLElement[];
    const mediaQuery = window.matchMedia(MOBILE_WORKSPACE_QUERY);

    const isEditorOpen = () => !!document.getElementById('editor-panel')?.classList.contains('active');
    const hasOpenPanel = () => !!document.querySelector('.sidebar-panel.active');

    const applyPage = (page: WorkspacePage) => {
        const isMobile = mediaQuery.matches;
        container.dataset.mobileWorkspacePage = page;
        // Desktop uses the same explicit state: editor mode is a real workspace
        // view, so it can take over the scene canvas instead of sharing its width.
        container.dataset.workspacePage = page;

        pagePanels.forEach((panel) => {
            const isActive = panel.dataset.mobileWorkspacePanel === page;
            const shouldHide = isMobile ? !isActive : false;
            panel.hidden = shouldHide;
            panel.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
        });

        window.requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize'));
            window.setTimeout(() => window.dispatchEvent(new Event('resize')), 120);
        });
    };

    const sync = () => {
        // На узком экране страница «Код» показывает боковую панель целиком,
        // поэтому она нужна для любой открытой панели, а не только редактора.
        applyPage(mediaQuery.matches && hasOpenPanel() ? 'code' : isEditorOpen() ? 'code' : 'scene');
    };

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
