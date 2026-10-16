import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Bake static road/rail pieces by material, retaining the route's editable metadata. */
export function batchStaticMeshes(root: THREE.Group): void {
    root.updateWorldMatrix(true, true);
    const inverse = root.matrixWorld.clone().invert(), batches = new Map<THREE.Material, THREE.Mesh[]>();
    root.traverse(node => {
        if (!(node instanceof THREE.Mesh) || node instanceof THREE.InstancedMesh || Array.isArray(node.material)) return;
        const parts = batches.get(node.material) ?? []; parts.push(node); batches.set(node.material, parts);
    });
    for (const [material, parts] of batches) {
        if (parts.length < 2) continue;
        const textured = Object.values(material).some(value => value instanceof THREE.Texture);
        const nonIndexed = parts.some(p => !p.geometry.index);
        const geometries = parts.map(p => {
            let geometry = p.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, p.matrixWorld));
            // Procedural ribbons have no UVs; box markings do. Their solid material needs neither.
            if (!textured) geometry.deleteAttribute('uv');
            if (nonIndexed && geometry.index) { const flat = geometry.toNonIndexed(); geometry.dispose(); geometry = flat; }
            return geometry;
        });
        const signature = (geometry: THREE.BufferGeometry) => Object.keys(geometry.attributes).sort().join(',');
        if (geometries.some(geometry => signature(geometry) !== signature(geometries[0]))) {
            geometries.forEach(g => g.dispose()); continue;
        }
        const geometry = mergeGeometries(geometries);
        geometries.forEach(g => g.dispose());
        if (!geometry) continue;
        parts.forEach(p => { p.removeFromParent(); p.geometry.dispose(); });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.receiveShadow = true; mesh.castShadow = true;
        root.add(mesh);
    }
}
