import * as THREE from 'three';
import { createGateMesh, createPylonMesh } from '../competition.js';
import { createStartPositionMesh } from '../arena.js';
import { createRoadMesh } from '../linear.js';
import { applyShadows, setCommonMeta } from '../utils.js';

export function createRaceTrackPreset() {
    const group = setCommonMeta(new THREE.Group(), 'Пресет: гоночная трасса', {
        collidableRadius: 8, presetName: 'race-track'
    });
    const points = Array.from({ length: 8 }, (_, i) => {
        const angle = i / 8 * Math.PI * 2;
        return { x: Math.cos(angle) * 5.8, y: Math.sin(angle) * 4.6, z: 0 };
    });
    group.add(createRoadMesh({ closed: true, roadWidth: 1.7, points }));
    for (let i = 0; i < 8; i++) {
        const angle = i / 8 * Math.PI * 2;
        const gate = createGateMesh();
        gate.position.set(points[i].x, points[i].y, 0);
        gate.rotation.z = Math.atan2(4.6 * Math.cos(angle), -5.8 * Math.sin(angle));
        gate.userData.label = `Ворота ${i + 1}`;
        group.add(gate);
    }
    for (let i = 0; i < 3; i++) {
        const pylon = createPylonMesh();
        pylon.position.set(-2.4 + i * 2.4, i % 2 === 0 ? 1.1 : -1.1, 0); group.add(pylon);
    }
    for (let i = 0; i < 2; i++) {
        const start = createStartPositionMesh(String(i + 1));
        start.position.set(-1.3 + i * 2.6, -6.8, 0.025); group.add(start);
    }
    applyShadows(group);
    return group;
}
