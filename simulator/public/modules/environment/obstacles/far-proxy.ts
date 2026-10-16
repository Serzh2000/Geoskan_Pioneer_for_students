import * as THREE from 'three';

/*
 * A one-box stand-in for a detailed prop (an apartment block is ~200 000 triangles in 16 meshes). The quality governor
 * (scene/core/quality.ts) shows the box instead of the real meshes once the prop is far from the camera and every drone,
 * and swaps them back on approach. From 150 m a block is a few dozen pixels: its silhouette and colour are all that shows.
 */
export const FAR_PROXY_NAME = '__far_proxy';

/** Half the diagonal (metres, scaled) of a prop that needs no extra distance before it becomes a box. */
const REFERENCE_RADIUS = 10;

const relative = new THREE.Matrix4();
const corner = new THREE.Box3();

/** Bounds and an area-weighted average colour of the group's own meshes, in the group's local space. */
function measure(group: THREE.Object3D) {
    group.updateWorldMatrix(true, true);
    const inverse = group.matrixWorld.clone().invert();
    const bounds = new THREE.Box3();
    const color = new THREE.Color(0, 0, 0);
    let weight = 0;
    group.traverse(node => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh || mesh.userData.lodProxy || mesh.userData.keepSeparate || mesh.userData.isIncidentEffect) return;
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        corner.copy(mesh.geometry.boundingBox!).applyMatrix4(relative.multiplyMatrices(inverse, mesh.matrixWorld));
        bounds.union(corner);
        const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
        if (!material?.color || material.transparent) return;
        const size = corner.getSize(new THREE.Vector3());
        const area = size.x * size.y + size.y * size.z + size.x * size.z;
        color.r += material.color.r * area; color.g += material.color.g * area; color.b += material.color.b * area;
        weight += area;
    });
    if (weight > 0) color.multiplyScalar(1 / weight);
    return { bounds, color };
}

/** Adds (or replaces) the far stand-in of `group`. `tint` is mixed in: windows make a block darker than its walls. */
export function attachFarProxy(group: THREE.Object3D, tint?: { color: number; amount: number }): THREE.Mesh | null {
    const previous = group.getObjectByName(FAR_PROXY_NAME);
    if (previous) {
        previous.removeFromParent();
        const old = previous as THREE.Mesh;
        old.geometry.dispose(); (old.material as THREE.Material).dispose();
    }
    const { bounds, color } = measure(group);
    if (bounds.isEmpty()) return null;
    if (tint) color.lerp(new THREE.Color(tint.color), tint.amount);
    const size = bounds.getSize(new THREE.Vector3());
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    geometry.translate((bounds.min.x + bounds.max.x) / 2, (bounds.min.y + bounds.max.y) / 2, (bounds.min.z + bounds.max.z) / 2);
    const proxy = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: .95, metalness: 0 }));
    proxy.name = FAR_PROXY_NAME;
    proxy.visible = false;
    proxy.castShadow = false;
    proxy.receiveShadow = false;
    // keepSeparate: the shell merge must not swallow it; noShadowLod: the governor must not give it a shadow.
    proxy.userData = { lodProxy: true, keepSeparate: true, noShadowLod: true, collidable: false };
    group.add(proxy);
    group.userData.lodProxy = proxy;
    // A big building shows its simplification from farther away than a small one: the threshold grows with its size.
    group.userData.lodScale = THREE.MathUtils.clamp(size.length() / 2 / REFERENCE_RADIUS, 1, 3);
    group.userData.lodFar = false;
    group.userData.lodChildCount = undefined;
    return proxy;
}
