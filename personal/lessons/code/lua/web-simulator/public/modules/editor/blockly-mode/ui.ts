export type EditorLayoutState = {
    blocklyEnabled: boolean;
};

export type EditorUiElements = {
    monacoRoot?: HTMLElement | null;
    blocklyRoot?: HTMLElement | null;
};

export type BlocklyViewportDimensions = {
    width: number;
    height: number;
};

const COMPACT_VIEWPORT_BREAKPOINT = 1500;
const MAX_SIDEBAR_RATIO_COMPACT = 0.42;
const MIN_EXPANDED_SIDEBAR_WIDTH = 336;
const MIN_MAIN_SCENE_WIDTH_WIDE = 980;

export function computeExpandedSidebarWidth(viewportWidth: number, currentWidth: number): number {
    const safeViewportWidth = Math.max(0, Math.floor(viewportWidth));
    const preferredWidth = Math.round(safeViewportWidth * 0.4);
    const maximumWidth = safeViewportWidth >= COMPACT_VIEWPORT_BREAKPOINT
        ? Math.max(MIN_EXPANDED_SIDEBAR_WIDTH, safeViewportWidth - MIN_MAIN_SCENE_WIDTH_WIDE)
        : Math.max(MIN_EXPANDED_SIDEBAR_WIDTH, Math.floor(safeViewportWidth * MAX_SIDEBAR_RATIO_COMPACT));
    const minimumWidth = Math.min(Math.max(MIN_EXPANDED_SIDEBAR_WIDTH, preferredWidth), maximumWidth);
    return Math.min(1000, Math.max(320, Math.max(minimumWidth, Math.min(maximumWidth, Math.max(currentWidth, preferredWidth)))));
}

export function computeBlocklyViewportDimensions(width: number, height: number): BlocklyViewportDimensions {
    return {
        width: Math.max(0, Math.floor(width)),
        height: Math.max(0, Math.floor(height))
    };
}

export function resizeBlocklyCanvas(
    host: HTMLElement | null | undefined,
    canvas: HTMLElement | null | undefined
): BlocklyViewportDimensions | null {
    if (!host || !canvas) return null;

    const rect = host.getBoundingClientRect();
    const dimensions = computeBlocklyViewportDimensions(rect.width, rect.height);
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    return dimensions;
}

export function applyEditorLayoutState(elements: EditorUiElements, state: EditorLayoutState): void {
    elements.monacoRoot?.classList.toggle('editor-mode-root--hidden', state.blocklyEnabled);
    elements.blocklyRoot?.classList.toggle('editor-mode-root--hidden', !state.blocklyEnabled);
}
