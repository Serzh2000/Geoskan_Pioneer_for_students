import { readFileSync, statSync } from 'node:fs';
import { jest } from '@jest/globals';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
    attachBlenderModel, createBlenderModel, whenDroneModelReady
} from '../public/modules/drone-model/blender-model.js';

const MINI2_PATH = 'public/assets/models/pioneer/pioneer-mini2.glb';
const BASIC_PATH = 'public/assets/models/pioneer/pioneer-basic.glb';

async function parse(path: string): Promise<GLTF> {
    const bytes = readFileSync(path);
    return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, '');
}

let mini2: GLTF;
let basic: GLTF;
beforeAll(async () => {
    [mini2, basic] = await Promise.all([parse(MINI2_PATH), parse(BASIC_PATH)]);
});
afterEach(() => jest.restoreAllMocks());

function shell() {
    const model = new THREE.Group();
    const motors = new THREE.Group();
    motors.name = 'motors_group';
    model.add(motors);
    for (let i = 0; i < 4; i++) {
        const rotor = new THREE.Group();
        rotor.name = `rotor_${i}`;
        motors.add(rotor);
    }
    return model;
}

function triangles(root: THREE.Object3D) {
    let count = 0;
    root.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        const geometry = node.geometry as THREE.BufferGeometry;
        count += (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
    });
    return count;
}

function worldCenter(object: THREE.Object3D) {
    return new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
}

function lookDirection(camera: THREE.Object3D) {
    camera.updateWorldMatrix(true, false);
    return camera.getWorldDirection(new THREE.Vector3());
}

describe('pioneer-mini2.glb asset', () => {
    test('has the node contract of the simulator', () => {
        const scene = mini2.scene;
        for (const name of ['frame', 'motors_group', 'rotor_0', 'rotor_1', 'rotor_2', 'rotor_3',
            'base_led_0', 'base_led_1', 'camera_gimbal', 'fpv_lens', 'bottom_camera_mount']) {
            expect(scene.getObjectByName(name)).toBeDefined();
        }
        // Two LEDs, no LED module, no ESP32 module.
        for (const name of ['base_led_2', 'base_led_3', 'led_module', 'esp32_module', 'esp32_camera']) {
            expect(scene.getObjectByName(name)).toBeUndefined();
        }
        const gimbal = scene.getObjectByName('camera_gimbal')!;
        expect(gimbal.getObjectByName('fpv_lens')).toBeDefined();
        expect(triangles(gimbal)).toBeGreaterThan(0);
        for (let i = 0; i < 4; i++) expect(triangles(scene.getObjectByName(`rotor_${i}`)!)).toBeGreaterThan(0);
    });

    test('stands on z=0 at simulator scale (2 units per metre, ~199 x 149 x 48.5 mm)', () => {
        const bounds = new THREE.Box3().setFromObject(mini2.scene);
        expect(bounds.min.z).toBeCloseTo(0, 5);
        expect(bounds.max.x - bounds.min.x).toBeCloseTo(0.398, 2);
        expect(bounds.max.y - bounds.min.y).toBeCloseTo(0.298, 2);
        expect(bounds.max.z).toBeCloseTo(0.097, 2);
    });

    test('rotors are in the same corners and order as on the Basic model, pivots on the motor axes', () => {
        for (let i = 0; i < 4; i++) {
            const rotor = mini2.scene.getObjectByName(`rotor_${i}`)!;
            const basicRotor = basic.scene.getObjectByName(`rotor_${i}`)!;
            expect(Math.sign(rotor.position.x)).toBe(Math.sign(basicRotor.position.x));
            expect(Math.sign(rotor.position.y)).toBe(Math.sign(basicRotor.position.y));
            // Motor spacing 116 x 69 mm.
            expect(Math.abs(rotor.position.x)).toBeCloseTo(0.116, 3);
            expect(Math.abs(rotor.position.y)).toBeCloseTo(0.069, 3);
            const center = worldCenter(rotor);
            expect(Math.abs(center.x - rotor.position.x)).toBeLessThan(0.004);
            expect(Math.abs(center.y - rotor.position.y)).toBeLessThan(0.004);
        }
    });

    test('faces +Y like the Basic model: lens at the nose, LED 0 on the left, LED 1 on the right', () => {
        const lens = new THREE.Vector3();
        mini2.scene.getObjectByName('fpv_lens')!.getWorldPosition(lens);
        expect(lens.y).toBeGreaterThan(0.08);
        expect(lens.z).toBeGreaterThan(0.05);
        const left = worldCenter(mini2.scene.getObjectByName('base_led_0')!);
        const right = worldCenter(mini2.scene.getObjectByName('base_led_1')!);
        expect(left.x).toBeLessThan(-0.03);
        expect(right.x).toBeGreaterThan(0.03);
        expect(left.y).toBeGreaterThan(0.05);
        expect(right.y).toBeGreaterThan(0.05);
        // The optical-flow camera point is under the body, above the ground.
        const bottom = mini2.scene.getObjectByName('bottom_camera_mount')!.position;
        expect(bottom.z).toBeGreaterThan(0.02);
        expect(Math.hypot(bottom.x, bottom.y)).toBeLessThan(0.02);
    });

    test('fits the web budget: far lighter than the Basic model', () => {
        const tris = triangles(mini2.scene);
        console.log('pioneer-mini2.glb', { triangles: tris, kb: Math.round(statSync(MINI2_PATH).size / 1024) });
        expect(tris).toBeLessThan(45_000);
        expect(tris).toBeLessThan(triangles(basic.scene) / 3);
        expect(statSync(MINI2_PATH).size).toBeLessThan(1_500_000);
        mini2.scene.traverse((node) => {
            if (!(node instanceof THREE.Mesh)) return;
            for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
                expect((material as THREE.MeshPhysicalMaterial).transmission ?? 0).toBe(0);
            }
        });
    });
});

