import * as THREE from 'three';
import {
    COLLISION_SAMPLE_STEP,
    DRONE_COLLISION_RADIUS,
    NON_COLLIDABLE_TYPES
} from './constants.js';
import { OBJECT_TYPE } from '../shared/object-types.js';
import {
    GATE_RING_CENTER_HEIGHT,
    GATE_RING_RADIUS,
    GATE_RING_TUBE_RADIUS,
    GATE_STAND_RADIUS
} from '../shared/gate-geometry.js';

function shouldSkipCollisionForObject(obj: THREE.Object3D) {
    const type = String(obj.userData?.type || obj.name || '');
    return NON_COLLIDABLE_TYPES.has(type);
}

function isGateObject(obj: THREE.Object3D | null | undefined) {
    return String(obj?.userData?.type || obj?.name || '') === OBJECT_TYPE.GATE;
}

function findGateAncestor(obj: THREE.Object3D | null) {
    let current = obj;
    while (current) {
        if (isGateObject(current)) return current;
        current = current.parent;
    }
    return null;
}

export function sampleSegmentPoints(start: THREE.Vector3, end: THREE.Vector3) {
    const distance = start.distanceTo(end);
    const steps = Math.max(1, Math.ceil(distance / COLLISION_SAMPLE_STEP));
    const samples: THREE.Vector3[] = [];
    for (let i = 0; i <= steps; i++) {
        samples.push(start.clone().lerp(end, i / steps));
    }
    return samples;
}

function intersectsExpandedBox(box: THREE.Box3, samples: THREE.Vector3[]) {
    const expanded = box.clone().expandByScalar(DRONE_COLLISION_RADIUS);
    return samples.some((sample) => expanded.containsPoint(sample));
}

function capsuleDistanceToPoint(point: THREE.Vector3, start: THREE.Vector3, end: THREE.Vector3) {
    const segment = end.clone().sub(start);
    const lengthSq = segment.lengthSq();
    if (lengthSq < 1e-6) return point.distanceTo(start);
    const t = THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSq, 0, 1);
    return point.distanceTo(start.clone().add(segment.multiplyScalar(t)));
}

function gateHasCollision(gate: THREE.Object3D, samples: THREE.Vector3[]) {
    const localSamples = samples.map((sample) => gate.worldToLocal(sample.clone()));
    for (const local of localSamples) {
        const leftLegDistance = capsuleDistanceToPoint(
            local,
            new THREE.Vector3(0, -1.13, 0.46),
            new THREE.Vector3(0, -0.21, 0.46)
        );
        const rightLegDistance = capsuleDistanceToPoint(
            local,
            new THREE.Vector3(0, 0.21, 0.46),
            new THREE.Vector3(0, 1.13, 0.46)
        );
        if (leftLegDistance <= GATE_STAND_RADIUS + DRONE_COLLISION_RADIUS || rightLegDistance <= GATE_STAND_RADIUS + DRONE_COLLISION_RADIUS) {
            return true;
        }

        const radial = Math.hypot(local.y, local.z - GATE_RING_CENTER_HEIGHT);
        const torusTubeDistance = Math.hypot(radial - GATE_RING_RADIUS, local.x) - GATE_RING_TUBE_RADIUS;
        if (torusTubeDistance <= DRONE_COLLISION_RADIUS) {
            return true;
        }
    }
    return false;
}

export function obstacleHasCollision(obj: THREE.Object3D, samples: THREE.Vector3[]) {
    if (isGateObject(obj)) {
        return gateHasCollision(obj, samples);
    }
    if (shouldSkipCollisionForObject(obj)) return false;

    const nestedGates: THREE.Object3D[] = [];
    obj.traverse((node) => {
        if (node !== obj && isGateObject(node)) {
            nestedGates.push(node);
        }
    });
    for (const gate of nestedGates) {
        if (gateHasCollision(gate, samples)) {
            return true;
        }
    }

    let hit = false;
    obj.updateWorldMatrix(true, true);
    obj.traverse((node: any) => {
        if (hit || !node.isMesh || !node.visible) return;
        if (findGateAncestor(node.parent)) return;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (material && 'opacity' in material && material.opacity !== undefined && material.opacity < 0.2) return;
        const box = new THREE.Box3().setFromObject(node);
        if (!box.isEmpty() && intersectsExpandedBox(box, samples)) {
            hit = true;
        }
    });
    return hit;
}
