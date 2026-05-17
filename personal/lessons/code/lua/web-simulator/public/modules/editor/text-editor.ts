import 'monaco-editor/min/vs/editor/editor.main.css';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';
import type { ScriptLanguage } from '../core/state.js';
import { ensureEditorBlocklyDefinitions } from './blockly-mode/index.js';
import { setupCompletionProvider } from './monaco/completion.js';
import { setupHoverProvider } from './monaco/hover.js';
import { setupSyntaxHighlighting } from './monaco/syntax.js';
import { editorRuntime } from './runtime.js';

export function initializeMonacoEnvironment(): void {
    (self as typeof globalThis & {
        MonacoEnvironment?: { getWorker: () => Worker };
    }).MonacoEnvironment = {
        getWorker() {
            return new editorWorker();
        }
    };
}

export function createTextEditor(): void {
    setupSyntaxHighlighting(monaco);
    setupHoverProvider(monaco);
    setupCompletionProvider(monaco);
    ensureEditorBlocklyDefinitions();

    const initialLanguage: ScriptLanguage = editorRuntime.pendingLanguage || 'lua';
    const initialMonacoLang = initialLanguage === 'lua' ? 'lua' : 'python';
    const initialValue =
        editorRuntime.pendingValue ||
        '-- Скрипт Pioneer Lua\n\nap.push(Ev.MCE_TAKEOFF)\n\nTimer.callLater(3, function()\n    ap.push(Ev.MCE_LANDING)\nend)';

    if (!editorRuntime.monacoRoot) {
        return;
    }

    editorRuntime.editorInstance = monaco.editor.create(editorRuntime.monacoRoot, {
        value: initialValue,
        language: initialMonacoLang,
        theme: 'pioneer-light',
        automaticLayout: true,
        wordBasedSuggestions: 'off',
        fontSize: 14,
        fontFamily: "'Fira Code', monospace",
        minimap: { enabled: false },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        fixedOverflowWidgets: true,
        suggest: {
            snippetsPreventQuickSuggestions: false
        }
    });

    editorRuntime.pendingValue = null;
    editorRuntime.pendingLanguage = null;
}

export function getTextEditorValue(): string {
    if ((window as any).getEditorValueFallback) {
        return (window as any).getEditorValueFallback();
    }

    return editorRuntime.editorInstance ? editorRuntime.editorInstance.getValue() : '';
}

export function setTextEditorValue(value: string): void {
    if ((window as any).setEditorValueFallback) {
        (window as any).setEditorValueFallback(value);
        return;
    }

    if (editorRuntime.editorInstance) {
        editorRuntime.editorInstance.setValue(value);
        return;
    }

    editorRuntime.pendingValue = value;
}

export function setTextEditorLanguage(language: ScriptLanguage): void {
    if ((window as any).getEditorValueFallback) {
        return;
    }

    if (!editorRuntime.editorInstance) {
        editorRuntime.pendingLanguage = language;
        return;
    }

    const model = editorRuntime.editorInstance.getModel ? editorRuntime.editorInstance.getModel() : null;
    if (!model) {
        return;
    }

    monaco.editor.setModelLanguage(model, language === 'lua' ? 'lua' : 'python');
}

export function layoutTextEditor(): void {
    if (editorRuntime.editorInstance) {
        editorRuntime.editorInstance.layout();
    }
}
