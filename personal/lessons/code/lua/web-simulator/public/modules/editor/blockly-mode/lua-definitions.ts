import * as Blockly from 'blockly';
import { luaGenerator } from 'blockly/lua';
import type { ScriptLanguage } from '../../core/state.js';

// ============================================================================
// ЦВЕТА БЛОКОВ (идентичны Python-блокам из python-definitions.ts)
// ============================================================================
const COLOR_FLIGHT = 290;     // Полётные блоки (ap.push, goToLocalPoint, takeoff и т.д.)
const COLOR_LED = 160;        // Светодиоды (Ledbar, led_control)
const COLOR_CONTROL = 230;    // Управление (Timer, sleep, waiting_for_point)
const COLOR_LOGIC = 210;      // Логика (callback, event_callback)
const COLOR_VAR = 330;        // Переменные
const COLOR_SENSORS = 290;    // Сенсоры и данные

// ============================================================================
// 1. ПОЛЕТНЫЕ БЛОКИ (Flight)
// ============================================================================

// lua_go_to_local_point -- идентичен Python go_local_point по форме.
// Угол рысканья НЕ входит в блок: по Lua API ap.goToLocalPoint(x, y, z, [time]),
// а угол задаётся отдельным блоком «Установить угол рысканья» (ap.updateYaw).
Blockly.Blocks['lua_go_to_local_point'] = {
    init() {
        this.appendDummyInput().appendField('Лететь в локальные координаты');
        this.appendValueInput('X').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('X');
        this.appendValueInput('Y').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Y');
        this.appendValueInput('Z').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Z');
        this.appendValueInput('TIME').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('за время');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(COLOR_FLIGHT);
        this.setTooltip('Перемещает дрон к точке в локальной системе координат (метры): ap.goToLocalPoint(x, y, z, time). Угол рысканья задаётся отдельным блоком «Установить угол рысканья».');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_go_to_local_point'] = (block) => {
    const x = luaGenerator.valueToCode(block, 'X', 0) || '0';
    const y = luaGenerator.valueToCode(block, 'Y', 0) || '0';
    const z = luaGenerator.valueToCode(block, 'Z', 0) || '0';
    const time = luaGenerator.valueToCode(block, 'TIME', 0);
    if (time) {
        return `ap.goToLocalPoint(${x}, ${y}, ${z}, ${time})\n`;
    }
    return `ap.goToLocalPoint(${x}, ${y}, ${z})\n`;
};

// lua_go_to_local_point_bf -- body_fixed, идентичен python go_local_point_body_fixed.
// Как и в обычном блоке, угол рысканья задаётся отдельно (ap.updateYaw).
Blockly.Blocks['lua_go_to_local_point_bf'] = {
    init() {
        this.appendDummyInput().appendField('Лететь в связанные координаты');
        this.appendValueInput('X').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('X');
        this.appendValueInput('Y').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Y');
        this.appendValueInput('Z').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Z');
        this.appendValueInput('TIME').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('за время');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(COLOR_FLIGHT);
        this.setTooltip('Перемещение в связанной с дроном системе координат: ap.goToLocalPointBodyFixed(x, y, z, time). Угол рысканья задаётся отдельным блоком «Установить угол рысканья».');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_go_to_local_point_bf'] = (block) => {
    const x = luaGenerator.valueToCode(block, 'X', 0) || '0';
    const y = luaGenerator.valueToCode(block, 'Y', 0) || '0';
    const z = luaGenerator.valueToCode(block, 'Z', 0) || '0';
    const time = luaGenerator.valueToCode(block, 'TIME', 0);
    if (time) {
        return `ap.goToLocalPointBodyFixed(${x}, ${y}, ${z}, ${time})\n`;
    }
    return `ap.goToLocalPointBodyFixed(${x}, ${y}, ${z})\n`;
};

// lua_takeoff -- команда взлета. Обработка подтверждения — в callback(event) / FSM-статусах (TAKEOFF_COMPLETE, COPTER_LANDED и т.д.)
Blockly.Blocks['lua_takeoff'] = {
    init() {
        this.appendDummyInput().appendField('Взлет');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(COLOR_FLIGHT);
        this.setTooltip('Отправляет команду взлета: ap.push(Ev.MCE_TAKEOFF). Ожидание подтверждения в callback(event): if event == Ev.TAKEOFF_COMPLETE then ap.push(Ev.MCE_LANDING) end.');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_takeoff'] = () => 'ap.push(Ev.MCE_TAKEOFF)\n';

// lua_landing -- команда посадки. Обработка подтверждения — в callback(event) / FSM-статусах (TAKEOFF_COMPLETE, COPTER_LANDED и т.д.)
Blockly.Blocks['lua_landing'] = {
    init() {
        this.appendDummyInput().appendField('Посадка');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(COLOR_FLIGHT);
        this.setTooltip('Отправляет команду посадки: ap.push(Ev.MCE_LANDING). Ожидание подтверждения в callback(event): if event == Ev.COPTER_LANDED then ap.push(Ev.ENGINES_DISARM) end.');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_landing'] = () => 'ap.push(Ev.MCE_LANDING)\n';

// lua_preflight -- команда предполетной подготовки (армирование). Обработка подтверждения — в callback(event) / FSM-статусах (TAKEOFF_COMPLETE, COPTER_LANDED и т.д.)
Blockly.Blocks['lua_preflight'] = {
    init() {
        this.appendDummyInput().appendField('Предполетная подготовка');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(COLOR_FLIGHT);
        this.setTooltip('Отправляет команду предполетной подготовки (армирование): ap.push(Ev.MCE_PREFLIGHT). Ожидание подтверждения в callback(event): if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end.');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_preflight'] = () => 'ap.push(Ev.MCE_PREFLIGHT)\n';

// lua_engines_disarm -- команда отключения двигателей. Обработка подтверждения — в callback(event) / FSM-статусах (TAKEOFF_COMPLETE, COPTER_LANDED и т.д.)
Blockly.Blocks['lua_engines_disarm'] = {
    init() {
        this.appendDummyInput().appendField('Заглушить двигатели');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(COLOR_FLIGHT);
        this.setTooltip('Отправляет команду отключения двигателей: ap.push(Ev.ENGINES_DISARM).');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_engines_disarm'] = () => 'ap.push(Ev.ENGINES_DISARM)\n';

// ============================================================================
// 2.1. АВТОПИЛОТНЫЕ КОМАНДЫ И СОБЫТИЯ (Autopilot callback)
// ============================================================================

import { luaApiDocsEvents, luaApiEventLabels } from '../../docs/lua-api-docs-events.js';

function getAutopilotEventOptions(eventNames: string[]): [string, string][] {
    return eventNames.map((eventName) => [luaApiEventLabels[eventName] || eventName, `Ev.${eventName}`]);
}

function getToAutopilotEvents(): string[] {
    return Object.entries(luaApiDocsEvents)
        .filter(([, doc]) => doc.direction === 'to-autopilot')
        .map(([key]) => key.replace(/^Ev\./, ''));
}

function getFromAutopilotEvents(): string[] {
    return Object.entries(luaApiDocsEvents)
        .filter(([, doc]) => doc.direction === 'from-autopilot')
        .map(([key]) => key.replace(/^Ev\./, ''));
}

// lua_ap_push -- отправить событие автопилоту (dropdown из to-autopilot)
Blockly.Blocks['lua_ap_push'] = {
    init() {
        const toAutopilotEvents = getToAutopilotEvents();
        this.appendDummyInput()
            .appendField('отправить событие автопилоту')
            .appendField(new Blockly.FieldDropdown(
                getAutopilotEventOptions(toAutopilotEvents)
            ), 'EVENT');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(COLOR_FLIGHT);
        this.setTooltip('Отправляет событие в автопилот: ap.push(Ev.X). Доступны только события «в автопилот» из API-документации.');
    }
};
luaGenerator.forBlock['lua_ap_push'] = (block: any) => `ap.push(${block.getFieldValue('EVENT')})\n`;

// lua_event_callback -- если событие от автопилота == (dropdown из from-autopilot)
Blockly.Blocks['lua_event_callback'] = {
    init() {
        const fromAutopilotEvents = getFromAutopilotEvents();
        this.appendDummyInput()
            .appendField('если получено событие')
            .appendField(new Blockly.FieldDropdown(
                getAutopilotEventOptions(fromAutopilotEvents)
            ), 'EVENT');
        this.appendStatementInput('DO').setCheck(null).appendField('то');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(COLOR_LOGIC);
        this.setTooltip('Проверяет, совпадает ли текущее событие с указанным. Используется внутри функции callback(event).');
    }
};
luaGenerator.forBlock['lua_event_callback'] = (block: any) =>
    `if event == ${block.getFieldValue('EVENT')} then\n${luaGenerator.statementToCode(block, 'DO') || ''}end\n`;

// lua_callback_open -- function callback(event)
Blockly.Blocks['lua_callback_open'] = {
    init() {
        this.appendDummyInput().appendField('открыть взаимодействие с автопилотом');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(COLOR_LOGIC);
        this.setTooltip('Открывает обязательный обработчик системных событий Lua. Все события приходят через эту функцию.');
    }
};
luaGenerator.forBlock['lua_callback_open'] = () => 'function callback(event)\n';

// lua_callback_end -- end
Blockly.Blocks['lua_callback_end'] = {
    init() {
        this.appendDummyInput().appendField('закрыть взаимодействие с автопилотом');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(COLOR_LOGIC);
        this.setTooltip('Закрывает функцию callback(event). Все обработчики событий должны быть внутри этой функции.');
    }
};
luaGenerator.forBlock['lua_callback_end'] = () => 'end\n';

// lua_waiting_for_point -- аналог Python waiting_for_point
Blockly.Blocks['lua_waiting_for_point'] = {
    init() {
        this.appendDummyInput().appendField('Ожидать достижения точки');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(COLOR_CONTROL);
        this.setTooltip('Цикл ожидания достижения целевой точки дроном.');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_waiting_for_point'] = () => 'while not ap.point_reached() do\n    task.wait(0.1)\nend\n';

// lua_not_point_reached -- value-блок, аналог Python not_point_reached
Blockly.Blocks['lua_not_point_reached'] = {
    init() {
        this.appendDummyInput().appendField('не достигнута точка');
        this.setOutput(true, 'Boolean');
        this.setColour(COLOR_LOGIC);
        this.setTooltip('Возвращает True, пока целевая точка ещё не достигнута: not ap.point_reached().');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_not_point_reached'] = () => ['not ap.point_reached()', 0];

// lua_point_reached -- value-блок
Blockly.Blocks['lua_point_reached'] = {
    init() {
        this.appendDummyInput().appendField('достигнута точка');
        this.setOutput(true, 'Boolean');
        this.setColour(COLOR_LOGIC);
        this.setTooltip('Возвращает True, когда точка достигнута: ap.point_reached().');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_point_reached'] = () => ['ap.point_reached()', 0];

// lua_update_yaw -- установка угла рысканья: ap.updateYaw(angle), угол в радианах
Blockly.Blocks['lua_update_yaw'] = {
    init() {
        this.appendDummyInput().appendField('Установить угол рысканья');
        this.appendValueInput('YAW').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT);
        this.appendDummyInput().appendField('(в радианах)');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(COLOR_FLIGHT);
        this.setTooltip('Устанавливает угол рысканья (курс) дрона в радианах: ap.updateYaw(angle).');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_update_yaw'] = (block) => {
    const yaw = luaGenerator.valueToCode(block, 'YAW', 0) || '0';
    return `ap.updateYaw(${yaw})\n`;
};

// lua_set_manual_speed -- идентичен Python set_manual_speed
Blockly.Blocks['lua_set_manual_speed'] = {
    init() {
        this.appendDummyInput().appendField('Установить скорость полета');
        this.appendValueInput('VX').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Vx');
        this.appendValueInput('VY').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Vy');
        this.appendValueInput('VZ').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Vz');
        this.appendValueInput('VYAW').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Vyaw');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(COLOR_FLIGHT);
        this.setTooltip('Устанавливает скорость полета: ap.setManualSpeed(vx, vy, vz, vyaw).');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_set_manual_speed'] = (block) => {
    const vx = luaGenerator.valueToCode(block, 'VX', 0) || '0';
    const vy = luaGenerator.valueToCode(block, 'VY', 0) || '0';
    const vz = luaGenerator.valueToCode(block, 'VZ', 0) || '0';
    const vyaw = luaGenerator.valueToCode(block, 'VYAW', 0) || '0';
    return `ap.setManualSpeed(${vx}, ${vy}, ${vz}, ${vyaw})\n`;
};

// lua_set_manual_speed_bf -- body_fixed
Blockly.Blocks['lua_set_manual_speed_bf'] = {
    init() {
        this.appendDummyInput().appendField('Установить скорость в связ. СК');
        this.appendValueInput('VX').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Vx');
        this.appendValueInput('VY').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Vy');
        this.appendValueInput('VZ').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Vz');
        this.appendValueInput('VYAW').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Vyaw');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(COLOR_FLIGHT);
        this.setTooltip('Устанавливает скорость полета в связанной СК: ap.setManualSpeedBodyFixed(vx, vy, vz, vyaw).');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_set_manual_speed_bf'] = (block) => {
    const vx = luaGenerator.valueToCode(block, 'VX', 0) || '0';
    const vy = luaGenerator.valueToCode(block, 'VY', 0) || '0';
    const vz = luaGenerator.valueToCode(block, 'VZ', 0) || '0';
    const vyaw = luaGenerator.valueToCode(block, 'VYAW', 0) || '0';
    return `ap.setManualSpeedBodyFixed(${vx}, ${vy}, ${vz}, ${vyaw})\n`;
};

// ============================================================================
// 2. СВЕТОДИОДЫ (LED)
// ============================================================================

// lua_led_all -- аналог Python led_all, использует Ledbar:set для всех светодиодов
Blockly.Blocks['lua_led_all'] = {
    init() {
        this.appendDummyInput().appendField('Включить все светодиоды');
        this.appendValueInput('COLOR').setCheck('Colour').setAlign(Blockly.inputs.Align.RIGHT).appendField('Цвет');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(COLOR_LED);
        this.setTooltip('Устанавливает цвет всех светодиодов дрона.');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_led_all'] = (block) => {
    const color = luaGenerator.valueToCode(block, 'COLOR', 0) || "'#ffffff'";
    return `leds:set(0, ${color})\n`;
};

// lua_led_index -- идентичен Python led_index (существующий lua_led_set делает похожее)
Blockly.Blocks['lua_led_index'] = {
    init() {
        this.appendDummyInput().appendField('Включить светодиод с индексом');
        this.appendValueInput('NUM').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Индекс');
        this.appendValueInput('COLOR').setCheck('Colour').setAlign(Blockly.inputs.Align.RIGHT).appendField('Цвет');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(COLOR_LED);
        this.setTooltip('Устанавливает цвет конкретного светодиода по его номеру.');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_led_index'] = (block) => {
    const num = luaGenerator.valueToCode(block, 'NUM', 0) || '0';
    const color = luaGenerator.valueToCode(block, 'COLOR', 0) || "'#ffffff'";
    return `leds:set(${num}, ${color})\n`;
};

// ============================================================================
// 3. СЕРВОПРИВОДЫ И ЗАХВАТЫ — отсутствуют в Lua API (удалены)
// ============================================================================



// ============================================================================
// 4. ДАТЧИКИ И ТЕЛЕМЕТРИЯ (Sensors)
// ============================================================================

// lua_get_dist_sensor_data -- value-блок, аналог Python get_dist_sensor_data
Blockly.Blocks['lua_get_dist_sensor_data'] = {
    init() {
        this.appendDummyInput().appendField('расстояние до препятствия (м)');
        this.setOutput(true, 'Number');
        this.setColour(COLOR_SENSORS);
        this.setTooltip('Возвращает расстояние с дальномера в метрах: Sensors.range().');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_get_dist_sensor_data'] = () => ['Sensors.range()', 0];

// lua_get_local_position -- value-блок, аналог Python get_local_position_lps
Blockly.Blocks['lua_get_local_position'] = {
    init() {
        this.appendDummyInput().appendField('локальная позиция [x, y, z]');
        this.setOutput(true, 'Array');
        this.setColour(COLOR_SENSORS);
        this.setTooltip('Текущая LPS-координата [x, y, z]: Sensors.lpsPosition().');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_get_local_position'] = () => ['Sensors.lpsPosition()', 0];

// lua_get_local_velocity -- value-блок, аналог Python get_local_velocity_lps
Blockly.Blocks['lua_get_local_velocity'] = {
    init() {
        this.appendDummyInput().appendField('локальная скорость [vx, vy, vz]');
        this.setOutput(true, 'Array');
        this.setColour(COLOR_SENSORS);
        this.setTooltip('Текущая LPS-скорость [vx, vy, vz]: Sensors.lpsVelocity().');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_get_local_velocity'] = () => ['Sensors.lpsVelocity()', 0];

// lua_get_pv_by_index -- идентичен Python get_position_velocity_by_index
Blockly.Blocks['lua_get_pv_by_index'] = {
    init() {
        this.appendValueInput('POS_OR_VEL').appendField('Компонента');
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([
                ['Координата X', '0'],
                ['Координата Y', '1'],
                ['Координата Z', '2'],
                ['Скорость Vx', '0'],
                ['Скорость Vy', '1'],
                ['Скорость Vz', '2']
            ]), 'INDEX');
        this.setOutput(true, 'Number');
        this.setColour(COLOR_SENSORS);
        this.setTooltip('Извлекает компонент координаты или скорости по индексу [0..2].');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_get_pv_by_index'] = (block) => {
    const posOrVel = luaGenerator.valueToCode(block, 'POS_OR_VEL', 0) || '[0, 0, 0]';
    const index = block.getFieldValue('INDEX');
    return [`${posOrVel}[${index}]`, 0];
};

// lua_get_time -- value-блок, идентичен Python get_time
Blockly.Blocks['lua_get_time'] = {
    init() {
        this.appendDummyInput().appendField('Получить время (с)');
        this.setOutput(true, 'Number');
        this.setColour(COLOR_SENSORS);
        this.setTooltip('Возвращает текущее системное время в секундах: time().');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_get_time'] = () => ['time()', 0];

// lua_sleep -- идентичен Python sleep, использует LUA_SETUP_SCRIPT sleep()
Blockly.Blocks['lua_sleep'] = {
    init() {
        this.appendValueInput('NAME').setCheck('Number').appendField('Заснуть на');
        this.appendDummyInput().appendField('секунд');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(COLOR_CONTROL);
        this.setTooltip('Приостанавливает выполнение программы на указанное время в секундах.');
        this.setHelpUrl('');
    }
};
luaGenerator.forBlock['lua_sleep'] = (block) => {
    const time = luaGenerator.valueToCode(block, 'NAME', 0) || '1';
    return `sleep(${time})\n`;
};

// ============================================================================
// 5. АЛИАСЫ Lua-блоков (аналогично Python: py_*)
// ============================================================================

// Алиасы для полётных блоков
Blockly.Blocks['lua_arm'] = Blockly.Blocks['lua_preflight'];
luaGenerator.forBlock['lua_arm'] = luaGenerator.forBlock['lua_preflight'];

Blockly.Blocks['lua_disarm'] = Blockly.Blocks['lua_engines_disarm'];
luaGenerator.forBlock['lua_disarm'] = luaGenerator.forBlock['lua_engines_disarm'];

Blockly.Blocks['lua_takeoff_alias'] = Blockly.Blocks['lua_takeoff'];
luaGenerator.forBlock['lua_takeoff_alias'] = luaGenerator.forBlock['lua_takeoff'];

Blockly.Blocks['lua_land_alias'] = Blockly.Blocks['lua_landing'];
luaGenerator.forBlock['lua_land_alias'] = luaGenerator.forBlock['lua_landing'];

Blockly.Blocks['lua_goto_local_point_alias'] = Blockly.Blocks['lua_go_to_local_point'];
luaGenerator.forBlock['lua_goto_local_point_alias'] = luaGenerator.forBlock['lua_go_to_local_point'];

// Блок «Управление светодиодами id» (lua_led_control) удалён:
// вместо него используются учебные блоки «Создать линейку светодиодов»
// (lua_ledbar_new) и «установить для светодиода» (lua_led_set).

// Алиас ожидания точки
Blockly.Blocks['lua_wait_point_reached'] = Blockly.Blocks['lua_waiting_for_point'];
luaGenerator.forBlock['lua_wait_point_reached'] = luaGenerator.forBlock['lua_waiting_for_point'];

// Алиас достижения точки
Blockly.Blocks['lua_point_reached_alias'] = Blockly.Blocks['lua_point_reached'];
luaGenerator.forBlock['lua_point_reached_alias'] = luaGenerator.forBlock['lua_point_reached'];

// Алиас сенсорного расстояния
Blockly.Blocks['lua_get_sensor_distance'] = Blockly.Blocks['lua_get_dist_sensor_data'];
luaGenerator.forBlock['lua_get_sensor_distance'] = luaGenerator.forBlock['lua_get_dist_sensor_data'];

// Алиас локальной позиции
Blockly.Blocks['lua_get_local_point'] = Blockly.Blocks['lua_get_local_position'];
luaGenerator.forBlock['lua_get_local_point'] = luaGenerator.forBlock['lua_get_local_position'];

// Алиас батареи
Blockly.Blocks['lua_get_battery'] = {
    init() {
        this.appendDummyInput().appendField('напряжение батареи (В)');
        this.setOutput(true, 'Number');
        this.setColour(COLOR_SENSORS);
        this.setTooltip('Возвращает напряжение батареи в вольтах: Sensors.battery().');
    }
};
luaGenerator.forBlock['lua_get_battery'] = () => ['Sensors.battery()', 0];

// Алиас состояния автопилота (заглушка)
Blockly.Blocks['lua_get_autopilot_state'] = {
    init() {
        this.appendDummyInput().appendField('состояние автопилота');
        this.setOutput(true, 'String');
        this.setColour(COLOR_SENSORS);
        this.setTooltip('Возвращает текущее состояние автопилота. (Заглушка).');
    }
};
luaGenerator.forBlock['lua_get_autopilot_state'] = () => '-- TODO: get_autopilot_state()\n';

// Алиас времени (уже есть lua_get_time, но нужен алиас)
Blockly.Blocks['lua_get_time_alias'] = Blockly.Blocks['lua_get_time'];
luaGenerator.forBlock['lua_get_time_alias'] = luaGenerator.forBlock['lua_get_time'];

// Алиас print (уже есть lua_print, но нужен алиас)
Blockly.Blocks['lua_print_alias'] = Blockly.Blocks['lua_print'];
luaGenerator.forBlock['lua_print_alias'] = luaGenerator.forBlock['lua_print'];

// Алиас sleep (уже есть lua_sleep, но нужен алиас)
Blockly.Blocks['lua_time_sleep'] = Blockly.Blocks['lua_sleep'];
luaGenerator.forBlock['lua_time_sleep'] = luaGenerator.forBlock['lua_sleep'];

// Алиасы переменных
Blockly.Blocks['lua_variables_set_alias'] = Blockly.Blocks['lua_variables_set'];
luaGenerator.forBlock['lua_variables_set_alias'] = luaGenerator.forBlock['lua_variables_set'];

Blockly.Blocks['lua_variables_get_alias'] = Blockly.Blocks['lua_variables_get'];
luaGenerator.forBlock['lua_variables_get_alias'] = luaGenerator.forBlock['lua_variables_get'];

// ============================================================================
// ЭКСПОРТ ФУНКЦИИ РЕГИСТРАЦИИ (для использования в index.ts)
// ============================================================================

export function registerLuaEditorBlocklyDefinitions(): void {
    // Все блоки уже зарегистрированы выше через Blockly.Blocks[...]
    // Эта функция нужна для явного вызова из index.ts
}

// Список всех типов Lua-блоков для тестов и валидации
// Включает только документированные блоки (без CV-заглушек)
export const ALL_LUA_BLOCK_TYPES = [
    // Полётные блоки
    'lua_go_to_local_point',
    'lua_go_to_local_point_bf',
    'lua_takeoff',
    'lua_landing',
    'lua_preflight',
    'lua_engines_disarm',
    'lua_waiting_for_point',
    'lua_not_point_reached',
    'lua_point_reached',
    'lua_update_yaw',
    'lua_set_manual_speed',
    'lua_set_manual_speed_bf',
    // Светодиоды
    'lua_led_all',
    'lua_led_index',
    // Серво и захват — отсутствуют в Lua API (удалены)
    // Сенсоры и данные
    'lua_get_dist_sensor_data',
    'lua_get_local_position',
    'lua_get_local_velocity',
    'lua_get_pv_by_index',
    'lua_get_time',
    'lua_sleep',
    // Алиасы
    'lua_arm',
    'lua_disarm',
    'lua_takeoff_alias',
    'lua_land_alias',
    'lua_goto_local_point_alias',
    'lua_wait_point_reached',
    'lua_point_reached_alias',
    'lua_get_sensor_distance',
    'lua_get_local_point',
    'lua_get_battery',
    'lua_get_autopilot_state',
    'lua_get_time_alias',
    'lua_print_alias',
    'lua_time_sleep',
    'lua_variables_set_alias',
    'lua_variables_get_alias',
    // Учебные блоки
    'lua_ledbar_new',
    'lua_led_set',
    'lua_timer_calllater',
    'lua_print',
    'lua_ap_push',
    'lua_event_callback',
    'lua_callback_open',
    'lua_callback_end',
    'lua_event_constant',
    'lua_variables_set',
    'lua_variables_get',
    'lua-callback-stub'
] as const;
