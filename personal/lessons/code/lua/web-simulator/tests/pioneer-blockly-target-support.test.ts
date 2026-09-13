/**
 * Поддержка таргетов в UI (фаза 6 плана): блоки, не поддерживаемые текущим
 * языком компиляции (pioneer_set_manual_speed в Lua, pioneer_on_event в
 * Python), отключаются с setDisabledReason(true, 'unsupported_target') и не
 * генерируют код — как в workspace, так и во flyout тулбокса. Причина
 * 'wait_in_event' (фаза 5) при этом не должна затираться: Blockly хранит
 * причины отключения как независимый Set (node_modules/blockly/core/block.d.ts).
 */
import * as Blockly from 'blockly';
import { ensureEditorBlocklyDefinitions } from '../public/modules/editor/blockly-mode/index.js';
import { compilePioneerWorkspace } from '../public/modules/editor/blockly-mode/pioneer/targets/compile.js';
import { applyPioneerTargetToWorkspace } from '../public/modules/editor/blockly-mode/pioneer/target-support.js';
import { buildPioneerToolbox } from '../public/modules/editor/blockly-mode/pioneer/toolbox.js';
import {
    WAIT_IN_EVENT_REASON,
    UNSUPPORTED_TARGET_REASON,
    refreshBlockWarning,
    setUnsupportedTargetMessage
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

async function flushBlocklyEvents(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 5));
}

describe('applyPioneerTargetToWorkspace: отключение неподдерживаемых блоков', () => {
    test('pioneer_set_manual_speed отключается в Lua и включается в Python', () => {
        const workspace = makeWorkspace();
        const speed = workspace.newBlock('pioneer_set_manual_speed');
        (['VX', 'VY', 'VZ', 'YAW_RATE'] as const).forEach((name) => {
            speed.getInput(name)!.connection!.connect(numberBlock(workspace, 1).outputConnection!);
        });

        applyPioneerTargetToWorkspace(workspace, 'lua');
        expect(speed.isEnabled()).toBe(false);
        expect(speed.hasDisabledReason(UNSUPPORTED_TARGET_REASON)).toBe(true);

        applyPioneerTargetToWorkspace(workspace, 'python');
        expect(speed.isEnabled()).toBe(true);
        expect(speed.hasDisabledReason(UNSUPPORTED_TARGET_REASON)).toBe(false);
    });

    test('отключённый pioneer_set_manual_speed не генерирует код в Lua', () => {
        const workspace = makeWorkspace();
        const start = workspace.newBlock('pioneer_start');
        const speed = workspace.newBlock('pioneer_set_manual_speed');
        (['VX', 'VY', 'VZ', 'YAW_RATE'] as const).forEach((name) => {
            speed.getInput(name)!.connection!.connect(numberBlock(workspace, 2).outputConnection!);
        });
        start.nextConnection!.connect(speed.previousConnection!);

        applyPioneerTargetToWorkspace(workspace, 'lua');
        const code = compilePioneerWorkspace(workspace, 'lua');
        expect(code).not.toContain('set_manual_speed');

        applyPioneerTargetToWorkspace(workspace, 'python');
        const pythonCode = compilePioneerWorkspace(workspace, 'python');
        expect(pythonCode).toContain('pioneer.set_manual_speed(2, 2, 2, math.radians(2))');
    });

    test('pioneer_on_event отключается в Python и не даёт кода', () => {
        const workspace = makeWorkspace();
        const onEvent = workspace.newBlock('pioneer_on_event');

        applyPioneerTargetToWorkspace(workspace, 'python');
        expect(onEvent.isEnabled()).toBe(false);
        expect(onEvent.hasDisabledReason(UNSUPPORTED_TARGET_REASON)).toBe(true);

        const code = compilePioneerWorkspace(workspace, 'python');
        expect(code).not.toMatch(/event/);

        applyPioneerTargetToWorkspace(workspace, 'lua');
        expect(onEvent.isEnabled()).toBe(true);
    });

    test('поддерживаемые в обоих таргетах блоки (pioneer_preflight) никогда не отключаются этой причиной', () => {
        const workspace = makeWorkspace();
        const preflight = workspace.newBlock('pioneer_preflight');

        applyPioneerTargetToWorkspace(workspace, 'lua');
        expect(preflight.hasDisabledReason(UNSUPPORTED_TARGET_REASON)).toBe(false);
        applyPioneerTargetToWorkspace(workspace, 'python');
        expect(preflight.hasDisabledReason(UNSUPPORTED_TARGET_REASON)).toBe(false);
    });
});

