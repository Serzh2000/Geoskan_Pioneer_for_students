import * as THREE from 'three';
import { envGroup } from '../environment/index.js';
import { droneMeshes } from '../scene/core/scene-init.js';
import { bottomCameraOf } from '../drone/camera-views.js';
import { worldTrafficCars } from '../world/runtime.js';
import { cameraViewsByDrone } from './pioneer-js-bridge-camera-shared.js';
import { cancelledRuns } from './runtime-shared.js';
import {
    COCO, FRAME_HEIGHT, FRAME_WIDTH, collectSceneTruth, detectObjects, detectPoses, detectTexts,
    type Occluded, type SceneTruth, type Sensor
} from './pioneer-rknn-scene.js';

/*
 * JS-сторона pioneer_rknn (pioneer-rknn-module.ts). Python вызывает три функции - по одной на Yolo, YoloPose и PaddleOCR;
 * каждая берёт «истину» сцены (pioneer-rknn-scene.ts) глазами текущей камеры дрона и возвращает строки чисел, из которых
 * Python собирает ответ в формате библиотеки. Камера - та же, что у Camera.get_cv_frame: передняя или нижняя, с наклоном
 * сервопривода, кадр 640 x 360.
 */

const TRUTH_MAX_AGE_MS = 40;
const OCCLUSION_MAX_AGE_MS = 150;

let truthCache: { at: number; truth: SceneTruth } | null = null;
const occlusionCache = new Map<string, { at: number; hidden: boolean }>();
const raycaster = new THREE.Raycaster();

function sceneTruth(): SceneTruth {
    const now = performance.now();
    if (truthCache && now - truthCache.at < TRUTH_MAX_AGE_MS) return truthCache.truth;
    const cars = worldTrafficCars().map((car) => ({ ...car, cls: COCO[car.cls] }));
    const truth = envGroup ? collectSceneTruth(envGroup, cars) : { objects: [], people: [], texts: [] };
    truthCache = { at: now, truth };
    return truth;
}

function isInside(node: THREE.Object3D, root: THREE.Object3D): boolean {
    for (let current: THREE.Object3D | null = node; current; current = current.parent) if (current === root) return true;
    return false;
}

function isHiddenUp(node: THREE.Object3D): boolean {
    for (let current: THREE.Object3D | null = node; current; current = current.parent) if (!current.visible) return true;
    return false;
}

/** Закрыт ли центр объекта чем-то, что стоит между ним и камерой (здание, дерево, другая машина). */
function occludedFrom(camera: THREE.PerspectiveCamera): Occluded {
    const origin = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
    return ({ center, root, extent }) => {
        if (!envGroup) return false;
        const key = root?.uuid ?? '';
        const now = performance.now();
        const cached = key ? occlusionCache.get(key) : undefined;
        if (cached && now - cached.at < OCCLUSION_MAX_AGE_MS) return cached.hidden;
        const distance = origin.distanceTo(center);
        raycaster.set(origin, center.clone().sub(origin).normalize());
        raycaster.far = distance;
        const hit = raycaster.intersectObjects(envGroup.children, true).find((candidate) => {
            const mesh = candidate.object as THREE.Mesh;
            if (!mesh.isMesh || isHiddenUp(mesh) || (root && isInside(mesh, root))) return false;
            // Собственные части объекта без корня (машины потока) начинаются не раньше середины их габарита.
            return candidate.distance < distance - extent * 0.5 - 0.05;
        });
        const hidden = Boolean(hit);
        if (key) occlusionCache.set(key, { at: now, hidden });
        if (occlusionCache.size > 256) occlusionCache.delete(occlusionCache.keys().next().value!);
        return hidden;
    };
}

