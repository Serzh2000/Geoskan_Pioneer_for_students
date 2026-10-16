import * as THREE from 'three';

/** Frame authored training extents, including moved, rotated and scaled presets. */
export function groundOverview(camera: THREE.PerspectiveCamera, environment?: THREE.Object3D) {
    const bounds = new THREE.Box3();
    for (const root of environment?.children ?? []) {
        const size = Number(root.userData.trainingLayout?.size);
        if (!root.visible || !Number.isFinite(size) || size <= 0) continue;
        root.updateWorldMatrix(true, false);
        for (const x of [-size / 2, size / 2]) {
            for (const y of [-size / 2, size / 2]) {
                bounds.expandByPoint(new THREE.Vector3(x, y, 0).applyMatrix4(root.matrixWorld));
            }
        }
    }
    const target = bounds.isEmpty() ? new THREE.Vector3() : bounds.getCenter(new THREE.Vector3());
    const extent = bounds.isEmpty() ? null : bounds.getSize(new THREE.Vector3());
    const height = extent
        ? 40 + 1.1 * Math.max(extent.y, extent.x / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
        : Math.max(24, 24 / camera.aspect);
    const position = target.clone().add(new THREE.Vector3(0, 0, height));
    return { target, position, far: Math.max(300, height + (extent?.length() ?? 0) + 40) };
}
