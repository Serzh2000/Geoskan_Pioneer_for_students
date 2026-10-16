import type * as THREE from 'three';
import type { DroneState } from '../core/state.js';
import { isDroneAirborneState } from '../autopilot/fsm.js';

// Физика не должна статически зависеть от drone/index.ts (сцена/Three.js) —
// список препятствий приходит извне как параметр, а не через прямой импорт.
export type ObstacleProvider = () => THREE.Object3D[];

export const PHYSICS_TUNING = {
    STABILIZE_MAX_TILT: 0.8,
    ALTHOLD_MAX_TILT: 0.65,
    LOITER_VISUAL_TILT_GAIN: 0.14,
    LOITER_VISUAL_TILT_LIMIT: 0.55,
    AUTO_MAX_TILT: 0.55,
    AUTO_TILT_GAIN: 0.14,
    AUTO_TILT_RESPONSE: 14.0,
    STICK_DEADZONE: 0.04,
    MAX_YAW_RATE: 2.8,
    STABILIZE_MAX_BODY_SPEED: 8.0,
    ALTHOLD_MAX_BODY_SPEED: 5.5,
    LOITER_MAX_BODY_SPEED: 3.5,
    STABILIZE_MAX_CLIMB_RATE: 6.0,
    ALTHOLD_MAX_CLIMB_RATE: 3.5,
    LOITER_MAX_CLIMB_RATE: 2.2,
    STABILIZE_BODY_ACCEL: 16.0,
    ALTHOLD_BODY_ACCEL: 12.0,
    LOITER_BODY_ACCEL: 9.0,
    MANUAL_VERTICAL_ACCEL: 10.0
};

export function applyDeadzone(value: number) {
    return Math.abs(value) < PHYSICS_TUNING.STICK_DEADZONE ? 0 : value;
}

export function clampStick(channel: number) {
    return Math.max(-1, Math.min(1, (channel - 1500) / 500));
}

export function normalizeThrottle(channel: number) {
    return Math.max(0, Math.min(1, (channel - 1000) / 1000));
}

export function approach(current: number, target: number, maxDelta: number) {
    if (current < target) return Math.min(current + maxDelta, target);
    if (current > target) return Math.max(current - maxDelta, target);
    return current;
}

export function isDroneFlying(simState: DroneState) {
    return isDroneAirborneState(simState);
}
