import * as Blockly from 'blockly';
import { luaGenerator } from 'blockly/lua';
import { luaApiDocsEvents, luaApiEventLabels } from '../../../docs/lua-api-docs-events.js';

// ============================================================================
// ТАБЛИЦА СООТВЕТСТВИЯ БЛОКОВ
// ============================================================================
// Сопоставление: тип блока Blockly <-> Lua API вызов <-> FSM событие / рантайм-функция
//
// Учебные блоки (явно зарегистрированные, не перезаписываются каталогом):
//   lua_ledbar_new        | Ledbar.new(count)            | js_init_leds(count)           — инициализация LED-ленты
//   lua_led_set           | leds:set(index, r, g, b)    | js_ledbar_set(index,r,g,b)   — установка цвета светодиода
//   lua_timer_calllater   | Timer.callLater(delay, fn)   | js_timer_callLater(delay,fn)  — однократный таймер
//   lua_print             | print(value)                 | js_print(str)                 — вывод в консоль
//   lua_ap_push           | ap.push(event)               | js_ap_push(event)            — отправка команды автопилоту
//   lua_event_callback    | if event == Ev.X then ...    | callback(event)              — проверка события в callback
//   lua_goto_local_point  | ap.goToLocalPoint(x,y,z)     | js_ap_goToLocalPoint(x,y,z)  — полёт в локальную точку
//   lua_callback_open     | function callback(event)     | (заглушка, код генерируется) — начало функции callback
//   lua_callback_end      | end                          | (заглушка)                   — конец функции callback
//   lua_variables_set     | var = value                  | (стандартный Lua)            — присваивание переменной
//   lua_variables_get     | var                          | (стандартный Lua)            — чтение переменной
//
// Динамические API-блоки (генерируются из lua-api-docs каталогом):
//   ap.push               | ap.push(event)               | js_ap_push(event)
//   ap.goToLocalPoint     | ap.goToLocalPoint(x,y,z[,t]) | js_ap_goToLocalPoint(x,y,z,t)
//   ap.goToPoint          | ap.goToPoint(lat,lon,alt)    | js_ap_goToPoint(lat,lon,alt)
//   ap.updateYaw          | ap.updateYaw(angle)          | js_ap_updateYaw(angle)
//   Timer.callLater       | Timer.callLater(delay,fn)     | js_timer_callLater(delay,fn)
//   Timer.new             | Timer.new(period,fn)          | js_timer_new(period,fn)
//   Timer.start           | timer:start()                 | (Fengari C)
//   Timer.stop            | timer:stop()                  | (Fengari C)
//   Timer.callAt          | Timer.callAt(time,fn)         | (Fengari C)
//   Timer.callAtGlobal    | Timer.callAtGlobal(time,fn)   | (Fengari C)
//   Ledbar.new            | Ledbar.new(count)             | js_init_leds(count)
//   Ledbar.fromHSV        | Ledbar.fromHSV(h,s,v)         | js_ledbar_fromHSV(h,s,v)
//   Ledbar:set            | leds:set(index,r,g,b[,w])     | js_ledbar_set(index,r,g,b,w)
//   Sensors.lpsPosition   | Sensors.lpsPosition()         | js_sensors_pos()
//   Sensors.lpsVelocity   | Sensors.lpsVelocity()         | js_sensors_vel()
//   Sensors.lpsYaw        | Sensors.lpsYaw()              | (Fengari C)
//   Sensors.orientation   | Sensors.orientation()         | js_sensors_orientation()
//   Sensors.altitude      | Sensors.altitude()            | (Fengari C)
//   Sensors.accel         | Sensors.accel()               | js_sensors_accel()
//   Sensors.gyro          | Sensors.gyro()                | js_sensors_gyro()
//   Sensors.rc            | Sensors.rc()                  | js_sensors_rc()
//   Sensors.battery       | Sensors.battery()             | js_sensors_battery()
//   Sensors.range         | Sensors.range()               | js_sensors_range()
//   Sensors.tof           | Sensors.tof()                 | js_sensors_tof()
//   camera.requestMakeShot| camera.requestMakeShot()      | js_camera_requestMakeShot()
//   camera.checkRequestShot| camera.checkRequestShot()    | js_camera_checkRequestShot()
//   camera.requestRecordStart| camera.requestRecordStart()| js_camera_requestRecordStart()
//   camera.requestRecordStop| camera.requestRecordStop()  | js_camera_requestRecordStop()
//   camera.checkRequestRecord| camera.checkRequestRecord()| js_camera_checkRequestRecord()
//   time                  | time()                        | js_sys_time()
//   launchTime            | launchTime()                  | (заглушка)
//   deltaTime             | deltaTime()                   | js_sys_deltaTime()
//   sleep                 | sleep(sec)                    | js_sleep(sec)
//   boardNumber           | boardNumber()                 | (константа "SIMULATOR")
//   Gpio.new              | Gpio.new(port,pin,mode)       | js_gpio_new(port,pin,mode)
//   Gpio.read             | gpio:read()                   | (Fengari C)
//   Gpio.set              | gpio:set()                    | (Fengari C)
//   Gpio.reset            | gpio:reset()                  | (Fengari C)
//   Gpio.write            | gpio:write(val)               | (Fengari C)
//   Gpio.setFunction      | gpio:setFunction(func)        | (Fengari C)
//   Uart.new              | Uart.new(num,rate)            | js_uart_new(num,rate)
//   Uart.read             | uart:read(bytes)              | (Fengari C)
//   Uart.write            | uart:write(data)              | (Fengari C)
//   Uart.bytesToRead      | uart:bytesToRead()            | (Fengari C)
//   Uart.setBaudRate      | uart:setBaudRate(rate)        | (Fengari C)
//   Spi.new               | Spi.new(num,rate)             | js_spi_new(num,rate)
//   Spi.read              | spi:read(count)               | (Fengari C)
//   Spi.write             | spi:write(data)               | (Fengari C)
//   Spi.exchange           | spi:exchange(data)            | (Fengari C)
//   mailbox.connect       | mailbox.connect(server)       | (Fengari C)
//   mailbox.hasMessages   | mailbox.hasMessages()         | (Fengari C)
//   mailbox.myHullNumber  | mailbox.myHullNumber()        | (Fengari C)
//   mailbox.receive       | mailbox.receive([wait])       | (Fengari C)
//   mailbox.send          | mailbox.send(to,data)         | (Fengari C)
//   mailbox.setHullNumber | mailbox.setHullNumber(num)    | (Fengari C)
//
// Событийные константы (Ev.*) — выводятся в dropdown блоков lua_ap_push / lua_event_callback
// из luaApiDocsEvents (lua-api-docs-events.ts) и в lua_event_constant из evConstants (api-constants.ts).
// ============================================================================

