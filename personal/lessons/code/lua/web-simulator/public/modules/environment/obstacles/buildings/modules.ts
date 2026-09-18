import * as THREE from 'three';
import { loadTrainingTemplate } from '../training-props.js';
import { BuildingWindowSlot } from './shared.js';

let templatePromise: Promise<THREE.Group> | undefined;

function loadTemplate(): Promise<THREE.Group> {
    templatePromise ??= loadTrainingTemplate();
    return templatePromise;
}

function applyNamedMaterials(instance: THREE.Object3D, nameToMaterial: Record<string, THREE.Material>) {
    instance.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = true;
        object.receiveShadow = true;
        object.frustumCulled = false;
        const material = nameToMaterial[object.name.replace(/^V2_/, '').replace(/\.\d+$/, '')];
        if (material) object.material = material;
    });
}

export interface WindowModuleMaterials {
    [key: string]: THREE.Material;
    Niche: THREE.Material;
    Frame: THREE.Material;
    MullionV: THREE.Material;
    MullionH: THREE.Material;
    TopFrame: THREE.Material;
    Sill: THREE.Material;
    BalconyFloor: THREE.Material;
    BalconyUnderside: THREE.Material;
    BalconyFront: THREE.Material;
    SideRailL: THREE.Material;
    SideRailR: THREE.Material;
    TopRail: THREE.Material;
    Baluster0: THREE.Material;
    Baluster1: THREE.Material;
    Baluster2: THREE.Material;
}

export interface EntranceModuleMaterials {
    [key: string]: THREE.Material;
    EntranceFrame: THREE.Material;
    EntranceDoor: THREE.Material;
    EntranceCanopy: THREE.Material;
    EntranceStep: THREE.Material;
    EntranceHandleL: THREE.Material;
    EntranceHandleR: THREE.Material;
    EntranceCanopyPostL: THREE.Material;
    EntranceCanopyPostR: THREE.Material;
}

/**
 * Clones the Blender window+balcony module into `group` for every slot, and the entrance module once.
 * Runs async (first call pays the GLB fetch/parse cost); callers should re-batch/merge the shell
 * (see buildings.ts#mergeBuildingShell) only after this resolves.
 */
export async function populateWindowsAndEntrance(
    group: THREE.Group,
    windowSlots: BuildingWindowSlot[],
    resolveWindowGlassMaterial: (slot: BuildingWindowSlot) => THREE.Material,
    windowMaterials: WindowModuleMaterials,
    entranceMaterials: EntranceModuleMaterials
): Promise<void> {
    const generation = group.userData.rebuildGeneration;
    const template = await loadTemplate();
    if (group.userData.rebuildGeneration !== generation) return;
    const windowSource = template.getObjectByName('V2_WindowModule');
    const entranceSource = template.getObjectByName('V2_EntranceModule');
    const floorSource = template.getObjectByName('V2_BuildingFloor');
    const roofSource = template.getObjectByName('V2_BuildingRoof');
    const floors = Number(group.userData.floors);
    if (floorSource) for (let floor = 0; floor < floors; floor++) {
        const instance = floorSource.clone(true);
        instance.position.z = 0.65 + floor * 0.72;
        applyNamedMaterials(instance, {});
        group.add(instance);
    }
    if (roofSource) {
        const instance = roofSource.clone(true); instance.position.z = 0.65 + floors * 0.72;
        applyNamedMaterials(instance, {}); group.add(instance);
    }

    if (windowSource) {
        for (const slot of windowSlots) {
            const instance = windowSource.clone(true);
            applyNamedMaterials(instance, { ...windowMaterials, WindowGlass: resolveWindowGlassMaterial(slot) });
            instance.position.copy(slot.position);
            instance.rotation.z = slot.outward === 1 ? 0 : Math.PI;
            group.add(instance);
        }
    }

    if (entranceSource) {
        const instance = entranceSource.clone(true);
        applyNamedMaterials(instance, entranceMaterials);
        group.add(instance);
    }
}
