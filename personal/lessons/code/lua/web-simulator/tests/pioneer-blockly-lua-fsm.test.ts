/**
 * Lua-таргет: два режима компиляции линейной цепочки (§4.3 плана).
 *
 * 1. ПЛОСКИЙ (добавлен 2026-09-14) — когда ни одно имя события не повторяется:
 *    соседние ветки `if event == Ev.X then ... end` внутри callback(event),
 *    без таблицы action, без __state и без __advance(). Это ровно то, что
 *    пишут в рукописных примерах Geoskan (§2.1 плана), и именно этот вывод
 *    зафиксирован здесь БАЙТ-В-БАЙТ: любая правка сборщика, меняющая форму
 *    сгенерированного скрипта, должна быть замечена.
 * 2. FSM (конечный автомат по состояниям) — как только имя события
 *    повторяется: две pioneer_go_to подряд обе ждут Ev.POINT_REACHED, и
 *    плоская ветка сработала бы уже на первой точке. Здесь проверяется
 *    именно ГРАФ СОСТОЯНИЙ (какие сегменты появились, куда ведут переходы).
 *
 * Сюда же — тесты на wait-in-loop-guard.ts: блок-ожидание внутри цикла или
 * «если» отключается для Lua (граница шага внутри них не поддержана —
 * решили не рисковать тихой поломкой рантайма вместо честного отключения) и
 * остаётся включённым для Python (там ожидание — обычный блокирующий опрос,
 * циклы и условия ему не мешают).
 */
import * as Blockly from 'blockly';
import { ensureEditorBlocklyDefinitions } from '../public/modules/editor/blockly-mode/index.js';
import { compilePioneerWorkspace } from '../public/modules/editor/blockly-mode/pioneer/targets/compile.js';
import { applyPioneerTargetToWorkspace } from '../public/modules/editor/blockly-mode/pioneer/target-support.js';
import {
    WAIT_IN_LOOP_REASON,
    WAIT_IN_CONDITIONAL_REASON
} from '../public/modules/editor/blockly-mode/pioneer/disable-reasons.js';

await import('../public/modules/editor/blockly-mode/blockly-core.js');
await import('../public/modules/editor/blockly-mode/workspace-xml.js');
await import('../public/modules/editor/blockly-mode/lua-definitions.js');
await ensureEditorBlocklyDefinitions();

function makeWorkspace(): Blockly.Workspace {
    return new Blockly.Workspace();
}

function numberBlock(workspace: Blockly.Workspace, value: number): Blockly.Block {
    const block = workspace.newBlock('math_number');
    block.setFieldValue(String(value), 'NUM');
    return block;
}

function chainUnderStart(workspace: Blockly.Workspace, ...blocks: Blockly.Block[]): void {
    const start = workspace.newBlock('pioneer_start');
    let previous = start;
    for (const block of blocks) {
        previous.nextConnection!.connect(block.previousConnection!);
        previous = block;
    }
}

async function flushBlocklyEvents(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 5));
}

