import * as Blockly from 'blockly';
import { definePioneerBlock } from '../registry.js';
import { installWaitModelGuards } from '../wait-model-guards.js';

// См. комментарий в blocks/leds.ts: definitions_ протектед у Blockly-генератора.
function definitionsOf(gen: Blockly.CodeGenerator): Record<string, string> {
    return (gen as unknown as { definitions_: Record<string, string> }).definitions_;
}

// _pioneer_t0 нужен только блоку pioneer_time — печатаем точку отсчёта через
// definitions_, только если она реально используется (§4.4 плана,
// пересмотрено 2026-09-14: раньше строка была частью фиксированного пролога
// в targets/python-runtime.ts и печаталась в каждой программе без исключений).
function ensurePythonTimeOrigin(gen: Blockly.CodeGenerator): void {
    const definitions = definitionsOf(gen);
    if (definitions.pioneer_time_origin) return;
    definitions.pioneer_time_origin = '_pioneer_t0 = time.time()';
}

export function registerTimeBlocks(): void {
    definePioneerBlock({
        type: 'pioneer_wait',
        category: 'time',
        init(this: Blockly.Block) {
            this.appendValueInput('SECONDS').setCheck('Number').appendField('Ждать');
            this.appendDummyInput().appendField('сек');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#f59e0b');
            this.setTooltip('Приостанавливает выполнение программы на заданное число секунд.');
            installWaitModelGuards(this);
        },
        targets: {
            // __wait_seconds — часть корутинного рантайма (targets/lua-runtime.ts):
            // sleep() рантайма симулятора здесь не используется, см. §2 плана.
            lua: (block, gen) => `__wait_seconds(${gen.valueToCode(block, 'SECONDS', 0) || '1'})\n`,
            python: (block, gen) => `time.sleep(${gen.valueToCode(block, 'SECONDS', 0) || '1'})\n`
        },
        apiUsage: { lua: ['__wait_seconds'], python: ['time.sleep'] }
    });

    definePioneerBlock({
        type: 'pioneer_time',
        category: 'time',
        init(this: Blockly.Block) {
            this.appendDummyInput().appendField('секунд с начала программы');
            this.setOutput(true, 'Number');
            this.setColour('#f59e0b');
            this.setTooltip('Время в секундах с момента запуска программы.');
        },
        targets: {
            lua: () => ['(time() - __t0)', 0] as [string, number],
            python: (block, gen) => {
                ensurePythonTimeOrigin(gen);
                return ['(time.time() - _pioneer_t0)', 0] as [string, number];
            }
        },
        apiUsage: { lua: ['time'], python: ['time.time'] }
    });
}
