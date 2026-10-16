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
