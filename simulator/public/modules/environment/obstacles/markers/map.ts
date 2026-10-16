import * as THREE from 'three';
import { MARKER_DICTIONARIES, MarkerDictionaryId } from '../marker-dictionaries.js';
import { MarkerMapOptions, MarkerMapStartCorner } from '../types.js';
import { applyShadows, setCommonMeta } from '../utils.js';
import { createMarkerMeshForMap } from './object.js';
import {
    getDictionaryDefinition,
    MarkerKind,
    NormalizedMarkerMapOptions,
    normalizeMarkerMapOptions,
    SHEET_SIZE,
    SHEET_THICKNESS,
    SURFACE_EPSILON,
    wrapMarkerId
} from './shared.js';

function getAnchorPosition(
    options: NormalizedMarkerMapOptions,
    startCell: { row: number; column: number }
) {
    const width = (options.columns - 1) * (options.markerSize + options.gapX);
    const height = (options.rows - 1) * (options.markerSize + options.gapY);

    switch (options.anchor) {
        case 'top-left':
            return new THREE.Vector2(0, 0);
        case 'top-right':
            return new THREE.Vector2(width, 0);
        case 'bottom-left':
            return new THREE.Vector2(0, -height);
        case 'bottom-right':
            return new THREE.Vector2(width, -height);
        case 'start':
            return new THREE.Vector2(
                startCell.column * (options.markerSize + options.gapX),
                -startCell.row * (options.markerSize + options.gapY)
            );
        case 'center':
        default:
            return new THREE.Vector2(width * 0.5, -height * 0.5);
    }
}

function applyMarkerMapMetadata(
    group: THREE.Group,
    kind: MarkerKind,
    dictionaryId: MarkerDictionaryId,
    options: NormalizedMarkerMapOptions
) {
    const definition = MARKER_DICTIONARIES[dictionaryId];
    const count = options.rows * options.columns;
    const lastId = wrapMarkerId(options.startId + options.idStep * Math.max(0, count - 1), dictionaryId);
    const title = kind === 'AprilTag' ? 'AprilTag карта' : 'ArUco карта';
    const traversalLabel = options.traversal === 'column-major' ? 'по столбцам' : 'по строкам';
    const cornerLabels: Record<MarkerMapStartCorner, string> = {
        'top-left': 'сверху слева',
        'top-right': 'сверху справа',
        'bottom-left': 'снизу слева',
        'bottom-right': 'снизу справа'
    };

    group.name = `${title} ${options.rows}x${options.columns}`;
    group.userData = {
        ...group.userData,
        draggable: true,
        type: title,
        label: title,
        collidableRadius: Math.max(options.columns * (options.markerSize + options.gapX), options.rows * (options.markerSize + options.gapY)) * 0.6,
        isMarkerMap: true,
        markerMapKind: kind,
        markerMapConfig: { ...options },
        markerMapCount: count,
        markerMapStartId: options.startId,
        markerMapLastId: lastId,
        markerDictionary: dictionaryId,
        markerDictionaryLabel: definition.label,
        markerMapSummaryLines: [
            `Карта: ${options.rows} x ${options.columns} (${count} шт.)`,
            `ID: ${options.startId} -> ${lastId}, шаг ${options.idStep}`,
            `Словарь: ${definition.label}`,
            `Порядок: ${traversalLabel}, старт ${cornerLabels[options.startCorner]}${options.snake ? ', змейка' : ''}`,
            `Шаг сетки: ${(options.markerSize + options.gapX).toFixed(2)} x ${(options.markerSize + options.gapY).toFixed(2)} м`,
            `Размер маркера: ${options.markerSize.toFixed(2)} м, поворот: ${options.rotationDeg.toFixed(0)}°`
        ]
    };
}

