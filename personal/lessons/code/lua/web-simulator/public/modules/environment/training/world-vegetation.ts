import * as THREE from 'three';
import { createFirTreeMesh, createTreeMesh } from '../obstacles/nature.js';
import { batchStaticMeshes } from './world-surfaces.js';
import { trainingHeightAt } from './world-plan.js';
import type { TrainingLayout } from './layout.js';

export function addWorldVegetation(group: THREE.Group, layout: TrainingLayout): void {
    for (const variant of [0, 1]) {
        const trees = layout.objects.filter(p => p.type === 'tree' && (p.variant ?? 0) === variant);
        if (!trees.length) continue;
        const template = variant ? createTreeMesh() : createFirTreeMesh();
        batchStaticMeshes(template);
        template.updateWorldMatrix(true, true);
        const treeData = trees.map(p => ({ x: p.x, y: p.y, z: trainingHeightAt(layout, p.x, p.y), radius: p.radius, height: 2 * p.scale }));
        // Interleaved order: drawing only the first N instances (low graphics tiers) thins the forest evenly.
        const order = trees.map((_, i) => i).sort((a, b) => ((a * 0.6180339887) % 1) - ((b * 0.6180339887) % 1));
        const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion();
        for (const source of template.children.filter(node => node instanceof THREE.Mesh) as THREE.Mesh[]) {
            const geometry = source.geometry.clone().applyMatrix4(source.matrixWorld);
            const mesh = new THREE.InstancedMesh(geometry, source.material, trees.length);
            order.forEach((treeIndex, i) => {
                const p = trees[treeIndex];
                rotation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), i * 2.399);
                matrix.compose(new THREE.Vector3(p.x, p.y, treeData[treeIndex].z), rotation, new THREE.Vector3(p.scale, p.scale, p.scale));
                mesh.setMatrixAt(i, matrix);
            });
            mesh.instanceMatrix.needsUpdate = true;
            mesh.computeBoundingBox(); mesh.computeBoundingSphere();
            mesh.castShadow = true; mesh.receiveShadow = true;
            mesh.userData.treeTotal = trees.length;
            mesh.name = variant ? 'Лиственные деревья' : 'Еловые рощи';
            // Only one batch owns tree collisions; remaining material batches are visual.
            if (!group.getObjectByName(`tree-collisions-${variant}`)) {
                mesh.name = `tree-collisions-${variant}`;
                mesh.userData.trainingTrees = treeData;
            } else mesh.userData.collidable = false;
            group.add(mesh);
            source.geometry.dispose();
        }
    }
}
