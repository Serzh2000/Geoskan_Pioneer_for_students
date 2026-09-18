import * as THREE from 'three';
import { setCommonMeta, applyShadows } from './utils.js';
import { OBJECT_TYPE } from '../../shared/object-types.js';
import {
    GATE_RING_CENTER_HEIGHT,
    GATE_RING_RADIUS,
    GATE_RING_TUBE_RADIUS,
    GATE_STAND_RADIUS
} from '../../shared/gate-geometry.js';

export function createGateMesh() {
    const group = setCommonMeta(new THREE.Group(), OBJECT_TYPE.GATE, { collidableRadius: 0.95 });
    const ringRadius = GATE_RING_RADIUS;
    const ringTubeRadius = GATE_RING_TUBE_RADIUS;
    const ringCenterHeight = GATE_RING_CENTER_HEIGHT;
    const standRadius = GATE_STAND_RADIUS;
    const standHeight = 0.98;
    const standOffsetY = 0.64;

    const mat = new THREE.MeshStandardMaterial({ color: 0x3f5059, roughness: 0.55, metalness: 0.45 });
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xe8e4d7, roughness: 0.6, metalness: 0.08 });

    const legGeom = new THREE.CylinderGeometry(standRadius, standRadius, standHeight);
    const leg1 = new THREE.Mesh(legGeom, mat);
    leg1.position.set(0, -standOffsetY, standHeight * 0.5);
    leg1.rotation.x = Math.PI / 2;
    const leg2 = new THREE.Mesh(legGeom, mat);
    leg2.position.set(0, standOffsetY, standHeight * 0.5);
    leg2.rotation.x = Math.PI / 2;
    group.add(leg1, leg2);

    const torus = new THREE.Mesh(new THREE.TorusGeometry(ringRadius, ringTubeRadius, 16, 80), ringMat);
    torus.position.z = ringCenterHeight;
    torus.rotation.y = Math.PI / 2;
    group.add(torus);

    const baseGeom = new THREE.CylinderGeometry(0.11, 0.14, 0.05, 16);
    const base1 = new THREE.Mesh(baseGeom, mat);
    base1.rotation.x = Math.PI / 2;
    base1.position.set(0, -standOffsetY, 0.025);
    const base2 = new THREE.Mesh(baseGeom, mat);
    base2.rotation.x = Math.PI / 2;
    base2.position.set(0, standOffsetY, 0.025);
    group.add(base1, base2);

    applyShadows(group);
    return group;
}

export function createPylonMesh() {
    const group = setCommonMeta(new THREE.Group(), 'Пилон', { collidableRadius: 0.4 });
    
    const height = 2;
    const baseRadius = 0.35;
    const topRadius = 0.08;
    const segments = 4;
    
    const matRed = new THREE.MeshStandardMaterial({ color: 0xcc8651, roughness: 0.8 });
    const matWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
    
    for (let i = 0; i < segments; i++) {
        const segHeight = height / segments;
        const currentBaseR = baseRadius - (baseRadius - topRadius) * (i / segments);
        const currentTopR = baseRadius - (baseRadius - topRadius) * ((i + 1) / segments);
        
        const pylonGeom = new THREE.CylinderGeometry(currentTopR, currentBaseR, segHeight, 16);
        const mat = i % 2 === 0 ? matRed : matWhite;
        
        const mesh = new THREE.Mesh(pylonGeom, mat);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.z = segHeight * i + segHeight / 2;
        group.add(mesh);
    }
    
    const baseGeom = new THREE.CylinderGeometry(0.45, 0.45, 0.05, 16);
    const baseMesh = new THREE.Mesh(baseGeom, new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 }));
    baseMesh.rotation.x = Math.PI / 2;
    baseMesh.position.z = 0.025;
    group.add(baseMesh);

    applyShadows(group);
    return group;
}

export function createFlagMesh() {
    const group = setCommonMeta(new THREE.Group(), 'Флаг', { collidableRadius: 0.45 });

    const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const baseGeom = new THREE.CylinderGeometry(0.15, 0.2, 0.1, 12);
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.rotation.x = Math.PI / 2;
    base.position.z = 0.05;
    group.add(base);

    const poleHeight = 2.2;
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.6 });
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.02, poleHeight, 8),
        poleMat
    );
    pole.rotation.x = Math.PI / 2;
    pole.position.z = poleHeight / 2;
    group.add(pole);

    const finial = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.8 })
    );
    finial.position.z = poleHeight;
    group.add(finial);

    const flagMat = new THREE.MeshStandardMaterial({ color: 0x4a7d89, roughness: 0.7, side: THREE.DoubleSide });
    
    const flagGeom = new THREE.PlaneGeometry(0.6, 0.4, 10, 5);
    const pos = flagGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const zWave = Math.sin(x * Math.PI * 3) * 0.04;
        pos.setZ(i, zWave);
    }
    flagGeom.computeVertexNormals();

    const flag = new THREE.Mesh(flagGeom, flagMat);
    flag.position.set(0.3, 0, poleHeight - 0.25);
    flag.rotation.x = Math.PI / 2;
    group.add(flag);

    applyShadows(group);
    return group;
}
