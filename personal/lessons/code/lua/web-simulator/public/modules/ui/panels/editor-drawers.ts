/*
 * The editor's side drawers (API reference, terminal, notifications) share
 * one docked slot, so only one may be open at a time. Each drawer announces
 * itself when it opens and closes whenever another one announces.
 */
export type EditorDrawerId = 'docs' | 'terminal' | 'notifications';

export const EDITOR_DRAWER_OPEN_EVENT = 'editor-drawer:open';

export function announceEditorDrawerOpen(id: EditorDrawerId): void {
    document.dispatchEvent(new CustomEvent<EditorDrawerId>(EDITOR_DRAWER_OPEN_EVENT, { detail: id }));
}
