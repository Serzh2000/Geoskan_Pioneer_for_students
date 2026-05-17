import * as THREE from 'three';
import {
    controls,
    focusOrbitControlsOnObject,
    selectedObject,
    transformControl
} from '../core/scene-init.js';
import { simState } from '../../core/state.js';
import { handleDeselection, deselectObject, exitTransformMode } from './selection.js';
import { updateTransformModeDecorations } from './transform.js';
import { showGroundPoint } from '../core/ground-feedback.js';
import { deleteSelectedObject, duplicateObject, resetDroneToOrigin } from '../objects/object-manager.js';
import {
    activateTransformMode,
    getRotationStepDegrees,
    rememberSelectedObjectInitialTransform,
    resetSelectedObjectToInitialTransform,
    rotateSelectedObjectByDegrees,
    setRotationStepDegrees
} from '../objects/object-transform.js';
import { isTransformableObject } from '../objects/object-catalog.js';
import { getObjectDisplayName, isDroneObject, traceClick } from './input-helpers.js';

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

function getTransformToolbarTitle(obj: THREE.Object3D) {
    const rawType = String(obj.userData?.type || obj.userData?.sceneType || obj.name || obj.type || '').trim().toLowerCase();
    if (isDroneObject(obj) || rawType.includes('drone')) return 'Дрон (свойства)';
    if (rawType.includes('gate') || rawType.includes('ворота')) return 'Ворота (свойства)';
    if (rawType.includes('group') || rawType.includes('группа')) return 'Группа (свойства)';
    if (rawType.includes('ground') || rawType.includes('земля')) return 'Земля (свойства)';
    return `${getObjectDisplayName(obj).trim() || 'Объект'} (свойства)`;
}

function showTransformUi(obj: THREE.Object3D, preferredMode?: 'translate' | 'rotate' | 'scale') {
    if (!transformControl || !isTransformableObject(obj) || simState.running) return;
    const activeMode = preferredMode || 'translate';
    traceClick(`activate gizmo mode=${activeMode} for ${getObjectDisplayName(obj)}`);
    activateTransformMode(activeMode, obj);
    if (controls) controls.enabled = (window as any).cameraMode === 'free' && !(window as any).isTransforming;
    if (!(window as any).showGizmoToolbar) return;

    (window as any).showGizmoToolbar(
        getTransformToolbarTitle(obj),
        transformControl?.getMode?.() || activeMode,
        getRotationStepDegrees(),
        (mode: string) => {
            const target = selectedObject || obj;
            if (!target || !target.parent) return;
            showTransformUi(target, mode as 'translate' | 'rotate' | 'scale');
        },
        (step: number) => setRotationStepDegrees(step),
        (axis: 'x' | 'y' | 'z', direction: 1 | -1) => rotateSelectedObjectByDegrees(axis, direction * getRotationStepDegrees()),
        () => resetSelectedObjectToInitialTransform(),
        () => handleDeselection()
    );
}

function hideTransformUiPreserveSelection() {
    exitTransformMode();
    updateTransformModeDecorations(null);
    if (controls) controls.enabled = (window as any).cameraMode === 'free' && !(window as any).isTransforming;
}

export function updateObjectSelectionVisuals(obj: THREE.Object3D, selected: boolean) {
    const emissiveColor = new THREE.Color(0x38bdf8);
    obj.traverse((node: any) => {
        if (node.isMesh && node.material) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach((mat: any) => {
                if (!mat.emissive) return;
                if (mat.userData.originalEmissive === undefined) {
                    mat.userData.originalEmissive = mat.emissive.getHex();
                    mat.userData.originalEmissiveIntensity = mat.emissiveIntensity || 0;
                }
                if (selected) {
                    mat.emissive.copy(emissiveColor);
                    mat.emissiveIntensity = Math.max(0.6, mat.userData.originalEmissiveIntensity);
                    return;
                }
                mat.emissive.setHex(mat.userData.originalEmissive);
                mat.emissiveIntensity = mat.userData.originalEmissiveIntensity;
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
    if (focusCamera && obj) focusOrbitControlsOnObject(obj);

    const transformable = obj ? (isDroneObject(obj) || isTransformableObject(obj)) : false;
    if (showMenu) {
        hideTransformUiPreserveSelection();
    } else if (obj && transformable && !simState.running) {
        showTransformUi(obj);
    } else if ((window as any).hideGizmoToolbar) {
        (window as any).hideGizmoToolbar();
    }

    if (!showMenu || !(window as any).showContextMenu) {
        if (showMenu) traceClick('showMenu requested but window.showContextMenu is unavailable', 'warn');
        return;
    }

    const isDrone = obj ? isDroneObject(obj) : false;
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

    (window as any).showContextMenu(
        x,
        y,
        (mode: string) => {
            const target = selectedObject;
            if (!target || !target.parent) return;
            showTransformUi(target, mode as 'translate' | 'rotate' | 'scale');
        },
        () => deleteSelectedObject(),
        () => duplicateObject(),
        clickPoint ? () => {
            showGroundPoint(clickPoint);
            (window as any).updateSceneObjectClickCoords?.(clickPoint);
        } : undefined,
        isDrone ? () => resetDroneToOrigin() : undefined,
        objectInfoTitle,
        objectInfoItems,
        objectActionsTitle,
        objectActions
    );
}
