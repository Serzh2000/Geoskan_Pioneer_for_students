import * as THREE from 'three';
import { createRoadMesh } from '../public/modules/environment/obstacles/linear.js';
import { batchStaticMeshes } from '../public/modules/environment/training/world-surfaces.js';

test('long road markings batch with ribbons despite their different UV attributes', () => {
    const road = createRoadMesh({points:[{x:-80,y:14,z:0},{x:80,y:14,z:0}]});
    const before = new THREE.Box3().setFromObject(road);
    expect(road.children.length).toBeGreaterThan(50);
    batchStaticMeshes(road);
    expect(road.children.filter(p=>p instanceof THREE.Mesh)).toHaveLength(3);
    const after = new THREE.Box3().setFromObject(road);
    expect(after.min.distanceTo(before.min)).toBeLessThan(.0001);
    expect(after.max.distanceTo(before.max)).toBeLessThan(.0001);
});

test('batching retains each instance transform and supports indexed/nonindexed details', () => {
    const root = new THREE.Group(), material = new THREE.MeshStandardMaterial();
    const a = new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);
    const b = new THREE.Mesh(new THREE.BoxGeometry(1,1,1).toNonIndexed(),material);
    a.position.x=-4; b.position.x=4; root.add(a,b); root.position.set(10,5,1);
    const before = new THREE.Box3().setFromObject(root);
    batchStaticMeshes(root);
    expect(root.children).toHaveLength(1);
    const after = new THREE.Box3().setFromObject(root);
    expect(after.min.distanceTo(before.min)).toBeLessThan(.0001);
    expect(after.max.distanceTo(before.max)).toBeLessThan(.0001);
});
