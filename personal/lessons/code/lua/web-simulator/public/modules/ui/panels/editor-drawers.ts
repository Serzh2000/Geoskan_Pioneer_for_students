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

/*
 * The drawers park off the panel's right edge (translateX(100%)). Where the
 * panel content has to scroll vertically (the narrow layout) CSS cannot clip
 * just the x axis, so focus landing in a drawer mid-slide would scroll the
 * panel sideways and push the editor and the close buttons off-screen.
 * The panel never has a reason to be scrolled horizontally: undo it.
 */
export function pinEditorPanelHorizontalScroll(): void {
    const content = document.querySelector<HTMLElement>('.panel-content--editor');
    if (!content) return;
    content.addEventListener('scroll', () => {
        if (content.scrollLeft !== 0) content.scrollLeft = 0;
    }, { passive: true });
}