describe('buildPioneerToolbox(target): неподдерживаемые блоки неактивны во flyout', () => {
    test('в Lua-тулбоксе pioneer_set_manual_speed помечен disabled-reasons', () => {
        const xml = buildPioneerToolbox('lua');
        expect(xml).toMatch(/<block type="pioneer_set_manual_speed" disabled-reasons="unsupported_target">/);
        // Полёт остаётся активным в обоих таргетах.
        expect(xml).not.toMatch(/<block type="pioneer_preflight"[^>]*disabled-reasons/);
    });

    test('в Python-тулбоксе pioneer_on_event помечен disabled-reasons', () => {
        const xml = buildPioneerToolbox('python');
        expect(xml).toMatch(/<block type="pioneer_on_event" disabled-reasons="unsupported_target">/);
        expect(xml).not.toMatch(/<block type="pioneer_set_manual_speed"[^>]*disabled-reasons/);
    });

    test('без target — обратная совместимость: ничего не отключено', () => {
        const xml = buildPioneerToolbox();
        expect(xml).not.toContain('disabled-reasons');
    });

    test('перетянутый из Lua-flyout pioneer_set_manual_speed уже отключён нужной причиной', () => {
        const workspace = makeWorkspace();
        const xml = Blockly.utils.xml.textToDom(buildPioneerToolbox('lua'));
        // Симулируем перетаскивание конкретного блока из flyout: разбираем его
        // XML напрямую в workspace, как это делает сам Blockly при drag-out.
        const blockXml = Array.from(xml.getElementsByTagName('block')).find(
            (node) => node.getAttribute('type') === 'pioneer_set_manual_speed'
        );
        expect(blockXml).toBeDefined();
        const block = Blockly.Xml.domToBlock(blockXml as Element, workspace);
        expect(block.hasDisabledReason(UNSUPPORTED_TARGET_REASON)).toBe(true);
        expect(block.isEnabled()).toBe(false);
    });
});

describe('Стекирование причин отключения: wait_in_event и unsupported_target не затирают друг друга', () => {
    test('обе причины независимы в Set и обе видны в тексте предупреждения', () => {
        const workspace = makeWorkspace();
        const block = workspace.newBlock('pioneer_wait'); // поддержан в обоих таргетах

        block.setDisabledReason(true, WAIT_IN_EVENT_REASON);
        refreshBlockWarning(block);
        expect(block.hasDisabledReason(WAIT_IN_EVENT_REASON)).toBe(true);
        expect(block.isEnabled()).toBe(false);

        // Отдельно, как это делает applyPioneerTargetToWorkspace для реально
        // неподдерживаемого блока — здесь искусственно, чтобы проверить, что
        // set/refresh не сбрасывают WAIT_IN_EVENT_REASON.
        block.setDisabledReason(true, UNSUPPORTED_TARGET_REASON);
        setUnsupportedTargetMessage(block, 'Недоступно в Python');
        refreshBlockWarning(block);

        expect(block.hasDisabledReason(WAIT_IN_EVENT_REASON)).toBe(true);
        expect(block.hasDisabledReason(UNSUPPORTED_TARGET_REASON)).toBe(true);
        expect(block.isEnabled()).toBe(false);

        // Снимаем только вторую причину — первая должна остаться как есть.
        block.setDisabledReason(false, UNSUPPORTED_TARGET_REASON);
        setUnsupportedTargetMessage(block, null);
        refreshBlockWarning(block);

        expect(block.hasDisabledReason(WAIT_IN_EVENT_REASON)).toBe(true);
        expect(block.hasDisabledReason(UNSUPPORTED_TARGET_REASON)).toBe(false);
        expect(block.isEnabled()).toBe(false);
    });

    test('applyPioneerTargetToWorkspace не снимает WAIT_IN_EVENT_REASON у блока внутри pioneer_on_event', async () => {
        const workspace = makeWorkspace();
        const onEvent = workspace.newBlock('pioneer_on_event');
        const wait = workspace.newBlock('pioneer_wait');
        wait.getInput('SECONDS')!.connection!.connect(numberBlock(workspace, 2).outputConnection!);
        onEvent.getInput('DO')!.connection!.connect(wait.previousConnection!);

        await flushBlocklyEvents();
        expect(wait.hasDisabledReason(WAIT_IN_EVENT_REASON)).toBe(true);

        // pioneer_wait поддержан в обоих таргетах, поэтому пересчёт таргета
        // не должен ставить UNSUPPORTED_TARGET_REASON — но и не должен снимать
        // WAIT_IN_EVENT_REASON, поставленный фазой 5.
        applyPioneerTargetToWorkspace(workspace, 'python');
        expect(wait.hasDisabledReason(WAIT_IN_EVENT_REASON)).toBe(true);
        expect(wait.hasDisabledReason(UNSUPPORTED_TARGET_REASON)).toBe(false);
        expect(wait.isEnabled()).toBe(false);
    });
});
