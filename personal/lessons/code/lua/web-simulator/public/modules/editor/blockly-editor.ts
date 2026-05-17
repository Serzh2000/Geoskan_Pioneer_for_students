import { currentDroneId, currentScriptLanguage, type ScriptLanguage } from '../core/state.js';
import { Blockly } from '../ui/mission-guide/blockly.js';
import {
    buildMainEditorToolbox,
    compileMainEditorWorkspace
} from './blockly-mode/index.js';
import {
    ensureBlocklyResizeTracking as ensureBlocklyResizeTrackingDom,
    isBlocklyWorkspaceEmpty as isBlocklyWorkspaceEmptyDom,
    resizeBlocklyWorkspaceViewport as resizeBlocklyWorkspaceViewportDom,
    updateBlocklyPreview as updateBlocklyPreviewDom
} from './blockly-support.js';
import {
    expandEditorPanelForBlockly as expandEditorPanelForBlocklyDom,
    getEditorStateKey as getEditorStateKeyDom,
    restoreEditorPanelWidthAfterBlockly as restoreEditorPanelWidthAfterBlocklyDom,
    syncBlocklyCodeOverlayToggle as syncBlocklyCodeOverlayToggleDom,
    syncBlocklyEditorToggle as syncBlocklyEditorToggleDom,
    syncEditorModeVisibility as syncEditorModeVisibilityDom
} from './dom.js';
import { blocklyTheme, editorRuntime } from './runtime.js';
import { getTextEditorValue, setTextEditorValue } from './text-editor.js';

function getEditorStateKey(language: ScriptLanguage = currentScriptLanguage): string {
    return getEditorStateKeyDom(currentDroneId, language);
}

function saveBlocklyWorkspaceState(language: ScriptLanguage = currentScriptLanguage): void {
    if (!editorRuntime.blocklyWorkspace) {
        return;
    }

    const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(editorRuntime.blocklyWorkspace));
    editorRuntime.blocklyWorkspaceXmlByKey.set(getEditorStateKey(language), xml);
}

function updateBlocklyPreview(language: ScriptLanguage = currentScriptLanguage): void {
    updateBlocklyPreviewDom(editorRuntime.blocklyPreview, editorRuntime.blocklyWorkspace, language);
}

function isBlocklyWorkspaceEmpty(): boolean {
    return isBlocklyWorkspaceEmptyDom(editorRuntime.blocklyWorkspace);
}

function expandEditorPanelForBlockly(): void {
    editorRuntime.previousSidebarWidthBeforeBlockly = expandEditorPanelForBlocklyDom(
        editorRuntime.previousSidebarWidthBeforeBlockly
    );
}

function restoreEditorPanelWidthAfterBlockly(): void {
    editorRuntime.previousSidebarWidthBeforeBlockly = restoreEditorPanelWidthAfterBlocklyDom(
        editorRuntime.previousSidebarWidthBeforeBlockly
    );
}

export function resizeBlocklyWorkspaceViewport(): void {
    resizeBlocklyWorkspaceViewportDom(
        editorRuntime.blocklyCanvasHost,
        editorRuntime.blocklyCanvas,
        editorRuntime.blocklyWorkspace
    );
}

function ensureBlocklyResizeTracking(): void {
    ensureBlocklyResizeTrackingDom(
        editorRuntime.blocklyResizeRuntime,
        editorRuntime.blocklyCanvasHost,
        resizeBlocklyWorkspaceViewport
    );
}

function loadBlocklyWorkspace(language: ScriptLanguage = currentScriptLanguage): void {
    if (!editorRuntime.blocklyWorkspace) {
        return;
    }

    const key = getEditorStateKey(language);
    const savedXml = editorRuntime.blocklyWorkspaceXmlByKey.get(key);

    editorRuntime.blocklyWorkspace.clear();

    if (savedXml) {
        try {
            const xml = Blockly.utils.xml.textToDom(savedXml);
            Blockly.Xml.domToWorkspace(xml, editorRuntime.blocklyWorkspace);
        } catch (error) {
            console.error('[Editor] Failed to load Blockly workspace', error);
        }
    }

    if (savedXml) {
        saveBlocklyWorkspaceState(language);
    } else {
        editorRuntime.blocklyWorkspaceXmlByKey.delete(key);
    }

    updateBlocklyPreview(language);
    resizeBlocklyWorkspaceViewport();
}

function ensureBlocklyWorkspace(language: ScriptLanguage = currentScriptLanguage): void {
    if (!editorRuntime.blocklyCanvas) {
        return;
    }

    if (!editorRuntime.blocklyWorkspace) {
        editorRuntime.blocklyWorkspace = Blockly.inject(editorRuntime.blocklyCanvas, {
            toolbox: buildMainEditorToolbox(language),
            scrollbars: true,
            trashcan: true,
            theme: blocklyTheme,
            toolboxPosition: 'start'
        });

        editorRuntime.blocklyWorkspace.addChangeListener(() => {
            saveBlocklyWorkspaceState(currentScriptLanguage);
            editorRuntime.textDraftByKey.set(
                getEditorStateKey(currentScriptLanguage),
                compileMainEditorWorkspace(currentScriptLanguage, editorRuntime.blocklyWorkspace!)
            );
            updateBlocklyPreview(currentScriptLanguage);
        });
    } else {
        editorRuntime.blocklyWorkspace.updateToolbox(buildMainEditorToolbox(language));
    }

    ensureBlocklyResizeTracking();
    resizeBlocklyWorkspaceViewport();
}

