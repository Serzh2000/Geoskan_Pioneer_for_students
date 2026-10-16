import * as Blockly from 'blockly';
import { definePioneerBlock } from '../registry.js';
import { installWaitModelGuards } from '../wait-model-guards.js';
import { definitionsOf, distinctFunctionName, ensurePythonThreads, pythonBody, pythonGlobalsLine } from './shared.js';

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

    // «Ждать, пока условие» — опрос, как `while camera.checkRequestShot() == -1
    // do end` в официальном take_photo_video.lua или ожидание тумблера пульта в
    // rc_script_start.lua. В Lua это переход-опрос автомата (Timer.callLater
    // раз в 0.05 с), а не пустой цикл: пустой цикл занял бы скрипт целиком, и
    // callback(event) не получил бы ни одного события.
    definePioneerBlock({
        type: 'pioneer_wait_until',
        category: 'time',
        init(this: Blockly.Block) {
            this.appendValueInput('CONDITION').setCheck('Boolean').appendField('Ждать, пока');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#f59e0b');
            this.setTooltip('Приостанавливает программу, пока условие не станет истинным. Условие проверяется 20 раз в секунду.');
            installWaitModelGuards(this);
        },
        targets: {
            lua: (block, gen) => `__wait_poll(${gen.valueToCode(block, 'CONDITION', 0) || 'false'})\n`,
            python: (block, gen) => {
                const condition = gen.valueToCode(block, 'CONDITION', 0) || 'False';
                return `while not (${condition}):\n${gen.INDENT}pass\n`;
            }
        },
        apiUsage: { lua: ['__wait_poll'], python: [] }
    });

    // «Каждые N сек» — Timer.new(период, функция):start() из официальных
    // примеров (example_get_accel.lua и все остальные «датчик → светодиоды»).
    // Первый вызов — через период после старта, как у Timer.new. В Python —
    // фоновый поток с той же паузой перед каждым вызовом.
    definePioneerBlock({
        type: 'pioneer_every',
        category: 'time',
        init(this: Blockly.Block) {
            this.appendValueInput('SECONDS').setCheck('Number').appendField('Каждые');
            this.appendDummyInput()
                .appendField('сек, таймер')
                .appendField(new Blockly.FieldTextInput('таймер'), 'NAME');
            this.appendStatementInput('DO');
            this.setInputsInline(true);
            this.setColour('#f59e0b');
            this.setTooltip('Повторяет блоки внутри с заданным периодом, пока работает программа или пока таймер не остановят блоком «Остановить таймер».');
        },
        targets: {
            lua: (block, gen) => {
                ensureLuaTimers(gen);
                const name = timerName(block);
                const seconds = gen.valueToCode(block, 'SECONDS', 0) || '1';
                const body = gen.statementToCode(block, 'DO');
                return `__timers[${name}] = Timer.new(${seconds}, function()\n${body}end)\n__timers[${name}]:start()\n`;
            },
            python: (block, gen) => {
                ensurePythonThreads(gen);
                const fn = distinctFunctionName(gen, '_pioneer_every');
                const indent = gen.INDENT;
                const seconds = gen.valueToCode(block, 'SECONDS', 0) || '1';
                const body = gen.prefixLines(pythonBody(gen, block, 'DO'), indent);
                definitionsOf(gen)[`pioneer_every_${fn}`] = `def ${fn}():\n${pythonGlobalsLine(gen, block)}`
                    + `${indent}period = ${seconds}\n`
                    + `${indent}while True:\n`
                    + `${indent}${indent}time.sleep(period)\n`
                    + `${indent}${indent}if ${timerName(block)} in _pioneer_stopped:\n`
                    + `${indent}${indent}${indent}return\n`
                    + body;
                return `_pioneer_start_thread(${fn})\n`;
            }
        },
        apiUsage: { lua: ['Timer.new', 'start'], python: ['_pioneer_start_thread', 'time.sleep'] }
    });

    definePioneerBlock({
        type: 'pioneer_every_stop',
        category: 'time',
        init(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('Остановить таймер')
                .appendField(new Blockly.FieldTextInput('таймер'), 'NAME');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#f59e0b');
            this.setTooltip('Останавливает повтор «Каждые N сек» с этим именем. Уже начатый повтор досчитается до конца.');
        },
        targets: {
            lua: (block, gen) => {
                ensureLuaTimers(gen);
                const name = timerName(block);
                return `if __timers[${name}] then __timers[${name}]:stop() end\n`;
            },
            python: (block, gen) => {
                ensurePythonThreads(gen);
                return `_pioneer_stopped.add(${timerName(block)})\n`;
            }
        },
        apiUsage: { lua: ['stop'], python: ['_pioneer_stopped.add'] }
    });

    // «Через N сек» — Timer.callLater(задержка, функция): программа идёт
    // дальше сразу, а блоки внутри выполнятся позже. Так официальные примеры
    // откладывают взлёт и посадку (example_go_to_point.lua).
    definePioneerBlock({
        type: 'pioneer_after',
        category: 'time',
        init(this: Blockly.Block) {
            this.appendValueInput('SECONDS').setCheck('Number').appendField('Через');
            this.appendDummyInput().appendField('сек выполнить');
            this.appendStatementInput('DO');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#f59e0b');
            this.setTooltip('Не останавливает программу: блоки внутри выполнятся через заданное время, а следующие блоки — сразу.');
        },
        targets: {
            lua: (block, gen) => {
                const seconds = gen.valueToCode(block, 'SECONDS', 0) || '1';
                return `Timer.callLater(${seconds}, function()\n${gen.statementToCode(block, 'DO')}end)\n`;
            },
            python: (block, gen) => {
                ensurePythonThreads(gen);
                const fn = distinctFunctionName(gen, '_pioneer_after');
                const seconds = gen.valueToCode(block, 'SECONDS', 0) || '1';
                definitionsOf(gen)[`pioneer_after_${fn}`] = `def ${fn}(delay):\n${pythonGlobalsLine(gen, block)}`
                    + `${gen.INDENT}time.sleep(delay)\n${pythonBody(gen, block, 'DO')}`;
                return `_pioneer_start_thread(${fn}, ${seconds})\n`;
            }
        },
        apiUsage: { lua: ['Timer.callLater'], python: ['_pioneer_start_thread', 'time.sleep'] }
    });
}

function ensureLuaTimers(gen: Blockly.CodeGenerator): void {
    definitionsOf(gen).pioneer_timers = 'local __timers = {}';
}

// Имя таймера — строковый литерал, одинаково читаемый Lua и Python.
function timerName(block: Blockly.Block): string {
    // Без кавычек, обратной косой и управляющих символов — литерал не сломается.
    const raw = Array.from(String(block.getFieldValue('NAME') ?? ''))
        .filter((char) => char >= ' ' && char !== '"' && char !== '\\')
        .join('')
        .trim();
    return `"${raw || 'таймер'}"`;
}
