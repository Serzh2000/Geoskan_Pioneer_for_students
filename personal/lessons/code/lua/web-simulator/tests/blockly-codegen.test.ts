/**
 * Headless-тесты Blockly-компонента: инвентаризация тулбокса, кодогенерация
 * Lua/Python и проверки совместимости типов при соединении блоков.
 *
 * Запускаются без DOM: new Blockly.Workspace() + workspaceToCode.
 */
import * as Blockly from 'blockly';
import { luaGenerator } from 'blockly/lua';
import { pythonGenerator } from 'blockly/python';

import type { ApiDoc } from '../public/modules/docs/api-docs.js';
import { evConstants } from '../public/modules/docs/api-docs-events.js';
import { luaApiDocsEvents } from '../public/modules/docs/lua-api-docs-events.js';
import {
    buildMainEditorToolbox,
    compileMainEditorWorkspace,
    ensureEditorBlocklyDefinitions
} from '../public/modules/editor/blockly-mode/index.js';
import { createStarterWorkspaceXml } from '../public/modules/editor/blockly-mode/workspace.js';
import { ALL_LUA_BLOCK_TYPES } from '../public/modules/editor/blockly-mode/lua-definitions.js';

function makeWorkspace(): Blockly.Workspace {
    return new Blockly.Workspace();
}

function numberBlock(workspace: Blockly.Workspace, value: number): Blockly.Block {
    const block = workspace.newBlock('math_number');
    block.setFieldValue(String(value), 'NUM');
    return block;
}

function toolboxBlockTypes(xml: string): string[] {
    return Array.from(xml.matchAll(/<block type="([^"]+)"/g)).map((match) => match[1]);
}

function dropdownOptions(block: Blockly.Block, fieldName: string): string[] {
    const field = block.getField(fieldName) as unknown as { getOptions: () => Array<[string, string]> };
    return field.getOptions().map(([, value]) => value);
}

const adaptedPythonBlockTypes = [
    'preflight', 'take_off', 'go_local_point', 'go_local_point_body_fixed', 'set_manual_speed',
    'not_point_reached', 'landing', 'engines_disarm', 'close_connection', 'get_local_position_lps',
    'get_local_position_component', 'get_dist_sensor_data', 'get_battery_status', 'get_autopilot_state',
    'led_all', 'led_index', 'send_rc_channels', 'lua_script_control', 'camera_connect',
    'camera_disconnect', 'camera_connected', 'camera_get_frame', 'cam_get_cv_frame',
    'video_stream_start', 'video_stream_stop', 'video_stream_connected', 'sleep', 'get_time'
];

beforeAll(() => {
    ensureEditorBlocklyDefinitions();
});

describe('Инвентаризация тулбокса редактора', () => {
    test('все блоки тулбокса зарегистрированы в Blockly.Blocks', () => {
        for (const language of ['lua', 'python'] as const) {
            const types = toolboxBlockTypes(buildMainEditorToolbox(language));
            expect(types.length).toBeGreaterThan(10);
            for (const type of new Set(types)) {
                expect(Blockly.Blocks[type]).toBeDefined();
            }
        }
    });

    test('учебные блоки попадают в тулбокс своего языка и отсутствуют в чужом', () => {
        const luaXml = buildMainEditorToolbox('lua');
        const pythonXml = buildMainEditorToolbox('python');

        expect(luaXml).toContain('lua_ap_push');
        expect(luaXml).not.toContain('py_arm');
        expect(pythonXml).toContain('preflight');
        expect(pythonXml).not.toContain('py_arm');
        expect(pythonXml).not.toContain('lua_ap_push');

        // Категория сенсоров — только для Python; «Списки» — для обоих языков.
        expect(pythonXml).toContain('Сенсоры и координаты');
        expect(luaXml).not.toContain('Сенсоры и данные');
        expect(luaXml).toContain('Списки');
        expect(pythonXml).toContain('Списки');
    });

    test('учебные блоки не перезаписаны деградированными версиями', () => {
        const workspace = makeWorkspace();

        const push = workspace.newBlock('lua_ap_push');
        expect(push.getField('EVENT')).not.toBeNull();

        const callback = workspace.newBlock('lua_event_callback');
        expect(callback.getInput('DO')).not.toBeNull();

        const timer = workspace.newBlock('lua_timer_calllater');
        expect(timer.getField('DELAY')).not.toBeNull();
        expect(timer.getInput('CALLBACK')).not.toBeNull();
    });

    test('дропдауны событий совпадают с API-документацией', () => {
        const workspace = makeWorkspace();

        const toKeys = Object.entries(luaApiDocsEvents)
            .filter(([, doc]) => doc.direction === 'to-autopilot')
            .map(([key]) => key);
        const pushOptions = dropdownOptions(workspace.newBlock('lua_ap_push'), 'EVENT');
        expect([...pushOptions].sort()).toEqual([...toKeys].sort());

        const fromKeys = Object.entries(luaApiDocsEvents)
            .filter(([, doc]) => doc.direction === 'from-autopilot')
            .map(([key]) => key);
        const callbackOptions = dropdownOptions(workspace.newBlock('lua_event_callback'), 'EVENT');
        expect([...callbackOptions].sort()).toEqual([...fromKeys].sort());
    });

    test('evConstants покрывает все документированные события без дубликатов', () => {
        expect(new Set(evConstants).size).toBe(evConstants.length);
        for (const key of Object.keys(luaApiDocsEvents)) {
            expect(evConstants).toContain(key.replace(/^Ev\./, ''));
        }
    });

    test('lua_event_constant возвращает Number', () => {
        const constant = makeWorkspace().newBlock('lua_event_constant');
        expect(constant.outputConnection?.getCheck()).toEqual(['Number']);
    });
});

