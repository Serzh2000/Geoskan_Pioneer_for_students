import * as THREE from 'three';

export function disposeSceneResources(scene: THREE.Scene | null) {
    if (!scene) return;

    scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) {
            mesh.geometry.dispose();
        }
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach((material) => material.dispose());
        } else {
            mesh.material?.dispose?.();
        }
    });
}

function createPointMarker(baseColor: number, accentColor: number, radius: number, haloRadius: number): THREE.Group {
    const group = new THREE.Group();

    const halo = new THREE.Mesh(
        new THREE.CircleGeometry(haloRadius, 40),
        new THREE.MeshBasicMaterial({
            color: accentColor,
            transparent: true,
            opacity: 0.14,
            depthWrite: false
        })
    );
    halo.position.z = 0.002;

    const core = new THREE.Mesh(
        new THREE.CircleGeometry(radius, 40),
        new THREE.MeshBasicMaterial({
            color: baseColor,
            depthWrite: false
        })
    );
    core.position.z = 0.004;

    const cap = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 0.48, 20, 20),
        new THREE.MeshStandardMaterial({
            color: accentColor,
            emissive: accentColor,
            emissiveIntensity: 0.35,
            roughness: 0.4,
            metalness: 0.08
        })
    );
    cap.position.z = radius * 0.58;

    group.add(halo, core, cap);
    return group;
}

export function createBeaconMarker(baseColor: number, capColor: number): THREE.Group {
    return createPointMarker(baseColor, capColor, 0.042, 0.1);
}

export function createTargetMarker(): THREE.Group {
    return createPointMarker(0x38bdf8, 0xf8fafc, 0.055, 0.135);
}

export function createLine(color: number): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3()
    ]);
    const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9
    });
    return new THREE.Line(geometry, material);
}
