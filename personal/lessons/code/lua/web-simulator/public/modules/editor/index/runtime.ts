import { createEditorHost, type EditorIndexCollections, type EditorIndexControllerDeps, type EditorIndexShellState } from './helpers.js';

export function createEditorIndexShellState(state: EditorIndexShellState): EditorIndexShellState {
    return {
        editorInstance: state.editorInstance,
        pendingValue: state.pendingValue,
        pendingLanguage: state.pendingLanguage,
        monacoRoot: state.monacoRoot,
        blocklyRoot: state.blocklyRoot,
        blocklyCanvasHost: state.blocklyCanvasHost,
        blocklyCanvas: state.blocklyCanvas,
        blocklyWorkspace: state.blocklyWorkspace,
        blocklyCodeOverlayToggle: state.blocklyCodeOverlayToggle,
        blocklyEnabled: state.blocklyEnabled,
        blocklyGeneratedCodeVisible: state.blocklyGeneratedCodeVisible,
        previousSidebarWidthBeforeBlockly: state.previousSidebarWidthBeforeBlockly
    };
}

export function createEditorIndexControllers(
    state: EditorIndexShellState,
    collections: EditorIndexCollections,
    deps: EditorIndexControllerDeps
) {
    return createEditorHost(createEditorIndexShellState(state), collections, deps);
}
