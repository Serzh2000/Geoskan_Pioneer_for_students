import * as THREE from 'three';
import { log } from '../../shared/logging/logger.js';
import { envGroup } from '../../environment/index.js';
import { droneMeshes, raycaster, scene } from '../core/scene-init.js';
import { OBJECT_TYPE } from '../../shared/object-types.js';

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const CLICK_TRACE_PREFIX = '[3D-CLICK]';

export function traceClick(message: string, level: 'info' | 'warn' = 'info') {
    const fullMessage = `${CLICK_TRACE_PREFIX} ${message}`;
    if (level === 'warn') console.warn(fullMessage);
    log(fullMessage, level);
}

export function getRootSceneObject(object: THREE.Object3D) {
    let current: THREE.Object3D | null = object;
    let presetComponent: THREE.Object3D | null = null;
    while (current?.parent && current.parent !== scene && current.parent !== envGroup) {
        // Pick the most specific editable entity inside a preset. Decorative
        // meshes and fixed marker-map cells belong to their parent entity.
        if (!presetComponent && current.userData?.type && current.userData?.draggable) {
            presetComponent = current;
        }
        if (current.parent.userData?.presetName) return presetComponent || current;
        current = current.parent;
    }
    return current || object;
}

export function isGroundObject(object: THREE.Object3D | null | undefined) {
    let current: THREE.Object3D | null | undefined = object;
    while (current) {
        if (current.name === 'Ground' || current.userData?.type === OBJECT_TYPE.GROUND) return true;
        current = current.parent;
    }
    return false;
}

export function isDroneObject(object: THREE.Object3D | null | undefined) {
    if (!object) return false;
    for (const id in droneMeshes) {
        if (object === droneMeshes[id]) return true;
    }
    return false;
}

export function getGroundPointFromPointer() {
    const point = new THREE.Vector3();
    return raycaster.ray.intersectPlane(groundPlane, point) ? point : null;
}

export function getObjectDisplayName(obj: THREE.Object3D) {
    return obj.name || obj.userData?.type || obj.type || 'Объект';
}

export function collectPointerTargets() {
    const targets: THREE.Object3D[] = [];
    for (const id in droneMeshes) {
        if (droneMeshes[id]) targets.push(droneMeshes[id]);
    }
    if (envGroup) {
        for (const child of envGroup.children) {
            if (child.visible) targets.push(child);
        }
    }
    const ground = scene ? scene.getObjectByName('Ground') : null;
    if (ground) targets.push(ground);
    return targets;
}
