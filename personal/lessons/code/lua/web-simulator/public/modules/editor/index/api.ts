import { currentDroneId, currentScriptLanguage, type ScriptLanguage } from '../../core/state.js';
import { Blockly } from '../../ui/mission-guide/blockly.js';
import {
    buildMainEditorToolbox,
    compileMainEditorWorkspace,
    createStarterWorkspaceXml
} from '../blockly.js';
import {
    syncBlocklyCodeOverlayToggle as syncBlocklyCodeOverlayToggleDom,
    syncBlocklyEditorToggle as syncBlocklyEditorToggleDom
} from '../dom.js';
import {
    ensureBlocklyResizeTracking as ensureBlocklyResizeTrackingSupport,
    isBlocklyWorkspaceEmpty as isBlocklyWorkspaceEmptySupport,
    resizeBlocklyWorkspaceViewport as resizeBlocklyWorkspaceViewportSupport,
    updateBlocklyPreview as updateBlocklyPreviewSupport
} from '../blockly/support.js';
import {
    expandEditorPanelForBlockly as expandEditorPanelForBlocklyAutofit,
    isStarterLuaScript,
    maybeAutoExpandTextEditorPanel as maybeAutoExpandTextEditorPanelAutofit,
    restoreEditorPanelWidthAfterBlockly as restoreEditorPanelWidthAfterBlocklyAutofit,
    scheduleEditorPanelAutofit as scheduleEditorPanelAutofitAutofit
} from '../autofit.js';
import { blocklyTheme } from '../runtime.js';
import {
    ensureBlocklyWorkspace as ensureBlocklyWorkspaceController,
    loadBlocklyWorkspace as loadBlocklyWorkspaceController,
    saveBlocklyWorkspaceState as saveBlocklyWorkspaceStateController
} from '../blockly/workspace-controller.js';
import {
    initBlocklyEditorToggle as initBlocklyEditorToggleController,
    setBlocklyEditorEnabled as setBlocklyEditorEnabledController
} from '../blockly/toggle-controller.js';
import {
    createEditorAutofitContext,
    getSavedEditorDraft as getSavedEditorDraftFromStorage,
    loadEditorIndexSession,
    persistEditorIndexSession
} from './helpers.js';
import { createEditorIndexControllers } from './runtime.js';
import {
    createEditor,
    createEditorShell,
    fallbackEditor,
    getEditorStateKey,
    getTextEditorValue,
    initializeEditorShellEnvironment,
    layoutEditor as layoutEditorShell,
    setEditorTheme as setEditorThemeShell,
    setEditorTextLanguage,
    setTextEditorValue,
    syncEditorModeVisibility
} from './shell.js';
import { editorIndexState, getEditorIndexCollections, getEditorIndexShellState } from './state.js';

function getEditorControllers() {
    return createEditorIndexControllers(editorIndexState, getEditorIndexCollections(), {
        theme: blocklyTheme,
        buildMainEditorToolbox,
        compileMainEditorWorkspace,
        createStarterWorkspaceXml,
        isStarterLuaScript,
        getTextEditorValue,
        getEditorStateKey,
        updateBlocklyPreview: (language: ScriptLanguage) => {
            updateBlocklyPreviewSupport(editorIndexState.blocklyPreview, editorIndexState.blocklyWorkspace, language);
        },
        resizeBlocklyWorkspaceViewport: () => {
            resizeBlocklyWorkspaceViewportSupport(
                editorIndexState.blocklyCanvasHost,
                editorIndexState.blocklyCanvas,
                editorIndexState.blocklyWorkspace
            );
        },
        ensureBlocklyResizeTracking: () => {
            ensureBlocklyResizeTrackingSupport(editorIndexState.blocklyResizeRuntime, editorIndexState.blocklyCanvasHost, () => {
                resizeBlocklyWorkspaceViewportSupport(
                    editorIndexState.blocklyCanvasHost,
                    editorIndexState.blocklyCanvas,
                    editorIndexState.blocklyWorkspace
                );
            });
        },
        scheduleBlocklyAutofit: () => {
            scheduleEditorPanelAutofitAutofit('blockly', createEditorAutofitContext(getEditorIndexShellState()));
        },
        setTextEditorValue,
        saveBlocklyWorkspaceState,
        ensureBlocklyWorkspace,
        loadBlocklyWorkspace,
        syncEditorModeVisibility,
        syncBlocklyEditorToggle: () => {
            syncBlocklyEditorToggleDom(editorIndexState.blocklyEnabled);
        },
        syncBlocklyCodeOverlayToggle: () => {
            syncBlocklyCodeOverlayToggleDom(
                editorIndexState.blocklyCodeOverlayToggle,
                editorIndexState.blocklyEnabled,
                editorIndexState.blocklyGeneratedCodeVisible
            );
        },
        restoreEditorPanelWidthAfterBlockly: () => {
            editorIndexState.previousSidebarWidthBeforeBlockly = restoreEditorPanelWidthAfterBlocklyAutofit(
                editorIndexState.previousSidebarWidthBeforeBlockly
            );
        },
        maybeAutoExpandTextEditorPanel: (text: string, language: ScriptLanguage = currentScriptLanguage) => {
            maybeAutoExpandTextEditorPanelAutofit(
                createEditorAutofitContext(getEditorIndexShellState()),
                text,
                language
            );
        },
        expandEditorPanelForBlockly: () => {
            editorIndexState.previousSidebarWidthBeforeBlockly = expandEditorPanelForBlocklyAutofit(
                createEditorAutofitContext(getEditorIndexShellState()),
                editorIndexState.previousSidebarWidthBeforeBlockly
            );
        },
        layoutEditor,
        isBlocklyWorkspaceEmpty: () => isBlocklyWorkspaceEmptySupport(editorIndexState.blocklyWorkspace),
        getCurrentScriptLanguage: () => currentScriptLanguage,
        setBlocklyWorkspace: (workspace: Blockly.WorkspaceSvg | null) => {
            editorIndexState.blocklyWorkspace = workspace;
        },
        setBlocklyEnabled: (enabled: boolean) => {
            editorIndexState.blocklyEnabled = enabled;
        },
        setBlocklyGeneratedCodeVisible: (visible: boolean) => {
            editorIndexState.blocklyGeneratedCodeVisible = visible;
        }
    });
}

