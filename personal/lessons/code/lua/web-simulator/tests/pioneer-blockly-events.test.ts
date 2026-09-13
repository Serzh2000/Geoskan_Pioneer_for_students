/**
 * pioneer_on_event (фаза 5 плана): дропдаун from-autopilot, генерация веток
 * в callback(event) ДО веток-переходов FSM (§4.3 плана, пересмотрено
 * 2026-09-13 — FSM вместо корутины, см. §2.1), и отключение блоков модели
 * ожидания (preflight/takeoff/go_to/land/wait), если их вложили внутрь
 * pioneer_on_event — там нет отдельного состояния автомата, маркер
 * __wait_event/__wait_seconds попал бы в тело callback() как есть и вызвал
 * бы несуществующую функцию.
 */
import * as Blockly from 'blockly';
import { ensureEditorBlocklyDefinitions } from '../public/modules/editor/blockly-mode/index.js';
import { compilePioneerWorkspace } from '../public/modules/editor/blockly-mode/pioneer/targets/compile.js';
import { WAIT_IN_EVENT_REASON } from '../public/modules/editor/blockly-mode/pioneer/disable-reasons.js';

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

// Blockly.Events.fire() ставит событие в очередь и обрабатывает её через
// setTimeout(fireNow, 0) (см. node_modules/blockly/core/events/utils.d.ts) —
// в headless-воркспейсе без рендеринга это единственный способ дождаться
// срабатывания setOnChange() у изменённых блоков.
async function flushBlocklyEvents(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 5));
}

describe('pioneer_on_event: генерация ветки в callback(event)', () => {
    test('ветка if event == Ev.X then ... end появляется до веток-переходов FSM', async () => {
        const workspace = makeWorkspace();
        // pioneer_preflight создаёт переход __s0 -> __s1 по Ev.ENGINES_STARTED —
        // нужен, чтобы в callback(event) вообще была ветка-переход FSM, ordering
        // которой сравниваем с веткой pioneer_on_event.
        chainUnderStart(workspace, workspace.newBlock('pioneer_preflight'));

        const onEvent = workspace.newBlock('pioneer_on_event');
        onEvent.setFieldValue('SHOCK', 'EVENT');

        const led = workspace.newBlock('pioneer_led_all');
        const colour = workspace.newBlock('pioneer_colour_preset');
        colour.setFieldValue('красный', 'PRESET');
        led.getInput('COLOUR')!.connection!.connect(colour.outputConnection!);
        onEvent.getInput('DO')!.connection!.connect(led.previousConnection!);

        await flushBlocklyEvents();

        const code = compilePioneerWorkspace(workspace, 'lua');
        expect(code).toContain('if event == Ev.SHOCK then');
        expect(code).toContain('__led_all({255, 0, 0})');

        const branchIndex = code.indexOf('if event == Ev.SHOCK then');
        const transitionIndex = code.indexOf('if __state == "__s0" and event == Ev.ENGINES_STARTED');
        expect(branchIndex).toBeGreaterThan(-1);
        expect(transitionIndex).toBeGreaterThan(branchIndex);
    });

    test('дропдаун предлагает только события "от автопилота" с русскими подписями', () => {
        const workspace = makeWorkspace();
        const onEvent = workspace.newBlock('pioneer_on_event');
        const field = onEvent.getField('EVENT') as Blockly.FieldDropdown;
        const options = field.getOptions(false) as Array<[string, string]>;
        const values = options.map(([, value]) => value);

        expect(values).toContain('POINT_REACHED');
        expect(values).toContain('SHOCK');
        // "К автопилоту" — это команды (ap.push), а не события callback(event).
        expect(values).not.toContain('MCE_TAKEOFF');
        expect(values).not.toContain('MCE_PREFLIGHT');

        const labels = options.map(([label]) => label);
        expect(labels).toContain('удар или столкновение');
    });

    test('pioneer_on_event не поддерживается в Python', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('pioneer_on_event');
        const code = compilePioneerWorkspace(workspace, 'python');
        expect(code).not.toContain('event');
    });
});

