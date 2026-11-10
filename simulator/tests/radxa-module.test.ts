import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { attachRadxaModule, syncRadxaModule } from '../public/modules/drone-model/radxa-module.js';
import { droneSdk, languageChoicesFor, scriptMatchesSdk } from '../public/modules/core/drone-models.js';

let asset: GLTF;
beforeAll(async () => {
    const bytes = readFileSync('public/assets/models/pioneer/radxa-module.glb');
    asset = await new GLTFLoader().parseAsync(bytes.buffer.slice(
        bytes.byteOffset, bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer, '');
});

function triangleCount(root: THREE.Object3D): number {
    let total = 0;
    root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const index = object.geometry.index;
        total += (index ? index.count : object.geometry.getAttribute('position').count) / 3;
    });
    return total;
}

test('Radxa asset is light enough for the browser and keeps its nodes', () => {
    const node = asset.scene.getObjectByName('radxa_module');
    expect(node).toBeDefined();
    expect(asset.scene.getObjectByName('radxa_camera')).toBeDefined();
    expect(triangleCount(asset.scene)).toBeLessThan(40000);
    const materials = new Set<string>();
    asset.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) materials.add((object.material as THREE.Material).name);
    });
    expect(materials.size).toBeGreaterThanOrEqual(8);
});

test('Radxa sits in the ESP32 slot under the body, feet clear of the ground', () => {
    const model = new THREE.Group();
    const node = attachRadxaModule(model, asset.scene);
    model.add(node);
    const bounds = new THREE.Box3().setFromObject(node);
    // Модуль висит под корпусом между опорами: выше пола, ниже плиты платы расширения, внутри габарита шасси.
    expect(bounds.min.z).toBeGreaterThan(0.01);
    expect(bounds.max.z).toBeLessThan(0.11);
    expect(Math.abs(bounds.min.x)).toBeLessThan(0.12);
    expect(Math.abs(bounds.max.x)).toBeLessThan(0.12);
    expect(bounds.min.y).toBeGreaterThan(0.02);
    expect(bounds.max.y).toBeLessThan(0.2);
});

test('attached module clones its materials so drones do not share them', () => {
    const first = attachRadxaModule(new THREE.Group(), asset.scene);
    const second = attachRadxaModule(new THREE.Group(), asset.scene);
    const materialOf = (node: THREE.Object3D) => (node.getObjectByProperty('isMesh', true) as THREE.Mesh).material;
    expect(materialOf(first)).not.toBe(materialOf(second));
});

test('syncRadxaModule adds the module for SDK2 and removes it otherwise', () => {
    const model = new THREE.Group();
    const node = attachRadxaModule(model, asset.scene);
    // GLB уже получен: повторный запрос в тесте не нужен.
    (model.userData.radxa as { requested: boolean }).requested = true;
    expect(node.parent).toBeNull();
    expect(syncRadxaModule(model, true)).toBe(true);
    expect(node.parent).toBe(model);
    expect(syncRadxaModule(model, false)).toBe(false);
    expect(node.parent).toBeNull();
    syncRadxaModule(model, true);
    expect(node.parent).toBe(model);
});

test('language choices: Basic gets all four, Mini 2 only SDK2 and Bricks; SDK2 on Basic needs a selection', () => {
    expect(languageChoicesFor('pioneer-basic')).toEqual(['python-sdk1', 'python-sdk2', 'lua', 'blocks']);
    expect(languageChoicesFor('pioneer-mini2')).toEqual(['python-sdk2', 'blocks']);
    expect(droneSdk({ model: 'pioneer-basic' })).toBe('pioneer_sdk');
    expect(droneSdk({ model: 'pioneer-basic', pythonSdk: 'pioneer_sdk2' })).toBe('pioneer_sdk2');
    // У Мини 2 SDK1 недоступна: выбор игнорируется.
    expect(droneSdk({ model: 'pioneer-mini2', pythonSdk: 'pioneer_sdk' })).toBe('pioneer_sdk2');
    expect(scriptMatchesSdk('from pioneer_sdk2 import Pioneer', 'pioneer_sdk2')).toBe(true);
    expect(scriptMatchesSdk('from pioneer_sdk import Pioneer', 'pioneer_sdk2')).toBe(false);
    expect(scriptMatchesSdk('from pioneer_sdk import Pioneer', 'pioneer_sdk')).toBe(true);
});