describe('Регистрация Lua-блоков (lua-definitions.ts)', () => {
    test('ALL_LUA_BLOCK_TYPES содержит все типы блоков', () => {
        expect(ALL_LUA_BLOCK_TYPES.length).toBeGreaterThan(40);
        for (const type of ALL_LUA_BLOCK_TYPES) {
            expect(Blockly.Blocks[type]).toBeDefined();
        }
    });

    test('каждый Lua-блок имеет генератор в luaGenerator.forBlock', () => {
        for (const type of ALL_LUA_BLOCK_TYPES) {
            expect(luaGenerator.forBlock[type]).toBeDefined();
        }
    });

    test('полётные блоки зарегистрированы с правильным цветом (290)', () => {
        const flightBlocks = [
            'lua_go_to_local_point', 'lua_takeoff', 'lua_landing', 'lua_preflight',
            'lua_engines_disarm', 'lua_update_yaw', 'lua_set_manual_speed'
        ];
        const expectedColour = Blockly.utils.colour.hueToHex(290);
        for (const type of flightBlocks) {
            const block = Blockly.Blocks[type];
            expect(block).toBeDefined();
            // Цвет хранится как protected `colour_`; публичный доступ — только через getColour().
            const ws = makeWorkspace();
            const b = ws.newBlock(type);
            expect(b.getColour()).toBe(expectedColour);
        }
    });

    test('value-блоки имеют правильные типы выходов', () => {
        const ws = makeWorkspace();
        const dist = ws.newBlock('lua_get_dist_sensor_data');
        expect(dist.outputConnection?.getCheck()).toEqual(['Number']);

        const pos = ws.newBlock('lua_get_local_position');
        expect(pos.outputConnection?.getCheck()).toEqual(['Array']);

        const time = ws.newBlock('lua_get_time');
        expect(time.outputConnection?.getCheck()).toEqual(['Number']);

        const batt = ws.newBlock('lua_get_battery');
        expect(batt.outputConnection?.getCheck()).toEqual(['Number']);
    });

    test('boolean value-блоки (точка достигнута/не достигнута)', () => {
        const ws = makeWorkspace();
        const reached = ws.newBlock('lua_point_reached');
        expect(reached.outputConnection?.getCheck()).toEqual(['Boolean']);

        const notReached = ws.newBlock('lua_not_point_reached');
        expect(notReached.outputConnection?.getCheck()).toEqual(['Boolean']);
    });
});