describe('Mini 2 in the loader', () => {
    // First: the template cache would otherwise already hold the loaded Mini 2.
    test('a failed Mini 2 download falls back without touching the rotor references', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        jest.spyOn(GLTFLoader.prototype, 'loadAsync').mockRejectedValue(new Error('offline'));
        const fallback = jest.fn(() => new THREE.Group());
        const model = createBlenderModel(fallback, 'pioneer-mini2');
        const rotor = model.getObjectByName('rotor_2');
        await expect(whenDroneModelReady(model)).rejects.toThrow('offline');
        await Promise.resolve();
        expect(fallback).toHaveBeenCalledTimes(1);
        expect(model.userData.modelSource).toBe('cad-fallback');
        expect(model.getObjectByName('rotor_2')).toBe(rotor);
    });

    test('attaches with a gimbal camera looking forward, a bottom camera, and no ESP32 module', async () => {
        const { setEsp32Attached, updateEsp32Module } = await import('../public/modules/drone-model/esp32-module.js');
        const model = shell();
        attachBlenderModel(model, mini2.scene, 'pioneer-mini2');
        expect(new THREE.Box3().setFromObject(model).min.z).toBeCloseTo(0, 5);
        const fpv = model.getObjectByName('fpv_camera') as THREE.PerspectiveCamera;
        expect(fpv).toBeInstanceOf(THREE.PerspectiveCamera);
        expect(fpv.parent?.name).toBe('camera_gimbal');
        const forward = lookDirection(fpv);
        expect(forward.y).toBeCloseTo(1, 5);
        const bottom = model.getObjectByName('bottom_camera') as THREE.PerspectiveCamera;
        expect(bottom).toBeInstanceOf(THREE.PerspectiveCamera);
        expect(lookDirection(bottom).z).toBeCloseTo(-1, 5);
        expect(model.getObjectByName('esp32_module')).toBeUndefined();
        setEsp32Attached(model, true);
        updateEsp32Module(model, 1);
        expect(model.userData.esp32).toBeUndefined();
    });

    test('LED surfaces are private per drone and keep their amber tint when off', () => {
        const a = shell(), b = shell();
        attachBlenderModel(a, mini2.scene, 'pioneer-mini2');
        attachBlenderModel(b, mini2.scene, 'pioneer-mini2');
        const seen = new Set<THREE.Material>();
        for (const model of [a, b]) {
            for (let i = 0; i < 2; i++) {
                let count = 0;
                model.getObjectByName(`base_led_${i}`)!.traverse((object) => {
                    if (!(object instanceof THREE.Mesh)) return;
                    const material = object.material as THREE.MeshStandardMaterial;
                    expect(seen.has(material)).toBe(false);
                    seen.add(material);
                    const off = material.userData.ledOffColor as THREE.Color;
                    expect(off).toBeInstanceOf(THREE.Color);
                    expect(off.r).toBeGreaterThan(off.b);
                    count++;
                });
                expect(count).toBeGreaterThan(0);
            }
        }
    });

    test('createDroneModel(mini2): model id, two LEDs driven from the state, camera tilt clamped', async () => {
        jest.spyOn(GLTFLoader.prototype, 'loadAsync').mockResolvedValue(mini2);
        const { createDroneModel, updateLEDs, setDroneCameraTilt } = await import('../public/modules/drone-model/index.js');
        const mesh = createDroneModel('pioneer-mini2');
        expect(mesh.userData.droneModel).toBe('pioneer-mini2');
        // A tilt set before the GLB arrives is applied when it does.
        setDroneCameraTilt(mesh, -30);
        await whenDroneModelReady(mesh);
        expect(mesh.userData.modelSource).toBe('Pioneer_Mini_2_reworked.blend');
        expect(mesh.getObjectByName('led_matrix_group')).toBeUndefined();
        const fpv = mesh.getObjectByName('fpv_camera')!;
        expect(lookDirection(fpv).z).toBeCloseTo(-Math.sin(THREE.MathUtils.degToRad(30)), 5);

        setDroneCameraTilt(mesh, -200);
        expect(mesh.userData.cameraTiltDeg).toBe(-80);
        const down = lookDirection(fpv);
        expect(down.z).toBeCloseTo(-Math.sin(THREE.MathUtils.degToRad(80)), 5);
        expect(down.y).toBeGreaterThan(0);
        setDroneCameraTilt(mesh, 90);
        expect(mesh.userData.cameraTiltDeg).toBe(30);
        expect(lookDirection(fpv).z).toBeGreaterThan(0.49);
        // The lens stays where it was: the pivot is on the camera's own axis, not the drone's centre.
        expect(new THREE.Vector3().setFromMatrixPosition(fpv.matrixWorld).y).toBeGreaterThan(0.06);

        updateLEDs(mesh, { leds: [{ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 0 }] });
        const material = (led: number) => {
            let found: THREE.MeshStandardMaterial | undefined;
            mesh.getObjectByName(`base_led_${led}`)!.traverse((o) => {
                if (o instanceof THREE.Mesh && !found) found = o.material as THREE.MeshStandardMaterial;
            });
            return found!;
        };
        expect(material(0).emissiveIntensity).toBeGreaterThan(0);
        expect(material(0).emissive.r).toBeCloseTo(1, 5);
        expect(material(1).emissiveIntensity).toBe(0);
        // Off: the amber lens colour, dimmed, not the Basic model's grey.
        expect(material(1).color.equals(material(1).userData.ledOffColor)).toBe(true);
    });

    test('Basic without a servo camera ignores the tilt', async () => {
        const { setDroneCameraTilt } = await import('../public/modules/drone-model/index.js');
        const model = shell();
        attachBlenderModel(model, basic.scene);
        const fpv = model.getObjectByName('fpv_camera')!;
        const before = lookDirection(fpv).clone();
        setDroneCameraTilt(model, -60);
        expect(model.userData.cameraTiltDeg).toBeUndefined();
        expect(lookDirection(fpv).distanceTo(before)).toBeLessThan(1e-9);
        expect(model.getObjectByName('camera_gimbal')).toBeUndefined();
    });
});
