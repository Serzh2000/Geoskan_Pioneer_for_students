import * as Blockly from 'blockly';
import { BRICKS_DRONE_ONLY_REASON } from './constants.js';
import { bricksDroneOnlyTypes } from './block-specs.js';

const DRONE_ONLY_MESSAGE =
    'Только на дроне: в симуляторе нет этой функции OpenCV, блок отключён и в код не попадает. На настоящем Мини 2 он работает.';

// Предупреждения блока складываются из двух источников: «только на дроне» и замечания компилятора
// (блок не подключён, нет инициализации модели). Каждый источник хранит свой текст отдельно.
const compileWarnings = new WeakMap<Blockly.Block, string>();
const appliedWarnings = new WeakMap<Blockly.Block, string>();

export function setCompileWarning(block: Blockly.Block, message: string | null): void {
    if (message) compileWarnings.set(block, message);
    else compileWarnings.delete(block);
    refreshBricksWarning(block);
}

export function refreshBricksWarning(block: Blockly.Block): void {
    const messages: string[] = [];
    if (block.hasDisabledReason(BRICKS_DRONE_ONLY_REASON)) messages.push(DRONE_ONLY_MESSAGE);
    const own = compileWarnings.get(block);
    if (own) messages.push(own);
    const text = messages.join(' ');
    // Без лишних вызовов: смена предупреждения - событие Blockly, а компилятор работает на каждую правку.
    if ((appliedWarnings.get(block) ?? '') === text) return;
    appliedWarnings.set(block, text);
    block.setWarningText(text || null);
}

/** Отключает блоки «только на дроне» (по причине, независимой от ручного отключения). */
export function applyBricksDroneOnly(workspace: Blockly.Workspace): void {
    const types = new Set(bricksDroneOnlyTypes());
    const previous = Blockly.Events.getRecordUndo();
    Blockly.Events.setRecordUndo(false);
    try {
        for (const block of workspace.getAllBlocks(false)) {
            if (!types.has(block.type)) continue;
            if (!block.hasDisabledReason(BRICKS_DRONE_ONLY_REASON)) block.setDisabledReason(true, BRICKS_DRONE_ONLY_REASON);
            refreshBricksWarning(block);
        }
    } finally {
        Blockly.Events.setRecordUndo(previous);
    }
}
