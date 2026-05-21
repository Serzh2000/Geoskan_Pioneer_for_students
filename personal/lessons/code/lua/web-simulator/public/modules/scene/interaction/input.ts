import * as THREE from 'three';
import {
    pointerDownPos,
    transformControl,
    raycaster,
    mouse,
    camera,
    multiSelectedObjects,
    renderer,
    toggleMultiSelectObject
} from '../core/scene-init.js';
import { simState } from '../../core/state.js';
import { handleDeselection } from './selection.js';
import { isTransformableObject } from '../objects/object-catalog.js';
import { handleLinearEditingPointerUp, isLinearFeatureEditingActive } from './linear-editing.js';
import { showGroundPoint } from '../core/ground-feedback.js';
import {
    collectPointerTargets,
    getGroundPointFromPointer,
    getObjectDisplayName,
    getRootSceneObject,
    isDroneObject,
    isGroundObject,
    traceClick
} from './input-helpers.js';
import { handleSelection, updateObjectSelectionVisuals } from './selection-ui.js';

export { handleSelection, updateObjectSelectionVisuals };

export function onPointerDown(event: PointerEvent) {
    pointerDownPos.set(event.clientX, event.clientY);
    traceClick(`pointerdown button=${event.button} x=${event.clientX} y=${event.clientY}`);
    if (!transformControl) return;
    (window as any).isHittingGizmo = transformControl.dragging || (transformControl as any).axis !== null;
    traceClick(`pointerdown gizmo dragging=${transformControl.dragging} axis=${String((transformControl as any).axis)} hit=${String((window as any).isHittingGizmo)}`);
}

export function onPointerUp(event: PointerEvent) {
    traceClick(`pointerup button=${event.button} x=${event.clientX} y=${event.clientY} cameraMode=${String((window as any).cameraMode)}`);
    if (simState.running && (window as any).cameraMode === 'fpv') {
        traceClick('pointerup ignored: fpv mode while simulation is running', 'warn');
        return;
    }
    if (!renderer || !camera || !transformControl || !raycaster) {
        traceClick(`pointerup ignored: missing renderer=${String(!!renderer)} camera=${String(!!camera)} transformControl=${String(!!transformControl)} raycaster=${String(!!raycaster)}`, 'warn');
        return;
    }
    
    if ((window as any).isHittingGizmo || transformControl.dragging || (transformControl as any).axis !== null) {
        traceClick(`pointerup ignored: gizmo interaction hit=${String((window as any).isHittingGizmo)} dragging=${String(transformControl.dragging)} axis=${String((transformControl as any).axis)}`, 'warn');
        (window as any).isHittingGizmo = false;
        return;
    }

    const dist = pointerDownPos.distanceTo(new THREE.Vector2(event.clientX, event.clientY));
    traceClick(`pointerup delta=${dist.toFixed(2)}`);
    if (dist > 5) {
        traceClick(`pointerup ignored: pointer moved too far (${dist.toFixed(2)})`, 'warn');
        return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    if (isLinearFeatureEditingActive()) {
        handleLinearEditingPointerUp(event);
        return;
    }
    
    try {
        const intersects = raycaster.intersectObjects(collectPointerTargets(), true);
        const isCtrl = (event.ctrlKey || event.metaKey) && event.button === 0; // Ctrl + 
        const isRightClick = event.button === 2; // 
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const rootObject = getRootSceneObject(intersect.object);
            
            //   Ctrl + 
            if (isCtrl) {
                showGroundPoint(intersect.point);
                if ((window as any).updateSceneObjectClickCoords) {
                    (window as any).updateSceneObjectClickCoords(intersect.point);
                }
                // Ctrl+   
                if (isDroneObject(rootObject) || isTransformableObject(rootObject)) {
                    toggleMultiSelectObject(rootObject);
                    multiSelectedObjects.forEach(obj => updateObjectSelectionVisuals(obj, true));
                    (window as any).updateSceneManager && (window as any).updateSceneManager();
                }
                return;
            }

            //      
            if (isRightClick) {
                //    -   
                if (isGroundObject(intersect.object) || isGroundObject(rootObject)) {
                    //       
                    handleSelection(null as any, event.clientX, event.clientY, true, false, intersect.point);
                } else {
                    handleSelection(rootObject, event.clientX, event.clientY, true, false, intersect.point);
                }
                return;
            }

            //     -  
            if (isGroundObject(intersect.object) || isGroundObject(rootObject)) {
                traceClick('ground intersect, deselecting');
                handleDeselection();
                return;
            }

            //     -   
            if (isDroneObject(rootObject) || isTransformableObject(rootObject)) {
                traceClick(`selectable intersect object=${getObjectDisplayName(rootObject)} select=true`);
                handleSelection(rootObject, event.clientX, event.clientY, false, false, intersect.point);
                return;
            }
        }

        //   
        const groundPoint = getGroundPointFromPointer();
        if (groundPoint) {
            if (isCtrl) {
                showGroundPoint(groundPoint);
                if ((window as any).updateSceneObjectClickCoords) {
                    (window as any).updateSceneObjectClickCoords(groundPoint);
                }
            } else if (isRightClick) {
                //     () -  
                const dummy = new THREE.Object3D();
                dummy.position.copy(groundPoint);
                handleSelection(dummy, event.clientX, event.clientY, true, false, groundPoint);
            } else {
                handleDeselection();
            }
            return;
        }
    } catch (e) {
        console.warn('[3D] Raycasting failed:', e);
    }

    handleDeselection();
}

