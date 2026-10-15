import * as THREE from 'three';
import { drones, pathPoints, pathPointsVersion, setSceneEditDragActive } from '../../core/state.js';
import { droneMeshes, selectedObject, transformControl, controls, selectionHelper } from '../core/scene-init.js';
import { envGroup } from '../../environment/index.js';
import { snapMarkerToSurface } from '../../environment/obstacles.js';
import { getCameraMode } from '../core/camera-mode-state.js';
import {
    type Footprint,
    groundSurfaceZUnder,
    isMarkerSceneObject,
    isSurfaceSeatable,
    keepMarkerAboveGround,
    measureFootprint,
    seatOnGround,
    shouldSnapToGrid,
    snapPointToGrid
} from '../objects/placement.js';
import {
    isRestingOnSurface,
    keepObjectBottomAboveSurface,
    pivotZAboveSurface,
    seatedPivotZ,
    verticalExtent
} from '../objects/placement-geometry.js';

/*
 * Angle readout: while a rotate ring is dragged, the turn so far ("+30°") follows the pointer,
 * so the angle is known before the button is released.
 */
let angleReadout: HTMLDivElement | null = null;
let pointerX = 0;
let pointerY = 0;

function placeAngleReadout() {
    if (!angleReadout) return;
    angleReadout.style.transform = `translate(${pointerX + 18}px, ${pointerY + 18}px)`;
}

function ensureAngleReadout(): HTMLDivElement {
    if (angleReadout) return angleReadout;
    const el = document.createElement('div');
    el.className = 'gizmo-angle-readout';
    el.setAttribute('aria-hidden', 'true');
    el.hidden = true;
    document.body.appendChild(el);
    window.addEventListener('pointermove', (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
        placeAngleReadout();
    }, { passive: true });
    angleReadout = el;
    return el;
}

function showAngleReadout() {
    const degrees = Math.round(THREE.MathUtils.radToDeg((transformControl as unknown as { rotationAngle: number }).rotationAngle) * 10) / 10;
    const el = ensureAngleReadout();
    el.textContent = `${degrees > 0 ? '+' : ''}${degrees}°`;
    el.hidden = false;
    placeAngleReadout();
}

function hideAngleReadout() {
    if (angleReadout) angleReadout.hidden = true;
}

export function updateTransformModeDecorations(mode: 'translate' | 'rotate' | 'scale' | null, _target?: THREE.Object3D | null) {
    if (mode !== 'rotate') hideAngleReadout();
}

/*
 * One gizmo drag of a scene object. Offsets of the bounding box from the
 * pivot are measured once at the start - a translation does not change them,
 * and measuring a building every pointer move is not free.
 */
type DragSession = {
    target: THREE.Object3D;
    axis: string;
    mode: string;
    seatable: boolean;
    /** Stood on the surface when the drag began: an X/Y move keeps it standing on the surface. */
    resting: boolean;
    bottomOffset: number;
    topOffset: number;
    footprint: Footprint;
};
let dragSession: DragSession | null = null;

function beginDragSession(target: THREE.Object3D): DragSession {
    const seatable = isSurfaceSeatable(target) && !isMarkerSceneObject(target);
    const extent = seatable ? verticalExtent(target) : null;
    const pivotZ = target.getWorldPosition(new THREE.Vector3()).z;
    const bottomOffset = extent ? extent.bottom - pivotZ : 0;
    const topOffset = extent ? extent.top - pivotZ : 0;
    const footprint = measureFootprint(target);
    const surfaceZ = extent ? groundSurfaceZUnder(target.position.x, target.position.y, footprint, target) : 0;
    return {
        target,
        axis: transformControl.axis ?? '',
        mode: transformControl.getMode(),
        seatable: Boolean(extent),
        resting: Boolean(extent) && isRestingOnSurface(pivotZ, pivotZ + bottomOffset, pivotZ + topOffset, surfaceZ),
        bottomOffset,
        topOffset,
        footprint
    };
}

/** Grid snap of the dragged axes (X/Y only - height stays free). */
function snapDraggedPosition(target: THREE.Object3D, axis: string) {
    if (!shouldSnapToGrid()) return;
    const world = target.getWorldPosition(new THREE.Vector3());
    const snapped = snapPointToGrid(world, false);
    if (axis.includes('X')) world.x = snapped.x;
    if (axis.includes('Y')) world.y = snapped.y;
    if (target.parent) target.parent.worldToLocal(world);
    target.position.copy(world);
}