describe('Кодогенерация Lua', () => {
    test('lua_ap_push генерирует ap.push с событием из документации', () => {
        const workspace = makeWorkspace();
        const push = workspace.newBlock('lua_ap_push');
        const eventKey = Object.entries(luaApiDocsEvents)
            .find(([, doc]) => doc.direction === 'to-autopilot')?.[0];
        expect(eventKey).toBeTruthy();
        push.setFieldValue(eventKey!, 'EVENT');
        expect(luaGenerator.workspaceToCode(workspace)).toBe(`ap.push(${eventKey})\n`);
    });

    test('lua_timer_calllater оборачивает вложенные блоки в Timer.callLater', () => {
        const workspace = makeWorkspace();
        const timer = workspace.newBlock('lua_timer_calllater');
        timer.setFieldValue(0.5, 'DELAY');

        const push = workspace.newBlock('lua_ap_push');
        push.setFieldValue('Ev.MCE_TAKEOFF', 'EVENT');
        timer.getInput('CALLBACK')!.connection!.connect(push.previousConnection!);

        const code = luaGenerator.workspaceToCode(workspace);
        expect(code).toContain('Timer.callLater(0.5, function()');
        expect(code).toContain('ap.push(Ev.MCE_TAKEOFF)');
        expect(code.trimEnd().endsWith('end)')).toBe(true);
    });

    test('lua_event_callback генерирует if event == ... then ... end', () => {
        const workspace = makeWorkspace();
        const callback = workspace.newBlock('lua_event_callback');
        const eventKey = Object.entries(luaApiDocsEvents)
            .find(([, doc]) => doc.direction === 'from-autopilot')?.[0];
        expect(eventKey).toBeTruthy();
        callback.setFieldValue(eventKey!, 'EVENT');

        const code = luaGenerator.workspaceToCode(workspace);
        expect(code).toContain(`if event == ${eventKey} then`);
        expect(code.trimEnd().endsWith('end')).toBe(true);
    });

    test('lua_print цитирует текст и не цитирует переменные', () => {
        const textWorkspace = makeWorkspace();
        const printText = textWorkspace.newBlock('lua_print');
        printText.setFieldValue('Привет', 'TEXT');
        expect(luaGenerator.workspaceToCode(textWorkspace)).toContain('print("Привет")');

        const valueWorkspace = makeWorkspace();
        const printValue = valueWorkspace.newBlock('lua_print');
        const variable = valueWorkspace.newBlock('lua_variables_get');
        printValue.getInput('VALUE')!.connection!.connect(variable.outputConnection!);
        expect(luaGenerator.workspaceToCode(valueWorkspace)).toContain('print(my_variable)');
    });

    test('lua_go_to_local_point генерирует ap.goToLocalPoint с координатами по умолчанию', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('lua_go_to_local_point');
        expect(luaGenerator.workspaceToCode(workspace)).toContain('ap.goToLocalPoint(0, 0, 0)');
    });

    test('lua_go_to_local_point с подключёнными координатами', () => {
        const ws = makeWorkspace();
        const goTo = ws.newBlock('lua_go_to_local_point');
        const xBlock = numberBlock(ws, 5);
        const zBlock = numberBlock(ws, 10);
        goTo.getInput('X')!.connection!.connect(xBlock.outputConnection!);
        goTo.getInput('Z')!.connection!.connect(zBlock.outputConnection!);
        expect(luaGenerator.workspaceToCode(ws)).toContain('ap.goToLocalPoint(5, 0, 10)');
    });

    test('lua_preflight, lua_takeoff, lua_landing, lua_engines_disarm генерируют ap.push', () => {
        const ws = makeWorkspace();
        const pre = ws.newBlock('lua_preflight');
        const takeoff = ws.newBlock('lua_takeoff');
        const land = ws.newBlock('lua_landing');
        const disarm = ws.newBlock('lua_engines_disarm');
        pre.nextConnection!.connect(takeoff.previousConnection!);
        takeoff.nextConnection!.connect(land.previousConnection!);
        land.nextConnection!.connect(disarm.previousConnection!);

        const code = luaGenerator.workspaceToCode(ws);
        expect(code).toContain('ap.push(Ev.MCE_PREFLIGHT)');
        expect(code).toContain('ap.push(Ev.MCE_TAKEOFF)');
        expect(code).toContain('ap.push(Ev.MCE_LANDING)');
        expect(code).toContain('ap.push(Ev.ENGINES_DISARM)');
    });

    test('lua_waiting_for_point генерирует while not ap.point_reached() do', () => {
        const ws = makeWorkspace();
        ws.newBlock('lua_waiting_for_point');
        const code = luaGenerator.workspaceToCode(ws);
        expect(code).toContain('while not ap.point_reached() do');
        expect(code).toContain('task.wait(0.1)');
        expect(code.trimEnd().endsWith('end')).toBe(true);
    });

    test('lua_point_reached и lua_not_point_reached генерируют ap.point_reached()', () => {
        const ws = makeWorkspace();
        const reached = ws.newBlock('lua_point_reached');
        // Blockly оборачивает "голый" (не подключённый никуда) value-блок на верхнем
        // уровне через scrubNakedValue: 'local _ = <expr>\n' — это поведение самой
        // библиотеки, не блока.
        expect(luaGenerator.workspaceToCode(ws)).toBe('local _ = ap.point_reached()\n');
    });

    test('lua_update_yaw генерирует ap.updateYaw', () => {
        const ws = makeWorkspace();
        const yaw = ws.newBlock('lua_update_yaw');
        yaw.getInput('YAW')!.connection!.connect(numberBlock(ws, 1.5).outputConnection!);
        expect(luaGenerator.workspaceToCode(ws)).toBe('ap.updateYaw(1.5)\n');
    });

    test('lua_sleep генерирует sleep(секунды)', () => {
        const ws = makeWorkspace();
        const sl = ws.newBlock('lua_sleep');
        sl.getInput('NAME')!.connection!.connect(numberBlock(ws, 2.5).outputConnection!);
        expect(luaGenerator.workspaceToCode(ws)).toBe('sleep(2.5)\n');
    });

    test('lua_get_time генерирует time()', () => {
        const ws = makeWorkspace();
        ws.newBlock('lua_get_time');
        // luaGenerator не добавляет \n для value-блоков
        const code = luaGenerator.workspaceToCode(ws);
        expect(code).toContain('time()');
    });

    test('lua_get_dist_sensor_data генерирует Sensors.range()', () => {
        const ws = makeWorkspace();
        ws.newBlock('lua_get_dist_sensor_data');
        const code = luaGenerator.workspaceToCode(ws);
        expect(code).toContain('Sensors.range()');
    });

    test('lua_get_local_position генерирует Sensors.lpsPosition()', () => {
        const ws = makeWorkspace();
        ws.newBlock('lua_get_local_position');
        const code = luaGenerator.workspaceToCode(ws);
        expect(code).toContain('Sensors.lpsPosition()');
    });

    test('lua_get_local_velocity генерирует Sensors.lpsVelocity()', () => {
        const ws = makeWorkspace();
        ws.newBlock('lua_get_local_velocity');
        const code = luaGenerator.workspaceToCode(ws);
        expect(code).toContain('Sensors.lpsVelocity()');
    });

    test('lua_get_pv_by_index генерирует доступ по индексу', () => {
        const ws = makeWorkspace();
        const pv = ws.newBlock('lua_get_pv_by_index');
        pv.setFieldValue('1', 'INDEX');
        const pos = ws.newBlock('lua_get_local_position');
        pv.getInput('POS_OR_VEL')!.connection!.connect(pos.outputConnection!);
        const code = luaGenerator.workspaceToCode(ws);
        expect(code).toContain('Sensors.lpsPosition()[1]');
    });

    test('lua_get_battery генерирует Sensors.battery()', () => {
        const ws = makeWorkspace();
        ws.newBlock('lua_get_battery');
        const code = luaGenerator.workspaceToCode(ws);
        expect(code).toContain('Sensors.battery()');
    });

    test('lua_ledbar_new и lua_led_set генерируют корректный код', () => {
        const ws = makeWorkspace();
        const ledbar = ws.newBlock('lua_ledbar_new');
        ledbar.getInput('COUNT')!.connection!.connect(numberBlock(ws, 5).outputConnection!);
        const set = ws.newBlock('lua_led_set');
        set.getInput('INDEX')!.connection!.connect(numberBlock(ws, 0).outputConnection!);
        set.getInput('R')!.connection!.connect(numberBlock(ws, 1).outputConnection!);
        set.getInput('G')!.connection!.connect(numberBlock(ws, 0).outputConnection!);
        set.getInput('B')!.connection!.connect(numberBlock(ws, 0).outputConnection!);
        ledbar.nextConnection!.connect(set.previousConnection!);
        const code = luaGenerator.workspaceToCode(ws);
        expect(code).toContain('local leds = Ledbar.new(5)');
        expect(code).toContain('leds:set(0, 1, 0, 0)');
    });

    // Тест lua_led_control удалён вместе с самим блоком
    // (заменён учебными блоками lua_ledbar_new и lua_led_set).

    test('lua_callback_open и lua_callback_end создают обработчик автопилота', () => {
        const workspace = makeWorkspace();
        const open = workspace.newBlock('lua_callback_open');
        const close = workspace.newBlock('lua_callback_end');
        open.nextConnection!.connect(close.previousConnection!);
        const code = luaGenerator.workspaceToCode(workspace);
        expect(code).toBe('function callback(event)\nend\n');
    });

    test('lua-callback-stub (deprecated) генерирует пустую строку', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('lua-callback-stub');
        expect(luaGenerator.workspaceToCode(workspace)).toBe('');
    });

    test('lua_variables_set присваивает значение переменной', () => {
        const workspace = makeWorkspace();
        const set = workspace.newBlock('lua_variables_set');
        const num = workspace.newBlock('math_number');
        num.setFieldValue(42, 'NUM');
        set.getInput('VALUE')!.connection!.connect(num.outputConnection!);
        expect(luaGenerator.workspaceToCode(workspace)).toBe('my_variable = 42\n');
    });

    test('lua_variables_get возвращает имя переменной', () => {
        const workspace = makeWorkspace();
        const get = workspace.newBlock('lua_variables_get');
        // "Голый" value-блок на верхнем уровне Blockly оборачивает как 'local _ = <expr>'.
        expect(luaGenerator.workspaceToCode(workspace)).toBe('local _ = my_variable\n');
    });

    test('цепочка LED-блоков генерирует корректный Lua-код', () => {
        const workspace = makeWorkspace();
        const ledbar = workspace.newBlock('lua_ledbar_new');
        ledbar.getInput('COUNT')!.connection!.connect(numberBlock(workspace, 3).outputConnection!);
        const set1 = workspace.newBlock('lua_led_set');
        set1.getInput('INDEX')!.connection!.connect(numberBlock(workspace, 0).outputConnection!);
        set1.getInput('R')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);
        set1.getInput('G')!.connection!.connect(numberBlock(workspace, 0).outputConnection!);
        set1.getInput('B')!.connection!.connect(numberBlock(workspace, 0).outputConnection!);
        const set2 = workspace.newBlock('lua_led_set');
        set2.getInput('INDEX')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);
        set2.getInput('R')!.connection!.connect(numberBlock(workspace, 0).outputConnection!);
        set2.getInput('G')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);
        set2.getInput('B')!.connection!.connect(numberBlock(workspace, 0).outputConnection!);
        ledbar.nextConnection!.connect(set1.previousConnection!);
        set1.nextConnection!.connect(set2.previousConnection!);
        const code = luaGenerator.workspaceToCode(workspace);
        expect(code).toContain('local leds = Ledbar.new(3)');
        expect(code).toContain('leds:set(0, 1, 0, 0)');
        expect(code).toContain('leds:set(1, 0, 1, 0)');
    });

    test('стартовый workspace Lua загружается из XML и компилируется', () => {
        const workspace = makeWorkspace();
        const dom = Blockly.utils.xml.textToDom(createStarterWorkspaceXml('lua')) as Element;
        Blockly.Xml.domToWorkspace(dom, workspace);
        expect(workspace.getTopBlocks(false).length).toBe(1);

        const code = compileMainEditorWorkspace('lua', workspace as unknown as Blockly.WorkspaceSvg);
        expect(code).toContain('ap.push(Ev.MCE_PREFLIGHT)');
        expect(code).toContain('function callback(event)');
        expect(code).toContain('if event == Ev.ENGINES_STARTED then');
        expect(code).toContain('ap.push(Ev.MCE_TAKEOFF)');
        expect(code.trimEnd().endsWith('end')).toBe(true);
    });
});

