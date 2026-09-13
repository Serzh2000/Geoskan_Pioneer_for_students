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
    return clamp(Number(value) || 9, 5, 20);
}
