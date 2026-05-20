import * as THREE from 'three';
import { log } from '../../shared/logging/logger.js';
import { transformControl, transformHelper, controls, droneMeshes, selectedObject, multiSelectedObjects, setSelectedObject } from '../core/scene-init.js';
import { drones, currentDroneId, simState, simSettings } from '../../core/state.js';
import { envGroup, addObjectToScene, updateSceneObjectPoints, updateSceneObjectValue } from '../../environment/index.js';
import { MarkerMapOptions, SceneObjectOptions, ScenePathPoint } from '../../environment/obstacles.js';
import { handleDeselection, deselectObject } from '../interaction/selection.js';
import { handleSelection, updateObjectSelectionVisuals } from '../interaction/input.js';
import { findSceneObjectById, getSceneTopLevelObjects, isTransformableObject, listSceneObjects, normalizePoints, parsePointsText } from './object-catalog.js';
import type { TransformMode } from './object-transform.js';
import { activateTransformMode, clearSelectedObjectInitialTransform, getRotationStepDegrees, getRotationStepOptions, rememberSelectedObjectInitialTransform, resetSelectedObjectToInitialTransform, rotateSelectedObjectByDegrees, setRotationStepDegrees } from './object-transform.js';
import { finishLinearFeatureEditing, getLinearFeatureEditingTargetId, isLinearFeatureEditingActive, startLinearFeatureEditing } from '../interaction/linear-editing.js';

export function groupObjects() {
    if (multiSelectedObjects.length < 2) {
        log('Для группировки нужно выбрать хотя бы два объекта (Ctrl+Click)', 'warn');
        return false;
    }

    const group = new THREE.Group();
    group.name = `Группа (${multiSelectedObjects.length})`;
    group.userData.type = 'group';
    group.userData.draggable = true;

    // Вычисляем центр группы
    const center = new THREE.Vector3();
    multiSelectedObjects.forEach(obj => center.add(obj.position));
    center.divideScalar(multiSelectedObjects.length);
    group.position.copy(center);

    // Добавляем объекты в группу
    multiSelectedObjects.forEach(obj => {
        updateObjectSelectionVisuals(obj, false);
        // Сохраняем мировое положение при переносе в группу
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();
        obj.getWorldPosition(worldPos);
        obj.getWorldQuaternion(worldQuat);
        obj.getWorldScale(worldScale);

        group.add(obj);
        
        // Устанавливаем локальное положение относительно новой группы
        obj.position.copy(worldPos).sub(center);
        // Ориентация и масштаб остаются мировыми, так как у группы они дефолтные (пока)
        obj.quaternion.copy(worldQuat);
        obj.scale.copy(worldScale);
    });

    if (envGroup) envGroup.add(group);
    
    handleDeselection();
    handleSelection(group, window.innerWidth / 2, window.innerHeight / 2, false);
    log(`Объекты объединены в группу`, 'success');
    return true;
}

export function ungroupObject(targetGroup?: THREE.Object3D) {
    const group = targetGroup || selectedObject;
    if (!group || group.userData.type !== 'group') {
        log('Выбранный объект не является группой', 'warn');
        return false;
    }

    const children = [...group.children];
    children.forEach(obj => {
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();
        obj.getWorldPosition(worldPos);
        obj.getWorldQuaternion(worldQuat);
        obj.getWorldScale(worldScale);

        if (envGroup) envGroup.add(obj);
        
        obj.position.copy(worldPos);
        obj.quaternion.copy(worldQuat);
        obj.scale.copy(worldScale);
    });

    group.removeFromParent();
    handleDeselection();
    log(`Группа расформирована`, 'info');
    return true;
}

(window as any).groupObjects = groupObjects;
(window as any).ungroupObject = ungroupObject;
export type { TransformMode, RotationAxis } from './object-transform.js';
export {
    getSceneTopLevelObjects,
    findSceneObjectById,
    isTransformableObject,
    listSceneObjects,
    normalizePoints,
    parsePointsText
} from './object-catalog.js';
export {
    getRotationStepOptions,
    getRotationStepDegrees,
    setRotationStepDegrees,
    rememberSelectedObjectInitialTransform,
    clearSelectedObjectInitialTransform,
    rotateSelectedObjectByDegrees,
    resetSelectedObjectToInitialTransform,
    activateTransformMode
} from './object-transform.js';

export function getSelectedSceneObjectId() {
    return selectedObject ? selectedObject.uuid : null;
}

export function selectSceneObjectById(id: string) {
    const obj = findSceneObjectById(id);
    if (!obj) return false;
    if (isLinearFeatureEditingActive() && !isLinearFeatureEditingActive(id)) {
        finishLinearFeatureEditing(true);
    }
    handleSelection(obj, window.innerWidth / 2, window.innerHeight / 2, false);
    return true;
}

export function setSceneObjectTransformMode(mode: TransformMode, id?: string) {
    const target = id ? findSceneObjectById(id) : selectedObject;
    if (!target) return false;
    if (!selectedObject || selectedObject.uuid !== target.uuid) {
        handleSelection(target, window.innerWidth / 2, window.innerHeight / 2, false);
    }
    return activateTransformMode(mode, target);
}

export function deleteSceneObjectById(id: string) {
    const obj = findSceneObjectById(id);
    let isDrone = false;
    for (const droneId in droneMeshes) {
        if (obj === droneMeshes[droneId]) isDrone = true;
    }
    if (!obj || isDrone) return false;
    handleSelection(obj, window.innerWidth / 2, window.innerHeight / 2, false);
    deleteSelectedObject();
    return true;
}

