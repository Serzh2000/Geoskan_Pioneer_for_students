/**
 * Комплексные тесты для всех Python-блоков Blockly.
 * Проверяет регистрацию блоков, генераторы кода и совместимость типов.
 */
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';

import {
    buildMainEditorToolbox,
    compileMainEditorWorkspace,
    ensureEditorBlocklyDefinitions
} from '../public/modules/editor/blockly-mode/index.js';

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

// Блоки из getCourseBlockTypes('python')
const coursePythonBlockTypes = [
    'py_led_control',
    'py_time_sleep',
    'py_print',
    'py_arm',
    'py_disarm',
    'py_takeoff',
    'py_land',
    'py_goto_local_point',
    'py_wait_point_reached'
];

// Блоки из renderPioneerSdkCategories()
const pioneerSdkBlockTypes = [
    // Полет
    'preflight', 'take_off', 'go_local_point', 'go_local_point_body_fixed', 'set_manual_speed',
    'not_point_reached', 'landing', 'engines_disarm', 'close_connection',
    // Сенсоры и координаты
    'get_local_position_lps', 'get_local_position_component', 'get_dist_sensor_data',
    'get_battery_status', 'get_autopilot_state',
    // Светодиоды
    'led_all', 'led_index',
    // Пульт и Lua-скрипт
    'send_rc_channels', 'lua_script_control',
    // Камера
    'camera_connect', 'camera_disconnect', 'camera_connected', 'camera_get_frame', 'cam_get_cv_frame',
    // Видеопоток
    'video_stream_start', 'video_stream_stop', 'video_stream_connected',
    // Время
    'sleep', 'get_time'
];

// Все Python-блоки из toolboox
const allPythonBlockTypes = [
    ...coursePythonBlockTypes,
    ...pioneerSdkBlockTypes
];

// Сенсорные value-блоки из renderStandardCategories (только Python)
const sensorValueBlockTypes = [
    'py_get_sensor_distance',
    'py_get_local_point',
    'py_get_battery',
    'py_get_autopilot_state'
];

beforeAll(() => {
    ensureEditorBlocklyDefinitions();
});

describe('Регистрация Python-блоков в Blockly.Blocks', () => {
    test('все блоки из getCourseBlockTypes("python") зарегистрированы', () => {
        for (const type of coursePythonBlockTypes) {
            expect(Blockly.Blocks[type]).toBeDefined();
            expect(Blockly.Blocks[type]).toBeInstanceOf(Object);
        }
    });

    test('все блоки из renderPioneerSdkCategories() зарегистрированы', () => {
        for (const type of pioneerSdkBlockTypes) {
            expect(Blockly.Blocks[type]).toBeDefined();
            expect(Blockly.Blocks[type]).toBeInstanceOf(Object);
        }
    });

    test('все сенсорные value-блоки зарегистрированы', () => {
        for (const type of sensorValueBlockTypes) {
            expect(Blockly.Blocks[type]).toBeDefined();
            expect(Blockly.Blocks[type]).toBeInstanceOf(Object);
        }
    });

    test('всего зарегистрировано не менее 30 Python-блоков', () => {
        const registeredCount = Object.keys(Blockly.Blocks).filter(
            (name) => allPythonBlockTypes.includes(name) || sensorValueBlockTypes.includes(name)
        ).length;
        expect(registeredCount).toBeGreaterThanOrEqual(30);
    });
});

describe('Генераторы кода для Python-блоков', () => {
    test('у всех блоков из getCourseBlockTypes("python") есть pythonGenerator.forBlock', () => {
        for (const type of coursePythonBlockTypes) {
            expect(pythonGenerator.forBlock[type]).toBeDefined();
            expect(typeof pythonGenerator.forBlock[type]).toBe('function');
        }
    });

    test('у всех блоков из renderPioneerSdkCategories() есть pythonGenerator.forBlock', () => {
        for (const type of pioneerSdkBlockTypes) {
            expect(pythonGenerator.forBlock[type]).toBeDefined();
            expect(typeof pythonGenerator.forBlock[type]).toBe('function');
        }
    });

    test('у всех сенсорных value-блоков есть pythonGenerator.forBlock', () => {
        for (const type of sensorValueBlockTypes) {
            expect(pythonGenerator.forBlock[type]).toBeDefined();
            expect(typeof pythonGenerator.forBlock[type]).toBe('function');
        }
    });

    test('каждый блок без ошибок преобразуется в код через blockToCode', () => {
        for (const type of [...allPythonBlockTypes, ...sensorValueBlockTypes]) {
            const workspace = makeWorkspace();
            const block = workspace.newBlock(type);
            expect(() => pythonGenerator.blockToCode(block)).not.toThrow();
        }
    });
});

