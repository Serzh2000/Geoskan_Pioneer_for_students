import * as THREE from 'three';
import data from '../../../assets/models/props/mission-assets-v1.mesh.json';

export type MissionAsset = keyof typeof data.assets;

/** Blender-authored meshes, bundled synchronously so catalog cameras fit the
 * actual model on the first frame. Instances own all disposable GPU resources. */
export function createMissionAsset(name: MissionAsset): THREE.Group {
    const group = new THREE.Group();
    group.name = `mission-${name.toLowerCase()}`;
    for (const part of data.assets[name]) {
        const config = data.materials[part.material as keyof typeof data.materials];
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(part.position, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(part.normal, 3));
        geometry.setIndex(part.index);
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        const color = new THREE.Color().setRGB(config.color[0], config.color[1], config.color[2], THREE.LinearSRGBColorSpace);
        const material = new THREE.MeshStandardMaterial({
            name: part.material,
            color,
            roughness: config.roughness,
            metalness: config.metalness,
            emissive: config.emission ? color : 0x000000,
            emissiveIntensity: config.emission,
            side: part.material === 'Glass' ? THREE.DoubleSide : THREE.FrontSide
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = `${name}-${part.material}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
    }
    return group;
}
