import { currentDroneId, currentScriptLanguage, drones, type ScriptLanguage } from '../../core/state.js';
import { droneSdk } from '../../core/drone-models.js';
import { Blockly, type BlocklyNS } from '../blockly-mode/loader.js';
import {
    buildMainEditorToolbox,
    compileMainEditorWorkspace,
    createStarterWorkspaceXml
} from '../blockly.js';
import { syncScriptLanguageSelect as syncScriptLanguageSelectDom } from '../dom.js';
import {
    ensureBlocklyResizeTracking as ensureBlocklyResizeTrackingSupport,
    isBlocklyWorkspaceEmpty as isBlocklyWorkspaceEmptySupport,
    resizeBlocklyWorkspaceViewport as resizeBlocklyWorkspaceViewportSupport
} from '../blockly/support.js';
import {
    expandEditorPanelForBlockly as expandEditorPanelForBlocklyAutofit,
    isStarterLuaScript,
    maybeAutoExpandTextEditorPanel as maybeAutoExpandTextEditorPanelAutofit,
    restoreEditorPanelWidthAfterBlockly as restoreEditorPanelWidthAfterBlocklyAutofit,
    scheduleEditorPanelAutofit as scheduleEditorPanelAutofitAutofit
} from '../autofit.js';
import { getBlocklyTheme } from '../runtime.js';
import {
    ensureBlocklyWorkspace as ensureBlocklyWorkspaceController,
    loadBlocklyWorkspace as loadBlocklyWorkspaceController,
    retargetBlocklyWorkspace as retargetBlocklyWorkspaceController,
    saveBlocklyWorkspaceState as saveBlocklyWorkspaceStateController,
    switchBlocklyModel as switchBlocklyModelController
} from '../blockly/workspace-controller.js';
import { setBlocklyModelProvider } from '../blockly-mode/bricks/model.js';
import { setBlocklyEditorEnabled as setBlocklyEditorEnabledController } from '../blockly/toggle-controller.js';
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
    disposeEditor,
    fallbackEditor,
    getBlocklyStateKey,
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

// Какой набор блоков у редактора, решает модель текущего дрона: Мини 2 - Bricks, остальные - pioneer_*.
setBlocklyModelProvider(() => drones[currentDroneId]?.model);

