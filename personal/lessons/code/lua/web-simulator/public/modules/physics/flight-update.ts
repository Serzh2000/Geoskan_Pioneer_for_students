import type * as THREE from 'three';
import { getAutopilotRuntimeConfig } from '../autopilot/params-runtime.js';
import type { DroneState } from '../core/state.js';
import { showMissionGamepadOverrideNotice } from '../app/script-execution-notice.js';
import { enterPreflight, enterTakeoffProcess, setDroneFsmState } from '../autopilot/fsm.js';
import { matchesAuxRange, simSettings } from '../core/state.js';
import { triggerLuaCallback } from '../lua/index.js';
import {
    AIRBORNE_ALTITUDE_EPSILON,
    beginDisarmedFall
} from './events.js';
import {
    MANUAL_TAKEOFF_ALTITUDE,
    MANUAL_TAKEOFF_THROTTLE
} from './constants.js';
import { bodyPlanarToWorld, worldPlanarToBody } from './frames.js';
import {
    PHYSICS_TUNING,
    applyDeadzone,
    approach,
    clampStick,
    normalizeThrottle
} from './helpers.js';

type ObstacleProvider = () => THREE.Object3D[];

function isAutonomousMissionControlling(simState: DroneState) {
    return simState.running && (
        simState.fsmState === 'TAKEOFF_PROCESS'
        || simState.fsmState === 'FLYING_HOVER'
        || simState.fsmState === 'FLYING_MOVING'
        || simState.fsmState === 'LANDING_PROCESS'
    );
}

function updateFlightModeFromRc(simState: DroneState, id: string, isFlying: boolean) {
    if (!simSettings.gamepadConnected) return;

    const ch5 = simState.rcChannels[4];
    if (matchesAuxRange(ch5, simSettings.gamepadModeRanges.loiter)) simState.flightMode = 'LOITER';
    else if (matchesAuxRange(ch5, simSettings.gamepadModeRanges.althold)) simState.flightMode = 'ALTHOLD';
    else if (matchesAuxRange(ch5, simSettings.gamepadModeRanges.stabilize)) simState.flightMode = 'STABILIZE';

    const ch6 = simState.rcChannels[5];
    const armActive = matchesAuxRange(ch6, simSettings.gamepadAuxRanges.arm);
    const isAirborne = simState.pos.z > AIRBORNE_ALTITUDE_EPSILON;
    if (armActive && simState.fsmState === 'IDLE' && simState.status !== 'DISARMED_FALL') {
        if (enterPreflight(simState)) {
            // Manual arming should stay latched while the arm switch remains active.
            simState.preflightDeadlineMs = null;
            triggerLuaCallback(id, 11);
        }
    } else if (!armActive && (simState.fsmState === 'PREFLIGHT' || isFlying)) {
        if (isAirborne) {
            beginDisarmedFall(simState, id, 'DISARM в воздухе: двигатели отключены, начинается свободное падение.');
        } else {
            setDroneFsmState(simState, 'IDLE');
            simState.vel = { x: 0, y: 0, z: 0 };
            simState.target_pos = { ...simState.pos, z: 0 };
            simState.target_alt = 0;
        }
    }

    const throttle = simState.rcChannels[2];
    if (armActive && simState.fsmState === 'PREFLIGHT' && throttle >= MANUAL_TAKEOFF_THROTTLE) {
        enterTakeoffProcess(simState);
    }
}

