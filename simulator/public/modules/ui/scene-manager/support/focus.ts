import type { SceneManagerDomRefs } from '../types.js';
import { getMapInputs } from './maps.js';

export function isSceneEditorFocused(elements: SceneManagerDomRefs) {
    const active = document.activeElement;
    return active === elements.addValueEl
        || active === elements.addFloorsEl
        || active === elements.addBuildingFloorEl
        || active === elements.addBuildingFaceEl
        || active === elements.addBuildingWindowEl
        || active === elements.addBuildingKindEl
        || active === elements.addBuildingIncidentsEl
        || active === elements.addPointsEl
        || active === elements.addDictionaryEl
        || getMapInputs(elements).includes(active as HTMLInputElement | HTMLSelectElement)
        || active === elements.selectedValueEl
        || active === elements.selectedFloorsEl
        || active === elements.selectedBuildingFloorEl
        || active === elements.selectedBuildingFaceEl
        || active === elements.selectedBuildingWindowEl
        || active === elements.selectedBuildingKindEl
        || active === elements.selectedBuildingIncidentsEl
        || active === elements.selectedDictionaryEl
        || active === elements.selectedPointsEl;
}
