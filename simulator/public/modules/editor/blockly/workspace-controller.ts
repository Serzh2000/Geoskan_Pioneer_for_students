import { Blockly, type BlocklyNS } from '../blockly-mode/loader.js';
import { ensureEditorBlocklyDefinitions } from '../blockly-mode/index.js';
import { applyPioneerTargetToWorkspace } from '../blockly-mode/pioneer/target-support.js';
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
    // Ключ хранения XML воркспейса — фаза 7 плана: один Blockly-воркспейс на
    // дрона (`${droneId}:blockly`), не зависит от языка компиляции, в отличие
    // от getEditorStateKey (текстовые черновики остаются per-язык).
    getBlocklyStateKey: () => string;
    textDraftByKey: Map<string, string>;
    blocklyWorkspaceXmlByKey: Map<string, string>;
    persistEditorSession: () => void;
    resizeBlocklyWorkspaceViewport: () => void;
    ensureBlocklyResizeTracking: () => void;
    scheduleBlocklyAutofit: () => void;
};

// getStarterBlocklyWorkspaceXml() (Lua-only проверка isStarterLuaScript())
// удалена в фазе 7: стартовый workspace теперь одинаковый для обоих языков
// (pioneer_start -> preflight -> takeoff -> land), поэтому loadBlocklyWorkspace()
// ниже берёт его напрямую из createStarterWorkspaceXml() без языковой развилки.
// Поля getTextEditorValue/isStarterLuaScript остаются в контроллере: то же имя
// isStarterLuaScript отдельно используется текстовым редактором (autofit.ts)
// для авто-разворота панели — это другая, не связанная с Blockly, функция.

export function saveBlocklyWorkspaceState(controller: BlocklyWorkspaceController): void {
    if (!controller.blocklyWorkspace) return;

    const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(controller.blocklyWorkspace));
    controller.blocklyWorkspaceXmlByKey.set(controller.getBlocklyStateKey(), xml);
    controller.persistEditorSession();
}

export function loadBlocklyWorkspace(
    controller: BlocklyWorkspaceController,
    language: ScriptLanguage
): void {
    if (!controller.blocklyWorkspace) return;

    const key = controller.getBlocklyStateKey();
    const savedXml = controller.blocklyWorkspaceXmlByKey.get(key);
    const workspaceXml = savedXml || controller.createStarterWorkspaceXml(language);

    controller.blocklyWorkspace.clear();

    if (workspaceXml) {
        try {
            const xml = Blockly.utils.xml.textToDom(workspaceXml);
            Blockly.Xml.domToWorkspace(xml, controller.blocklyWorkspace);
        } catch (error) {
            console.error('[Editor] Failed to load Blockly workspace', error);
        }
    }

    // Пересчитываем disabled-блоки под таргет ПОСЛЕ загрузки XML (фаза 6):
    // сохранённый workspace мог быть создан в другом языке компиляции.
    applyPioneerTargetToWorkspace(controller.blocklyWorkspace, language);

    if (workspaceXml) {
        saveBlocklyWorkspaceState(controller);
    } else {
        controller.blocklyWorkspaceXmlByKey.delete(key);
    }

    controller.resizeBlocklyWorkspaceViewport();
    controller.scheduleBlocklyAutofit();
}

// Смена языка при включённом Blockly (фаза 7, §9 открытый вопрос 5): workspace
// НЕ перезагружается — меняется только таргет компиляции. Пересчитываем
// disabled-блоки под новый таргет и перезаписываем черновик текста НОВОГО
// языка сгенерированным кодом (решение принято как "да, перезаписывать", как и
// предлагает сам план).
export function retargetBlocklyWorkspace(
    controller: BlocklyWorkspaceController,
    language: ScriptLanguage
): void {
    if (!controller.blocklyWorkspace) return;

    applyPioneerTargetToWorkspace(controller.blocklyWorkspace, language);

    const compiled = controller.compileMainEditorWorkspace(language, controller.blocklyWorkspace);
    controller.textDraftByKey.set(controller.getEditorStateKey(language), compiled);
    controller.persistEditorSession();
}

export function ensureBlocklyWorkspace(
    controller: BlocklyWorkspaceController,
    language: ScriptLanguage
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
                saveBlocklyWorkspaceState(controller);
                controller.textDraftByKey.set(
                    controller.getEditorStateKey(activeLanguage),
                    controller.compileMainEditorWorkspace(activeLanguage, blocklyWorkspace)
                );
            });

            controller.setBlocklyWorkspace(blocklyWorkspace);
        }

        controller.ensureBlocklyResizeTracking();
        controller.resizeBlocklyWorkspaceViewport();
    });
}
