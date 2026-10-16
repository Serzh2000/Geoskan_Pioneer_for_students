import type { DroneState, Vector3 } from '../core/state.js';
import { completeLanding, setDroneFsmState } from '../autopilot/fsm.js';
import { triggerLuaCallback } from '../lua/index.js';
import { log } from '../shared/logging/logger.js';
import {
    applyCrashState,
    shouldCrashOnGroundImpact
} from './events.js';

function stopDroneAtGround(simState: DroneState) {
    setDroneFsmState(simState, 'IDLE');
    simState.vel = { x: 0, y: 0, z: 0 };
    simState.target_pos = { ...simState.pos, z: 0 };
    simState.target_alt = 0;
}

export function resolveGroundContact(simState: DroneState, id: string, prevPos: Vector3) {
    if (simState.pos.z > 0) return;

    const verticalImpactSpeed = Math.max(0, -simState.vel.z);
    const totalImpactSpeed = Math.sqrt(
        simState.vel.x ** 2
        + simState.vel.y ** 2
        + simState.vel.z ** 2
    );

    simState.pos.z = 0;

    if (shouldCrashOnGroundImpact(prevPos.z, verticalImpactSpeed, totalImpactSpeed)) {
        applyCrashState(
            simState,
            id,
            `жесткий удар о землю: h=${prevPos.z.toFixed(2)}м, vz=${verticalImpactSpeed.toFixed(2)}м/с, v=${totalImpactSpeed.toFixed(2)}м/с`
        );
        return;
    }

    if (simState.fsmState === 'LANDING_PROCESS') {
        completeLanding(simState);
        stopDroneAtGround(simState);
        triggerLuaCallback(id, 7);
        return;
    }

    stopDroneAtGround(simState);
}

export function updateDisarmedFallState(simState: DroneState, id: string, dt: number, prevPos: Vector3) {
    const impactVel = { ...simState.vel };
    simState.vel.z -= 9.81 * dt;
    simState.pos.x += simState.vel.x * dt;
    simState.pos.y += simState.vel.y * dt;
    simState.pos.z += simState.vel.z * dt;

    if (simState.pos.z > 0) return;

    const verticalImpactSpeed = Math.max(0, -impactVel.z);
    const totalImpactSpeed = Math.sqrt(
        impactVel.x ** 2
        + impactVel.y ** 2
        + impactVel.z ** 2
    );
    simState.pos.z = 0;

    if (shouldCrashOnGroundImpact(prevPos.z, verticalImpactSpeed, totalImpactSpeed)) {
        simState.status = 'CRASHED';
        simState.running = false;
        simState.target_pos = { ...simState.pos };
        simState.target_alt = 0;
        simState.vel = { x: 0, y: 0, z: 0 };
        log(
            `[Physics] Дрон ${id} разрушен при ударе о землю: h=${prevPos.z.toFixed(2)}м, vz=${verticalImpactSpeed.toFixed(2)}м/с, v=${totalImpactSpeed.toFixed(2)}м/с.`,
            'warn'
        );
        triggerLuaCallback(id, 16);
        return;
    }

    stopDroneAtGround(simState);
    log(
        `[Physics] Дрон ${id} безопасно отключен после падения: h=${prevPos.z.toFixed(2)}м, vz=${verticalImpactSpeed.toFixed(2)}м/с.`,
        'info'
    );
}

export function updateCrashedState(simState: DroneState, dt: number) {
    simState.vel.z -= 9.81 * dt;
    simState.pos.x += simState.vel.x * dt;
    simState.pos.y += simState.vel.y * dt;
    simState.pos.z += simState.vel.z * dt;

    if (simState.pos.z <= 0) {
        simState.pos.z = 0;
        simState.vel = { x: 0, y: 0, z: 0 };
    }
}

export function updateGroundedState(simState: DroneState, dt: number) {
    if (simState.pos.z > 0) {
        simState.vel.z -= 9.81 * dt;
        simState.pos.z += simState.vel.z * dt;
        if (simState.pos.z <= 0) {
            simState.pos.z = 0;
            simState.vel.z = 0;
        }
    } else {
        simState.pos.z = 0;
        simState.vel.z = 0;
    }
    simState.vel.x = 0;
    simState.vel.y = 0;
    simState.orientation.pitch = 0;
    simState.orientation.roll = 0;
}
