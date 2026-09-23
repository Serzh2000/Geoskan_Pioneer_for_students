/**
 * Shared source of truth for the string tags stored in `Object3D.userData.type`.
 *
 * These strings serve double duty across the codebase:
 *  - the value assigned when a scene object is created (the various
 *    `create*Mesh` factories under `environment/obstacles/`), and
 *  - the literal compared against by collision/interaction logic elsewhere
 *    (e.g. `physics/collisions.ts`, `physics/magnet-gripper.ts`,
 *    `scene/objects/object-manager.ts`).
 *
 * Previously each site hard-coded its own copy of these literals, so a typo
 * in any single occurrence would silently break the corresponding
 * collision/interaction check with no compile-time warning. Import the
 * relevant constant from here instead of re-typing the literal.
 *
 * The string values themselves must NOT change: some are user-facing
 * (shown as scene-object names/labels) and may be persisted in saved
 * scenes. This module only centralizes them - it is a pure refactor.
 */
export const OBJECT_TYPE = {
    GROUND: 'ground',
    GROUP: 'group',
    GATE: 'Ворота',
    BUILDING: 'Многоэтажка',
    ROAD: 'Дорога',
    RAILWAY: 'Железнодорожные пути',
    START_POSITION: 'Стартовая позиция',
    HELIPORT: 'Хелипорт',
    CHARGE_STATION: 'Станция заряда',
    CARGO: 'Груз',
    CARGO_SMALL: 'Грузик',
    VIDEO_TOWER: 'Видеомачта',
    CAR: 'Автомобиль',
    TRAIN: 'Поезд'
} as const;

export type ObjectTypeTag = typeof OBJECT_TYPE[keyof typeof OBJECT_TYPE];
