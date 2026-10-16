import type { ScriptLanguage } from '../core/state.js';
import { applyEditorLayoutState } from './blockly-mode/ui.js';

export type EditorShellRefs = {
    monacoRoot: HTMLElement | null;
    blocklyRoot: HTMLElement | null;
    blocklyCanvasHost: HTMLElement | null;
    blocklyCanvas: HTMLElement | null;
};

export type FallbackEditorOptions = {
    initialValue: string;
    onInput?: (value: string) => void;
};

export function getEditorStateKey(currentDroneId: string, language: ScriptLanguage): string {
    return `${currentDroneId}:${language}`;
}

// Ключ Blockly-воркспейса (фаза 7 плана): один на дрона, не зависит от языка —
// язык остаётся только выбором таргета компиляции, переключение языка не
// должно требовать другого workspace. Текстовые черновики (getEditorStateKey
// выше) по-прежнему хранятся отдельно на каждый язык.
export function getBlocklyWorkspaceStateKey(currentDroneId: string): string {
    return `${currentDroneId}:blockly`;
}

export function createEditorShell(): EditorShellRefs {
    const editorElement = document.getElementById('editor');
    if (!editorElement) {
        return {
            monacoRoot: null,
            blocklyRoot: null,
            blocklyCanvasHost: null,
            blocklyCanvas: null
        };
    }

    editorElement.innerHTML = `
        <div id="monaco-editor-root" class="editor-mode-root"></div>
        <div id="blockly-editor-root" class="editor-mode-root editor-mode-root--hidden">
            <div class="blockly-editor-shell">
                <div id="blockly-editor-canvas-host" class="blockly-editor-canvas-host">
                    <div id="blockly-editor-canvas" class="blockly-editor-canvas"></div>
                </div>
            </div>
        </div>
    `;

    return {
        monacoRoot: document.getElementById('monaco-editor-root'),
        blocklyRoot: document.getElementById('blockly-editor-root'),
        blocklyCanvasHost: document.getElementById('blockly-editor-canvas-host'),
        blocklyCanvas: document.getElementById('blockly-editor-canvas')
    };
}

export function syncEditorModeVisibility(
    refs: Pick<EditorShellRefs, 'monacoRoot' | 'blocklyRoot'>,
    blocklyEnabled: boolean
) {
    applyEditorLayoutState({
        monacoRoot: refs.monacoRoot,
        blocklyRoot: refs.blocklyRoot
    }, { blocklyEnabled });
}

// Единственный селектор режима/языка — выпадающий список в шапке
// (#script-language-select со значениями lua/python/blockly). Blockly больше не
// отдельный чекбокс, поэтому программное включение режима (например,
// loadMainBlocklyXml из гайда миссии) должно само приводить список в
// соответствие с состоянием редактора.
export function syncScriptLanguageSelect(blocklyEnabled: boolean, language: ScriptLanguage) {
    const select = document.getElementById('script-language-select') as HTMLSelectElement | null;
    if (select) select.value = blocklyEnabled ? 'blockly' : language;
}

function getFallbackEditorElement(): HTMLTextAreaElement | null {
    return document.getElementById('fallback-editor') as HTMLTextAreaElement | null;
}

export function hasFallbackEditor(): boolean {
    return Boolean(getFallbackEditorElement());
}

export function getFallbackEditorValue(): string {
    return getFallbackEditorElement()?.value || '';
}

export function setFallbackEditorValue(value: string): void {
    const fallbackEditorElement = getFallbackEditorElement();
    if (fallbackEditorElement) {
        fallbackEditorElement.value = value;
    }
}

export function fallbackEditor(monacoRoot: HTMLElement | null, options?: FallbackEditorOptions) {
    if (!monacoRoot) return;
    const initialValue = options?.initialValue || '-- Скрипт Pioneer Lua\n\nap.push(Ev.MCE_TAKEOFF)';
    monacoRoot.innerHTML = '<div class="editor-load-error">Не удалось загрузить Monaco Editor. Проверьте подключение к интернету. Используется резервный текстовый редактор.</div><textarea id="fallback-editor" class="fallback-editor resize-none"></textarea>';

    const fallbackEditorElement = getFallbackEditorElement();
    if (fallbackEditorElement) {
        fallbackEditorElement.value = initialValue;
        if (options?.onInput) {
            fallbackEditorElement.addEventListener('input', () => {
                options.onInput?.(fallbackEditorElement.value);
            });
        }
    }
}