/** Height while dragging: an X/Y move of a standing object follows the relief, any move keeps the bottom above it. */
function constrainDraggedHeight(session: DragSession) {
    const target = session.target;
    const surfaceZ = groundSurfaceZUnder(target.position.x, target.position.y, session.footprint, target);
    const pivotZ = target.position.z;
    const bottom = pivotZ + session.bottomOffset;
    const top = pivotZ + session.topOffset;
    target.position.z = session.resting && !session.axis.includes('Z')
        ? seatedPivotZ(pivotZ, bottom, top, surfaceZ)
        : pivotZAboveSurface(pivotZ, bottom, surfaceZ);
}

/** End of a drag: a standing object stands on the surface again (rotation/scale may have moved its bottom). */
function finishDragSession(session: DragSession) {
    const target = session.target;
    if (!session.seatable || !target.parent) return;
    if (session.resting && !(session.mode === 'translate' && session.axis.includes('Z'))) {
        seatOnGround(target);
    } else {
        const position = target.getWorldPosition(new THREE.Vector3());
        keepObjectBottomAboveSurface(target, groundSurfaceZUnder(position.x, position.y, measureFootprint(target), target));
    }
    if (selectionHelper) selectionHelper.update();
}

export function setupTransformControlListeners() {
    transformControl.addEventListener('objectChange', () => {
        if (transformControl.dragging && transformControl.getMode() === 'rotate') showAngleReadout();
    });

    transformControl.addEventListener('change', () => {
        const session = dragSession && transformControl.dragging && dragSession.target === selectedObject ? dragSession : null;
        if (selectedObject && session && session.mode === 'translate') {
            snapDraggedPosition(selectedObject, session.axis);
        }

        if (selectionHelper) selectionHelper.update();

        if (selectedObject) {
            let selectedDroneId: string | null = null;
            for (const id in droneMeshes) {
                if (selectedObject === droneMeshes[id]) {
                    selectedDroneId = id;
                    break;
                }
            }
            if (selectedDroneId) {
                const drone = drones[selectedDroneId];
                if (drone) {
                    drone.pos.x = selectedObject.position.x;
                    drone.pos.y = selectedObject.position.y;
                    drone.pos.z = Math.max(0, selectedObject.position.z);
                    selectedObject.position.z = drone.pos.z;
                    drone.orientation.pitch = selectedObject.rotation.x;
                    drone.orientation.roll = selectedObject.rotation.y;
                    drone.orientation.yaw = selectedObject.rotation.z;
                    drone.target_alt = drone.pos.z;
                    drone.target_pos = { ...drone.pos };
                    drone.target_yaw = drone.orientation.yaw;
                }
            } else if (selectedObject.userData && selectedObject.userData.draggable) {
                if (selectedObject.userData?.markerKind && transformControl.getMode() !== 'rotate') {
                    snapMarkerToSurface(selectedObject, envGroup?.children || []);
                    keepMarkerAboveGround(selectedObject);
                } else if (session?.seatable && session.mode === 'translate') {
                    constrainDraggedHeight(session);
                } else {
                    selectedObject.position.z = Math.max(0, selectedObject.position.z);
                }
            }
        }

    });

    transformControl.addEventListener('dragging-changed', (event: any) => {
        const isDragging = event.value;
        if (isDragging && selectedObject && !Object.values(droneMeshes).includes(selectedObject)) {
            dragSession = beginDragSession(selectedObject);
        } else if (!isDragging && dragSession) {
            const finished = dragSession;
            dragSession = null;
            if (finished.target === selectedObject) finishDragSession(finished);
        }
        if (!isDragging) hideAngleReadout();
        (window as any).isTransforming = isDragging;
        setSceneEditDragActive(isDragging);
        if (controls) controls.enabled = !isDragging && getCameraMode() === 'free';

        // A manual reposition is a teleport, not a flight: without this, physics
        // resuming after the drag sees the drone "jump" from its last flown point
        // to the drop point and draws one straight tracer segment across the gap.
        if (isDragging && selectedObject) {
            for (const id in droneMeshes) {
                if (selectedObject === droneMeshes[id]) {
                    pathPoints[id] = [];
                    pathPointsVersion[id] = (pathPointsVersion[id] || 0) + 1;
                    break;
                }
            }
        }
    });
}
