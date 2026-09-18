import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { setCommonMeta } from './utils.js';
import houseUrl from '../../../assets/models/props/house.glb?url';

let templatePromise: Promise<THREE.Group> | undefined;

function loadTemplate(): Promise<THREE.Group> {
    templatePromise ??= new GLTFLoader().loadAsync(houseUrl).then(({ scene }) => scene);
    return templatePromise;
}

export interface SettlementHouseOptions {
    scale?: number;
    wallColor?: number;
    roofColor?: number;
    showChimney?: boolean;
}

/** Clones the Blender-made house per instance so the palette swap below doesn't leak across houses. */
export function createSettlementHouseMesh(options: SettlementHouseOptions = {}): THREE.Group {
    const { scale = 1, wallColor, roofColor, showChimney = true } = options;
    const group = setCommonMeta(new THREE.Group(), 'Домик', { collidableRadius: 0.5 * scale });
    group.scale.setScalar(scale);

    void loadTemplate().then((template) => {
        const instance = template.clone(true);
        instance.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            const recolor = (material: THREE.Material) => {
                const clone = material.clone();
                if (wallColor !== undefined && clone.name === 'Walls' && clone instanceof THREE.MeshStandardMaterial) {
                    clone.color.setHex(wallColor);
                }
                if (roofColor !== undefined && clone.name === 'Roof' && clone instanceof THREE.MeshStandardMaterial) {
                    clone.color.setHex(roofColor);
                }
                return clone;
            };
            object.material = Array.isArray(object.material)
                ? object.material.map(recolor)
                : recolor(object.material);
            object.castShadow = true;
            object.receiveShadow = true;
            object.frustumCulled = false;
        });
        const chimney = instance.getObjectByName('Chimney');
        if (chimney) chimney.visible = showChimney;
        group.add(instance);
    }).catch((error) => {
        console.error('[HouseProp] Failed to load settlement house model', error);
    });

    return group;
}
