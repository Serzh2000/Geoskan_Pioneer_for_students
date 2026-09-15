/**
 * Вспомогательные функции сборки низкополигональной модели.
 *
 * Идея: все неподвижные детали, окрашенные одним материалом, склеиваются в
 * одну BufferGeometry через mergeGeometries. Благодаря этому вся рама рисуется
 * за один вызов отрисовки вместо нескольких десятков отдельных мешей.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type PartTransform = {
    position?: [number, number, number];
    rotation?: [number, number, number];
};

const reusableMatrix = new THREE.Matrix4();
const reusableEuler = new THREE.Euler();
const reusableQuaternion = new THREE.Quaternion();
const reusablePosition = new THREE.Vector3();
const reusableScale = new THREE.Vector3(1, 1, 1);

/**
 * Применяет смещение/поворот прямо к вершинам геометрии.
 * Такую геометрию уже можно склеивать с другими — трансформация «запечена».
 */
export function placeGeometry(geometry: THREE.BufferGeometry, transform: PartTransform = {}) {
    const [x, y, z] = transform.position ?? [0, 0, 0];
    const [rx, ry, rz] = transform.rotation ?? [0, 0, 0];

    reusableEuler.set(rx, ry, rz);
    reusableQuaternion.setFromEuler(reusableEuler);
    reusablePosition.set(x, y, z);
    reusableScale.set(1, 1, 1);
    reusableMatrix.compose(reusablePosition, reusableQuaternion, reusableScale);

    geometry.applyMatrix4(reusableMatrix);
    return geometry;
}

/**
 * Склеивает список геометрий в одну. Перед склейкой убираются атрибуты,
 * которые есть не у всех частей: mergeGeometries требует одинакового набора.
 */
export function mergeParts(parts: THREE.BufferGeometry[]) {
    if (parts.length === 0) {
        throw new Error('mergeParts requires at least one geometry.');
    }

    parts.forEach((geometry) => {
        // Примитивы three содержат position/normal/uv. Лишние атрибуты
        // (например, добавленные вручную) помешали бы склейке.
        Object.keys(geometry.attributes).forEach((name) => {
            if (name === 'position' || name === 'normal' || name === 'uv') return;
            geometry.deleteAttribute(name);
        });
        geometry.clearGroups();
    });

    const merged = mergeGeometries(parts, false);
    if (!merged) {
        throw new Error('mergeGeometries failed: incompatible geometry attributes.');
    }

    parts.forEach((geometry) => geometry.dispose());
    merged.computeBoundingSphere();
    return merged;
}

/** Собирает одну сетку из списка деталей, окрашенных общим материалом. */
export function buildMergedMesh(
    name: string,
    parts: THREE.BufferGeometry[],
    material: THREE.Material,
    options: { castShadow?: boolean; receiveShadow?: boolean } = {}
) {
    const mesh = new THREE.Mesh(mergeParts(parts), material);
    mesh.name = name;
    mesh.castShadow = options.castShadow ?? false;
    mesh.receiveShadow = options.receiveShadow ?? false;
    return mesh;
}

/** Прямоугольный брус. */
export function box(
    size: [number, number, number],
    transform: PartTransform = {}
) {
    return placeGeometry(new THREE.BoxGeometry(size[0], size[1], size[2]), transform);
}

/**
 * Цилиндр с осью вдоль Z (в three цилиндр по умолчанию смотрит вдоль Y,
 * поэтому доворачиваем на 90° вокруг X).
 */
export function cylinderZ(
    radiusTop: number,
    radiusBottom: number,
    height: number,
    radialSegments: number,
    transform: PartTransform = {},
    openEnded = false
) {
    const geometry = new THREE.CylinderGeometry(
        radiusTop,
        radiusBottom,
        height,
        radialSegments,
        1,
        openEnded
    );
    geometry.rotateX(Math.PI / 2);
    return placeGeometry(geometry, transform);
}

/** Конус с осью вдоль +Y (используется для наконечника указателя). */
export function coneY(
    radius: number,
    height: number,
    radialSegments: number,
    transform: PartTransform = {}
) {
    const geometry = new THREE.ConeGeometry(radius, height, radialSegments);
    return placeGeometry(geometry, transform);
}

/** Считает число треугольников в геометрии — используется в тестах и отладке. */
export function countTriangles(geometry: THREE.BufferGeometry) {
    if (geometry.index) return geometry.index.count / 3;
    const position = geometry.attributes.position;
    return position ? position.count / 3 : 0;
}
