import { Blockly, type BlocklyNS } from '../blockly-mode/loader.js';
import { ensureEditorBlocklyDefinitions } from '../blockly-mode/index.js';
import type { ScriptLanguage } from '../../core/state.js';

export type BlocklyWorkspaceController = {
    blocklyCanvas: HTMLElement | null;
    blocklyWorkspace: BlocklyNS.WorkspaceSvg | null;
    setBlocklyWorkspace: (workspace: BlocklyNS.WorkspaceSvg | null) => void;
    // Геттер, а не снимок: addChangeListener в ensureBlocklyWorkspace() ниже
    // живёт дольше одного вызова и должен видеть язык на момент правки блока,
    // а не язык, с которым Blockly-воркспейс был впервые создан (см. §2 плана —
    // баг замыкания языка).
    getCurrentLanguage: () => ScriptLanguage;
    getTheme: () => BlocklyNS.Theme | undefined;
    buildMainEditorToolbox: (language: ScriptLanguage) => Element | string;
    compileMainEditorWorkspace: (language: ScriptLanguage, workspace: BlocklyNS.WorkspaceSvg) => string;
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
): Promise<void> {
    if (!controller.blocklyCanvas) return Promise.resolve();

    if (controller.blocklyWorkspace) {
        controller.blocklyWorkspace.updateToolbox(controller.buildMainEditorToolbox(language));
        controller.ensureBlocklyResizeTracking();
        controller.resizeBlocklyWorkspaceViewport();
        return Promise.resolve();
    }

    // Первое обращение к Blockly в сессии: дожидаемся динамической подгрузки
    // пакета и определений блоков, прежде чем трогать Blockly.* синхронно.
    return ensureEditorBlocklyDefinitions().then(() => {
        if (controller.blocklyWorkspace) {
            controller.blocklyWorkspace.updateToolbox(controller.buildMainEditorToolbox(language));
        } else if (controller.blocklyCanvas) {
            const blocklyWorkspace = Blockly.inject(controller.blocklyCanvas, {
                toolbox: controller.buildMainEditorToolbox(language),
                scrollbars: true,
                trashcan: true,
                theme: controller.getTheme(),
                toolboxPosition: 'start'
            });

            blocklyWorkspace.addChangeListener(() => {
                // Актуальный язык на момент правки, а не язык первого вызова
                // ensureBlocklyWorkspace() — иначе после смены языка правки
                // сохраняются под старым ключом и компилируются старым генератором.
                const activeLanguage = controller.getCurrentLanguage();
                saveBlocklyWorkspaceState(controller, activeLanguage);
                controller.textDraftByKey.set(
                    controller.getEditorStateKey(activeLanguage),
                    controller.compileMainEditorWorkspace(activeLanguage, blocklyWorkspace)
                );
                controller.updateBlocklyPreview(activeLanguage);
            });

            controller.setBlocklyWorkspace(blocklyWorkspace);
        }

        controller.ensureBlocklyResizeTracking();
        controller.resizeBlocklyWorkspaceViewport();
    });
}
