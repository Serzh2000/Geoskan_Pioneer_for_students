/*
 * The API reference and notifications share one side slot. The terminal
 * owns an independent bottom dock and never announces a side-slot change.
 */
export type EditorDrawerId = 'docs' | 'notifications';

export const EDITOR_DRAWER_OPEN_EVENT = 'editor-drawer:open';

export function announceEditorDrawerOpen(id: EditorDrawerId): void {
    document.dispatchEvent(new CustomEvent<EditorDrawerId>(EDITOR_DRAWER_OPEN_EVENT, { detail: id }));
}

/** Shared disclosure state and focus restoration for editor utility panels. */
export function setEditorDrawerState(panel: HTMLElement, button: HTMLElement, open: boolean, label: string): void {
    const restoreFocus = !open && panel.contains(document.activeElement);
    panel.hidden = !open;
    button.setAttribute('aria-pressed', String(open));
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-controls', panel.id);
    button.setAttribute('aria-label', `${open ? 'Закрыть' : 'Открыть'} ${label}`);
    button.title = `${open ? 'Закрыть' : 'Открыть'} ${label}`;
    if (restoreFocus) button.focus({ preventScroll: true });
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
