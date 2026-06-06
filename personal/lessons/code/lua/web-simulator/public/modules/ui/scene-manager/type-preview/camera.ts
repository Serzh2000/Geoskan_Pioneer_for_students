/**
 * Подгоняет камеру превью под текущий объект.
 * Выделен отдельно, чтобы не смешивать математику кадрирования и UI-контроллер.
 */
import * as THREE from 'three';

export function fitPreviewCameraToObject(
    camera: THREE.PerspectiveCamera,
    object: THREE.Object3D,
    rebuildGround: (size: number) => void
) {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) {
        camera.position.set(7, -7, 6);
        camera.lookAt(0, 0, 0.8);
        return;
    }

    const center = box.getCenter(new THREE.Vector3());
    object.position.sub(center);

    const normalizedBox = new THREE.Box3().setFromObject(object);
    object.position.z -= normalizedBox.min.z;

    const finalBox = new THREE.Box3().setFromObject(object);
    const size = finalBox.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z, 1);
    const distance = maxSize * 2.35 + 4.2;
    const lookAtTarget = new THREE.Vector3(0, 0, Math.max(size.z * 0.4, 0.85));
    const direction = new THREE.Vector3(1.65, -1.4, 1.28).normalize();

    camera.position.copy(direction.multiplyScalar(distance));
    camera.lookAt(lookAtTarget);
    rebuildGround(Math.min(Math.max(Math.max(size.x, size.y) * 1.1, 5), 20));
}
