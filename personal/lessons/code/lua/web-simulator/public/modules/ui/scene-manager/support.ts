import {
    DEFAULT_APRILTAG_DICTIONARY,
    DEFAULT_ARUCO_DICTIONARY,
    MARKER_DICTIONARY_OPTIONS
} from '../../environment/obstacles/marker-dictionaries.js';
import type { MarkerMapOptions } from '../../environment/obstacles.js';
import {
    appendIncidentEntry as appendIncidentEntryBase,
    clearIncidentEntries as clearIncidentEntriesBase,
    setBuildingControlsVisible,
    syncFloorLimit as syncFloorLimitBase,
    syncIncidentValue
} from './support/building.js';
import {
    getMapInputs,
    readAddMarkerMapOptions as readAddMarkerMapOptionsBase,
    updateAddControlsState as updateAddControlsStateBase,
    updateMapSummary as updateMapSummaryBase
} from './support/maps.js';

export interface SceneManagerDomRefs {
    clickCoordsEl: HTMLElement | null;
    listEl: HTMLElement | null;
    detailsEl: HTMLElement | null;
    selectedObjectChipEl: HTMLElement | null;
    addModalEl: HTMLDivElement | null;
    openAddModalBtn: HTMLElement | null;
    closeAddModalBtn: HTMLElement | null;
    addTypeEl: HTMLSelectElement | null;
    addDictionaryEl: HTMLSelectElement | null;
    addValueEl: HTMLInputElement | null;
    addFloorsWrapEl: HTMLLabelElement | null;
    addFloorsEl: HTMLInputElement | null;
    addBuildingSettingsEl: HTMLDivElement | null;
    addBuildingFloorEl: HTMLInputElement | null;
    addBuildingFaceEl: HTMLSelectElement | null;
    addBuildingWindowEl: HTMLSelectElement | null;
    addBuildingKindEl: HTMLSelectElement | null;
    addBuildingIncidentsEl: HTMLTextAreaElement | null;
    addBuildingAppendBtn: HTMLElement | null;
    addBuildingClearBtn: HTMLElement | null;
    addMapSettingsEl: HTMLDivElement | null;
    addMapSummaryEl: HTMLDivElement | null;
    addMapRowsEl: HTMLInputElement | null;
    addMapColumnsEl: HTMLInputElement | null;
    addMapStartIdEl: HTMLInputElement | null;
    addMapIdStepEl: HTMLInputElement | null;
    addMapMarkerSizeEl: HTMLInputElement | null;
    addMapRotationEl: HTMLInputElement | null;
    addMapGapXEl: HTMLInputElement | null;
    addMapGapYEl: HTMLInputElement | null;
    addMapTraversalEl: HTMLSelectElement | null;
    addMapStartCornerEl: HTMLSelectElement | null;
    addMapAnchorEl: HTMLSelectElement | null;
    addMapSnakeEl: HTMLInputElement | null;
    addPathHintEl: HTMLDivElement | null;
    addPointsEl: HTMLTextAreaElement | null;
    addBtn: HTMLElement | null;
    presetTypeEl: HTMLSelectElement | null;
    presetBtn: HTMLElement | null;
    selectedDictionaryEl: HTMLSelectElement | null;
    selectedValueEl: HTMLInputElement | null;
    selectedFloorsWrapEl: HTMLLabelElement | null;
    selectedFloorsEl: HTMLInputElement | null;
    selectedBuildingSettingsEl: HTMLDivElement | null;
    selectedBuildingFloorEl: HTMLInputElement | null;
    selectedBuildingFaceEl: HTMLSelectElement | null;
    selectedBuildingWindowEl: HTMLSelectElement | null;
    selectedBuildingKindEl: HTMLSelectElement | null;
    selectedBuildingIncidentsEl: HTMLTextAreaElement | null;
    selectedBuildingAppendBtn: HTMLElement | null;
    selectedBuildingClearBtn: HTMLElement | null;
    selectedPointsEl: HTMLTextAreaElement | null;
    applyMetaBtn: HTMLElement | null;
    appendPointBtn: HTMLElement | null;
    visualEditBtn: HTMLElement | null;
    deleteBtn: HTMLElement | null;
    groupBtn: HTMLElement | null;
    ungroupBtn: HTMLElement | null;
    resetDroneBtn: HTMLElement | null;
    modeTranslateBtn: HTMLElement | null;
    modeRotateBtn: HTMLElement | null;
    modeScaleBtn: HTMLElement | null;
}

