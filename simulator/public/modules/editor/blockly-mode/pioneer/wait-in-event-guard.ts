import * as Blockly from 'blockly';
import { PIONEER_ON_EVENT_TYPE } from './constants.js';
import { WAIT_IN_EVENT_REASON } from './disable-reasons.js';

// Блоки модели ожидания (preflight/takeoff/go_to/land/wait) нельзя ставить
// внутрь pioneer_on_event: тело callback(event) — не отдельное состояние FSM
// (§4.3 плана, пересмотрено 2026-09-13, см. §2.1), маркер __wait_event/
// __wait_seconds там некому разобрать, и получился бы вызов несуществующей
// функции. Проверяем всех предков через getSurroundParent(), а не только
// прямого родителя, — блок может быть вложен глубже (например, внутри
// controls_if внутри pioneer_on_event).
function isInsideEventBlock(block: Blockly.Block): boolean {
    let ancestor = block.getSurroundParent();
    while (ancestor) {
        if (ancestor.type === PIONEER_ON_EVENT_TYPE) return true;
        ancestor = ancestor.getSurroundParent();
    }
    return false;
}

// Только пересчёт причины отключения, БЕЗ setDisabledReason-обвязки
// (withoutUndo/refreshBlockWarning) и БЕЗ собственного onChange: вызывается
// из wait-model-guards.ts вместе с recomputeWaitContainerReasons() внутри
// ОДНОГО общего onChange-обработчика. Так и должно быть — Blockly's
// Block.setOnChange() ЗАМЕНЯЕТ предыдущий обработчик, а не добавляет второй
// (node_modules/blockly/core/block.js: this.workspace.removeChangeListener(
// this.onchangeWrapper) перед подпиской нового), поэтому две независимые
// причины отключения одного и того же блока нельзя вешать через два разных
// block.setOnChange() — выживет только последний вызов.
export function recomputeWaitInEventReason(block: Blockly.Block): void {
    block.setDisabledReason(isInsideEventBlock(block), WAIT_IN_EVENT_REASON);
}
