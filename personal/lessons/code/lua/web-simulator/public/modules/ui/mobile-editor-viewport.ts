const MOBILE_EDITOR_QUERY = '(max-width: 980px)';
const EDITOR_PANEL_SELECTOR = '#editor-panel';

type EditorViewportOptions = {
    onEditorResize?: () => void;
};

function getEditorPanel(): HTMLElement | null {
    return document.querySelector(EDITOR_PANEL_SELECTOR) as HTMLElement | null;
}

function getEditorContent(): HTMLElement | null {
    return document.querySelector(`${EDITOR_PANEL_SELECTOR} .panel-content--editor`) as HTMLElement | null;
}

function isEditorElement(element: Element | null): boolean {
    return Boolean(element?.closest(EDITOR_PANEL_SELECTOR));
}

function isEditorFocused(): boolean {
    return isEditorElement(document.activeElement);
}

function getHeaderOffset(): number {
    const header = document.querySelector('.header') as HTMLElement | null;
    if (!header) return 0;
    return Math.max(0, Math.round(header.getBoundingClientRect().height));
}

function scrollEditorPanelIntoView(editorPanel: HTMLElement): void {
    const safeGap = 12;
    const headerOffset = getHeaderOffset();
    const panelTop = Math.round(editorPanel.getBoundingClientRect().top + window.scrollY);
    const targetTop = Math.max(0, panelTop - headerOffset - safeGap);

    if (Math.abs(window.scrollY - targetTop) <= 2) {
        return;
    }

    window.scrollTo({
        top: targetTop,
        behavior: 'auto'
    });
}

function updateViewportVariables(): { height: number; keyboardInset: number; offsetTop: number } {
    const viewport = window.visualViewport;
    const viewportHeight = Math.round(viewport?.height ?? window.innerHeight);
    const offsetTop = Math.round(viewport?.offsetTop ?? 0);
    const keyboardInset = Math.max(0, Math.round(window.innerHeight - viewportHeight - offsetTop));

    document.documentElement.style.setProperty('--mobile-visual-viewport-height', `${viewportHeight}px`);
    document.documentElement.style.setProperty('--mobile-keyboard-inset', `${keyboardInset}px`);

    return { height: viewportHeight, keyboardInset, offsetTop };
}

export function initMobileEditorViewport(options: EditorViewportOptions = {}): void {
    const mediaQuery = window.matchMedia(MOBILE_EDITOR_QUERY);
    const editorPanel = getEditorPanel();
    const editorContent = getEditorContent();
    if (!editorPanel || !editorContent) return;

    let blurTimer = 0;

    const clearFocusedLayout = () => {
        document.body.classList.remove('mobile-editor-focused');
        editorContent.style.removeProperty('height');
    };

    const applyFocusedLayout = () => {
        const { height, offsetTop } = updateViewportVariables();
        if (!mediaQuery.matches || !isEditorFocused()) {
            clearFocusedLayout();
            return;
        }

        const panelTop = editorContent.getBoundingClientRect().top - offsetTop;
        const availableHeight = Math.max(220, Math.floor(height - Math.max(0, panelTop) - 12));

        document.body.classList.add('mobile-editor-focused');
        editorContent.style.height = `${availableHeight}px`;
        options.onEditorResize?.();

        window.requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize'));
        });
    };

    const handleFocusIn = (event: FocusEvent) => {
        if (!isEditorElement(event.target as Element | null)) return;
        if (blurTimer) {
            window.clearTimeout(blurTimer);
            blurTimer = 0;
        }

        if (mediaQuery.matches) {
            scrollEditorPanelIntoView(editorPanel);
        }
        window.setTimeout(applyFocusedLayout, 60);
    };

    const handleFocusOut = () => {
        if (blurTimer) {
            window.clearTimeout(blurTimer);
        }

        blurTimer = window.setTimeout(() => {
            blurTimer = 0;
            applyFocusedLayout();
        }, 120);
    };

    const handleViewportChange = () => {
        updateViewportVariables();
        applyFocusedLayout();
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    editorPanel.addEventListener('touchstart', () => window.setTimeout(applyFocusedLayout, 80), { passive: true });
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleViewportChange);
        window.visualViewport.addEventListener('scroll', handleViewportChange);
    }

    if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleViewportChange);
    } else {
        mediaQuery.addListener(handleViewportChange);
    }

    updateViewportVariables();
}