describe('pioneer_on_event: блоки ожидания внутри отключены', () => {
    test('pioneer_wait внутри DO отключается и не генерирует код', async () => {
        const workspace = makeWorkspace();
        chainUnderStart(workspace, workspace.newBlock('pioneer_preflight'));

        const onEvent = workspace.newBlock('pioneer_on_event');
        onEvent.setFieldValue('POINT_REACHED', 'EVENT');

        const wait = workspace.newBlock('pioneer_wait');
        wait.getInput('SECONDS')!.connection!.connect(numberBlock(workspace, 3.5).outputConnection!);
        onEvent.getInput('DO')!.connection!.connect(wait.previousConnection!);

        await flushBlocklyEvents();

        expect(wait.isEnabled()).toBe(false);
        expect(wait.hasDisabledReason(WAIT_IN_EVENT_REASON)).toBe(true);
        // setWarningText/getWarningText — методы BlockSvg (UI-предупреждение),
        // на headless Block (node_modules/blockly/core/block.d.ts:923) это
        // пустая заглушка без getter'а, поэтому текст здесь не проверяем.

        const code = compilePioneerWorkspace(workspace, 'lua');
        expect(code).not.toContain('__wait_seconds(3.5)');
        // Остальной пролог не пострадал — сломан (точнее, пуст) только код
        // самого отключённого блока. __wait_seconds — не настоящая функция
        // рантайма (маркер для lua-fsm.ts, см. targets/lua-fsm.ts), поэтому
        // никакого её "определения" в прологе в принципе нет — ни до, ни
        // после отключения блока.
        expect(code).toContain('local function __advance()');
        expect(code).not.toContain('__wait_seconds');
    });

    test('pioneer_go_to внутри DO тоже отключается', async () => {
        const workspace = makeWorkspace();
        const onEvent = workspace.newBlock('pioneer_on_event');
        const goTo = workspace.newBlock('pioneer_go_to');
        goTo.getInput('X')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);
        goTo.getInput('Y')!.connection!.connect(numberBlock(workspace, 0).outputConnection!);
        goTo.getInput('Z')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);
        onEvent.getInput('DO')!.connection!.connect(goTo.previousConnection!);

        await flushBlocklyEvents();

        expect(goTo.isEnabled()).toBe(false);
        const code = compilePioneerWorkspace(workspace, 'lua');
        expect(code).not.toContain('ap.goToLocalPoint(1, 0, 1)');
    });

    test('блок, не относящийся к модели ожидания (pioneer_led_all), внутри DO остаётся включён', async () => {
        const workspace = makeWorkspace();
        const onEvent = workspace.newBlock('pioneer_on_event');
        const led = workspace.newBlock('pioneer_led_all');
        const colour = workspace.newBlock('pioneer_colour_preset');
        led.getInput('COLOUR')!.connection!.connect(colour.outputConnection!);
        onEvent.getInput('DO')!.connection!.connect(led.previousConnection!);

        await flushBlocklyEvents();

        expect(led.isEnabled()).toBe(true);
    });

    test('вынос блока ожидания из DO обратно включает его', async () => {
        const workspace = makeWorkspace();
        const start = workspace.newBlock('pioneer_start');
        const onEvent = workspace.newBlock('pioneer_on_event');
        const wait = workspace.newBlock('pioneer_wait');
        wait.getInput('SECONDS')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);
        onEvent.getInput('DO')!.connection!.connect(wait.previousConnection!);

        await flushBlocklyEvents();
        expect(wait.isEnabled()).toBe(false);

        wait.unplug(true);
        start.nextConnection!.connect(wait.previousConnection!);

        await flushBlocklyEvents();

        expect(wait.isEnabled()).toBe(true);
        expect(wait.hasDisabledReason(WAIT_IN_EVENT_REASON)).toBe(false);
    });
});
