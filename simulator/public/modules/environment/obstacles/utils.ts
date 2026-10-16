import * as THREE from 'three';

export function setCommonMeta<T extends THREE.Object3D>(obj: T, type: string, extra: Record<string, unknown> = {}) {
    obj.name = type;
    obj.userData = {
        ...obj.userData,
        draggable: true,
        type,
        label: type,
        collidableRadius: 0.75,
        ...extra
    };
    return obj;
}

export function applyShadows(root: THREE.Object3D) {
    root.traverse((node: any) => {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            // Thin or procedurally composed scene props sometimes pop out during camera motion
            // because their bounds are too aggressive for frustum culling.
            node.frustumCulled = false;
        }
    });
}

export function disposeObject3D(root: THREE.Object3D) {
    root.traverse((child: any) => {
        if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (Array.isArray(child.material)) {
                child.material.forEach((mat: THREE.Material) => mat.dispose());
            } else if (child.material) {
                child.material.dispose();
            }
        }
    });
}

export function clearGeneratedChildren(group: THREE.Group) {
    for (let i = group.children.length - 1; i >= 0; i--) {
        const child = group.children[i];
        group.remove(child);
        disposeObject3D(child);
    }
}
