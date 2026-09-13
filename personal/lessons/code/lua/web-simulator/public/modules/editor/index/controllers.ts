import type { BlocklyNS } from '../blockly-mode/loader.js';
import type { ScriptLanguage } from '../../core/state.js';
import type { BlocklyWorkspaceController } from '../blockly/workspace-controller.js';
import type { BlocklyToggleController } from '../blockly/toggle-controller.js';

export type EditorControllerHost = {
        getCurrentScriptLanguage: () => ScriptLanguage;
        monacoRoot: HTMLElement | null;
        blocklyCanvas: HTMLElement | null;
        blocklyWorkspace: BlocklyNS.WorkspaceSvg | null;
        blocklyCodeOverlayToggle: HTMLInputElement | null;
        setBlocklyWorkspace: (workspace: BlocklyNS.WorkspaceSvg | null) => void;
        getTheme: () => BlocklyNS.Theme | undefined;
        buildMainEditorToolbox: BlocklyWorkspaceController['buildMainEditorToolbox'];
        compileMainEditorWorkspace: BlocklyWorkspaceController['compileMainEditorWorkspace'];
        createStarterWorkspaceXml: BlocklyWorkspaceController['createStarterWorkspaceXml'];
        isStarterLuaScript: BlocklyWorkspaceController['isStarterLuaScript'];
        getTextEditorValue: BlocklyWorkspaceController['getTextEditorValue'];
        getEditorStateKey: BlocklyWorkspaceController['getEditorStateKey'];
        getBlocklyStateKey: BlocklyWorkspaceController['getBlocklyStateKey'];
        textDraftByKey: Map<string, string>;
        blocklyWorkspaceXmlByKey: Map<string, string>;
        persistEditorSession: () => void;
        updateBlocklyPreview: (language: ScriptLanguage) => void;
        resizeBlocklyWorkspaceViewport: () => void;
        ensureBlocklyResizeTracking: () => void;
        scheduleBlocklyAutofit: () => void;
        setTextEditorValue: (value: string) => void;
        saveBlocklyWorkspaceState: () => void;
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
        getBlocklyEnabled: () => boolean;
        setBlocklyEnabled: (enabled: boolean) => void;
        setBlocklyGeneratedCodeVisible: (visible: boolean) => void;
};

export function createBlocklyWorkspaceController(host: EditorControllerHost): BlocklyWorkspaceController {
    return {
        blocklyCanvas: host.blocklyCanvas,
        blocklyWorkspace: host.blocklyWorkspace,
        setBlocklyWorkspace: host.setBlocklyWorkspace,
        getCurrentLanguage: host.getCurrentScriptLanguage,
        getTheme: host.getTheme,
        buildMainEditorToolbox: host.buildMainEditorToolbox,
        compileMainEditorWorkspace: host.compileMainEditorWorkspace,
        createStarterWorkspaceXml: host.createStarterWorkspaceXml,
        isStarterLuaScript: host.isStarterLuaScript,
        getTextEditorValue: host.getTextEditorValue,
        getEditorStateKey: host.getEditorStateKey,
        getBlocklyStateKey: host.getBlocklyStateKey,
        textDraftByKey: host.textDraftByKey,
        blocklyWorkspaceXmlByKey: host.blocklyWorkspaceXmlByKey,
        persistEditorSession: host.persistEditorSession,
        updateBlocklyPreview: host.updateBlocklyPreview,
        resizeBlocklyWorkspaceViewport: host.resizeBlocklyWorkspaceViewport,
        ensureBlocklyResizeTracking: host.ensureBlocklyResizeTracking,
        scheduleBlocklyAutofit: host.scheduleBlocklyAutofit
    };
}

export function createBlocklyToggleController(host: EditorControllerHost): BlocklyToggleController {
    return {
        get currentScriptLanguage(): ScriptLanguage {
            return host.getCurrentScriptLanguage();
        },
        monacoRoot: host.monacoRoot,
        blocklyWorkspace: host.blocklyWorkspace,
        blocklyCodeOverlayToggle: host.blocklyCodeOverlayToggle,
        textDraftByKey: host.textDraftByKey,
        blocklyWorkspaceXmlByKey: host.blocklyWorkspaceXmlByKey,
        getEditorStateKey: host.getEditorStateKey,
        compileMainEditorWorkspace: host.compileMainEditorWorkspace,
        getTextEditorValue: host.getTextEditorValue,
        setTextEditorValue: host.setTextEditorValue,
        saveBlocklyWorkspaceState: host.saveBlocklyWorkspaceState,
        ensureBlocklyWorkspace: host.ensureBlocklyWorkspace,
        loadBlocklyWorkspace: host.loadBlocklyWorkspace,
        syncEditorModeVisibility: host.syncEditorModeVisibility,
        syncBlocklyEditorToggle: host.syncBlocklyEditorToggle,
        syncBlocklyCodeOverlayToggle: host.syncBlocklyCodeOverlayToggle,
        restoreEditorPanelWidthAfterBlockly: host.restoreEditorPanelWidthAfterBlockly,
        maybeAutoExpandTextEditorPanel: host.maybeAutoExpandTextEditorPanel,
        expandEditorPanelForBlockly: host.expandEditorPanelForBlockly,
        layoutEditor: host.layoutEditor,
        persistEditorSession: host.persistEditorSession,
        resizeBlocklyWorkspaceViewport: host.resizeBlocklyWorkspaceViewport,
        isBlocklyWorkspaceEmpty: host.isBlocklyWorkspaceEmpty,
        getBlocklyEnabled: host.getBlocklyEnabled,
        setBlocklyEnabled: host.setBlocklyEnabled,
        setBlocklyGeneratedCodeVisible: host.setBlocklyGeneratedCodeVisible
    };
}
