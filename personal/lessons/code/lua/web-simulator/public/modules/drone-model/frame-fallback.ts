import * as THREE from 'three';
import {
    BATTERY_COMPONENTS_Z_OFFSET,
    FRAME_COMPONENTS_Z_OFFSET,
    GUARD_Z
} from './layout.js';

export function createFallbackStructure(carbonMat: THREE.Material) {
    const group = new THREE.Group();
    group.name = 'pioneer_fallback_structure';

    const plateGeom = new THREE.BoxGeometry(0.14, 0.14, 0.002);
    const bottomPlate = new THREE.Mesh(plateGeom, carbonMat);
    bottomPlate.position.z = -0.015 + FRAME_COMPONENTS_Z_OFFSET;
    bottomPlate.castShadow = true;
    group.add(bottomPlate);

    const topPlate = new THREE.Mesh(plateGeom, carbonMat);
    topPlate.position.z = 0.035 + FRAME_COMPONENTS_Z_OFFSET;
    topPlate.castShadow = true;
    group.add(topPlate);

    const armGeom = new THREE.BoxGeometry(0.45, 0.03, 0.005);
    const arm1 = new THREE.Mesh(armGeom, carbonMat);
    arm1.rotation.z = Math.PI / 4;
    arm1.castShadow = true;
    group.add(arm1);

    const arm2 = new THREE.Mesh(armGeom, carbonMat);
    arm2.rotation.z = -Math.PI / 4;
    arm2.castShadow = true;
    group.add(arm2);

    return group;
}

export function createBatteryVolume() {
    const batGeom = new THREE.BoxGeometry(0.08, 0.035, 0.02);
    const batMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const battery = new THREE.Mesh(batGeom, batMat);
    battery.position.z = -0.026 + BATTERY_COMPONENTS_Z_OFFSET;
    battery.rotation.z = Math.PI / 2;
    battery.castShadow = true;
    return battery;
}

export function createLegs(mat: THREE.Material) {
    const legGroup = new THREE.Group();
    const legGeom = new THREE.BoxGeometry(0.12, 0.015, 0.002);
    const offsets: Array<[number, number]> = [
        [0.05, 0.05],
        [0.05, -0.05],
        [-0.05, 0.05],
        [-0.05, -0.05]
    ];

    offsets.forEach(([x, y]) => {
        const pivot = new THREE.Group();
        pivot.position.set(x, y, -0.015 + FRAME_COMPONENTS_Z_OFFSET);
        pivot.rotation.z = Math.atan2(y, x);

        const mesh = new THREE.Mesh(legGeom, mat);
        mesh.position.set(0.045, 0, -0.05);
        mesh.rotation.y = 1.0;

        pivot.add(mesh);
        legGroup.add(pivot);
    });

    return legGroup;
}

export function createGuard() {
    const guardGroup = new THREE.Group();
    const guardMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
        roughness: 0,
        metalness: 0.2,
        side: THREE.DoubleSide
    });

    const armLen = 0.16;
    const ringRadius = 0.12;
    const ringGeom = new THREE.TorusGeometry(ringRadius, 0.005, 8, 32);
    const guardColumnCenterZ = GUARD_Z - 0.02;
    const offsets: Array<[number, number]> = [
        [armLen, -armLen],
        [-armLen, armLen],
        [armLen, armLen],
        [-armLen, -armLen]
    ];

    offsets.forEach(([x, y]) => {
        const ring = new THREE.Mesh(ringGeom, guardMat);
        ring.position.set(x, y, GUARD_Z);
        guardGroup.add(ring);

        for (let i = 0; i < 4; i++) {
            const spokeGeom = new THREE.BoxGeometry(ringRadius, 0.002, 0.002);
            const spoke = new THREE.Mesh(spokeGeom, guardMat);
            const angle = i * Math.PI / 2;
            spoke.position.set(
                x + Math.cos(angle) * ringRadius / 2,
                y + Math.sin(angle) * ringRadius / 2,
                GUARD_Z
            );
            spoke.rotation.z = angle;
            guardGroup.add(spoke);
        }

        const colGeom = new THREE.CylinderGeometry(0.003, 0.003, 0.04, 8);
        [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2].forEach((angle) => {
            const col = new THREE.Mesh(colGeom, guardMat);
            col.position.set(
                x + Math.cos(angle) * ringRadius * 0.9,
                y + Math.sin(angle) * ringRadius * 0.9,
                guardColumnCenterZ
            );
            col.rotation.x = Math.PI / 2;
            guardGroup.add(col);
        });
    });

    const bridgeGeom = new THREE.BoxGeometry(0.08, 0.01, 0.005);
    const bridges = [
        { x: armLen, y: 0, rot: Math.PI / 2 },
        { x: -armLen, y: 0, rot: Math.PI / 2 },
        { x: 0, y: armLen, rot: 0 },
        { x: 0, y: -armLen, rot: 0 }
    ];

    bridges.forEach(({ x, y, rot }) => {
        const bridge = new THREE.Mesh(bridgeGeom, guardMat);
        bridge.position.set(x, y, GUARD_Z);
        bridge.rotation.z = rot;
        guardGroup.add(bridge);
    });

    return guardGroup;
}
