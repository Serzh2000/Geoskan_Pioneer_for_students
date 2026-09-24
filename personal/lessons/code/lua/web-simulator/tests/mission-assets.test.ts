import * as THREE from 'three';
import { createMissionAsset } from '../public/modules/environment/obstacles/mission-assets.js';
import { addIncidentEffect } from '../public/modules/environment/obstacles/buildings/effects.js';

describe('Blender mission asset integration', () => {
    test('vehicles retain metre scale and ground origin', () => {
        for (const [name, length, height] of [['Car', 4.1, 1.5], ['Locomotive', 6.6, 2.7], ['Wagon', 6.2, 2.6]] as const) {
            const bounds = new THREE.Box3().setFromObject(createMissionAsset(name));
            expect(bounds.min.z).toBeGreaterThanOrEqual(-.01);
            expect(bounds.max.z).toBeLessThan(height);
            expect(bounds.max.x - bounds.min.x).toBeLessThan(length);
            expect(bounds.max.x - bounds.min.x).toBeGreaterThan(length - .5);
        }
    });
    test('instances own their resources so disposing a preview cannot damage a placed object', () => {
        const first = createMissionAsset('Car').children[0] as THREE.Mesh;
        const second = createMissionAsset('Car').children[0] as THREE.Mesh;
        expect(first.geometry).not.toBe(second.geometry);
        expect(first.material).not.toBe(second.material);
    });
    test('incidents face outwards on both facades and stay separate from architecture', () => {
        for (const kind of ['thief', 'fire', 'smoke'] as const) {
            for (const outward of [-1, 1]) {
                const building = new THREE.Group();
                const face = outward === 1 ? 'front' : 'back';
                addIncidentEffect(building, { floor: 3, face, window: 2, position: new THREE.Vector3(0, outward * 1.85, 3), outward }, { floor: 3, face, window: 2, kind });
                const effect = building.children[0];
                const bounds = new THREE.Box3().setFromObject(effect);
                expect(effect.userData.keepSeparate).toBe(true);
                expect(bounds.min.z).toBeGreaterThan(2);
                expect(outward === 1 ? bounds.min.y : -bounds.max.y).toBeGreaterThan(1.85);
                expect(bounds.max.z).toBeGreaterThan(3.4);
            }
        }
    });
});