// События, отправляемые В автопилот (ap.push), — согласно API-документации.
function getToAutopilotEvents(): string[] {
    return Object.entries(luaApiDocsEvents)
        .filter(([, doc]) => doc.direction === 'to-autopilot')
        .map(([key]) => key.replace(/^Ev\./, ''));
}

// События, принимаемые ОТ автопилота (callback(event)), — согласно API-документации.
function getFromAutopilotEvents(): string[] {
    return Object.entries(luaApiDocsEvents)
        .filter(([, doc]) => doc.direction === 'from-autopilot')
        .map(([key]) => key.replace(/^Ev\./, ''));
}

function getAutopilotEventOptions(eventNames: string[]): [string, string][] {
    return eventNames.map((eventName) => [luaApiEventLabels[eventName] || eventName, `Ev.${eventName}`]);
}

function describeEvent(eventName: string): string {
    return luaApiDocsEvents[`Ev.${eventName}`]?.desc || 'Событие автопилота.';
}

export function registerLuaBlocklyDefinitions(): void {
    // ==========================================================================
    // 1. LED-лента: инициализация и установка цвета
    // ==========================================================================
    Blockly.Blocks['lua_ledbar_new'] = {
        init: function() {
            this.appendDummyInput()
                .appendField('Создать линейку светодиодов с количеством');
            this.appendValueInput('COUNT')
                .setCheck('Number')
                .setAlign(Blockly.inputs.Align.RIGHT)
                .appendField('штук');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip('Инициализирует светодиодную ленту с указанным количеством светодиодов: local leds = Ledbar.new(count).');
        }
    };
    luaGenerator.forBlock.lua_ledbar_new = (block: any) => {
        const count = luaGenerator.valueToCode(block, 'COUNT', 0) || '29';
        return `local leds = Ledbar.new(${count})\n`;
    };

    Blockly.Blocks['lua_led_set'] = {
        init: function() {
            this.appendDummyInput()
                .appendField('установить для светодиода');
            this.appendValueInput('INDEX')
                .setCheck('Number')
                .setAlign(Blockly.inputs.Align.RIGHT);
            this.appendValueInput('R')
                .setCheck('Number')
                .setAlign(Blockly.inputs.Align.RIGHT)
                .appendField('цвет R');
            this.appendValueInput('G')
                .setCheck('Number')
                .setAlign(Blockly.inputs.Align.RIGHT)
                .appendField('G');
            this.appendValueInput('B')
                .setCheck('Number')
                .setAlign(Blockly.inputs.Align.RIGHT)
                .appendField('B');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip('Устанавливает цвет указанного светодиода LED-ленты (R, G, B от 0 до 1).');
        }
    };
    luaGenerator.forBlock.lua_led_set = (block: any) => {
        const index = luaGenerator.valueToCode(block, 'INDEX', 0) || '0';
        const r = luaGenerator.valueToCode(block, 'R', 0) || '0';
        const g = luaGenerator.valueToCode(block, 'G', 0) || '0';
        const b = luaGenerator.valueToCode(block, 'B', 0) || '0';
        return `leds:set(${index}, ${r}, ${g}, ${b})\n`;
    };

    // ==========================================================================
    // 2. Таймер: однократный вызов через задержку
    // ==========================================================================
    Blockly.Blocks['lua_timer_calllater'] = {
        init: function() {
            this.appendDummyInput()
                .appendField('через')
                .appendField(new Blockly.FieldNumber(0.5, 0), 'DELAY')
                .appendField('сек сделать:');
            this.appendStatementInput('CALLBACK').setCheck(null);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip('Откладывает выполнение вложенных блоков через указанную задержку (в секундах): Timer.callLater(delay, function() ... end).');
        }
    };
    luaGenerator.forBlock.lua_timer_calllater = (block: any) =>
        `Timer.callLater(${block.getFieldValue('DELAY')}, function()\n${luaGenerator.statementToCode(block, 'CALLBACK') || ''}end)\n`;

    // ==========================================================================
    // 3. Печать: print(value) с интеллектуальным форматированием
    // ==========================================================================
    Blockly.Blocks['lua_print'] = {
        init: function() {
            this.appendValueInput('VALUE')
                .setCheck(null)
                .appendField('print(')
                .appendField(new Blockly.FieldTextInput('сообщение'), 'TEXT')
                .appendField(')');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip('Выводит сообщение или значение переменной в консоль. Поддерживает переменные и текстовые строки.');
        }
    };

    function formatLuaPrintCode(block: any): string {
        const valueInput = block.getInput('VALUE');
        if (valueInput && valueInput.connection && valueInput.connection.targetBlock()) {
            const valueCode = luaGenerator.valueToCode(block, 'VALUE', 99);
            return `print(${valueCode})\n`;
        }

        const textValue = block.getFieldValue('TEXT') || '';

        if (textValue.length > 0) {
            const isQuoted = (textValue.startsWith('"') && textValue.endsWith('"')) ||
                            (textValue.startsWith("'") && textValue.endsWith("'"));

            const isNaturalLanguage = /[^a-zA-Z0-9_]/.test(textValue) &&
                                    (/[а-яА-ЯёЁ]/.test(textValue) ||
                                     /[.,!?]/.test(textValue) ||
                                     (textValue.trim().length > 1 && !textValue.includes('_')));

            const isVariable = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(textValue);
            const hasParentheses = textValue.includes('(') && textValue.includes(')');

            if (isQuoted || isNaturalLanguage || hasParentheses) {
                return `print(${JSON.stringify(textValue)})\n`;
            } else if (isVariable) {
                return `print(${textValue})\n`;
            } else {
                return `print(${JSON.stringify(textValue)})\n`;
            }
        }

        return 'print()\n';
    }

    luaGenerator.forBlock.lua_print = (block: any) => formatLuaPrintCode(block);

    // ==========================================================================
    // 4. Отправка события автопилоту: ap.push(Ev.X)
    // ==========================================================================
    Blockly.Blocks['lua_ap_push'] = {
        init: function() {
            const toAutopilotEvents = getToAutopilotEvents();
            this.appendDummyInput()
                .appendField('отправить событие автопилоту')
                .appendField(new Blockly.FieldDropdown(
                    getAutopilotEventOptions(toAutopilotEvents)
                ), 'EVENT');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
            this.setTooltip('Отправляет событие в автопилот: ap.push(Ev.X). Доступны только события «в автопилот» из API-документации.');
        }
    };
    luaGenerator.forBlock.lua_ap_push = (block: any) => `ap.push(${block.getFieldValue('EVENT')})\n`;

    // ==========================================================================
    // 5. Проверка события в callback: if event == Ev.X then ... end
    // ==========================================================================
    Blockly.Blocks['lua_event_callback'] = {
        init: function() {
            const fromAutopilotEvents = getFromAutopilotEvents();
            this.appendDummyInput()
                .appendField('если получено событие')
                .appendField(new Blockly.FieldDropdown(
                    getAutopilotEventOptions(fromAutopilotEvents)
                ), 'EVENT');
            this.appendStatementInput('DO').setCheck(null).appendField('то');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip('Проверяет, совпадает ли текущее событие с указанным. Используется внутри функции callback(event).');
        }
    };
    luaGenerator.forBlock.lua_event_callback = (block: any) =>
        `if event == ${block.getFieldValue('EVENT')} then\n${luaGenerator.statementToCode(block, 'DO') || ''}end\n`;

    // ==========================================================================
    // 6. Полёт в локальную точку: ap.goToLocalPoint(x, y, z)
    // ==========================================================================
    Blockly.Blocks['lua_goto_local_point'] = {
        init: function() {
            this.appendDummyInput()
                .appendField('ap.goToLocalPoint(')
                .appendField(new Blockly.FieldNumber(1), 'X')
                .appendField(',')
                .appendField(new Blockly.FieldNumber(0), 'Y')
                .appendField(',')
                .appendField(new Blockly.FieldNumber(1), 'Z')
                .appendField(')');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
            this.setTooltip('Перемещает дрон к указанной точке в локальной системе координат (координаты в метрах).');
        }
    };
    luaGenerator.forBlock.lua_goto_local_point = (block: any) =>
        `ap.goToLocalPoint(${block.getFieldValue('X')}, ${block.getFieldValue('Y')}, ${block.getFieldValue('Z')})\n`;

    // ==========================================================================
    // 7. Callback-функция: function callback(event) ... end
    // ==========================================================================
    Blockly.Blocks.lua_callback_open = {
        init: function() {
            this.appendDummyInput().appendField('открыть взаимодействие с автопилотом');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip('Открывает обязательный обработчик системных событий Lua. Все события приходят через эту функцию.');
        }
    };
    luaGenerator.forBlock.lua_callback_open = () => 'function callback(event)\n';

    Blockly.Blocks.lua_callback_end = {
        init: function() {
            this.appendDummyInput().appendField('закрыть взаимодействие с автопилотом');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip('Закрывает функцию callback(event). Все обработчики событий должны быть внутри этой функции.');
        }
    };
    luaGenerator.forBlock.lua_callback_end = () => 'end\n';

    // Устаревший блок-шампур (deprecated), оставлен для обратной совместимости.
    Blockly.Blocks['lua-callback-stub'] = {
        init: function() {
            this.appendDummyInput().appendField('function callback(event) ... end');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip('Устаревший блок callback. Рекомендуется использовать отдельные блоки callback_open и callback_end.');
        }
    };
    luaGenerator.forBlock['lua-callback-stub'] = () => '';

    // ==========================================================================
    // 8. Переменные: присваивание и чтение
    // ==========================================================================
    Blockly.Blocks.lua_variables_set = {
        init: function() {
            this.appendDummyInput()
                .appendField('переменная =')
                .appendField(new Blockly.FieldVariable('my_variable'), 'VAR');
            this.appendValueInput('VALUE')
                .appendField('=');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(330);
        }
    };
    luaGenerator.forBlock.lua_variables_set = (block: any) => {
        const varName = block.getFieldValue('VAR');
        const valueCode = luaGenerator.valueToCode(block, 'VALUE', 2) || '';
        return `${varName} = ${valueCode}\n`;
    };

    Blockly.Blocks.lua_variables_get = {
        init: function() {
            this.appendDummyInput()
                .appendField(new Blockly.FieldVariable('my_variable'), 'VAR');
            this.setOutput(true, null);
            this.setColour(330);
        }
    };
    luaGenerator.forBlock.lua_variables_get = (block: any) => {
        const varName = luaGenerator.getVariableName(block.getFieldValue('VAR'));
        return [varName, 0];
    };
}
