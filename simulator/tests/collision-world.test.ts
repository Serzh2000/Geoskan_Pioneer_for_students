import * as THREE from 'three';
import { obstacleHasCollision, sampleSegmentPoints, worldSolidHit } from '../public/modules/physics/collisions.js';

const at = (x: number, y: number, z: number) => [new THREE.Vector3(x, y, z)];

function treeMap(variant: number) {
    const ground = new THREE.Mesh(new THREE.BufferGeometry());
    ground.userData.trainingTrees = [{ x: 0, y: 0, z: 0, radius: 1.5, height: 4, variant }];
    const root = new THREE.Group();
    root.userData.type = 'карта';
    root.add(ground);
    return root;
}

test('под кроной дерева проходит дрон, ствол и крона твёрдые', () => {
    const tree = treeMap(1);
    expect(obstacleHasCollision(tree, at(1.2, 0, 0.5))).toBe(false);   // под кроной, вдали от ствола
    expect(obstacleHasCollision(tree, at(0.1, 0, 0.5))).toBe(true);    // ствол
    expect(obstacleHasCollision(tree, at(1.2, 0, 2.5))).toBe(true);    // крона
});

test('куст остаётся сплошным от земли', () => {
    expect(obstacleHasCollision(treeMap(4), at(1.2, 0, 0.3))).toBe(true);
});

test('люди и машины живого мира', () => {
    const car = { x: 0, y: 0, z: 0, heading: 0, halfLength: 2.35, halfWidth: 0.9, z1: 1.45, z0: 0, round: false };
    const person = { x: 10, y: 0, z0: 0, z1: 1.8, heading: 0, halfLength: 0.25, halfWidth: 0.25, round: true };
    expect(worldSolidHit([car], at(2.0, 0, 1))).toBe(car);
    expect(worldSolidHit([car], at(0, 2.0, 1))).toBeNull();       // сбоку дальше полуширины + 0.18
    expect(worldSolidHit([car], at(0, 0, 2.5))).toBeNull();       // выше крыши
    expect(worldSolidHit([person], at(10.3, 0, 1))).toBe(person);
    expect(worldSolidHit([person], at(10.6, 0, 1))).toBeNull();
    expect(worldSolidHit([car], sampleSegmentPoints(new THREE.Vector3(-5, 0, 1), new THREE.Vector3(5, 0, 1)))).toBe(car);
});
