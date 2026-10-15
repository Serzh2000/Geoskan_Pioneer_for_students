import * as THREE from 'three';
import { controls, selectedObject, transformControl, transformHelper } from '../core/scene-init.js';
import { drones, currentDroneId, simSettings } from '../../core/state.js';
import { updateTransformModeDecorations } from '../interaction/transform.js';
import { isTransformableObject } from './object-catalog.js';
import { getCameraMode } from '../core/camera-mode-state.js';
import { shouldSnapToGrid } from './placement.js';
import { ROTATION_SNAP_DEGREES } from './placement-geometry.js';
import { MODE_SIZES } from '../core/transform-controls-style-helpers.js';

export type TransformMode = 'translate' | 'rotate' | 'scale';
export type RotationAxis = 'x' | 'y' | 'z';

let initialTransformTarget: THREE.Object3D | null = null;
let initialTransformSnapshot: {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    scale: THREE.Vector3;
} | null = null;

export function rememberSelectedObjectInitialTransform(target: THREE.Object3D) {
    initialTransformTarget = target;
    initialTransformSnapshot = {
        position: target.position.clone(),
        quaternion: target.quaternion.clone(),
        scale: target.scale.clone()
    };
}

export function clearSelectedObjectInitialTransform(target?: THREE.Object3D | null) {
    if (target && initialTransformTarget && target !== initialTransformTarget) return;
    initialTransformTarget = null;
    initialTransformSnapshot = null;
}

/** The mode the viewport gizmo is really in, or null when no gizmo is attached to the selection. */
export function getActiveTransformMode(): TransformMode | null {
    return transformControl?.object ? (transformControl.getMode() as TransformMode) : null;
}

export function rotateSelectedObjectByDegrees(axis: RotationAxis, deltaDegrees: number) {
    if (!selectedObject || !transformControl || !isTransformableObject(selectedObject) || drones[currentDroneId].running) return false;
    // About the world axis, like the gizmo ring of the same name: adding to an Euler angle turns about a different axis once the object is tilted.
    const worldAxis = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
    const parentInverse = (selectedObject.parent?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion()).invert();
    const turn = new THREE.Quaternion().setFromAxisAngle(worldAxis.applyQuaternion(parentInverse), THREE.MathUtils.degToRad(deltaDegrees));
    selectedObject.quaternion.premultiply(turn).normalize();
    selectedObject.updateMatrixWorld(true);
    transformControl.dispatchEvent({ type: 'change' });
    updateTransformModeDecorations(transformControl.getMode(), selectedObject);
    return true;
}

// Used by scene import: place a just-created object exactly where it was in
// the saved scene, bypassing the gizmo (there is nothing to drag yet).
export function setSelectedObjectTransform(
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number },
    scale: { x: number; y: number; z: number }
) {
    if (!selectedObject) return false;
    selectedObject.position.set(position.x, position.y, position.z);
    selectedObject.rotation.set(rotation.x, rotation.y, rotation.z);
    selectedObject.scale.set(scale.x, scale.y, scale.z);
    selectedObject.updateMatrixWorld(true);
    if (transformControl?.object === selectedObject) {
        transformControl.dispatchEvent({ type: 'change' });
        updateTransformModeDecorations(transformControl.getMode(), selectedObject);
    }
    return true;
}

export function resetSelectedObjectToInitialTransform() {
    if (!selectedObject || !transformControl || !isTransformableObject(selectedObject) || drones[currentDroneId].running) return false;
    if (!initialTransformTarget || !initialTransformSnapshot || selectedObject !== initialTransformTarget) return false;

    selectedObject.position.copy(initialTransformSnapshot.position);
    selectedObject.quaternion.copy(initialTransformSnapshot.quaternion);
    selectedObject.scale.copy(initialTransformSnapshot.scale);
    selectedObject.updateMatrixWorld(true);
    transformControl.dispatchEvent({ type: 'change' });
    updateTransformModeDecorations(transformControl.getMode(), selectedObject);
    return true;
}

export function activateTransformMode(mode: TransformMode, target: THREE.Object3D) {
    if (!transformControl || !target || !target.parent || drones[currentDroneId].running) return false;
    if (!isTransformableObject(target)) return false;

    transformControl.attach(target);
    transformControl.setMode(mode);
    transformControl.enabled = true;
    transformControl.size = MODE_SIZES[mode];
    transformControl.showX = true;
    transformControl.showY = true;
    transformControl.showZ = true;
    transformControl.setSpace(mode === 'scale' ? 'local' : 'world');
    transformControl.setTranslationSnap(null);
    transformControl.setScaleSnap(null);
    // 15° steps while "Привязка к сетке" is on and Shift is not held (placement.ts keeps it in sync).
    transformControl.setRotationSnap(mode === 'rotate' && shouldSnapToGrid() ? THREE.MathUtils.degToRad(ROTATION_SNAP_DEGREES) : null);
    transformControl.visible = simSettings.showGizmo;
    if (transformHelper) {
        transformHelper.visible = simSettings.showGizmo;
        transformHelper.updateMatrixWorld(true);
    }
    updateTransformModeDecorations(mode, target);
    if (controls) controls.enabled = getCameraMode() === 'free' && !(window as any).isTransforming;
    return true;
}
