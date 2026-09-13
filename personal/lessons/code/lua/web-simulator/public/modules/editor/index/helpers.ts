import type { BlocklyNS } from '../blockly-mode/loader.js';
import type { ScriptLanguage } from '../../core/state.js';
import type { EditorAutofitContext } from '../autofit.js';
import type { BlocklyWorkspaceController } from '../blockly/workspace-controller.js';
import { createBlocklyToggleController, createBlocklyWorkspaceController, type EditorControllerHost } from './controllers.js';
import {
    getSavedEditorDraft as getSavedEditorDraftFromSession,
    loadPersistedEditorSession as loadPersistedEditorSessionFromStorage,
    persistEditorSession as persistEditorSessionToStorage
} from './session.js';

export type EditorIndexShellState = {
    editorInstance: any;
    pendingValue: string | null;
    pendingLanguage: ScriptLanguage | null;
    monacoRoot: HTMLElement | null;
    blocklyRoot: HTMLElement | null;
    blocklyCanvasHost: HTMLElement | null;
    blocklyCanvas: HTMLElement | null;
    blocklyWorkspace: BlocklyNS.WorkspaceSvg | null;
    blocklyCodeOverlayToggle: HTMLInputElement | null;
    blocklyEnabled: boolean;
    blocklyGeneratedCodeVisible: boolean;
    previousSidebarWidthBeforeBlockly: string | null;
};

export type EditorIndexCollections = {
    textDraftByKey: Map<string, string>;
    blocklyWorkspaceXmlByKey: Map<string, string>;
};

export type EditorIndexControllerDeps = {
    getTheme: () => BlocklyNS.Theme | undefined;
    buildMainEditorToolbox: BlocklyWorkspaceController['buildMainEditorToolbox'];
    compileMainEditorWorkspace: BlocklyWorkspaceController['compileMainEditorWorkspace'];
    createStarterWorkspaceXml: BlocklyWorkspaceController['createStarterWorkspaceXml'];
    isStarterLuaScript: BlocklyWorkspaceController['isStarterLuaScript'];
    getTextEditorValue: () => string;
    getEditorStateKey: (language: ScriptLanguage) => string;
    updateBlocklyPreview: (language: ScriptLanguage) => void;
    resizeBlocklyWorkspaceViewport: () => void;
    ensureBlocklyResizeTracking: () => void;
    scheduleBlocklyAutofit: () => void;
    setTextEditorValue: (value: string) => void;
    saveBlocklyWorkspaceState: (language?: ScriptLanguage) => void;
    ensureBlocklyWorkspace: (language: ScriptLanguage) => Promise<void>;
    loadBlocklyWorkspace: (language: ScriptLanguage) => void;
    syncEditorModeVisibility: () => void;
    syncBlocklyEditorToggle: () => void;
    syncBlocklyCodeOverlayToggle: () => void;
    restoreEditorPanelWidthAfterBlockly: () => void;
    maybeAutoExpandTextEditorPanel: (text: string, language?: ScriptLanguage) => void;
    expandEditorPanelForBlockly: () => void;
    layoutEditor: () => void;
    isBlocklyWorkspaceEmpty: () => boolean;
    getCurrentScriptLanguage: () => ScriptLanguage;
    setBlocklyWorkspace: (workspace: BlocklyNS.WorkspaceSvg | null) => void;
    setBlocklyEnabled: (enabled: boolean) => void;
    setBlocklyGeneratedCodeVisible: (visible: boolean) => void;
};

export function createEditorAutofitContext(state: EditorIndexShellState): EditorAutofitContext {
    return {
        monacoRoot: state.monacoRoot,
        blocklyRoot: state.blocklyRoot,
        blocklyCanvasHost: state.blocklyCanvasHost,
        blocklyCanvas: state.blocklyCanvas,
        blocklyWorkspace: state.blocklyWorkspace,
        editorInstance: state.editorInstance
    };
}

export function persistEditorIndexSession(
    state: Pick<EditorIndexShellState, 'blocklyEnabled' | 'blocklyGeneratedCodeVisible'>,
    collections: EditorIndexCollections
): void {
    persistEditorSessionToStorage({
        textDraftByKey: collections.textDraftByKey,
        blocklyWorkspaceXmlByKey: collections.blocklyWorkspaceXmlByKey,
        blocklyEnabled: state.blocklyEnabled,
        blocklyGeneratedCodeVisible: state.blocklyGeneratedCodeVisible
    });
}

