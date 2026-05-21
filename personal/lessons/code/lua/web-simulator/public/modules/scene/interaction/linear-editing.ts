import * as THREE from 'three';
import { updateSceneObjectPoints } from '../../environment/index.js';
import type { ScenePathPoint } from '../../environment/obstacles.js';
import { log } from '../../shared/logging/logger.js';
import { normalizePoints } from '../objects/object-catalog.js';
import { camera, raycaster, renderer, scene, selectedObject } from '../core/scene-init.js';
import { exitTransformMode } from './selection.js';
import {
    cloneLinearPoints,
    getLinearEditingHoverPointFromEvent,
    localPointToWorldVector,
    refreshLinearEditingPreview,
    setLinearEditingCoordsHint
} from './linear-editing-support.js';

type EditingState = {
    active: boolean;
    target: THREE.Object3D | null;
    originalPoints: ScenePathPoint[];
    workingPoints: ScenePathPoint[];
    hoverPoint: ScenePathPoint | null;
    previewGroup: THREE.Group | null;
    lastSnapAxes: string[];
};

const editingState: EditingState = {
    active: false,
    target: null,
    originalPoints: [],
    workingPoints: [],
    hoverPoint: null,
    previewGroup: null,
    lastSnapAxes: []
};

function refreshPreview() {
    editingState.previewGroup = refreshLinearEditingPreview({
        active: editingState.active,
        previewGroup: editingState.previewGroup,
        scene,
        target: editingState.target,
        workingPoints: editingState.workingPoints,
        hoverPoint: editingState.hoverPoint
    });
}

function getHoverPointFromEvent(event: PointerEvent) {
    return getLinearEditingHoverPointFromEvent(event, editingState.target, renderer, camera, raycaster);
}

function syncObjectPoints() {
    if (!editingState.target) return false;
    const ok = updateSceneObjectPoints(editingState.target, editingState.workingPoints);
    if (ok) {
        (window as any).updateSceneManager?.();
    }
    return ok;
}

function resetState() {
    editingState.previewGroup = refreshLinearEditingPreview({
        active: false,
        previewGroup: editingState.previewGroup,
        scene,
        target: editingState.target,
        workingPoints: editingState.workingPoints,
        hoverPoint: editingState.hoverPoint
    });
    editingState.active = false;
    editingState.target = null;
    editingState.originalPoints = [];
    editingState.workingPoints = [];
    editingState.hoverPoint = null;
    editingState.lastSnapAxes = [];
    setLinearEditingCoordsHint(null);
    (window as any).updateSceneManager?.();
}

export function isLinearFeatureEditingActive(objectId?: string) {
    if (!editingState.active) return false;
    return !objectId || editingState.target?.uuid === objectId;
}

export function getLinearFeatureEditingTargetId() {
    return editingState.target?.uuid || null;
}

export function startLinearFeatureEditing(target = selectedObject) {
    if (!target?.userData?.supportsPoints) {
        log('Визуальная прокладка доступна только для дороги или рельс', 'warn');
        return false;
    }

    const points = normalizePoints(target.userData?.points);
    if (points.length < 2) {
        log('Для визуальной прокладки нужно минимум 2 точки у объекта', 'warn');
        return false;
    }

    if (editingState.active && editingState.target?.uuid === target.uuid) return true;
    if (editingState.active) finishLinearFeatureEditing(true);

    exitTransformMode();
    editingState.active = true;
    editingState.target = target;
    editingState.originalPoints = cloneLinearPoints(points);
    editingState.workingPoints = cloneLinearPoints(points);
    editingState.hoverPoint = null;
    editingState.lastSnapAxes = [];
    refreshPreview();
    (window as any).updateSceneManager?.();
    log('Режим прокладки включен: ЛКМ добавляет точку, Backspace удаляет последнюю, Enter/ПКМ завершает, Esc отменяет', 'info');
    return true;
}

export function finishLinearFeatureEditing(commit = true) {
    if (!editingState.active || !editingState.target) return false;

    if (!commit) {
        updateSceneObjectPoints(editingState.target, editingState.originalPoints);
        log('Прокладка маршрута отменена, исходные точки восстановлены', 'info');
    } else {
        log('Прокладка маршрута завершена', 'success');
    }

    resetState();
    return true;
}

export function handleLinearEditingPointerMove(event: PointerEvent) {
    if (!editingState.active) return false;
    const hover = getHoverPointFromEvent(event);
    if (!hover) return true;

    editingState.hoverPoint = hover.point;
    editingState.lastSnapAxes = hover.snapAxes;
    setLinearEditingCoordsHint(hover.worldPoint, hover.snapAxes);
    refreshPreview();
    return true;
}

export function handleLinearEditingPointerUp(event: PointerEvent) {
    if (!editingState.active) return false;

    if (event.button === 2) {
        finishLinearFeatureEditing(true);
        return true;
    }
    if (event.button !== 0) return true;

    const hover = editingState.hoverPoint ? {
        point: editingState.hoverPoint,
        worldPoint: {
            x: localPointToWorldVector(editingState.hoverPoint, editingState.target).x,
            y: localPointToWorldVector(editingState.hoverPoint, editingState.target).y,
            z: localPointToWorldVector(editingState.hoverPoint, editingState.target).z
        } satisfies ScenePathPoint,
        snapAxes: editingState.lastSnapAxes
    } : getHoverPointFromEvent(event);
    if (!hover) return true;

    editingState.hoverPoint = hover.point;
    editingState.lastSnapAxes = hover.snapAxes;
    editingState.workingPoints.push({ ...hover.point });
    const ok = syncObjectPoints();
    if (ok) {
        setLinearEditingCoordsHint(hover.worldPoint, hover.snapAxes);
        refreshPreview();
    }
    return true;
}

export function handleLinearEditingKeyDown(event: KeyboardEvent) {
    if (!editingState.active) return false;

    if (event.key === 'Enter') {
        event.preventDefault();
        finishLinearFeatureEditing(true);
        return true;
    }

    if (event.key === 'Escape') {
        event.preventDefault();
        finishLinearFeatureEditing(false);
        return true;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        if (editingState.workingPoints.length <= 2) {
            log('У маршрута должно остаться минимум 2 точки', 'warn');
            return true;
        }
        editingState.workingPoints.pop();
        syncObjectPoints();
        refreshPreview();
        return true;
    }

    return false;
}

