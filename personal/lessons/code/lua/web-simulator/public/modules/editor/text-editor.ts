import 'monaco-editor/min/vs/editor/editor.main.css';
import './script-problem-highlight.css';
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

const SCRIPT_PROBLEM_MARKER_OWNER = 'script-run-problem';
let scriptProblemDecorationIds: string[] = [];

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

function getFallbackEditorElement(): HTMLTextAreaElement | null {
    return document.getElementById('fallback-editor') as HTMLTextAreaElement | null;
}

function clearFallbackEditorProblemHighlight(): void {
    const fallbackEditorElement = getFallbackEditorElement();
    if (!fallbackEditorElement) return;
    fallbackEditorElement.style.borderColor = 'rgba(9,9,11,0.1)';
    fallbackEditorElement.style.boxShadow = '';
  }

function highlightFallbackEditorProblem(line: number): void {
    const fallbackEditorElement = getFallbackEditorElement();
    if (!fallbackEditorElement) return;

    const lines = fallbackEditorElement.value.split('\n');
    const safeLine = Math.max(1, Math.min(line || 1, Math.max(lines.length, 1)));
    let startOffset = 0;
    for (let index = 0; index < safeLine - 1; index += 1) {
        startOffset += (lines[index]?.length || 0) + 1;
    }
    const endOffset = startOffset + (lines[safeLine - 1]?.length || 0);

    fallbackEditorElement.focus();
    fallbackEditorElement.setSelectionRange(startOffset, endOffset);
    fallbackEditorElement.style.borderColor = '#d13b2e';
    fallbackEditorElement.style.boxShadow = '0 0 0 3px rgba(209, 59, 46, 0.18)';
}

function syncEditorProblemHandlers(): void {
    (window as any).highlightEditorProblem = highlightTextEditorProblem;
    (window as any).clearEditorProblemHighlight = clearTextEditorProblemHighlight;
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
            snippetsPreventQuickSuggestions: false,
            showWords: false
        }
    });

    if (options.onDidChangeModelContent) {
        editorInstance.onDidChangeModelContent(() => {
            clearTextEditorProblemHighlight();
            options.onDidChangeModelContent?.(editorInstance.getValue());
        });
    }

    return editorInstance;
}

export function createTextEditor(): void {
    const initialLanguage: ScriptLanguage = editorRuntime.pendingLanguage || 'lua';
    const initialValue =
        editorRuntime.pendingValue ||
        '-- Pioneer Lua Script\n\nap.push(Ev.MCE_TAKEOFF)\n\nTimer.callLater(3, function()\n    ap.push(Ev.MCE_LANDING)\nend)';

    if (!editorRuntime.monacoRoot) {
        return;
    }

    editorRuntime.editorInstance = createTextEditorInstance({
        root: editorRuntime.monacoRoot,
        initialValue,
        initialLanguage
    });
    syncEditorProblemHandlers();

    editorRuntime.pendingValue = null;
    editorRuntime.pendingLanguage = null;
}

export function clearTextEditorProblemHighlight(): void {
    clearFallbackEditorProblemHighlight();

    const editorInstance = editorRuntime.editorInstance;
    const model = editorInstance?.getModel ? editorInstance.getModel() : null;
    if (!model) return;

    monaco.editor.setModelMarkers(model, SCRIPT_PROBLEM_MARKER_OWNER, []);
    if (scriptProblemDecorationIds.length) {
        scriptProblemDecorationIds = editorInstance.deltaDecorations(scriptProblemDecorationIds, []);
    }
}

export function highlightTextEditorProblem(options: {
    line: number;
    column?: number | null;
    endColumn?: number | null;
    message: string;
}): void {
    const safeLine = Math.max(1, options.line || 1);
    const editorInstance = editorRuntime.editorInstance;
    const model = editorInstance?.getModel ? editorInstance.getModel() : null;

    if (!model) {
        highlightFallbackEditorProblem(safeLine);
        return;
    }

    const boundedLine = Math.min(safeLine, model.getLineCount());
    const lineMaxColumn = model.getLineMaxColumn(boundedLine);
    const startColumn = Math.max(1, Math.min(options.column || 1, lineMaxColumn));
    const endColumn = Math.max(
        startColumn + 1,
        Math.min(options.endColumn || lineMaxColumn, lineMaxColumn)
    );

    monaco.editor.setModelMarkers(model, SCRIPT_PROBLEM_MARKER_OWNER, [{
        severity: monaco.MarkerSeverity.Error,
        message: options.message,
        startLineNumber: boundedLine,
        startColumn,
        endLineNumber: boundedLine,
        endColumn
    }]);

    scriptProblemDecorationIds = editorInstance.deltaDecorations(scriptProblemDecorationIds, [{
        range: new monaco.Range(boundedLine, 1, boundedLine, lineMaxColumn),
        options: {
            isWholeLine: true,
            className: 'editor-script-problem-line',
            linesDecorationsClassName: 'editor-script-problem-gutter',
            overviewRuler: {
                color: 'rgba(209, 59, 46, 0.95)',
                position: monaco.editor.OverviewRulerLane.Full
            }
        }
    }]);

    editorInstance.revealLineInCenter(boundedLine);
    editorInstance.setPosition({ lineNumber: boundedLine, column: startColumn });
    editorInstance.focus();
}

syncEditorProblemHandlers();

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
