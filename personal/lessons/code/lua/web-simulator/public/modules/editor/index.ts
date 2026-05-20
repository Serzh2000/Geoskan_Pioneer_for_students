import 'monaco-editor/min/vs/editor/editor.main.css';
import { Blockly } from '../ui/mission-guide/blockly.js';
import { currentDroneId, currentScriptLanguage, DEFAULT_LUA_SCRIPT, ScriptLanguage } from '../core/state.js';
import {
    buildMainEditorToolbox,
    compileMainEditorWorkspace,
    createStarterWorkspaceXml
} from './blockly.js';
import {
    createEditorShell as createEditorShellDom,
    fallbackEditor as mountFallbackEditor,
    getFallbackEditorValue,
    getEditorStateKey as getEditorStateKeyDom,
    hasFallbackEditor,
    setFallbackEditorValue,
    syncBlocklyCodeOverlayToggle as syncBlocklyCodeOverlayToggleDom,
    syncBlocklyEditorToggle as syncBlocklyEditorToggleDom,
    syncEditorModeVisibility as syncEditorModeVisibilityDom
} from './dom.js';
import {
    createTextEditorInstance,
    getTextEditorValueFromInstance,
    initializeMonacoEnvironment,
    layoutTextEditorInstance,
    setTextEditorLanguageOnInstance,
    setTextEditorValueOnInstance
} from './text-editor.js';
import {
    expandEditorPanelForBlockly as expandEditorPanelForBlocklyAutofit,
    maybeAutoExpandTextEditorPanel as maybeAutoExpandTextEditorPanelAutofit,
    restoreEditorPanelWidthAfterBlockly as restoreEditorPanelWidthAfterBlocklyAutofit,
    scheduleEditorPanelAutofit as scheduleEditorPanelAutofitAutofit
} from './autofit.js';
import {
    createBlocklyResizeRuntime,
    ensureBlocklyResizeTracking as ensureBlocklyResizeTrackingSupport,
    isBlocklyWorkspaceEmpty as isBlocklyWorkspaceEmptySupport,
    resizeBlocklyWorkspaceViewport as resizeBlocklyWorkspaceViewportSupport,
    updateBlocklyPreview as updateBlocklyPreviewSupport
} from './blockly-support.js';
import { blocklyTheme } from './runtime.js';
import {
    ensureBlocklyWorkspace as ensureBlocklyWorkspaceController,
    loadBlocklyWorkspace as loadBlocklyWorkspaceController,
    saveBlocklyWorkspaceState as saveBlocklyWorkspaceStateController
} from './blockly-workspace-controller.js';
import {
    initBlocklyEditorToggle as initBlocklyEditorToggleController,
    setBlocklyEditorEnabled as setBlocklyEditorEnabledController
} from './blockly-toggle-controller.js';
import {
    createEditorAutofitContext,
    createEditorHost,
    getSavedEditorDraft,
    loadEditorIndexSession,
    persistEditorIndexSession
} from './editor-index-helpers.js';

let editorInstance: any;
let pendingValue: string | null = null;
let pendingLanguage: ScriptLanguage | null = null;
let monacoRoot: HTMLElement | null = null;
let blocklyRoot: HTMLElement | null = null;
let blocklyCanvasHost: HTMLElement | null = null;
let blocklyCanvas: HTMLElement | null = null;
let blocklyPreview: HTMLElement | null = null;
let blocklyCodeOverlay: HTMLElement | null = null;
let blocklyCodeOverlayToggle: HTMLInputElement | null = null;
let blocklyWorkspace: Blockly.WorkspaceSvg | null = null;
let blocklyEnabled = false;
let blocklyGeneratedCodeVisible = false;
const blocklyResizeRuntime = createBlocklyResizeRuntime();
let previousSidebarWidthBeforeBlockly: string | null = null;
const blocklyWorkspaceXmlByKey = new Map<string, string>();
const textDraftByKey = new Map<string, string>();

function getEditorIndexState() {
    return {
        editorInstance,
        pendingValue,
        pendingLanguage,
        monacoRoot,
        blocklyRoot,
        blocklyCanvasHost,
        blocklyCanvas,
        blocklyWorkspace,
        blocklyCodeOverlayToggle,
        blocklyEnabled,
        blocklyGeneratedCodeVisible,
        previousSidebarWidthBeforeBlockly
    };
}