describe('Кодогенерация Python', () => {
    test('базовые команды генерируют вызовы pioneer', () => {
        const workspace = makeWorkspace();
        const arm = workspace.newBlock('py_arm');
        const wait = workspace.newBlock('py_wait_point_reached');
        const goTo = workspace.newBlock('py_goto_local_point');
        const sleep = workspace.newBlock('py_time_sleep');
        arm.nextConnection!.connect(wait.previousConnection!);
        wait.nextConnection!.connect(goTo.previousConnection!);
        goTo.nextConnection!.connect(sleep.previousConnection!);

        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.arm()');
        expect(code).toContain('while not pioneer.point_reached():');
        expect(code).toContain('pioneer.go_to_local_point(x=1, y=0, z=1, yaw=0)');
        expect(code).toContain('time.sleep(1)');
    });

    test('py_variables_set присваивает значение сенсора', () => {
        const workspace = makeWorkspace();
        const set = workspace.newBlock('py_variables_set');
        const battery = workspace.newBlock('py_get_battery');
        set.getInput('VALUE')!.connection!.connect(battery.outputConnection!);
        expect(pythonGenerator.workspaceToCode(workspace))
            .toContain('my_variable = pioneer.get_battery_status()');
    });

    test('py_goto_local_point принимает value-розетки X/Y/Z/yaw', () => {
        const workspace = makeWorkspace();
        const goTo = workspace.newBlock('py_goto_local_point');

        // Розетки типизированы как Number.
        for (const inputName of ['X', 'Y', 'Z', 'YAW']) {
            expect(goTo.getInput(inputName)?.connection?.getCheck()).toEqual(['Number']);
        }

        // Без подключения используются значения по умолчанию.
        const defaultsWorkspace = makeWorkspace();
        defaultsWorkspace.newBlock('py_goto_local_point');
        expect(pythonGenerator.workspaceToCode(defaultsWorkspace))
            .toContain('pioneer.go_to_local_point(x=1, y=0, z=1, yaw=0)');

        // Подключённое число попадает в нужную координату.
        const numberWorkspace = makeWorkspace();
        const numberGoTo = numberWorkspace.newBlock('py_goto_local_point');
        numberGoTo.getInput('Z')!.connection!.connect(numberBlock(numberWorkspace, 2).outputConnection!);
        expect(pythonGenerator.workspaceToCode(numberWorkspace))
            .toContain('pioneer.go_to_local_point(x=1, y=0, z=2, yaw=0)');
    });

    test('py_point_reached и py_get_time — value-блоки с типами', () => {
        const workspace = makeWorkspace();
        const reached = workspace.newBlock('py_point_reached');
        expect(reached.outputConnection?.getCheck()).toEqual(['Boolean']);

        const reachedWorkspace = makeWorkspace();
        const reachedSet = reachedWorkspace.newBlock('py_variables_set');
        const reachedValue = reachedWorkspace.newBlock('py_point_reached');
        reachedSet.getInput('VALUE')!.connection!.connect(reachedValue.outputConnection!);
        expect(pythonGenerator.workspaceToCode(reachedWorkspace))
            .toContain('my_variable = pioneer.point_reached()');

        const timeWorkspace = makeWorkspace();
        const timeSet = timeWorkspace.newBlock('py_variables_set');
        const timeValue = timeWorkspace.newBlock('py_get_time');
        timeSet.getInput('VALUE')!.connection!.connect(timeValue.outputConnection!);
        expect(pythonGenerator.workspaceToCode(timeWorkspace))
            .toContain('my_variable = time.time()');
    });

    test('адаптированные блоки pioneer-sdk генерируют команды из справочника API', () => {
        const workspace = makeWorkspace();
        const goTo = workspace.newBlock('go_local_point');
        for (const inputName of ['X', 'Y', 'Z', 'YAW']) {
            expect(goTo.getInput(inputName)?.connection?.getCheck()).toEqual(['Number']);
        }
        expect(goTo.getInput('TIME')).toBeNull();
        expect(goTo.inputsInline).toBe(true);
        expect(pythonGenerator.workspaceToCode(workspace)).toContain('pioneer.go_to_local_point(x=0, y=0, z=0, yaw=0)');

        const flightWs = makeWorkspace();
        const pre = flightWs.newBlock('preflight');
        const takeoff = flightWs.newBlock('take_off');
        const wait = flightWs.newBlock('waiting_for_point');
        const land = flightWs.newBlock('landing');
        const disarm = flightWs.newBlock('engines_disarm');
        pre.nextConnection!.connect(takeoff.previousConnection!);
        takeoff.nextConnection!.connect(wait.previousConnection!);
        wait.nextConnection!.connect(land.previousConnection!);
        land.nextConnection!.connect(disarm.previousConnection!);

        const flightCode = pythonGenerator.workspaceToCode(flightWs);
        expect(flightCode).toContain('pioneer.arm()');
        expect(flightCode).toContain('pioneer.takeoff()');
        expect(flightCode).toContain('while not pioneer.point_reached():\n    time.sleep(0.05)');
        expect(flightCode).toContain('pioneer.land()');
        expect(flightCode).toContain('pioneer.disarm()');

        const sensorsWs = makeWorkspace();
        const dist = sensorsWs.newBlock('get_dist_sensor_data');
        expect(dist.outputConnection?.getCheck()).toEqual(['Number']);
        const notReached = sensorsWs.newBlock('not_point_reached');
        expect(notReached.outputConnection?.getCheck()).toEqual(['Boolean']);
    });

    test('тулбокс содержит отдельные блоки реального pioneer-sdk и нормальный блок высоты', () => {
        const types = toolboxBlockTypes(buildMainEditorToolbox('python'));
        for (const type of adaptedPythonBlockTypes) expect(types).toContain(type);
        for (const unsupported of ['get_ranger_data', 'servo_set_angle', 'ai_model_init', 'get_global_position_gps']) {
            expect(types).not.toContain(unsupported);
        }

        const workspace = makeWorkspace();
        const component = workspace.newBlock('get_local_position_component');
        expect((component.getField('INDEX') as Blockly.FieldDropdown).getOptions().map(([label]) => label)).toContain('высоту Z');
        expect(component.getInput('POSITION_DATA')?.connection?.getCheck()).toEqual(['Point3D']);
        expect(component.outputConnection?.getCheck()).toEqual(['Number']);
    });

    test('компиляция Python добавляет обвязку pioneer_sdk', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('py_arm');

        const code = compileMainEditorWorkspace('python', workspace as unknown as Blockly.WorkspaceSvg);
        expect(code).toContain('from pioneer_sdk import Pioneer');
        expect(code).toContain('pioneer = Pioneer(simulator=True)');
        expect(code).toContain('pioneer.arm()');
        expect(code.trimEnd().endsWith('pioneer.close_connection()')).toBe(true);
    });

    test('блок ожидания генерирует определенное имя time.sleep', () => {
        const workspace = makeWorkspace();
        const sleep = workspace.newBlock('sleep');
        sleep.getInput('NAME')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);

        const code = compileMainEditorWorkspace('python', workspace as unknown as Blockly.WorkspaceSvg);
        expect(code).toContain('import time');
        expect(code).toContain('time.sleep(1)');
        expect(code).not.toMatch(/(^|\n)\s*sleep\s*\(/);
    });

    test('каждый адаптированный Python-блок создается и имеет генератор', () => {
        for (const type of adaptedPythonBlockTypes) {
            const workspace = makeWorkspace();
            const block = workspace.newBlock(type);
            expect(Blockly.Blocks[type]).toBeDefined();
            expect(pythonGenerator.forBlock[type]).toBeDefined();
            expect(() => pythonGenerator.blockToCode(block)).not.toThrow();
        }
    });

    test('интеграционная цепочка полета компилируется без неопределенных имен', () => {
        const workspace = makeWorkspace();
        const arm = workspace.newBlock('preflight');
        const takeoff = workspace.newBlock('take_off');
        const sleep = workspace.newBlock('sleep');
        const land = workspace.newBlock('landing');
        arm.nextConnection!.connect(takeoff.previousConnection!);
        takeoff.nextConnection!.connect(sleep.previousConnection!);
        sleep.nextConnection!.connect(land.previousConnection!);

        const code = compileMainEditorWorkspace('python', workspace as unknown as Blockly.WorkspaceSvg);
        expect(code).toContain('pioneer.arm()');
        expect(code).toContain('pioneer.takeoff()');
        expect(code).toContain('time.sleep(1)');
        expect(code).toContain('pioneer.land()');
        expect(code).not.toMatch(/(^|\n)\s*sleep\s*\(/);
    });

    test('камера и видеопоток добавляют импорты и инициализацию автоматически', () => {
        const cameraWorkspace = makeWorkspace();
        cameraWorkspace.newBlock('camera_connect');
        const cameraCode = compileMainEditorWorkspace('python', cameraWorkspace as unknown as Blockly.WorkspaceSvg);
        expect(cameraCode).toContain('from pioneer_sdk import Camera');
        expect(cameraCode).toContain('camera = Camera()');

        const streamWorkspace = makeWorkspace();
        streamWorkspace.newBlock('video_stream_start');
        const streamCode = compileMainEditorWorkspace('python', streamWorkspace as unknown as Blockly.WorkspaceSvg);
        expect(streamCode).toContain('from pioneer_sdk import VideoStream');
        expect(streamCode).toContain('stream = VideoStream()');
    });

    test('незаполненные числовые розетки получают безопасные значения', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('set_manual_speed');
        workspace.newBlock('sleep');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.set_manual_speed(0,0,0,0)');
        expect(code).toContain('time.sleep(1)');
        expect(code).not.toMatch(/,\s*,|=\s*\)|\(\s*,/);
    });

    test('controls_for с шагом генерирует range (Python) и for-do (Lua)', () => {
        const pythonWorkspace = makeWorkspace();
        const pythonLoop = pythonWorkspace.newBlock('controls_for');
        pythonLoop.setFieldValue(pythonWorkspace.getVariableMap().createVariable('i').getId(), 'VAR');
        pythonLoop.getInput('FROM')!.connection!.connect(numberBlock(pythonWorkspace, 1).outputConnection!);
        pythonLoop.getInput('TO')!.connection!.connect(numberBlock(pythonWorkspace, 10).outputConnection!);
        pythonLoop.getInput('BY')!.connection!.connect(numberBlock(pythonWorkspace, 2).outputConnection!);
        expect(pythonGenerator.workspaceToCode(pythonWorkspace)).toContain('for i in range(1, 11, 2)');

        const luaWorkspace = makeWorkspace();
        const luaLoop = luaWorkspace.newBlock('controls_for');
        luaLoop.setFieldValue(luaWorkspace.getVariableMap().createVariable('i').getId(), 'VAR');
        luaLoop.getInput('FROM')!.connection!.connect(numberBlock(luaWorkspace, 1).outputConnection!);
        luaLoop.getInput('TO')!.connection!.connect(numberBlock(luaWorkspace, 10).outputConnection!);
        luaLoop.getInput('BY')!.connection!.connect(numberBlock(luaWorkspace, 2).outputConnection!);
        expect(luaGenerator.workspaceToCode(luaWorkspace)).toContain('for i = 1, 10, 2 do');
    });

    test('controls_if с веткой else генерирует else для обоих языков', () => {
        const pythonWorkspace = makeWorkspace();
        const pythonIf = pythonWorkspace.newBlock('controls_if');
        pythonIf.loadExtraState?.({ hasElse: true });
        const pythonCode = pythonGenerator.workspaceToCode(pythonWorkspace);
        expect(pythonCode).toContain('if False:');
        expect(pythonCode).toContain('else:');

        const luaWorkspace = makeWorkspace();
        const luaIf = luaWorkspace.newBlock('controls_if');
        luaIf.loadExtraState?.({ hasElse: true });
        const luaCode = luaGenerator.workspaceToCode(luaWorkspace);
        expect(luaCode).toContain('if false then');
        expect(luaCode).toContain('else');
        expect(luaCode.trimEnd().endsWith('end')).toBe(true);
    });

    test('logic_compare генерирует корректное сравнение', () => {
        const pythonWorkspace = makeWorkspace();
        const pythonCompare = pythonWorkspace.newBlock('logic_compare');
        pythonCompare.setFieldValue('LT', 'OP');
        pythonCompare.getInput('A')!.connection!.connect(numberBlock(pythonWorkspace, 1).outputConnection!);
        pythonCompare.getInput('B')!.connection!.connect(numberBlock(pythonWorkspace, 2).outputConnection!);
        expect(pythonGenerator.workspaceToCode(pythonWorkspace)).toContain('1 < 2');

        const luaWorkspace = makeWorkspace();
        const luaCompare = luaWorkspace.newBlock('logic_compare');
        luaCompare.setFieldValue('LT', 'OP');
        luaCompare.getInput('A')!.connection!.connect(numberBlock(luaWorkspace, 1).outputConnection!);
        luaCompare.getInput('B')!.connection!.connect(numberBlock(luaWorkspace, 2).outputConnection!);
        expect(luaGenerator.workspaceToCode(luaWorkspace)).toContain('1 < 2');
    });
});

