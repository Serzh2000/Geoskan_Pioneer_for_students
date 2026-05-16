import {
    DEFAULT_APRILTAG_DICTIONARY,
    DEFAULT_ARUCO_DICTIONARY,
    MARKER_DICTIONARY_OPTIONS
} from '../../environment/obstacles/marker-dictionaries.js';
import type { MarkerMapOptions } from '../../environment/obstacles.js';

export interface SceneManagerDomRefs {
    listEl: HTMLElement | null;
    detailsEl: HTMLElement | null;
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

export function getMapInputs(elements: SceneManagerDomRefs) {
    return [
        elements.addMapRowsEl,
        elements.addMapColumnsEl,
        elements.addMapStartIdEl,
        elements.addMapIdStepEl,
        elements.addMapMarkerSizeEl,
        elements.addMapRotationEl,
        elements.addMapGapXEl,
        elements.addMapGapYEl,
        elements.addMapTraversalEl,
        elements.addMapStartCornerEl,
        elements.addMapAnchorEl,
        elements.addMapSnakeEl
    ].filter(Boolean) as Array<HTMLInputElement | HTMLSelectElement>;
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

function normalizeIncidentEntries(value: string | undefined) {
    return (value || '')
        .split(/\r?\n|;/)
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function serializeIncidentEntries(entries: string[]) {
    return entries.join('\n');
}

function getIncidentKey(entry: string) {
    const match = entry.match(/^(\d+)\s*:\s*(front|back|перед|зад)\s*:\s*(\d+)/i);
    if (!match) return entry.trim().toLowerCase();
    const faceRaw = match[2].toLowerCase();
    const face = faceRaw === 'перед' ? 'front' : faceRaw === 'зад' ? 'back' : faceRaw;
    return `${match[1]}:${face}:${match[3]}`;
}

export function syncIncidentValue(targetEl: HTMLInputElement | null, sourceEl: HTMLTextAreaElement | null) {
    if (!targetEl || !sourceEl) return;
    targetEl.value = serializeIncidentEntries(normalizeIncidentEntries(sourceEl.value));
}

export function syncFloorLimit(floorsEl: HTMLInputElement | null, floorEl: HTMLInputElement | null) {
    if (!floorsEl || !floorEl) return;
    const maxFloor = clampFloors(floorsEl.value, 9);
    floorsEl.value = String(maxFloor);
    floorEl.max = String(maxFloor);
    floorEl.value = String(clampWindowFloor(floorEl.value, maxFloor));
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
    if (!incidentsEl || !floorEl || !faceEl || !windowEl || !kindEl) return;
    const maxFloor = clampFloors(floorsEl?.value, 9);
    const floor = clampWindowFloor(floorEl.value, maxFloor);
    const face = faceEl.value === 'back' ? 'back' : 'front';
    const windowIndex = clampInt(windowEl.value, 1, 1, 3);
    const kind = kindEl.value === 'fire' || kindEl.value === 'thief' ? kindEl.value : 'smoke';
    floorEl.value = String(floor);
    const entry = `${floor}:${face}:${windowIndex}=${kind}`;
    const entries = normalizeIncidentEntries(incidentsEl.value).filter((item) => getIncidentKey(item) !== getIncidentKey(entry));
    entries.push(entry);
    incidentsEl.value = serializeIncidentEntries(entries);
    syncIncidentValue(valueEl, incidentsEl);
}

export function clearIncidentEntries(incidentsEl: HTMLTextAreaElement | null, valueEl: HTMLInputElement | null) {
    if (!incidentsEl) return;
    incidentsEl.value = '';
    syncIncidentValue(valueEl, incidentsEl);
}

export function setBuildingControlsVisible(
    visible: boolean,
    floorsWrapEl: HTMLLabelElement | null,
    floorsEl: HTMLInputElement | null,
    settingsEl: HTMLDivElement | null
) {
    if (floorsWrapEl) floorsWrapEl.style.display = visible ? 'flex' : 'none';
    if (floorsEl) floorsEl.disabled = !visible;
    if (settingsEl) settingsEl.classList.toggle('visible', visible);
}

export function readAddMarkerMapOptions(elements: SceneManagerDomRefs): MarkerMapOptions {
    return {
        rows: clampInt(elements.addMapRowsEl?.value, 5, 1, 20),
        columns: clampInt(elements.addMapColumnsEl?.value, 5, 1, 20),
        startId: clampInt(elements.addMapStartIdEl?.value, 0, 0, 100000),
        idStep: clampInt(elements.addMapIdStepEl?.value, 1, 1, 1000),
        markerSize: clampNumber(elements.addMapMarkerSizeEl?.value, 1.05, 0.2, 5),
        rotationDeg: clampNumber(elements.addMapRotationEl?.value, 0, -180, 180),
        gapX: clampNumber(elements.addMapGapXEl?.value, 0.2, 0, 10),
        gapY: clampNumber(elements.addMapGapYEl?.value, 0.2, 0, 10),
        traversal: elements.addMapTraversalEl?.value === 'column-major' ? 'column-major' : 'row-major',
        startCorner: (
            elements.addMapStartCornerEl?.value === 'top-right'
            || elements.addMapStartCornerEl?.value === 'bottom-left'
            || elements.addMapStartCornerEl?.value === 'bottom-right'
        ) ? elements.addMapStartCornerEl.value : 'top-left',
        anchor: (
            elements.addMapAnchorEl?.value === 'top-left'
            || elements.addMapAnchorEl?.value === 'top-right'
            || elements.addMapAnchorEl?.value === 'bottom-left'
            || elements.addMapAnchorEl?.value === 'bottom-right'
            || elements.addMapAnchorEl?.value === 'start'
        ) ? elements.addMapAnchorEl.value : 'center',
        snake: !!elements.addMapSnakeEl?.checked
    };
}

export function updateMapSummary(elements: SceneManagerDomRefs) {
    if (!elements.addMapSummaryEl) return;
    const options = readAddMarkerMapOptions(elements);
    const total = options.rows! * options.columns!;
    const firstId = options.startId!;
    const lastId = firstId + Math.max(0, total - 1) * options.idStep!;
    const traversalLabel = options.traversal === 'column-major' ? 'по столбцам' : 'по строкам';
    const cornerLabelMap = {
        'top-left': 'сверху слева',
        'top-right': 'сверху справа',
        'bottom-left': 'снизу слева',
        'bottom-right': 'снизу справа'
    } as const;
    elements.addMapSummaryEl.textContent =
        `${options.rows} x ${options.columns}, ID ${firstId}-${lastId}, ${traversalLabel}, `
        + `старт ${cornerLabelMap[options.startCorner as keyof typeof cornerLabelMap]}`
        + `${options.snake ? ', змейкой' : ''}`;
}

export function updateAddControlsState(elements: SceneManagerDomRefs) {
    if (!elements.addTypeEl || !elements.addValueEl || !elements.addPointsEl || !elements.addDictionaryEl) return;
    const type = elements.addTypeEl.value;
    const isSingleMarker = isSingleMarkerType(type);
    const needsValueInput = isValueInputType(type);
    const isMarkerMap = isMarkerMapType(type);
    const isBuilding = isBuildingType(type);
    const isMarker = isSingleMarker || isMarkerMap;
    const isPath = type === 'road' || type === 'rail';
    if (isMarker) fillDictionarySelect(elements.addDictionaryEl, getMarkerMode(type), elements.addDictionaryEl.value);
    elements.addDictionaryEl.disabled = !isMarker;
    elements.addDictionaryEl.style.display = isMarker ? 'block' : 'none';
    elements.addValueEl.disabled = !(needsValueInput && !isBuilding);
    elements.addValueEl.style.display = needsValueInput && !isBuilding ? 'block' : 'none';
    elements.addPointsEl.disabled = !isPath;
    elements.addValueEl.placeholder = isSingleMarker
        ? 'ID маркера'
        : type === 'building'
            ? 'Окна: 3:front:2=smoke; 5:back:1=fire; 7:front:3=thief'
            : type === 'start-position'
                ? 'Номер стартовой позиции'
                : 'Только для объектов с номером';
    elements.addPointsEl.placeholder = isPath
        ? 'Каждая строка: X, Y, Z\n0, 0, 0\n6, 0, 0\n10, 4, 0'
        : 'Только для дорог и путей';
    elements.addPointsEl.style.display = isPath ? 'block' : 'none';
    if (elements.addPathHintEl) {
        elements.addPathHintEl.style.display = isPath ? 'none' : 'block';
    }
    setBuildingControlsVisible(isBuilding, elements.addFloorsWrapEl, elements.addFloorsEl, elements.addBuildingSettingsEl);
    if (elements.addMapSettingsEl) elements.addMapSettingsEl.classList.toggle('visible', isMarkerMap);
    getMapInputs(elements).forEach((input) => {
        input.disabled = !isMarkerMap;
    });
    syncFloorLimit(elements.addFloorsEl, elements.addBuildingFloorEl);
    syncIncidentValue(elements.addValueEl, elements.addBuildingIncidentsEl);
    updateMapSummary(elements);
}
