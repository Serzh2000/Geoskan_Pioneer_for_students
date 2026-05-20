import * as THREE from 'three';
import { controls, transformControl, transformHelper, selectedObject, setSelectedObject, scene, selectionHelper } from '../core/scene-init.js';
import { log } from '../../shared/logging/logger.js';
import { updateTransformModeDecorations } from './transform.js';
import { clearSelectedObjectInitialTransform } from '../objects/object-transform.js';

export function exitTransformMode() {
    if (transformControl) {
        transformControl.detach();
        transformControl.visible = false;
    }
    if (transformHelper) transformHelper.visible = false;
    updateTransformModeDecorations(null);
    if ((window as any).hideGizmoToolbar) (window as any).hideGizmoToolbar();
    if (controls) controls.enabled = (window as any).cameraMode === 'free' && !(window as any).isTransforming;
}

export function handleDeselection() {
    if (selectedObject) deselectObject();
    exitTransformMode();
    if ((window as any).hideContextMenu) (window as any).hideContextMenu();
}

export function deselectObject() {
    if (!selectedObject) return;
    const objectToClear = selectedObject;
    
    selectedObject.traverse((node: any) => {
        if (node.isMesh && node.material) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach((mat: any) => {
                if (mat.emissive && mat.userData.originalEmissive !== undefined) {
                    mat.emissive.setHex(mat.userData.originalEmissive);
                    mat.emissiveIntensity = 0;
                }
            });
        }
    });
    
    if (selectionHelper) {
        selectionHelper.visible = false;
        const dummy = scene.getObjectByName('selection_dummy');
        if (dummy) selectionHelper.setFromObject(dummy);
    }
    setSelectedObject(null);
    clearSelectedObjectInitialTransform(objectToClear);
}
