import 'monaco-editor/min/vs/editor/editor.main.css';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import 'monaco-editor/esm/vs/editor/editor.all.js';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';
import type { ScriptLanguage } from '../core/state.js';
import { ensureEditorBlocklyDefinitions } from './blockly-mode/index.js';
import { setupCompletionProvider } from './monaco/completion.js';
import { setupHoverProvider } from './monaco/hover.js';
import { setupSyntaxHighlighting } from './monaco/syntax.js';
import { editorRuntime } from './runtime.js';
import type { AppTheme } from '../app/theme-toggle.js';

export type TextEditorCreateOptions = {
    root: HTMLElement;
    initialValue: string;
    initialLanguage: ScriptLanguage;
    onDidChangeModelContent?: (value: string) => void;
};

export function initializeMonacoEnvironment(): void {
    (self as typeof globalThis & {
        MonacoEnvironment?: { getWorker: () => Worker };
    }).MonacoEnvironment = {
        getWorker() {
            return new editorWorker();
        }
    };
}

function getMonacoLanguage(language: ScriptLanguage): 'lua' | 'python' {
    return language === 'lua' ? 'lua' : 'python';
}

function getMonacoThemeName(theme: AppTheme): 'pioneer-light' | 'pioneer-dark' {
    return theme === 'dark' ? 'pioneer-dark' : 'pioneer-light';
}

function getCurrentAppTheme(): AppTheme {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function createTextEditorInstance(options: TextEditorCreateOptions): any {
    setupSyntaxHighlighting(monaco);
    setupHoverProvider(monaco);
    setupCompletionProvider(monaco);
    ensureEditorBlocklyDefinitions();

    const editorInstance = monaco.editor.create(options.root, {
        value: options.initialValue,
        language: getMonacoLanguage(options.initialLanguage),
        theme: getMonacoThemeName(getCurrentAppTheme()),
        automaticLayout: true,
        wordBasedSuggestions: 'off',
        quickSuggestions: {
            other: true,
            comments: false,
            strings: false
        },
        suggestOnTriggerCharacters: true,
        parameterHints: {
            enabled: true
        },
        hover: {
            enabled: true,
            delay: 200,
            sticky: true
        },
        fontSize: 14,
        fontFamily: "'Fira Code', monospace",
        minimap: { enabled: false },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        fixedOverflowWidgets: true,
        suggest: {
            snippetsPreventQuickSuggestions: false
        }
    });

    if (options.onDidChangeModelContent) {
        editorInstance.onDidChangeModelContent(() => {
            options.onDidChangeModelContent?.(editorInstance.getValue());
        });
    }

    return editorInstance;
}

export function createTextEditor(): void {
    const initialLanguage: ScriptLanguage = editorRuntime.pendingLanguage || 'lua';
    const initialValue =
        editorRuntime.pendingValue ||
        '-- ������ Pioneer Lua\n\nap.push(Ev.MCE_TAKEOFF)\n\nTimer.callLater(3, function()\n    ap.push(Ev.MCE_LANDING)\nend)';

    if (!editorRuntime.monacoRoot) {
        return;
    }

    editorRuntime.editorInstance = createTextEditorInstance({
        root: editorRuntime.monacoRoot,
        initialValue,
        initialLanguage
    });

    editorRuntime.pendingValue = null;
    editorRuntime.pendingLanguage = null;
}

export function getTextEditorValueFromInstance(editorInstance: any): string {
    return editorInstance ? editorInstance.getValue() : '';
}

export function getTextEditorValue(): string {
    if ((window as any).getEditorValueFallback) {
        return (window as any).getEditorValueFallback();
    }

    return getTextEditorValueFromInstance(editorRuntime.editorInstance);
}

export function setTextEditorValueOnInstance(editorInstance: any, value: string): boolean {
    if (!editorInstance) {
        return false;
    }

    editorInstance.setValue(value);
    return true;
}

export function setTextEditorValue(value: string): void {
    if ((window as any).setEditorValueFallback) {
        (window as any).setEditorValueFallback(value);
        return;
    }

    if (setTextEditorValueOnInstance(editorRuntime.editorInstance, value)) {
        return;
    }

    editorRuntime.pendingValue = value;
}

export function setTextEditorLanguageOnInstance(editorInstance: any, language: ScriptLanguage): boolean {
    const model = editorInstance?.getModel ? editorInstance.getModel() : null;
    if (!model) {
        return false;
    }

    monaco.editor.setModelLanguage(model, getMonacoLanguage(language));
    return true;
}

export function setTextEditorLanguage(language: ScriptLanguage): void {
    if ((window as any).getEditorValueFallback) {
        return;
    }

    if (!editorRuntime.editorInstance) {
        editorRuntime.pendingLanguage = language;
        return;
    }

    setTextEditorLanguageOnInstance(editorRuntime.editorInstance, language);
}

export function layoutTextEditorInstance(editorInstance: any): void {
    if (editorInstance) {
        editorInstance.layout();
    }
}

export function layoutTextEditor(): void {
    layoutTextEditorInstance(editorRuntime.editorInstance);
}

export function setTextEditorTheme(theme: AppTheme): void {
    setupSyntaxHighlighting(monaco);
    monaco.editor.setTheme(getMonacoThemeName(theme));
}