describe('Кодогенерация учебных Python-блоков (getCourseBlockTypes)', () => {
    test('py_time_sleep генерирует time.sleep(), а не bare sleep()', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('py_time_sleep');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('time.sleep(1)');
        expect(code).not.toMatch(/(^|\n)\s*sleep\s*\(/);
    });

    test('py_arm генерирует pioneer.arm()', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('py_arm');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.arm()');
    });

    test('py_disarm генерирует pioneer.disarm()', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('py_disarm');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.disarm()');
    });

    test('py_takeoff генерирует pioneer.takeoff()', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('py_takeoff');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.takeoff()');
    });

    test('py_land генерирует pioneer.land()', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('py_land');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.land()');
    });

    test('py_led_control генерирует pioneer.led_control() с аргументами', () => {
        const workspace = makeWorkspace();
        const led = workspace.newBlock('py_led_control');
        led.setFieldValue('1', 'LED_ID');
        led.setFieldValue('255', 'R');
        led.setFieldValue('0', 'G');
        led.setFieldValue('0', 'B');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.led_control(led_id=1, r=255, g=0, b=0)');
    });

    test('py_led_control по умолчанию генерирует pioneer.led_control() со всеми LED', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('py_led_control');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.led_control(led_id=255, r=0, g=0, b=0)');
    });

    test('py_goto_local_point генерирует pioneer.go_to_local_point() с координатами', () => {
        const workspace = makeWorkspace();
        const goTo = workspace.newBlock('py_goto_local_point');

        // Проверяем типизированные розетки
        for (const inputName of ['X', 'Y', 'Z', 'YAW']) {
            expect(goTo.getInput(inputName)?.connection?.getCheck()).toEqual(['Number']);
        }

        // По умолчанию
        const defaultCode = pythonGenerator.workspaceToCode(workspace);
        expect(defaultCode).toContain('pioneer.go_to_local_point(x=1, y=0, z=1, yaw=0)');

        // С подключённым числом
        const numberWorkspace = makeWorkspace();
        const numberGoTo = numberWorkspace.newBlock('py_goto_local_point');
        numberGoTo.getInput('Z')!.connection!.connect(numberBlock(numberWorkspace, 5).outputConnection!);
        expect(pythonGenerator.workspaceToCode(numberWorkspace))
            .toContain('pioneer.go_to_local_point(x=1, y=0, z=5, yaw=0)');
    });

    test('py_wait_point_reached генерирует цикл ожидания', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('py_wait_point_reached');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('while not pioneer.point_reached():');
        expect(code).toContain('time.sleep(0.05)');
    });

    test('py_print генерирует print() с текстом', () => {
        const workspace = makeWorkspace();
        const print = workspace.newBlock('py_print');
        print.setFieldValue('Hello World', 'TEXT');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('print("Hello World")');
    });

    test('цепочка учебных блоков генерирует последовательный код', () => {
        const workspace = makeWorkspace();
        const arm = workspace.newBlock('py_arm');
        const takeoff = workspace.newBlock('py_takeoff');
        const sleep = workspace.newBlock('py_time_sleep');
        const land = workspace.newBlock('py_land');
        arm.nextConnection!.connect(takeoff.previousConnection!);
        takeoff.nextConnection!.connect(sleep.previousConnection!);
        sleep.nextConnection!.connect(land.previousConnection!);

        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.arm()');
        expect(code).toContain('pioneer.takeoff()');
        expect(code).toContain('time.sleep(1)');
        expect(code).toContain('pioneer.land()');
    });
});