describe('Совместимость типов при соединении', () => {
    test('блок Array не подключается ко входу Number', () => {
        const workspace = makeWorkspace();
        const arithmetic = workspace.newBlock('math_arithmetic');
        const position = workspace.newBlock('py_get_local_point');
        const input = arithmetic.getInput('A')!.connection!;
        const output = position.outputConnection!;

        // В Blockly v12 connect() молча отклоняет несовместимые типы.
        input.connect(output);
        expect(input.targetBlock()).toBeNull();
        expect(new Blockly.ConnectionChecker().canConnect(input, output, false)).toBe(false);
    });

    test('блок Number подключается ко входу Number', () => {
        const workspace = makeWorkspace();
        const arithmetic = workspace.newBlock('math_arithmetic');
        const battery = workspace.newBlock('py_get_battery');
        const input = arithmetic.getInput('A')!.connection!;

        input.connect(battery.outputConnection!);
        expect(input.targetBlock()).toBe(battery);
    });

    test('Boolean-блок не подключается к Number-розетке координат', () => {
        const workspace = makeWorkspace();
        const goTo = workspace.newBlock('py_goto_local_point');
        const reached = workspace.newBlock('py_point_reached');
        const input = goTo.getInput('X')!.connection!;

        input.connect(reached.outputConnection!);
        expect(input.targetBlock()).toBeNull();
    });

    test('Lua value-блок Array не подключается к Number-входу', () => {
        const workspace = makeWorkspace();
        const arithmetic = workspace.newBlock('math_arithmetic');
        const pos = workspace.newBlock('lua_get_local_position');
        const input = arithmetic.getInput('A')!.connection!;
        const output = pos.outputConnection!;

        input.connect(output);
        expect(input.targetBlock()).toBeNull();
        expect(new Blockly.ConnectionChecker().canConnect(input, output, false)).toBe(false);
    });

    test('Lua value-блок Number подключается к Number-входу', () => {
        const workspace = makeWorkspace();
        const goTo = workspace.newBlock('lua_go_to_local_point');
        const num = workspace.newBlock('math_number');
        num.setFieldValue(3, 'NUM');
        const input = goTo.getInput('X')!.connection!;

        input.connect(num.outputConnection!);
        expect(input.targetBlock()).toBe(num);
    });

    test('Lua boolean value-блок не подключается к Number-входу координат', () => {
        const workspace = makeWorkspace();
        const goTo = workspace.newBlock('lua_go_to_local_point');
        const reached = workspace.newBlock('lua_point_reached');
        const input = goTo.getInput('X')!.connection!;

        input.connect(reached.outputConnection!);
        expect(input.targetBlock()).toBeNull();
    });
});

