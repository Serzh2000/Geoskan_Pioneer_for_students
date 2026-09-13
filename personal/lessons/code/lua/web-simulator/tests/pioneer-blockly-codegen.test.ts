/**
 * Точечная кодогенерация для pioneer_*-блоков без модели ожидания (фаза 3
 * плана): проверяем не только "не упало", но и конкретные строки —
 * пересчёт цвета /255 в Lua, select(k, ...) для координат, индекс k-1
 * в Python и т.п. Белый список API и покрытие таргетов — в
 * tests/pioneer-blockly-contract.test.ts, здесь только точная кодогенерация.
 */
import * as Blockly from 'blockly';
import { luaGenerator } from 'blockly/lua';
import { pythonGenerator } from 'blockly/python';
import { ensureEditorBlocklyDefinitions } from '../public/modules/editor/blockly-mode/index.js';
import { compilePioneerWorkspace } from '../public/modules/editor/blockly-mode/pioneer/targets/compile.js';
import { PIONEER_LED_COUNT } from '../public/modules/editor/blockly-mode/pioneer/constants.js';

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

describe('pioneer_wait / pioneer_time', () => {
    test('pioneer_wait: Timer.callLater-переход FSM (Lua) / time.sleep (Python)', () => {
        const wsLua = makeWorkspace();
        const waitLua = wsLua.newBlock('pioneer_wait');
        waitLua.getInput('SECONDS')!.connection!.connect(numberBlock(wsLua, 2.5).outputConnection!);
        chainUnderStart(wsLua, waitLua);
        const luaCode = compilePioneerWorkspace(wsLua, 'lua');
        // __wait_seconds — не настоящая функция, а маркер для lua-fsm.ts: в
        // готовом Lua вместо неё — Timer.callLater(...) с переходом __s0 -> __s1
        // (§4.3 плана, пересмотрено 2026-09-13, см. §2.1).
        expect(luaCode).not.toContain('__wait_seconds');
        expect(luaCode).toContain('Timer.callLater(2.5, function()');
        expect(luaCode).toContain('__state = "__s1"');

        const wsPy = makeWorkspace();
        const waitPy = wsPy.newBlock('pioneer_wait');
        waitPy.getInput('SECONDS')!.connection!.connect(numberBlock(wsPy, 2.5).outputConnection!);
        chainUnderStart(wsPy, waitPy);
        expect(compilePioneerWorkspace(wsPy, 'python')).toContain('time.sleep(2.5)');
    });

    test('pioneer_time: (time() - __t0) / (time.time() - _pioneer_t0)', () => {
        const wsLua = makeWorkspace();
        wsLua.newBlock('pioneer_time');
        expect(luaGenerator.workspaceToCode(wsLua)).toContain('(time() - __t0)');

        const wsPy = makeWorkspace();
        wsPy.newBlock('pioneer_time');
        expect(pythonGenerator.workspaceToCode(wsPy)).toContain('(time.time() - _pioneer_t0)');
    });
});

describe('pioneer_colour_preset / pioneer_colour_rgb', () => {
    test('pioneer_colour_preset: {r, g, b} в Lua, (r, g, b) в Python', () => {
        const wsLua = makeWorkspace();
        const presetLua = wsLua.newBlock('pioneer_colour_preset');
        presetLua.setFieldValue('красный', 'PRESET');
        expect(luaGenerator.workspaceToCode(wsLua)).toContain('{255, 0, 0}');

        const wsPy = makeWorkspace();
        const presetPy = wsPy.newBlock('pioneer_colour_preset');
        presetPy.setFieldValue('синий', 'PRESET');
        expect(pythonGenerator.workspaceToCode(wsPy)).toContain('(0, 0, 255)');
    });

    test('pioneer_colour_rgb принимает подключённые компоненты', () => {
        const wsLua = makeWorkspace();
        const rgbLua = wsLua.newBlock('pioneer_colour_rgb');
        rgbLua.getInput('R')!.connection!.connect(numberBlock(wsLua, 10).outputConnection!);
        rgbLua.getInput('G')!.connection!.connect(numberBlock(wsLua, 20).outputConnection!);
        rgbLua.getInput('B')!.connection!.connect(numberBlock(wsLua, 30).outputConnection!);
        expect(luaGenerator.workspaceToCode(wsLua)).toContain('{10, 20, 30}');
    });
});

