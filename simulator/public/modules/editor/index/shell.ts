import { currentDroneId, currentScriptLanguage, DEFAULT_LUA_SCRIPT, drones, type ScriptLanguage } from '../../core/state.js';
import { blocklyStateKeySuffix } from '../blockly-mode/bricks/model.js';
import {
    createEditorShell as createEditorShellDom,
    fallbackEditor as mountFallbackEditor,
    getFallbackEditorValue,
    getEditorStateKey as getEditorStateKeyDom,
    getBlocklyWorkspaceStateKey as getBlocklyWorkspaceStateKeyDom,
    hasFallbackEditor,
    setFallbackEditorValue,
    syncEditorModeVisibility as syncEditorModeVisibilityDom
} from '../dom.js';
import {
    createTextEditorInstance,
    disposeTextEditorInstance,
    getTextEditorValueFromInstance,
    initializeMonacoEnvironment,
    layoutTextEditorInstance,
    setTextEditorTheme,
    setTextEditorLanguageOnInstance,
    setTextEditorValueOnInstance,
    type TextEditorValueMode
} from '../text-editor.js';
import type { EditorTheme } from '../text-editor.js';
import { getBlocklyThemeByName } from '../runtime.js';
import {
    createEditorAutofitContext,
    getSavedEditorDraft as getSavedEditorDraftFromStorage,
    persistEditorIndexSession
} from './helpers.js';
import { maybeAutoExpandTextEditorPanel as maybeAutoExpandTextEditorPanelAutofit } from '../autofit.js';
import {
    assignEditorIndexShell,
    editorIndexState,
    getEditorIndexCollections,
    getEditorIndexShellState,
    setPendingEditorLanguage,
    setPendingEditorValue
} from './state.js';

function persistCurrentEditorIndexSession(): void {
    persistEditorIndexSession(getEditorIndexShellState(), getEditorIndexCollections());
}

function scheduleTextEditorAutofit(text: string, language: ScriptLanguage = currentScriptLanguage): void {
    maybeAutoExpandTextEditorPanelAutofit(createEditorAutofitContext(getEditorIndexShellState()), text, language);
}

export function initializeEditorShellEnvironment(): void {
    initializeMonacoEnvironment();
}

export function getEditorStateKey(language: ScriptLanguage = currentScriptLanguage): string {
    return getEditorStateKeyDom(currentDroneId, language);
}

// Блоки Базового и Мини 2 хранятся раздельно: у Мини 2 ключ с суффиксом (`:bricks`), у Базового прежний.
// model не передан - модель текущего дрона; передана - явная (workspace прежней модели при её смене).
export function getBlocklyStateKey(model?: string | null): string {
    const resolved = model === undefined ? drones[currentDroneId]?.model : model;
    return getBlocklyWorkspaceStateKeyDom(currentDroneId) + blocklyStateKeySuffix(resolved);
}

export function syncEditorModeVisibility(): void {
    syncEditorModeVisibilityDom({
        monacoRoot: editorIndexState.monacoRoot,
        blocklyRoot: editorIndexState.blocklyRoot
    }, editorIndexState.blocklyEnabled);
}

export function createEditorShell(): void {
    assignEditorIndexShell(createEditorShellDom());
    syncEditorModeVisibility();
}

export function fallbackEditor(): void {
    mountFallbackEditor(editorIndexState.monacoRoot, {
        initialValue:
            editorIndexState.pendingValue ||
            getSavedEditorDraftFromStorage(getEditorIndexCollections(), currentDroneId, editorIndexState.pendingLanguage || currentScriptLanguage) ||
            DEFAULT_LUA_SCRIPT,
        onInput: (value) => {
            editorIndexState.textDraftByKey.set(getEditorStateKey(currentScriptLanguage), value);
            persistCurrentEditorIndexSession();
            scheduleTextEditorAutofit(value, currentScriptLanguage);
        }
    });
}

// Пересоздание оболочки затирает innerHTML контейнера вместе с DOM редактора,
// поэтому перед этим инстанс нужно погасить: иначе он останется жить со своими
// слушателями, воркерами и записью в глобальном реестре Monaco.
export function disposeEditor(): void {
    const editorInstance = editorIndexState.editorInstance;
    if (!editorInstance) return;

    editorIndexState.editorInstance = null;
    disposeTextEditorInstance(editorInstance);
}

export function createEditor(): void {
    const initialLanguage: ScriptLanguage = editorIndexState.pendingLanguage || 'lua';
    const initialValue =
        editorIndexState.pendingValue ||
        getSavedEditorDraftFromStorage(getEditorIndexCollections(), currentDroneId, initialLanguage) ||
        DEFAULT_LUA_SCRIPT;

    if (!editorIndexState.monacoRoot) {
        fallbackEditor();
        return;
    }

    editorIndexState.editorInstance = createTextEditorInstance({
        root: editorIndexState.monacoRoot,
        initialValue,
        initialLanguage,
        onDidChangeModelContent: (currentValue) => {
            editorIndexState.textDraftByKey.set(getEditorStateKey(currentScriptLanguage), currentValue);
            persistCurrentEditorIndexSession();
            scheduleTextEditorAutofit(currentValue, currentScriptLanguage);
        }
    });

    setPendingEditorValue(null);
    setPendingEditorLanguage(null);
    scheduleTextEditorAutofit(initialValue, initialLanguage);
}

export function getTextEditorValue(): string {
    return hasFallbackEditor() ? getFallbackEditorValue() : getTextEditorValueFromInstance(editorIndexState.editorInstance);
}

export function setTextEditorValue(value: string, mode: TextEditorValueMode = 'reset'): void {
    if (hasFallbackEditor()) {
        setFallbackEditorValue(value);
    } else if (!setTextEditorValueOnInstance(editorIndexState.editorInstance, value, mode)) {
        setPendingEditorValue(value);
    } else {
        setPendingEditorValue(null);
    }

    editorIndexState.textDraftByKey.set(getEditorStateKey(currentScriptLanguage), value);
    persistCurrentEditorIndexSession();
    scheduleTextEditorAutofit(value);
}

export function setEditorTextLanguage(language: ScriptLanguage): void {
    if (hasFallbackEditor()) return;

    if (!setTextEditorLanguageOnInstance(editorIndexState.editorInstance, language)) {
        setPendingEditorLanguage(language);
    }
}

export function layoutEditor(): void {
    layoutTextEditorInstance(editorIndexState.editorInstance);
}

export function setEditorTheme(theme: EditorTheme): void {
    if (hasFallbackEditor()) return;

    setTextEditorTheme(theme);
    const resolvedTheme = getBlocklyThemeByName(theme === 'paper' ? 'light' : theme);
    if (resolvedTheme) {
        editorIndexState.blocklyWorkspace?.setTheme(resolvedTheme);
    }
}
