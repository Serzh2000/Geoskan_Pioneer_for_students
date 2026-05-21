import {
    DEFAULT_APRILTAG_DICTIONARY,
    DEFAULT_ARUCO_DICTIONARY,
    MARKER_DICTIONARY_OPTIONS
} from '../../environment/obstacles/marker-dictionaries.js';
import type { MarkerMapOptions } from '../../environment/obstacles.js';
import { parsePointsText } from '../../scene/objects/object-catalog.js';
import type { SceneManagerDomRefs } from './types.js';

type SceneTypePreviewConfig = {
    title: string;
    description: string;
    accent: 'route' | 'marker' | 'structure' | 'terrain' | 'service';
    icon: string;
};

export type AddSceneObjectDraft = {
    type: string;
    options: {
        value?: string;
        markerDictionary?: string;
        pointsText?: string;
        floors?: number;
        markerMap?: MarkerMapOptions;
    };
};

const DEFAULT_TYPE_PREVIEW: SceneTypePreviewConfig = {
    title: 'Объект сцены',
    description: 'Базовый объект полигона для размещения в сцене.',
    accent: 'structure',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5"/><path d="M12 12v9"/></svg>'
};

const TYPE_PREVIEW_CONFIG: Record<string, SceneTypePreviewConfig> = {
    gate: {
        title: 'Ворота',
        description: 'Ориентир и пролётная рамка для трасс и учебных миссий.',
        accent: 'structure',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 20V6h14v14"/><path d="M8 20V9h8v11"/></svg>'
    },
    pylon: {
        title: 'Пилон',
        description: 'Вертикальный ориентир для слалома, облёта и трасс.',
        accent: 'structure',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 4v13"/><path d="M8 20h8"/><path d="M9 7h6"/></svg>'
    },
    aruco: {
        title: 'ArUco маркер',
        description: 'Одиночный маркер с ID и выбором словаря ArUco.',
        accent: 'marker',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h3v3H8zM13 8h3M8 13h3M13 13h3v3h-3z"/></svg>'
    },
    'aruco-map': {
        title: 'ArUco карта',
        description: 'Сетка из маркеров ArUco с настройкой размеров, ID и обхода.',
        accent: 'marker',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 4h16v16H4z"/><path d="M4 10h16M10 4v16"/></svg>'
    },
    apriltag: {
        title: 'AprilTag маркер',
        description: 'Одиночный AprilTag для компьютерного зрения и навигации.',
        accent: 'marker',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h2v2H8zM14 8h2v2h-2zM8 14h2v2H8zM14 14h2v2h-2z"/></svg>'
    },
    'apriltag-map': {
        title: 'AprilTag карта',
        description: 'Карта из AprilTag маркеров с сеткой и параметрами раскладки.',
        accent: 'marker',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 4h16v16H4z"/><path d="M4 10h16M10 4v16"/><path d="M14 14h2v2h-2z"/></svg>'
    },
    road: {
        title: 'Автомобильная дорога',
        description: 'Линейный маршрут с редактируемыми точками и визуальной прокладкой.',
        accent: 'route',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 19c3.5-5 10.5-5 14-10"/><path d="M10 15h.01M14 11h.01"/></svg>'
    },
    rail: {
        title: 'Железнодорожные пути',
        description: 'Линейный маршрут для рельсовых объектов и длинных траекторий.',
        accent: 'route',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 5v14M18 5v14"/><path d="M6 8h12M6 12h12M6 16h12"/></svg>'
    },
    building: {
        title: 'Многоэтажка',
        description: 'Здание с этажностью и сценариями по окнам для задач поиска и спасения.',
        accent: 'structure',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 21V5h12v16"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M11 21v-4h2v4"/></svg>'
    },
    hill: {
        title: 'Холм',
        description: 'Рельефный объект для высотных ограничений и визуального ориентирования.',
        accent: 'terrain',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 18c2.5-2.5 4-6 6-6s3.5 3 5 3 2.5-1 7-6"/><path d="M3 18h18"/></svg>'
    },
    'start-position': {
        title: 'Стартовая позиция',
        description: 'Точка старта с номером, удобная для сценариев и пресетов.',
        accent: 'service',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 4v16"/><path d="M6 5h9l-2 4 2 4H6"/></svg>'
    },
    heliport: {
        title: 'Хелипорт',
        description: 'Посадочная площадка для ориентирования и сценариев взлёта/посадки.',
        accent: 'service',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M9 8v8M15 8v8M9 12h6"/></svg>'
    }
};

