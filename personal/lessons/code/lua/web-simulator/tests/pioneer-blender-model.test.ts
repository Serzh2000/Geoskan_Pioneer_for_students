import { readFileSync } from 'node:fs';
import { jest } from '@jest/globals';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
    attachBlenderModel, createBlenderModel, whenDroneModelReady
} from '../public/modules/drone-model/blender-model.js';

let asset: GLTF;
beforeAll(async () => {
    const bytes = readFileSync('public/assets/models/pioneer/pioneer-basic.glb');
    asset = await new GLTFLoader().parseAsync(bytes.buffer.slice(
        bytes.byteOffset, bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer, '');
});
afterEach(() => jest.restoreAllMocks());

function shell() {
    const model = new THREE.Group();
    for (let i = 0; i < 4; i++) {
        const rotor = new THREE.Group();
        rotor.name = `rotor_${i}`;
        model.add(rotor);
    }
    return model;
}

test('actual GLB has simulator scale, feet at zero, and four centred Z-axis rotors', () => {
    const model = shell();
    attachBlenderModel(model, asset.scene);
    const bounds = new THREE.Box3().setFromObject(model);
    expect(bounds.min.z).toBeCloseTo(0, 5);
    expect(bounds.max.x - bounds.min.x).toBeCloseTo(0.56854, 4);
    expect(bounds.max.z).toBeLessThan(0.23);
    for (let i = 0; i < 4; i++) {
        const rotor = model.getObjectByName(`rotor_${i}`)!;
        const center = new THREE.Box3().setFromObject(rotor).getCenter(new THREE.Vector3());
        expect(Math.abs(center.x - rotor.position.x)).toBeLessThan(0.008);
        expect(Math.abs(center.y - rotor.position.y)).toBeLessThan(0.008);
        expect(rotor.children.length).toBeGreaterThan(0);
    }
});

test('LED surfaces have private materials across channels and drone instances', () => {
    const a = shell(), b = shell();
    attachBlenderModel(a, asset.scene);
    attachBlenderModel(b, asset.scene);
    const seen = new Set<THREE.Material>();
    for (const model of [a, b]) {
        for (let i = 0; i < 4; i++) {
            const led = model.getObjectByName(`base_led_${i}`)!;
            let count = 0;
            led.traverse((object) => {
                if (!(object instanceof THREE.Mesh)) return;
                for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
                    expect(seen.has(material)).toBe(false);
                    expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
                    seen.add(material);
                    count++;
                }
            });
            expect(count).toBeGreaterThan(0);
            expect(led.getObjectByName(`base_led_light_${i}`)).toBeInstanceOf(THREE.PointLight);
        }
    }
});

test('loading is shared and preserves rotor references and angles captured by the RC wizard', async () => {
    const loader = jest.spyOn(GLTFLoader.prototype, 'loadAsync').mockResolvedValue(asset);
    const fallback = jest.fn(() => new THREE.Group());
    const a = createBlenderModel(fallback), b = createBlenderModel(fallback);
    const rotor = a.getObjectByName('rotor_0')!;
    rotor.rotation.z = 0.7;
    await Promise.all([whenDroneModelReady(a), whenDroneModelReady(b)]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(fallback).not.toHaveBeenCalled();
    expect(a.getObjectByName('rotor_0')).toBe(rotor);
    expect(rotor.rotation.z).toBe(0.7);
    expect(rotor.children.length).toBeGreaterThan(0);
});

test('invalid assets are rejected before adding any geometry', () => {
    const model = shell();
    expect(() => attachBlenderModel(model, new THREE.Group())).toThrow('missing frame');
    expect(model.children).toHaveLength(4);
    expect(model.children.every((rotor) => rotor.children.length === 0)).toBe(true);
});
