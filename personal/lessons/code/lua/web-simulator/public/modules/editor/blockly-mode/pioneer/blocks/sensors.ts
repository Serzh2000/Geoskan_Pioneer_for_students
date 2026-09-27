import * as Blockly from 'blockly';
import { definePioneerBlock } from '../registry.js';
import { PY_INDENT, ensurePythonMathImport, requirePythonSimulatorSdk } from './shared.js';

const AXIS_OPTIONS: Array<[string, string]> = [
    ['X', 'X'],
    ['Y', 'Y'],
    ['Z', 'Z']
];

function axisIndex(axis: string): number {
    const index = AXIS_OPTIONS.findIndex(([, value]) => value === axis);
    return index === -1 ? 0 : index;
}

// См. комментарий в blocks/leds.ts: definitions_ протектед у Blockly-генератора.
function definitionsOf(gen: Blockly.CodeGenerator): Record<string, string> {
    return (gen as unknown as { definitions_: Record<string, string> }).definitions_;
}

function ensurePythonPositionHelper(gen: Blockly.CodeGenerator): void {
    const definitions = definitionsOf(gen);
    if (definitions.pioneer_position_helper) return;
    definitions.pioneer_position_helper = [
        'def _pioneer_position(index):',
        '    started = time.time()',
        '    pos = pioneer.get_local_position_lps(get_last_received=True)',
        '    while pos is None:',
        "        if time.time() - started > 1:",
        "            raise RuntimeError('Нет данных о координатах дрона')",
        '        time.sleep(0.05)',
        '        pos = pioneer.get_local_position_lps(get_last_received=True)',
        '    return pos[index]'
    ].join('\n');
}

