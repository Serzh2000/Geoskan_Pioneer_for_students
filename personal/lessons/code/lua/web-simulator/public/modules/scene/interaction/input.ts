import * as THREE from 'three';
import {
    pointerDownPos,
    transformControl,
    controls,
    raycaster,
    mouse,
    camera,
    selectedObject,
    multiSelectedObjects,
    renderer,
    focusOrbitControlsOnObject,
    toggleMultiSelectObject
} from '../core/scene-init.js';
import { simState } from '../../core/state.js';
import { handleDeselection, deselectObject, exitTransformMode } from './selection.js';
import { updateTransformModeDecorations } from './transform.js';
import {
    deleteSelectedObject,
    duplicateObject,
    resetDroneToOrigin
} from '../objects/object-manager.js';
import {
    activateTransformMode,
    rememberSelectedObjectInitialTransform,
    getRotationStepDegrees,
    resetSelectedObjectToInitialTransform,
    rotateSelectedObjectByDegrees,
    setRotationStepDegrees
} from '../objects/object-transform.js';
import {
    isTransformableObject,
} from '../objects/object-catalog.js';
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

type ObjectContextMenuAction = {
    label: string;
    icon: string;
    action: () => void;
    active?: boolean;
    danger?: boolean;
};

type ObjectContextMenuInfoItem = {
    title?: string;
    text: string;
};

type ObjectContextMenuConfig = {
    infoTitle?: string;
    infoItems?: ObjectContextMenuInfoItem[];
    title?: string;
    actions?: ObjectContextMenuAction[];
};

function showTransformUi(obj: THREE.Object3D, preferredMode?: 'translate' | 'rotate' | 'scale') {
    if (!transformControl || !isTransformableObject(obj) || simState.running) return;
    const activeMode = preferredMode || (transformControl.object === obj ? transformControl.getMode() : 'translate');
    traceClick(`activate gizmo mode=${activeMode} for ${getObjectDisplayName(obj)}`);
    activateTransformMode(activeMode, obj);
    if (controls) controls.enabled = (window as any).cameraMode === 'free' && !(window as any).isTransforming;
    if ((window as any).showGizmoToolbar) {
        traceClick('showGizmoToolbar is available, rendering toolbar');
        (window as any).showGizmoToolbar(
            getObjectDisplayName(obj),
            transformControl?.getMode?.() || activeMode,
            getRotationStepDegrees(),
            (mode: string) => {
                const target = selectedObject || obj;
                if (!target || !target.parent) return;
                showTransformUi(target, mode as 'translate' | 'rotate' | 'scale');
            },
            (step: number) => {
                setRotationStepDegrees(step);
            },
            (axis: 'x' | 'y' | 'z', direction: 1 | -1) => {
                rotateSelectedObjectByDegrees(axis, direction * getRotationStepDegrees());
            },
            () => {
                resetSelectedObjectToInitialTransform();
            },
            () => handleDeselection()
        );
    }
}

