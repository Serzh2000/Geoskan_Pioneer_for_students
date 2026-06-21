import * as THREE from 'three';
import { getAutopilotRuntimeConfig } from '../autopilot/params-runtime.js';
import type { DroneState } from '../core/state.js';
import { completePointReached, completeTakeoff, isMovementReached } from '../autopilot/fsm.js';
import { triggerLuaCallback } from '../lua/index.js';
import { getObstacles } from '../drone/index.js';
import { log } from '../shared/logging/logger.js';
import { obstacleHasCollision, sampleSegmentPoints } from './collisions.js';

export const AIRBORNE_ALTITUDE_EPSILON = 0.1;
export const GROUND_IMPACT_MIN_HEIGHT = 0.5;
export const GROUND_IMPACT_VERTICAL_SPEED_THRESHOLD = 5.0;
export const GROUND_IMPACT_TOTAL_SPEED_THRESHOLD = 7.0;

export function beginDisarmedFall(simState: DroneState, id: string, reason: string) {
    if (simState.status === 'CRASHED' || simState.status === 'DISARMED_FALL') return;

    simState.status = 'DISARMED_FALL';
    simState.fsmState = 'IDLE';
    simState.running = false;
    simState.pendingLocalPoint = false;
    simState.pendingLocalPointSource = null;
    simState.pendingLocalPointTarget = null;
    simState.pointReachedFlag = false;
    simState.command_queue = [];
    simState.target_pos = { ...simState.pos };
    simState.target_alt = simState.pos.z;

    log(`[Physics] Дрон ${id}: ${reason}`, 'warn');
}

export function shouldCrashOnGroundImpact(fallHeight: number, verticalSpeed: number, totalSpeed: number) {
    if (fallHeight < GROUND_IMPACT_MIN_HEIGHT) return false;

    const shockAccel = getAutopilotRuntimeConfig().safety.shockAccel;
    const effectiveVerticalThreshold = GROUND_IMPACT_VERTICAL_SPEED_THRESHOLD * Math.max(0.35, shockAccel / 2);
    const effectiveTotalThreshold = GROUND_IMPACT_TOTAL_SPEED_THRESHOLD * Math.max(0.35, shockAccel / 2);

    return (
        verticalSpeed >= effectiveVerticalThreshold
        || totalSpeed >= effectiveTotalThreshold
    );
}

export function applyCrashState(simState: DroneState, id: string, reason: string) {
    if (simState.status === 'CRASHED') return;

    const bounceX = -0.7;
    const bounceY = -0.7;
    const minBounce = 1.5;

    simState.vel.x = (Math.abs(simState.vel.x) < 0.5) ? (Math.random() - 0.5) * minBounce : simState.vel.x * bounceX;
    simState.vel.y = (Math.abs(simState.vel.y) < 0.5) ? (Math.random() - 0.5) * minBounce : simState.vel.y * bounceY;
    simState.vel.z = Math.abs(simState.vel.z) * 0.5 + 2.5;

    simState.status = 'CRASHED';
    simState.fsmState = 'IDLE';
    simState.running = false;
    simState.pendingLocalPoint = false;
    simState.pendingLocalPointSource = null;
    simState.pendingLocalPointTarget = null;
    simState.pointReachedFlag = false;
    simState.command_queue = [];
    simState.target_pos = { ...simState.pos };
    simState.target_alt = simState.pos.z;
    
    // Останавливаем вращение и инерцию при сильном ударе, 
    // но даем упасть если это произошло в воздухе (логика в physics.ts)
    if (simState.pos.z < 0.1) {
        simState.vel = { x: 0, y: 0, z: 0 };
    }
    
    triggerLuaCallback(id, 16);
    log(`[Physics] Дрон ${id} разбился: ${reason}`, 'warn');
}

export function checkPhysicsEvents(simState: DroneState, prevPos: { x: number; y: number; z: number }) {
    if (
        simState.status === 'CRASHED'
        || simState.status === 'IDLE'
        || simState.status === 'PREFLIGHT'
        || simState.status === 'ОШИБКА'
        || simState.status === 'DISARMED_FALL'
    ) {
        return;
    }

    const id = simState.id;
    const obstacles = getObstacles();
    const start = new THREE.Vector3(prevPos.x, prevPos.y, prevPos.z);
    const end = new THREE.Vector3(simState.pos.x, simState.pos.y, simState.pos.z);
    const samples = sampleSegmentPoints(start, end);
    for (const obj of obstacles) {
        if (!obj.userData || !obj.userData.type) continue;

        const isNotJustTakingOff = simState.pos.z > 0.1 || prevPos.z > 0.1;
        if (isNotJustTakingOff && obstacleHasCollision(obj, samples)) {
            simState.pos = { ...prevPos };
            applyCrashState(simState, id, `столкновение с объектом "${obj.userData.type}"`);
            return;
        }
    }

    if (simState.fsmState === 'TAKEOFF_PROCESS' && Math.abs(simState.pos.z - simState.target_pos.z) < 0.1) {
        completeTakeoff(simState);
        triggerLuaCallback(id, 6);
        if (simState.pointReachedFlag) {
            triggerLuaCallback(id, 10);
        }
    }

    if (simState.fsmState === 'FLYING_MOVING' && isMovementReached(simState)) {
        if (completePointReached(simState)) {
            triggerLuaCallback(id, 10);
        }
    }
}
