import * as Blockly from 'blockly';
import { definePioneerBlock } from '../registry.js';
import { definitionsOf, numberArg } from './shared.js';

// Машины и поезда на сцене симулятора — сценарии слежения и доставки. Этого
// API нет ни у настоящего Пионера, ни у pioneer_sdk: только симулятор, зато
// в обоих языках (Vehicle.* в Lua, pioneer_sdk.Vehicle в Python).
function ensurePythonVehicleImport(gen: Blockly.CodeGenerator): void {
    definitionsOf(gen).import_vehicle = 'from pioneer_sdk import Vehicle';
}

function vehicleName(gen: Blockly.CodeGenerator, block: Blockly.Block): string {
    return gen.valueToCode(block, 'NAME', 0) || '""';
}

export function registerSceneBlocks(): void {
    definePioneerBlock({
        type: 'pioneer_vehicle_run',
        category: 'scene',
        init(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([['Запустить', 'START'], ['Остановить', 'STOP']]), 'ACTION');
            this.appendValueInput('NAME').setCheck('String').appendField('транспорт');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#64748b');
            this.setTooltip('Запускает или останавливает машину или поезд на сцене по названию из их настроек. Только в симуляторе.');
        },
        targets: {
            lua: (block, gen) => {
                const method = block.getFieldValue('ACTION') === 'STOP' ? 'stop' : 'start';
                return `Vehicle.${method}(${vehicleName(gen, block)})\n`;
            },
            python: (block, gen) => {
                ensurePythonVehicleImport(gen);
                const method = block.getFieldValue('ACTION') === 'STOP' ? 'stop' : 'start';
                return `Vehicle(${vehicleName(gen, block)}).${method}()\n`;
            }
        },
        apiUsage: { lua: ['Vehicle.start', 'Vehicle.stop'], python: ['Vehicle', 'start', 'stop'] }
    });

    definePioneerBlock({
        type: 'pioneer_vehicle_speed',
        category: 'scene',
        init(this: Blockly.Block) {
            this.appendValueInput('NAME').setCheck('String').appendField('Скорость транспорта');
            this.appendValueInput('SPEED').setCheck('Number').appendField('');
            this.appendDummyInput().appendField('м/с');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#64748b');
            this.setTooltip('Задаёт скорость машины или поезда на сцене. Только в симуляторе.');
        },
        targets: {
            lua: (block, gen) => `Vehicle.setSpeed(${vehicleName(gen, block)}, ${numberArg(gen, block, 'SPEED', '1')})\n`,
            python: (block, gen) => {
                ensurePythonVehicleImport(gen);
                return `Vehicle(${vehicleName(gen, block)}).set_speed(${numberArg(gen, block, 'SPEED', '1')})\n`;
            }
        },
        apiUsage: { lua: ['Vehicle.setSpeed'], python: ['Vehicle', 'set_speed'] }
    });
}
