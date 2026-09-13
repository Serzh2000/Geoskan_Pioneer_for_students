import * as Blockly from 'blockly';
import { definePioneerBlock } from '../registry.js';

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
        '    pos = pioneer.get_local_position_lps()',
        '    while pos is None:',
        "        if time.time() - started > 1:",
        "            raise RuntimeError('Нет данных о координатах дрона')",
        '        time.sleep(0.05)',
        '        pos = pioneer.get_local_position_lps()',
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
            python: () => ['pioneer.get_dist_sensor_data()', 0] as [string, number]
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
            python: () => ['pioneer.get_battery_status()', 0] as [string, number]
        },
        apiUsage: { lua: ['Sensors.battery'], python: ['pioneer.get_battery_status'] }
    });
}
