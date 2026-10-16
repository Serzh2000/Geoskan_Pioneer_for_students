import * as THREE from 'three';
import { distanceToWater, trainingHeightAt } from '../environment/training/world-plan.js';
import type { TrainingLayout } from '../environment/training/layout.js';
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
import {
    clampFpvCubeHeight,
    fpvCubeFrameCentre,
    FPV_CUBE_FRAMES,
    FPV_CUBE_FRAME_SIZE,
    FPV_CUBE_FRAME_THICKNESS,
    FPV_CUBE_LEG_INSET,
    FPV_CUBE_LEG_RADIUS,
    FPV_CUBE_OPENING
} from '../shared/fpv-cube-geometry.js';

function shouldSkipCollisionForObject(obj: THREE.Object3D) {
    if (obj.userData?.collidable === false) return true;
    const type = String(obj.userData?.type || obj.name || '');
    return NON_COLLIDABLE_TYPES.has(type);
}

function isGateObject(obj: THREE.Object3D | null | undefined) {
    return String(obj?.userData?.type || obj?.name || '') === OBJECT_TYPE.GATE;
}

function isFpvCubeObject(obj: THREE.Object3D | null | undefined) {
    return String(obj?.userData?.type || obj?.name || '') === OBJECT_TYPE.FPV_CUBE;
}

/** Props whose solid shape is not their mesh: they are tested by their own function and skipped by the generic mesh walk. */
function hasCustomCollisionShape(obj: THREE.Object3D | null | undefined) {
    return isGateObject(obj) || isFpvCubeObject(obj);
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

/**
 * The FPV cube is four fabric frames and a stand, hollow in between: a drone may fly through any of the four square
 * openings, but hits the border of a frame or a leg. Sample points are tested in the cube's own coordinates.
 */
function fpvCubeHasCollision(cube: THREE.Object3D, samples: THREE.Vector3[]) {
    const height = clampFpvCubeHeight(cube.userData?.fpvCubeHeight);
    const centre = fpvCubeFrameCentre(height);
    const half = FPV_CUBE_FRAME_SIZE / 2;
    const openHalf = FPV_CUBE_OPENING / 2;
    const reach = DRONE_COLLISION_RADIUS;
    const legTop = centre - half;
    for (const sample of samples) {
        const local = cube.worldToLocal(sample.clone());
        for (const sx of [-1, 1]) {
            for (const sy of [-1, 1]) {
                const leg = capsuleDistanceToPoint(
                    local,
                    new THREE.Vector3(sx * FPV_CUBE_LEG_INSET, sy * FPV_CUBE_LEG_INSET, 0),
                    new THREE.Vector3(sx * FPV_CUBE_LEG_INSET, sy * FPV_CUBE_LEG_INSET, legTop)
                );
                if (leg <= FPV_CUBE_LEG_RADIUS + reach) return true;
            }
        }
        const v = local.z - centre;
        for (const frame of FPV_CUBE_FRAMES) {
            const across = frame.normal === 'y' ? local.y - frame.offset : local.x - frame.offset;
            if (Math.abs(across) > FPV_CUBE_FRAME_THICKNESS / 2 + reach) continue;
            const u = frame.normal === 'y' ? local.x : local.y;
            const inFrame = Math.abs(u) <= half + reach && Math.abs(v) <= half + reach;
            // The opening is open only where the drone fits: its radius is taken off every side.
            const throughOpening = Math.abs(u) < openHalf - reach && Math.abs(v) < openHalf - reach;
            if (inFrame && !throughOpening) return true;
        }
    }
    return false;
}

export function obstacleHasCollision(obj: THREE.Object3D, samples: THREE.Vector3[]) {
    if (isGateObject(obj)) {
        return gateHasCollision(obj, samples);
    }
    if (isFpvCubeObject(obj)) {
        return fpvCubeHasCollision(obj, samples);
    }
    if (shouldSkipCollisionForObject(obj)) return false;

    const nested: THREE.Object3D[] = [];
    obj.traverse((node) => {
        if (node !== obj && hasCustomCollisionShape(node)) {
            nested.push(node);
        }
    });
    for (const part of nested) {
        if (isFpvCubeObject(part) ? fpvCubeHasCollision(part, samples) : gateHasCollision(part, samples)) {
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
const FAR_PROP_DISTANCE = 60;      // the biggest prop (the mall) is about 25 m across from its centre
const farProbe = new THREE.Vector3();

function meshesHit(node: THREE.Object3D, samples: THREE.Vector3[]): boolean {
    for (const child of node.children) {
        if (!child.visible) continue;
        // A training map holds thousands of props: those far from the drone cannot touch it, so skip them cheaply
        // instead of building their bounding boxes every physics step.
        if (child.userData.presetSlot !== undefined && samples.length) {
            child.getWorldPosition(farProbe);
            if (farProbe.distanceTo(samples[0]) > FAR_PROP_DISTANCE) continue;
        }
        if (hasCustomCollisionShape(child) || shouldSkipCollisionForObject(child)) continue;
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
    if (mesh.userData.trainingGround) {
        const layout = mesh.userData.trainingGround as TrainingLayout;
        const scale = mesh.getWorldScale(new THREE.Vector3());
        const radius = DRONE_COLLISION_RADIUS / Math.max(.001, Math.min(scale.x, scale.y, scale.z));
        return samples.some(sample => {
            const local = mesh.worldToLocal(sample.clone());
            if (Math.max(Math.abs(local.x), Math.abs(local.y)) > layout.size / 2) return false;
            if (distanceToWater(layout, local) === 0 && local.z < radius) return true;
            const height = trainingHeightAt(layout, local.x, local.y);
            return height > FLAT_SURFACE_MAX_TOP && local.z < height + radius;
        });
    }
    if (mesh.userData.trainingTrees) {
        const trees = mesh.userData.trainingTrees as Array<{x:number;y:number;z:number;radius:number;height:number}>;
        const scale = mesh.getWorldScale(new THREE.Vector3());
        const radius = DRONE_COLLISION_RADIUS / Math.max(.001, Math.min(scale.x, scale.y, scale.z));
        return samples.some(sample => {
            const local = mesh.worldToLocal(sample.clone());
            return trees.some(tree => local.z >= tree.z - radius && local.z <= tree.z + tree.height + radius
                && Math.hypot(local.x - tree.x, local.y - tree.y) <= tree.radius + radius);
        });
    }
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (material && 'opacity' in material && material.opacity !== undefined && material.opacity < 0.2) return false;
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty() || box.max.z <= FLAT_SURFACE_MAX_TOP) return false;
    return intersectsExpandedBox(box, samples);
}
