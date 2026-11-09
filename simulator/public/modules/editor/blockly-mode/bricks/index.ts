/*
 * Блоки «Bricks (Мини 2)»: определения, генератор Python, тулбокс и импорт/экспорт проектов.
 * Общие блоки pioneer_* (Пионер Базовый) этот набор не трогает: типы блоков не пересекаются,
 * а редактор выбирает набор по модели дрона (см. blockly-mode/index.ts).
 */
import { registerBricksBlockDefinitions } from './blocks.js';
import { installBricksGenerators } from './generators.js';

export { BRICKS_DRONE_ONLY_REASON, BRICKS_START_TYPE } from './constants.js';
export { compileBricksWorkspace } from './compile.js';
export { buildBricksToolbox } from './toolbox.js';
export { applyBricksDroneOnly } from './drone-only.js';
export { BRICKS_STARTER_XML } from './starter.js';
export {
    bricksProjectFileName,
    loadBricksProject,
    looksLikeBricksProject,
    parseBricksProject,
    serializeBricksProject
} from './xml.js';
export { allBricksBlockTypes, BRICKS_SPECS, isBricksBlockType } from './block-specs.js';
export {
    blocklyStateKeySuffix,
    currentBlocklyModelId,
    isBricksModelActive,
    MINI2_MODEL_ID,
    setBlocklyModelProvider
} from './model.js';

let registered = false;

/** Регистрирует блоки и генераторы Bricks (один раз). Вызывается из ensureEditorBlocklyDefinitions(). */
export function registerBricksBlocks(): void {
    if (registered) return;
    registered = true;
    registerBricksBlockDefinitions();
    installBricksGenerators();
}