export function syncBlocklyUiState(): void {
    syncEditorModeVisibilityDom({
        monacoRoot: editorRuntime.monacoRoot,
        blocklyRoot: editorRuntime.blocklyRoot,
        blocklyCodeOverlay: editorRuntime.blocklyCodeOverlay,
        blocklyCodeOverlayToggle: editorRuntime.blocklyCodeOverlayToggle
    }, editorRuntime.blocklyEnabled, editorRuntime.blocklyGeneratedCodeVisible);

    syncBlocklyEditorToggleDom(editorRuntime.blocklyEnabled);
    syncBlocklyCodeOverlayToggleDom(
        editorRuntime.blocklyCodeOverlayToggle,
        editorRuntime.blocklyEnabled,
        editorRuntime.blocklyGeneratedCodeVisible
    );
}

export function getBlocklyEditorValue(): string | null {
    if (!editorRuntime.blocklyEnabled || !editorRuntime.blocklyWorkspace) {
        return null;
    }

    return compileMainEditorWorkspace(currentScriptLanguage, editorRuntime.blocklyWorkspace);
}

export function setBlocklyEditorValue(value: string): void {
    const key = getEditorStateKey();
    editorRuntime.textDraftByKey.set(key, value);

    if (!editorRuntime.blocklyEnabled) {
        setTextEditorValue(value);
        return;
    }

    ensureBlocklyWorkspace(currentScriptLanguage);
    loadBlocklyWorkspace(currentScriptLanguage);
}

export function setBlocklyEditorLanguage(language: ScriptLanguage): void {
    if (!editorRuntime.blocklyEnabled) {
        return;
    }

    ensureBlocklyWorkspace(language);
    loadBlocklyWorkspace(language);
}

export function setBlocklyEditorEnabled(enabled: boolean): void {
    if (editorRuntime.blocklyEnabled === enabled) {
        return;
    }

    if (!enabled) {
        saveBlocklyWorkspaceState(currentScriptLanguage);
        const key = getEditorStateKey(currentScriptLanguage);
        const previousText = editorRuntime.textDraftByKey.get(key) || '';
        const generatedCode = editorRuntime.blocklyWorkspace
            ? compileMainEditorWorkspace(currentScriptLanguage, editorRuntime.blocklyWorkspace)
            : previousText;
        const nextText = isBlocklyWorkspaceEmpty() && !editorRuntime.blocklyWorkspaceXmlByKey.has(key)
            ? previousText
            : generatedCode;

        editorRuntime.textDraftByKey.set(key, nextText);
        editorRuntime.blocklyGeneratedCodeVisible = false;
        editorRuntime.blocklyEnabled = false;
        syncBlocklyUiState();
        if (editorRuntime.monacoRoot) {
            setTextEditorValue(nextText);
        }
        restoreEditorPanelWidthAfterBlockly();
        resizeBlocklyWorkspaceViewport();
        return;
    }

    const currentText = getTextEditorValue();
    editorRuntime.textDraftByKey.set(getEditorStateKey(currentScriptLanguage), currentText);
    editorRuntime.blocklyGeneratedCodeVisible = false;
    editorRuntime.blocklyEnabled = true;
    syncBlocklyUiState();
    expandEditorPanelForBlockly();
    ensureBlocklyWorkspace(currentScriptLanguage);
    loadBlocklyWorkspace(currentScriptLanguage);
    resizeBlocklyWorkspaceViewport();
}

export function isBlocklyEditorEnabled(): boolean {
    return editorRuntime.blocklyEnabled;
}

export function initBlocklyEditorToggle(): void {
    const toggle = document.getElementById('blockly-editor-toggle') as HTMLInputElement | null;
    syncBlocklyUiState();

    if (toggle) {
        toggle.addEventListener('change', () => {
            setBlocklyEditorEnabled(toggle.checked);
        });
    }

    if (editorRuntime.blocklyCodeOverlayToggle) {
        editorRuntime.blocklyCodeOverlayToggle.addEventListener('change', () => {
            if (!editorRuntime.blocklyEnabled) {
                editorRuntime.blocklyGeneratedCodeVisible = false;
                syncBlocklyUiState();
                return;
            }

            editorRuntime.blocklyGeneratedCodeVisible = Boolean(editorRuntime.blocklyCodeOverlayToggle?.checked);
            syncBlocklyUiState();
            resizeBlocklyWorkspaceViewport();
        });
    }
}