describe('Кодогенерация блоков полета (Pioneer SDK)', () => {
    test('preflight генерирует pioneer.arm()', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('preflight');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.arm()');
    });

    test('take_off генерирует pioneer.arm() и pioneer.takeoff()', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('take_off');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.arm()');
        expect(code).toContain('pioneer.takeoff()');
    });

    test('go_local_point генерирует pioneer.go_to_local_point() с корректными розетками', () => {
        const workspace = makeWorkspace();
        const goTo = workspace.newBlock('go_local_point');

        for (const inputName of ['X', 'Y', 'Z', 'YAW']) {
            expect(goTo.getInput(inputName)?.connection?.getCheck()).toEqual(['Number']);
        }
        expect(goTo.getInput('TIME')?.connection?.getCheck()).toEqual(['Number']);
        expect(goTo.inputsInline).toBe(true);

        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.go_to_local_point(x=0, y=0, z=0, yaw=0)');
    });

    test('go_local_point_body_fixed генерирует pioneer.go_to_local_point_body_fixed()', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('go_local_point_body_fixed');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.go_to_local_point_body_fixed');
    });

    test('landing генерирует pioneer.land()', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('landing');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.land()');
    });

    test('engines_disarm генерирует pioneer.disarm()', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('engines_disarm');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.disarm()');
    });

    test('set_manual_speed генерирует pioneer.set_manual_speed()', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('set_manual_speed');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.set_manual_speed(0,0,0,0)');
    });

    test('close_connection генерирует pioneer.close_connection()', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('close_connection');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.close_connection()');
    });

    test('not_point_reached генерирует not pioneer.point_reached() и имеет Boolean выход', () => {
        const workspace = makeWorkspace();
        const block = workspace.newBlock('not_point_reached');
        expect(block.outputConnection?.getCheck()).toEqual(['Boolean']);
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('not pioneer.point_reached()');
    });

    test('полная цепочка полета: preflight -> take_off -> landing -> engines_disarm', () => {
        const workspace = makeWorkspace();
        const pre = workspace.newBlock('preflight');
        const takeoff = workspace.newBlock('take_off');
        const land = workspace.newBlock('landing');
        const disarm = workspace.newBlock('engines_disarm');
        pre.nextConnection!.connect(takeoff.previousConnection!);
        takeoff.nextConnection!.connect(land.previousConnection!);
        land.nextConnection!.connect(disarm.previousConnection!);

        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.arm()');
        expect(code).toContain('pioneer.takeoff()');
        expect(code).toContain('pioneer.land()');
        expect(code).toContain('pioneer.disarm()');
    });
});

describe('Кодогенерация сенсорных блоков', () => {
    test('get_local_position_lps генерирует pioneer.get_local_position_lps() и имеет выход Array', () => {
        const workspace = makeWorkspace();
        const block = workspace.newBlock('get_local_position_lps');
        expect(block.outputConnection?.getCheck()).toEqual(['Array']);
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.get_local_position_lps()');
    });

    test('get_local_position_component имеет дропдаун и выходной тип Number', () => {
        const workspace = makeWorkspace();
        const component = workspace.newBlock('get_local_position_component');
        const dropdown = component.getField('INDEX') as Blockly.FieldDropdown;
        expect(dropdown).toBeDefined();
        expect((dropdown.getOptions().map(([label]) => label))).toContain('высоту Z');
        expect(component.outputConnection?.getCheck()).toEqual(['Number']);
        expect(component.getInput('POSITION_DATA')?.connection?.getCheck()).toEqual(['Point3D']);
    });

    test('get_local_position_component генерирует код с индексом массива', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('get_local_position_component');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.get_local_position_lps()');
        expect(code).toContain('[2]');
    });

    test('get_dist_sensor_data генерирует pioneer.get_dist_sensor_data() и имеет выход Number', () => {
        const workspace = makeWorkspace();
        const dist = workspace.newBlock('get_dist_sensor_data');
        expect(dist.outputConnection?.getCheck()).toEqual(['Number']);
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.get_dist_sensor_data()');
    });

    test('get_battery_status генерирует pioneer.get_battery_status() и имеет выход Number', () => {
        const workspace = makeWorkspace();
        const battery = workspace.newBlock('get_battery_status');
        expect(battery.outputConnection?.getCheck()).toEqual(['Number']);
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.get_battery_status()');
    });

    test('get_autopilot_state генерирует pioneer.get_autopilot_state() и имеет выход String', () => {
        const workspace = makeWorkspace();
        const state = workspace.newBlock('get_autopilot_state');
        expect(state.outputConnection?.getCheck()).toEqual(['String']);
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.get_autopilot_state()');
    });
});

