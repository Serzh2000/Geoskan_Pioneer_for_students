import * as THREE from 'three';
import { controls, selectedObject, transformControl, transformHelper } from '../core/scene-init.js';
import { simState, simSettings } from '../../core/state.js';
import { updateTransformModeDecorations } from '../interaction/transform.js';
import { isTransformableObject } from './object-catalog.js';

export type TransformMode = 'translate' | 'rotate' | 'scale';
export type RotationAxis = 'x' | 'y' | 'z';

const ROTATION_STEP_OPTIONS = [5, 15, 45] as const;
let rotationStepDegrees = 15;
let initialTransformTarget: THREE.Object3D | null = null;
let initialTransformSnapshot: {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    scale: THREE.Vector3;
} | null = null;

export function getRotationStepOptions() {
    return [...ROTATION_STEP_OPTIONS];
}

export function getRotationStepDegrees() {
    return rotationStepDegrees;
}

export function setRotationStepDegrees(step: number) {
    const normalized = ROTATION_STEP_OPTIONS.includes(step as typeof ROTATION_STEP_OPTIONS[number]) ? step : 15;
    rotationStepDegrees = normalized;
    if (transformControl?.getMode() === 'rotate') {
        transformControl.setRotationSnap(THREE.MathUtils.degToRad(rotationStepDegrees));
    }
    if ((window as any).setTransformToolbarRotationStep) {
        (window as any).setTransformToolbarRotationStep(rotationStepDegrees);
    }
    return rotationStepDegrees;
}

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

export function rotateSelectedObjectByDegrees(axis: RotationAxis, deltaDegrees: number) {
    if (!selectedObject || !transformControl || !isTransformableObject(selectedObject) || simState.running) return false;
    const radians = THREE.MathUtils.degToRad(deltaDegrees);
    selectedObject.rotation[axis] += radians;
    selectedObject.updateMatrixWorld(true);
    transformControl.dispatchEvent({ type: 'change', target: transformControl });
    updateTransformModeDecorations(transformControl.getMode(), selectedObject);
    return true;
}

export function resetSelectedObjectToInitialTransform() {
    if (!selectedObject || !transformControl || !isTransformableObject(selectedObject) || simState.running) return false;
    if (!initialTransformTarget || !initialTransformSnapshot || selectedObject !== initialTransformTarget) return false;

    selectedObject.position.copy(initialTransformSnapshot.position);
    selectedObject.quaternion.copy(initialTransformSnapshot.quaternion);
    selectedObject.scale.copy(initialTransformSnapshot.scale);
    selectedObject.updateMatrixWorld(true);
    transformControl.dispatchEvent({ type: 'change', target: transformControl });
    updateTransformModeDecorations(transformControl.getMode(), selectedObject);
    return true;
}

export function activateTransformMode(mode: TransformMode, target: THREE.Object3D) {
    if (!transformControl || !target || !target.parent || simState.running) return false;
    if (!isTransformableObject(target)) return false;

    transformControl.attach(target);
    transformControl.setMode(mode);
    transformControl.enabled = true;
    transformControl.size = mode === 'rotate' ? 1.3 : 1.15;
    transformControl.showX = true;
    transformControl.showY = true;
    transformControl.showZ = true;
    transformControl.setSpace(mode === 'scale' ? 'local' : 'world');
    transformControl.setTranslationSnap(null);
    transformControl.setScaleSnap(null);
    transformControl.setRotationSnap(mode === 'rotate' ? THREE.MathUtils.degToRad(rotationStepDegrees) : null);
    transformControl.visible = simSettings.showGizmo;
    if (transformHelper) {
        transformHelper.visible = simSettings.showGizmo;
        transformHelper.updateMatrixWorld(true);
    }
    if ((window as any).setGizmoToolbarMode) (window as any).setGizmoToolbarMode(mode);
    if ((window as any).setTransformToolbarRotationStep) {
        (window as any).setTransformToolbarRotationStep(rotationStepDegrees);
    }
    updateTransformModeDecorations(mode, target);
    if (controls) controls.enabled = (window as any).cameraMode === 'free' && !(window as any).isTransforming;
    return true;
}
