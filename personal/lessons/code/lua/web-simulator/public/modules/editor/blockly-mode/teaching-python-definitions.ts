import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';
import { registerPioneerSdk2Definitions } from './pioneer-sdk2-definitions.js';

// Helper for Color tuple conversion [R, G, B] -> pioneer.led_control(..., *[c / 255 for c in COLOR][::-1])
function hexToRgbTuple(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    if (isNaN(num)) return [0, 0, 0];
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function registerPythonBlocklyDefinitions(): void {
    const COLOR_FLIGHT = 290;
    const COLOR_LED = 160;
    const COLOR_CONTROL = 230;
    const COLOR_LOGIC = 210;
    const COLOR_VAR = 330;
    const COLOR_SENSORS = 290;
    const COLOR_CV = 190;

    // ==========================================
    // 1. ПОЛЕТНЫЕ БЛОКИ (PIONEER-SDK2)
    // ==========================================

    // go_local_point (Лететь в локальные координаты: X, Y, Z, Угол поворота, Желаемое время)
    Blockly.Blocks['go_local_point'] = {
        init: function() {
            this.appendDummyInput().appendField('Лететь в локальные координаты');
            this.appendValueInput('X').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('X');
            this.appendValueInput('Y').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Y');
            this.appendValueInput('Z').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Z');
            this.appendValueInput('YAW').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Угол поворота');
            this.appendValueInput('TIME').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Желаемое время');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOR_FLIGHT);
            this.setTooltip('Перемещает дрон к точке в локальной системе координат: pioneer.go_to_local_point(x, y, z, yaw, time).');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['go_local_point'] = function(block: any) {
        const x = pythonGenerator.valueToCode(block, 'X', 0) || '0';
        const y = pythonGenerator.valueToCode(block, 'Y', 0) || '0';
        const z = pythonGenerator.valueToCode(block, 'Z', 0) || '0';
        const yaw = pythonGenerator.valueToCode(block, 'YAW', 0) || '0';
        const time = pythonGenerator.valueToCode(block, 'TIME', 0) || 'None';
        return `pioneer.go_to_local_point(${x}, ${y}, ${z}, ${yaw}, ${time})\n`;
    };

    // go_local_point_body_fixed
    Blockly.Blocks['go_local_point_body_fixed'] = {
        init: function() {
            this.appendDummyInput().appendField('Лететь в связанные координаты');
            this.appendValueInput('X').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('X');
            this.appendValueInput('Y').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Y');
            this.appendValueInput('Z').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Z');
            this.appendValueInput('YAW').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Угол поворота');
            this.appendValueInput('TIME').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Желаемое время');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOR_FLIGHT);
            this.setTooltip('Перемещение в связанной с дроном системе координат: pioneer.go_to_local_point_body_fixed(x, y, z, yaw, time).');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['go_local_point_body_fixed'] = function(block: any) {
        const x = pythonGenerator.valueToCode(block, 'X', 0) || '0';
        const y = pythonGenerator.valueToCode(block, 'Y', 0) || '0';
        const z = pythonGenerator.valueToCode(block, 'Z', 0) || '0';
        const yaw = pythonGenerator.valueToCode(block, 'YAW', 0) || '0';
        const time = pythonGenerator.valueToCode(block, 'TIME', 0) || 'None';
        return `pioneer.go_to_local_point_body_fixed(${x}, ${y}, ${z}, ${yaw}, ${time})\n`;
    };

    // take_off
    Blockly.Blocks['take_off'] = {
        init: function() {
            this.appendDummyInput().appendField('Взлет');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOR_FLIGHT);
            this.setTooltip('Команда взлета дрона: pioneer.takeoff() / pioneer.arm().');
            this.setHelpUrl('');
        }
    };
    // Без паузы arm() и takeoff() попадают в один и тот же тик симулятора и
    // рантайм кидает "CRITICAL ERROR: Commands ... run at the same time"
    // (см. autopilot/fsm-internals.ts, isCompatibleSameTickPair) — это падало
    // на самом первом запуске у нового пользователя, ставившего только этот
    // блок.
    pythonGenerator.forBlock['take_off'] = () => 'pioneer.arm()\ntime.sleep(1)\npioneer.takeoff()\n';

    // landing
    Blockly.Blocks['landing'] = {
        init: function() {
            this.appendDummyInput().appendField('Посадка');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOR_FLIGHT);
            this.setTooltip('Команда посадки: pioneer.land().');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['landing'] = () => 'pioneer.land()\n';

    // preflight
    Blockly.Blocks['preflight'] = {
        init: function() {
            this.appendDummyInput().appendField('Предполетная подготовка');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOR_FLIGHT);
            this.setTooltip('Запуск моторов квадрокоптера: pioneer.arm().');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['preflight'] = () => 'pioneer.arm()\n';

    // engines_disarm
    Blockly.Blocks['engines_disarm'] = {
        init: function() {
            this.appendDummyInput().appendField('Заглушить двигатели');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOR_FLIGHT);
            this.setTooltip('Отключение моторов: pioneer.disarm().');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['engines_disarm'] = () => 'pioneer.disarm()\n';

    // waiting_for_point
    Blockly.Blocks['waiting_for_point'] = {
        init: function() {
            this.appendDummyInput().appendField('Ожидать достижения точки');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOR_CONTROL);
            this.setTooltip('Цикл ожидания достижения целевой точки дроном.');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['waiting_for_point'] = () => 'while not pioneer.point_reached():\n    pass\n';

    // not_point_reached
    Blockly.Blocks['not_point_reached'] = {
        init: function() {
            this.appendDummyInput().appendField('не достигнута точка');
            this.setOutput(true, 'Boolean');
            this.setColour(COLOR_LOGIC);
            this.setTooltip('Возвращает True, пока целевая точка ещё не достигнута: not pioneer.point_reached().');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['not_point_reached'] = () => ['not pioneer.point_reached()', 0];

    // point_reached (алиас / прямое условие)
    Blockly.Blocks['point_reached'] = {
        init: function() {
            this.appendDummyInput().appendField('достигнута точка');
            this.setOutput(true, 'Boolean');
            this.setColour(COLOR_LOGIC);
            this.setTooltip('Возвращает True, когда точка достигнута: pioneer.point_reached().');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['point_reached'] = () => ['pioneer.point_reached()', 0];

    // update_yaw
    Blockly.Blocks['update_yaw'] = {
        init: function() {
            this.appendDummyInput().appendField('Установить угол поворота (yaw)');
            this.appendValueInput('YAW').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Угол (рад)');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOR_FLIGHT);
            this.setTooltip('Поворачивает дрон на заданный угол: pioneer.update_yaw(yaw).');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['update_yaw'] = function(block: any) {
        const yaw = pythonGenerator.valueToCode(block, 'YAW', 0) || '0';
        return `pioneer.update_yaw(${yaw})\n`;
    };

    // set_manual_speed
    Blockly.Blocks['set_manual_speed'] = {
        init: function() {
            this.appendDummyInput().appendField('Установить скорость полета');
            this.appendValueInput('VX').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Vx');
            this.appendValueInput('VY').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Vy');
            this.appendValueInput('VZ').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Vz');
            this.appendValueInput('VYAW').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Vyaw');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOR_FLIGHT);
            this.setTooltip('Устанавливает скорость полета: pioneer.set_manual_speed(vx, vy, vz, vyaw).');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['set_manual_speed'] = function(block: any) {
        const vx = pythonGenerator.valueToCode(block, 'VX', 0) || '0';
        const vy = pythonGenerator.valueToCode(block, 'VY', 0) || '0';
        const vz = pythonGenerator.valueToCode(block, 'VZ', 0) || '0';
        const vyaw = pythonGenerator.valueToCode(block, 'VYAW', 0) || '0';
        return `pioneer.set_manual_speed(${vx}, ${vy}, ${vz}, ${vyaw})\n`;
    };

    // set_manual_speed_body_fixed
    Blockly.Blocks['set_manual_speed_body_fixed'] = {
        init: function() {
            this.appendDummyInput().appendField('Установить скорость в связ. СК');
            this.appendValueInput('VX').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Vx');
            this.appendValueInput('VY').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Vy');
            this.appendValueInput('VZ').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Vz');
            this.appendValueInput('VYAW').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Vyaw');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOR_FLIGHT);
            this.setTooltip('Устанавливает скорость полета в связанной СК: pioneer.set_manual_speed_body_fixed(vx, vy, vz, vyaw).');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['set_manual_speed_body_fixed'] = function(block: any) {
        const vx = pythonGenerator.valueToCode(block, 'VX', 0) || '0';
        const vy = pythonGenerator.valueToCode(block, 'VY', 0) || '0';
        const vz = pythonGenerator.valueToCode(block, 'VZ', 0) || '0';
        const vyaw = pythonGenerator.valueToCode(block, 'VYAW', 0) || '0';
        return `pioneer.set_manual_speed_body_fixed(${vx}, ${vy}, ${vz}, ${vyaw})\n`;
    };

    // ==========================================
    // 2. СВЕТОДИОДЫ (LED)
    // ==========================================

    // led_all
    Blockly.Blocks['led_all'] = {
        init: function() {
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
    pythonGenerator.forBlock['led_all'] = function(block: any) {
        const color = pythonGenerator.valueToCode(block, 'COLOR', 0) || "'#ffffff'";
        return `pioneer.led_control(255, *[c / 255 for c in ${color}][::-1])\n`;
    };

    // led_index
    Blockly.Blocks['led_index'] = {
        init: function() {
            this.appendDummyInput().appendField('Включить светодиод с индексом');
            this.appendValueInput('NUM').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT);
            this.appendValueInput('COLOR').setCheck('Colour').setAlign(Blockly.inputs.Align.RIGHT).appendField('Цвет');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOR_LED);
            this.setTooltip('Устанавливает цвет конкретного светодиода по его номеру.');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['led_index'] = function(block: any) {
        const num = pythonGenerator.valueToCode(block, 'NUM', 0) || '0';
        const color = pythonGenerator.valueToCode(block, 'COLOR', 0) || "'#ffffff'";
        return `pioneer.led_control(${num}, *[c / 255 for c in ${color}][::-1])\n`;
    };

    // ==========================================
    // 3. СЕРВОПРИВОДЫ И ЗАХВАТЫ
    // ==========================================

    // servo_set_angle
    Blockly.Blocks['servo_set_angle'] = {
        init: function() {
            this.appendDummyInput().appendField('Установить угол сервопривода');
            this.appendValueInput('INDEX').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Индекс');
            this.appendValueInput('ANGLE').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Угол (град)');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOR_FLIGHT);
            this.setTooltip('Управляет положением сервопривода: pioneer.set_servo_angle(index, angle).');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['servo_set_angle'] = function(block: any) {
        const index = pythonGenerator.valueToCode(block, 'INDEX', 0) || '0';
        const angle = pythonGenerator.valueToCode(block, 'ANGLE', 0) || '90';
        return `pioneer.set_servo_angle(${index}, ${angle})\n`;
    };

    // grab_open
    Blockly.Blocks['grab_open'] = {
        init: function() {
            this.appendDummyInput().appendField('Открыть захват');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOR_FLIGHT);
            this.setTooltip('Открывает электромагнитный или механический захват: pioneer.open_gripper().');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['grab_open'] = () => 'pioneer.open_gripper()\n';

    // grab_close
    Blockly.Blocks['grab_close'] = {
        init: function() {
            this.appendDummyInput().appendField('Закрыть захват');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOR_FLIGHT);
            this.setTooltip('Закрывает захват: pioneer.close_gripper().');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['grab_close'] = () => 'pioneer.close_gripper()\n';

    // ==========================================
    // 4. ДАТЧИКИ И ТЕЛЕМЕТРИЯ
    // ==========================================

    // get_dist_sensor_data
    Blockly.Blocks['get_dist_sensor_data'] = {
        init: function() {
            this.appendDummyInput().appendField('расстояние до препятствия (м)');
            this.setOutput(true, 'Number');
            this.setColour(COLOR_SENSORS);
            this.setTooltip('Возвращает расстояние с дальномера в метрах: pioneer.get_dist_sensor_data().');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['get_dist_sensor_data'] = () => ['pioneer.get_dist_sensor_data()', 0];

    // get_local_position_lps
    Blockly.Blocks['get_local_position_lps'] = {
        init: function() {
            this.appendDummyInput().appendField('локальная позиция [x, y, z]');
            this.setOutput(true, 'Array');
            this.setColour(COLOR_SENSORS);
            this.setTooltip('Текущая LPS-координата [x, y, z]: pioneer.get_local_position_lps().');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['get_local_position_lps'] = () => ['pioneer.get_local_position_lps()', 0];

    // get_local_velocity_lps
    Blockly.Blocks['get_local_velocity_lps'] = {
        init: function() {
            this.appendDummyInput().appendField('локальная скорость [vx, vy, vz]');
            this.setOutput(true, 'Array');
            this.setColour(COLOR_SENSORS);
            this.setTooltip('Текущая LPS-скорость [vx, vy, vz]: pioneer.get_local_velocity_lps().');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['get_local_velocity_lps'] = () => ['pioneer.get_local_velocity_lps()', 0];

    // get_global_position_gps
    Blockly.Blocks['get_global_position_gps'] = {
        init: function() {
            this.appendDummyInput().appendField('GPS координаты [lat, lon, alt]');
            this.setOutput(true, 'Array');
            this.setColour(COLOR_SENSORS);
            this.setTooltip('Текущие глобальные GPS координаты: pioneer.get_global_position_gps().');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['get_global_position_gps'] = () => ['pioneer.get_global_position_gps()', 0];

    // get_global_velocity_gps
    Blockly.Blocks['get_global_velocity_gps'] = {
        init: function() {
            this.appendDummyInput().appendField('GPS скорость [vx, vy, vz]');
            this.setOutput(true, 'Array');
            this.setColour(COLOR_SENSORS);
            this.setTooltip('Текущая GPS скорость дрона: pioneer.get_global_velocity_gps().');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['get_global_velocity_gps'] = () => ['pioneer.get_global_velocity_gps()', 0];

    // get_position_velocity_by_index
    Blockly.Blocks['get_position_velocity_by_index'] = {
        init: function() {
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
    pythonGenerator.forBlock['get_position_velocity_by_index'] = function(block: any) {
        const posOrVel = pythonGenerator.valueToCode(block, 'POS_OR_VEL', 0) || '[0, 0, 0]';
        const index = block.getFieldValue('INDEX');
        return [`${posOrVel}[${index}]`, 0];
    };

    // get_time
    Blockly.Blocks['get_time'] = {
        init: function() {
            this.appendDummyInput().appendField('Получить время (с)');
            this.setOutput(true, 'Number');
            this.setColour(COLOR_SENSORS);
            this.setTooltip('Возвращает текущее системное время в секундах: time.time().');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['get_time'] = () => ['time.time()', 0];

    // sleep
    Blockly.Blocks['sleep'] = {
        init: function() {
            this.appendDummyInput()
                .appendField('Заснуть на')
                .appendField(new Blockly.FieldNumber(1, 0), 'TIME')
                .appendField('сек');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOR_CONTROL);
            this.setTooltip('Приостанавливает выполнение программы на указанное время в секундах.');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['sleep'] = (block: any) => `time.sleep(${block.getFieldValue('TIME')})\n`;

    // ==========================================
    // 5. КОМПЬЮТЕРНОЕ ЗРЕНИЕ (CAMERA & CV)
    // ==========================================

    // cam_get_cv_frame
    Blockly.Blocks['cam_get_cv_frame'] = {
        init: function() {
            this.appendDummyInput().appendField('Получить кадр с камеры');
            this.setOutput(true, null);
            this.setColour(COLOR_CV);
            this.setTooltip('Возвращает текущий кадр с камеры дрона в формате OpenCV BGR: pioneer.get_cv_frame().');
            this.setHelpUrl('');
        }
    };
    pythonGenerator.forBlock['cam_get_cv_frame'] = () => ['pioneer.get_cv_frame()', 0];

    // ==========================================
    // 6. ОБРАТНАЯ СОВМЕСТИМОСТЬ: СУЩЕСТВУЮЩИЕ АЛИАСЫ (py_*)
    // ==========================================

    // py_led_control -> pioneer.led_control(led_id, r, g, b)
    Blockly.Blocks['py_led_control'] = {
        init: function() {
            this.appendDummyInput()
                .appendField('Задать цвет светодиодов: id')
                .appendField(new Blockly.FieldNumber(255, 0, 255), 'LED_ID')
                .appendField('R')
                .appendField(new Blockly.FieldNumber(0, 0, 255), 'R')
                .appendField('G')
                .appendField(new Blockly.FieldNumber(0, 0, 255), 'G')
                .appendField('B')
                .appendField(new Blockly.FieldNumber(0, 0, 255), 'B');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOR_LED);
            this.setTooltip('Управление светодиодами дрона Pioneer (0-255). id=255 — все светодиоды.');
        }
    };
    pythonGenerator.forBlock['py_led_control'] = (block: any) =>
        `pioneer.led_control(led_id=${block.getFieldValue('LED_ID')}, r=${block.getFieldValue('R')}, g=${block.getFieldValue('G')}, b=${block.getFieldValue('B')})\n`;

    // py_time_sleep
    Blockly.Blocks['py_time_sleep'] = Blockly.Blocks['sleep'];
    pythonGenerator.forBlock['py_time_sleep'] = pythonGenerator.forBlock['sleep'];

    // py_arm & py_disarm
    Blockly.Blocks['py_arm'] = Blockly.Blocks['preflight'];
    pythonGenerator.forBlock['py_arm'] = pythonGenerator.forBlock['preflight'];

    Blockly.Blocks['py_disarm'] = Blockly.Blocks['engines_disarm'];
    pythonGenerator.forBlock['py_disarm'] = pythonGenerator.forBlock['engines_disarm'];

    // py_takeoff & py_land
    Blockly.Blocks['py_takeoff'] = Blockly.Blocks['take_off'];
    pythonGenerator.forBlock['py_takeoff'] = pythonGenerator.forBlock['take_off'];

    Blockly.Blocks['py_land'] = Blockly.Blocks['landing'];
    pythonGenerator.forBlock['py_land'] = pythonGenerator.forBlock['landing'];

    // py_goto_local_point
    Blockly.Blocks['py_goto_local_point'] = {
        init: function() {
            this.appendDummyInput().appendField('Лететь в локальные координаты');
            this.appendValueInput('X').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('X');
            this.appendValueInput('Y').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Y');
            this.appendValueInput('Z').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Z');
            this.appendValueInput('YAW').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Угол поворота');
            this.appendValueInput('TIME').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Желаемое время');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOR_FLIGHT);
            this.setTooltip('Перемещает дрон к точке в локальной системе координат: pioneer.go_to_local_point(x, y, z, yaw, [time]).');
        }
    };
    pythonGenerator.forBlock['py_goto_local_point'] = function(block: any) {
        const x = pythonGenerator.valueToCode(block, 'X', 0) || '1';
        const y = pythonGenerator.valueToCode(block, 'Y', 0) || '0';
        const z = pythonGenerator.valueToCode(block, 'Z', 0) || '1';
        const yaw = pythonGenerator.valueToCode(block, 'YAW', 0) || '0';
        const time = pythonGenerator.valueToCode(block, 'TIME', 0);
        if (time) {
            return `pioneer.go_to_local_point(x=${x}, y=${y}, z=${z}, yaw=${yaw}, time=${time})\n`;
        }
        return `pioneer.go_to_local_point(x=${x}, y=${y}, z=${z}, yaw=${yaw})\n`;
    };

    // py_get_sensor_distance & py_get_local_point
    Blockly.Blocks['py_get_sensor_distance'] = Blockly.Blocks['get_dist_sensor_data'];
    pythonGenerator.forBlock['py_get_sensor_distance'] = pythonGenerator.forBlock['get_dist_sensor_data'];

    Blockly.Blocks['py_get_local_point'] = Blockly.Blocks['get_local_position_lps'];
    pythonGenerator.forBlock['py_get_local_point'] = pythonGenerator.forBlock['get_local_position_lps'];

    // py_get_battery
    Blockly.Blocks['py_get_battery'] = {
        init: function() {
            this.appendDummyInput().appendField('напряжение батареи (В)');
            this.setOutput(true, 'Number');
            this.setColour(COLOR_SENSORS);
            this.setTooltip('Возвращает напряжение батареи в вольтах: pioneer.get_battery_status().');
        }
    };
    pythonGenerator.forBlock['py_get_battery'] = () => ['pioneer.get_battery_status()', 0];

    // py_get_autopilot_state
    Blockly.Blocks['py_get_autopilot_state'] = {
        init: function() {
            this.appendDummyInput().appendField('состояние автопилота');
            this.setOutput(true, 'String');
            this.setColour(COLOR_SENSORS);
            this.setTooltip('Возвращает текущее состояние автопилота: pioneer.get_autopilot_state().');
        }
    };
    pythonGenerator.forBlock['py_get_autopilot_state'] = () => ['pioneer.get_autopilot_state()', 0];

    // py_get_time
    Blockly.Blocks['py_get_time'] = Blockly.Blocks['get_time'];
    pythonGenerator.forBlock['py_get_time'] = pythonGenerator.forBlock['get_time'];

    // ==========================================
    // 7. PRINT И ПЕРЕМЕННЫЕ
    // ==========================================

    function formatPythonPrintCode(block: any): string {
        const valueInput = block.getInput('VALUE');
        if (valueInput && valueInput.connection && valueInput.connection.targetBlock()) {
            const valueCode = pythonGenerator.valueToCode(block, 'VALUE', 2);
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

    Blockly.Blocks['py_print'] = {
        init: function() {
            this.appendValueInput('VALUE')
                .setCheck(null)
                .appendField('print(')
                .appendField(new Blockly.FieldTextInput('сообщение'), 'TEXT')
                .appendField(')');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOR_LED);
            this.setTooltip('Выводит сообщение или значение переменной в консоль.');
        }
    };
    pythonGenerator.forBlock['py_print'] = (block: any) => formatPythonPrintCode(block);

    Blockly.Blocks['py_variables_set'] = {
        init: function() {
            this.appendDummyInput()
                .appendField('переменная =')
                .appendField(new Blockly.FieldVariable('my_variable'), 'VAR');
            this.appendValueInput('VALUE')
                .appendField('=');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOR_VAR);
            this.setTooltip('Присваивает значение переменной.');
        }
    };
    pythonGenerator.forBlock['py_variables_set'] = (block: any) => {
        const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
        const valueCode = pythonGenerator.valueToCode(block, 'VALUE', 2) || 'None';
        return `${varName} = ${valueCode}\n`;
    };

    Blockly.Blocks['py_variables_get'] = {
        init: function() {
            this.appendDummyInput()
                .appendField(new Blockly.FieldVariable('my_variable'), 'VAR');
            this.setOutput(true, null);
            this.setColour(COLOR_VAR);
            this.setTooltip('Возвращает значение переменной.');
        }
    };
    pythonGenerator.forBlock['py_variables_get'] = (block: any) => {
        const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
        return [varName, 0];
    };
    registerPioneerSdk2Definitions();

    // py_wait_point_reached — алиас на waiting_for_point, которое registerPioneerSdk2Definitions()
    // выше только что переопределила (у неё своя, более новая версия с time.sleep вместо pass).
    // Алиас должен копироваться ПОСЛЕ этого переопределения, иначе застрянет на старой реализации.
    Blockly.Blocks['py_wait_point_reached'] = Blockly.Blocks['waiting_for_point'];
    pythonGenerator.forBlock['py_wait_point_reached'] = pythonGenerator.forBlock['waiting_for_point'];

    Blockly.Blocks['py_point_reached'] = Blockly.Blocks['point_reached'];
    pythonGenerator.forBlock['py_point_reached'] = pythonGenerator.forBlock['point_reached'];
}
