/**
 * Бортовая камера и указатель направления.
 *
 * fpv_camera — это не декорация, а рабочая PerspectiveCamera: по этому имени
 * её находят и Lua-, и Python-мост, когда делают снимок с борта
 * (modules/lua/hardware/camera.ts, modules/python/pioneer-js-bridge-camera-render.ts),
 * а также режим обзора «от первого лица» (modules/scene/core/camera.ts).
 * Имя, положение и ориентация должны сохраняться.
 */
import * as THREE from 'three';
import { buildMergedMesh, coneY, cylinderZ } from './build-utils.js';
import type { DroneMaterials } from './materials.js';
import { CAMERA_POSITION, ORIENTATION_ARROW_Z } from './layout.js';

export const FPV_CAMERA_NAME = 'fpv_camera';
export const ORIENTATION_ARROW_NAME = 'orientation_arrow';

export function createCameraAndAntenna(materials: DroneMaterials) {
    const group = new THREE.Group();
    group.name = 'camera_antenna';

    group.add(createFpvCamera());
    group.add(createOrientationArrow(materials));

    return group;
}

/**
 * Виртуальная камера борта. Смотрит вперёд (вдоль +Y) с небольшим наклоном
 * вниз, «вверх» для неё — ось Z, как и для всей сцены.
 */
function createFpvCamera() {
    const fpvCamera = new THREE.PerspectiveCamera(80, 16 / 9, 0.01, 1000);
    fpvCamera.name = FPV_CAMERA_NAME;
    fpvCamera.position.set(CAMERA_POSITION[0], 0.11, CAMERA_POSITION[2] + 0.016);
    fpvCamera.up.set(0, 0, 1);
    fpvCamera.lookAt(new THREE.Vector3(0, 1, -0.1));
    return fpvCamera;
}

/** Жёлтая стрелка «нос дрона»: показывает направление вперёд. */
function createOrientationArrow(materials: DroneMaterials) {
    const shaft = cylinderZ(0.005, 0.005, 0.2, 8, {
        rotation: [Math.PI / 2, 0, 0]
    });
    const head = coneY(0.02, 0.06, 8, { position: [0, 0.1, 0] });

    const arrow = buildMergedMesh('orientation_arrow_mesh', [shaft, head], materials.arrow);

    const arrowGroup = new THREE.Group();
    arrowGroup.name = ORIENTATION_ARROW_NAME;
    arrowGroup.position.z = ORIENTATION_ARROW_Z;
    arrowGroup.add(arrow);

    return arrowGroup;
}