describe('Кодогенерация блоков светодиодов', () => {
    test('led_all генерирует pioneer.led_control() для всех LED', () => {
        const workspace = makeWorkspace();
        const led = workspace.newBlock('led_all');
        led.setFieldValue('(255, 0, 0)', 'COLOR');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.led_control');
        expect(code).toContain('led_id=255');
    });

    test('led_index генерирует pioneer.led_control() для конкретного LED', () => {
        const workspace = makeWorkspace();
        const led = workspace.newBlock('led_index');
        led.setFieldValue('(255, 0, 0)', 'COLOR');
        led.setFieldValue('5', 'NUM');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.led_control');
        expect(code).toContain('led_id=5');
    });
});

describe('Кодогенерация блоков пульта и Lua-скрипта', () => {
    test('send_rc_channels генерирует pioneer.send_rc_channels() с каналами', () => {
        const workspace = makeWorkspace();
        const block = workspace.newBlock('send_rc_channels');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.send_rc_channels');
        expect(code).toContain('channel_1=1500');
    });

    test('lua_script_control генерирует pioneer.lua_script_control() с командой', () => {
        const workspace = makeWorkspace();
        const block = workspace.newBlock('lua_script_control');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('pioneer.lua_script_control');
        expect(code).toContain('"Start"');
    });
});

describe('Кодогенерация блоков камеры', () => {
    test('camera_connect генерирует camera.connect() и добавляет import Camera', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('camera_connect');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('camera.connect()');
        const defs = (pythonGenerator as any).definitions_;
        expect(defs).toBeDefined();
        expect(defs['import_camera']).toContain('from pioneer_sdk import Camera');
    });

    test('camera_disconnect генерирует camera.disconnect()', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('camera_disconnect');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('camera.disconnect()');
    });

    test('camera_connected генерирует camera.connected() и имеет Boolean выход', () => {
        const workspace = makeWorkspace();
        const connected = workspace.newBlock('camera_connected');
        expect(connected.outputConnection?.getCheck()).toEqual(['Boolean']);
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('camera.connected()');
    });

    test('camera_get_frame генерирует camera.get_frame() и имеет выход Array', () => {
        const workspace = makeWorkspace();
        const frame = workspace.newBlock('camera_get_frame');
        expect(frame.outputConnection?.getCheck()).toEqual(['Array']);
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('camera.get_frame()');
    });

    test('cam_get_cv_frame генерирует camera.get_cv_frame() и имеет выход Frame', () => {
        const workspace = makeWorkspace();
        const cvFrame = workspace.newBlock('cam_get_cv_frame');
        expect(cvFrame.outputConnection?.getCheck()).toEqual(['Frame']);
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('camera.get_cv_frame()');
    });
});

describe('Кодогенерация блоков видеопотока', () => {
    test('video_stream_start генерирует stream.start() и добавляет import VideoStream', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('video_stream_start');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('stream.start()');
        const defs = (pythonGenerator as any).definitions_;
        expect(defs).toBeDefined();
        expect(defs['import_stream']).toContain('from pioneer_sdk import VideoStream');
    });

    test('video_stream_stop генерирует stream.stop()', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('video_stream_stop');
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('stream.stop()');
    });

    test('video_stream_connected генерирует stream.connected() и имеет Boolean выход', () => {
        const workspace = makeWorkspace();
        const stream = workspace.newBlock('video_stream_connected');
        expect(stream.outputConnection?.getCheck()).toEqual(['Boolean']);
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('stream.connected()');
    });
});