export function loadEditorIndexSession(
    state: Pick<EditorIndexShellState, 'blocklyEnabled' | 'blocklyGeneratedCodeVisible'>,
    collections: EditorIndexCollections
): Pick<EditorIndexShellState, 'blocklyEnabled' | 'blocklyGeneratedCodeVisible'> {
    const persisted = loadPersistedEditorSessionFromStorage({
        textDraftByKey: collections.textDraftByKey,
        blocklyWorkspaceXmlByKey: collections.blocklyWorkspaceXmlByKey
    });

    return {
        blocklyEnabled: typeof persisted?.blocklyEnabled === 'boolean' ? persisted.blocklyEnabled : state.blocklyEnabled,
        blocklyGeneratedCodeVisible:
            typeof persisted?.blocklyGeneratedCodeVisible === 'boolean'
                ? persisted.blocklyGeneratedCodeVisible
                : state.blocklyGeneratedCodeVisible
    };
}

export function getSavedEditorDraft(
    collections: Pick<EditorIndexCollections, 'textDraftByKey'>,
    currentDroneId: string,
    language: ScriptLanguage
): string | null {
    return getSavedEditorDraftFromSession(collections.textDraftByKey, currentDroneId, language);
}

export function createEditorHost(
    state: EditorIndexShellState,
    collections: EditorIndexCollections,
    deps: EditorIndexControllerDeps
) {
    const host: EditorControllerHost = {
        getCurrentScriptLanguage: deps.getCurrentScriptLanguage,
        monacoRoot: state.monacoRoot,
        blocklyCanvas: state.blocklyCanvas,
        blocklyWorkspace: state.blocklyWorkspace,
        blocklyCodeOverlayToggle: state.blocklyCodeOverlayToggle,
        setBlocklyWorkspace: deps.setBlocklyWorkspace,
        getTheme: deps.getTheme,
        buildMainEditorToolbox: deps.buildMainEditorToolbox,
        compileMainEditorWorkspace: deps.compileMainEditorWorkspace,
        createStarterWorkspaceXml: deps.createStarterWorkspaceXml,
        isStarterLuaScript: deps.isStarterLuaScript,
        getTextEditorValue: deps.getTextEditorValue,
        getEditorStateKey: deps.getEditorStateKey,
        textDraftByKey: collections.textDraftByKey,
        blocklyWorkspaceXmlByKey: collections.blocklyWorkspaceXmlByKey,
        persistEditorSession: () => persistEditorIndexSession(state, collections),
        updateBlocklyPreview: deps.updateBlocklyPreview,
        resizeBlocklyWorkspaceViewport: deps.resizeBlocklyWorkspaceViewport,
        ensureBlocklyResizeTracking: deps.ensureBlocklyResizeTracking,
        scheduleBlocklyAutofit: deps.scheduleBlocklyAutofit,
        setTextEditorValue: deps.setTextEditorValue,
        saveBlocklyWorkspaceState: deps.saveBlocklyWorkspaceState,
        ensureBlocklyWorkspace: deps.ensureBlocklyWorkspace,
        loadBlocklyWorkspace: deps.loadBlocklyWorkspace,
        syncEditorModeVisibility: deps.syncEditorModeVisibility,
        syncBlocklyEditorToggle: deps.syncBlocklyEditorToggle,
        syncBlocklyCodeOverlayToggle: deps.syncBlocklyCodeOverlayToggle,
        restoreEditorPanelWidthAfterBlockly: deps.restoreEditorPanelWidthAfterBlockly,
        maybeAutoExpandTextEditorPanel: deps.maybeAutoExpandTextEditorPanel,
        expandEditorPanelForBlockly: deps.expandEditorPanelForBlockly,
        layoutEditor: deps.layoutEditor,
        isBlocklyWorkspaceEmpty: deps.isBlocklyWorkspaceEmpty,
        getBlocklyEnabled: () => state.blocklyEnabled,
        setBlocklyEnabled: deps.setBlocklyEnabled,
        setBlocklyGeneratedCodeVisible: deps.setBlocklyGeneratedCodeVisible
    };

    return {
        host,
        workspaceController: createBlocklyWorkspaceController(host),
        toggleController: createBlocklyToggleController(host)
    };
}