function sensorFor(droneId: string): Sensor | null {
    const mesh = droneMeshes[droneId];
    if (!mesh) return null;
    const camera = cameraViewsByDrone[droneId] === 'bottom'
        ? bottomCameraOf(mesh)
        : mesh.getObjectByName('fpv_camera') as THREE.PerspectiveCamera | undefined;
    if (!camera) return null;
    camera.aspect = FRAME_WIDTH / FRAME_HEIGHT;
    camera.updateProjectionMatrix();
    mesh.updateMatrixWorld(true);
    return { camera, width: FRAME_WIDTH, height: FRAME_HEIGHT, occluded: occludedFrom(camera) };
}

function positive(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function unit(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : fallback;
}

export function installRknnRuntimeAPI(w: Record<string, unknown>) {
    const guard = (id: string) => {
        if (cancelledRuns[id]) throw new Error('PYTHON_CANCELLED');
    };

    // Строки [x1, y1, x2, y2, класс, уверенность] в пикселях входа модели (inW x inH).
    w.pioneer_rknn_detect = (id: string, inW: unknown, inH: unknown, objectThresh: unknown, nmsThresh: unknown) => {
        guard(id);
        const sensor = sensorFor(id);
        if (!sensor) return [];
        const kx = positive(inW, FRAME_WIDTH) / FRAME_WIDTH;
        const ky = positive(inH, FRAME_HEIGHT) / FRAME_HEIGHT;
        return detectObjects(sceneTruth(), sensor, unit(objectThresh, 0.25), unit(nmsThresh, 0.45)).map((d) => [
            d.box[0] * kx, d.box[1] * ky, d.box[2] * kx, d.box[3] * ky, d.cls, d.score
        ]);
    };

    // Строки [x1, y1, x2, y2, класс, уверенность, x, y, x, y, ...] - как pioneer_rknn_detect плюс выпуклый контур объекта для масок YoloSeg.
    w.pioneer_rknn_seg = (id: string, inW: unknown, inH: unknown, objectThresh: unknown, nmsThresh: unknown) => {
        guard(id);
        const sensor = sensorFor(id);
        if (!sensor) return [];
        const kx = positive(inW, FRAME_WIDTH) / FRAME_WIDTH;
        const ky = positive(inH, FRAME_HEIGHT) / FRAME_HEIGHT;
        return detectObjects(sceneTruth(), sensor, unit(objectThresh, 0.25), unit(nmsThresh, 0.45), true).map((d) => [
            d.box[0] * kx, d.box[1] * ky, d.box[2] * kx, d.box[3] * ky, d.cls, d.score,
            ...(d.hull ?? []).flatMap(([x, y]) => [x * kx, y * ky])
        ]);
    };

    // Строки [x1, y1, x2, y2, уверенность, x0, y0, c0, ..., x16, y16, c16] - человек и 17 точек скелета.
    w.pioneer_rknn_pose = (id: string, inW: unknown, inH: unknown, objectThresh: unknown, nmsThresh: unknown) => {
        guard(id);
        const sensor = sensorFor(id);
        if (!sensor) return [];
        const kx = positive(inW, FRAME_WIDTH) / FRAME_WIDTH;
        const ky = positive(inH, FRAME_HEIGHT) / FRAME_HEIGHT;
        return detectPoses(sceneTruth(), sensor, unit(objectThresh, 0.25), unit(nmsThresh, 0.45)).map((d) => [
            d.box[0] * kx, d.box[1] * ky, d.box[2] * kx, d.box[3] * ky, d.score,
            ...d.keypoints.flatMap(([x, y, c]) => [x * kx, y * ky, c])
        ]);
    };

    // Строки [[x1, y1, ..., x4, y4], текст, уверенность] в пикселях изображения imgW x imgH.
    w.pioneer_rknn_ocr = (id: string, imgW: unknown, imgH: unknown) => {
        guard(id);
        const sensor = sensorFor(id);
        if (!sensor) return [];
        const kx = positive(imgW, FRAME_WIDTH) / FRAME_WIDTH;
        const ky = positive(imgH, FRAME_HEIGHT) / FRAME_HEIGHT;
        return detectTexts(sceneTruth(), sensor).map((d) => [d.corners.flatMap(([x, y]) => [x * kx, y * ky]), d.text, d.score]);
    };
}