describe('Кодогенерация блоков времени', () => {
    test('sleep генерирует time.sleep() и не bare sleep()', () => {
        const workspace = makeWorkspace();
        const sleep = workspace.newBlock('sleep');
        sleep.getInput('NAME')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);

        const code = compileMainEditorWorkspace('python', workspace as unknown as Blockly.WorkspaceSvg);
        expect(code).toContain('import time');
        expect(code).toContain('time.sleep(1)');
        expect(code).not.toMatch(/(^|\n)\s*sleep\s*\(/);
    });

    test('get_time генерирует time.time() и имеет выход Number', () => {
        const workspace = makeWorkspace();
        const time = workspace.newBlock('get_time');
        expect(time.outputConnection?.getCheck()).toEqual(['Number']);
        const code = pythonGenerator.workspaceToCode(workspace);
        expect(code).toContain('time.time()');
    });
});

describe('Компиляция workspace в валидный Python код', () => {
    test('простой блок arm компилируется с импортом pioneer_sdk и инициализацией', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('py_arm');

        const code = compileMainEditorWorkspace('python', workspace as unknown as Blockly.WorkspaceSvg);
        expect(code).toContain('from pioneer_sdk import Pioneer');
        expect(code).toContain('pioneer = Pioneer(simulator=True)');
        expect(code).toContain('pioneer.arm()');
        expect(code.trimEnd().endsWith('pioneer.close_connection()')).toBe(true);
    });

    test('блок камеры компилируется с импортом Camera', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('camera_connect');

        const code = compileMainEditorWorkspace('python', workspace as unknown as Blockly.WorkspaceSvg);
        expect(code).toContain('from pioneer_sdk import Camera');
        expect(code).toContain('camera = Camera()');
        expect(code).toContain('camera.connect()');
    });

    test('блок видеопотока компилируется с импортом VideoStream', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('video_stream_start');

        const code = compileMainEditorWorkspace('python', workspace as unknown as Blockly.WorkspaceSvg);
        expect(code).toContain('from pioneer_sdk import VideoStream');
        expect(code).toContain('stream = VideoStream()');
        expect(code).toContain('stream.start()');
    });

    test('блок sleep в компилированном коде использует time.sleep с импортом', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('sleep');

        const code = compileMainEditorWorkspace('python', workspace as unknown as Blockly.WorkspaceSvg);
        expect(code).toContain('import time');
        expect(code).toContain('time.sleep(1)');
        expect(code).not.toMatch(/(^|\n)\s*sleep\s*\(/);
    });

    test('блок go_local_point компилируется корректно', () => {
        const workspace = makeWorkspace();
        workspace.newBlock('go_local_point');

        const code = compileMainEditorWorkspace('python', workspace as unknown as Blockly.WorkspaceSvg);
        expect(code).toContain('pioneer.go_to_local_point');
        expect(code).toContain('from pioneer_sdk import Pioneer');
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
});

