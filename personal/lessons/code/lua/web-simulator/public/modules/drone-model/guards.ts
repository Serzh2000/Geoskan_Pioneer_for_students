/**
 * Поликарбонатная защита винтов — самая узнаваемая деталь «Пионера».
 *
 * Конструкция повторяет оригинал: вокруг каждого винта два тонких обруча
 * (нижний и верхний ярус), связанных короткими стойками. Кольца соседних
 * моторов касаются в серединах сторон и там сшиты короткими перемычками —
 * вместе получается единый скруглённый периметр, как на настоящем аппарате.
 *
 * Всё склеено в одну геометрию: вся защита — один вызов отрисовки.
 */
import * as THREE from 'three';
import { box, buildMergedMesh, cylinderZ } from './build-utils.js';
import type { DroneMaterials } from './materials.js';
import {
    GUARD_LOWER_Z,
    GUARD_RADIUS,
    GUARD_UPPER_Z,
    MOTOR_ARM_OFFSET,
    MOTOR_POSITIONS
} from './layout.js';

const HOOP_SEGMENTS = 18;
const HOOP_HEIGHT = 0.006;
const POSTS_PER_GUARD = 5;
const POST_SIZE = 0.0042;

export function createGuards(materials: DroneMaterials) {
    const parts: THREE.BufferGeometry[] = [];
    const tiers = [GUARD_LOWER_Z, GUARD_UPPER_Z];

    MOTOR_POSITIONS.forEach(([x, y]) => {
        // Два обруча. Открытый цилиндр без крышек читается как тонкое кольцо
        // и стоит всего HOOP_SEGMENTS * 2 треугольников.
        tiers.forEach((z) => {
            parts.push(cylinderZ(
                GUARD_RADIUS,
                GUARD_RADIUS,
                HOOP_HEIGHT,
                HOOP_SEGMENTS,
                { position: [x, y, z] },
                true
            ));
        });

        // Стойки между ярусами — только с внешней стороны кольца,
        // как на настоящем аппарате.
        const outwardAngle = Math.atan2(y, x);
        for (let i = 0; i < POSTS_PER_GUARD; i += 1) {
            const spread = (i / (POSTS_PER_GUARD - 1) - 0.5) * Math.PI * 1.15;
            const angle = outwardAngle + spread;
            parts.push(box(
                [POST_SIZE, POST_SIZE, GUARD_UPPER_Z - GUARD_LOWER_Z],
                {
                    position: [
                        x + Math.cos(angle) * GUARD_RADIUS,
                        y + Math.sin(angle) * GUARD_RADIUS,
                        (GUARD_LOWER_Z + GUARD_UPPER_Z) / 2
                    ]
                }
            ));
        }
    });

    parts.push(...createBridges(tiers));

    return buildMergedMesh('drone_guards', parts, materials.guard);
}

/**
 * Короткие перемычки в точках касания соседних колец — по серединам сторон
 * квадрата, образованного моторами (спереди, сзади, слева и справа).
 */
function createBridges(tiers: number[]) {
    const parts: THREE.BufferGeometry[] = [];
    const a = MOTOR_ARM_OFFSET;
    const bridgeSpan = 0.05;

    const joints: Array<{ position: [number, number]; alongY: boolean }> = [
        { position: [a, 0], alongY: true },
        { position: [-a, 0], alongY: true },
        { position: [0, a], alongY: false },
        { position: [0, -a], alongY: false }
    ];

    tiers.forEach((z) => {
        joints.forEach(({ position, alongY }) => {
            const size: [number, number, number] = alongY
                ? [0.008, bridgeSpan, HOOP_HEIGHT]
                : [bridgeSpan, 0.008, HOOP_HEIGHT];
            parts.push(box(size, { position: [position[0], position[1], z] }));
        });
    });

    return parts;
}
