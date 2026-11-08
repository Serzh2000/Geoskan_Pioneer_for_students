import * as THREE from 'three';
import { createFirTreeMesh, createMapleMesh, createPineMesh, createPoplarMesh, createShrubMesh, createTreeMesh } from '../obstacles/nature.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { trainingHeightAt } from './world-plan.js';
import type { TrainingLayout } from './layout.js';

/**
 * Species by `variant`: 0 spruce, 1 oak, 2 poplar, 3 pine, 4 shrub, 5 maple. Each is one instanced mesh per material, shared by every
 * plant of the species; `height` is the collision envelope of the plant at scale 1, `leafy` tells the seasons which ones turn.
 */
export const SPECIES: Record<number, { make: () => THREE.Group; height: number; leafy: boolean; name: string }> = {
    0: { make: createFirTreeMesh, height: 2.1, leafy: false, name: 'Еловые рощи' },
    1: { make: createTreeMesh, height: 2, leafy: true, name: 'Лиственные деревья' },
    2: { make: createPoplarMesh, height: 2.8, leafy: true, name: 'Тополя' },
    3: { make: createPineMesh, height: 2.2, leafy: false, name: 'Сосны' },
    4: { make: createShrubMesh, height: .6, leafy: true, name: 'Кусты' },
    5: { make: createMapleMesh, height: 1.8, leafy: true, name: 'Клёны' }
};

/**
 * A species as two draw batches, whatever it is made of: bark (trunk, roots) and foliage. The lobes keep their own greens as vertex colours
 * relative to the mean green of the material, so the seasons can still tint the material as a whole.
 */
function mergeSpecies(template: THREE.Group): Array<{ geometry: THREE.BufferGeometry; material: THREE.Material }> {
    template.updateWorldMatrix(true, true);
    const meshes = template.children.filter(node => node instanceof THREE.Mesh) as THREE.Mesh[];
    const leaf = meshes.filter(m => (m.material as THREE.MeshStandardMaterial).color.g > (m.material as THREE.MeshStandardMaterial).color.r);
    const bark = meshes.filter(m => !leaf.includes(m));
    const baked = (list: THREE.Mesh[], colors: (m: THREE.Mesh) => THREE.Color | null) => list.map(m => {
        let g = m.geometry.clone().applyMatrix4(m.matrixWorld);
        if (g.index) g = g.toNonIndexed();
        g.deleteAttribute('uv');
        const color = colors(m);
        if (color) {
            const data = new Float32Array(g.attributes.position.count * 3);
            for (let i = 0; i < data.length; i += 3) { data[i] = color.r; data[i + 1] = color.g; data[i + 2] = color.b; }
            g.setAttribute('color', new THREE.BufferAttribute(data, 3));
        }
        return g;
    });
    const out: Array<{ geometry: THREE.BufferGeometry; material: THREE.Material }> = [];
    if (bark.length) {
        const geometry = mergeGeometries(baked(bark, () => null));
        if (geometry) out.push({ geometry, material: bark[0].material as THREE.Material });
    }
    if (leaf.length) {
        const mean = new THREE.Color(0, 0, 0);
        for (const m of leaf) mean.add((m.material as THREE.MeshStandardMaterial).color);
        mean.multiplyScalar(1 / leaf.length);
        const geometry = mergeGeometries(baked(leaf, m => { const c = (m.material as THREE.MeshStandardMaterial).color; return new THREE.Color(c.r / mean.r, c.g / mean.g, c.b / mean.b); }));
        const material = (leaf[0].material as THREE.MeshStandardMaterial).clone();
        material.color.copy(mean); material.vertexColors = true;
        if (geometry) out.push({ geometry, material });
    }
    return out;
}

export function addWorldVegetation(group: THREE.Group, layout: TrainingLayout): void {
    for (const variant of Object.keys(SPECIES).map(Number)) {
        const trees = layout.objects.filter(p => p.type === 'tree' && (p.variant ?? 0) === variant);
        if (!trees.length) continue;
        const species = SPECIES[variant], template = species.make();
        template.updateWorldMatrix(true, true);
        const treeData = trees.map(p => ({ x: p.x, y: p.y, z: trainingHeightAt(layout, p.x, p.y), radius: p.radius, height: species.height * p.scale, variant }));
        // Interleaved order: drawing only the first N instances (low graphics tiers) thins the forest evenly.
        const order = trees.map((_, i) => i).sort((a, b) => ((a * 0.6180339887) % 1) - ((b * 0.6180339887) % 1));
        const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion();
        for (const { geometry, material } of mergeSpecies(template)) {
            const mesh = new THREE.InstancedMesh(geometry, material, trees.length);
            order.forEach((treeIndex, i) => {
                const p = trees[treeIndex];
                rotation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), i * 2.399);
                // Each plant gets its own turn and a slightly different height: no two neighbours are copies.
                const noise = Math.sin(p.x * 12.9898 + p.y * 78.233) * 43758.5453, stretch = .9 + .25 * (noise - Math.floor(noise));
                matrix.compose(new THREE.Vector3(p.x, p.y, treeData[treeIndex].z), rotation, new THREE.Vector3(p.scale, p.scale, p.scale * stretch));
                mesh.setMatrixAt(i, matrix);
            });
            mesh.instanceMatrix.needsUpdate = true;
            mesh.computeBoundingBox(); mesh.computeBoundingSphere();
            mesh.castShadow = true; mesh.receiveShadow = true;
            mesh.userData.treeTotal = trees.length;
            mesh.name = species.name;
            // Only one batch owns tree collisions; remaining material batches are visual.
            if (!group.getObjectByName(`tree-collisions-${variant}`)) {
                mesh.name = `tree-collisions-${variant}`;
                mesh.userData.trainingTrees = treeData;
            } else mesh.userData.collidable = false;
            group.add(mesh);
        }
    }
}
