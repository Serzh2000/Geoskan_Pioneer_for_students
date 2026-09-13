import * as Blockly from 'blockly';

// Blockly 12 хранит причины отключения блока как независимый Set
// (Block.setDisabledReason/hasDisabledReason/getDisabledReasons, см.
// node_modules/blockly/core/block.d.ts) — то есть блок может быть отключён
// сразу по нескольким причинам одновременно, и они не должны затирать друг
// друга. Здесь единая точка, которой пользуются и модель ожидания (фаза 5:
// блоки ожидания внутри pioneer_on_event), и поддержка таргетов (фаза 6:
// блок недоступен в текущем языке компиляции).
export const WAIT_IN_EVENT_REASON = 'wait_in_event';
export const UNSUPPORTED_TARGET_REASON = 'unsupported_target';
// FSM-таргет (§4.3 плана, пересмотрено 2026-09-13): у циклов и «если» нет
// собственного состояния автомата — блок-ожидание внутри них печатал бы
// маркер __wait_event/__wait_seconds прямо в тело обычного Lua-цикла/if,
// сгенерированного штатным generator.blockToCode() (а не нашим обходом
// цепочки в targets/lua-fsm.ts), и получился бы вызов несуществующей функции.
// Причины разные (см. wait-in-loop-guard.ts): внутри цикла ограничение
// принципиальное, внутри «если» — временное упрощение реализации (см. план,
// §4.3, «сузить рамки поддержки»).
export const WAIT_IN_LOOP_REASON = 'wait_in_loop';
export const WAIT_IN_CONDITIONAL_REASON = 'wait_in_conditional';

const WAIT_IN_EVENT_MESSAGE =
    'Блоки ожидания нельзя использовать внутри «Когда событие»: там нет корутины, программа зависнет.';
const WAIT_IN_LOOP_MESSAGE =
    'В Lua ожидание внутри цикла не поддерживается: тело цикла выполняется мгновенно, событию от автопилота негде «приземлиться». Вынесите ожидание из цикла.';
const WAIT_IN_CONDITIONAL_MESSAGE =
    'В Lua ожидание внутри «если» пока не реализовано: вынесите блок ожидания за пределы условия, в основную последовательность программы.';

// Текст для UNSUPPORTED_TARGET_REASON зависит от того, какой блок и в каком
// таргете — храним последнее актуальное сообщение по блоку, чтобы
// refreshBlockWarning() могла восстановить полный текст независимо от того,
// какая из двух подсистем вызвала её последней.
const unsupportedTargetMessageByBlock = new WeakMap<Blockly.Block, string>();

export function setUnsupportedTargetMessage(block: Blockly.Block, message: string | null): void {
    if (message) {
        unsupportedTargetMessageByBlock.set(block, message);
    } else {
        unsupportedTargetMessageByBlock.delete(block);
    }
}

// Пересобирает setWarningText() блока из ВСЕХ активных причин отключения.
// Вызывается из обеих подсистем после любого изменения своей причины — так
// ни одна не стирает предупреждение другой (§6 плана, фаза 6: разные пути
// могут отключить один и тот же блок одновременно).
export function refreshBlockWarning(block: Blockly.Block): void {
    const messages: string[] = [];
    if (block.hasDisabledReason(WAIT_IN_EVENT_REASON)) {
        messages.push(WAIT_IN_EVENT_MESSAGE);
    }
    if (block.hasDisabledReason(WAIT_IN_LOOP_REASON)) {
        messages.push(WAIT_IN_LOOP_MESSAGE);
    }
    if (block.hasDisabledReason(WAIT_IN_CONDITIONAL_REASON)) {
        messages.push(WAIT_IN_CONDITIONAL_MESSAGE);
    }
    if (block.hasDisabledReason(UNSUPPORTED_TARGET_REASON)) {
        messages.push(unsupportedTargetMessageByBlock.get(block) ?? 'Недоступно для текущего таргета.');
    }
    block.setWarningText(messages.length ? messages.join(' ') : null);
}

// setDisabledReason() сам по себе пишет обычное BlockChange-событие — это
// автоматический пересчёт состояния, а не действие пользователя, поэтому он
// не должен попадать в историю отмены (Ctrl+Z). Тот же приём использует сам
// Blockly во встроенной проверке "break вне цикла"
// (blocks_compressed.js, controls_flow_in_loop_check).
export function withoutUndo(run: () => void): void {
    Blockly.Events.setRecordUndo(false);
    try {
        run();
    } finally {
        Blockly.Events.setRecordUndo(true);
    }
}
