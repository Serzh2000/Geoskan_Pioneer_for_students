import * as Blockly from 'blockly';
import { refreshBlockWarning, withoutUndo } from './disable-reasons.js';
import { recomputeWaitInEventReason } from './wait-in-event-guard.js';
import { recomputeWaitContainerReasons, registerWaitContainerGuardType } from './wait-in-loop-guard.js';

// Единственная точка входа для блоков модели ожидания (preflight/takeoff/
// go_to/land в blocks/flight.ts, pioneer_wait в blocks/time.ts): вешает ОДИН
// onChange-обработчик, который пересчитывает СРАЗУ обе независимые причины
// отключения — "внутри pioneer_on_event" (wait-in-event-guard.ts) и "внутри
// цикла/если" (wait-in-loop-guard.ts, только для Lua).
//
// Раньше это были два отдельных installWaitInEventGuard()/installWaitInLoopGuard(),
// каждый со своим block.setOnChange(...) — но Blockly.Block.setOnChange()
// ЗАМЕНЯЕТ предыдущий обработчик, а не добавляет второй: второй вызов тихо
// отключал первую проверку. Отсюда и общий файл — оба пересчёта должны жить
// в одном обработчике.
export function installWaitModelGuards(block: Blockly.Block): void {
    registerWaitContainerGuardType(block.type);

    // Тот же onchange-паттерн, что использует сам Blockly для встроенной
    // проверки "break вне цикла" (blocks_compressed.js,
    // controls_flow_in_loop_check): реагируем только на перемещение/создание
    // блока и не во время перетаскивания — иначе состояние мигало бы на
    // каждом промежуточном кадре drag'а.
    block.setOnChange((event: Blockly.Events.Abstract) => {
        const workspace = block.workspace;
        if (!workspace || block.isInFlyout) return;
        // isDragging() есть только у WorkspaceSvg (в headless Workspace из
        // тестов его нет вовсе) — как и в самом Blockly, просто пропускаем
        // проверку, если её негде взять.
        const workspaceSvg = workspace as Blockly.WorkspaceSvg;
        if (typeof workspaceSvg.isDragging === 'function' && workspaceSvg.isDragging()) return;
        if (event.type !== Blockly.Events.BLOCK_MOVE && event.type !== Blockly.Events.BLOCK_CREATE) return;

        withoutUndo(() => {
            recomputeWaitInEventReason(block);
            recomputeWaitContainerReasons(block);
            refreshBlockWarning(block);
        });
    });
}
