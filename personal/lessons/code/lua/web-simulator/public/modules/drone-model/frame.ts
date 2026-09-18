import * as THREE from 'three';
import { buildCadAssembly } from './frame-cad.js';
import {
    createBatteryVolume,
    createFallbackStructure,
    createGuard,
    createLegs
} from './frame-fallback.js';

export function createFrame(carbonMat: THREE.Material, plasticMat: THREE.Material) {
    const frameGroup = new THREE.Group();
    const fallbackStructure = createFallbackStructure(carbonMat);
    const fallbackLegs = createLegs(carbonMat);
    const fallbackGuard = createGuard();

    frameGroup.add(fallbackStructure);
    frameGroup.add(createBatteryVolume());
    frameGroup.add(fallbackLegs);
    frameGroup.add(fallbackGuard);

    void attachCadAssembly(frameGroup, fallbackStructure, fallbackLegs, fallbackGuard, carbonMat, plasticMat);
    return frameGroup;
}

async function attachCadAssembly(
    frameGroup: THREE.Group,
    fallbackStructure: THREE.Group,
    fallbackLegs: THREE.Group,
    fallbackGuard: THREE.Group,
    carbonMat: THREE.Material,
    plasticMat: THREE.Material
) {
    try {
        const cadAssembly = await buildCadAssembly(carbonMat, plasticMat);
        fallbackStructure.visible = false;
        fallbackLegs.visible = false;
        fallbackGuard.visible = false;
        frameGroup.add(cadAssembly);
    } catch (error) {
        console.warn('[DroneModel] Failed to assemble Pioneer CAD frame from STL assets.', error);
    }
}
