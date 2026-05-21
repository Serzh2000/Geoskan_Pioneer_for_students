import type { ScriptLanguage } from '../../core/state.js';
import { Blockly } from '../../ui/mission-guide/blockly.js';

export type BlocklyToggleController = {
    currentScriptLanguage: ScriptLanguage;
    monacoRoot: HTMLElement | null;
    blocklyWorkspace: Blockly.WorkspaceSvg | null;
    blocklyCodeOverlayToggle: HTMLInputElement | null;
    textDraftByKey: Map<string, string>;
    blocklyWorkspaceXmlByKey: Map<string, string>;
    getEditorStateKey: (language: ScriptLanguage) => string;
    compileMainEditorWorkspace: (language: ScriptLanguage, workspace: Blockly.WorkspaceSvg) => string;
    getTextEditorValue: () => string;
    setTextEditorValue: (value: string) => void;
    saveBlocklyWorkspaceState: (language?: ScriptLanguage) => void;
    ensureBlocklyWorkspace: (language: ScriptLanguage) => void;
    loadBlocklyWorkspace: (language: ScriptLanguage) => void;
    syncEditorModeVisibility: () => void;
    syncBlocklyEditorToggle: () => void;
    syncBlocklyCodeOverlayToggle: () => void;
    restoreEditorPanelWidthAfterBlockly: () => void;
    maybeAutoExpandTextEditorPanel: (text: string, language?: ScriptLanguage) => void;
    expandEditorPanelForBlockly: () => void;
    layoutEditor: () => void;
    persistEditorSession: () => void;
    resizeBlocklyWorkspaceViewport: () => void;
    isBlocklyWorkspaceEmpty: () => boolean;
    getBlocklyEnabled: () => boolean;
    setBlocklyEnabled: (enabled: boolean) => void;
    setBlocklyGeneratedCodeVisible: (visible: boolean) => void;
};

export function setBlocklyEditorEnabled(controller: BlocklyToggleController, enabled: boolean): void {
    if (controller.getBlocklyEnabled() === enabled) return;

    if (!enabled) {
        controller.saveBlocklyWorkspaceState(controller.currentScriptLanguage);
        const key = controller.getEditorStateKey(controller.currentScriptLanguage);
        const previousText = controller.textDraftByKey.get(key) || '';
        const generatedCode = controller.blocklyWorkspace
            ? controller.compileMainEditorWorkspace(controller.currentScriptLanguage, controller.blocklyWorkspace)
            : previousText;
        const nextText = controller.isBlocklyWorkspaceEmpty() && !controller.blocklyWorkspaceXmlByKey.has(key)
            ? previousText
            : generatedCode;

        controller.textDraftByKey.set(key, nextText);
        controller.setBlocklyGeneratedCodeVisible(false);
        controller.setBlocklyEnabled(false);
        controller.syncEditorModeVisibility();
        controller.syncBlocklyEditorToggle();
        controller.syncBlocklyCodeOverlayToggle();
        if (controller.monacoRoot) {
            controller.setTextEditorValue(nextText);
        }
        controller.restoreEditorPanelWidthAfterBlockly();
        controller.maybeAutoExpandTextEditorPanel(nextText, controller.currentScriptLanguage);
        controller.layoutEditor();
        controller.persistEditorSession();
        return;
    }

    const currentText = controller.getTextEditorValue();
    controller.textDraftByKey.set(controller.getEditorStateKey(controller.currentScriptLanguage), currentText);
    controller.setBlocklyGeneratedCodeVisible(false);
    controller.setBlocklyEnabled(true);
    controller.syncEditorModeVisibility();
    controller.syncBlocklyEditorToggle();
    controller.syncBlocklyCodeOverlayToggle();
    controller.ensureBlocklyWorkspace(controller.currentScriptLanguage);
    controller.loadBlocklyWorkspace(controller.currentScriptLanguage);
    controller.expandEditorPanelForBlockly();
    controller.layoutEditor();
    controller.persistEditorSession();
}

export function initBlocklyEditorToggle(controller: BlocklyToggleController): void {
    const toggle = document.getElementById('blockly-editor-toggle') as HTMLInputElement | null;
    controller.syncBlocklyEditorToggle();
    controller.syncBlocklyCodeOverlayToggle();

    if (toggle) {
        toggle.addEventListener('change', () => {
            setBlocklyEditorEnabled(controller, toggle.checked);
        });
    }

    if (controller.blocklyCodeOverlayToggle) {
        controller.blocklyCodeOverlayToggle.addEventListener('change', () => {
            if (!controller.getBlocklyEnabled()) {
                controller.setBlocklyGeneratedCodeVisible(false);
                controller.syncEditorModeVisibility();
                controller.syncBlocklyCodeOverlayToggle();
                return;
            }

            controller.setBlocklyGeneratedCodeVisible(Boolean(controller.blocklyCodeOverlayToggle?.checked));
            controller.syncEditorModeVisibility();
            controller.syncBlocklyCodeOverlayToggle();
            controller.resizeBlocklyWorkspaceViewport();
            controller.persistEditorSession();
        });
    }
}
