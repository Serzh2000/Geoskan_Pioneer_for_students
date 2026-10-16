import * as THREE from 'three';
import { OBJECT_TYPE } from '../../shared/object-types.js';

/*
 * Pure placement rules shared by the hotbar, the scene manager's "add" and
 * the gizmo: grid snapping and "the bottom of the object stands on the
 * surface". No scene singletons here, so the rules are unit-testable
 * (tests/scene-placement.test.ts); the runtime wiring is in placement.ts.
 */

/** The ground texture draws a 1 m calibration grid (environment/ground/textures.ts). */
export const GRID_SNAP_STEP = 1;
/**
 * Grid magnetism: an object is pulled onto a grid line only when it is this close (metres) to it. Farther away it
 * stays exactly where the user put it, so the grid is a hint, not a cage.
 */
export const GRID_SNAP_PULL = 0.2;
/** Same step as the gizmo's rotation snap and the inspector's ±15° buttons. */
export const ROTATION_SNAP_DEGREES = 15;
/**
 * Zero-thickness decals (landing/start pads) hover this high above the
 * surface - the lift createStyledLandingPad authors, which addObjectToScene
 * used to overwrite with z = 0 (coplanar with the ground: z-fighting).
 */
export const FLAT_DECAL_LIFT = 0.025;
/** Anything thinner than this is a decal, not a solid. */
export const FLAT_DECAL_MAX_THICKNESS = 0.005;
/** Objects up to this tall (pads, marker sheets, marker maps) get a depth offset against the ground. */
export const FLAT_OBJECT_MAX_HEIGHT = 0.05;
/** An object whose bottom is this close to where it would be seated counts as standing on the surface. */
export const RESTING_TOLERANCE = 0.03;

/** Snapping is on unless switched off or the free-move modifier (Shift) is held. */
export function isGridSnapActive(enabled: boolean, freeModifierHeld: boolean): boolean {
    return enabled && !freeModifierHeld;
}

/** Nearest grid node coordinate; float noise and -0 are cleaned up so 2.9999999 reads as 3. */
export function snapToGrid(value: number, step = GRID_SNAP_STEP): number {
    if (!Number.isFinite(value) || !(step > 0)) return value;
    const snapped = Number((Math.round(value / step) * step).toFixed(6));
    return snapped === 0 ? 0 : snapped;
}

/** Nearest grid line when within `pull` of it, otherwise the value untouched. */
export function snapToGridSoft(value: number, step = GRID_SNAP_STEP, pull = GRID_SNAP_PULL): number {
    if (!Number.isFinite(value) || !(step > 0)) return value;
    const nearest = snapToGrid(value, step);
    return Math.abs(value - nearest) <= pull + 1e-9 ? nearest : value;
}

/** Each of X and Y is pulled onto its own grid line independently when close; the height is never touched. */
export function softSnapPlanarPoint(point: { x: number; y: number }, active: boolean, step = GRID_SNAP_STEP, pull = GRID_SNAP_PULL): { x: number; y: number } {
    if (!active) return { x: point.x, y: point.y };
    return { x: snapToGridSoft(point.x, step, pull), y: snapToGridSoft(point.y, step, pull) };
}

/** X/Y to the nearest grid node when `active`; the height is never snapped. */
export function snapPlanarPoint(point: { x: number; y: number }, active: boolean, step = GRID_SNAP_STEP): { x: number; y: number } {
    if (!active) return { x: point.x, y: point.y };
    return { x: snapToGrid(point.x, step), y: snapToGrid(point.y, step) };
}

export function snapAngleRadians(angle: number, active: boolean, stepDegrees = ROTATION_SNAP_DEGREES): number {
    if (!active || !(stepDegrees > 0)) return angle;
    const step = THREE.MathUtils.degToRad(stepDegrees);
    return Math.round(angle / step) * step;
}

/**
 * Pivot height that puts the object's bounding-box bottom on `surfaceZ`.
 * Models whose pivot is not at their base (a marker sheet is centred on its
 * origin) come out right as well; flat decals keep their small lift.
 */
export function seatedPivotZ(pivotZ: number, bottomZ: number, topZ: number, surfaceZ: number): number {
    const lift = topZ - bottomZ <= FLAT_DECAL_MAX_THICKNESS ? FLAT_DECAL_LIFT : 0;
    return pivotZ + (surfaceZ - bottomZ) + lift;
}