function getEditorControllers() {
    return createEditorHost(getEditorIndexState(), {
        textDraftByKey,
        blocklyWorkspaceXmlByKey
    }, {
        theme: blocklyTheme,
        buildMainEditorToolbox,
        compileMainEditorWorkspace,
        createStarterWorkspaceXml,
        isStarterLuaScript,
        getTextEditorValue,
        getEditorStateKey,
        updateBlocklyPreview: (language: ScriptLanguage) => {
            updateBlocklyPreviewSupport(blocklyPreview, blocklyWorkspace, language);
        },
        resizeBlocklyWorkspaceViewport: () => {
            resizeBlocklyWorkspaceViewportSupport(blocklyCanvasHost, blocklyCanvas, blocklyWorkspace);
        },
        ensureBlocklyResizeTracking: () => {
            ensureBlocklyResizeTrackingSupport(blocklyResizeRuntime, blocklyCanvasHost, () => {
                resizeBlocklyWorkspaceViewportSupport(blocklyCanvasHost, blocklyCanvas, blocklyWorkspace);
            });
        },
        scheduleBlocklyAutofit: () => scheduleEditorPanelAutofitAutofit('blockly', createEditorAutofitContext(getEditorIndexState())),
        setTextEditorValue,
        saveBlocklyWorkspaceState,
        ensureBlocklyWorkspace,
        loadBlocklyWorkspace,
        syncEditorModeVisibility,
        syncBlocklyEditorToggle: () => {
            syncBlocklyEditorToggleDom(blocklyEnabled);
        },
        syncBlocklyCodeOverlayToggle: () => {
            syncBlocklyCodeOverlayToggleDom(blocklyCodeOverlayToggle, blocklyEnabled, blocklyGeneratedCodeVisible);
        },
        restoreEditorPanelWidthAfterBlockly: () => {
            previousSidebarWidthBeforeBlockly = restoreEditorPanelWidthAfterBlocklyAutofit(previousSidebarWidthBeforeBlockly);
        },
        maybeAutoExpandTextEditorPanel: (text: string, language: ScriptLanguage = currentScriptLanguage) => {
            maybeAutoExpandTextEditorPanelAutofit(createEditorAutofitContext(getEditorIndexState()), text, language);
        },
        expandEditorPanelForBlockly: () => {
            previousSidebarWidthBeforeBlockly = expandEditorPanelForBlocklyAutofit(
                createEditorAutofitContext(getEditorIndexState()),
                previousSidebarWidthBeforeBlockly
            );
        },
        layoutEditor,
        isBlocklyWorkspaceEmpty: () => isBlocklyWorkspaceEmptySupport(blocklyWorkspace),
        getCurrentScriptLanguage: () => currentScriptLanguage,
        setBlocklyWorkspace: (workspace: Blockly.WorkspaceSvg | null) => {
            blocklyWorkspace = workspace;
        },
        setBlocklyEnabled: (enabled: boolean) => {
            blocklyEnabled = enabled;
        },
        setBlocklyGeneratedCodeVisible: (visible: boolean) => {
            blocklyGeneratedCodeVisible = visible;
        }
    });
}

export function initEditor() {
    const persisted = loadEditorIndexSession(getEditorIndexState(), {
        textDraftByKey,
        blocklyWorkspaceXmlByKey
    });
    blocklyEnabled = persisted.blocklyEnabled;
    blocklyGeneratedCodeVisible = persisted.blocklyGeneratedCodeVisible;
    try {
        initializeMonacoEnvironment();
        createEditorShell();
        createEditor();
    } catch (err) {
        console.error('Monaco Editor load error:', err);
        createEditorShell();
        fallbackEditor();
    }
}

function getEditorStateKey(language: ScriptLanguage = currentScriptLanguage): string { return getEditorStateKeyDom(currentDroneId, language); }

function createEditorShell() {
    const refs = createEditorShellDom();
    monacoRoot = refs.monacoRoot;
    blocklyRoot = refs.blocklyRoot;
    blocklyCanvasHost = refs.blocklyCanvasHost;
    blocklyCanvas = refs.blocklyCanvas;
    blocklyPreview = refs.blocklyPreview;
    blocklyCodeOverlay = refs.blocklyCodeOverlay;
    blocklyCodeOverlayToggle = refs.blocklyCodeOverlayToggle;
    syncEditorModeVisibility();
}

function fallbackEditor() {
    mountFallbackEditor(monacoRoot, {
        initialValue:
            pendingValue ||
            getSavedEditorDraft({ textDraftByKey }, currentDroneId, pendingLanguage || currentScriptLanguage) ||
            DEFAULT_LUA_SCRIPT,
        onInput: (value) => {
            textDraftByKey.set(getEditorStateKey(currentScriptLanguage), value);
            persistEditorIndexSession(getEditorIndexState(), { textDraftByKey, blocklyWorkspaceXmlByKey });
            maybeAutoExpandTextEditorPanelAutofit(createEditorAutofitContext(getEditorIndexState()), value, currentScriptLanguage);
        }
    });
}