describe('Совместимость типов value-блоков', () => {
    test('py_get_sensor_distance имеет выходной тип Number', () => {
        const workspace = makeWorkspace();
        const block = workspace.newBlock('py_get_sensor_distance');
        expect(block.outputConnection?.getCheck()).toEqual(['Number']);
    });

    test('py_get_local_point имеет выходной тип Array', () => {
        const workspace = makeWorkspace();
        const block = workspace.newBlock('py_get_local_point');
        expect(block.outputConnection?.getCheck()).toEqual(['Array']);
    });

    test('py_get_battery имеет выходной тип Number', () => {
        const workspace = makeWorkspace();
        const block = workspace.newBlock('py_get_battery');
        expect(block.outputConnection?.getCheck()).toEqual(['Number']);
    });

    test('py_get_autopilot_state имеет выходной тип String', () => {
        const workspace = makeWorkspace();
        const block = workspace.newBlock('py_get_autopilot_state');
        expect(block.outputConnection?.getCheck()).toEqual(['String']);
    });

    test('get_local_position_component имеет выходной тип Number', () => {
        const workspace = makeWorkspace();
        const block = workspace.newBlock('get_local_position_component');
        expect(block.outputConnection?.getCheck()).toEqual(['Number']);
    });

    test('get_dist_sensor_data имеет выходной тип Number', () => {
        const workspace = makeWorkspace();
        const block = workspace.newBlock('get_dist_sensor_data');
        expect(block.outputConnection?.getCheck()).toEqual(['Number']);
    });

    test('get_battery_status имеет выходной тип Number', () => {
        const workspace = makeWorkspace();
        const block = workspace.newBlock('get_battery_status');
        expect(block.outputConnection?.getCheck()).toEqual(['Number']);
    });

    test('get_autopilot_state имеет выходной тип String', () => {
        const workspace = makeWorkspace();
        const block = workspace.newBlock('get_autopilot_state');
        expect(block.outputConnection?.getCheck()).toEqual(['String']);
    });

    test('camera_connected имеет выходной тип Boolean', () => {
        const workspace = makeWorkspace();
        const block = workspace.newBlock('camera_connected');
        expect(block.outputConnection?.getCheck()).toEqual(['Boolean']);
    });

    test('video_stream_connected имеет выходной тип Boolean', () => {
        const workspace = makeWorkspace();
        const block = workspace.newBlock('video_stream_connected');
        expect(block.outputConnection?.getCheck()).toEqual(['Boolean']);
    });

    test('get_time имеет выходной тип Number', () => {
        const workspace = makeWorkspace();
        const block = workspace.newBlock('get_time');
        expect(block.outputConnection?.getCheck()).toEqual(['Number']);
    });

    test('Number блок подключается к Number входу', () => {
        const workspace = makeWorkspace();
        const arithmetic = workspace.newBlock('math_arithmetic');
        const battery = workspace.newBlock('get_battery_status');
        const input = arithmetic.getInput('A')!.connection!;

        input.connect(battery.outputConnection!);
        expect(input.targetBlock()).toBe(battery);
    });

    test('Boolean блок не подключается к Number входу координат', () => {
        const workspace = makeWorkspace();
        const goTo = workspace.newBlock('py_goto_local_point');
        const reached = workspace.newBlock('not_point_reached');
        const input = goTo.getInput('X')!.connection!;

        input.connect(reached.outputConnection!);
        expect(input.targetBlock()).toBeNull();
    });

    test('Array блок не подключается к Number входу', () => {
        const workspace = makeWorkspace();
        const arithmetic = workspace.newBlock('math_arithmetic');
        const position = workspace.newBlock('py_get_local_point');
        const input = arithmetic.getInput('A')!.connection!;
        const output = position.outputConnection!;

        input.connect(output);
        expect(input.targetBlock()).toBeNull();
        expect(new Blockly.ConnectionChecker().canConnect(input, output, false)).toBe(false);
    });
});

describe('Тулбокс Python содержит все ожидаемые блоки', () => {
    test('тулбокс содержит все учебные блоки', () => {
        const xml = buildMainEditorToolbox('python');
        const types = toolboxBlockTypes(xml);
        for (const type of coursePythonBlockTypes) {
            expect(types).toContain(type);
        }
    });

    test('тулбокс содержит все блоки Pioneer SDK', () => {
        const xml = buildMainEditorToolbox('python');
        const types = toolboxBlockTypes(xml);
        for (const type of pioneerSdkBlockTypes) {
            expect(types).toContain(type);
        }
    });

    test('тулбокс содержит стандартные категории стандартного редактора', () => {
        const xml = buildMainEditorToolbox('python');
        const types = toolboxBlockTypes(xml);
        const standardBlocks = ['controls_if', 'logic_compare', 'math_number', 'text', 'lists_create_with'];
        for (const type of standardBlocks) {
            expect(types).toContain(type);
        }
    });

    test('тулбокс не содержит неподдерживаемые блоки', () => {
        const xml = buildMainEditorToolbox('python');
        const types = toolboxBlockTypes(xml);
        const unsupported = ['get_ranger_data', 'servo_set_angle', 'ai_model_init', 'get_global_position_gps'];
        for (const type of unsupported) {
            expect(types).not.toContain(type);
        }
    });
});