describe('Компиляция workspace Lua (compileMainEditorWorkspace)', () => {
    test('префикс/суффикс не добавляются для Lua (чистый код)', () => {
        const ws = makeWorkspace();
        ws.newBlock('lua_ap_push');
        const code = compileMainEditorWorkspace('lua', ws as unknown as Blockly.WorkspaceSvg);
        // Lua-ветка компилятора делает .trim() над сгенерированным кодом, поэтому
        // конечного \n здесь нет (в отличие от "сырого" luaGenerator.workspaceToCode).
        expect(code).toBe('ap.push(Ev.MCE_PREFLIGHT)');
        expect(code).not.toContain('from pioneer_sdk');
        expect(code).not.toContain('pioneer = Pioneer');
        expect(code).not.toContain('pioneer.close_connection');
    });

    test('compileMainEditorWorkspace возвращает тот же код, что и luaGenerator', () => {
        const ws = makeWorkspace();
        ws.newBlock('lua_preflight');
        ws.newBlock('lua_takeoff');
        const direct = luaGenerator.workspaceToCode(ws);
        const compiled = compileMainEditorWorkspace('lua', ws as unknown as Blockly.WorkspaceSvg);
        // compileMainEditorWorkspace .trim()-ит вывод для Lua, поэтому сравниваем
        // с обрезанной версией "сырого" вывода генератора.
        expect(compiled).toBe(direct.trim());
    });
});

