/**
 * Рама «Пионера»: две палубы, два несущих луча X-схемы, аккумулятор,
 * стойки шасси, корпус камеры и плата LED-матрицы.
 *
 * Все эти детали неподвижны и окрашены одним материалом, поэтому склеиваются
 * в одну геометрию — вся рама рисуется за один вызов отрисовки.
 */
import * as THREE from 'three';
import { box, buildMergedMesh, cylinderZ } from './build-utils.js';
import type { DroneMaterials } from './materials.js';
import {
    ARM_Z,
    BATTERY_Z,
    BODY_LENGTH,
    BODY_WIDTH,
    CAMERA_POSITION,
    DECK_BOTTOM_Z,
    DECK_THICKNESS,
    DECK_TOP_Z,
    LANDING_GEAR_DROP,
    MATRIX_BOARD_SIZE,
    MOTOR_ARM_OFFSET,
    MOTOR_BODY_Z,
    MOTOR_POSITIONS
} from './layout.js';

const ARM_LENGTH = MOTOR_ARM_OFFSET * Math.SQRT2 * 2;
const ARM_WIDTH = 0.019;
const ARM_THICKNESS = 0.007;

const LEG_SPREAD = 0.038;
const LEG_TILT = 0.22;
const LEG_THICKNESS = 0.0055;

/**
 * Тёмная часть рамы. Возвращает одну склеенную сетку.
 */
export function createFrameStructure(materials: DroneMaterials) {
    const parts: THREE.BufferGeometry[] = [];

    // Верхняя и нижняя палубы центрального корпуса.
    parts.push(box([BODY_WIDTH, BODY_LENGTH, DECK_THICKNESS], {
        position: [0, 0, DECK_TOP_Z - DECK_THICKNESS / 2]
    }));
    parts.push(box([BODY_WIDTH * 0.92, BODY_LENGTH * 0.92, 0.003], {
        position: [0, 0, DECK_BOTTOM_Z]
    }));

    // Два несущих луча по диагоналям (X-конфигурация).
    parts.push(box([ARM_LENGTH, ARM_WIDTH, ARM_THICKNESS], {
        position: [0, 0, ARM_Z],
        rotation: [0, 0, Math.PI / 4]
    }));
    parts.push(box([ARM_LENGTH, ARM_WIDTH, ARM_THICKNESS], {
        position: [0, 0, ARM_Z],
        rotation: [0, 0, -Math.PI / 4]
    }));

    // Корпуса моторов (статоры) — оранжевые колокола добавляются отдельно.
    MOTOR_POSITIONS.forEach(([x, y]) => {
        parts.push(cylinderZ(0.0145, 0.0155, 0.020, 8, {
            position: [x, y, MOTOR_BODY_Z]
        }));
        // Площадка крепления мотора к лучу.
        parts.push(box([0.030, 0.030, 0.004], {
            position: [x, y, ARM_Z + 0.004]
        }));
    });

    // Аккумулятор под нижней палубой.
    parts.push(box([0.036, 0.078, 0.019], {
        position: [0, -0.004, BATTERY_Z]
    }));

    // Плата LED-матрицы на верхней палубе.
    parts.push(box([MATRIX_BOARD_SIZE, MATRIX_BOARD_SIZE, 0.002], {
        position: [0, 0, DECK_TOP_Z + 0.001]
    }));

    // Блок полётного контроллера в хвостовой части палубы и разъём питания:
    // мелочь, но без неё корпус читается как пустая пластина.
    parts.push(box([0.046, 0.022, 0.009], {
        position: [0, -0.040, DECK_TOP_Z + 0.0045]
    }));
    parts.push(box([0.014, 0.010, 0.012], {
        position: [0.028, -0.038, DECK_TOP_Z + 0.006]
    }));

    // Корпус передней камеры.
    parts.push(box([0.030, 0.012, 0.028], { position: CAMERA_POSITION }));

    parts.push(...createLandingGearParts());

    return buildMergedMesh('drone_frame_shell', parts, materials.frame, {
        castShadow: true,
        receiveShadow: true
    });
}

/**
 * Четыре стойки шасси, расходящиеся вниз и наружу, с плоскими пятками.
 * Низ пяток лежит на -LANDING_GEAR_DROP, то есть после общего сдвига модели
 * оказывается ровно на уровне пола.
 */
function createLandingGearParts() {
    const parts: THREE.BufferGeometry[] = [];
    const corners: Array<[number, number]> = [
        [LEG_SPREAD, LEG_SPREAD],
        [LEG_SPREAD, -LEG_SPREAD],
        [-LEG_SPREAD, LEG_SPREAD],
        [-LEG_SPREAD, -LEG_SPREAD]
    ];

    // Длина подобрана так, чтобы наклонная стойка не проваливалась ниже пяток:
    // её вертикальный габарит остаётся внутри LANDING_GEAR_DROP.
    const legLength = LANDING_GEAR_DROP;

    corners.forEach(([x, y]) => {
        const angle = Math.atan2(y, x);
        // Наклон стойки наружу от центра.
        const tiltX = Math.cos(angle) * LEG_TILT;
        const tiltY = Math.sin(angle) * LEG_TILT;
        const footX = x + Math.cos(angle) * LANDING_GEAR_DROP * Math.sin(LEG_TILT);
        const footY = y + Math.sin(angle) * LANDING_GEAR_DROP * Math.sin(LEG_TILT);

        parts.push(box([LEG_THICKNESS, LEG_THICKNESS, legLength], {
            position: [
                (x + footX) / 2,
                (y + footY) / 2,
                DECK_BOTTOM_Z - LANDING_GEAR_DROP / 2
            ],
            rotation: [tiltY, -tiltX, 0]
        }));

        // Пятка.
        parts.push(box([0.016, 0.016, 0.004], {
            position: [footX, footY, -LANDING_GEAR_DROP + 0.002]
        }));
    });

    return parts;
}

/**
 * Оранжевые акценты корпуса: колокола моторов.
 * Лопасти винтов оранжевые тоже, но они вращаются и живут в motors.ts.
 */
export function createAccentStructure(materials: DroneMaterials) {
    const parts: THREE.BufferGeometry[] = [];

    MOTOR_POSITIONS.forEach(([x, y]) => {
        parts.push(cylinderZ(0.0168, 0.0162, 0.015, 10, {
            position: [x, y, 0.0425]
        }));
    });

    return buildMergedMesh('drone_accents', parts, materials.accent, {
        castShadow: true
    });
}

/** Металлические детали: втулки винтов и оправа объектива. */
export function createMetalStructure(materials: DroneMaterials) {
    const parts: THREE.BufferGeometry[] = [];

    // Оправа объектива передней камеры смотрит вперёд (вдоль +Y).
    parts.push(cylinderZ(0.0075, 0.0075, 0.010, 10, {
        position: [CAMERA_POSITION[0], CAMERA_POSITION[1] + 0.009, CAMERA_POSITION[2]],
        rotation: [Math.PI / 2, 0, 0]
    }));

    return buildMergedMesh('drone_metal', parts, materials.metal, {
        castShadow: false
    });
}
