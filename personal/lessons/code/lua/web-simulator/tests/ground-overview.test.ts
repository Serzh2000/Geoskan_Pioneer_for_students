import * as THREE from 'three';
import { groundOverview } from '../public/modules/scene/core/ground-overview.js';
import { updateCamera } from '../public/modules/scene/core/camera.js';

test.each([1.75, .46])('terrain overview fits every corner at aspect %s', aspect => {
    const camera = new THREE.PerspectiveCamera(50, aspect, .025, 300);
    const environment = new THREE.Group(), root = new THREE.Group();
    root.userData.trainingLayout = { size: 180 };
    root.position.set(12, -8, 3); root.rotation.z = .3; root.scale.setScalar(1.25);
    environment.add(root);
    const overview = groundOverview(camera, environment);
    camera.position.copy(overview.position); camera.up.set(0, 1, 0);
    camera.lookAt(overview.target); camera.far = overview.far;
    camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    for (const x of [-90, 90]) for (const y of [-90, 90]) {
        const point = new THREE.Vector3(x, y, 25).applyMatrix4(root.matrixWorld).project(camera);
        expect(Math.abs(point.x)).toBeLessThan(1);
        expect(Math.abs(point.y)).toBeLessThan(1);
        expect(point.z).toBeLessThan(1);
    }
});

test('empty scenes keep the close ground view; hidden presets are ignored', () => {
    const camera = new THREE.PerspectiveCamera(50, 2, .025, 300);
    const env = new THREE.Group(), hidden = new THREE.Group();
    hidden.userData.trainingLayout = { size: 180 }; hidden.visible = false; env.add(hidden);
    expect(groundOverview(camera, env).position.toArray()).toEqual([0, 0, 24]);
});

test('entering free view preserves an explicit object focus instead of returning to the drone', () => {
    (globalThis as any).window = {};
    (globalThis as any).document = { getElementById: () => null };
    const camera = new THREE.PerspectiveCamera(50, 1.75, .025, 300), drone = new THREE.Object3D();
    const controls = { enabled: false, target: new THREE.Vector3(39.6, 61.2, 3), update: () => {} };
    updateCamera(camera, drone, controls, 'ground');
    camera.position.set(50, 40, 25); camera.userData.preserveOrbitOnEntry = true;
    updateCamera(camera, drone, controls, 'free');
    expect(camera.position.toArray()).toEqual([50,40,25]);
    expect(controls.target.toArray()).toEqual([39.6,61.2,3]);
    expect(camera.userData.preserveOrbitOnEntry).toBe(false);
});
