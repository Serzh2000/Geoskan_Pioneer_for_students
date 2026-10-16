import * as THREE from 'three';
import { envGroup } from '../../environment/index.js';
import { snapMarkerToSurface } from '../../environment/obstacles.js';
import { transformControl } from '../core/scene-init.js';
import {
    ROTATION_SNAP_DEGREES,
    applyFlatObjectDepthOffset,
    collectGroundSurfaces,
    isGridSnapActive,
    keepObjectBottomAboveSurface,
    sampleSurfaceZ,
    seatObjectBottomOnSurface,
    softSnapPlanarPoint
} from './placement-geometry.js';

/*
 * Runtime side of object placement: the "Привязка к сетке" switch (kept in
 * localStorage), the Shift "free move" modifier, and seating objects on the
 * ground / training relief. Rules themselves live in placement-geometry.ts.
 */

export const GRID_SNAP_STORAGE_KEY = 'pioneer.scene.gridSnap';

function readStoredSnap(): boolean {
    try {
        return localStorage.getItem(GRID_SNAP_STORAGE_KEY) !== 'off';
    } catch {
        return true;
    }
}

let gridSnapEnabled = typeof window === 'undefined' ? true : readStoredSnap();
let shiftHeld = false;
const listeners = new Set<(enabled: boolean) => void>();

export function isGridSnapEnabled(): boolean {
    return gridSnapEnabled;
}

/** Whether a placement/drag should snap now. `shiftKey` from the event wins over the tracked key state. */
export function shouldSnapToGrid(shiftKey?: boolean): boolean {
    return isGridSnapActive(gridSnapEnabled, shiftKey ?? shiftHeld);
}

/** The gizmo's 15° rotation step follows the switch and Shift, like translation. */
export function syncGizmoRotationSnap() {
    if (!transformControl) return;
    const wanted = transformControl.getMode() === 'rotate' && shouldSnapToGrid()
        ? THREE.MathUtils.degToRad(ROTATION_SNAP_DEGREES)
        : null;
    if (transformControl.rotationSnap !== wanted) transformControl.setRotationSnap(wanted);
}

export function setGridSnapEnabled(enabled: boolean) {
    gridSnapEnabled = enabled;
    try {
        localStorage.setItem(GRID_SNAP_STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
        // Private mode / blocked storage: the switch still works for this session.
    }
    syncGizmoRotationSnap();
    listeners.forEach((listener) => listener(enabled));
}

function setShiftHeld(held: boolean) {
    if (shiftHeld === held) return;
    shiftHeld = held;
    syncGizmoRotationSnap();
}

// Tests run the simulator with a bare `window` stub, so check for real event support.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    // TransformControls' change events carry no modifiers - track Shift here.
    window.addEventListener('keydown', (event) => { if (event.key === 'Shift') setShiftHeld(true); }, true);
    window.addEventListener('keyup', (event) => { if (event.key === 'Shift') setShiftHeld(false); }, true);
    window.addEventListener('pointermove', (event) => setShiftHeld(event.shiftKey), { capture: true, passive: true });
    window.addEventListener('pointerdown', (event) => setShiftHeld(event.shiftKey), { capture: true, passive: true });
    window.addEventListener('blur', () => setShiftHeld(false));
}

/** Wires a pk-toggle checkbox to the switch; several inputs stay in sync. */
export function bindGridSnapToggle(input: HTMLInputElement | null) {
    if (!input) return;
    input.checked = gridSnapEnabled;
    input.addEventListener('change', () => setGridSnapEnabled(input.checked));
    listeners.add((enabled) => { input.checked = enabled; });
}

export function snapPointToGrid(point: { x: number; y: number }, shiftKey?: boolean) {
    return softSnapPlanarPoint(point, shouldSnapToGrid(shiftKey));
}

/** Highest ground/relief height under (x, y). */
export function groundSurfaceZAt(x: number, y: number, exclude?: THREE.Object3D | null): number {
    return sampleSurfaceZ(collectGroundSurfaces(envGroup?.children ?? []), x, y, exclude);
}

/** X/Y extent of the object's bounding box around its pivot, for sampling the surface under the whole footprint. */
export type Footprint = { minDx: number; maxDx: number; minDy: number; maxDy: number };

export function measureFootprint(object: THREE.Object3D): Footprint {
    object.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(object);
    const pivot = object.getWorldPosition(new THREE.Vector3());
    if (box.isEmpty()) return { minDx: 0, maxDx: 0, minDy: 0, maxDy: 0 };
    return { minDx: box.min.x - pivot.x, maxDx: box.max.x - pivot.x, minDy: box.min.y - pivot.y, maxDy: box.max.y - pivot.y };
}

/**
 * Highest surface under the footprint (centre and four corners): on a slope
 * the object stands on the uphill side instead of cutting into the hill.
 */
export function groundSurfaceZUnder(x: number, y: number, footprint: Footprint, exclude?: THREE.Object3D | null): number {
    const surfaces = collectGroundSurfaces(envGroup?.children ?? []);
    let best = sampleSurfaceZ(surfaces, x, y, exclude);
    for (const dx of [footprint.minDx, footprint.maxDx]) {
        for (const dy of [footprint.minDy, footprint.maxDy]) {
            best = Math.max(best, sampleSurfaceZ(surfaces, x + dx, y + dy, exclude));
        }
    }
    return best;
}

export function isMarkerSceneObject(object: THREE.Object3D) {
    return object.userData?.markerKind === 'ArUco' || object.userData?.markerKind === 'AprilTag';
}

/**
 * Simple props stand on the ground. Training maps and presets carry their own
 * terrain, roads/rails are laid point by point, vehicles ride their route and
 * groups keep the arrangement they were made with.
 */
export function isSurfaceSeatable(object: THREE.Object3D | null | undefined): object is THREE.Object3D {
    if (!object || !object.userData?.draggable) return false;
    const data = object.userData;
    return !data.presetName && !data.supportsPoints && !data.vehicle && data.type !== 'group';
}

/** A marker lying flat must not sink into the training relief (snapMarkerToSurface only knows the z = 0 plane). */
export function keepMarkerAboveGround(marker: THREE.Object3D) {
    const normal = marker.userData?.surfaceNormal;
    if (normal && normal.z < 0.9) return false;
    const position = marker.getWorldPosition(new THREE.Vector3());
    return keepObjectBottomAboveSurface(marker, groundSurfaceZAt(position.x, position.y, marker));
}

/** Bottom of the object onto the surface under its current X/Y. */
export function seatOnGround(object: THREE.Object3D) {
    if (isMarkerSceneObject(object)) {
        snapMarkerToSurface(object, envGroup?.children ?? []);
        keepMarkerAboveGround(object);
        return;
    }
    const position = object.getWorldPosition(new THREE.Vector3());
    seatObjectBottomOnSurface(object, groundSurfaceZUnder(position.x, position.y, measureFootprint(object), object));
}

/**
 * Final placement of a just-created object: X/Y (snapped unless switched
 * off or Shift is held), bottom on the surface, flat objects depth-offset.
 */
export function placeNewObject(object: THREE.Object3D, point: { x: number; y: number } | null, shiftKey?: boolean) {
    if (!isSurfaceSeatable(object)) return;
    const target = snapPointToGrid(point ?? object.position, shiftKey);
    object.position.x = target.x;
    object.position.y = target.y;
    object.updateMatrixWorld(true);
    seatOnGround(object);
    applyFlatObjectDepthOffset(object);
}
