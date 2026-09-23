import * as THREE from 'three';
import {
    controls,
    focusOrbitControlsOnObject,
    selectedObject,
    selectionHelper,
    setSelectedObject,
    transformControl
} from '../core/scene-init.js';
import { drones, currentDroneId } from '../../core/state.js';
import { deselectObject, exitTransformMode } from './selection.js';
import { updateTransformModeDecorations } from './transform.js';
import { showGroundPoint } from '../core/ground-feedback.js';
import { deleteSelectedObject, duplicateObject, resetDroneToOrigin } from '../objects/object-manager.js';
import {
    activateTransformMode,
    rememberSelectedObjectInitialTransform
} from '../objects/object-transform.js';
import { isTransformableObject } from '../objects/object-catalog.js';
import { getObjectDisplayName, isDroneObject, traceClick } from './input-helpers.js';
import { getCameraMode } from '../core/camera-mode-state.js';
import { tablerIcon } from '../../ui/icons/tabler.js';
import { startLinearFeatureEditing } from './linear-editing.js';

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
    if (!transformControl || !isTransformableObject(obj) || drones[currentDroneId].running) return;
    const activeMode = preferredMode || 'translate';
    traceClick(`activate gizmo mode=${activeMode} for ${getObjectDisplayName(obj)}`);
    activateTransformMode(activeMode, obj);
    if (controls) controls.enabled = getCameraMode() === 'free' && !(window as any).isTransforming;
    // The inspector already exposes transform mode switching and rotation presets,
    // so the floating gizmo toolbar only duplicates controls and obscures the scene.
    if ((window as any).hideGizmoToolbar) {
        (window as any).hideGizmoToolbar();
    }
}

function hideTransformUiPreserveSelection() {
    exitTransformMode();
    updateTransformModeDecorations(null);
    if (controls) controls.enabled = getCameraMode() === 'free' && !(window as any).isTransforming;
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
                    mat.emissiveIntensity = Math.max(0.08, mat.userData.originalEmissiveIntensity);
                    return;
                }
                mat.emissive.setHex(mat.userData.originalEmissive);
                mat.emissiveIntensity = mat.userData.originalEmissiveIntensity;
            });
        }
    });

    if (selected && selectionHelper) {
        selectionHelper.setFromObject(obj);
        selectionHelper.visible = true;
    }
}

export function handleSelection(obj: THREE.Object3D | null, x: number, y: number, showMenu = false, focusCamera = false, clickPoint?: THREE.Vector3) {
    const isSameObject = selectedObject === obj;
    traceClick(`handleSelection object=${obj ? getObjectDisplayName(obj) : 'null'} same=${String(isSameObject)} showMenu=${String(showMenu)}`);

    if (selectedObject && !isSameObject) deselectObject();
    if (obj && !isSameObject) rememberSelectedObjectInitialTransform(obj);

    setSelectedObject(obj);
    if (obj) updateObjectSelectionVisuals(obj, true);
    if (focusCamera && obj) focusOrbitControlsOnObject(obj);

    const transformable = obj ? (isDroneObject(obj) || isTransformableObject(obj)) : false;
    if (showMenu) {
        hideTransformUiPreserveSelection();
    } else if (obj && transformable && !drones[currentDroneId].running) {
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

    // ArUco/AprilTag markers and marker maps: their ID, dictionary and grid
    // are set in a popover (ui/marker-settings.ts) opened from here.
    const markerData = obj?.userData || {};
    if (obj && (markerData.isMarkerMap || markerData.markerKind === 'ArUco' || markerData.markerKind === 'AprilTag')) {
        const settingsAction: ObjectContextMenuAction = {
            label: markerData.isMarkerMap ? 'Настроить карту…' : 'Настроить маркер…',
            icon: tablerIcon('adjustments').replace('width="24" height="24"', 'width="16" height="16"'),
            action: () => (window as any).openMarkerSettings?.(obj, x, y)
        };
        objectActionsTitle = objectActionsTitle || 'Маркер';
        objectActions = [settingsAction, ...(objectActions || [])];
    }

    if (obj?.userData?.supportsPoints) {
        objectActionsTitle = obj.userData.featureKind === 'rail' ? 'Железная дорога' : 'Дорога';
        objectActions = [{
            label: 'Изменить маршрут…',
            icon: tablerIcon('route-2').replace('width="24" height="24"', 'width="16" height="16"'),
            action: () => startLinearFeatureEditing(obj)
        }, ...(objectActions || [])];
    }

    if (obj?.userData?.isVehicle) {
        objectActionsTitle = 'Транспорт';
        objectActions = [{
            label: 'Настроить транспорт…',
            icon: tablerIcon('adjustments').replace('width="24" height="24"', 'width="16" height="16"'),
            action: () => (window as any).openVehicleSettings?.(obj, x, y)
        }, ...(objectActions || [])];
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