function updateManualFlight(simState: DroneState, dt: number, getObstacles: ObstacleProvider) {
    const config = getAutopilotRuntimeConfig();
    const rollInput = applyDeadzone(clampStick(simState.rcChannels[0]));
    const pitchInput = applyDeadzone(clampStick(simState.rcChannels[1]));
    const throttleInput = normalizeThrottle(simState.rcChannels[2]);
    const yawInput = applyDeadzone(clampStick(simState.rcChannels[3]));

    const roll = Math.max(-1, Math.min(1, rollInput * config.manual.attScale));
    const pitch = Math.max(-1, Math.min(1, pitchInput * config.manual.attScale));
    const yaw = Math.max(-1, Math.min(1, yawInput * (config.manual.yawScale / 3)));
    const throttleCentered = config.manual.throttleMode === 0 ? throttleInput : Math.max(0, Math.min(1, (throttleInput - 0.5) * 2));
    const throttle = Math.max(0, Math.min(1, throttleCentered));

    let maxBodySpeed = PHYSICS_TUNING.STABILIZE_MAX_BODY_SPEED;
    let maxClimbRate = PHYSICS_TUNING.STABILIZE_MAX_CLIMB_RATE;
    let bodyAccel = PHYSICS_TUNING.STABILIZE_BODY_ACCEL;
    let targetTiltLimit = PHYSICS_TUNING.STABILIZE_MAX_TILT;

    if (simState.flightMode === 'ALTHOLD') {
        maxBodySpeed = PHYSICS_TUNING.ALTHOLD_MAX_BODY_SPEED * config.manual.velScale;
        maxClimbRate = PHYSICS_TUNING.ALTHOLD_MAX_CLIMB_RATE * config.manual.vzScale;
        bodyAccel = PHYSICS_TUNING.ALTHOLD_BODY_ACCEL;
        targetTiltLimit = PHYSICS_TUNING.ALTHOLD_MAX_TILT;
    } else if (simState.flightMode === 'LOITER') {
        maxBodySpeed = PHYSICS_TUNING.LOITER_MAX_BODY_SPEED * config.manual.velScale;
        maxClimbRate = PHYSICS_TUNING.LOITER_MAX_CLIMB_RATE * config.manual.vzScale;
        bodyAccel = PHYSICS_TUNING.LOITER_BODY_ACCEL;
        targetTiltLimit = PHYSICS_TUNING.LOITER_VISUAL_TILT_LIMIT;
    } else {
        maxBodySpeed = PHYSICS_TUNING.STABILIZE_MAX_BODY_SPEED * config.manual.attScale;
        maxClimbRate = PHYSICS_TUNING.STABILIZE_MAX_CLIMB_RATE * config.manual.vzScale;
    }

    const currentBodyVelocity = worldPlanarToBody(simState.vel.x, simState.vel.y, simState.orientation.yaw);
    const targetBodyForwardSpeed = pitch * maxBodySpeed;
    const targetBodyRightSpeed = roll * maxBodySpeed;
    const nextBodyForwardSpeed = approach(currentBodyVelocity.forward, targetBodyForwardSpeed, bodyAccel * dt);
    const nextBodyRightSpeed = approach(currentBodyVelocity.right, targetBodyRightSpeed, bodyAccel * dt);
    const targetVerticalSpeed = ((throttle - 0.5) * 2) * maxClimbRate;

    simState.orientation.yaw -= yaw * PHYSICS_TUNING.MAX_YAW_RATE * dt;

    simState.vel.z = approach(simState.vel.z, targetVerticalSpeed, PHYSICS_TUNING.MANUAL_VERTICAL_ACCEL * dt);
    if (simState.flightMode === 'LOITER') {
        let terrainAlt = 0;
        const obstacles = getObstacles();
        for (const obj of obstacles) {
            if (
                obj.position.z < simState.pos.z
                && Math.abs(obj.position.x - simState.pos.x) < 0.5
                && Math.abs(obj.position.y - simState.pos.y) < 0.5
            ) {
                terrainAlt = Math.max(terrainAlt, obj.position.z + 0.5);
            }
        }
        if (simState.pos.z <= terrainAlt && simState.vel.z < 0) {
            simState.vel.z = 0;
            simState.pos.z = terrainAlt;
        }
    }

    const targetWorldVelocity = bodyPlanarToWorld(
        nextBodyRightSpeed,
        nextBodyForwardSpeed,
        simState.orientation.yaw
    );

    simState.vel.x = targetWorldVelocity.x;
    simState.vel.y = targetWorldVelocity.y;
    simState.pos.x += simState.vel.x * dt;
    simState.pos.y += simState.vel.y * dt;
    simState.pos.z += simState.vel.z * dt;

    if (simState.flightMode === 'LOITER') {
        simState.orientation.pitch = Math.max(
            -PHYSICS_TUNING.LOITER_VISUAL_TILT_LIMIT,
            Math.min(PHYSICS_TUNING.LOITER_VISUAL_TILT_LIMIT, nextBodyForwardSpeed * PHYSICS_TUNING.LOITER_VISUAL_TILT_GAIN)
        );
        simState.orientation.roll = Math.max(
            -PHYSICS_TUNING.LOITER_VISUAL_TILT_LIMIT,
            Math.min(PHYSICS_TUNING.LOITER_VISUAL_TILT_LIMIT, nextBodyRightSpeed * PHYSICS_TUNING.LOITER_VISUAL_TILT_GAIN)
        );
    } else {
        const tiltGain = targetTiltLimit / Math.max(0.001, maxBodySpeed);
        simState.orientation.pitch = Math.max(-targetTiltLimit, Math.min(targetTiltLimit, nextBodyForwardSpeed * tiltGain));
        simState.orientation.roll = Math.max(-targetTiltLimit, Math.min(targetTiltLimit, nextBodyRightSpeed * tiltGain));
    }

    simState.target_pos = { ...simState.pos };
    simState.target_alt = simState.pos.z;
    simState.target_yaw = simState.orientation.yaw;
}

