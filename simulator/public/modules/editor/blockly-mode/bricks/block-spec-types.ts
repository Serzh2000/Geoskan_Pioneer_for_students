/*
 * Описание блоков Bricks (Мини 2) данными: из него строятся и сами блоки (blocks.ts), и тулбокс (toolbox.ts).
 * Имена типов, полей и входов блоков из проектов Bricks 2.3.0 (start_block, preflight, take_off, landing,
 * go_local_point, waiting_for_point, led_all, led_index, sleep, get_dist_sensor_data, servo_set_angle,
 * cam_get_cv_frame, imshow, imwrite, aruco_find, ai_model_init, yolo_object, yolo_pose_object, pose_compare,
 * ppocr_text_find, ppocr_text_selection_from_object, paint_obj, field-colour) взяты из make_projects.py сборника
 * и должны совпадать буквально: иначе проекты Bricks не откроются. Остальные имена (в палитрах Bricks
 * они видны только на снимках) выбраны здесь по тому же образцу.
 */
import { BRICKS_COLOURS, bricksType } from './constants.js';

export type BricksCategory = 'flight' | 'modules' | 'camera' | 'ai' | 'vision' | 'other';

export type BricksShadow = { type: 'math_number'; value: number } | { type: 'text'; value: string };

export type BricksPart =
    | string
    | { input: string; shadow?: BricksShadow; check?: string }
    | { dd: string; options: ReadonlyArray<readonly [string, string]> }
    | { num: string; value: number; min?: number; max?: number; precision?: number }
    | { colour: string; value: string }
    | { angle: string; value: number };

export type BricksBlockSpec = {
    type: string;
    category: BricksCategory;
    /** statement - блок-команда, value - блок со значением. */
    kind: 'statement' | 'value';
    /** Проверка типа выхода для value-блоков. */
    output?: string;
    parts: BricksPart[];
    tooltip: string;
    /** Python, в который превращается блок (для подсказки и справочника). */
    python: string;
    /** В симуляторе нет нужной функции OpenCV: блок отключён с подсказкой, на дроне работает. */
    droneOnly?: boolean;
};

/** Блок «Нарисовать …» (paint_obj): форма зависит от выбранного объекта. */
export const PAINT_OBJECT_CHOICES: ReadonlyArray<readonly [string, string]> = [
    ['yolo_obj', 'Yolo'],
    ['yolopose_obj', 'Поза'],
    ['aruco', 'ArUco']
];

/** Родное имя блока «Нарисовать …» в проектах Bricks и его имя внутри редактора. */
export const PAINT_OBJECT_NATIVE_TYPE = 'paint_obj';
export const PAINT_OBJECT_TYPE = bricksType(PAINT_OBJECT_NATIVE_TYPE);

export const PAINT_OBJECT_PYTHON =
    'draw_yolo_on_image(frame, obj, hex_to_bgr(цвет)) / draw_poses(frame, obj, tracker_state) / draw_aruco_on_image(frame, obj, None, color=(0,255,0))';

export const BRICKS_CATEGORY_COLOUR: Record<BricksCategory, string> = {
    flight: BRICKS_COLOURS.flight,
    modules: BRICKS_COLOURS.modules,
    camera: BRICKS_COLOURS.camera,
    ai: BRICKS_COLOURS.ai,
    vision: BRICKS_COLOURS.vision,
    other: BRICKS_COLOURS.other
};

export const BRICKS_CATEGORY_LABEL: Record<BricksCategory, string> = {
    flight: 'Полёт',
    modules: 'Модули',
    camera: 'Камера',
    ai: 'ИИ',
    vision: 'Компьютерное зрение',
    other: 'Прочее'
};

