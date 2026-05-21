export type EditorLayoutState = {
    blocklyEnabled: boolean;
    generatedCodeVisible: boolean;
};

export type EditorUiElements = {
    monacoRoot?: HTMLElement | null;
    blocklyRoot?: HTMLElement | null;
    codeOverlay?: HTMLElement | null;
    codeToggle?: HTMLInputElement | null;
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
    const overlayVisible = state.blocklyEnabled && state.generatedCodeVisible;

    elements.monacoRoot?.classList.toggle('editor-mode-root--hidden', state.blocklyEnabled);
    elements.blocklyRoot?.classList.toggle('editor-mode-root--hidden', !state.blocklyEnabled);

    if (elements.codeOverlay) {
        elements.codeOverlay.classList.toggle('blockly-code-overlay--visible', overlayVisible);
        elements.codeOverlay.setAttribute('aria-hidden', overlayVisible ? 'false' : 'true');
    }

    if (elements.codeToggle) {
        elements.codeToggle.disabled = !state.blocklyEnabled;
        elements.codeToggle.checked = overlayVisible;
        elements.codeToggle.setAttribute('aria-disabled', state.blocklyEnabled ? 'false' : 'true');
    }
}

export function updateGeneratedCodePreview(preview: HTMLElement | null | undefined, code: string): void {
    if (!preview) return;
    preview.textContent = code;
}
