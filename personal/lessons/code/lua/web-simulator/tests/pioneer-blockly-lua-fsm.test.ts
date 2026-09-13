/**
 * Lua-таргет: конечный автомат по состояниям (§4.3 плана, пересмотрено
 * 2026-09-13, см. §2.1 — FSM вместо корутины). Здесь проверяется именно
 * ГРАФ СОСТОЯНИЙ (какие сегменты появились, куда ведут переходы), а не
 * только "код скомпилировался" — см. итоговый отчёт задачи про уровень
 * поддержки control flow.
 *
 * Сюда же — тесты на wait-in-loop-guard.ts: блок-ожидание внутри цикла или
 * «если» отключается для Lua (граница состояния внутри них не поддержана —
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

describe('FSM: хвост без блока-ожидания после последнего перехода', () => {
    test('pioneer_disarm после pioneer_land попадает в отдельный терминальный сегмент', () => {
        const workspace = makeWorkspace();
        chainUnderStart(
            workspace,
            workspace.newBlock('pioneer_land'),
            workspace.newBlock('pioneer_disarm')
        );

        const code = compilePioneerWorkspace(workspace, 'lua');

        // land — единственный блок-ожидание, значит переход __s0 -> __s1 по
        // COPTER_LANDED, а disarm (не ждёт) должен оказаться в ТЕЛЕ сегмента
        // __s1, а не потеряться и не остаться в __s0 вместе с land.
        expect(code).toContain('action["__s0"] = function()');
        expect(code).toContain('ap.push(Ev.MCE_LANDING)');
        expect(code).toContain('if __state == "__s0" and event == Ev.COPTER_LANDED then __state = "__s1"; __advance() end');
        expect(code).toContain('action["__s1"] = function()');

        const segment1Start = code.indexOf('action["__s1"] = function()');
        const segment1End = code.indexOf('\nend', segment1Start);
        const segment1Body = code.slice(segment1Start, segment1End);
        expect(segment1Body).toContain('ap.push(Ev.ENGINES_DISARM)');

        // disarm не должен были попасть в __s0 (иначе он выполнился бы ДО
        // того, как автопилот подтвердил посадку).
        const segment0Start = code.indexOf('action["__s0"] = function()');
        const segment0Body = code.slice(segment0Start, code.indexOf('\nend', segment0Start));
        expect(segment0Body).not.toContain('ENGINES_DISARM');
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
