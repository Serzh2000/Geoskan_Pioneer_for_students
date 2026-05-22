import { currentDroneId, currentScriptLanguage, DEFAULT_LUA_SCRIPT, type ScriptLanguage } from '../../core/state.js';
import {
    createEditorShell as createEditorShellDom,
    fallbackEditor as mountFallbackEditor,
    getFallbackEditorValue,
    getEditorStateKey as getEditorStateKeyDom,
    hasFallbackEditor,
    setFallbackEditorValue,
    syncEditorModeVisibility as syncEditorModeVisibilityDom
} from '../dom.js';
import {
    createTextEditorInstance,
    getTextEditorValueFromInstance,
    initializeMonacoEnvironment,
    layoutTextEditorInstance,
    setTextEditorTheme,
    setTextEditorLanguageOnInstance,
    setTextEditorValueOnInstance
} from '../text-editor.js';
import type { AppTheme } from '../../app/theme-toggle.js';
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

export function syncEditorModeVisibility(): void {
    syncEditorModeVisibilityDom({
        monacoRoot: editorIndexState.monacoRoot,
        blocklyRoot: editorIndexState.blocklyRoot,
        blocklyCodeOverlay: editorIndexState.blocklyCodeOverlay,
        blocklyCodeOverlayToggle: editorIndexState.blocklyCodeOverlayToggle
    }, editorIndexState.blocklyEnabled, editorIndexState.blocklyGeneratedCodeVisible);
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

export function setTextEditorValue(value: string): void {
    if (hasFallbackEditor()) {
        setFallbackEditorValue(value);
    } else if (!setTextEditorValueOnInstance(editorIndexState.editorInstance, value)) {
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

export function setEditorTheme(theme: AppTheme): void {
    if (hasFallbackEditor()) return;

    setTextEditorTheme(theme);
}