function createEditor() {
    const initialLanguage: ScriptLanguage = pendingLanguage || 'lua';
    const initialValue =
        pendingValue ||
        getSavedEditorDraft({ textDraftByKey }, currentDroneId, initialLanguage) ||
        DEFAULT_LUA_SCRIPT;

    if (!monacoRoot) {
        fallbackEditor();
        return;
    }

    editorInstance = createTextEditorInstance({
        root: monacoRoot,
        initialValue,
        initialLanguage,
        onDidChangeModelContent: (currentValue) => {
            textDraftByKey.set(getEditorStateKey(currentScriptLanguage), currentValue);
            persistEditorIndexSession(getEditorIndexState(), { textDraftByKey, blocklyWorkspaceXmlByKey });
            maybeAutoExpandTextEditorPanelAutofit(createEditorAutofitContext(getEditorIndexState()), currentValue, currentScriptLanguage);
        }
    });

    pendingValue = null;
    pendingLanguage = null;
    maybeAutoExpandTextEditorPanelAutofit(createEditorAutofitContext(getEditorIndexState()), initialValue, initialLanguage);
}

function getTextEditorValue(): string { return hasFallbackEditor() ? getFallbackEditorValue() : getTextEditorValueFromInstance(editorInstance); }

function setTextEditorValue(val: string) {
    if (hasFallbackEditor()) {
        setFallbackEditorValue(val);
    } else if (!setTextEditorValueOnInstance(editorInstance, val)) {
        pendingValue = val;
    } else {
        pendingValue = null;
    }
    textDraftByKey.set(getEditorStateKey(currentScriptLanguage), val);
    persistEditorIndexSession(getEditorIndexState(), { textDraftByKey, blocklyWorkspaceXmlByKey });
    maybeAutoExpandTextEditorPanelAutofit(createEditorAutofitContext(getEditorIndexState()), val);
}

function saveBlocklyWorkspaceState(language: ScriptLanguage = currentScriptLanguage) { saveBlocklyWorkspaceStateController(getEditorControllers().workspaceController, language); }

function loadBlocklyWorkspace(language: ScriptLanguage = currentScriptLanguage) { loadBlocklyWorkspaceController(getEditorControllers().workspaceController, language); }

function ensureBlocklyWorkspace(language: ScriptLanguage = currentScriptLanguage) { ensureBlocklyWorkspaceController(getEditorControllers().workspaceController, language, currentScriptLanguage); }

function syncEditorModeVisibility() {
    syncEditorModeVisibilityDom({
        monacoRoot,
        blocklyRoot,
        blocklyCodeOverlay,
        blocklyCodeOverlayToggle
    }, blocklyEnabled, blocklyGeneratedCodeVisible);
}

export function getEditorValue(): string {
    if (blocklyEnabled && blocklyWorkspace) {
        return compileMainEditorWorkspace(currentScriptLanguage, blocklyWorkspace);
    }
    return getTextEditorValue();
}

export function setEditorValue(val: string) {
    const key = getEditorStateKey();
    textDraftByKey.set(key, val);
    persistEditorIndexSession(getEditorIndexState(), { textDraftByKey, blocklyWorkspaceXmlByKey });

    if (blocklyEnabled) {
        ensureBlocklyWorkspace(currentScriptLanguage);
        loadBlocklyWorkspace(currentScriptLanguage);
        return;
    }

    setTextEditorValue(val);
}

export function setEditorLanguage(language: ScriptLanguage) {
    if (!hasFallbackEditor()) {
        if (!setTextEditorLanguageOnInstance(editorInstance, language)) {
            pendingLanguage = language;
        }
    }

    if (blocklyEnabled) {
        ensureBlocklyWorkspace(language);
        loadBlocklyWorkspace(language);
    }
}

export function setBlocklyEditorEnabled(enabled: boolean) {
    setBlocklyEditorEnabledController(getEditorControllers().toggleController, enabled);
}

export function isBlocklyEditorEnabled(): boolean {
    return blocklyEnabled;
}

export function initBlocklyEditorToggle() {
    initBlocklyEditorToggleController(getEditorControllers().toggleController);
}

export function getSavedEditorDraft(language: ScriptLanguage = currentScriptLanguage): string | null {
    loadEditorIndexSession(getEditorIndexState(), {
        textDraftByKey,
        blocklyWorkspaceXmlByKey
    });
    return getSavedEditorDraft({ textDraftByKey }, currentDroneId, language);
}

export function layoutEditor() {
    layoutTextEditorInstance(editorInstance);
    resizeBlocklyWorkspaceViewportSupport(blocklyCanvasHost, blocklyCanvas, blocklyWorkspace);
}
