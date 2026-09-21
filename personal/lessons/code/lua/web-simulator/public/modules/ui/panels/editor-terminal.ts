import { getLogEntries, onLogsChanged, createLogEntryElement } from '../../shared/logging/logger.js';

/*
 * Read-only terminal drawer inside the code editor - a second, faster way
 * to glance at the log stream without leaving the editor. It mirrors the
 * same log entries the (now sidebar-hidden) Логи panel renders, via the
 * shared logger module; no input, no filters.
 */
export function initEditorTerminal(): void {
    const toggleBtn = document.getElementById('editor-terminal-toggle-btn');
    const closeBtn = document.getElementById('editor-terminal-close-btn');
    const panel = document.getElementById('editor-terminal');
    const stream = document.getElementById('editor-terminal-stream');
    if (!toggleBtn || !closeBtn || !panel || !stream) return;

    let unsubscribe: (() => void) | null = null;

    const render = () => {
        const entries = getLogEntries();
        if (entries.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'editor-terminal__empty';
            empty.textContent = 'Событий пока нет.';
            stream.replaceChildren(empty);
            return;
        }

        const fragment = document.createDocumentFragment();
        entries.forEach((entry) => fragment.appendChild(createLogEntryElement(entry)));
        stream.replaceChildren(fragment);
        stream.scrollTop = stream.scrollHeight;
    };

    const close = () => {
        panel.hidden = true;
        toggleBtn.setAttribute('aria-pressed', 'false');
        unsubscribe?.();
        unsubscribe = null;
    };

    toggleBtn.addEventListener('click', () => {
        if (!panel.hidden) {
            close();
            return;
        }
        // Only one side drawer at a time - they occupy the same docked slot.
        (document.getElementById('editor-notifications-toggle-btn') as HTMLButtonElement | null)?.dispatchEvent(
            new CustomEvent('editor-drawer:close-if-open')
        );
        render();
        panel.hidden = false;
        toggleBtn.setAttribute('aria-pressed', 'true');
        unsubscribe = onLogsChanged(render);
    });

    closeBtn.addEventListener('click', close);

    toggleBtn.addEventListener('editor-drawer:close-if-open', () => {
        if (!panel.hidden) close();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !panel.hidden) close();
    });
}
