import type * as Blockly from 'blockly';
import { Order } from 'blockly/python';
import { ARUCO_DRAW, POSE_DRAW } from './python-lib.js';
import { BRICKS_START_NATIVE_TYPE, bricksType } from './constants.js';
import { PAINT_OBJECT_NATIVE_TYPE } from './block-specs.js';
import { aiGenerators } from './generators-ai.js';
import {
    arg,
    asText,
    camera,
    colourHelper,
    define,
    fn,
    gen,
    importCv2,
    importDeque,
    ledColour,
    pioneer,
    statement,
    value,
    variableOfParent,
    type BlockGen,
    type CodeValue
} from './generator-kit.js';

export { collectBricksDefinitions } from './generator-kit.js';

/*
 * Python-генератор Bricks: блоки категорий «Полёт», «Модули», «Камера» и «Прочее» (ИИ и компьютерное зрение -
 * generators-ai.ts). Стандартные блоки Blockly (если, циклы, текст, переменные) генерирует сам Blockly: Bricks
 * использует их без изменений.
 */

const generators: Record<string, BlockGen> = {
    ...aiGenerators,
    [BRICKS_START_NATIVE_TYPE]: () => '',

    // ---------- Полёт ----------
    preflight: () => { pioneer(); return statement('pioneer.arm()'); },
    take_off: () => { pioneer(); return statement('pioneer.takeoff()'); },
    landing: () => { pioneer(); return statement('pioneer.land()'); },
    disarm: () => { pioneer(); return statement('pioneer.disarm()'); },
    go_local_point: (block) => {
        pioneer();
        const args = ['X', 'Y', 'Z', 'YAW', 'TIME'].map((name) => arg(block, name, '0')).join(',');
        return statement(`pioneer.go_to_local_point(${args})`);
    },
    go_local_point_bf: (block) => {
        pioneer();
        const args = ['X', 'Y', 'Z', 'YAW', 'TIME'].map((name) => arg(block, name, '0')).join(',');
        return statement(`pioneer.go_to_local_point_body_fixed(${args})`);
    },
    waiting_for_point: () => { pioneer(); return statement('while not pioneer.point_reached():\n    pass'); },
    point_reached: () => { pioneer(); return value('pioneer.point_reached()'); },
    set_speed_start: (block) => {
        pioneer();
        return statement(`pioneer.set_manual_speed(${['X', 'Y', 'Z', 'W'].map((name) => arg(block, name, '0')).join(',')})`);
    },
    set_speed_body: (block) => {
        pioneer();
        return statement(`pioneer.set_manual_speed_body_fixed(${['X', 'Y', 'Z', 'W'].map((name) => arg(block, name, '0')).join(',')})`);
    },
    set_yaw: (block) => { pioneer(); return statement(`pioneer.set_yaw(${arg(block, 'ANGLE', '0')})`); },

    // ---------- Модули ----------
    servo_set_angle: (block) => {
        define('servo', 'from pioneer_sdk2 import ServoCamera\nservo = ServoCamera()');
        return statement(`servo.set_angle(angle=${Number(block.getFieldValue('angle')) || 0})`);
    },
    grab_open: (block) => { pioneer(); return statement(`pioneer.grab_open(velocity=${arg(block, 'SPEED', '50')})`); },
    grab_close: (block) => { pioneer(); return statement(`pioneer.grab_close(velocity=${arg(block, 'SPEED', '50')})`); },
    ranger_data: () => { pioneer(); return value('pioneer.get_ranger_data()'); },
    ranger_value: (block) => {
        pioneer();
        const data = arg(block, 'DATA', 'pioneer.get_ranger_data()', Order.MEMBER);
        return value(`${data}[${Number(block.getFieldValue('side')) || 0}]`, Order.MEMBER);
    },
    led_all: (block) => { pioneer(); return statement(`pioneer.led_control(255, ${ledColour(block)})`); },
    led_index: (block) => {
        pioneer();
        const index = arg(block, 'NUM', '0');
        return statement(`pioneer.led_control(${index}, ${ledColour(block)})`);
    },
    get_dist_sensor_data: () => { pioneer(); return value('pioneer.get_dist_sensor_data()'); },
    get_orientation: (block) => {
        pioneer();
        return value(`pioneer.get_orientation()[${Number(block.getFieldValue('angle')) || 0}]`, Order.MEMBER);
    },
    get_local_position: () => { pioneer(); return value('pioneer.get_local_position_lps()'); },
    get_local_velocity: () => { pioneer(); return value('pioneer.get_local_velocity_lps()'); },
    get_global_position: () => { pioneer(); return value('pioneer.get_global_position_gps()'); },
    get_global_velocity: () => { pioneer(); return value('pioneer.get_global_velocity_gps()'); },

    // ---------- Камера ----------
    cam_get_cv_frame: (block) => {
        camera();
        const cameraName = block.getFieldValue('choice') === 'CameraType.OPT' ? 'cam_opt' : 'cam_main';
        const variable = variableOfParent(block);
        if (variable) define(`cams_${variable}`, `cams_dict["${variable}"] = "${cameraName}"`);
        return value(`${cameraName}.get_cv_frame()`);
    },
    imshow: (block) => {
        camera();
        const frame = arg(block, 'frame', 'None');
        const name = arg(block, 'name', "'test'");
        return statement(`iv.imshow(name=${name}, frame=${frame})`);
    },
    imwrite: (block) => {
        importCv2();
        const frame = arg(block, 'frame', 'None', Order.MEMBER);
        const path = asText(arg(block, 'path', "'photo'", Order.ADDITIVE));
        return statement(`cv2.imwrite("/mnt/media/photos/" + ${path} + ".jpg", ${frame}.copy())`);
    },
    [PAINT_OBJECT_NATIVE_TYPE]: (block) => {
        const shape = String(block.getFieldValue('chosen_obj'));
        const frame = arg(block, 'frame', 'None');
        const obj = arg(block, 'obj', 'None');
        if (shape === 'yolopose_obj') {
            importDeque();
            define('pose_draw', fn(POSE_DRAW));
            return statement(`draw_poses(${frame}, ${obj}, tracker_state)`);
        }
        if (shape === 'aruco') {
            importCv2();
            define('import_cv2_aruco', 'import cv2.aruco');
            define('aruco_draw', fn(ARUCO_DRAW));
            const ids = block.getFieldValue('chosen_objaaaa') === 'id' ? arg(block, 'ID', '0') : 'None';
            return statement(`draw_aruco_on_image(${frame}, ${obj}, ${ids}, color=(0,255,0))`);
        }
        const colourCode = gen.valueToCode(block, 'colour', Order.NONE);
        if (colourCode) colourHelper();
        return statement(`draw_yolo_on_image(${frame}, ${obj}${colourCode ? `, hex_to_bgr(${colourCode})` : ''})`);
    },
    image_size: (block) => {
        const image = arg(block, 'img', 'None', Order.MEMBER);
        return value(`${image}.shape[${block.getFieldValue('choice') === 'height' ? 0 : 1}]`, Order.MEMBER);
    },
    image_resize: (block) => {
        importCv2();
        return value(`cv2.resize(${arg(block, 'img', 'None')}, (${arg(block, 'width', '320')}, ${arg(block, 'height', '240')}))`);
    },
    image_rotate: (block) => {
        importCv2();
        return value(`cv2.rotate(${arg(block, 'img', 'None')}, cv2.${block.getFieldValue('choice')})`);
    },
    image_flip: (block) => {
        importCv2();
        return value(`cv2.flip(${arg(block, 'img', 'None')}, ${block.getFieldValue('choice')})`);
    },
    image_crop: (block) => {
        const image = arg(block, 'img', 'None', Order.MEMBER);
        const from = arg(block, 'from', '(0, 0)', Order.MEMBER);
        const to = arg(block, 'to', '(0, 0)', Order.MEMBER);
        return value(`${image}[${from}[1]:${to}[1], ${from}[0]:${to}[0]]`, Order.MEMBER);
    },

    // ---------- Прочее ----------
    sleep: (block) => {
        define('import_sleep', 'from time import sleep');
        return statement(`sleep(${arg(block, 'NAME', '1')})`);
    },
    get_time: () => {
        define('import_time', 'import time');
        return value('time.time()');
    },
    'field-colour': (block) => value(`"${String(block.getFieldValue('colour')).toLowerCase()}"`, Order.ATOMIC),
    'field-angle': (block) => value(String(Number(block.getFieldValue('angle')) || 0), Order.ATOMIC),
    point: (block) => value(`(${arg(block, 'X', '0')}, ${arg(block, 'Y', '0')})`, Order.ATOMIC)
};

let installed = false;

/** Подключает генераторы Bricks к pythonGenerator (общий с остальным Blockly; типы блоков не пересекаются). */
export function installBricksGenerators(): void {
    if (installed) return;
    installed = true;
    for (const [type, generate] of Object.entries(generators)) {
        (gen.forBlock as Record<string, (block: Blockly.Block) => string | CodeValue | null>)[bricksType(type)] = generate;
    }
}

/** Родные имена блоков (как в XML Bricks), для которых есть генератор. */
export function bricksGeneratorTypes(): string[] {
    return Object.keys(generators);
}
