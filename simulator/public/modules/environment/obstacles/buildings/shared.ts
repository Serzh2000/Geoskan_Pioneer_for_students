import * as THREE from 'three';
import { clamp } from '../../../shared/math.js';

export type BuildingFace = 'front' | 'back';
export type WindowIncidentKind = 'smoke' | 'fire' | 'thief';

export interface BuildingWindowIncident {
    floor: number;
    face: BuildingFace;
    window: number;
    kind: WindowIncidentKind;
}

export interface BuildingWindowSlot {
    floor: number;
    face: BuildingFace;
    window: number;
    position: THREE.Vector3;
    outward: number;
}

export const WINDOW_COUNT_PER_FACE = 3;

export function clampBuildingFloors(value: unknown) {
    return clamp(Number(value) || 9, MIN_BUILDING_FLOORS, MAX_BUILDING_FLOORS);
}

export const BUILDING_WIDTH = 4.8;
export const BUILDING_DEPTH = 3.6;
export const BUILDING_FLOOR_HEIGHT = 0.72;
export const BUILDING_BASE_HEIGHT = 0.65;
export const MIN_BUILDING_FLOORS = 5;
export const MAX_BUILDING_FLOORS = 20;

/** A printed ArUco/AprilTag sheet lying flat in the middle of the roof. */
export interface BuildingRoofMarker {
    enabled: boolean;
    kind: 'ArUco' | 'AprilTag';
    dictionary?: string;
    id: string;
    /** Printed marker side, metres. */
    size: number;
}

/** Everything about a building besides its floors and window incidents. */
export interface BuildingConfig {
    bodyColor: number;
    roofMarker: BuildingRoofMarker;
}

export const DEFAULT_BUILDING_COLOR = 0xc8c4b8;

export function normalizeBuildingConfig(raw: Partial<BuildingConfig> = {}): BuildingConfig {
    const marker: Partial<BuildingRoofMarker> = raw.roofMarker ?? {};
    const size = Number(marker.size);
    const color = Number(raw.bodyColor);
    return {
        bodyColor: Number.isFinite(color) && color >= 0 && color <= 0xffffff ? Math.round(color) : DEFAULT_BUILDING_COLOR,
        roofMarker: {
            enabled: !!marker.enabled,
            kind: marker.kind === 'AprilTag' ? 'AprilTag' : 'ArUco',
            dictionary: marker.dictionary,
            id: String(Math.max(0, Math.round(Number(marker.id) || 0))),
            size: Number.isFinite(size) ? clamp(size, 0.3, 3) : 1.5
        }
    };
}
