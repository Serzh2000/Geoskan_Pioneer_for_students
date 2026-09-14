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

export function computeExpandedSidebarWidth(viewportWidth: number, currentWidth: number): number {
    const safeViewportWidth = Math.max(0, Math.floor(viewportWidth));
    const preferredWidth = Math.round(safeViewportWidth * 0.58);
    const minimumWidth = Math.min(560, Math.max(0, safeViewportWidth - 80));
    const maximumWidth = Math.max(minimumWidth, Math.floor(safeViewportWidth * 0.78));
    return Math.min(1000, Math.max(minimumWidth, Math.min(maximumWidth, Math.max(currentWidth, preferredWidth))));
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
