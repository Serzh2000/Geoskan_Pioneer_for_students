import * as THREE from 'three';
import { createGateMesh, createPylonMesh } from '../competition.js';
import { createAprilTagMarkerMesh } from '../markers.js';
import {
    createCargoMesh,
    createLightTowerMesh,
    createStartPositionMesh,
    createVideoTowerMesh
} from '../arena.js';
import { createRoadMesh } from '../linear.js';
import { applyShadows, setCommonMeta } from '../utils.js';

export function createRaceTrackPreset() {
    const group = setCommonMeta(new THREE.Group(), 'Пресет: гоночная трасса', {
        collidableRadius: 16,
        presetName: 'race-track'
    });

    const road = createRoadMesh({
        closed: true,
        points: [
            { x: 14, y: 0, z: 0 },
            { x: 10, y: 10, z: 0 },
            { x: 0, y: 14, z: 0 },
            { x: -12, y: 8, z: 0 },
            { x: -14, y: -4, z: 0 },
            { x: -4, y: -14, z: 0 },
            { x: 8, y: -12, z: 0 }
        ]
    });
    group.add(road);

    [
        { x: 14, y: 0, rot: Math.PI / 2 },
        { x: 10, y: 10, rot: 2.35 },
        { x: 0, y: 14, rot: Math.PI },
        { x: -12, y: 8, rot: 3.8 },
        { x: -14, y: -4, rot: 4.8 },
        { x: -4, y: -14, rot: 6.0 },
        { x: 8, y: -12, rot: 0.8 }
    ].forEach((config) => {
        const gate = createGateMesh();
        gate.position.set(config.x, config.y, 0);
        gate.rotation.z = config.rot;
        group.add(gate);
    });

    for (let i = 0; i < 6; i += 1) {
        const pylon = createPylonMesh();
        pylon.position.set(-5 + i * 2, -2 + (i % 2 === 0 ? 1.2 : -1.2), 0);
        group.add(pylon);
    }

    const marker = createAprilTagMarkerMesh('42');
    marker.position.set(3, 12, 0);
    group.add(marker);

    const cargo = createCargoMesh();
    cargo.position.set(0, -9, 0);
    group.add(cargo);

    const start1 = createStartPositionMesh('1');
    start1.position.set(14, -2.8, 0.01);
    group.add(start1);

    const start2 = createStartPositionMesh('2');
    start2.position.set(14, 2.8, 0.01);
    group.add(start2);

    const cameraTower = createVideoTowerMesh();
    cameraTower.position.set(9, 13, 0);
    group.add(cameraTower);

    const lightTower = createLightTowerMesh();
    lightTower.position.set(-14, 12, 0);
    group.add(lightTower);

    applyShadows(group);
    return group;
}

