import * as THREE from 'three';

export function createTrussArenaMesh(size = 18, height = 5) {
    const group = new THREE.Group();
    const trussRadius = 0.05;
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x657781, metalness: 0.65, roughness: 0.38 });

    const createTruss = (p1: THREE.Vector3, p2: THREE.Vector3) => {
        const dist = p1.distanceTo(p2);
        const geom = new THREE.CylinderGeometry(trussRadius, trussRadius, dist, 8);
        const truss = new THREE.Mesh(geom, trussMat);
        truss.position.copy(p1).lerp(p2, 0.5);
        truss.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
        group.add(truss);
    };

    // Pillars
    const corners = [
        new THREE.Vector3(size/2, size/2, 0),
        new THREE.Vector3(-size/2, size/2, 0),
        new THREE.Vector3(-size/2, -size/2, 0),
        new THREE.Vector3(size/2, -size/2, 0)
    ];

    corners.forEach(c => {
        createTruss(c, c.clone().setZ(height));
        // Feet
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16), trussMat);
        foot.position.copy(c).setZ(0.025);
        foot.rotation.x = Math.PI / 2;
        group.add(foot);
    });

    // Top beams
    for (let i = 0; i < 4; i++) {
        createTruss(corners[i].clone().setZ(height), corners[(i+1)%4].clone().setZ(height));
    }

    // Batched safety mesh: real square cells, no diagonal box wireframe.
    const vertices: number[] = [];
    const h = size / 2;
    const line = (a: number[], b: number[]) => vertices.push(...a, ...b);
    for (let v = -h; v <= h; v += 0.5) {
        line([v, h, 0], [v, h, height]);
        line([-h, v, 0], [-h, v, height]);
        line([h, v, 0], [h, v, height]);
    }
    for (let z = 0.5; z <= height; z += 0.5) {
        line([-h, h, z], [h, h, z]);
        line([-h, -h, z], [-h, h, z]);
        line([h, -h, z], [h, h, z]);
    }
    const netGeometry = new THREE.BufferGeometry();
    netGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    group.add(new THREE.LineSegments(netGeometry, new THREE.LineBasicMaterial({
        color: 0x7e969f, transparent: true, opacity: 0.12, depthWrite: false
    })));
    // Perimeter luminaires provide visual depth without additional light passes.
    const lightMaterial = new THREE.MeshStandardMaterial({
        color: 0xd6f1ff, emissive: 0xb9e5ff, emissiveIntensity: 2,
        roughness: 0.45
    });
    for (const x of [-h, h]) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.035, size - 0.5, 0.04), lightMaterial);
        strip.position.set(x, 0, height - 0.12);
        group.add(strip);
    }

    return group;
}

export function createTrussArena(group: THREE.Group) {
    const frame = createTrussArenaMesh();
    frame.name = 'Ограждение полигона';
    frame.userData.defaultArenaFrame = true;
    group.add(frame);
}
