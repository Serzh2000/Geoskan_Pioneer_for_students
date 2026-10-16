import * as THREE from 'three';
import { createRailwayMesh, createRoadMesh, updateLinearFeaturePoints } from '../public/modules/environment/obstacles/linear.js';
import { batchStaticMeshes } from '../public/modules/environment/training/world-surfaces.js';

test('a road is batched when it is built and again when it is rebuilt, despite the different UV attributes of its parts', () => {
    const points = [{x:-80,y:14,z:0},{x:80,y:14,z:0}];
    const road = createRoadMesh({points});
    // Hundreds of dashes and ribbons would be hundreds of draw calls: the builder itself merges them by material.
    expect(road.children.filter(p=>p instanceof THREE.Mesh)).toHaveLength(3);
    const before = new THREE.Box3().setFromObject(road);
    batchStaticMeshes(road);
    expect(road.children.filter(p=>p instanceof THREE.Mesh)).toHaveLength(3);
    const after = new THREE.Box3().setFromObject(road);
    expect(after.min.distanceTo(before.min)).toBeLessThan(.0001);
    expect(after.max.distanceTo(before.max)).toBeLessThan(.0001);
    // A saved scene or the editor rebuilds the road from its points: it must stay batched.
    updateLinearFeaturePoints(road, [{x:-80,y:14,z:0},{x:0,y:30,z:0},{x:80,y:14,z:0}]);
    expect(road.children.filter(p=>p instanceof THREE.Mesh).length).toBeLessThanOrEqual(3);
});

test('a railway of hundreds of sleepers and rails is a handful of meshes', () => {
    const rail = createRailwayMesh({points:[{x:-150,y:0,z:0},{x:150,y:0,z:0}]});
    expect(rail.children.filter(p=>p instanceof THREE.Mesh).length).toBeLessThanOrEqual(4);
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
