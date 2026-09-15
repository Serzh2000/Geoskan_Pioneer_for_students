/**
 * Светодиоды «Пионера»: 4 бортовых индикатора + матрица 5x5 = 29 адресуемых
 * светодиодов. Тот же порядок индексов, что и в состоянии дрона (drone.leds):
 * 0..3 — бортовые, 4..28 — матрица построчно сверху вниз, слева направо.
 *
 * Все 29 светодиодов — это один THREE.InstancedMesh: цвет каждого задаётся
 * через setColorAt, поэтому вся гирлянда рисуется за один вызов отрисовки
 * вместо 29 отдельных мешей с собственными материалами.
 */
import * as THREE from 'three';
import type { DroneMaterials } from './materials.js';
import {
    BASE_LED_COUNT,
    BASE_LED_POSITIONS,
    LED_PACKAGE_HEIGHT,
    LED_PACKAGE_SIZE,
    LED_SURFACE_Z,
    MATRIX_LED_COLS,
    MATRIX_LED_ROWS,
    MATRIX_LED_SPACING,
    TOTAL_LED_COUNT
} from './layout.js';

export const LED_INSTANCE_MESH_NAME = 'led_instances';
export const LED_MATRIX_GLOW_LIGHT_NAME = 'led_matrix_glow_light';

/** Цвет корпуса погашенного светодиода — светло-серый пластик WS2812B. */
const LED_OFF_COLOR = new THREE.Color(0.78, 0.78, 0.80);

/**
 * Геометрия корпуса одного светодиода.
 *
 * Атрибут color заполняется единицами намеренно: во фрагментном шейдере three
 * читает vColor только при USE_COLOR, то есть при material.vertexColors = true,
 * а он, в свою очередь, требует настоящего атрибута color в геометрии.
 * Белый атрибут + instanceColor даёт ровно цвет инстанса.
 */
function createLedGeometry() {
    const geometry = new THREE.BoxGeometry(
        LED_PACKAGE_SIZE,
        LED_PACKAGE_SIZE,
        LED_PACKAGE_HEIGHT
    );

    const vertexCount = geometry.attributes.position.count;
    const colors = new Float32Array(vertexCount * 3).fill(1);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return geometry;
}

/** Мировые (в системе модели) позиции всех 29 светодиодов по порядку индексов. */
export function getLedPositions(): Array<[number, number, number]> {
    const positions: Array<[number, number, number]> = [];

    BASE_LED_POSITIONS.forEach(([x, y]) => {
        positions.push([x, y, LED_SURFACE_Z]);
    });

    for (let row = 0; row < MATRIX_LED_ROWS; row += 1) {
        for (let col = 0; col < MATRIX_LED_COLS; col += 1) {
            positions.push([
                (col - 2) * MATRIX_LED_SPACING,
                (2 - row) * MATRIX_LED_SPACING,
                LED_SURFACE_Z
            ]);
        }
    }

    return positions;
}

export function createLEDs(materials: DroneMaterials) {
    const ledGroup = new THREE.Group();
    ledGroup.name = 'leds';

    const instances = new THREE.InstancedMesh(
        createLedGeometry(),
        materials.led,
        TOTAL_LED_COUNT
    );
    instances.name = LED_INSTANCE_MESH_NAME;
    // Матрицы инстансов задаются один раз и больше не меняются.
    instances.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    instances.frustumCulled = false;

    const matrix = new THREE.Matrix4();
    getLedPositions().forEach((position, index) => {
        matrix.makeTranslation(position[0], position[1], position[2]);
        instances.setMatrixAt(index, matrix);
        // setColorAt на первом вызове создаёт instanceColor, заполненный
        // нулями, поэтому обязательно инициализируем все инстансы.
        instances.setColorAt(index, LED_OFF_COLOR);
    });
    instances.instanceMatrix.needsUpdate = true;
    if (instances.instanceColor) instances.instanceColor.needsUpdate = true;

    ledGroup.add(instances);

    // Точечные источники для «свечения» бортовых индикаторов.
    BASE_LED_POSITIONS.forEach(([x, y], index) => {
        const light = new THREE.PointLight(0x000000, 0, 0.24);
        light.name = `base_led_light_${index}`;
        light.position.set(x, y, LED_SURFACE_Z + 0.002);
        ledGroup.add(light);
    });

    // Общее свечение матрицы.
    const matrixGlow = new THREE.PointLight(0x000000, 0, 0.26);
    matrixGlow.name = LED_MATRIX_GLOW_LIGHT_NAME;
    matrixGlow.position.set(0, 0, LED_SURFACE_Z + 0.02);
    ledGroup.add(matrixGlow);

    return ledGroup;
}

/** Возвращает InstancedMesh со светодиодами внутри модели дрона. */
export function findLedInstances(droneMesh: THREE.Object3D) {
    const found = droneMesh.getObjectByName(LED_INSTANCE_MESH_NAME);
    return found instanceof THREE.InstancedMesh ? found : null;
}

export { LED_OFF_COLOR, BASE_LED_COUNT };