export function formatSceneNumber(value: number) {
    return Number.isFinite(value) ? value.toFixed(2) : 'NaN';
}

function setFieldVisibility(fieldEl: HTMLElement | null, visible: boolean) {
    if (!fieldEl) return;
    fieldEl.style.display = visible ? '' : 'none';
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

export function getSceneTypePreviewConfig(type: string, optionLabel?: string): SceneTypePreviewConfig {
    return TYPE_PREVIEW_CONFIG[type] || {
        ...DEFAULT_TYPE_PREVIEW,
        title: optionLabel || DEFAULT_TYPE_PREVIEW.title
    };
}

export function updateAddTypePreview(elements: SceneManagerDomRefs) {
    if (!elements.addTypeEl || !elements.addTypeCurrentEl) return;
    const optionLabel = elements.addTypeEl.selectedOptions[0]?.textContent?.trim() || DEFAULT_TYPE_PREVIEW.title;
    const preview = getSceneTypePreviewConfig(elements.addTypeEl.value, optionLabel);
    elements.addTypeCurrentEl.textContent = optionLabel;
    if (elements.addTypeSelectionCardEl) {
        elements.addTypeSelectionCardEl.dataset.accent = preview.accent;
    }
    if (elements.addTypeCurrentTextEl) {
        elements.addTypeCurrentTextEl.textContent = preview.description;
    }
    if (elements.addTypeCurrentIconEl) {
        elements.addTypeCurrentIconEl.innerHTML = preview.icon;
    }
}

export function readAddSceneObjectDraft(elements: SceneManagerDomRefs): AddSceneObjectDraft {
    const type = elements.addTypeEl?.value || '';
    const isBuilding = isBuildingType(type);
    const needsValueInput = isValueInputType(type);
    const pointsText = elements.addPointsEl?.value.trim() || undefined;
    const parsedPoints = pointsText ? parsePointsText(pointsText) : [];

    return {
        type,
        options: {
            markerDictionary: (isSingleMarkerType(type) || isMarkerMapType(type))
                ? elements.addDictionaryEl?.value || undefined
                : undefined,
            value: isBuilding
                ? elements.addBuildingIncidentsEl?.value.trim() || undefined
                : needsValueInput
                    ? elements.addValueEl?.value.trim() || undefined
                    : undefined,
            pointsText: parsedPoints.length ? pointsText : undefined,
            floors: isBuilding ? clampFloors(elements.addFloorsEl?.value, 9) : undefined,
            markerMap: isMarkerMapType(type) ? readAddMarkerMapOptions(elements) : undefined
        }
    };
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
    setFieldVisibility(elements.addDictionaryWrapEl, isMarker);
    elements.addValueEl.disabled = !(needsValueInput && !isBuilding);
    setFieldVisibility(elements.addValueWrapEl, needsValueInput && !isBuilding);
    elements.addPointsEl.disabled = !isPath;
    setFieldVisibility(elements.addPointsWrapEl, isPath);
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
    setBuildingControlsVisible(isBuilding, elements.addFloorsWrapEl, elements.addFloorsEl, elements.addBuildingSettingsEl);
    if (elements.addMapSettingsEl) elements.addMapSettingsEl.classList.toggle('visible', isMarkerMap);
    getMapInputs(elements).forEach((input) => {
        input.disabled = !isMarkerMap;
    });
    syncFloorLimit(elements.addFloorsEl, elements.addBuildingFloorEl);
    syncIncidentValue(elements.addValueEl, elements.addBuildingIncidentsEl);
    updateMapSummary(elements);
    updateAddTypePreview(elements);
}
