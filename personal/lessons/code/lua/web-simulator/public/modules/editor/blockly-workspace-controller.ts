import { Blockly } from '../ui/mission-guide/blockly.js';
import type { ScriptLanguage } from '../core/state.js';

export type BlocklyWorkspaceController = {
    blocklyCanvas: HTMLElement | null;
    blocklyWorkspace: Blockly.WorkspaceSvg | null;
    setBlocklyWorkspace: (workspace: Blockly.WorkspaceSvg | null) => void;
    theme: Blockly.Theme;
    buildMainEditorToolbox: (language: ScriptLanguage) => Element | string;
    compileMainEditorWorkspace: (language: ScriptLanguage, workspace: Blockly.WorkspaceSvg) => string;
    createStarterWorkspaceXml: (language: ScriptLanguage) => string;
    isStarterLuaScript: (value: string) => boolean;
    getTextEditorValue: () => string;
    getEditorStateKey: (language: ScriptLanguage) => string;
    textDraftByKey: Map<string, string>;
    blocklyWorkspaceXmlByKey: Map<string, string>;
    persistEditorSession: () => void;
    updateBlocklyPreview: (language: ScriptLanguage) => void;
    resizeBlocklyWorkspaceViewport: () => void;
    ensureBlocklyResizeTracking: () => void;
    scheduleBlocklyAutofit: () => void;
};

export function getStarterBlocklyWorkspaceXml(
    controller: BlocklyWorkspaceController,
    language: ScriptLanguage
): string | null {
    if (language !== 'lua') return null;

    const key = controller.getEditorStateKey(language);
    const draftText = controller.textDraftByKey.get(key) || controller.getTextEditorValue();
    if (draftText.trim().length > 0 && !controller.isStarterLuaScript(draftText)) {
        return null;
    }

    return controller.createStarterWorkspaceXml(language);
}

export function saveBlocklyWorkspaceState(
    controller: BlocklyWorkspaceController,
    language: ScriptLanguage
): void {
    if (!controller.blocklyWorkspace) return;

    const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(controller.blocklyWorkspace));
    controller.blocklyWorkspaceXmlByKey.set(controller.getEditorStateKey(language), xml);
    controller.persistEditorSession();
}

export function loadBlocklyWorkspace(
    controller: BlocklyWorkspaceController,
    language: ScriptLanguage
): void {
    if (!controller.blocklyWorkspace) return;

    const key = controller.getEditorStateKey(language);
    const savedXml = controller.blocklyWorkspaceXmlByKey.get(key);
    const starterXml = savedXml ? null : getStarterBlocklyWorkspaceXml(controller, language);
    const workspaceXml = savedXml || starterXml;

    controller.blocklyWorkspace.clear();

    if (workspaceXml) {
        try {
            const xml = Blockly.utils.xml.textToDom(workspaceXml);
            Blockly.Xml.domToWorkspace(xml, controller.blocklyWorkspace);
        } catch (error) {
            console.error('[Editor] Failed to load Blockly workspace', error);
        }
    }

    if (workspaceXml) {
        saveBlocklyWorkspaceState(controller, language);
    } else {
        controller.blocklyWorkspaceXmlByKey.delete(key);
    }

    controller.updateBlocklyPreview(language);
    controller.resizeBlocklyWorkspaceViewport();
    controller.scheduleBlocklyAutofit();
}

export function ensureBlocklyWorkspace(
    controller: BlocklyWorkspaceController,
    language: ScriptLanguage,
    currentScriptLanguage: ScriptLanguage
): void {
    if (!controller.blocklyCanvas) return;

    if (!controller.blocklyWorkspace) {
        const blocklyWorkspace = Blockly.inject(controller.blocklyCanvas, {
            toolbox: controller.buildMainEditorToolbox(language),
            scrollbars: true,
            trashcan: true,
            theme: controller.theme,
            toolboxPosition: 'start'
        });

        blocklyWorkspace.addChangeListener(() => {
            saveBlocklyWorkspaceState(controller, currentScriptLanguage);
            controller.textDraftByKey.set(
                controller.getEditorStateKey(currentScriptLanguage),
                controller.compileMainEditorWorkspace(currentScriptLanguage, blocklyWorkspace)
            );
            controller.updateBlocklyPreview(currentScriptLanguage);
        });

        controller.setBlocklyWorkspace(blocklyWorkspace);
    } else {
        controller.blocklyWorkspace.updateToolbox(controller.buildMainEditorToolbox(language));
    }

    controller.ensureBlocklyResizeTracking();
    controller.resizeBlocklyWorkspaceViewport();
}
