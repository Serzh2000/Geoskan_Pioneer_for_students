import type { MarkerMapOptions } from '../../../environment/obstacles.js';
import type { SceneManagerDomRefs } from '../support.js';
import {
    fillDictionarySelect,
    getMarkerMode,
    isBuildingType,
    isMarkerMapType,
    isSingleMarkerType,
    isValueInputType
} from '../support.js';
import { setBuildingControlsVisible, syncFloorLimit, syncIncidentValue } from './building.js';

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

export function readAddMarkerMapOptions(
    elements: SceneManagerDomRefs,
    clampInt: (value: string | undefined, fallback: number, min: number, max: number) => number,
    clampNumber: (value: string | undefined, fallback: number, min: number, max: number) => number
): MarkerMapOptions {
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

export function updateMapSummary(
    elements: SceneManagerDomRefs,
    clampInt: (value: string | undefined, fallback: number, min: number, max: number) => number,
    clampNumber: (value: string | undefined, fallback: number, min: number, max: number) => number
) {
    if (!elements.addMapSummaryEl) return;
    const options = readAddMarkerMapOptions(elements, clampInt, clampNumber);
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

export function updateAddControlsState(
    elements: SceneManagerDomRefs,
    clampFloors: (value: string | undefined, fallback?: number) => number,
    clampWindowFloor: (value: string | undefined, maxFloor: number) => number,
    clampInt: (value: string | undefined, fallback: number, min: number, max: number) => number,
    clampNumber: (value: string | undefined, fallback: number, min: number, max: number) => number
) {
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
        elements.addPathHintEl.style.display = isPath ? 'block' : 'none';
    }
    setBuildingControlsVisible(isBuilding, elements.addFloorsWrapEl, elements.addFloorsEl, elements.addBuildingSettingsEl);
    if (elements.addMapSettingsEl) elements.addMapSettingsEl.classList.toggle('visible', isMarkerMap);
    getMapInputs(elements).forEach((input) => {
        input.disabled = !isMarkerMap;
    });
    syncFloorLimit(elements.addFloorsEl, elements.addBuildingFloorEl, clampFloors, clampWindowFloor);
    syncIncidentValue(elements.addValueEl, elements.addBuildingIncidentsEl);
    updateMapSummary(elements, clampInt, clampNumber);
}
