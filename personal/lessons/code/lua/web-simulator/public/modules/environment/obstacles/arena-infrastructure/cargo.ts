import * as THREE from 'three';
import { DEFAULT_CARGO_MASS_KG, DEFAULT_CARGO_PHYSICS_MATERIAL } from '../../../physics/materials.js';
import { setCommonMeta, applyShadows } from '../utils.js';
import { OBJECT_TYPE } from '../../../shared/object-types.js';

export function createCargoMesh() {
    const group = setCommonMeta(new THREE.Group(), OBJECT_TYPE.CARGO_SMALL, { collidableRadius: 0.22 });
    group.userData.massKg = DEFAULT_CARGO_MASS_KG;
    group.userData.physicsMaterial = { ...DEFAULT_CARGO_PHYSICS_MATERIAL };
    const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.94, metalness: 0.04 });
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xc97316, roughness: 0.78, metalness: 0.08 });
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0xdda15e, roughness: 0.7, metalness: 0.08 });
    const strapMaterial = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.68, metalness: 0.12 });
    const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.24 });
    const bumperMaterial = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.82, metalness: 0.08 });
    const accentMaterial = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.62, metalness: 0.1 });

    const pallet = new THREE.Group();
    const palletBase = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.04), woodMaterial);
    palletBase.position.z = 0.04;
    pallet.add(palletBase);
    const palletSlatOffsets = [-0.1, 0, 0.1];
    palletSlatOffsets.forEach((x) => {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.34, 0.025), woodMaterial);
        slat.position.set(x, 0, 0.072);
        pallet.add(slat);
    });
    const palletFeetOffsets = [
        [-0.11, -0.11],
        [0.11, -0.11],
        [-0.11, 0.11],
        [0.11, 0.11]
    ];
    palletFeetOffsets.forEach(([x, y]) => {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.05), woodMaterial);
        foot.position.set(x, y, 0.025);
        pallet.add(foot);
    });
    group.add(pallet);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.2), bodyMaterial);
    body.position.z = 0.17;
    group.add(body);

    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.028), topMaterial);
    lid.position.z = 0.288;
    group.add(lid);

    const cornerOffsets = [
        [-0.14, -0.14],
        [0.14, -0.14],
        [-0.14, 0.14],
        [0.14, 0.14]
    ];
    cornerOffsets.forEach(([x, y]) => {
        const corner = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.24), bumperMaterial);
        corner.position.set(x, y, 0.17);
        group.add(corner);
    });

    const strapX = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.29, 0.24), strapMaterial);
    strapX.position.z = 0.17;
    group.add(strapX);
    const strapY = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.03, 0.24), strapMaterial);
    strapY.position.z = 0.17;
    group.add(strapY);

    const topStrapX = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.29, 0.005), strapMaterial);
    topStrapX.position.z = 0.303;
    group.add(topStrapX);
    const topStrapY = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.03, 0.005), strapMaterial);
    topStrapY.position.z = 0.303;
    group.add(topStrapY);

    const buckleTop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.015), metalMaterial);
    buckleTop.position.z = 0.308;
    group.add(buckleTop);

    const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.014, 0.08), accentMaterial);
    frontPlate.position.set(0, 0.148, 0.19);
    group.add(frontPlate);

    const topFrame = new THREE.Group();
    const postOffsets = [
        [-0.09, -0.09],
        [0.09, -0.09],
        [-0.09, 0.09],
        [0.09, 0.09]
    ];
    postOffsets.forEach(([x, y]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 10), metalMaterial);
        post.rotation.x = Math.PI / 2;
        post.position.set(x, y, 0.34);
        topFrame.add(post);
    });
    const frameBars = [
        { geometry: new THREE.BoxGeometry(0.20, 0.012, 0.012), position: [0, -0.09, 0.38] },
        { geometry: new THREE.BoxGeometry(0.20, 0.012, 0.012), position: [0, 0.09, 0.38] },
        { geometry: new THREE.BoxGeometry(0.012, 0.20, 0.012), position: [-0.09, 0, 0.38] },
        { geometry: new THREE.BoxGeometry(0.012, 0.20, 0.012), position: [0.09, 0, 0.38] }
    ];
    frameBars.forEach(({ geometry, position }) => {
        const bar = new THREE.Mesh(geometry, metalMaterial);
        bar.position.set(position[0], position[1], position[2]);
        topFrame.add(bar);
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 10, 24), metalMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.z = 0.405;
    topFrame.add(ring);
    group.add(topFrame);

    const cableOffsets = [
        [-0.06, -0.06],
        [0.06, -0.06],
        [-0.06, 0.06],
        [0.06, 0.06]
    ];
    cableOffsets.forEach(([x, y]) => {
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.1, 8), strapMaterial);
        cable.rotation.x = Math.PI / 2;
        cable.rotation.y = x > 0 ? 0.35 : -0.35;
        cable.rotation.x += y > 0 ? -0.35 : 0.35;
        cable.position.set(x, y, 0.34);
        group.add(cable);
    });

    applyShadows(group);
    return group;
}