function updateAutoFlight(simState: DroneState, dt: number) {
    const config = getAutopilotRuntimeConfig();
    const kp = Math.max(1.2, Math.min(6.5, 2.4 + config.tuning.xyRateKp * 18));
    const kd = Math.max(0.8, Math.min(5.5, 1.1 + config.tuning.xyRateKi * 0.07));
    const kpYaw = Math.max(2.5, Math.min(7.5, 2.5 + config.manual.yawScale * 0.7));
    let upwardVelocityLimit = config.mission.vUp;
    let downwardVelocityLimit = config.mission.vDown;

    if (simState.fsmState === 'TAKEOFF_PROCESS') {
        upwardVelocityLimit = Math.min(upwardVelocityLimit, config.mission.vTakeoff);
    }

    if (simState.fsmState === 'LANDING_PROCESS' && simState.pos.z <= config.mission.landingAlt) {
        downwardVelocityLimit = Math.min(downwardVelocityLimit, config.mission.vLanding);
    }

    const errZ = simState.target_pos.z - simState.pos.z;
    const desiredVz = Math.max(-downwardVelocityLimit, Math.min(upwardVelocityLimit, errZ * kp));
    const az = (desiredVz - simState.vel.z) * kd;
    simState.vel.z += az * dt;
    simState.vel.z = Math.max(-downwardVelocityLimit, Math.min(upwardVelocityLimit, simState.vel.z));
    simState.pos.z += simState.vel.z * dt;

    const errX = simState.target_pos.x - simState.pos.x;
    const errY = simState.target_pos.y - simState.pos.y;
    const desiredVx = Math.max(-config.mission.vMax, Math.min(config.mission.vMax, errX * kp));
    const desiredVy = Math.max(-config.mission.vMax, Math.min(config.mission.vMax, errY * kp));
    let ax = (desiredVx - simState.vel.x) * kd;
    let ay = (desiredVy - simState.vel.y) * kd;
    const accelMagnitude = Math.hypot(ax, ay);
    if (accelMagnitude > config.mission.aMax && accelMagnitude > 0) {
        const scale = config.mission.aMax / accelMagnitude;
        ax *= scale;
        ay *= scale;
    }

    simState.vel.x += ax * dt;
    simState.vel.y += ay * dt;
    const planarSpeed = Math.hypot(simState.vel.x, simState.vel.y);
    if (planarSpeed > config.mission.vMax && planarSpeed > 0) {
        const speedScale = config.mission.vMax / planarSpeed;
        simState.vel.x *= speedScale;
        simState.vel.y *= speedScale;
    }
    simState.pos.x += simState.vel.x * dt;
    simState.pos.y += simState.vel.y * dt;

    let errYaw = simState.target_yaw - simState.orientation.yaw;
    while (errYaw > Math.PI) errYaw -= 2 * Math.PI;
    while (errYaw < -Math.PI) errYaw += 2 * Math.PI;
    simState.orientation.yaw += errYaw * kpYaw * dt;

    const bodyAccel = worldPlanarToBody(ax, ay, simState.orientation.yaw);
    const targetPitch = Math.max(
        -PHYSICS_TUNING.AUTO_MAX_TILT,
        Math.min(PHYSICS_TUNING.AUTO_MAX_TILT, bodyAccel.forward * PHYSICS_TUNING.AUTO_TILT_GAIN)
    );
    const targetRoll = Math.max(
        -PHYSICS_TUNING.AUTO_MAX_TILT,
        Math.min(PHYSICS_TUNING.AUTO_MAX_TILT, bodyAccel.right * PHYSICS_TUNING.AUTO_TILT_GAIN)
    );

    simState.orientation.pitch += (targetPitch - simState.orientation.pitch) * PHYSICS_TUNING.AUTO_TILT_RESPONSE * dt;
    simState.orientation.roll += (targetRoll - simState.orientation.roll) * PHYSICS_TUNING.AUTO_TILT_RESPONSE * dt;
}

export function updateActiveFlight(
    simState: DroneState,
    id: string,
    dt: number,
    isFlying: boolean,
    getObstacles: ObstacleProvider
) {
    updateFlightModeFromRc(simState, id, isFlying);

    if (!isFlying) return;

    const autonomousMissionControlling = isAutonomousMissionControlling(simState);
    if (!autonomousMissionControlling) {
        simState.missionRcOverrideNoticeShown = false;
    }

    if (autonomousMissionControlling) {
        if (simSettings.gamepadConnected && simState.flightMode !== 'AUTO' && !simState.missionRcOverrideNoticeShown) {
            simState.missionRcOverrideNoticeShown = true;
            showMissionGamepadOverrideNotice();
        }
        simState.flightMode = 'AUTO';
    }

    if (!autonomousMissionControlling && simSettings.gamepadConnected && simState.flightMode !== 'AUTO') {
        updateManualFlight(simState, dt, getObstacles);
        return;
    }

    updateAutoFlight(simState, dt);
}
