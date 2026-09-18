import * as THREE from 'three';
import { setCommonMeta, applyShadows } from './utils.js';
import { createParkBenchMesh, createParkLampMesh, createParkPlanterMesh } from './park-props.js';

const bark = () => new THREE.MeshStandardMaterial({ color: 0x675b4c, roughness: 0.96 });
const foliage = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.94 });
const noise = (i: number) => { const n = Math.sin(i * 127.1 + 13.7) * 43758.5453; return n - Math.floor(n); };

export function createBushMesh(scale = 1) {
    const group = new THREE.Group();
    const geometry = new THREE.IcosahedronGeometry(0.3, 2);
    const material = foliage(0x627854);
    for (let i = 0; i < 5; i++) {
        const lobe = new THREE.Mesh(geometry, material);
        const angle = i * 2.4;
        lobe.position.set(Math.cos(angle) * 0.16, Math.sin(angle) * 0.16, 0.2 + noise(i) * 0.08);
        lobe.scale.set(0.8, 0.8, 0.65 + noise(i + 8) * 0.25);
        group.add(lobe);
    }
    group.scale.setScalar(scale);
    applyShadows(group);
    return group;
}

export function createHillMesh() {
    const group = setCommonMeta(new THREE.Group(), 'Холм', { collidableRadius: 2.6 });
    const radius = 2.4;
    const points: THREE.Vector2[] = [];
    for (let i = 24; i >= 0; i--) {
        const t = i / 24;
        points.push(new THREE.Vector2(t * radius, 1.3 * (Math.cos(t * Math.PI) + 1) / 2));
    }
    const geometry = new THREE.LatheGeometry(points, 48);
    const position = geometry.attributes.position;
    const colors: number[] = [];
    const low = new THREE.Color(0x758064), high = new THREE.Color(0x92967a);
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
        const angle = Math.atan2(z, x);
        const distortion = 1 + 0.06 * Math.cos(3 * angle) + 0.04 * Math.sin(5 * angle);
        position.setX(i, x * distortion); position.setZ(i, z * distortion);
        const c = low.clone().lerp(high, Math.min(1, y / 1.3 * 0.7 + 0.15 * Math.sin(x * 5) * Math.cos(z * 4)));
        colors.push(c.r, c.g, c.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const mound = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    mound.rotation.x = Math.PI / 2;
    group.add(mound);
    // Small vegetation accents; no hundreds of individual grass draw calls.
    for (let i = 0; i < 7; i++) {
        const angle = i * 2.4, r = 1.3 + noise(i) * 0.65;
        const distortion = 1 + 0.06 * Math.cos(-3 * angle) + 0.04 * Math.sin(-5 * angle);
        const t = Math.min(1, r / distortion / radius);
        const bush = createBushMesh(0.5 + noise(i + 20) * 0.4);
        bush.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 1.3 * (Math.cos(t * Math.PI) + 1) / 2);
        group.add(bush);
    }
    applyShadows(group);
    return group;
}

export function createFirTreeMesh() {
    const group = setCommonMeta(new THREE.Group(), 'Ель', { collidableRadius: 0.5 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.065, 1.6, 10), bark());
    trunk.rotation.x = Math.PI / 2; trunk.position.z = 0.8; group.add(trunk);
    const materials = [foliage(0x3e6255), foliage(0x4b6b58), foliage(0x567560)];
    for (let i = 0; i < 6; i++) {
        const radius = 0.48 * (1 - i / 7);
        const geometry = new THREE.ConeGeometry(radius, 0.5, 14, 2);
        const positions = geometry.attributes.position;
        for (let v = 0; v < positions.count; v++) {
            const angle = Math.atan2(positions.getZ(v), positions.getX(v));
            const k = 1 + Math.sin(angle * 7 + i) * 0.12;
            positions.setX(v, positions.getX(v) * k); positions.setZ(v, positions.getZ(v) * k);
        }
        geometry.computeVertexNormals();
        const crown = new THREE.Mesh(geometry, materials[i % 3]);
        crown.rotation.set(Math.PI / 2, i * 0.7, 0);
        crown.position.z = 0.52 + i * 0.21; group.add(crown);
    }
    applyShadows(group);
    return group;
}

export function createTreeMesh(scale = 1) {
    const group = setCommonMeta(new THREE.Group(), 'Дерево', { collidableRadius: 0.7 * scale });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.1, 1.2, 10), bark());
    trunk.rotation.x = Math.PI / 2; trunk.position.z = 0.6; group.add(trunk);
    const geometry = new THREE.IcosahedronGeometry(0.42, 2);
    const materials = [foliage(0x627951), foliage(0x73855d), foliage(0x526d51)];
    for (let i = 0; i < 7; i++) {
        const angle = i * 2.4;
        const crown = new THREE.Mesh(geometry, materials[i % 3]);
        crown.position.set(Math.cos(angle) * 0.28, Math.sin(angle) * 0.28, 1.08 + noise(i) * 0.45);
        crown.scale.set(0.8 + noise(i + 1) * 0.3, 0.9, 1.05);
        group.add(crown);
    }
    group.scale.setScalar(scale);
    applyShadows(group);
    return group;
}

export function createParkPatch(width: number, depth: number) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(width + 0.18, depth + 0.18, 0.06), foliage(0x999e90));
    base.position.z = 0.03; group.add(base);
    const grass = new THREE.Mesh(new THREE.BoxGeometry(width, depth, 0.065), foliage(0x788668));
    grass.position.z = 0.035; group.add(grass);

    const propZ = 0.067;
    const planter = createParkPlanterMesh();
    planter.position.set(0, 0, propZ);
    group.add(planter);

    const bench = createParkBenchMesh();
    bench.position.set(0, -depth * 0.38, propZ);
    group.add(bench);

    const lampA = createParkLampMesh();
    lampA.position.set(-width * 0.44, depth * 0.42, propZ);
    group.add(lampA);

    const lampB = createParkLampMesh();
    lampB.position.set(width * 0.44, -depth * 0.42, propZ);
    group.add(lampB);

    applyShadows(group);
    return group;
}