function saveBlocklyWorkspaceState(language: ScriptLanguage = currentScriptLanguage): void {
    saveBlocklyWorkspaceStateController(getEditorControllers().workspaceController, language);
}

function loadBlocklyWorkspace(language: ScriptLanguage = currentScriptLanguage): void {
    loadBlocklyWorkspaceController(getEditorControllers().workspaceController, language);
}

function ensureBlocklyWorkspace(language: ScriptLanguage = currentScriptLanguage): void {
    ensureBlocklyWorkspaceController(getEditorControllers().workspaceController, language, currentScriptLanguage);
}

export function initEditor(): void {
    const persisted = loadEditorIndexSession(getEditorIndexShellState(), getEditorIndexCollections());
    editorIndexState.blocklyEnabled = persisted.blocklyEnabled;
    editorIndexState.blocklyGeneratedCodeVisible = persisted.blocklyGeneratedCodeVisible;

    try {
        initializeEditorShellEnvironment();
        createEditorShell();
        createEditor();
    } catch (error) {
        console.error('Monaco Editor load error:', error);
        createEditorShell();
        fallbackEditor();
    }
}

export function getEditorValue(): string {
    if (editorIndexState.blocklyEnabled && editorIndexState.blocklyWorkspace) {
        return compileMainEditorWorkspace(currentScriptLanguage, editorIndexState.blocklyWorkspace);
    }

    return getTextEditorValue();
}

export function setEditorValue(value: string): void {
    editorIndexState.textDraftByKey.set(getEditorStateKey(), value);
    persistEditorIndexSession(getEditorIndexShellState(), getEditorIndexCollections());

    if (editorIndexState.blocklyEnabled) {
        ensureBlocklyWorkspace(currentScriptLanguage);
        loadBlocklyWorkspace(currentScriptLanguage);
        return;
    }

    setTextEditorValue(value);
}

export function setEditorLanguage(language: ScriptLanguage): void {
    setEditorTextLanguage(language);

    if (editorIndexState.blocklyEnabled) {
        ensureBlocklyWorkspace(language);
        loadBlocklyWorkspace(language);
    }
}

export function setBlocklyEditorEnabled(enabled: boolean): void {
    setBlocklyEditorEnabledController(getEditorControllers().toggleController, enabled);
}

export function isBlocklyEditorEnabled(): boolean {
    return editorIndexState.blocklyEnabled;
}

export function initBlocklyEditorToggle(): void {
    initBlocklyEditorToggleController(getEditorControllers().toggleController);
}

export function getSavedEditorDraft(language: ScriptLanguage = currentScriptLanguage): string | null {
    loadEditorIndexSession(getEditorIndexShellState(), getEditorIndexCollections());
    return getSavedEditorDraftFromStorage(getEditorIndexCollections(), currentDroneId, language);
}

export function layoutEditor(): void {
    layoutEditorShell();
    resizeBlocklyWorkspaceViewportSupport(
        editorIndexState.blocklyCanvasHost,
        editorIndexState.blocklyCanvas,
        editorIndexState.blocklyWorkspace
    );
}

export function setEditorTheme(theme: 'light' | 'dark'): void {
    setEditorThemeShell(theme);
}
