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

    obj.updateWorldMatrix(true, true);
    if ((obj as THREE.Mesh).isMesh && obj.visible && meshBlocks(obj as THREE.Mesh, samples)) return true;
    return meshesHit(obj, samples);
}

/*
 * Walks the object's own meshes, but not into a nested part that is itself
 * a non-collidable type: a preset scene is one group whose children include
 * start positions, roads, rails and pads, and checking only the preset's own
 * top-level type let those flat parts count as walls - a drone taking off
 * from a preset's start position crashed at 10 cm. Gates are skipped here
 * because obstacleHasCollision already tested them with their real shape.
 */
function meshesHit(node: THREE.Object3D, samples: THREE.Vector3[]): boolean {
    for (const child of node.children) {
        if (!child.visible) continue;
        if (isGateObject(child) || shouldSkipCollisionForObject(child)) continue;
        if ((child as THREE.Mesh).isMesh && meshBlocks(child as THREE.Mesh, samples)) return true;
        if (meshesHit(child, samples)) return true;
    }
    return false;
}

// Anything that doesn't rise above this is ground markings (marker sheets,
// marker maps, decals): something to land on, not to crash into. Hitting
// the ground itself is handled by the ground-impact physics.
const FLAT_SURFACE_MAX_TOP = 0.08;

function meshBlocks(mesh: THREE.Mesh, samples: THREE.Vector3[]): boolean {
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (material && 'opacity' in material && material.opacity !== undefined && material.opacity < 0.2) return false;
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty() || box.max.z <= FLAT_SURFACE_MAX_TOP) return false;
    return intersectsExpandedBox(box, samples);
}
