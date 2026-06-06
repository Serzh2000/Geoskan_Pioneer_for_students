const MOBILE_WORKSPACE_QUERY = '(max-width: 980px)';
const MOBILE_PAGES = ['code', 'scene', 'controls'] as const;

type MobileWorkspacePage = typeof MOBILE_PAGES[number];

function isMobileWorkspacePage(value: string | null | undefined): value is MobileWorkspacePage {
    return value === 'code' || value === 'scene' || value === 'controls';
}

export function initMobileWorkspaceCarousel() {
    const container = document.querySelector('.container') as HTMLElement | null;
    const nav = document.querySelector('.mobile-workspace-nav') as HTMLElement | null;
    if (!container || !nav) return;

    const panels = Array.from(
        container.querySelectorAll('[data-mobile-workspace-panel]')
    ) as HTMLElement[];
    const pageLabel = nav.querySelector('[data-mobile-workspace-label]') as HTMLElement | null;
    const targetButtons = Array.from(
        nav.querySelectorAll('[data-mobile-workspace-target]')
    ) as HTMLButtonElement[];
    const prevButton = nav.querySelector('[data-mobile-workspace-action="prev"]') as HTMLButtonElement | null;
    const nextButton = nav.querySelector('[data-mobile-workspace-action="next"]') as HTMLButtonElement | null;
    const mediaQuery = window.matchMedia(MOBILE_WORKSPACE_QUERY);

    const applyPageState = (requestedPage: MobileWorkspacePage) => {
        const page = isMobileWorkspacePage(requestedPage) ? requestedPage : 'code';
        const currentIndex = MOBILE_PAGES.indexOf(page);
        const isMobile = mediaQuery.matches;
        container.dataset.mobileWorkspacePage = page;

        targetButtons.forEach((button) => {
            const isActive = button.dataset.mobileWorkspaceTarget === page;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        panels.forEach((panel) => {
            const isActive = panel.dataset.mobileWorkspacePanel === page;
            const shouldHide = isMobile ? !isActive : false;
            panel.hidden = shouldHide;
            panel.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
        });

        if (pageLabel) {
            pageLabel.textContent =
                page === 'code'
                    ? 'Код и панели'
                    : page === 'scene'
                        ? 'Сцена'
                        : 'Управление';
        }
        if (prevButton) prevButton.disabled = currentIndex <= 0;
        if (nextButton) nextButton.disabled = currentIndex >= MOBILE_PAGES.length - 1;

        window.requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize'));
            window.setTimeout(() => window.dispatchEvent(new Event('resize')), 120);
        });
    };

    const goToPage = (page: MobileWorkspacePage) => {
        applyPageState(page);
    };

    targetButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const page = button.dataset.mobileWorkspaceTarget;
            if (isMobileWorkspacePage(page)) {
                goToPage(page);
            }
        });
    });

    prevButton?.addEventListener('click', () => {
        const currentIndex = MOBILE_PAGES.indexOf(
            isMobileWorkspacePage(container.dataset.mobileWorkspacePage) ? container.dataset.mobileWorkspacePage : 'code'
        );
        goToPage(MOBILE_PAGES[Math.max(0, currentIndex - 1)]);
    });

    nextButton?.addEventListener('click', () => {
        const currentIndex = MOBILE_PAGES.indexOf(
            isMobileWorkspacePage(container.dataset.mobileWorkspacePage) ? container.dataset.mobileWorkspacePage : 'code'
        );
        goToPage(MOBILE_PAGES[Math.min(MOBILE_PAGES.length - 1, currentIndex + 1)]);
    });

    const syncMode = () => {
        if (!mediaQuery.matches) {
            container.dataset.mobileWorkspacePage = 'code';
        }
        applyPageState(
            isMobileWorkspacePage(container.dataset.mobileWorkspacePage) ? container.dataset.mobileWorkspacePage : 'code'
        );
    };

    if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', syncMode);
    } else {
        mediaQuery.addListener(syncMode);
    }

    syncMode();
}
