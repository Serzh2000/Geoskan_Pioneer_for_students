import { EDITOR_DRAWER_OPEN_EVENT, announceEditorDrawerOpen } from './editor-drawers.js';

/*
 * API reference drawer inside the code editor, next to the terminal and the
 * notification center. The reference itself is still rendered by
 * ui/api-docs into #api-docs - that container is simply moved in here from
 * the (rail-hidden) docs sidebar panel, so every existing renderApiDocs()
 * call keeps working unchanged.
 */
export const EDITOR_DOCS_OPEN_EVENT = 'editor-docs:open';

export function initEditorDocs(): void {
    const toggleBtn = document.getElementById('editor-docs-toggle-btn');
    const closeBtn = document.getElementById('editor-docs-close-btn');
    const panel = document.getElementById('editor-docs');
    const body = document.getElementById('editor-docs-body');
    const docs = document.getElementById('api-docs');
    if (!toggleBtn || !closeBtn || !panel || !body) return;

    if (docs && docs.parentElement !== body) body.appendChild(docs);

    const close = () => {
        panel.hidden = true;
        toggleBtn.setAttribute('aria-pressed', 'false');
    };

    const open = () => {
        announceEditorDrawerOpen('docs');
        panel.hidden = false;
        toggleBtn.setAttribute('aria-pressed', 'true');
    };

    toggleBtn.addEventListener('click', () => (panel.hidden ? open() : close()));
    closeBtn.addEventListener('click', close);

    document.addEventListener(EDITOR_DRAWER_OPEN_EVENT, (event) => {
        if ((event as CustomEvent<string>).detail !== 'docs') close();
    });
    // Fired by api-docs' openApiDocsCatalog() (e.g. from the mission guide).
    document.addEventListener(EDITOR_DOCS_OPEN_EVENT, open);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !panel.hidden) close();
    });
}
