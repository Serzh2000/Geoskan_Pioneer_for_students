/**
 * Публичный фасад редактора кода.
 * Детали Monaco и Blockly разнесены по специализированным модулям,
 * а этот файл сохраняет прежний внешний API для остального приложения.
 */
import type { ScriptLanguage } from '../core/state.js';
import { fallbackEditor, createEditorShell as createEditorShellDom } from './dom.js';
import {
    getBlocklyEditorValue,
    initBlocklyEditorToggle,
    isBlocklyEditorEnabled,
    resizeBlocklyWorkspaceViewport,
    setBlocklyEditorEnabled,
    setBlocklyEditorLanguage,
    setBlocklyEditorValue,
    syncBlocklyUiState
} from './blockly-editor.js';
import { assignEditorShell, editorRuntime } from './runtime.js';
import {
    createTextEditor,
    getTextEditorValue,
    initializeMonacoEnvironment,
    layoutTextEditor,
    setTextEditorLanguage
} from './text-editor.js';

function createEditorShell(): void {
    assignEditorShell(createEditorShellDom());
    syncBlocklyUiState();
}

export function initEditor(): void {
    try {
        initializeMonacoEnvironment();
        createEditorShell();

        if (!editorRuntime.monacoRoot) {
            fallbackEditor(editorRuntime.monacoRoot);
            return;
        }

        createTextEditor();
    } catch (err) {
        console.error('Monaco Editor load error:', err);
        createEditorShell();
        fallbackEditor(editorRuntime.monacoRoot);
    }
}

export function getEditorValue(): string {
    return getBlocklyEditorValue() ?? getTextEditorValue();
}

export function setEditorValue(value: string): void {
    setBlocklyEditorValue(value);
}

export function setEditorLanguage(language: ScriptLanguage): void {
    setTextEditorLanguage(language);
    setBlocklyEditorLanguage(language);
}

export { initBlocklyEditorToggle, isBlocklyEditorEnabled, setBlocklyEditorEnabled };

export function layoutEditor(): void {
    layoutTextEditor();
    resizeBlocklyWorkspaceViewport();
}