function hideTransformUiPreserveSelection() {
    exitTransformMode();
    updateTransformModeDecorations(null);
    if (controls) controls.enabled = (window as any).cameraMode === 'free' && !(window as any).isTransforming;
}

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
        const isCtrl = (event.ctrlKey || event.metaKey) && event.button === 0; // Ctrl + ЛКМ
        const isRightClick = event.button === 2; // ПКМ
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const rootObject = getRootSceneObject(intersect.object);
            
            // Координаты через Ctrl + ЛКМ
            if (isCtrl) {
                showGroundPoint(intersect.point);
                if ((window as any).updateSceneObjectClickCoords) {
                    (window as any).updateSceneObjectClickCoords(intersect.point);
                }
                // Ctrl+ЛКМ также выполняет мультивыбор
                if (isDroneObject(rootObject) || isTransformableObject(rootObject)) {
                    toggleMultiSelectObject(rootObject);
                    multiSelectedObjects.forEach(obj => updateObjectSelectionVisuals(obj, true));
                    (window as any).updateSceneManager && (window as any).updateSceneManager();
                }
                return;
            }

            // ПКМ по любому объекту вызывает меню
            if (isRightClick) {
                // Если это земля - показываем только координаты
                if (isGroundObject(intersect.object) || isGroundObject(rootObject)) {
                    // Используем координаты пересечения луча с мешем земли
                    handleSelection(null as any, event.clientX, event.clientY, true, false, intersect.point);
                } else {
                    handleSelection(rootObject, event.clientX, event.clientY, true, false, intersect.point);
                }
                return;
            }

            // Обычный ЛКМ по земле - сброс выбора
            if (isGroundObject(intersect.object) || isGroundObject(rootObject)) {
                traceClick('ground intersect, deselecting');
                handleDeselection();
                return;
            }

            // Обычный ЛКМ по объекту - выбор и редактирование
            if (isDroneObject(rootObject) || isTransformableObject(rootObject)) {
                traceClick(`selectable intersect object=${getObjectDisplayName(rootObject)} select=true`);
                handleSelection(rootObject, event.clientX, event.clientY, false, false, intersect.point);
                return;
            }
        }

        // Клик в пустоту
        const groundPoint = getGroundPointFromPointer();
        if (groundPoint) {
            if (isCtrl) {
                showGroundPoint(groundPoint);
                if ((window as any).updateSceneObjectClickCoords) {
                    (window as any).updateSceneObjectClickCoords(groundPoint);
                }
            } else if (isRightClick) {
                // ПКМ по пустому месту (земле) - тоже меню
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

export function updateObjectSelectionVisuals(obj: THREE.Object3D, selected: boolean) {
    const emissiveColor = new THREE.Color(0x38bdf8);
    obj.traverse((node: any) => {
        if (node.isMesh && node.material) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach((mat: any) => {
                if (mat.emissive) {
                    if (mat.userData.originalEmissive === undefined) {
                        mat.userData.originalEmissive = mat.emissive.getHex();
                        mat.userData.originalEmissiveIntensity = mat.emissiveIntensity || 0;
                    }
                    if (selected) {
                        mat.emissive.copy(emissiveColor);
                        mat.emissiveIntensity = Math.max(0.6, mat.userData.originalEmissiveIntensity);
                    } else {
                        mat.emissive.setHex(mat.userData.originalEmissive);
                        mat.emissiveIntensity = mat.userData.originalEmissiveIntensity;
                    }
                }
            });
        }
    });

    if (selected && (window as any).selectionHelper) {
        (window as any).selectionHelper.setFromObject(obj);
        (window as any).selectionHelper.visible = true;
    }
}

export function handleSelection(obj: THREE.Object3D | null, x: number, y: number, showMenu = false, focusCamera = false, clickPoint?: THREE.Vector3) {
    const isSameObject = selectedObject === obj;
    traceClick(`handleSelection object=${obj ? getObjectDisplayName(obj) : 'null'} same=${String(isSameObject)} showMenu=${String(showMenu)}`);
    
    if (selectedObject && !isSameObject) deselectObject();
    if (obj && !isSameObject) rememberSelectedObjectInitialTransform(obj);

    (window as any).setSelectedObject(obj);
    if (obj) updateObjectSelectionVisuals(obj, true);

    if (focusCamera && obj) {
        focusOrbitControlsOnObject(obj);
    }

    const transformable = obj ? (isDroneObject(obj) || isTransformableObject(obj)) : false;
    if (showMenu) {
        hideTransformUiPreserveSelection();
    } else if (obj && transformable && !simState.running) {
        showTransformUi(obj);
    } else if ((window as any).hideGizmoToolbar) {
        traceClick(`gizmo toolbar hidden transformable=${String(transformable)} simRunning=${String(simState.running)}`);
        (window as any).hideGizmoToolbar();
    }

    if (showMenu && (window as any).showContextMenu) {
        const isDrone = obj ? isDroneObject(obj) : false;
        traceClick(`showContextMenu for ${obj ? getObjectDisplayName(obj) : 'ground'} at x=${x} y=${y} isDrone=${String(isDrone)}`);

        let objectActionsTitle: string | undefined;
        let objectActions: ObjectContextMenuAction[] | undefined;
        let objectInfoTitle: string | undefined;
        let objectInfoItems: ObjectContextMenuInfoItem[] | undefined;
        if (obj && typeof obj.userData.getContextMenuActions === 'function') {
            try {
                const config = obj.userData.getContextMenuActions(obj) as ObjectContextMenuConfig | undefined;
                if (config?.infoItems?.length) {
                    objectInfoTitle = config.infoTitle;
                    objectInfoItems = config.infoItems;
                }
                if (config?.actions?.length) {
                    objectActionsTitle = config.title;
                    objectActions = config.actions;
                }
            } catch (error) {
                console.warn('[3D] Failed to build object context actions:', error);
            }
        }

        (window as any).showContextMenu(x, y,
            (mode: string) => {
                const target = selectedObject;
                if (!target || !target.parent) return;
                showTransformUi(target, mode as 'translate' | 'rotate' | 'scale');
            },
            () => deleteSelectedObject(),
            () => duplicateObject(),
            clickPoint ? () => {
                showGroundPoint(clickPoint);
                if ((window as any).updateSceneObjectClickCoords) {
                    (window as any).updateSceneObjectClickCoords(clickPoint);
                }
            } : undefined,
            isDrone ? () => resetDroneToOrigin() : undefined,
            objectInfoTitle,
            objectInfoItems,
            objectActionsTitle,
            objectActions
        );
    } else if (showMenu) {
        traceClick('showMenu requested but window.showContextMenu is unavailable', 'warn');
    }
}