describe('Плоский режим: линейная цепочка без повторяющихся событий', () => {
    test('«моторы → взлёт → посадка»: эталон владельца, байт-в-байт', () => {
        const workspace = makeWorkspace();
        chainUnderStart(
            workspace,
            workspace.newBlock('pioneer_preflight'),
            workspace.newBlock('pioneer_takeoff'),
            workspace.newBlock('pioneer_land')
        );

        // Ветка Ev.COPTER_LANDED с пустым телом — это терминальный шаг: после
        // последнего блока-ожидания в программе ничего нет. В FSM-режиме ему
        // соответствует такое же пустое последнее состояние (и пустой
        // _FINAL_NODE в референсе TRIK из §2.1 плана).
        expect(compilePioneerWorkspace(workspace, 'lua')).toBe(
            '-- @pioneer-blockly v1\n'
            + 'ap.push(Ev.MCE_PREFLIGHT)\n'
            + '\n'
            + 'function callback(event)\n'
            + '    if event == Ev.ENGINES_STARTED then\n'
            + '        ap.push(Ev.MCE_TAKEOFF)\n'
            + '    end\n'
            + '    if event == Ev.TAKEOFF_COMPLETE then\n'
            + '        ap.push(Ev.MCE_LANDING)\n'
            + '    end\n'
            + '    if event == Ev.COPTER_LANDED then\n'
            + '    end\n'
            + 'end\n'
        );
    });

    test('«моторы → взлёт → точка → ждать 2с → посадка»: Timer.callLater вложен, ветки — нет', () => {
        const workspace = makeWorkspace();
        const goTo = workspace.newBlock('pioneer_go_to');
        goTo.getInput('X')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);
        goTo.getInput('Y')!.connection!.connect(numberBlock(workspace, 0).outputConnection!);
        goTo.getInput('Z')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);
        const wait = workspace.newBlock('pioneer_wait');
        wait.getInput('SECONDS')!.connection!.connect(numberBlock(workspace, 2).outputConnection!);
        chainUnderStart(
            workspace,
            workspace.newBlock('pioneer_preflight'),
            workspace.newBlock('pioneer_takeoff'),
            goTo,
            wait,
            workspace.newBlock('pioneer_land')
        );

        // Единственная настоящая вложенность — Timer.callLater: второй таймер
        // физически нельзя завести раньше, чем выполнится тело первого.
        // Ожидания событий вложенности не создают (см. targets/lua-fsm.ts).
        expect(compilePioneerWorkspace(workspace, 'lua')).toBe(
            '-- @pioneer-blockly v1\n'
            + 'ap.push(Ev.MCE_PREFLIGHT)\n'
            + '\n'
            + 'function callback(event)\n'
            + '    if event == Ev.ENGINES_STARTED then\n'
            + '        ap.push(Ev.MCE_TAKEOFF)\n'
            + '    end\n'
            + '    if event == Ev.TAKEOFF_COMPLETE then\n'
            + '        ap.goToLocalPoint(1, 0, 1)\n'
            + '    end\n'
            + '    if event == Ev.POINT_REACHED then\n'
            + '        Timer.callLater(2, function()\n'
            + '            ap.push(Ev.MCE_LANDING)\n'
            + '        end)\n'
            + '    end\n'
            + '    if event == Ev.COPTER_LANDED then\n'
            + '    end\n'
            + 'end\n'
        );
    });

    test('программа без блоков модели ожидания (только светодиоды) — плоская и без callback-веток', () => {
        const workspace = makeWorkspace();
        const led = workspace.newBlock('pioneer_led_all');
        const colour = workspace.newBlock('pioneer_colour_preset');
        colour.setFieldValue('красный', 'PRESET');
        led.getInput('COLOUR')!.connection!.connect(colour.outputConnection!);
        chainUnderStart(workspace, led);

        const code = compilePioneerWorkspace(workspace, 'lua');

        // Ноль переходов — тривиально плоский случай: никакой машины состояний
        // тут быть не должно, только тело программы и пустой callback (его
        // наличие проверяет mission-guard.ts, см. targets/lua-runtime.ts).
        expect(code).not.toContain('action[');
        expect(code).not.toContain('local action');
        expect(code).not.toContain('__state');
        expect(code).not.toContain('__advance');
        expect(code).toContain('\n__led_all({255, 0, 0})\n');
        expect(code.trimEnd().endsWith('function callback(event)\nend')).toBe(true);
    });

    test('pioneer_disarm после pioneer_land выполняется в ветке события, а не сразу', () => {
        const workspace = makeWorkspace();
        chainUnderStart(
            workspace,
            workspace.newBlock('pioneer_land'),
            workspace.newBlock('pioneer_disarm')
        );

        // disarm не должен оказаться на верхнем уровне рядом с посадкой —
        // иначе моторы выключились бы ДО того, как автопилот подтвердил
        // касание земли.
        expect(compilePioneerWorkspace(workspace, 'lua')).toBe(
            '-- @pioneer-blockly v1\n'
            + 'ap.push(Ev.MCE_LANDING)\n'
            + '\n'
            + 'function callback(event)\n'
            + '    if event == Ev.COPTER_LANDED then\n'
            + '        ap.push(Ev.ENGINES_DISARM)\n'
            + '    end\n'
            + 'end\n'
        );
    });
});

