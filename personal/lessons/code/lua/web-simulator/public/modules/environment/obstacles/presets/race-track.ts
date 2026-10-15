import * as THREE from 'three';
import { createGateMesh, createPylonMesh } from '../competition.js';
import { createStartPositionMesh } from '../arena.js';
import { createRoadMesh } from '../linear.js';
import { createAprilTagMarkerMesh, createArucoMarkerMesh } from '../markers.js';
import { applyShadows, setCommonMeta } from '../utils.js';

export function createRaceTrackPreset() {
    const group = setCommonMeta(new THREE.Group(), 'Пресет: гоночная трасса', {
        collidableRadius: 13, presetName: 'race-track'
    });
    // The outer loop is a gate course; the clear centre is a separate slalom.
    const points = Array.from({ length: 8 }, (_, i) => {
        const angle = -Math.PI / 2 + i / 8 * Math.PI * 2;
        return { x: Math.cos(angle) * 8, y: Math.sin(angle) * 6, z: 0 };
    });
    const course = createRoadMesh({ closed: true, roadWidth: 1.45, points });
    course.userData.label = 'Маршрут восьми ворот';
    group.add(course);
    for (let i = 0; i < 8; i++) {
        const angle = -Math.PI / 2 + i / 8 * Math.PI * 2;
        const gate = createGateMesh();
        gate.position.set(points[i].x, points[i].y, 0);
        gate.rotation.z = Math.atan2(6 * Math.cos(angle), -8 * Math.sin(angle));
        gate.userData.label = `Ворота ${i + 1}`;
        group.add(gate);
    }
    for (let i = 0; i < 5; i++) {
        const pylon = createPylonMesh();
        pylon.position.set(-4 + i * 2, i % 2 === 0 ? 1.25 : -1.25, 0);
        pylon.userData.label = `Слалом ${i + 1}`;
        group.add(pylon);
    }
    const start = createStartPositionMesh('S');
    start.position.set(-2.2, -9.5, 0.025);
    start.userData.label = 'Старт S';
    group.add(start);
    const finish = createStartPositionMesh('F');
    finish.position.set(2.2, -9.5, 0.025);
    finish.userData.label = 'Финиш F';
    group.add(finish);
    const aruco = createArucoMarkerMesh('31');
    aruco.position.set(-10.5, 0, 0.02);
    aruco.userData.label = 'Контрольная метка 31';
    group.add(aruco);
    const aprilTag = createAprilTagMarkerMesh('32');
    aprilTag.position.set(10.5, 0, 0.02);
    aprilTag.userData.label = 'Контрольная метка 32';
    group.add(aprilTag);
    applyShadows(group);
    return group;
}
