import * as THREE from 'three';
import { setCommonMeta, applyShadows } from './utils.js';
import { createHillMesh, createFirTreeMesh } from './nature.js';
import { createSettlementHouseMesh } from './house-prop.js';

export function createSettlementMesh() {
    const group = setCommonMeta(new THREE.Group(), 'Макет поселения', { collidableRadius: 2.4 });
    const houseColors = [0xcac8bc, 0xbdb9a9, 0xd1cec3, 0xb8c2c0, 0xc5c1b4];
    const roofColors = [0x626c70, 0x766458, 0x596568, 0x70665d, 0x637170];
    const footprint = [
        [-1.1, -0.6, 0.9],
        [0, -0.5, 1.1],
        [1.1, -0.4, 0.8],
        [-0.6, 0.7, 1.2],
        [0.8, 0.8, 1.0]
    ];
    const road = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.44, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.96 })
    );
    road.position.set(0, 0.08, 0.015);
    group.add(road);

    const roadStripe = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.04, 0.01),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.82 })
    );
    roadStripe.position.set(0, 0.08, 0.036);
    group.add(roadStripe);

    footprint.forEach(([x, y, scale], index) => {
        const house = createSettlementHouseMesh({
            scale,
            wallColor: houseColors[index % houseColors.length],
            roofColor: roofColors[index % roofColors.length],
            showChimney: index % 2 === 1
        });
        house.position.set(x, y, 0);
        house.rotation.z = (index % 3 - 1) * 0.04;
        group.add(house);
    });

    applyShadows(group);
    return group;
}

export function createForestPatchMesh() {
    const group = setCommonMeta(new THREE.Group(), 'Лесной массив', { collidableRadius: 1.9 });
    const layout = [
        [-0.9, -0.4, 0.95],
        [-0.2, -0.7, 1.05],
        [0.8, -0.5, 0.9],
        [-0.7, 0.5, 1.1],
        [0.1, 0.3, 1],
        [0.85, 0.55, 1.15]
    ];

    layout.forEach(([x, y, scale]) => {
        const tree = createFirTreeMesh();
        tree.position.set(x, y, 0);
        tree.scale.setScalar(scale);
        group.add(tree);
    });

    applyShadows(group);
    return group;
}

export function createArenaHillClusterMesh() {
    const group = setCommonMeta(new THREE.Group(), 'Группа холмов', { collidableRadius: 3.2 });
    const positions = [
        [-1.1, -0.2, 0.85],
        [0.75, -0.35, 1],
        [0.1, 1, 0.72]
    ];
    positions.forEach(([x, y, scale]) => {
        const hill = createHillMesh();
        hill.position.set(x, y, 0);
        hill.scale.setScalar(scale);
        group.add(hill);
    });
    applyShadows(group);
    return group;
}
