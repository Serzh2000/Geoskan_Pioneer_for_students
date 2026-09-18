import * as THREE from 'three';
import { createApartmentBuildingMesh, updateApartmentBuildingMetadata } from '../public/modules/environment/obstacles/buildings.js';
import { createRoadMesh, updateLinearFeaturePoints } from '../public/modules/environment/obstacles/linear.js';
import { createHillMesh, createTreeMesh } from '../public/modules/environment/obstacles/nature.js';

const meshes = (root: THREE.Object3D) => {
    const result: THREE.Mesh[] = [];
    root.traverse(node => { if (node instanceof THREE.Mesh) result.push(node); });
    return result;
};

describe('environment geometry', () => {
    test('building shell stays compact after changing its floor count', () => {
        const building = createApartmentBuildingMesh({floors: 5});
        const initialHeight = new THREE.Box3().setFromObject(building).max.z;
        expect(meshes(building).length).toBeLessThan(20);
        expect(updateApartmentBuildingMetadata(building, {floors: 12})).toBe(true);
        expect(meshes(building).length).toBeLessThan(20);
        expect(new THREE.Box3().setFromObject(building).max.z).toBeGreaterThan(initialHeight);
        expect(building.userData.floors).toBe(12);
    });
    test('road surfaces face upward and preserve elevation when edited', () => {
        const road = createRoadMesh({ points: [{x:0,y:0,z:1},{x:10,y:0,z:1}] });
        const asphalt = meshes(road)[1];
        const normals = asphalt.geometry.getAttribute('normal');
        for (let i = 0; i < normals.count; i++) expect(normals.getZ(i)).toBeGreaterThan(0.99);
        expect(new THREE.Box3().setFromObject(asphalt).min.z).toBeCloseTo(1.035);
        expect(updateLinearFeaturePoints(road, [{x:0,y:0,z:2},{x:0,y:10,z:2}])).toBe(true);
        expect(new THREE.Box3().setFromObject(meshes(road)[1]).min.z).toBeCloseTo(2.035);
        expect(meshes(road).length).toBeLessThan(15);
    });
    test('closed road ribbons meet without a positional seam', () => {
        const road = createRoadMesh({ closed: true, points: [{x:5,y:0,z:0},{x:0,y:5,z:0},{x:-5,y:0,z:0},{x:0,y:-5,z:0}] });
        for (const mesh of meshes(road).filter(mesh => mesh.name === 'continuous-surface')) {
            const p = mesh.geometry.getAttribute('position');
            for (const axis of ['getX','getY','getZ'] as const) {
                expect(p[axis](0)).toBeCloseTo(p[axis](p.count - 2), 3);
                expect(p[axis](1)).toBeCloseTo(p[axis](p.count - 1), 3);
            }
        }
    });
    test('vegetation is deterministic and hills have a bounded mesh count', () => {
        const first = createHillMesh(), second = createHillMesh();
        expect(meshes(first).length).toBeLessThan(40);
        expect(meshes(first).map(m => m.position.toArray())).toEqual(meshes(second).map(m => m.position.toArray()));
        for (const mesh of meshes(first)) {
            const p = mesh.geometry.getAttribute('position');
            expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
        }
        expect(new THREE.Box3().setFromObject(createTreeMesh()).min.z).toBeGreaterThanOrEqual(-0.001);
    });
});
