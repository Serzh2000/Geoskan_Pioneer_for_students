import * as Blockly from 'blockly';
import { WAIT_IN_FUNCTION_REASON, WAIT_IN_TIMER_REASON, refreshBlockWarning, withoutUndo } from './disable-reasons.js';
import type { PioneerTarget } from './targets/types.js';

// Где в Lua блоку-ожиданию закончить шаг негде.
//
// Внутри «если» и циклов основной программы ожидание работает: такие
// программы компилируются в автомат с развилками (targets/lua-structured.ts).
// Но функция (procedures_def*) вызывается синхронно из любого места, а тело
// таймера («Каждые N сек», «Через N сек») — это колбэк Timer.new/callLater:
// у обоих нет своего состояния автомата, и маркер __wait_event/__wait_seconds
// остался бы в коде вызовом несуществующей функции. Поэтому там блок
// отключается. В Python ожидание — обычный блокирующий опрос, и таких
// ограничений нет.
const FUNCTION_TYPES = new Set(['procedures_defnoreturn', 'procedures_defreturn']);
const TIMER_BODY_TYPES = new Set(['pioneer_every', 'pioneer_after']);

function hasAncestorOfType(block: Blockly.Block, types: Set<string>): boolean {
    let ancestor = block.getSurroundParent();
    while (ancestor) {
        if (types.has(ancestor.type)) return true;
        ancestor = ancestor.getSurroundParent();
    }
    return false;
}

// Текущий таргет каждого workspace сохраняет applyPioneerTargetToWorkspace()
// (target-support.ts) при каждой смене языка; до первого вызова считаем Lua —
// более строгий случай.
const targetByWorkspace = new WeakMap<Blockly.Workspace, PioneerTarget>();
// Типы блоков модели ожидания. Заполняется из wait-model-guards.ts; по нему
// же компилятор Lua узнаёт, где кончается шаг автомата.
const guardedTypes = new Set<string>();

export function registerWaitContainerGuardType(type: string): void {
    guardedTypes.add(type);
}

export function isWaitBlockType(type: string): boolean {
    return guardedTypes.has(type);
}

function currentTarget(workspace: Blockly.Workspace): PioneerTarget {
    return targetByWorkspace.get(workspace) ?? 'lua';
}

// Только пересчёт причин отключения, без собственного onChange: единственный
// onChange блоков модели ожидания — в wait-model-guards.ts (Block.setOnChange
// заменяет прежний обработчик, а не добавляет второй).
export function recomputeWaitContainerReasons(block: Blockly.Block): void {
    const workspace = block.workspace;
    if (!workspace) return;
    const isLua = currentTarget(workspace) === 'lua';
    block.setDisabledReason(isLua && hasAncestorOfType(block, FUNCTION_TYPES), WAIT_IN_FUNCTION_REASON);
    block.setDisabledReason(isLua && hasAncestorOfType(block, TIMER_BODY_TYPES), WAIT_IN_TIMER_REASON);
}

// Вызывается из applyPioneerTargetToWorkspace() при каждой смене таргета:
// сама смена языка не двигает блоки, и onChange сам не сработает.
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
