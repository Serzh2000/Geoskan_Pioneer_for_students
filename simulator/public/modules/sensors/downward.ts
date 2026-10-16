import * as THREE from 'three';
import { envGroup } from '../environment/index.js';
import { worldPlanarToBody } from '../physics/frames.js';
import type { DroneState } from '../core/state.js';

/*
 * What the drone's downward-looking sensors see: the distance to whatever
 * surface is straight below (ground, a roof, the roof of a moving train)
 * and how fast that surface moves. Shared by the rangefinder (Sensors.range,
 * Sensors.tof, get_dist_sensor_data) and the optical-flow sensor.
 */

const raycaster = new THREE.Raycaster();
const DOWN = new THREE.Vector3(0, 0, -1);

export type SurfaceBelow = {
    /** Distance from the drone down to the surface, m. */
    range: number;
    /** World velocity of that surface (non-zero over a moving vehicle), m/s. */
    velocity: THREE.Vector3;
    /** True when it's a car / train roof rather than the ground or a building. */
    onVehicle: boolean;
};

function vehicleUnitOf(node: THREE.Object3D | null): THREE.Object3D | null {
    while (node) {
        if (node.userData?.vehicleUnitIndex !== undefined) return node;
        node = node.parent;
    }
    return null;
}

export function measureSurfaceBelow(position: { x: number; y: number; z: number }): SurfaceBelow {
    const ground: SurfaceBelow = { range: Math.max(0, position.z), velocity: new THREE.Vector3(), onVehicle: false };
    if (!envGroup || position.z <= 0) return ground;

    raycaster.set(new THREE.Vector3(position.x, position.y, position.z), DOWN);
    raycaster.far = position.z + 0.05;
    for (const hit of raycaster.intersectObjects(envGroup.children, true)) {
        const mesh = hit.object as THREE.Mesh;
        if (!mesh.isMesh || !mesh.visible) continue;
        const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        if (material && 'opacity' in material && material.transparent && (material.opacity ?? 1) < 0.2) continue;
        const unit = vehicleUnitOf(mesh);
        return {
            range: Math.max(0, hit.distance),
            velocity: (unit?.userData.velocity as THREE.Vector3 | undefined)?.clone() ?? new THREE.Vector3(),
            onVehicle: !!unit
        };
    }
    return ground;
}

// ---------------------------------------------------------------- optical flow

export type OpticalFlowReading = {
    /** Angular flow rate along the drone's forward axis, rad/s. */
    flowX: number;
    /** Angular flow rate along the drone's right axis, rad/s. */
    flowY: number;
    /** 0..255, like the PMW3901: 0 means "don't trust this sample". */
    quality: number;
    /** Distance to the surface the flow was measured on, m. */
    range: number;
};

const MIN_RANGE = 0.08;          // PMW3901 needs ~8 cm focus distance
const FULL_QUALITY_RANGE = 3.0;
const MAX_RANGE = 6.0;
const NOISE_STD = 0.015;         // rad/s
const SCALE_NOISE = 0.03;        // ±3 % gain error

function gaussian() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/*
 * Model of a downward optical-flow sensor such as the PMW3901 on Pioneer:
 * it sees the texture below slide by, so it measures the drone's motion
 * relative to that surface divided by the height - plus the drone's own
 * rotation (tilting makes the ground appear to move too). Over a moving
 * train the relative motion is drone minus train: hovering exactly above
 * the roof reads ~0.
 *
 *   flowX ≈ v_forward_rel / h + pitch_rate
 *   flowY ≈ v_right_rel   / h - roll_rate
 *
 * so the relative velocity is  v_rel ≈ (flow - rotation) * h.
 * Readings are noisy, and quality drops too close or too high.
 */
export function readOpticalFlow(drone: DroneState): OpticalFlowReading {
    const surface = measureSurfaceBelow(drone.pos);
    const h = surface.range;
    if (h < MIN_RANGE || h > MAX_RANGE) return { flowX: 0, flowY: 0, quality: 0, range: h };

    const relative = worldPlanarToBody(
        drone.vel.x - surface.velocity.x,
        drone.vel.y - surface.velocity.y,
        drone.orientation.yaw
    );
    const gain = 1 + (Math.random() * 2 - 1) * SCALE_NOISE;
    const flowX = (relative.forward / h) * gain + (drone.gyro?.y ?? 0) + gaussian() * NOISE_STD;
    const flowY = (relative.right / h) * gain - (drone.gyro?.x ?? 0) + gaussian() * NOISE_STD;

    const quality = h <= FULL_QUALITY_RANGE
        ? 255
        : Math.round(255 - (h - FULL_QUALITY_RANGE) / (MAX_RANGE - FULL_QUALITY_RANGE) * 195);

    return { flowX, flowY, quality, range: h };
}
