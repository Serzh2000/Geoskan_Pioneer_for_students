import * as THREE from 'three';
import type { DroneModelId } from '../core/drone-models.js';
import { createDroneModel } from './index.js';
import { whenDroneModelReady } from './blender-model.js';
import { syncRadxaModule } from './radxa-module.js';

/**
 * Картинка настоящей 3D-модели дрона (те же GLB, что на сцене) для карточек и окон: рисуется один раз во внеэкранный
 * холст и запоминается. Если WebGL недоступен, возвращается null, и карточка остаётся без картинки.
 */
export type DronePreviewOptions = {
    model: DroneModelId;
    /** Пионер Базовый с pioneer_sdk2 несёт модуль Radxa Zero 3W. */
    radxa?: boolean;
    width?: number;
    height?: number;
};

const cache = new Map<string, Promise<string | null>>();
let shared: THREE.WebGLRenderer | null = null;

function renderer(width: number, height: number): THREE.WebGLRenderer | null {
    try {
        if (!shared) {
            shared = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
            shared.outputColorSpace = THREE.SRGBColorSpace;
            shared.setPixelRatio(1);
        }
        shared.setSize(width, height, false);
        return shared;
    } catch {
        return null;
    }
}

async function waitForRadxa(mesh: THREE.Object3D): Promise<void> {
    for (let i = 0; i < 40; i++) {
        if (mesh.getObjectByName('radxa_camera')) return;
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
}

async function render(options: DronePreviewOptions): Promise<string | null> {
    const width = options.width ?? 480;
    const height = options.height ?? 300;
    const gl = renderer(width, height);
    if (!gl) return null;
    const mesh = createDroneModel(options.model);
    await whenDroneModelReady(mesh);
    if (options.radxa) {
        syncRadxaModule(mesh, true);
        await waitForRadxa(mesh);
    }
    // Светодиоды и свечение в карточке не нужны; корпус и винты остаются.
    mesh.getObjectByName('led_matrix_group')?.removeFromParent();

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x556070, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(-0.5, -0.8, 1.2);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbcd2ff, 1.1);
    rim.position.set(0.8, 0.9, 0.5);
    scene.add(rim);
    scene.add(mesh);
    mesh.updateMatrixWorld(true);

    // Рамка берётся только по видимым сеткам: невидимые служебные узлы (камеры, метки) не должны сдвигать кадр.
    const box = new THREE.Box3();
    mesh.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !object.geometry) return;
        for (let node: THREE.Object3D | null = object; node; node = node.parent) if (!node.visible) return;
        box.expandByObject(object);
    });
    const center = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length() * 0.5;
    const camera = new THREE.PerspectiveCamera(28, width / height, radius * 0.05, radius * 40);
    camera.up.set(0, 0, 1);
    // Вид спереди-сбоку-сверху: нос дрона смотрит по +Y, камера стоит спереди справа.
    const direction = new THREE.Vector3(0.62, 0.86, 0.62).normalize();
    const corners = [0, 1].flatMap((x) => [0, 1].flatMap((y) => [0, 1].map((z) => new THREE.Vector3(x ? box.max.x : box.min.x, y ? box.max.y : box.min.y, z ? box.max.z : box.min.z))));
    // Подбираем расстояние и точку взгляда так, чтобы рамка занимала кадр с небольшим полем.
    let distance = radius * 3;
    const target = center.clone();
    for (let step = 0; step < 6; step++) {
        camera.position.copy(target).addScaledVector(direction, distance);
        camera.lookAt(target);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
        for (const corner of corners) {
            const ndc = corner.clone().project(camera);
            minX = Math.min(minX, ndc.x); maxX = Math.max(maxX, ndc.x); minY = Math.min(minY, ndc.y); maxY = Math.max(maxY, ndc.y);
        }
        const extent = Math.max((maxX - minX) / 2, (maxY - minY) / 2);
        distance *= extent / 0.88;
        const shift = new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, 0.5).unproject(camera).sub(camera.position).normalize();
        const shiftDistance = camera.position.distanceTo(target);
        target.copy(camera.position).addScaledVector(shift, shiftDistance);
    }
    camera.position.copy(target).addScaledVector(direction, distance);
    camera.lookAt(target);

    gl.setClearColor(0x000000, 0);
    gl.render(scene, camera);
    const url = gl.domElement.toDataURL('image/png');
    scene.remove(mesh);
    mesh.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry?.dispose?.();
    });
    return url;
}

/** Картинка модели. Повторные вызовы с теми же параметрами отдают сохранённую. */
export function renderDronePreview(options: DronePreviewOptions): Promise<string | null> {
    const key = `${options.model}|${options.radxa ? 'radxa' : ''}|${options.width ?? 480}x${options.height ?? 300}`;
    let promise = cache.get(key);
    if (!promise) {
        promise = render(options).catch((error: unknown) => {
            console.error('[DronePreview] Failed to render the preview.', error);
            cache.delete(key);
            return null;
        });
        cache.set(key, promise);
    }
    return promise;
}
