import * as Blockly from 'blockly';
import { PIONEER_ON_EVENT_TYPE } from './constants.js';
import { WAIT_IN_EVENT_REASON, refreshBlockWarning, withoutUndo } from './disable-reasons.js';

// Блоки модели ожидания (preflight/takeoff/go_to/land/wait) нельзя ставить
// внутрь pioneer_on_event: тело callback(event) не выполняется в corutine
// (§4.3 плана), coroutine.yield() внутри него упадёт с ошибкой "attempt to
// yield from outside a coroutine". Проверяем всех предков через
// getSurroundParent(), а не только прямого родителя, — блок может быть
// вложен глубже (например, внутри controls_if внутри pioneer_on_event).
function isInsideEventBlock(block: Blockly.Block): boolean {
    let ancestor = block.getSurroundParent();
    while (ancestor) {
        if (ancestor.type === PIONEER_ON_EVENT_TYPE) return true;
        ancestor = ancestor.getSurroundParent();
    }
    return false;
}

// Тот же onchange-паттерн, что использует сам Blockly для встроенной
// проверки "break вне цикла" (blocks_compressed.js,
// controls_flow_in_loop_check): реагируем только на перемещение/создание
// блока и не во время перетаскивания — иначе состояние мигало бы на каждом
// промежуточном кадре drag'а.
export function installWaitInEventGuard(block: Blockly.Block): void {
    block.setOnChange((event: Blockly.Events.Abstract) => {
        const workspace = block.workspace;
        if (!workspace || block.isInFlyout) return;
        // isDragging() есть только у WorkspaceSvg (в headless Workspace из
        // тестов его нет вовсе) — как и в самом Blockly (controls_flow_in_loop_check),
        // просто пропускаем проверку, если её негде взять.
        const workspaceSvg = workspace as Blockly.WorkspaceSvg;
        if (typeof workspaceSvg.isDragging === 'function' && workspaceSvg.isDragging()) return;
        if (event.type !== Blockly.Events.BLOCK_MOVE && event.type !== Blockly.Events.BLOCK_CREATE) return;

        const disabled = isInsideEventBlock(block);
        withoutUndo(() => {
            block.setDisabledReason(disabled, WAIT_IN_EVENT_REASON);
            refreshBlockWarning(block);
        });
    });
}
