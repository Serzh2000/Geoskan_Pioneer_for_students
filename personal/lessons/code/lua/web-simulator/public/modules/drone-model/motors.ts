/**
 * Винтомоторная группа.
 *
 * Сами моторы неподвижны и склеены в раму, а здесь живут четыре узла
 * rotor_0..rotor_3 — пустые Object3D-пивоты, которые крутит animateRotors.
 * У каждого пивота один меш винта; геометрия винта общая для всех четырёх,
 * поэтому на GPU она загружается один раз.
 */
import * as THREE from 'three';
import { cylinderZ, mergeParts, placeGeometry } from './build-utils.js';
import type { DroneMaterials } from './materials.js';
import { MOTOR_POSITIONS, PROPELLER_RADIUS, PROPELLER_Z } from './layout.js';

const BLADE_ROOT = 0.010;
const BLADE_LENGTH = PROPELLER_RADIUS - BLADE_ROOT;
const BLADE_ROOT_WIDTH = 0.010;
const BLADE_MAX_WIDTH = 0.021;
const BLADE_TIP_WIDTH = 0.008;
const BLADE_THICKNESS = 0.0016;
const BLADE_PITCH = 0.18;
const BLADE_SWEEP = 0.12;

/**
 * Лопасть винта: брус, у которого ширина меняется вдоль длины —
 * узкая у комля, самая широкая примерно на двух третях, сужается к кончику.
 * Это те же 12 треугольников, что и у простого бруса, но силуэт читается
 * как настоящий винт, а не как палка.
 */
function createBladeGeometry() {
    const geometry = new THREE.BoxGeometry(BLADE_LENGTH, BLADE_MAX_WIDTH, BLADE_THICKNESS);
    const position = geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < position.count; i += 1) {
        const x = position.getX(i);
        // t: 0 у комля, 1 у кончика.
        const t = x / BLADE_LENGTH + 0.5;
        const profile = t < 0.65
            ? BLADE_ROOT_WIDTH + (BLADE_MAX_WIDTH - BLADE_ROOT_WIDTH) * (t / 0.65)
            : BLADE_MAX_WIDTH + (BLADE_TIP_WIDTH - BLADE_MAX_WIDTH) * ((t - 0.65) / 0.35);

        position.setY(i, position.getY(i) * (profile / BLADE_MAX_WIDTH));
        // Небольшая саблевидность: кончик уходит назад по вращению.
        position.setY(i, position.getY(i) + BLADE_SWEEP * t * t * 0.02);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
}

/**
 * Геометрия одного двухлопастного винта: втулка и две лопасти,
 * развёрнутые на небольшой угол атаки.
 */
function createPropellerGeometry() {
    const parts: THREE.BufferGeometry[] = [];

    // Втулка.
    parts.push(cylinderZ(0.0085, 0.0095, 0.007, 8, { position: [0, 0, 0] }));

    // Две лопасти в противоположных направлениях.
    [1, -1].forEach((direction) => {
        const blade = createBladeGeometry();
        if (direction < 0) blade.rotateZ(Math.PI);
        parts.push(placeGeometry(blade, {
            position: [direction * (BLADE_LENGTH / 2 + BLADE_ROOT), 0, 0],
            rotation: [BLADE_PITCH * direction, 0, 0]
        }));
    });

    return mergeParts(parts);
}

/**
 * Собирает группу motors_group. Имя важно: по нему crash-visuals разбирает
 * дрон на части при падении.
 */
export function createMotors(materials: DroneMaterials) {
    const motorsGroup = new THREE.Group();
    motorsGroup.name = 'motors_group';

    // Одна геометрия на все четыре винта.
    const propellerGeometry = createPropellerGeometry();

    MOTOR_POSITIONS.forEach(([x, y], index) => {
        const rotor = new THREE.Object3D();
        rotor.name = `rotor_${index}`;
        rotor.position.set(x, y, PROPELLER_Z);

        const propeller = new THREE.Mesh(propellerGeometry, materials.accent);
        propeller.name = `rotor_prop_${index}`;
        propeller.castShadow = true;
        // Соседние по диагонали винты вращаются в разные стороны —
        // разворачиваем геометрию, чтобы угол атаки смотрел правильно.
        if (index >= 2) {
            propeller.rotation.y = Math.PI;
        }

        rotor.add(propeller);
        motorsGroup.add(rotor);
    });

    return motorsGroup;
}
