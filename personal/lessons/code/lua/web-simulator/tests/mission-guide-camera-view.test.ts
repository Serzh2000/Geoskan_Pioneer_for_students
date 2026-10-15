import * as THREE from 'three';
import { captureCameraView, restoreCameraView } from '../public/modules/ui/mission-guide/support/camera-view.js';
import { updateCamera } from '../public/modules/scene/core/camera.js';
import { setFreeCameraSubMode } from '../public/modules/scene/core/camera-mode-state.js';

test('restored orbit snapshot survives the next frame after a preview flight submode', () => {
    const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { getElementById: () => null } });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
    const camera = new THREE.PerspectiveCamera(50, 1.75, .025, 300), drone = new THREE.Object3D();
    const controls = {
        enabled: true, target: new THREE.Vector3(9, 8, 2), radius: 10, maxRadius: 120, azimuth: 0, elevation: .5,
        update: () => undefined,
        setTarget(value: THREE.Vector3) { this.target.copy(value); }
    };
    try {
        setFreeCameraSubMode('fly');
        camera.userData.preserveOrbitOnEntry = true;
        updateCamera(camera, drone, controls, 'free');
        camera.position.set(13, -12, 9);
        const view = captureCameraView(camera, controls);
        controls.target.set(99, 98, 1); camera.position.set(25, 26, 27);
        setFreeCameraSubMode('orbit');
        restoreCameraView(camera, view, controls);
        updateCamera(camera, drone, controls, 'free');
        expect(controls.target.toArray()).toEqual([9, 8, 2]);
        expect(camera.position.toArray()).toEqual([13, -12, 9]);
    } finally {
        setFreeCameraSubMode('orbit');
        if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
        else Reflect.deleteProperty(globalThis, 'document');
        if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
        else Reflect.deleteProperty(globalThis, 'window');
    }
});