/** Pivot height that keeps the bottom from going below `surfaceZ` - raising never lowers. */
export function pivotZAboveSurface(pivotZ: number, bottomZ: number, surfaceZ: number): number {
    return bottomZ < surfaceZ ? pivotZ + (surfaceZ - bottomZ) : pivotZ;
}

export function isRestingOnSurface(pivotZ: number, bottomZ: number, topZ: number, surfaceZ: number): boolean {
    return Math.abs(seatedPivotZ(pivotZ, bottomZ, topZ, surfaceZ) - pivotZ) <= RESTING_TOLERANCE;
}

/** World-space vertical extent of an object, or null for an empty one. */
export function verticalExtent(object: THREE.Object3D): { bottom: number; top: number } | null {
    object.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return null;
    return { bottom: box.min.z, top: box.max.z };
}

/** Moves the object up/down by `deltaZ` world metres, whatever its parent's transform. */
function shiftWorldZ(object: THREE.Object3D, deltaZ: number) {
    if (deltaZ === 0) return;
    const world = object.getWorldPosition(new THREE.Vector3());
    world.z += deltaZ;
    if (object.parent) object.parent.worldToLocal(world);
    object.position.copy(world);
    object.updateMatrixWorld(true);
}

/** Puts the bounding-box bottom on `surfaceZ` (decals slightly above it). Returns false for empty objects. */
export function seatObjectBottomOnSurface(object: THREE.Object3D, surfaceZ: number): boolean {
    const extent = verticalExtent(object);
    if (!extent) return false;
    const worldZ = object.getWorldPosition(new THREE.Vector3()).z;
    shiftWorldZ(object, seatedPivotZ(worldZ, extent.bottom, extent.top, surfaceZ) - worldZ);
    return true;
}

/** Raises the object only if its bottom is below `surfaceZ`. */
export function keepObjectBottomAboveSurface(object: THREE.Object3D, surfaceZ: number): boolean {
    const extent = verticalExtent(object);
    if (!extent || extent.bottom >= surfaceZ) return false;
    shiftWorldZ(object, surfaceZ - extent.bottom);
    return true;
}

/**
 * The surfaces things stand on: the base ground plane (its own mesh only -
 * the arena accent, H pad and border strips parented to it are decoration)
 * and the relief mesh of a loaded training map.
 */
export function collectGroundSurfaces(roots: readonly THREE.Object3D[]): THREE.Object3D[] {
    const surfaces: THREE.Object3D[] = [];
    for (const root of roots) {
        if (root.userData?.type === OBJECT_TYPE.GROUND) surfaces.push(root);
        for (const child of root.children) {
            if (child.userData?.trainingGround && child.visible && root.visible) surfaces.push(child);
        }
    }
    return surfaces;
}

const downRay = new THREE.Raycaster();
const rayOrigin = new THREE.Vector3();
const rayDown = new THREE.Vector3(0, 0, -1);

function isInside(node: THREE.Object3D, root: THREE.Object3D | null | undefined) {
    for (let current: THREE.Object3D | null = node; current; current = current.parent) {
        if (current === root) return true;
    }
    return false;
}

/** Height of the highest ground surface straight below (x, y); 0 - the ground plane - when nothing is hit. */
export function sampleSurfaceZ(surfaces: readonly THREE.Object3D[], x: number, y: number, exclude?: THREE.Object3D | null): number {
    if (!surfaces.length) return 0;
    rayOrigin.set(x, y, 10000);
    downRay.set(rayOrigin, rayDown);
    downRay.far = Infinity;
    let best = -Infinity;
    for (const surface of surfaces) {
        if (exclude && isInside(surface, exclude)) continue;
        surface.updateWorldMatrix(true, false);
        for (const hit of downRay.intersectObject(surface, false)) {
            if (hit.point.z > best) best = hit.point.z;
        }
    }
    return Number.isFinite(best) ? best : 0;
}

/**
 * Flat objects lie a few millimetres above the ground; at a grazing angle
 * or from far away that is below the depth buffer's resolution (near plane
 * 0.025 m) and the ground shows through. A polygon offset pulls them
 * towards the camera without moving them.
 */
export function applyFlatObjectDepthOffset(object: THREE.Object3D): boolean {
    const extent = verticalExtent(object);
    if (!extent || extent.top - extent.bottom > FLAT_OBJECT_MAX_HEIGHT) return false;
    object.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
            if (!material || material.polygonOffset) continue;
            material.polygonOffset = true;
            material.polygonOffsetFactor = -1;
            material.polygonOffsetUnits = -4;
            material.needsUpdate = true;
        }
    });
    return true;
}