describe('pioneer_led_all / pioneer_led_index', () => {
    test('Lua: Ledbar.new(PIONEER_LED_COUNT) и пересчёт цвета /255 через __led_set', () => {
        const ws = makeWorkspace();
        const led = ws.newBlock('pioneer_led_all');
        const colour = ws.newBlock('pioneer_colour_preset');
        colour.setFieldValue('зелёный', 'PRESET');
        led.getInput('COLOUR')!.connection!.connect(colour.outputConnection!);
        chainUnderStart(ws, led);

        const code = compilePioneerWorkspace(ws, 'lua');
        expect(code).toContain(`Ledbar.new(${PIONEER_LED_COUNT})`);
        expect(code).toContain('leds:set(i, c[1] / 255, c[2] / 255, c[3] / 255)');
        expect(code).toContain('__led_all({0, 255, 0})');
    });

    test('Python: led_control через _pioneer_led, индекс светодиода без сдвига', () => {
        const ws = makeWorkspace();
        const led = ws.newBlock('pioneer_led_index');
        led.getInput('INDEX')!.connection!.connect(numberBlock(ws, 3).outputConnection!);
        const colour = ws.newBlock('pioneer_colour_preset');
        colour.setFieldValue('белый', 'PRESET');
        led.getInput('COLOUR')!.connection!.connect(colour.outputConnection!);
        chainUnderStart(ws, led);

        const code = compilePioneerWorkspace(ws, 'python');
        expect(code).toContain('def _pioneer_led(led_id, c):');
        expect(code).toContain('pioneer.led_control(led_id=led_id, r=c[0], g=c[1], b=c[2])');
        expect(code).toContain('_pioneer_led(3, (255, 255, 255))');
    });
});

describe('pioneer_position / pioneer_distance / pioneer_battery', () => {
    test('Lua: select(k, Sensors.lpsPosition()) с k=1..3 по X/Y/Z', () => {
        const wsX = makeWorkspace();
        const posX = wsX.newBlock('pioneer_position');
        posX.setFieldValue('X', 'AXIS');
        expect(luaGenerator.workspaceToCode(wsX)).toContain('(select(1, Sensors.lpsPosition()))');

        const wsZ = makeWorkspace();
        const posZ = wsZ.newBlock('pioneer_position');
        posZ.setFieldValue('Z', 'AXIS');
        expect(luaGenerator.workspaceToCode(wsZ)).toContain('(select(3, Sensors.lpsPosition()))');
    });

    test('Python: _pioneer_position(k-1) — индекс с нуля, а не с единицы', () => {
        const wsY = makeWorkspace();
        const posY = wsY.newBlock('pioneer_position');
        posY.setFieldValue('Y', 'AXIS');
        const code = pythonGenerator.workspaceToCode(wsY);
        expect(code).toContain('_pioneer_position(1)');
        expect(code).toContain('def _pioneer_position(index):');
        expect(code).toContain("raise RuntimeError('Нет данных о координатах дрона')");
    });

    test('pioneer_distance / pioneer_battery', () => {
        const wsLua = makeWorkspace();
        wsLua.newBlock('pioneer_distance');
        expect(luaGenerator.workspaceToCode(wsLua)).toContain('Sensors.range()');

        const wsPy = makeWorkspace();
        wsPy.newBlock('pioneer_battery');
        expect(pythonGenerator.workspaceToCode(wsPy)).toContain('pioneer.get_battery_status()');
    });
});

describe('compilePioneerWorkspace: пролог для пустого pioneer_start', () => {
    test('Lua: FSM-таблица состояний, __advance, маркер версии, без корутин', () => {
        const ws = makeWorkspace();
        ws.newBlock('pioneer_start');
        const code = compilePioneerWorkspace(ws, 'lua');

        expect(code.startsWith('-- @pioneer-blockly v1')).toBe(true);
        expect(code).toContain('local action = {}');
        expect(code).toContain('action["__s0"] = function()');
        expect(code).toContain('local function __advance()');
        expect(code).toContain('function callback(event)');
        expect(code).not.toContain('coroutine');
    });

    test('Python: Pioneer(simulator=True), close_connection в конце, без хелперов для пустой программы', () => {
        const ws = makeWorkspace();
        ws.newBlock('pioneer_start');
        const code = compilePioneerWorkspace(ws, 'python');

        expect(code.startsWith('# @pioneer-blockly v1')).toBe(true);
        expect(code).toContain('pioneer = Pioneer(simulator=True)');
        expect(code.trimEnd().endsWith('pioneer.close_connection()')).toBe(true);

        // [пересмотрено 2026-09-14, см. §4.4 плана] Пустая программа без
        // блоков полёта/времени/поворота не должна тащить за собой ни один
        // из условных хелперов — раньше все они были в фиксированном прологе.
        expect(code).not.toContain('_pioneer_wait');
        expect(code).not.toContain('_pioneer_t0');
        expect(code).not.toContain('import math');
    });
});