export function resetDroneToOrigin() {
    const currentDrone = droneMeshes[currentDroneId];
    if (!currentDrone) return false;
    const droneState = drones[currentDroneId];
    
    if (simState.running) {
        log('Нельзя вернуть дрон в начало во время выполнения скрипта', 'warn');
        return false;
    }
    
    droneState.pos = { x: 0, y: 0, z: 0 };
    droneState.orientation = { roll: 0, pitch: 0, yaw: 0 };
    droneState.vel = { x: 0, y: 0, z: 0 };
    droneState.target_alt = 0;
    droneState.target_pos = { x: 0, y: 0, z: 0 };
    droneState.target_yaw = 0;
    droneState.pendingLocalPoint = false;
    currentDrone.position.set(0, 0, 0);
    currentDrone.rotation.set(0, 0, 0, 'ZYX');
    log(`Дрон ${currentDroneId} возвращен в начало системы координат`, 'success');
    
    if (selectedObject === currentDrone && transformControl) {
        transformControl.detach();
        transformControl.attach(currentDrone);
    }
    return true;
}

export function deleteSelectedObject() {
    let isDrone = false;
    for (const id in droneMeshes) {
        if (selectedObject === droneMeshes[id]) isDrone = true;
    }
    
    if (selectedObject && !isDrone) {
        const obj = selectedObject;
        if (isLinearFeatureEditingActive(obj.uuid)) finishLinearFeatureEditing(true);
        handleDeselection();

        obj.traverse((child: any) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((material: THREE.Material) => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
        obj.removeFromParent();
        log('Объект удален', 'info');
    }
}

export function startSelectedLinearObjectEditing() {
    return startLinearFeatureEditing(selectedObject);
}

export function finishSelectedLinearObjectEditing(commit = true) {
    if (!isLinearFeatureEditingActive()) return false;
    return finishLinearFeatureEditing(commit);
}

export function isSelectedLinearObjectEditingActive(id?: string) {
    return isLinearFeatureEditingActive(id);
}

export function getSelectedLinearObjectEditingTargetId() {
    return getLinearFeatureEditingTargetId();
}

export function duplicateObject() {
    let isDrone = false;
    for (const id in droneMeshes) {
        if (selectedObject === droneMeshes[id]) isDrone = true;
    }

    if (selectedObject && !isDrone) {
        const clone = selectedObject.clone();
        clone.position.x += 1;
        clone.position.y += 1;
        if (envGroup) envGroup.add(clone);
        
        handleDeselection();
        handleSelection(clone, window.innerWidth / 2, window.innerHeight / 2, false, false);
        log('Объект дублирован', 'success');
    }
}

export function addObject(
    type: string,
    options: { value?: string; markerDictionary?: string; pointsText?: string; floors?: number; markerMap?: MarkerMapOptions } = {}
) {
    const parsedPoints = options.pointsText ? parsePointsText(options.pointsText) : [];
    const objectOptions: SceneObjectOptions = {
        value: options.value,
        markerDictionary: options.markerDictionary,
        floors: options.floors,
        points: parsedPoints.length >= 2 ? parsedPoints : undefined,
        markerMap: options.markerMap
    };
    const obj = addObjectToScene(type, controls?.camera || null, objectOptions);
    if (obj) {
        handleDeselection();
        handleSelection(obj, window.innerWidth / 2, window.innerHeight / 2, false, false);
        log(`Добавлен объект: ${obj.userData?.type || obj.name}`, 'success');
    } else {
        log(`Не удалось добавить объект типа "${type}"`, 'warn');
    }
}

export function updateSelectedSceneObject(params: { value?: string; markerDictionary?: string; pointsText?: string; floors?: number }) {
    if (!selectedObject || selectedObject.userData?.draggable === false) return false;

    let updated = false;
    if ((params.value !== undefined || params.markerDictionary !== undefined) && selectedObject.userData?.supportsValue) {
        updated = updateSceneObjectValue(selectedObject, {
            value: params.value,
            markerDictionary: params.markerDictionary,
            floors: params.floors
        }) || updated;
    } else if (params.floors !== undefined && selectedObject.userData?.type === 'Многоэтажка') {
        updated = updateSceneObjectValue(selectedObject, {
            floors: params.floors
        }) || updated;
    }

    if (params.pointsText !== undefined && selectedObject.userData?.supportsPoints) {
        const points = parsePointsText(params.pointsText);
        if (points.length < 2) {
            log('Для дороги или рельс нужно минимум 2 точки', 'warn');
            return false;
        }
        updated = updateSceneObjectPoints(selectedObject, points) || updated;
    }

    if (updated) {
        handleSelection(selectedObject, window.innerWidth / 2, window.innerHeight / 2, false);
        log('Параметры объекта обновлены', 'success');
    }

    return updated;
}

export function appendPointToSelectedLinearObject() {
    if (!selectedObject || !selectedObject.userData?.supportsPoints) return false;

    const points = normalizePoints(selectedObject.userData?.points);
    if (points.length < 2) return false;

    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    const dir = new THREE.Vector3(last.x - prev.x, last.y - prev.y, last.z - prev.z);
    if (dir.lengthSq() < 0.0001) dir.set(4, 0, 0);
    dir.normalize().multiplyScalar(5);

    points.push({
        x: last.x + dir.x,
        y: last.y + dir.y,
        z: Math.max(0, last.z + dir.z)
    });

    const ok = updateSceneObjectPoints(selectedObject, points);
    if (ok) {
        handleSelection(selectedObject, window.innerWidth / 2, window.innerHeight / 2, false);
        log('В маршрут добавлена новая точка', 'success');
    }
    return ok;
}
