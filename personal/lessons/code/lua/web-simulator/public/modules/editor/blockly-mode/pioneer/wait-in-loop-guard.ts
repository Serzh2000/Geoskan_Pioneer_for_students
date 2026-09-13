import * as Blockly from 'blockly';
import { WAIT_IN_LOOP_REASON, WAIT_IN_CONDITIONAL_REASON, refreshBlockWarning, withoutUndo } from './disable-reasons.js';
import type { PioneerTarget } from './targets/types.js';

// FSM компилирует только цепочку НЕПОСРЕДСТВЕННО под pioneer_start
// (targets/lua-fsm.ts): она одна разбивается на состояния автомата. Всё, что
// вложено в цикл или в «если», компилируется штатным generator.blockToCode()
// Blockly — обычной рекурсивной сборкой без понятия "состояние". Блок
// ожидания там всё равно допечатает маркер __wait_event(...)/__wait_seconds(...)
// в тело куска Lua-кода, который никто не разберёт: получится вызов
// несуществующей функции. Поэтому такие блоки нужно отключать целиком.
//
// Циклы запрещены безусловно (§4.3 плана): ожидание внутри цикла в принципе
// не укладывается в "один шаг — одно состояние". Ожидание внутри «если»
// теоретически укладывается (переход в общее состояние после if, см. план),
// но разбиение ветки if на состояния — это отдельный небольшой компилятор
// внутри компилятора (рекурсивный обход обеих веток, склейка хвостов), и
// сделать это надёжно и проверяемо тестами в рамках этой задачи не вышло —
// решили не рисковать вместо этого тихой поломкой рантайма (см. итоговый
// отчёт). Отключаем так же, как циклы, с отдельной причиной/сообщением на
// случай, если поддержку добавят позже.
const LOOP_CONTAINER_TYPES = new Set(['controls_repeat_ext', 'controls_whileUntil', 'controls_for']);
// 'controls_ifelse' — имя блока из старых наборов Blockly; в актуальной
// версии единственный тип 'controls_if' с мутацией else, но проверяем оба
// имени на случай другого источника XML (миграция старых сессий, фаза 8).
const CONDITIONAL_CONTAINER_TYPES = new Set(['controls_if', 'controls_ifelse']);

function hasAncestorOfType(block: Blockly.Block, types: Set<string>): boolean {
    let ancestor = block.getSurroundParent();
    while (ancestor) {
        if (types.has(ancestor.type)) return true;
        ancestor = ancestor.getSurroundParent();
    }
    return false;
}

// Ограничение действует только для Lua: у Python-таргета нет FSM и нет
// разбиения на состояния — там ожидание это просто блокирующий опрос
// (targets/python-runtime.ts), и внутри цикла или if он работает как в любом
// обычном последовательном скрипте. Текущий таргет каждого workspace
// сохраняет applyPioneerTargetToWorkspace() (target-support.ts) при каждой
// смене языка через refreshWaitContainerGuardsForWorkspace() (см. ниже); по
// умолчанию (до первого вызова) считаем Lua — более строгий случай,
// соответствует поведению до появления поддержки таргетов в UI.
const targetByWorkspace = new WeakMap<Blockly.Workspace, PioneerTarget>();
// Типы блоков модели ожидания — нужны, чтобы refreshWaitContainerGuardsForWorkspace()
// могла найти их все при смене таргета, не дожидаясь события
// перемещения/создания блока. Заполняется из wait-model-guards.ts.
const guardedTypes = new Set<string>();

export function registerWaitContainerGuardType(type: string): void {
    guardedTypes.add(type);
}

function currentTarget(workspace: Blockly.Workspace): PioneerTarget {
    return targetByWorkspace.get(workspace) ?? 'lua';
}

// Только пересчёт причин отключения, БЕЗ setDisabledReason-обвязки и БЕЗ
// собственного onChange — см. комментарий в wait-in-event-guard.ts про
// Block.setOnChange(), заменяющий, а не добавляющий обработчик. Единственный
// onChange для блоков модели ожидания — в wait-model-guards.ts.
export function recomputeWaitContainerReasons(block: Blockly.Block): void {
    const workspace = block.workspace;
    if (!workspace) return;
    const isLua = currentTarget(workspace) === 'lua';
    block.setDisabledReason(isLua && hasAncestorOfType(block, LOOP_CONTAINER_TYPES), WAIT_IN_LOOP_REASON);
    block.setDisabledReason(isLua && hasAncestorOfType(block, CONDITIONAL_CONTAINER_TYPES), WAIT_IN_CONDITIONAL_REASON);
}

// Вызывается из applyPioneerTargetToWorkspace() (target-support.ts) при
// каждой смене таргета: сама смена языка не двигает и не создаёт блоки,
// поэтому onChange из wait-model-guards.ts сам по себе не сработает —
// пересчёт нужно запускать явно для всех уже расставленных блоков-ожиданий.
export function refreshWaitContainerGuardsForWorkspace(workspace: Blockly.Workspace, target: PioneerTarget): void {
    targetByWorkspace.set(workspace, target);
    withoutUndo(() => {
        workspace.getAllBlocks(false).forEach((block) => {
            if (!guardedTypes.has(block.type)) return;
            recomputeWaitContainerReasons(block);
            refreshBlockWarning(block);
        });
    });
}