describe('Интеграционные тесты Lua', () => {
    test('ap.push(MCE_PREFLIGHT) → callback → ENGINES_STARTED → ap.push(MCE_TAKEOFF) → TAKEOFF_COMPLETE', () => {
        const ws = makeWorkspace();

        // ap.push(MCE_PREFLIGHT)
        const pre = ws.newBlock('lua_ap_push');
        pre.setFieldValue('Ev.MCE_PREFLIGHT', 'EVENT');

        // Timer.callLater(0.5) → ap.push(MCE_TAKEOFF)
        const timer = ws.newBlock('lua_timer_calllater');
        timer.setFieldValue(0.5, 'DELAY');
        const takeoff = ws.newBlock('lua_ap_push');
        takeoff.setFieldValue('Ev.MCE_TAKEOFF', 'EVENT');
        timer.getInput('CALLBACK')!.connection!.connect(takeoff.previousConnection!);

        pre.nextConnection!.connect(timer.previousConnection!);

        const code = luaGenerator.workspaceToCode(ws);
        expect(code).toContain('ap.push(Ev.MCE_PREFLIGHT)');
        expect(code).toContain('Timer.callLater(0.5, function()');
        expect(code).toContain('ap.push(Ev.MCE_TAKEOFF)');

        // Компилируем через compileMainEditorWorkspace — должен вернуть тот же код
        const compiled = compileMainEditorWorkspace('lua', ws as unknown as Blockly.WorkspaceSvg);
        expect(compiled).toContain('ap.push(Ev.MCE_PREFLIGHT)');
        expect(compiled).toContain('Timer.callLater(0.5, function()');
        expect(compiled).toContain('ap.push(Ev.MCE_TAKEOFF)');
    });

    test('ap.push(MCE_PREFLIGHT) → ap.push(MCE_TAKEOFF) → ap.goToLocalPoint(1,0,1) → ap.push(MCE_LANDING)', () => {
        const ws = makeWorkspace();

        const pre = ws.newBlock('lua_ap_push');
        pre.setFieldValue('Ev.MCE_PREFLIGHT', 'EVENT');

        const takeoff = ws.newBlock('lua_ap_push');
        takeoff.setFieldValue('Ev.MCE_TAKEOFF', 'EVENT');

        const goto = ws.newBlock('lua_go_to_local_point');
        goto.getInput('X')!.connection!.connect(numberBlock(ws, 1).outputConnection!);
        goto.getInput('Z')!.connection!.connect(numberBlock(ws, 1).outputConnection!);

        const land = ws.newBlock('lua_ap_push');
        land.setFieldValue('Ev.MCE_LANDING', 'EVENT');

        pre.nextConnection!.connect(takeoff.previousConnection!);
        takeoff.nextConnection!.connect(goto.previousConnection!);
        goto.nextConnection!.connect(land.previousConnection!);

        const code = luaGenerator.workspaceToCode(ws);
        expect(code).toContain('ap.push(Ev.MCE_PREFLIGHT)');
        expect(code).toContain('ap.push(Ev.MCE_TAKEOFF)');
        expect(code).toContain('ap.goToLocalPoint(1, 0, 1)');
        expect(code).toContain('ap.push(Ev.MCE_LANDING)');
    });

    test('аварийная посадка: ap.push(MCE_LANDING) без предварительной подготовки', () => {
        const ws = makeWorkspace();
        const land = ws.newBlock('lua_ap_push');
        land.setFieldValue('Ev.MCE_LANDING', 'EVENT');

        const code = luaGenerator.workspaceToCode(ws);
        expect(code).toBe('ap.push(Ev.MCE_LANDING)\n');
    });

    test('сценарий с ожиданием точки и обновлением yaw', () => {
        const ws = makeWorkspace();

        const pre = ws.newBlock('lua_preflight');
        const takeoff = ws.newBlock('lua_takeoff');

        const yaw = ws.newBlock('lua_update_yaw');
        yaw.getInput('YAW')!.connection!.connect(numberBlock(ws, 1.57).outputConnection!);

        const goto = ws.newBlock('lua_go_to_local_point');
        goto.getInput('X')!.connection!.connect(numberBlock(ws, 2).outputConnection!);
        goto.getInput('Y')!.connection!.connect(numberBlock(ws, 0).outputConnection!);
        goto.getInput('Z')!.connection!.connect(numberBlock(ws, 3).outputConnection!);

        const wait = ws.newBlock('lua_waiting_for_point');

        const disarm = ws.newBlock('lua_engines_disarm');

        pre.nextConnection!.connect(takeoff.previousConnection!);
        takeoff.nextConnection!.connect(yaw.previousConnection!);
        yaw.nextConnection!.connect(goto.previousConnection!);
        goto.nextConnection!.connect(wait.previousConnection!);
        wait.nextConnection!.connect(disarm.previousConnection!);

        const code = luaGenerator.workspaceToCode(ws);
        expect(code).toContain('ap.push(Ev.MCE_PREFLIGHT)');
        expect(code).toContain('ap.push(Ev.MCE_TAKEOFF)');
        expect(code).toContain('ap.updateYaw(1.57)');
        expect(code).toContain('ap.goToLocalPoint(2, 0, 3)');
        expect(code).toContain('while not ap.point_reached() do');
        expect(code).toContain('ap.push(Ev.ENGINES_DISARM)');
    });
});
