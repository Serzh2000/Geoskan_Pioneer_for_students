import { currentScriptLanguage } from '../../core/state.js';
import { bricksProjectFileName, loadBricksProject, serializeBricksProject } from '../blockly-mode/bricks/index.js';
import { isBricksModelActive } from '../blockly-mode/bricks/model.js';
import { scheduleEditorPanelAutofit as scheduleEditorPanelAutofitAutofit } from '../autofit.js';
import { resizeBlocklyWorkspaceViewport as resizeBlocklyWorkspaceViewportSupport } from '../blockly/support.js';
import { createEditorAutofitContext } from './helpers.js';
import { editorIndexState, getEditorIndexShellState } from './state.js';
import { ensureBlocklyWorkspace, layoutEditor, saveBlocklyWorkspaceState, setBlocklyEditorEnabled } from './api.js';

/*
 * Открытие и сохранение проектов Pioneer Bricks (Blockly XML) в редакторе блоков Пионера Мини 2.
 * Отдельный файл, чтобы не раздувать index/api.ts.
 */

// Открывает проект Bricks (Blockly XML с <project name="…"/>). Возвращает имя проекта из файла (или пустую строку).
export async function loadMainBricksProject(xml: string): Promise<string> {
    if (!isBricksModelActive()) {
        throw new Error('Проекты Bricks открываются на дроне «Пионер Мини 2»: переключите модель кнопкой «Мини 2».');
    }
    if (!editorIndexState.blocklyEnabled) {
        setBlocklyEditorEnabled(true);
    }

    await ensureBlocklyWorkspace(currentScriptLanguage);
    const workspace = editorIndexState.blocklyWorkspace;
    if (!workspace) {
        return '';
    }

    let name: string | null;
    try {
        name = loadBricksProject(xml, workspace);
    } catch (error) {
        console.error('[Editor] Failed to load Bricks project', error);
        throw new Error('Не удалось открыть проект Bricks: файл повреждён или это не проект Blockly.', { cause: error });
    }
    saveBlocklyWorkspaceState();

    resizeBlocklyWorkspaceViewportSupport(
        editorIndexState.blocklyCanvasHost,
        editorIndexState.blocklyCanvas,
        workspace
    );
    scheduleEditorPanelAutofitAutofit('blockly', createEditorAutofitContext(getEditorIndexShellState()));
    layoutEditor();
    revealProgramStart(workspace);
    return name ?? '';
}

// Показывает «Начало программы»: поле могло остаться прокрученным от прошлого проекта, и ученик видел пустую область.
function revealProgramStart(workspace: { getTopBlocks(ordered: boolean): Array<{ type: string; getRelativeToSurfaceXY(): { x: number; y: number } }>; scroll?: (x: number, y: number) => void; scale?: number }): void {
    const start = workspace.getTopBlocks(true).find((block) => block.type.endsWith('start_block'));
    if (!start || typeof workspace.scroll !== 'function') return;
    const { x, y } = start.getRelativeToSurfaceXY();
    const scale = workspace.scale ?? 1;
    // Кадр после раскладки: у скрытой панели размеры нулевые, поэтому прокручиваем сейчас и ещё раз чуть позже.
    const apply = () => workspace.scroll?.(-x * scale + 40, -y * scale + 24);
    apply();
    window.setTimeout(apply, 250);
}

// Сохраняет блоки Мини 2 в формате проекта Bricks. null - нечего сохранять (редактор блоков закрыт или модель другая).
export function exportMainBricksProject(name: string): { xml: string; fileName: string } | null {
    const workspace = editorIndexState.blocklyEnabled ? editorIndexState.blocklyWorkspace : null;
    if (!workspace || !isBricksModelActive()) return null;
    const projectName = bricksProjectFileName(name);
    return { xml: serializeBricksProject(workspace, projectName), fileName: `${projectName}.xml` };
}
