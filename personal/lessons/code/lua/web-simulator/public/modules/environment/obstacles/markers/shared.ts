import * as THREE from 'three';
import {
    DEFAULT_APRILTAG_DICTIONARY,
    DEFAULT_ARUCO_DICTIONARY,
    MARKER_DICTIONARIES,
    MARKER_DICTIONARY_OPTIONS,
    MarkerDictionaryId
} from '../marker-dictionaries.js';
import {
    MarkerMapAnchor,
    MarkerMapOptions,
    MarkerMapStartCorner,
    MarkerMapTraversal
} from '../types.js';
import { clamp } from '../../../shared/math.js';

export const MARKER_CANVAS_SIZE = 1024;
export const SHEET_SIZE = 1.05;
export const SHEET_THICKNESS = 0.018;
export const MARKER_SHEET_NAME = 'marker-sheet';
export const MARKER_LOCAL_NORMAL = new THREE.Vector3(0, 0, 1);
export const SURFACE_EPSILON = 0.0005;
export const DEFAULT_MARKER_MAP_OPTIONS = {
    rows: 5,
    columns: 5,
    startId: 0,
    idStep: 1,
    markerSize: SHEET_SIZE,
    gapX: 0.2,
    gapY: 0.2,
    traversal: 'row-major' as MarkerMapTraversal,
    startCorner: 'top-left' as MarkerMapStartCorner,
    anchor: 'center' as MarkerMapAnchor,
    snake: false,
    rotationDeg: 0
};

export type MarkerKind = 'ArUco' | 'AprilTag';

export interface NormalizedMarkerMapOptions {
    rows: number;
    columns: number;
    startId: number;
    idStep: number;
    markerSize: number;
    gapX: number;
    gapY: number;
    traversal: MarkerMapTraversal;
    startCorner: MarkerMapStartCorner;
    anchor: MarkerMapAnchor;
    snake: boolean;
    rotationDeg: number;
}

export interface MarkerSurfaceCandidate {
    anchor: THREE.Vector3;
    normal: THREE.Vector3;
    score: number;
}

function parseMarkerId(value: string) {
    const parsed = Number.parseInt(value || '0', 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function getMarkerKindKey(kind: MarkerKind) {
    return kind === 'AprilTag' ? 'apriltag' : 'aruco';
}

function getDefaultDictionary(kind: MarkerKind): MarkerDictionaryId {
    return (kind === 'AprilTag' ? DEFAULT_APRILTAG_DICTIONARY : DEFAULT_ARUCO_DICTIONARY) as MarkerDictionaryId;
}

export function getMarkerDictionaryOptions(kind: 'aruco' | 'apriltag') {
    return [...MARKER_DICTIONARY_OPTIONS[kind]];
}

export function normalizeMarkerDictionaryId(kind: MarkerKind, dictionaryId?: string): MarkerDictionaryId {
    if (dictionaryId && dictionaryId in MARKER_DICTIONARIES) {
        const normalized = dictionaryId as MarkerDictionaryId;
        if (MARKER_DICTIONARIES[normalized].kind === getMarkerKindKey(kind)) return normalized;
    }
    return getDefaultDictionary(kind);
}

export function getDictionaryDefinition(kind: MarkerKind, dictionaryId?: string) {
    const normalizedId = normalizeMarkerDictionaryId(kind, dictionaryId);
    return {
        dictionaryId: normalizedId,
        definition: MARKER_DICTIONARIES[normalizedId]
    };
}

export function normalizeMarkerValue(kind: MarkerKind, dictionaryId: MarkerDictionaryId, value: string) {
    const definition = MARKER_DICTIONARIES[dictionaryId];
    const parsed = parseMarkerId(value);
    const clamped = Math.min(parsed, definition.markerCount - 1);
    return String(clamped);
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return clamp(parsed, min, max);
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return clamp(parsed, min, max);
}

export function wrapMarkerId(markerId: number, dictionaryId: MarkerDictionaryId) {
    const count = MARKER_DICTIONARIES[dictionaryId].markerCount;
    if (count <= 0) return 0;
    return ((markerId % count) + count) % count;
}

export function normalizeMarkerMapOptions(options: MarkerMapOptions | undefined): NormalizedMarkerMapOptions {
    const traversal = options?.traversal === 'column-major' ? 'column-major' : DEFAULT_MARKER_MAP_OPTIONS.traversal;
    const startCorner = (
        options?.startCorner === 'top-right'
        || options?.startCorner === 'bottom-left'
        || options?.startCorner === 'bottom-right'
    ) ? options.startCorner : DEFAULT_MARKER_MAP_OPTIONS.startCorner;
    const anchor = (
        options?.anchor === 'top-left'
        || options?.anchor === 'top-right'
        || options?.anchor === 'bottom-left'
        || options?.anchor === 'bottom-right'
        || options?.anchor === 'start'
    ) ? options.anchor : DEFAULT_MARKER_MAP_OPTIONS.anchor;

    return {
        rows: clampInt(options?.rows, DEFAULT_MARKER_MAP_OPTIONS.rows, 1, 20),
        columns: clampInt(options?.columns, DEFAULT_MARKER_MAP_OPTIONS.columns, 1, 20),
        startId: clampInt(options?.startId, DEFAULT_MARKER_MAP_OPTIONS.startId, 0, 100000),
        idStep: clampInt(options?.idStep, DEFAULT_MARKER_MAP_OPTIONS.idStep, 1, 1000),
        markerSize: clampNumber(options?.markerSize, DEFAULT_MARKER_MAP_OPTIONS.markerSize, 0.2, 5),
        gapX: clampNumber(options?.gapX, DEFAULT_MARKER_MAP_OPTIONS.gapX, 0, 10),
        gapY: clampNumber(options?.gapY, DEFAULT_MARKER_MAP_OPTIONS.gapY, 0, 10),
        traversal,
        startCorner,
        anchor,
        snake: !!options?.snake,
        rotationDeg: clampNumber(options?.rotationDeg, DEFAULT_MARKER_MAP_OPTIONS.rotationDeg, -180, 180)
    };
}
