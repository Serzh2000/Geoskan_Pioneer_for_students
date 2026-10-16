import { jest } from '@jest/globals';
import * as THREE from 'three';
import { getCameraMode, getFreeCameraSubMode, setCameraMode, setFreeCameraSubMode } from '../public/modules/scene/core/camera-mode-state.js';

const camera = new THREE.PerspectiveCamera(63, 1.75, .08, 2000);
camera.position.set(500, -400, 350); camera.zoom = 1.2; camera.up.set(0, 0, 1); camera.lookAt(14, 12, 2);
const drone = new THREE.Object3D(); drone.position.set(2, 3, 0);
const controls = {
    target: new THREE.Vector3(14, 12, 2), radius: 700, maxRadius: 1000, azimuth: -.8, elevation: .6,
    enabled: true, cancelInteraction: jest.fn(), dispatchEvent: jest.fn(),
    update() { camera.position.copy(this.target).add(new THREE.Vector3(this.radius, -this.radius, this.radius)); camera.lookAt(this.target); }
};
const focus = jest.fn(() => {
    setCameraMode('free'); setFreeCameraSubMode('orbit');
    controls.target.copy(drone.position); controls.radius = 1.2; controls.maxRadius = 120;
});
jest.unstable_mockModule('../public/modules/scene/core/scene-init.js', () => ({
    camera, controls, droneMeshes: { pupil: drone }, focusOrbitControlsOnObject: focus,
    freeFlyControls: { cancelInteraction: jest.fn(), syncFromCamera: jest.fn() },
    onWindowResize: () => undefined, renderer: { domElement: { contains: () => false } }
}));
jest.unstable_mockModule('../public/modules/core/state.js', () => ({ currentDroneId: 'pupil' }));
jest.unstable_mockModule('../public/modules/shared/logging/logger.js', () => ({ log: () => undefined }));

test('first preview frames the drone, rerenders preserve the preview view, and closing restores the main camera', async () => {
    const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const canvas = new EventTarget();
    const sceneContainer = Object.assign(new EventTarget(), {
        parentNode: null as unknown, parentElement: null as unknown, nextSibling: null,
        classList: { add: () => undefined, remove: () => undefined }, querySelector: () => canvas
    });
    const parent = { appendChild() { sceneContainer.parentNode = parent; sceneContainer.parentElement = parent; } };
    const host = Object.assign(new EventTarget(), {
        appendChild() { sceneContainer.parentNode = host; sceneContainer.parentElement = host; },
        classList: { add: () => undefined }
    });
    parent.appendChild();
    Object.defineProperty(globalThis, 'document', { configurable: true, value: {
        querySelector: () => sceneContainer, getElementById: () => host
    } });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {
        requestAnimationFrame: () => 0, setCameraMode, setCameraFreeSubMode: setFreeCameraSubMode
    } });
    setCameraMode('free'); setFreeCameraSubMode('fly');
    const originalPosition = camera.position.clone(), originalRotation = camera.quaternion.clone(), originalUp = camera.up.clone();
    const originalTarget = controls.target.clone();
    const preview = await import('../public/modules/ui/mission-guide/support/scene-preview.js');
    try {
        preview.setMissionGuideScenePreviewActive(true);
        preview.mountMissionGuideScenePreview();
        expect(focus).toHaveBeenCalledTimes(1);
        expect(camera.position.distanceTo(drone.position)).toBeLessThan(15);
        expect(getFreeCameraSubMode()).toBe('orbit');
        camera.position.set(11, -12, 13); camera.zoom = 2; camera.fov = 50;
        controls.target.set(4, 5, 2);
        setCameraMode('drone');
        preview.mountMissionGuideScenePreview();
        expect(focus).toHaveBeenCalledTimes(1);
        expect(camera.position.toArray()).toEqual([11, -12, 13]);
        expect(getCameraMode()).toBe('drone');
        preview.restoreMissionGuideScenePreview();
        expect(camera.position.equals(originalPosition)).toBe(true);
        expect(camera.quaternion.equals(originalRotation)).toBe(true);
        expect(camera.up.equals(originalUp)).toBe(true);
        expect(camera.zoom).toBe(1.2); expect(camera.fov).toBe(63);
        expect(controls.target.equals(originalTarget)).toBe(true);
        expect(controls.maxRadius).toBe(1000); expect(controls.radius).toBe(700);
        expect(getCameraMode()).toBe('free'); expect(getFreeCameraSubMode()).toBe('fly');
        expect(sceneContainer.parentNode).toBe(parent);
    } finally {
        preview.restoreMissionGuideScenePreview();
        if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
        else Reflect.deleteProperty(globalThis, 'document');
        if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
        else Reflect.deleteProperty(globalThis, 'window');
    }
});
