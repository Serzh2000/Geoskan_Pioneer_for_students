import { jest } from '@jest/globals';
import * as THREE from 'three';
import { createArucoMarkerMesh } from '../public/modules/environment/obstacles/markers/object.js';
import {
    OV2640_SPEC, RADXA_8M_219_SPEC, applyCameraSpec, captureSizeOf, horizontalFov
} from '../public/modules/drone-model/camera-specs.js';
import { usesRadxaModule } from '../public/modules/core/drone-models.js';

const environment = new THREE.Group();
jest.unstable_mockModule('../public/modules/environment/index.js', () => ({ envGroup: environment }));
const { scanMarkers } = await import('../public/modules/python/marker-detection.js');

beforeAll(() => {
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => ({ width: 0, height: 0, getContext: () => null }) } });
});
afterAll(() => { delete (globalThis as { document?: unknown }).document; });
afterEach(() => { environment.clear(); });

/** Нижняя камера над точкой (x, y) на высоте height: верх кадра - +Y мира. */
function down(camera: THREE.PerspectiveCamera, x: number, y: number, height: number) {
    camera.up.set(0, 1, 0);
    camera.position.set(x, y, height);
    camera.lookAt(x, y, 0);
    camera.updateMatrixWorld(true);
    return camera;
}

function legacyCamera() {
    return new THREE.PerspectiveCamera(72, 16 / 9, 0.01, 200);       // нижняя камера Мини 2 / прежняя: 640x360, 72° по вертикали
}

function radxaCamera() {
    const camera = new THREE.PerspectiveCamera(10, 1, 0.005, 200);
    applyCameraSpec(camera, RADXA_8M_219_SPEC);
    return camera;
}

function place(x: number, y: number) {
    const marker = createArucoMarkerMesh('7', 'DICT_6X6_250');
    marker.position.set(x, y, 0.03);
    environment.add(marker);
    environment.updateMatrixWorld(true);
}

describe('camera specs of the Basic drone', () => {
    it('Radxa Camera 8M 219: 49° x 62°, 4:3, 640x480 - as in the Radxa product brief', () => {
        const camera = radxaCamera();
        expect(camera.fov).toBeCloseTo(49, 6);
        expect(camera.aspect).toBeCloseTo(4 / 3, 6);
        // В брошюре углы округлены: 62° по горизонтали и 49° по вертикали при 4:3 дают 62,6° - в пределах градуса.
        expect(Math.abs(horizontalFov(camera.fov, camera.aspect) - 62)).toBeLessThan(1);
        expect(captureSizeOf(camera)).toEqual({ width: 640, height: 480 });
    });

    it('OV2640 on the ESP32 module: f = 600 px at 640x480 (Geoscan example), about 56° x 44°', () => {
        const camera = new THREE.PerspectiveCamera(80, 16 / 9, 0.01, 1000);
        applyCameraSpec(camera, OV2640_SPEC);
        expect(horizontalFov(camera.fov, camera.aspect)).toBeCloseTo(56.1, 1);
        expect(camera.fov).toBeCloseTo(43.6, 1);
        const focalPx = (captureSizeOf(camera).height / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        expect(focalPx).toBeCloseTo(600, 3);
    });

    it('a camera without a spec keeps the old 640x360 frame', () => {
        expect(captureSizeOf(legacyCamera())).toEqual({ width: 640, height: 360 });
    });

    it('only the Basic with pioneer_sdk2 carries the Radxa (so has no front camera); Mini 2 is untouched', () => {
        expect(usesRadxaModule({ model: 'pioneer-basic', pythonSdk: 'pioneer_sdk2' })).toBe(true);
        expect(usesRadxaModule({ model: 'pioneer-basic' })).toBe(false);
        expect(usesRadxaModule({ model: 'pioneer-mini2' })).toBe(false);
        expect(usesRadxaModule({ model: 'pioneer-mini2', pythonSdk: 'pioneer_sdk2' })).toBe(false);
    });
});

describe('what the cameras see of a marker lying on the ground', () => {
    // Чёрный квадрат маркера в картах симулятора около 0,84 м: полуширина 0,42 м.
    it('the narrower Radxa camera loses a marker 1.2 m to the side at 1.5 m height, the old wide camera keeps it', () => {
        place(1.2, 0);
        expect(scanMarkers(down(legacyCamera(), 0, 0, 1.5), 640, 360)).toHaveLength(1);
        const camera = radxaCamera();
        const { width, height } = captureSizeOf(camera);
        expect(scanMarkers(down(camera, 0, 0, 1.5), width, height)).toHaveLength(0);
    });

    it('the Radxa camera sees a marker inside its footprint (62° x 49°: about 1.8 x 1.4 m at 1.5 m)', () => {
        place(0.3, 0.2);
        const camera = radxaCamera();
        const { width, height } = captureSizeOf(camera);
        const [marker] = scanMarkers(down(camera, 0, 0, 1.5), width, height);
        expect(marker?.id).toBe(7);
    });

    it('a marker smaller than the camera minimum (20 px) is not reported, with the old threshold (10 px) it still is', () => {
        place(0, 0);
        // Сторона чёрного квадрата в кадре около 207 px / высота в метрах: на 15 м это ~14 px.
        const old = legacyCamera();
        expect(scanMarkers(down(old, 0, 0, 15), 640, 360)).toHaveLength(1);
        const strict = legacyCamera();
        strict.userData.minMarkerPx = 20;
        expect(scanMarkers(down(strict, 0, 0, 15), 640, 360)).toHaveLength(0);
    });
});
