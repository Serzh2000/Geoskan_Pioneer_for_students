import * as THREE from 'three';
import { createTrainingTerrain } from '../public/modules/environment/training/mesh.js';
import { createLandscapeAsset } from '../public/modules/environment/training/landscape-assets.js';
import type { TrainingProfile } from '../public/modules/environment/training/layout.js';
import { trainingHeightAt } from '../public/modules/environment/training/world-plan.js';
import { createStyledLandingPad } from '../public/modules/environment/obstacles/pads.js';

function stats(root: THREE.Object3D) {
    let meshes = 0, triangles = 0;
    root.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        meshes++;
        const geometry = node.geometry as THREE.BufferGeometry;
        triangles += (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3 * (node instanceof THREE.InstancedMesh ? node.count : 1);
    });
    return { meshes, triangles };
}

// Node has no DOM; textures drawn on a canvas (landing pad, markers) are skipped by the stub.
beforeAll(() => {
    (globalThis as { document?: unknown }).document = { createElement: () => ({ width: 0, height: 0, getContext: () => null }) };
});

describe('Training terrain meshes', () => {
    test.each(['hills', 'urban', 'industrial', 'mixed'] as TrainingProfile[])('%s builds within the rendering budget', profile => {
        const terrain = createTrainingTerrain(profile, 7);
        const { meshes, triangles } = stats(terrain);
        // Every map is 600 x 600 m now (it used to be 180 m), so the ceilings grew with the area: a school laptop still gets
        // a few thousand draw calls at most, and the quality governor (scene/core/quality.ts) trims distant props on weak GPUs.
        expect(meshes).toBeLessThan(1500);
        expect(triangles).toBeLessThan(1_800_000);
        const box = new THREE.Box3().setFromObject(terrain);
        expect(Number.isFinite(box.min.x + box.max.z)).toBe(true);
        console.log(profile, { meshes, triangles: Math.round(triangles) });
    });

    test('the big city builds and reports its cost', () => {
        const terrain = createTrainingTerrain('city', 7);
        const { meshes, triangles } = stats(terrain);
        console.log('city', { meshes, triangles: Math.round(triangles) });
        expect(Number.isFinite(triangles)).toBe(true);
    });

    test('every kit-v2 asset builds, is anchored to the ground and carries a readable label', () => {
        for (const name of ['Barn', 'Silo', 'WindTurbine', 'RadioMast', 'ContainerStack', 'SolarArray', 'Greenhouse', 'StreetLamp', 'BusStop', 'HayBales', 'Rocks'] as const) {
            const asset = createLandscapeAsset(name);
            const box = new THREE.Box3().setFromObject(asset);
            expect(Math.abs(box.min.z)).toBeLessThan(.06);
            expect(box.max.z).toBeGreaterThan(1.5);
            expect(asset.userData.label ?? asset.name).toBeTruthy();
        }
    });

    test('flat props (start pad, ArUco sheets) lie above the terrain surface, not inside it', () => {
        for (const profile of ['hills', 'mixed'] as TrainingProfile[]) {
            const terrain = createTrainingTerrain(profile, 7);
            const layout = terrain.userData.trainingLayout;
            const flat = terrain.children.filter(child => child.userData.label === 'Старт S' || String(child.userData.label).startsWith('ArUco'));
            expect(flat.length).toBeGreaterThan(0);
            for (const prop of flat) {
                // Поверхность карты лежит на trainingHeightAt + 6 мм (world-surfaces.ts).
                const surface = trainingHeightAt(layout, prop.position.x, prop.position.y) + .006;
                const box = new THREE.Box3().setFromObject(prop);
                expect(box.min.z).toBeGreaterThan(surface);
            }
        }
    });

    test('landing pads use a polygon offset so the ground does not show through at grazing angles', () => {
        const pad = createStyledLandingPad('S', '#2563eb');
        const material = pad.material as THREE.MeshStandardMaterial;
        expect(material.polygonOffset).toBe(true);
        expect(material.polygonOffsetFactor).toBeLessThan(0);
    });

    test('new props appear in the mixed terrain as selectable objects', () => {
        const terrain = createTrainingTerrain('mixed', 7);
        const labels = new Set(terrain.children.map(child => child.userData.label as string));
        for (const label of ['Ветрогенератор', 'Радиомачта', 'Амбар', 'Контейнеры', 'Солнечные панели']) {
            expect([...labels].some(text => text?.startsWith(label))).toBe(true);
        }
    });
});