function createMarkerMapMesh(kind: MarkerKind, dictionaryId?: string, options?: MarkerMapOptions) {
    const { dictionaryId: normalizedDictionaryId } = getDictionaryDefinition(kind, dictionaryId);
    const normalizedOptions = normalizeMarkerMapOptions(options);
    const title = kind === 'AprilTag' ? 'AprilTag карта' : 'ArUco карта';
    const group = setCommonMeta(new THREE.Group(), title, {
        isMarkerMap: true,
        supportsValue: false,
        supportsMarkerDictionary: false
    });

    const horizontalFromLeft = normalizedOptions.startCorner === 'top-left' || normalizedOptions.startCorner === 'bottom-left';
    const verticalFromTop = normalizedOptions.startCorner === 'top-left' || normalizedOptions.startCorner === 'top-right';
    const startCell = {
        row: verticalFromTop ? 0 : normalizedOptions.rows - 1,
        column: horizontalFromLeft ? 0 : normalizedOptions.columns - 1
    };
    const anchor = getAnchorPosition(normalizedOptions, startCell);
    const scaleFactor = normalizedOptions.markerSize / SHEET_SIZE;

    let index = 0;
    const outerCount = normalizedOptions.traversal === 'column-major' ? normalizedOptions.columns : normalizedOptions.rows;
    const innerCount = normalizedOptions.traversal === 'column-major' ? normalizedOptions.rows : normalizedOptions.columns;

    for (let outer = 0; outer < outerCount; outer++) {
        const reverseLine = normalizedOptions.snake && outer % 2 === 1;
        for (let inner = 0; inner < innerCount; inner++) {
            const logicalInner = reverseLine ? innerCount - 1 - inner : inner;
            const logicalRow = normalizedOptions.traversal === 'column-major' ? logicalInner : outer;
            const logicalColumn = normalizedOptions.traversal === 'column-major' ? outer : logicalInner;
            const row = verticalFromTop ? logicalRow : normalizedOptions.rows - 1 - logicalRow;
            const column = horizontalFromLeft ? logicalColumn : normalizedOptions.columns - 1 - logicalColumn;
            const markerId = wrapMarkerId(normalizedOptions.startId + normalizedOptions.idStep * index, normalizedDictionaryId);
            const marker = createMarkerMeshForMap(kind, String(markerId), normalizedDictionaryId);
            marker.position.set(
                column * (normalizedOptions.markerSize + normalizedOptions.gapX) - anchor.x,
                -row * (normalizedOptions.markerSize + normalizedOptions.gapY) - anchor.y,
                SHEET_THICKNESS * 0.5 * scaleFactor + SURFACE_EPSILON
            );
            marker.scale.setScalar(scaleFactor);
            marker.userData.draggable = false;
            marker.userData.partOfMarkerMap = true;
            group.add(marker);
            index++;
        }
    }

    group.rotation.z = THREE.MathUtils.degToRad(normalizedOptions.rotationDeg);
    applyMarkerMapMetadata(group, kind, normalizedDictionaryId, normalizedOptions);
    applyShadows(group);
    return group;
}

export function createArucoMarkerMapMesh(dictionaryId?: string, options?: MarkerMapOptions) {
    return createMarkerMapMesh('ArUco', dictionaryId, options);
}

export function createAprilTagMarkerMapMesh(dictionaryId?: string, options?: MarkerMapOptions) {
    return createMarkerMapMesh('AprilTag', dictionaryId, options);
}

/*
 * Rebuilds an existing marker map in place with new settings: the markers
 * inside are regenerated, while the group itself - its id, position, the
 * rotation the user gave it with the gizmo, its parent - stays untouched.
 * Rotation therefore isn't a setting here; the stored rotationDeg is kept.
 */
export function updateMarkerMapSettings(
    object: THREE.Object3D,
    params: { dictionaryId?: string; options?: MarkerMapOptions }
) {
    const group = object as THREE.Group;
    if (!group.userData?.isMarkerMap) return false;

    const kind: MarkerKind = group.userData.markerMapKind === 'AprilTag' ? 'AprilTag' : 'ArUco';
    const previous = (group.userData.markerMapConfig || {}) as MarkerMapOptions;
    const fresh = createMarkerMapMesh(
        kind,
        params.dictionaryId || String(group.userData.markerDictionary || ''),
        { ...previous, ...params.options, rotationDeg: previous.rotationDeg }
    );

    for (const child of [...group.children]) {
        if (!child.userData?.partOfMarkerMap) continue;
        group.remove(child);
        child.traverse((node) => (node as THREE.Mesh).geometry?.dispose?.());
    }
    for (const child of [...fresh.children]) group.add(child);

    group.name = fresh.name;
    group.userData = { ...group.userData, ...fresh.userData };
    return true;
}