describe('pioneer_preflight / pioneer_takeoff / pioneer_land: общий _pioneer_wait только при использовании', () => {
    test('Python: одна общая def _pioneer_wait(...), инлайн-условия вместо именованных обёрток', () => {
        const ws = makeWorkspace();
        const preflight = ws.newBlock('pioneer_preflight');
        const takeoff = ws.newBlock('pioneer_takeoff');
        const land = ws.newBlock('pioneer_land');
        chainUnderStart(ws, preflight, takeoff, land);

        const code = compilePioneerWorkspace(ws, 'python');
        expect(code.match(/def _pioneer_wait\(condition, timeout, message\):/g)).toHaveLength(1);
        expect(code).not.toContain('_pioneer_wait_armed');
        expect(code).not.toContain('_pioneer_wait_takeoff');
        expect(code).not.toContain('_pioneer_wait_landed');
        expect(code).toContain(
            "pioneer.arm()\n_pioneer_wait(lambda: pioneer.get_autopilot_state() == 'ARMED', 15, 'Моторы не запустились за 15 секунд')"
        );
        expect(code).toContain(
            "pioneer.takeoff()\n_pioneer_wait(lambda: pioneer.get_autopilot_state() == 'MISSION', 30, 'Дрон не взлетел за 30 секунд')"
        );
        expect(code).toContain(
            "pioneer.land()\n_pioneer_wait(lambda: pioneer.get_autopilot_state() == 'DISARMED', 30, 'Дрон не приземлился за 30 секунд')"
        );
        // Ни один из этих трёх блоков не использует math.
        expect(code).not.toContain('import math');
    });

    test('Python: pioneer_go_to переиспользует общий _pioneer_wait для point_reached', () => {
        const ws = makeWorkspace();
        const goTo = ws.newBlock('pioneer_go_to');
        goTo.getInput('X')!.connection!.connect(numberBlock(ws, 1).outputConnection!);
        goTo.getInput('Y')!.connection!.connect(numberBlock(ws, 0).outputConnection!);
        goTo.getInput('Z')!.connection!.connect(numberBlock(ws, 1).outputConnection!);
        chainUnderStart(ws, goTo);

        const code = compilePioneerWorkspace(ws, 'python');
        expect(code.match(/def _pioneer_wait\(condition, timeout, message\):/g)).toHaveLength(1);
        expect(code).toContain(
            "pioneer.go_to_local_point(x=1, y=0, z=1)\n_pioneer_wait(pioneer.point_reached, 60, 'Дрон не долетел до точки за 60 секунд')"
        );
    });

    test('Python: pioneer_set_yaw добавляет import math один раз и переиспользует _pioneer_wait', () => {
        const ws = makeWorkspace();
        const setYaw = ws.newBlock('pioneer_set_yaw');
        setYaw.getInput('ANGLE')!.connection!.connect(numberBlock(ws, 90).outputConnection!);
        chainUnderStart(ws, setYaw);

        const code = compilePioneerWorkspace(ws, 'python');
        expect(code.match(/^import math$/m)).toHaveLength(1);
        expect(code.match(/def _pioneer_wait\(condition, timeout, message\):/g)).toHaveLength(1);
        expect(code).toContain('def _pioneer_set_yaw(yaw):');
        expect(code).toContain("_pioneer_wait(pioneer.point_reached, 60, 'Дрон не долетел до точки за 60 секунд')");
        expect(code).toContain('_pioneer_set_yaw(math.radians(90))');
    });

    test('Python: _pioneer_t0 добавляется, только когда используется pioneer_time', () => {
        const wsWithout = makeWorkspace();
        wsWithout.newBlock('pioneer_start');
        expect(compilePioneerWorkspace(wsWithout, 'python')).not.toContain('_pioneer_t0');

        const wsWith = makeWorkspace();
        const timeBlock = wsWith.newBlock('pioneer_time');
        const wait = wsWith.newBlock('pioneer_wait');
        wait.getInput('SECONDS')!.connection!.connect(timeBlock.outputConnection!);
        chainUnderStart(wsWith, wait);

        const code = compilePioneerWorkspace(wsWith, 'python');
        expect(code).toContain('_pioneer_t0 = time.time()');
        expect(code).toContain('time.sleep((time.time() - _pioneer_t0))');
    });
});