export function formatSceneNumber(value: number) {
    return Number.isFinite(value) ? value.toFixed(2) : 'NaN';
}

export function getMarkerMode(type: string | undefined | null): 'aruco' | 'apriltag' {
    return (type || '').toLowerCase().includes('april') ? 'apriltag' : 'aruco';
}

export function clampInt(value: string | undefined, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(value || '', 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
}

export function clampNumber(value: string | undefined, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
}

export function clampFloors(value: string | undefined, fallback = 9) {
    return clampInt(value, fallback, 5, 20);
}

export function clampWindowFloor(value: string | undefined, maxFloor: number) {
    return clampInt(value, 1, 1, maxFloor);
}

export function fillDictionarySelect(selectEl: HTMLSelectElement | null, mode: 'aruco' | 'apriltag', value?: string) {
    if (!selectEl) return;
    const options = MARKER_DICTIONARY_OPTIONS[mode];
    selectEl.innerHTML = '';
    for (const option of options) {
        const opt = document.createElement('option');
        opt.value = option.id;
        opt.textContent = option.label;
        selectEl.appendChild(opt);
    }
    const fallback = mode === 'apriltag' ? DEFAULT_APRILTAG_DICTIONARY : DEFAULT_ARUCO_DICTIONARY;
    selectEl.value = value && options.some((option) => option.id === value) ? value : fallback;
}

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

export function isMarkerMapType(type: string) {
    return type === 'aruco-map' || type === 'apriltag-map';
}

export function isSingleMarkerType(type: string) {
    return type === 'aruco' || type === 'apriltag';
}

export function isBuildingType(type: string) {
    return type === 'building';
}

export function isValueInputType(type: string) {
    return isSingleMarkerType(type) || type === 'start-position' || type === 'building';
}

export function readAddMarkerMapOptions(elements: SceneManagerDomRefs): MarkerMapOptions {
    return readAddMarkerMapOptionsBase(elements, clampInt, clampNumber);
}

export function updateMapSummary(elements: SceneManagerDomRefs) {
    updateMapSummaryBase(elements, clampInt, clampNumber);
}

export function updateAddControlsState(elements: SceneManagerDomRefs) {
    updateAddControlsStateBase(elements, clampFloors, clampWindowFloor, clampInt, clampNumber);
}

export { getMapInputs, setBuildingControlsVisible, syncIncidentValue };

export function syncFloorLimit(floorsEl: HTMLInputElement | null, floorEl: HTMLInputElement | null) {
    syncFloorLimitBase(floorsEl, floorEl, clampFloors, clampWindowFloor);
}

export function clearIncidentEntries(incidentsEl: HTMLTextAreaElement | null, valueEl: HTMLInputElement | null) {
    clearIncidentEntriesBase(incidentsEl, valueEl);
}

export function appendIncidentEntry(
    incidentsEl: HTMLTextAreaElement | null,
    floorsEl: HTMLInputElement | null,
    floorEl: HTMLInputElement | null,
    faceEl: HTMLSelectElement | null,
    windowEl: HTMLSelectElement | null,
    kindEl: HTMLSelectElement | null,
    valueEl: HTMLInputElement | null
) {
    appendIncidentEntryBase(
        incidentsEl,
        floorsEl,
        floorEl,
        faceEl,
        windowEl,
        kindEl,
        valueEl,
        clampFloors,
        clampWindowFloor,
        clampInt
    );
}
