import * as THREE from 'three';

export function getViewportCenterSelectionPoint() {
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

export function isDroneSceneObject(target: THREE.Object3D | null | undefined, droneMeshes: Record<string, THREE.Object3D>) {
    if (!target) return false;
    return Object.values(droneMeshes).includes(target);
}

export function moveObjectIntoGroupPreservingWorldTransform(
    object: THREE.Object3D,
    group: THREE.Group,
    center: THREE.Vector3
) {
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    object.getWorldPosition(worldPos);
    object.getWorldQuaternion(worldQuat);
    object.getWorldScale(worldScale);

    group.add(object);
    object.position.copy(worldPos).sub(center);
    object.quaternion.copy(worldQuat);
    object.scale.copy(worldScale);
}

export function detachObjectFromGroupPreservingWorldTransform(
    object: THREE.Object3D,
    parent: THREE.Object3D
) {
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    object.getWorldPosition(worldPos);
    object.getWorldQuaternion(worldQuat);
    object.getWorldScale(worldScale);

    parent.add(object);
    object.position.copy(worldPos);
    object.quaternion.copy(worldQuat);
    object.scale.copy(worldScale);
}

export function disposeObjectHierarchyResources(object: THREE.Object3D) {
    object.traverse((child: any) => {
        if (!child.isMesh) return;
        if (child.geometry) child.geometry.dispose();
        if (!child.material) return;
        if (Array.isArray(child.material)) {
            child.material.forEach((material: THREE.Material) => material.dispose());
            return;
        }
        child.material.dispose();
    });
}
