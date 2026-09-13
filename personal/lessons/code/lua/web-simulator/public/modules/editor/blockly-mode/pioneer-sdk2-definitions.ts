import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';

const FLIGHT = 290;
const SENSOR = 180;
const CAMERA = 190;
const VISION = 210;
const AI = 260;
const TIME = 45;

const value = (block: Blockly.Block, name: string, fallback = '') =>
    pythonGenerator.valueToCode(block, name, 0) || fallback;

const output = (code: string) => [code, 0] as [string, number];

function statement(type: string, label: string, colour: number, code: string): void {
    Blockly.Blocks[type] = {
        init() {
            this.appendDummyInput().appendField(label);
            this.setInputsInline(true);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(colour);
        }
    };
    pythonGenerator.forBlock[type] = () => `${code}\n`;
}

function getter(type: string, label: string, check: string, colour: number, code: string): void {
    Blockly.Blocks[type] = {
        init() {
            this.appendDummyInput().appendField(label);
            this.setOutput(true, check);
            this.setColour(colour);
        }
    };
    pythonGenerator.forBlock[type] = () => output(code);
}

export function registerPioneerSdk2Definitions(): void {
    Blockly.Blocks.colour_picker = {
        init() {
            this.appendDummyInput().appendField(new Blockly.FieldDropdown([
                ['Красный', '(255, 0, 0)'], ['Зелёный', '(0, 255, 0)'], ['Синий', '(0, 0, 255)'],
                ['Жёлтый', '(255, 255, 0)'], ['Белый', '(255, 255, 255)'], ['Выключен', '(0, 0, 0)']
            ]), 'COLOUR');
            this.setOutput(true, 'Colour');
            this.setColour(20);
        }
    };
    pythonGenerator.forBlock.colour_picker = (block) => output(block.getFieldValue('COLOUR'));

    statement('preflight', 'Предполетная подготовка', FLIGHT, 'pioneer.arm()');
    statement('take_off', 'Взлет', FLIGHT, 'pioneer.takeoff()');
    statement('landing', 'Посадка', FLIGHT, 'pioneer.land()');
    statement('engines_disarm', 'Заглушить двигатели', FLIGHT, 'pioneer.disarm()');
    statement('waiting_for_point', 'Ожидать достижения точки', FLIGHT, 'while not pioneer.point_reached():\n    time.sleep(0.05)');

    Blockly.Blocks.start_block = {
        init() {
            this.appendDummyInput().setAlign(Blockly.inputs.Align.RIGHT).appendField('Начало программы');
            this.setInputsInline(true);
            this.setNextStatement(true);
            this.setColour(0);
            this.setDeletable(false);
            this.setMovable(false);
        }
    };
    pythonGenerator.forBlock.start_block = () => '';

    const pointBlock = (type: string, label: string, method: string) => {
        Blockly.Blocks[type] = {
            init() {
                this.appendDummyInput().appendField(label);
                this.appendValueInput('X').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('X');
                this.appendValueInput('Y').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Y');
                this.appendValueInput('Z').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Z');
                this.appendValueInput('YAW').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Угол поворота, рад');
                this.setInputsInline(true);
                this.setPreviousStatement(true);
                this.setNextStatement(true);
                this.setColour(FLIGHT);
            }
        };
        pythonGenerator.forBlock[type] = (block) =>
            `pioneer.${method}(x=${value(block, 'X', '0')}, y=${value(block, 'Y', '0')}, z=${value(block, 'Z', '0')}, yaw=${value(block, 'YAW', '0')})\n`;
    };
    pointBlock('go_local_point', 'Лететь в локальные координаты', 'go_to_local_point');
    pointBlock('go_local_point_body_fixed', 'Сместиться на локальные координаты', 'go_to_local_point_body_fixed');

    Blockly.Blocks.go_to_point = {
        init() {
            this.appendDummyInput().appendField('Лететь в глобальные координаты');
            this.appendValueInput('LAT').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Широта');
            this.appendValueInput('LON').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Долгота');
            this.appendValueInput('ALT').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Высота');
            this.setInputsInline(true);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(FLIGHT);
        }
    };
    pythonGenerator.forBlock.go_to_point = (block) =>
        `pioneer.go_to_point(${value(block, 'LAT')},${value(block, 'LON')},${value(block, 'ALT')})\n`;

    const speedBlock = (type: string, label: string, method: string) => {
        Blockly.Blocks[type] = {
            init() {
                this.appendDummyInput().appendField(label);
                this.appendValueInput('VX').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('по X');
                this.appendValueInput('VY').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('по Y');
                this.appendValueInput('VZ').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('по Z');
                this.appendValueInput('YAW RATE').setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField('Угловая скорость');
                this.setInputsInline(true);
                this.setPreviousStatement(true);
                this.setNextStatement(true);
                this.setColour(FLIGHT);
            }
        };
        pythonGenerator.forBlock[type] = (block) =>
            `pioneer.${method}(${value(block, 'VX', '0')},${value(block, 'VY', '0')},${value(block, 'VZ', '0')},${value(block, 'YAW RATE', '0')})\n`;
    };
    speedBlock('set_manual_speed', 'Установить скорость относительно точки старта', 'set_manual_speed');
    speedBlock('set_manual_speed_body_fixed', 'Установить скорость относительно позиции дрона', 'set_manual_speed_body_fixed');

    Blockly.Blocks.update_yaw = {
        init() {
            this.appendValueInput('YAW').setCheck('Number').appendField('Установить угол');
            this.appendDummyInput().appendField('в градусах');
            this.setInputsInline(true);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(FLIGHT);
        }
    };
    pythonGenerator.forBlock.update_yaw = (block) => `pioneer.set_yaw(${value(block, 'YAW')})\n`;

    getter('not_point_reached', 'Достигнута точка', 'Boolean', FLIGHT, 'not pioneer.point_reached()');
    getter('get_dist_sensor_data', 'Получить данные от датчика расстояния', 'Number', SENSOR, 'pioneer.get_dist_sensor_data()');
    getter('get_local_position_lps', 'Получить текущие локальные координаты дрона', 'Point3D', SENSOR, 'pioneer.get_local_position_lps()');
    getter('get_local_velocity_lps', 'Получить текущие скорости дрона в локальной системе координат', 'Velocity3D', SENSOR, 'pioneer.get_local_velocity_lps()');
    getter('get_global_position_gps', 'Получить текущие глобальные координаты дрона', 'Point3D', SENSOR, 'pioneer.get_global_position_gps()');
    getter('get_global_velocity_gps', 'Получить текущие скорости дрона в глобальной системе координат', 'Velocity3D', SENSOR, 'pioneer.get_global_velocity_gps()');
    getter('get_ranger_data', 'Получить данные от модуля Ranger', 'RangerData', SENSOR, 'pioneer.get_ranger_data()');
    getter('get_time', 'Получить время', 'Number', TIME, 'time.time()');

    Blockly.Blocks.get_position_velocity_by_index = {
        init() {
            this.appendDummyInput().appendField('Получить');
            this.appendDummyInput('system_input').setAlign(Blockly.inputs.Align.RIGHT)
                .appendField('в системе').appendField(new Blockly.FieldDropdown([['LPS', 'lps'], ['GPS', 'gps']], (system) => {
                    (this as any).updateShape_(system, this.getFieldValue('SOURCE'));
                    return system;
                }), 'SYSTEM');
            this.appendDummyInput('source_input').setAlign(Blockly.inputs.Align.RIGHT)
                .appendField('компоненту').appendField(new Blockly.FieldDropdown([['позиции', 'position'], ['скорости', 'velocity']], (source) => {
                    (this as any).updateShape_(this.getFieldValue('SYSTEM'), source);
                    return source;
                }), 'SOURCE');
            this.setColour(SENSOR);
            this.setInputsInline(true);
            this.setOutput(true, 'Number');
            (this as any).updateShape_();
        },
        updateShape_(this: Blockly.Block, nextSystem?: string, nextSource?: string) {
            if (this.getInput('index_input')) this.removeInput('index_input');
            if (this.getInput('POSITION_VELOCITY_DATA')) this.removeInput('POSITION_VELOCITY_DATA');
            const system = nextSystem || this.getFieldValue('SYSTEM') || 'lps';
            const source = nextSource || this.getFieldValue('SOURCE') || 'position';
            const options: [string, string][] = system === 'gps' && source === 'position'
                ? [['широту', '0'], ['долготу', '1'], ['высоту', '2']]
                : system === 'gps' && source === 'velocity'
                    ? [['северную', '0'], ['восточную', '1'], ['вертикальную', '2']]
                    : [['X', '0'], ['Y', '1'], ['Z', '2']];
            this.appendDummyInput('index_input').setAlign(Blockly.inputs.Align.RIGHT).appendField(new Blockly.FieldDropdown(options), 'INDEX');
            this.appendValueInput('POSITION_VELOCITY_DATA')
                .setCheck(source === 'velocity' ? 'Velocity3D' : 'Point3D')
                .setAlign(Blockly.inputs.Align.RIGHT).appendField('из');
        }
    } as any;
    pythonGenerator.forBlock.get_position_velocity_by_index = (block) =>
        output(`${value(block, 'POSITION_VELOCITY_DATA')}[${block.getFieldValue('INDEX')}]`);

    Blockly.Blocks.get_ranger_data_by_index = {
        init() {
            this.appendDummyInput().appendField('Получить значение дальномера');
            this.appendDummyInput().setAlign(Blockly.inputs.Align.RIGHT).appendField(new Blockly.FieldDropdown([
                ['Правый', '0'], ['Левый', '1'], ['Передний', '2'], ['Задний', '3'], ['Верхний', '4'], ['Нижний/Верхний', '5']
            ]), 'INDEX');
            this.appendValueInput('RANGER_DATA').setCheck('RangerData').setAlign(Blockly.inputs.Align.RIGHT).appendField('из данных модуля Ranger');
            this.setInputsInline(true);
            this.setColour(SENSOR);
            this.setOutput(true, 'Number');
        }
    };
    pythonGenerator.forBlock.get_ranger_data_by_index = (block) =>
        output(`${value(block, 'RANGER_DATA')}[${block.getFieldValue('INDEX')}]`);

    Blockly.Blocks.sleep = {
        init() {
            this.appendValueInput('NAME').setCheck('Number').appendField('Заснуть на');
            this.appendDummyInput().appendField('секунд');
            this.setInputsInline(true);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TIME);
        }
    };
    pythonGenerator.forBlock.sleep = (block) => `time.sleep(${value(block, 'NAME', '1')})\n`;

    Blockly.Blocks.led_all = {
        init() {
            this.appendDummyInput().appendField('Установить цвет всех светодиодов на');
            this.appendValueInput('COLOR').setCheck('Colour').setAlign(Blockly.inputs.Align.CENTRE);
            this.setInputsInline(true);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(SENSOR);
        }
    };
    pythonGenerator.forBlock.led_all = (block) => {
        const colour = value(block, 'COLOR', '(0, 0, 0)');
        // led_control() ждёт r,g,b в 0..1, а цвет в блоке хранится в 0..255 — делим на 255.
        return `pioneer.led_control(led_id=255, r=(${colour})[0] / 255, g=(${colour})[1] / 255, b=(${colour})[2] / 255)\n`;
    };

    Blockly.Blocks.led_index = {
        init() {
            this.appendDummyInput().appendField('Установить');
            this.appendValueInput('COLOR').setCheck('Colour').setAlign(Blockly.inputs.Align.CENTRE).appendField('цвет');
            this.appendValueInput('NUM').setCheck('Number').setAlign(Blockly.inputs.Align.CENTRE).appendField('на светодиод с номером');
            this.setInputsInline(true);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(SENSOR);
        }
    };
    pythonGenerator.forBlock.led_index = (block) => {
        const colour = value(block, 'COLOR', '(0, 0, 0)');
        return `pioneer.led_control(led_id=${value(block, 'NUM', '0')}, r=(${colour})[0] / 255, g=(${colour})[1] / 255, b=(${colour})[2] / 255)\n`;
    };

    Blockly.Blocks.servo_set_angle = {
        init() {
            this.appendDummyInput().appendField('Задать поворот сервопривода')
                .appendField(new Blockly.FieldNumber(0, -80, 30, 1), 'angle');
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setInputsInline(false);
            this.setColour(SENSOR);
        }
    };
    pythonGenerator.forBlock.servo_set_angle = (block) => `servo.set_angle(angle=${block.getFieldValue('angle')})\n`;

    for (const [type, label, method] of [
        ['grab_open', 'Открыть захват со скоростью', 'grab_open'],
        ['grab_close', 'Закрыть захват со скоростью', 'grab_close']
    ] as const) {
        Blockly.Blocks[type] = {
            init() {
                this.appendDummyInput().appendField(label);
                this.appendValueInput('SPEED').setCheck('Number').setAlign(Blockly.inputs.Align.CENTRE);
                this.appendDummyInput().appendField('процентов');
                this.setInputsInline(true);
                this.setPreviousStatement(true);
                this.setNextStatement(true);
                this.setColour(SENSOR);
            }
        };
        pythonGenerator.forBlock[type] = (block) => `pioneer.${method}(velocity=${value(block, 'SPEED')})\n`;
    }

    Blockly.Blocks.cam_get_cv_frame = {
        init() {
            this.appendDummyInput().setAlign(Blockly.inputs.Align.RIGHT).appendField('Получить кадр с')
                .appendField(new Blockly.FieldDropdown([['основной', 'CameraType.MAIN'], ['вспомогательной', 'CameraType.OPT']]), 'choice')
                .appendField('камеры');
            this.setOutput(true, 'Frame');
            this.setColour(CAMERA);
        }
    };
    pythonGenerator.forBlock.cam_get_cv_frame = (block) =>
        output(`${block.getFieldValue('choice') === 'CameraType.OPT' ? 'cam_opt' : 'cam_main'}.get_cv_frame()`);

    const imageValue = (type: string, label: string, inputs: Array<[string, string, string]>, check: string, code: (block: Blockly.Block) => string) => {
        Blockly.Blocks[type] = {
            init() {
                this.appendDummyInput().appendField(label);
                inputs.forEach(([name, inputCheck, inputLabel]) => this.appendValueInput(name).setCheck(inputCheck).appendField(inputLabel));
                this.setInputsInline(true);
                this.setColour(CAMERA);
                this.setOutput(true, check);
            }
        };
        pythonGenerator.forBlock[type] = (block) => output(code(block));
    };
    imageValue('crop_image', 'Обрезка', [['IMG', 'Frame', 'изображения'], ['POINT1', 'Point', 'от точки'], ['POINT2', 'Point', 'до точки']], 'Frame',
        (b) => `crop_image(${value(b, 'IMG')}, ${value(b, 'POINT1')}, ${value(b, 'POINT2')})`);
    imageValue('resize_image', 'Изменить размер', [['IMG', 'Frame', 'изображения'], ['WIDTH', 'Number', 'ширина'], ['HEIGHT', 'Number', 'высота']], 'Frame',
        (b) => `resize_image(${value(b, 'IMG')}, ${value(b, 'WIDTH')}, ${value(b, 'HEIGHT')})`);

    Blockly.Blocks.rotate_image = {
        init() {
            this.appendDummyInput().appendField('Повернуть');
            this.appendValueInput('IMG').setCheck('Frame').appendField('изображение');
            this.appendDummyInput().appendField('на угол').appendField(new Blockly.FieldDropdown([
                ['90 по часовой стрелке', '90_CLOCKWISE'], ['180 по часовой стрелке', '180_CLOCKWISE'], ['270 по часовой стрелке', '270_CLOCKWISE'],
                ['90 против часовой стрелки', '90_COUNTERCLOCKWISE'], ['180 против часовой стрелки', '180_COUNTERCLOCKWISE'], ['270 против часовой стрелки', '270_COUNTERCLOCKWISE']
            ]), 'chosen_angle');
            this.setInputsInline(true);
            this.setColour(CAMERA);
            this.setOutput(true, 'Frame');
        }
    };
    pythonGenerator.forBlock.rotate_image = (block) => output(`rotate_image(${value(block, 'IMG')}, '${block.getFieldValue('chosen_angle')}')`);

    Blockly.Blocks.flip_image = {
        init() {
            this.appendDummyInput().appendField('Отразить');
            this.appendValueInput('IMG').setCheck('Frame').appendField('изображение');
            this.appendDummyInput().appendField('вдоль').appendField(new Blockly.FieldDropdown([
                ['вертикальной оси', 'VERTICAL'], ['горизонтальной оси', 'HORIZONTAL'], ['вертикальной и горизонтальной осей', 'BOTH']
            ]), 'chosen_direction');
            this.setInputsInline(true);
            this.setColour(CAMERA);
            this.setOutput(true, 'Frame');
        }
    };
    pythonGenerator.forBlock.flip_image = (block) => output(`flip_image(${value(block, 'IMG')}, '${block.getFieldValue('chosen_direction')}')`);

    Blockly.Blocks.get_image_size = {
        init() {
            this.appendDummyInput().appendField('Получить размер');
            this.appendValueInput('IMG').setCheck('Frame').appendField('изображения');
            this.appendDummyInput().appendField(new Blockly.FieldDropdown([['ширину', 'width'], ['высоту', 'height']]), 'SIZE_TYPE');
            this.setInputsInline(true);
            this.setColour(CAMERA);
            this.setOutput(true, 'Number');
        }
    };
    pythonGenerator.forBlock.get_image_size = (block) => output(`get_image_size(${value(block, 'IMG')}, '${block.getFieldValue('SIZE_TYPE')}')`);

    imageValue('get_bgr_mask', 'Получить цветовую маску', [['IMG', 'Frame', 'изображения'], ['COLOR_LOWER', 'Colour', 'нижняя граница'], ['COLOR_UPPER', 'Colour', 'верхняя граница']], 'Mask',
        (b) => `get_bgr_mask(${value(b, 'IMG')}, ${value(b, 'COLOR_LOWER')}, ${value(b, 'COLOR_UPPER')})`);
    imageValue('get_gaussian_blur', 'Получить гауссово размытие', [['IMG', 'Frame', 'изображения'], ['KERNEL_SIZE', 'Number', 'размер ядра']], 'Frame',
        (b) => `get_gaussian_blur(${value(b, 'IMG')}, ${value(b, 'KERNEL_SIZE')})`);
    imageValue('get_contours', 'Получить контуры', [['MASK', 'Mask', 'из маски']], 'Contours',
        (b) => `get_contours(${value(b, 'MASK')})`);
    imageValue('detect_shape', 'Определить форму', [['CONTOURS', 'Contours', 'контура'], ['INDEX', 'Number', 'индекс']], 'String',
        (b) => `detect_shape(${value(b, 'CONTOURS')}, ${value(b, 'INDEX')})`);

    Blockly.Blocks.get_binary_threshold = {
        init() {
            this.appendDummyInput().appendField('Получить бинарную маску по порогу');
            this.appendValueInput('IMG').setCheck('Frame').appendField('из изображения');
            this.appendDummyInput().appendField('порог').appendField(new Blockly.FieldNumber(127, 0, 255, 1), 'THRESHOLD');
            this.setInputsInline(true);
            this.setColour(VISION);
            this.setOutput(true, 'Mask');
        }
    };
    pythonGenerator.forBlock.get_binary_threshold = (block) => output(`get_binary_threshold(${value(block, 'IMG')}, ${block.getFieldValue('THRESHOLD')})`);

    Blockly.Blocks.get_canny_edges = {
        init() {
            this.appendDummyInput().appendField('Получить маску Канни');
            this.appendValueInput('IMG').setCheck('Frame').appendField('изображения');
            this.appendDummyInput().appendField('нижняя граница').appendField(new Blockly.FieldNumber(100, 0, 255, 1), 'THRESHOLD1');
            this.appendDummyInput().appendField('верхняя граница').appendField(new Blockly.FieldNumber(200, 0, 255, 1), 'THRESHOLD2');
            this.setInputsInline(true);
            this.setColour(VISION);
            this.setOutput(true, 'Mask');
        }
    };
    pythonGenerator.forBlock.get_canny_edges = (block) => output(`get_canny_edges(${value(block, 'IMG')}, ${block.getFieldValue('THRESHOLD1')}, ${block.getFieldValue('THRESHOLD2')})`);

    Blockly.Blocks.aruco_find = {
        init() {
            this.appendDummyInput().appendField('Найти маркеры ArUco');
            this.appendValueInput('IMG').setCheck('Frame').appendField('на изображении');
            this.appendDummyInput().appendField('семейство').appendField(new Blockly.FieldDropdown([
                ['Original ArUco', 'DICT_ARUCO_ORIGINAL'], ['4x4_50', 'DICT_4X4_50'], ['5x5_100', 'DICT_5X5_100'], ['6x6_250', 'DICT_6X6_250'], ['7x7_1000', 'DICT_7X7_1000']
            ]), 'FAMILY');
            this.setInputsInline(true);
            this.setOutput(true, 'ArUco_object');
            this.setColour(VISION);
        }
    };
    pythonGenerator.forBlock.aruco_find = (block) => output(`aruco_find_on_image(${value(block, 'IMG')}, cv2.aruco.${block.getFieldValue('FAMILY')})`);

    Blockly.Blocks.ai_model_init = {
        init() {
            this.appendDummyInput().setAlign(Blockly.inputs.Align.RIGHT).appendField('Инициализация ИИ модели')
                .appendField(new Blockly.FieldDropdown([['Yolo', 'Yolo'], ['YoloPose', 'YoloPose'], ['PaddleOCR', 'PaddleOCR']]), 'chosen_model');
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setInputsInline(true);
            this.setColour(AI);
        }
    };
    pythonGenerator.forBlock.ai_model_init = (block) => `model_${String(block.getFieldValue('chosen_model')).toLowerCase()} = ${block.getFieldValue('chosen_model')}()\n`;

    Blockly.Blocks.yolo_object = {
        init() {
            this.appendDummyInput().appendField('Найти на кадре');
            this.appendValueInput('img').setCheck('Frame').setAlign(Blockly.inputs.Align.RIGHT);
            this.appendDummyInput().appendField('объект класса').appendField(new Blockly.FieldDropdown([
                ['Все', 'all'], ['Человек', 'person'], ['Велосипед', 'bicycle'], ['Машина', 'car'], ['Мотоцикл', 'motorbike'], ['Самолёт', 'aeroplane'], ['Автобус', 'bus'], ['Поезд', 'train'], ['Грузовик', 'truck'], ['Лодка', 'boat'], ['Кот', 'cat'], ['Собака', 'dog']
            ]), 'choice').appendField('для детекции');
            this.setOutput(true, 'AI_object');
            this.setInputsInline(true);
            this.setColour(AI);
        }
    };
    pythonGenerator.forBlock.yolo_object = (block) => output(`yolo_find_on_image(${value(block, 'img')}, '${block.getFieldValue('choice')}')`);

    imageValue('yolo_pose_object', 'Найти позу на кадре', [['img', 'Frame', '']], 'AI_object', (b) => `find_poses(${value(b, 'img')})`);
    imageValue('ppocr_text_find', 'Распознать текст', [['img', 'Frame', 'на изображении']], 'ppocr_object', (b) => `model_ppocr.run(${value(b, 'img')})`);
    imageValue('ppocr_text_selection_from_object', 'Получить текст', [['ppocr', 'ppocr_object', 'из результата распознавания']], 'String',
        (b) => `"\\n".join([text for group in ${value(b, 'ppocr')}[0][1] for (text, _) in group])`);

    Blockly.Blocks.pose_compare = {
        init() {
            this.appendDummyInput().appendField('Поза в объекте');
            this.appendValueInput('obj').setCheck('AI_object').setAlign(Blockly.inputs.Align.RIGHT);
            this.appendDummyInput().appendField('соответствует позе').appendField(new Blockly.FieldDropdown([
                ['Левая рука вверх', 'left_up'], ['Правая рука вверх', 'right_up'], ['Левая рука в сторону', 'left_side'], ['Правая рука в сторону', 'right_side'], ['Две руки вверх', 'two_hand_up'], ['Обе стороны', 'two_hand_side'], ['Кисти рядом в центре', 'wrist_centre']
            ]), 'choice');
            this.setOutput(true, 'Boolean');
            this.setInputsInline(true);
            this.setColour(AI);
        }
    };
    pythonGenerator.forBlock.pose_compare = (block) => output(`pose_compare(${value(block, 'obj')}, "${block.getFieldValue('choice')}", last_cmds)`);

    const objectMetric = (type: string, label: string, field: string, options: [string, string][], check: string) => {
        Blockly.Blocks[type] = {
            init() {
                this.appendDummyInput().appendField(label);
                this.appendValueInput('OBJ').setCheck(['ArUco_object', 'AI_object', 'Contours', 'ppocr_object']).appendField('объекта');
                this.appendDummyInput().appendField(new Blockly.FieldDropdown(options), field);
                this.appendValueInput('ID_OR_INDEX').setCheck('Number').appendField('ID/индекс');
                this.setInputsInline(true);
                this.setOutput(true, check);
                this.setColour(VISION);
            }
        };
        pythonGenerator.forBlock[type] = (block) => output(`${type}(${value(block, 'OBJ')}, ${value(block, 'ID_OR_INDEX')}, '${block.getFieldValue(field)}')`);
    };
    objectMetric('get_object_coords', 'Координаты', 'COORD_TYPE', [['центр', 'center'], ['левый верхний угол', 'top_left'], ['правый нижний угол', 'bottom_right']], 'Point');
    objectMetric('get_object_size', 'Размер', 'SIZE_TYPE', [['длина', 'width'], ['ширина', 'height'], ['диагональ', 'diagonal'], ['площадь', 'area']], 'Number');

    for (const [type, label, frameCheck, code] of [
        ['imshow', 'Демонстрация изображения из кадра', ['Frame', 'Mask'], (b: Blockly.Block) => `iv.imshow(name=${value(b, 'name')}, frame=${value(b, 'frame')})`],
        ['imwrite', 'Сохранить в файл', 'Frame', (b: Blockly.Block) => `cv2.imwrite("/mnt/media/photos/" + ${value(b, 'path')} + ".jpg", ${value(b, 'frame')}.copy())`]
    ] as const) {
        Blockly.Blocks[type] = {
            init() {
                this.appendDummyInput().appendField(label);
                this.appendValueInput('frame').setCheck(frameCheck as any).setAlign(Blockly.inputs.Align.RIGHT).appendField(type === 'imwrite' ? 'кадр' : '');
                this.appendValueInput(type === 'imshow' ? 'name' : 'path').setCheck('String').setAlign(Blockly.inputs.Align.RIGHT).appendField(type === 'imshow' ? 'в окно' : 'с именем');
                this.setPreviousStatement(true);
                this.setNextStatement(true);
                this.setInputsInline(true);
                this.setColour(CAMERA);
            }
        };
        pythonGenerator.forBlock[type] = (block) => `${code(block)}\n`;
    }

    Blockly.Blocks.paint_obj = {
        init() {
            this.appendDummyInput().appendField('Нарисовать').appendField(new Blockly.FieldDropdown([
                ['ArUco', 'aruco'], ['Yolo', 'yolo_obj'], ['Поза', 'yolopose_obj'], ['Контуры', 'contours'], ['Текст', 'text'], ['Точку', 'point'], ['Линию', 'line']
            ]), 'chosen_obj');
            this.appendValueInput('obj').setCheck(['ArUco_object', 'AI_object', 'Contours']).setAlign(Blockly.inputs.Align.RIGHT).appendField('объект');
            this.appendValueInput('frame').setCheck('Frame').setAlign(Blockly.inputs.Align.RIGHT).appendField('на кадре');
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setInputsInline(true);
            this.setColour(CAMERA);
        }
    };
    pythonGenerator.forBlock.paint_obj = (block) => `paint_obj(${value(block, 'obj')}, ${value(block, 'frame')})\n`;

    Blockly.Blocks.close_connection = {
        init() {
            this.appendDummyInput().appendField('Закрыть соединение с дроном');
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(FLIGHT);
        }
    };
    pythonGenerator.forBlock.close_connection = () => 'pioneer.close_connection()\n';

    const receivedGetter = (type: string, label: string, check: string, method: string) => {
        Blockly.Blocks[type] = {
            init() {
                this.appendDummyInput().appendField(label);
                this.appendDummyInput().setAlign(Blockly.inputs.Align.RIGHT).appendField('использовать последнее значение')
                    .appendField(new Blockly.FieldDropdown([['да', 'True'], ['нет', 'False']]), 'GET_LAST_RECEIVED');
                this.setInputsInline(true);
                this.setOutput(true, check);
                this.setColour(SENSOR);
            }
        };
        pythonGenerator.forBlock[type] = (block) => output(`pioneer.${method}(get_last_received=${block.getFieldValue('GET_LAST_RECEIVED')})`);
    };
    receivedGetter('get_local_position_lps', 'Получить текущие локальные координаты дрона', 'Point3D', 'get_local_position_lps');
    receivedGetter('get_dist_sensor_data', 'Получить данные от датчика расстояния', 'Number', 'get_dist_sensor_data');
    receivedGetter('get_battery_status', 'Получить напряжение батареи', 'Number', 'get_battery_status');
    getter('get_autopilot_state', 'Получить состояние автопилота', 'String', SENSOR, 'pioneer.get_autopilot_state()');

    Blockly.Blocks.get_local_position_component = {
        init() {
            this.appendDummyInput().appendField('Получить')
                .appendField(new Blockly.FieldDropdown([['координату X', '0'], ['координату Y', '1'], ['высоту Z', '2']]), 'INDEX');
            this.appendValueInput('POSITION_DATA').setCheck('Point3D').setAlign(Blockly.inputs.Align.RIGHT).appendField('из локальных координат');
            this.setInputsInline(true);
            this.setOutput(true, 'Number');
            this.setColour(SENSOR);
        }
    };
    pythonGenerator.forBlock.get_local_position_component = (block) =>
        output(`${value(block, 'POSITION_DATA', 'pioneer.get_local_position_lps()')}[${block.getFieldValue('INDEX')}]`);

    Blockly.Blocks.send_rc_channels = {
        init() {
            this.appendDummyInput().appendField('Передать каналы пульта управления');
            for (let index = 1; index <= 8; index += 1) {
                this.appendValueInput(`CHANNEL_${index}`).setCheck('Number').setAlign(Blockly.inputs.Align.RIGHT).appendField(`Канал ${index}`);
            }
            this.setInputsInline(true);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(FLIGHT);
        }
    };
    pythonGenerator.forBlock.send_rc_channels = (block) => {
        const channels = Array.from({ length: 8 }, (_, index) =>
            `channel_${index + 1}=${value(block, `CHANNEL_${index + 1}`, '1500')}`
        );
        return `pioneer.send_rc_channels(${channels.join(', ')})\n`;
    };

    Blockly.Blocks.lua_script_control = {
        init() {
            this.appendDummyInput().appendField(new Blockly.FieldDropdown([['Запустить', 'Start'], ['Остановить', 'Stop']]), 'COMMAND')
                .appendField('Lua-скрипт на дроне');
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(FLIGHT);
        }
    };
    pythonGenerator.forBlock.lua_script_control = (block) => `pioneer.lua_script_control("${block.getFieldValue('COMMAND')}")\n`;

    const cameraStatement = (type: string, label: string, code: string, runtime: 'camera' | 'stream' = 'camera') => {
        statement(type, label, CAMERA, code);
        pythonGenerator.forBlock[type] = () => {
            const definitions = (pythonGenerator as any).definitions_ as Record<string, string>;
            definitions[`import_${runtime}`] = `from pioneer_sdk import ${runtime === 'camera' ? 'Camera' : 'VideoStream'}`;
            definitions[`init_${runtime}`] = `${runtime} = ${runtime === 'camera' ? 'Camera' : 'VideoStream'}()`;
            return `${code}\n`;
        };
    };
    const cameraGetter = (type: string, label: string, check: string, code: string, runtime: 'camera' | 'stream' = 'camera') => {
        getter(type, label, check, CAMERA, code);
        pythonGenerator.forBlock[type] = () => {
            const definitions = (pythonGenerator as any).definitions_ as Record<string, string>;
            definitions[`import_${runtime}`] = `from pioneer_sdk import ${runtime === 'camera' ? 'Camera' : 'VideoStream'}`;
            definitions[`init_${runtime}`] = `${runtime} = ${runtime === 'camera' ? 'Camera' : 'VideoStream'}()`;
            return output(code);
        };
    };
    cameraGetter('camera_get_frame', 'Получить кадр с камеры как массив байтов', 'Array', 'camera.get_frame()');
    cameraGetter('cam_get_cv_frame', 'Получить кадр с камеры', 'Frame', 'camera.get_cv_frame()');
    cameraStatement('camera_connect', 'Подключить камеру к видеовышке', 'camera.connect()');
    cameraStatement('camera_disconnect', 'Отключить камеру от видеовышки', 'camera.disconnect()');
    cameraGetter('camera_connected', 'Камера подключена к видеовышке', 'Boolean', 'camera.connected()');
    cameraStatement('video_stream_start', 'Запустить видеопоток', 'stream.start()', 'stream');
    cameraStatement('video_stream_stop', 'Остановить видеопоток', 'stream.stop()', 'stream');
    cameraGetter('video_stream_connected', 'Видеопоток подключен', 'Boolean', 'stream.connected()', 'stream');
}
