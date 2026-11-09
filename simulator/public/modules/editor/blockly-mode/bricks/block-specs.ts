/*
 * Описание блоков Bricks (Мини 2) данными: из него строятся и сами блоки (blocks.ts), и тулбокс (toolbox.ts).
 * Имена типов, полей и входов блоков из проектов Bricks 2.3.0 (start_block, preflight, take_off, landing,
 * go_local_point, waiting_for_point, led_all, led_index, sleep, get_dist_sensor_data, servo_set_angle,
 * cam_get_cv_frame, imshow, imwrite, aruco_find, ai_model_init, yolo_object, yolo_pose_object, pose_compare,
 * ppocr_text_find, ppocr_text_selection_from_object, paint_obj, field-colour) взяты из make_projects.py сборника
 * и должны совпадать буквально: иначе проекты Bricks не откроются. Остальные имена (в палитрах Bricks
 * они видны только на снимках) выбраны здесь по тому же образцу.
 */
import { BRICKS_SPECS } from './block-spec-table.js';
import { bricksType } from './constants.js';
import { PAINT_OBJECT_NATIVE_TYPE, type BricksCategory, type BricksBlockSpec } from './block-spec-types.js';

export * from './block-spec-types.js';
export { BRICKS_SPECS } from './block-spec-table.js';

/** Порядок блоков категории «Камера» в палитре Bricks: paint_obj стоит после imwrite. */
export function bricksSpecsByCategory(category: BricksCategory): BricksBlockSpec[] {
    return BRICKS_SPECS.filter((spec) => spec.category === category);
}

/** Родные имена всех блоков Bricks (как в XML проектов), включая start_block и paint_obj. */
export function allBricksNativeTypes(): string[] {
    return ['start_block', PAINT_OBJECT_NATIVE_TYPE, ...BRICKS_SPECS.map((spec) => spec.type)];
}

/** Имена типов всех блоков Bricks внутри редактора (с префиксом bricks_). */
export function allBricksBlockTypes(): string[] {
    return allBricksNativeTypes().map(bricksType);
}

let blockTypeSet: Set<string> | null = null;

export function isBricksBlockType(type: string): boolean {
    blockTypeSet ??= new Set(allBricksBlockTypes());
    return blockTypeSet.has(type);
}

export function bricksDroneOnlyTypes(): string[] {
    return BRICKS_SPECS.filter((spec) => spec.droneOnly).map((spec) => bricksType(spec.type));
}