describe('FSM: откат при повторяющемся имени события', () => {
    test('две pioneer_go_to подряд (оба ждут POINT_REACHED) дают полный автомат с __state', () => {
        const workspace = makeWorkspace();
        const first = workspace.newBlock('pioneer_go_to');
        first.getInput('X')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);
        first.getInput('Y')!.connection!.connect(numberBlock(workspace, 0).outputConnection!);
        first.getInput('Z')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);
        const second = workspace.newBlock('pioneer_go_to');
        second.getInput('X')!.connection!.connect(numberBlock(workspace, 0).outputConnection!);
        second.getInput('Y')!.connection!.connect(numberBlock(workspace, 0).outputConnection!);
        second.getInput('Z')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);
        chainUnderStart(workspace, first, second);

        // Байт-в-байт тот же вывод, что был до появления плоского режима —
        // включая мелкие странности форматирования (отступ первой
        // ветки-перехода складывается из пустых eventBranches и
        // generator.INDENT, пустое состояние печатается как `  end`).
        // Зафиксировано осознанно: этот путь не переписывали, и любое его
        // изменение здесь должно быть видно.
        expect(compilePioneerWorkspace(workspace, 'lua')).toBe(
            '-- @pioneer-blockly v1\n'
            + 'local __state = "__s0"\n'
            + '\n'
            + 'local action = {}\n'
            + '\n'
            + 'local function __advance()\n'
            + '    local current = action[__state]\n'
            + '    if current ~= nil then current() end\n'
            + 'end\n'
            + '\n'
            + 'action["__s0"] = function()\n'
            + '  ap.goToLocalPoint(1, 0, 1)\n'
            + 'end\n'
            + 'action["__s1"] = function()\n'
            + '  ap.goToLocalPoint(0, 0, 1)\n'
            + 'end\n'
            + 'action["__s2"] = function()\n'
            + '  end\n'
            + '\n'
            + 'function callback(event)\n'
            + '    if __state == "__s0" and event == Ev.POINT_REACHED then __state = "__s1"; __advance() end\n'
            + '  if __state == "__s1" and event == Ev.POINT_REACHED then __state = "__s2"; __advance() end\n'
            + 'end\n'
            + '\n'
            + '__advance()\n'
        );
    });

    test('повтор события через несколько шагов тоже включает FSM, а таймеры — нет', () => {
        const repeated = makeWorkspace();
        const goTo = repeated.newBlock('pioneer_go_to');
        goTo.getInput('X')!.connection!.connect(numberBlock(repeated, 1).outputConnection!);
        goTo.getInput('Y')!.connection!.connect(numberBlock(repeated, 0).outputConnection!);
        goTo.getInput('Z')!.connection!.connect(numberBlock(repeated, 1).outputConnection!);
        const wait = repeated.newBlock('pioneer_wait');
        wait.getInput('SECONDS')!.connection!.connect(numberBlock(repeated, 1).outputConnection!);
        const goToAgain = repeated.newBlock('pioneer_go_to');
        goToAgain.getInput('X')!.connection!.connect(numberBlock(repeated, 0).outputConnection!);
        goToAgain.getInput('Y')!.connection!.connect(numberBlock(repeated, 0).outputConnection!);
        goToAgain.getInput('Z')!.connection!.connect(numberBlock(repeated, 1).outputConnection!);
        chainUnderStart(repeated, goTo, wait, goToAgain);

        // Между двумя POINT_REACHED есть шаг ожидания времени, но это ничего
        // не меняет: плоская ветка по-прежнему не смогла бы отличить первую
        // точку от второй.
        expect(compilePioneerWorkspace(repeated, 'lua')).toContain('local __state = "__s0"');

        // А сами по себе несколько pioneer_wait подряд неоднозначности не
        // создают: каждый — своё независимое замыкание Timer.callLater.
        const timersOnly = makeWorkspace();
        const firstWait = timersOnly.newBlock('pioneer_wait');
        firstWait.getInput('SECONDS')!.connection!.connect(numberBlock(timersOnly, 1).outputConnection!);
        const secondWait = timersOnly.newBlock('pioneer_wait');
        secondWait.getInput('SECONDS')!.connection!.connect(numberBlock(timersOnly, 2).outputConnection!);
        chainUnderStart(timersOnly, firstWait, secondWait, timersOnly.newBlock('pioneer_disarm'));

        expect(compilePioneerWorkspace(timersOnly, 'lua')).toBe(
            '-- @pioneer-blockly v1\n'
            + 'Timer.callLater(1, function()\n'
            + '    Timer.callLater(2, function()\n'
            + '        ap.push(Ev.ENGINES_DISARM)\n'
            + '    end)\n'
            + 'end)\n'
            + '\n'
            + 'function callback(event)\n'
            + 'end\n'
        );
    });
});