function getEditorControllers() {
    return createEditorIndexControllers(editorIndexState, getEditorIndexCollections(), {
        getTheme: getBlocklyTheme,
        buildMainEditorToolbox,
        compileMainEditorWorkspace,
        createStarterWorkspaceXml,
        isStarterLuaScript,
        getTextEditorValue,
        getEditorStateKey,
        getBlocklyStateKey,
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
        syncScriptLanguageSelect: () => {
            syncScriptLanguageSelectDom(editorIndexState.blocklyEnabled, currentScriptLanguage, droneSdk(drones[currentDroneId]) === 'pioneer_sdk2');
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
        setBlocklyWorkspace: (workspace: BlocklyNS.WorkspaceSvg | null) => {
            editorIndexState.blocklyWorkspace = workspace;
        },
        setBlocklyEnabled: (enabled: boolean) => {
            editorIndexState.blocklyEnabled = enabled;
        }
    });
}

export function saveBlocklyWorkspaceState(): void {
    saveBlocklyWorkspaceStateController(getEditorControllers().workspaceController);
}

function loadBlocklyWorkspace(language: ScriptLanguage = currentScriptLanguage): void {
    loadBlocklyWorkspaceController(getEditorControllers().workspaceController, language);
}

export function ensureBlocklyWorkspace(language: ScriptLanguage = currentScriptLanguage): Promise<void> {
    return ensureBlocklyWorkspaceController(getEditorControllers().workspaceController, language);
}

// Смена модели дрона при включённом Blockly: тулбокс и блоки на поле заменяются набором новой модели.
// Блоки прежней модели остаются в её собственном хранилище и вернутся при обратном переключении.
export function syncBlocklyWithDroneModel(): boolean {
    if (!editorIndexState.blocklyEnabled || !editorIndexState.blocklyWorkspace) return false;
    return switchBlocklyModelController(getEditorControllers().workspaceController, currentScriptLanguage);
}

// Смена языка при включённом Blockly не трогает workspace (фаза 7 плана) —
// только пересчитывает disabled-блоки под новый таргет и перегенерирует
// превью/черновик текста. См. setEditorLanguage() ниже.
function retargetBlocklyWorkspace(language: ScriptLanguage): void {
    retargetBlocklyWorkspaceController(getEditorControllers().workspaceController, language);
}

export function initEditor(): void {
    const persisted = loadEditorIndexSession(getEditorIndexShellState(), getEditorIndexCollections());
    editorIndexState.blocklyEnabled = persisted.blocklyEnabled;

    try {
        initializeEditorShellEnvironment();
        createEditorShell();
        createEditor();
    } catch (error) {
        console.error('Monaco Editor load error:', error);
        // Ошибка могла прилететь уже после monaco.editor.create() — тогда
        // редактор существует, и пересоздание оболочки ниже вырежет его DOM,
        // оставив висеть сам инстанс. Гасим до пересоздания.
        disposeEditor();
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

export async function setEditorValue(value: string): Promise<void> {
    editorIndexState.textDraftByKey.set(getEditorStateKey(), value);
    persistEditorIndexSession(getEditorIndexShellState(), getEditorIndexCollections());

    if (editorIndexState.blocklyEnabled) {
        await ensureBlocklyWorkspace(currentScriptLanguage);
        loadBlocklyWorkspace(currentScriptLanguage);
        return;
    }

    setTextEditorValue(value);
}

export async function setEditorLanguage(language: ScriptLanguage): Promise<void> {
    setEditorTextLanguage(language);

    if (editorIndexState.blocklyEnabled) {
        // Фаза 7 плана: язык — это только таргет компиляции. Workspace не
        // перезагружаем (ensureBlocklyWorkspace/loadBlocklyWorkspace здесь
        // специально не вызываются — они бы очистили и пересобрали блоки).
        // Обновляем только тулбокс (флайаут неподдерживаемых блоков),
        // disabled-состояние уже стоящих блоков, превью и черновик текста.
        if (editorIndexState.blocklyWorkspace) {
            editorIndexState.blocklyWorkspace.updateToolbox(buildMainEditorToolbox(language));
        }
        retargetBlocklyWorkspace(language);
    }
}

export function setBlocklyEditorEnabled(enabled: boolean): void {
    setBlocklyEditorEnabledController(getEditorControllers().toggleController, enabled);
}

export function isBlocklyEditorEnabled(): boolean {
    return editorIndexState.blocklyEnabled;
}

// Приводит единственный селектор режима (#script-language-select) в соответствие
// с текущим состоянием редактора — нужен на старте и после программного
// включения Blockly (loadMainBlocklyXml).
export function syncScriptLanguageSelect(): void {
    syncScriptLanguageSelectDom(editorIndexState.blocklyEnabled, currentScriptLanguage, droneSdk(drones[currentDroneId]) === 'pioneer_sdk2');
}

export function getMainBlocklyWorkspace(): BlocklyNS.WorkspaceSvg | null {
    if (editorIndexState.blocklyEnabled && editorIndexState.blocklyWorkspace) {
        return editorIndexState.blocklyWorkspace;
    }

    return null;
}

export async function loadMainBlocklyXml(xml: string): Promise<void> {
    if (!editorIndexState.blocklyEnabled) {
        setBlocklyEditorEnabled(true);
    }

    await ensureBlocklyWorkspace(currentScriptLanguage);
    const workspace = editorIndexState.blocklyWorkspace;
    if (!workspace) {
        return;
    }

    workspace.clear();

    try {
        const dom = Blockly.utils.xml.textToDom(xml);
        migrateLessonLedValues(dom);
        Blockly.Xml.domToWorkspace(dom, workspace);
    } catch (error) {
        console.error('[Editor] Failed to load Blockly workspace', error);
    }

    resizeBlocklyWorkspaceViewportSupport(
        editorIndexState.blocklyCanvasHost,
        editorIndexState.blocklyCanvas,
        workspace
    );
    scheduleEditorPanelAutofitAutofit('blockly', createEditorAutofitContext(getEditorIndexShellState()));
    layoutEditor();
}

// Загружает в редактор блоков готовую программу (JSON-сериализация Blockly) —
// так открываются примеры из examples-blocks/.
export async function loadMainBlocklyJson(json: string): Promise<void> {
    if (!editorIndexState.blocklyEnabled) {
        setBlocklyEditorEnabled(true);
    }

    await ensureBlocklyWorkspace(currentScriptLanguage);
    const workspace = editorIndexState.blocklyWorkspace;
    if (!workspace) {
        return;
    }

    workspace.clear();

    try {
        Blockly.serialization.workspaces.load(JSON.parse(json), workspace);
    } catch (error) {
        console.error('[Editor] Failed to load Blockly example', error);
    }

    resizeBlocklyWorkspaceViewportSupport(
        editorIndexState.blocklyCanvasHost,
        editorIndexState.blocklyCanvas,
        workspace
    );
    scheduleEditorPanelAutofitAutofit('blockly', createEditorAutofitContext(getEditorIndexShellState()));
    layoutEditor();
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

export function setEditorTheme(theme: 'light' | 'dark' | 'paper'): void {
    setEditorThemeShell(theme);
}
import { migrateLessonLedValues } from '../blockly/legacy-values.js';