export function registerSensorBlocks(): void {
    definePioneerBlock({
        type: 'pioneer_position',
        category: 'sensors',
        init(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('координата')
                .appendField(new Blockly.FieldDropdown(AXIS_OPTIONS), 'AXIS')
                .appendField(', м');
            this.setOutput(true, 'Number');
            this.setColour('#14b8a6');
            this.setTooltip('Текущая координата дрона по выбранной оси в локальной системе координат.');
        },
        targets: {
            // Sensors.lpsPosition() возвращает x, y, z как отдельные значения,
            // а не таблицу (§2 плана) — берём нужное через select(k, ...).
            lua: (block) => {
                const k = axisIndex(block.getFieldValue('AXIS')) + 1;
                return [`(select(${k}, Sensors.lpsPosition()))`, 0] as [string, number];
            },
            python: (block, gen) => {
                ensurePythonPositionHelper(gen);
                const k = axisIndex(block.getFieldValue('AXIS'));
                return [`_pioneer_position(${k})`, 0] as [string, number];
            }
        },
        apiUsage: { lua: ['Sensors.lpsPosition', 'select'], python: ['pioneer.get_local_position_lps'] }
    });

    definePioneerBlock({
        type: 'pioneer_distance',
        category: 'sensors',
        init(this: Blockly.Block) {
            this.appendDummyInput().appendField('дальномер, м');
            this.setOutput(true, 'Number');
            this.setColour('#14b8a6');
            this.setTooltip('Показания дальномера в метрах.');
        },
        targets: {
            lua: () => ['Sensors.range()', 0] as [string, number],
            python: () => ['pioneer.get_dist_sensor_data(get_last_received=True)', 0] as [string, number]
        },
        apiUsage: { lua: ['Sensors.range'], python: ['pioneer.get_dist_sensor_data'] }
    });

    definePioneerBlock({
        type: 'pioneer_battery',
        category: 'sensors',
        init(this: Blockly.Block) {
            this.appendDummyInput().appendField('батарея, В');
            this.setOutput(true, 'Number');
            this.setColour('#14b8a6');
            this.setTooltip('Текущее напряжение батареи в вольтах.');
        },
        targets: {
            lua: () => ['Sensors.battery()', 0] as [string, number],
            python: () => ['pioneer.get_battery_status(get_last_received=True)', 0] as [string, number]
        },
        apiUsage: { lua: ['Sensors.battery'], python: ['pioneer.get_battery_status'] }
    });

    // Курс в градусах. Lua — Sensors.lpsYaw() (радианы, официальный API),
    // Python — get_yaw() из pioneer_sdk 0.6.1 (GitFlic), только с
    // Pioneer(simulator=True). В блоках углы всегда в градусах.
    definePioneerBlock({
        type: 'pioneer_yaw',
        category: 'sensors',
        init(this: Blockly.Block) {
            this.appendDummyInput().appendField('курс, °');
            this.setOutput(true, 'Number');
            this.setColour('#14b8a6');
            this.setTooltip('Текущий курс дрона в градусах.');
        },
        targets: {
            lua: () => ['math.deg(Sensors.lpsYaw())', 0] as [string, number],
            python: (block, gen) => {
                requirePythonSimulatorSdk(gen);
                ensurePythonMathImport(gen);
                ensurePythonYawHelper(gen);
                return ['math.degrees(_pioneer_read_yaw())', 0] as [string, number];
            }
        },
        apiUsage: { lua: ['math.deg', 'Sensors.lpsYaw'], python: ['math.degrees', 'pioneer.get_yaw'] }
    });

    // Дальше — датчики, которых в pioneer_sdk нет вовсе: только Lua.
    luaTripleSensor('pioneer_velocity', 'скорость по оси', 'м/с', 'Sensors.lpsVelocity',
        'Скорость дрона по выбранной оси, м/с (Sensors.lpsVelocity). Только Lua.');
    luaTripleSensor('pioneer_accel', 'ускорение по оси', 'м/с²', 'Sensors.accel',
        'Показания акселерометра по выбранной оси, м/с² (Sensors.accel). Только Lua.');
    luaTripleSensor('pioneer_gyro', 'угловая скорость по оси', 'рад/с', 'Sensors.gyro',
        'Показания гироскопа по выбранной оси, рад/с (Sensors.gyro). Только Lua.');

    definePioneerBlock({
        type: 'pioneer_tilt',
        category: 'sensors',
        init(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([['крен', 'ROLL'], ['тангаж', 'PITCH']]), 'ANGLE')
                .appendField(', °');
            this.setOutput(true, 'Number');
            this.setColour('#14b8a6');
            this.setTooltip('Наклон дрона в градусах (Sensors.orientation). Только Lua.');
        },
        targets: {
            lua: (block) => {
                const k = block.getFieldValue('ANGLE') === 'PITCH' ? 2 : 1;
                return [`math.deg((select(${k}, Sensors.orientation())))`, 0] as [string, number];
            }
        },
        apiUsage: { lua: ['math.deg', 'select', 'Sensors.orientation'] }
    });

    definePioneerBlock({
        type: 'pioneer_altitude',
        category: 'sensors',
        init(this: Blockly.Block) {
            this.appendDummyInput().appendField('высота по барометру, м');
            this.setOutput(true, 'Number');
            this.setColour('#14b8a6');
            this.setTooltip('Высота над точкой включения по барометру (Sensors.altitude). Над крышей она не уменьшается, в отличие от дальномера. Только Lua.');
        },
        targets: {
            lua: () => ['Sensors.altitude()', 0] as [string, number]
        },
        apiUsage: { lua: ['Sensors.altitude'] }
    });

    // Каналы пульта: Sensors.rc() отдаёт восемь значений от -1 до 1. Так
    // официальные example_cargo.lua и rc_script_start.lua читают тумблер SwA
    // на 8-м канале.
    definePioneerBlock({
        type: 'pioneer_rc_channel',
        category: 'sensors',
        init(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('канал пульта')
                .appendField(new Blockly.FieldDropdown(
                    Array.from({ length: 8 }, (_, i): [string, string] => [String(i + 1), String(i + 1)])
                ), 'CHANNEL');
            this.setOutput(true, 'Number');
            this.setColour('#14b8a6');
            this.setTooltip('Положение канала пульта от -1 до 1 (Sensors.rc). Только Lua.');
        },
        targets: {
            lua: (block) => [`(select(${Number(block.getFieldValue('CHANNEL')) || 1}, Sensors.rc()))`, 0] as [string, number]
        },
        apiUsage: { lua: ['select', 'Sensors.rc'] }
    });
}

function luaTripleSensor(type: `pioneer_${string}`, label: string, unit: string, api: string, tooltip: string): void {
    definePioneerBlock({
        type,
        category: 'sensors',
        init(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField(label)
                .appendField(new Blockly.FieldDropdown(AXIS_OPTIONS), 'AXIS')
                .appendField(`, ${unit}`);
            this.setOutput(true, 'Number');
            this.setColour('#14b8a6');
            this.setTooltip(tooltip);
        },
        targets: {
            lua: (block) => {
                const k = axisIndex(block.getFieldValue('AXIS')) + 1;
                return [`(select(${k}, ${api}()))`, 0] as [string, number];
            }
        },
        apiUsage: { lua: ['select', api] }
    });
}

function ensurePythonYawHelper(gen: Blockly.CodeGenerator): void {
    const definitions = definitionsOf(gen);
    if (definitions.pioneer_read_yaw_helper) return;
    const i = PY_INDENT;
    definitions.pioneer_read_yaw_helper = [
        'def _pioneer_read_yaw():',
        `${i}started = time.time()`,
        `${i}yaw = pioneer.get_yaw(get_last_received=True)`,
        `${i}while yaw is None:`,
        `${i}${i}if time.time() - started > 1:`,
        `${i}${i}${i}raise RuntimeError('Нет данных о курсе дрона')`,
        `${i}${i}time.sleep(0.05)`,
        `${i}${i}yaw = pioneer.get_yaw(get_last_received=True)`,
        `${i}return yaw`
    ].join('\n');
}
