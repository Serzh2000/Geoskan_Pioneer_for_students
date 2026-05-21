import { createEditorHost, type EditorIndexCollections, type EditorIndexControllerDeps, type EditorIndexShellState } from './helpers.js';

export function createEditorIndexControllers(
    state: EditorIndexShellState,
    collections: EditorIndexCollections,
    deps: EditorIndexControllerDeps
) {
    return createEditorHost(state, collections, deps);
}