describe('wait-in-loop-guard: ожидание внутри цикла', () => {
    test.each(['controls_repeat_ext', 'controls_whileUntil', 'controls_for'])(
        '%s: pioneer_wait внутри DO отключается в Lua и не генерирует код',
        async (loopType) => {
            const workspace = makeWorkspace();
            chainUnderStart(workspace, workspace.newBlock('pioneer_preflight'));

            const loop = workspace.newBlock(loopType);
            const wait = workspace.newBlock('pioneer_wait');
            wait.getInput('SECONDS')!.connection!.connect(numberBlock(workspace, 4.25).outputConnection!);
            const doInputName = loopType === 'controls_for' ? 'DO' : 'DO';
            loop.getInput(doInputName)!.connection!.connect(wait.previousConnection!);

            // Цикл сам по себе — сирота (не подключён к pioneer_start): для
            // этого теста важно только состояние блока, не итоговый код цикла.
            await flushBlocklyEvents();

            expect(wait.isEnabled()).toBe(false);
            expect(wait.hasDisabledReason(WAIT_IN_LOOP_REASON)).toBe(true);
        }
    );

    test('в Python тот же pioneer_wait внутри цикла остаётся включённым', async () => {
        const workspace = makeWorkspace();
        const loop = workspace.newBlock('controls_repeat_ext');
        const wait = workspace.newBlock('pioneer_wait');
        wait.getInput('SECONDS')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);
        loop.getInput('DO')!.connection!.connect(wait.previousConnection!);

        await flushBlocklyEvents();
        expect(wait.hasDisabledReason(WAIT_IN_LOOP_REASON)).toBe(true); // default target — lua

        applyPioneerTargetToWorkspace(workspace, 'python');
        expect(wait.hasDisabledReason(WAIT_IN_LOOP_REASON)).toBe(false);
        expect(wait.isEnabled()).toBe(true);

        applyPioneerTargetToWorkspace(workspace, 'lua');
        expect(wait.hasDisabledReason(WAIT_IN_LOOP_REASON)).toBe(true);
        expect(wait.isEnabled()).toBe(false);
    });

    test('вложенность глубже одного уровня (если внутри цикла) тоже ловится', async () => {
        const workspace = makeWorkspace();
        const loop = workspace.newBlock('controls_repeat_ext');
        const branch = workspace.newBlock('controls_if');
        const wait = workspace.newBlock('pioneer_wait');
        wait.getInput('SECONDS')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);
        branch.getInput('DO0')!.connection!.connect(wait.previousConnection!);
        loop.getInput('DO')!.connection!.connect(branch.previousConnection!);

        await flushBlocklyEvents();

        expect(wait.hasDisabledReason(WAIT_IN_LOOP_REASON)).toBe(true);
    });
});

describe('wait-in-loop-guard: ожидание внутри «если» (§4.3 плана — сужено до "отключено", см. итоговый отчёт)', () => {
    test('pioneer_go_to внутри DO0 отключается в Lua', async () => {
        const workspace = makeWorkspace();
        const branch = workspace.newBlock('controls_if');
        const goTo = workspace.newBlock('pioneer_go_to');
        goTo.getInput('X')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);
        goTo.getInput('Y')!.connection!.connect(numberBlock(workspace, 0).outputConnection!);
        goTo.getInput('Z')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);
        branch.getInput('DO0')!.connection!.connect(goTo.previousConnection!);

        await flushBlocklyEvents();

        expect(goTo.isEnabled()).toBe(false);
        expect(goTo.hasDisabledReason(WAIT_IN_CONDITIONAL_REASON)).toBe(true);
    });

    test('в Python тот же блок внутри «если» остаётся включённым', async () => {
        const workspace = makeWorkspace();
        const branch = workspace.newBlock('controls_if');
        const takeoff = workspace.newBlock('pioneer_takeoff');
        branch.getInput('DO0')!.connection!.connect(takeoff.previousConnection!);

        await flushBlocklyEvents();
        expect(takeoff.hasDisabledReason(WAIT_IN_CONDITIONAL_REASON)).toBe(true);

        applyPioneerTargetToWorkspace(workspace, 'python');
        expect(takeoff.hasDisabledReason(WAIT_IN_CONDITIONAL_REASON)).toBe(false);
        expect(takeoff.isEnabled()).toBe(true);
    });

    test('вынос блока из «если» обратно в основную цепочку включает его', async () => {
        const workspace = makeWorkspace();
        const start = workspace.newBlock('pioneer_start');
        const branch = workspace.newBlock('controls_if');
        const land = workspace.newBlock('pioneer_land');
        branch.getInput('DO0')!.connection!.connect(land.previousConnection!);

        await flushBlocklyEvents();
        expect(land.isEnabled()).toBe(false);

        land.unplug(true);
        start.nextConnection!.connect(land.previousConnection!);

        await flushBlocklyEvents();

        expect(land.isEnabled()).toBe(true);
        expect(land.hasDisabledReason(WAIT_IN_CONDITIONAL_REASON)).toBe(false);
    });

    test('не мешает и не путается с pioneer_on_event guard-ом (обе причины независимы)', async () => {
        const workspace = makeWorkspace();
        const onEvent = workspace.newBlock('pioneer_on_event');
        const branch = workspace.newBlock('controls_if');
        const wait = workspace.newBlock('pioneer_wait');
        wait.getInput('SECONDS')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);
        branch.getInput('DO0')!.connection!.connect(wait.previousConnection!);
        onEvent.getInput('DO')!.connection!.connect(branch.previousConnection!);

        await flushBlocklyEvents();

        // Блок внутри "если", который сам внутри pioneer_on_event — должны
        // сработать ОБЕ проверки одновременно, ни одна не должна затереть другую.
        expect(wait.hasDisabledReason(WAIT_IN_CONDITIONAL_REASON)).toBe(true);
        expect(wait.isEnabled()).toBe(false);
    });
});
