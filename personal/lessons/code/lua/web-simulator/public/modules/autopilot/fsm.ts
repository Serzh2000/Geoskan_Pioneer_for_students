import type {
    CommandSource,
    DroneFsmState,
    DroneState,
    TickFlightCommand,
    Vector3
} from '../core/state.js';
import { simSettings } from '../core/state.js';
import { showEarlyRouteNotice } from '../app/script-execution-notice.js';
import { rememberLuaFailureHint, recordLuaFsmTransition } from '../lua/diagnostics.js';
import { log } from '../shared/logging/logger.js';
import {
    getAutopilotRuntimeConfig,
    rememberAutopilotHomePosition
} from './params-runtime.js';
import {
    type CommandName,
    failSimultaneousCommands,
    canRunInSameTick,
    getCommandName,
    makeSignature,
    MOVEMENT_REACHED_EPSILON,
    PREFLIGHT_TIMEOUT_MS,
    setFsmStateAndSyncStatus,
    TAKEOFF_MIN_ALTITUDE
} from './fsm-internals.js';

const ERROR_STATUS = '\u041e\u0428\u0418\u0411\u041a\u0410';

export function setDroneFsmState(drone: DroneState, nextState: DroneFsmState) {
    const previousState = drone.fsmState;
    setFsmStateAndSyncStatus(drone, nextState);
    if (previousState !== nextState) {
        recordLuaFsmTransition(
            drone,
            previousState,
            nextState,
            `setDroneFsmState(${nextState})`,
            drone.currentCommandSource || 'system'
        );
    }
}

export function getCurrentTickMs(drone: DroneState) {
    return Math.round(drone.current_time * 1000);
}

export function getCommandSource(drone: DroneState, fallback: CommandSource = 'direct'): CommandSource {
    return drone.currentCommandSource || fallback;
}

export function withCommandSource<T>(drone: DroneState, source: CommandSource, fn: () => T): T {
    const previous = drone.currentCommandSource;
    drone.currentCommandSource = source;
    try {
        return fn();
    } finally {
        drone.currentCommandSource = previous;
    }
}

export function isDroneAirborneState(drone: DroneState) {
    return (
        drone.fsmState === 'TAKEOFF_PROCESS'
        || drone.fsmState === 'FLYING_HOVER'
        || drone.fsmState === 'FLYING_MOVING'
        || drone.fsmState === 'LANDING_PROCESS'
    );
}

export function isDroneMovingState(drone: DroneState) {
    return drone.fsmState === 'FLYING_MOVING';
}

export function shouldSpinRotors(drone: DroneState) {
    return (
        drone.fsmState !== 'IDLE'
        && drone.status !== ERROR_STATUS
        && drone.status !== 'CRASHED'
        && drone.status !== 'DISARMED_FALL'
    );
}

export function recordTickCommand(drone: DroneState, command: TickFlightCommand) {
    const tickMs = getCurrentTickMs(drone);
    const signature = (!drone.tickCommandSignature || drone.tickCommandSignature.tickMs !== tickMs)
        ? makeSignature(tickMs)
        : drone.tickCommandSignature;

    if (signature.commands.length > 0 && !canRunInSameTick(signature.commands, command)) {
        signature.commands.push(command);
        failSimultaneousCommands(drone, signature.commands);
    }

    signature.commands.push(command);
    drone.tickCommandSignature = signature;
}

export function beginEventCallbackPhase(drone: DroneState) {
    // Commands from callback(event) belong to a new event-driven phase.
    drone.tickCommandSignature = null;
}

export function throwFsmTransitionError(drone: DroneState, command: CommandName): never {
    rememberLuaFailureHint(
        drone,
        `FSM-конфликт: команда ${command} недоступна в состоянии ${drone.fsmState}.`,
        ['Проверьте порядок этапов миссии и дождитесь подходящего состояния перед следующим вызовом API.']
    );
    throw new Error(`FSM error: invalid transition from ${drone.fsmState} by command ${command}`);
}

export function rejectCommandByFsm(drone: DroneState, command: CommandName, message: string) {
    if (getCommandSource(drone) === 'timer') {
        log('WARNING: Delayed command was rejected because FSM state has already changed.', 'warn');
        return false;
    }

    log(message, message.includes('CRITICAL') ? 'error' : 'warn');
    return false;
}

export function queueMceCommand(drone: DroneState, commandId: number, source: CommandSource) {
    const command = getCommandName(commandId);
    if (command === 'MCE_PREFLIGHT') recordTickCommand(drone, 'preflight');
    if (command === 'MCE_TAKEOFF') recordTickCommand(drone, 'takeoff');
    if (command === 'MCE_LANDING') recordTickCommand(drone, 'landing');

    drone.command_queue.push({
        commandId,
        issuedAtMs: getCurrentTickMs(drone),
        source
    });
}

export function applyGoToLocalPointRequest(
    drone: DroneState,
    target: Vector3,
    options?: { yaw?: number | null }
) {
    recordTickCommand(drone, 'goToLocalPoint');
    const commandSource = getCommandSource(drone);
    const canQueueDuringTakeoff = commandSource === 'timer' || commandSource === 'python';

    if (drone.fsmState === 'TAKEOFF_PROCESS' && canQueueDuringTakeoff) {
        drone.target_pos = {
            x: target.x,
            y: target.y,
            z: drone.target_pos.z
        };
        if (typeof options?.yaw === 'number') {
            drone.target_yaw = options.yaw;
        }
        drone.pointReachedFlag = false;
        drone.pendingLocalPoint = true;
        drone.pendingLocalPointSource = commandSource;
        drone.pendingLocalPointTarget = { ...target };
        drone.lastAcceptedGoToTickMs = getCurrentTickMs(drone);
        return true;
    }

    if (drone.fsmState === 'PREFLIGHT' || drone.fsmState === 'TAKEOFF_PROCESS' || drone.fsmState === 'LANDING_PROCESS') {
        if (commandSource === 'timer') {
            showEarlyRouteNotice();
            log('WARNING: Delayed command was rejected because FSM state has already changed.', 'warn');
            return false;
        }
        throwFsmTransitionError(drone, 'GO_TO_LOCAL_POINT');
    }

    if (drone.fsmState !== 'FLYING_HOVER' && drone.fsmState !== 'FLYING_MOVING') {
        return rejectCommandByFsm(
            drone,
            'GO_TO_LOCAL_POINT',
            'CRITICAL WARNING: goToLocalPoint is rejected on the ground. Move the drone to the airborne state first.'
        );
    }

    drone.target_pos = target;
    if (typeof options?.yaw === 'number') {
        drone.target_yaw = options.yaw;
    }
    drone.pointReachedFlag = false;
    drone.pendingLocalPoint = false;
    drone.pendingLocalPointSource = null;
    drone.pendingLocalPointTarget = null;
    drone.lastAcceptedGoToTickMs = getCurrentTickMs(drone);
    setDroneFsmState(drone, 'FLYING_MOVING');
    return true;
}

export function enterPreflight(drone: DroneState) {
    if (drone.fsmState !== 'IDLE') {
        if (getCommandSource(drone) === 'timer') {
            log('WARNING: Delayed command was rejected because FSM state has already changed.', 'warn');
            return false;
        }
        throwFsmTransitionError(drone, 'MCE_PREFLIGHT');
    }

    const config = getAutopilotRuntimeConfig();
    if (config.failsafe.flyWithoutRc === 1 && !simSettings.gamepadConnected) {
        return rejectCommandByFsm(
            drone,
            'MCE_PREFLIGHT',
            'WARNING: PREFLIGHT command is blocked because Copter_flyWithoutRc requires an active RC link.'
        );
    }

    drone.pendingLocalPoint = false;
    drone.pendingLocalPointSource = null;
    drone.pendingLocalPointTarget = null;
    drone.preflightDeadlineMs = getCurrentTickMs(drone) + PREFLIGHT_TIMEOUT_MS;
    rememberAutopilotHomePosition(drone);
    setDroneFsmState(drone, 'PREFLIGHT');
    return true;
}

export function enterTakeoffProcess(drone: DroneState) {
    if (drone.fsmState !== 'PREFLIGHT') {
        if (getCommandSource(drone) === 'timer') {
            log('WARNING: Delayed command was rejected because FSM state has already changed.', 'warn');
            return false;
        }
        if (drone.fsmState !== 'IDLE') {
            throwFsmTransitionError(drone, 'MCE_TAKEOFF');
        }
        return rejectCommandByFsm(
            drone,
            'MCE_TAKEOFF',
            'WARNING: TAKEOFF command is ignored because the drone is not in PREFLIGHT.'
        );
    }

    const config = getAutopilotRuntimeConfig();
    if (
        config.motors.motorCheckTime > 0
        && (
            config.motors.startRpmMin > config.motors.startRpmMax
            || config.motors.startRpmSigma > Math.max(1, config.motors.startRpmMax - config.motors.startRpmMin)
            || config.motors.stallRpm < config.motors.startRpmMax
        )
    ) {
        return rejectCommandByFsm(
            drone,
            'MCE_TAKEOFF',
            'WARNING: TAKEOFF command is blocked by invalid motor check parameters.'
        );
    }

    drone.preflightDeadlineMs = null;
    drone.target_pos.x = drone.pos.x;
    drone.target_pos.y = drone.pos.y;
    drone.target_pos.z = Math.max(config.mission.takeoffAlt, TAKEOFF_MIN_ALTITUDE);
    drone.target_alt = drone.target_pos.z;
    drone.pointReachedFlag = false;
    drone.pendingLocalPoint = false;
    drone.pendingLocalPointSource = null;
    drone.pendingLocalPointTarget = null;
    setDroneFsmState(drone, 'TAKEOFF_PROCESS');
    return true;
}

export function enterLandingProcess(drone: DroneState) {
    if (drone.fsmState !== 'FLYING_HOVER' && drone.fsmState !== 'FLYING_MOVING') {
        if (getCommandSource(drone) === 'timer') {
            log('WARNING: Delayed command was rejected because FSM state has already changed.', 'warn');
            return false;
        }
        if (drone.fsmState === 'TAKEOFF_PROCESS' || drone.fsmState === 'LANDING_PROCESS') {
            throwFsmTransitionError(drone, 'MCE_LANDING');
        }
        return rejectCommandByFsm(
            drone,
            'MCE_LANDING',
            'WARNING: LANDING command is ignored because the drone is not airborne.'
        );
    }

    if (drone.fsmState === 'FLYING_MOVING' || drone.lastAcceptedGoToTickMs === getCurrentTickMs(drone)) {
        log('WARNING: LANDING overrides the active goToLocalPoint movement.', 'warn');
    }

    drone.target_pos = { x: drone.pos.x, y: drone.pos.y, z: 0 };
    drone.target_alt = 0;
    drone.pendingLocalPoint = false;
    drone.pendingLocalPointSource = null;
    drone.pendingLocalPointTarget = null;
    drone.pointReachedFlag = false;
    setDroneFsmState(drone, 'LANDING_PROCESS');
    return true;
}

export function handlePreflightTimeout(drone: DroneState) {
    if (drone.fsmState !== 'PREFLIGHT' || drone.preflightDeadlineMs === null) return false;
    if (getCurrentTickMs(drone) < drone.preflightDeadlineMs) return false;

    drone.preflightDeadlineMs = null;
    drone.pendingLocalPoint = false;
    drone.pendingLocalPointSource = null;
    drone.pendingLocalPointTarget = null;
    setDroneFsmState(drone, 'IDLE');
    log('WARNING: Preflight timeout expired. The drone is returned to IDLE.', 'warn');
    return true;
}

export function completeTakeoff(drone: DroneState) {
    if (drone.fsmState !== 'TAKEOFF_PROCESS') return false;
    const pendingTarget = drone.pendingLocalPointTarget;
    drone.pendingLocalPoint = false;
    drone.pendingLocalPointSource = null;
    drone.pendingLocalPointTarget = null;

    if (pendingTarget) {
        drone.target_pos = { ...pendingTarget };
        if (isMovementReached(drone)) {
            drone.pointReachedFlag = true;
            setDroneFsmState(drone, 'FLYING_HOVER');
        } else {
            setDroneFsmState(drone, 'FLYING_MOVING');
        }
        return true;
    }

    setDroneFsmState(drone, 'FLYING_HOVER');
    return true;
}

export function completePointReached(drone: DroneState) {
    if (drone.fsmState !== 'FLYING_MOVING') return false;
    drone.pointReachedFlag = true;
    setDroneFsmState(drone, 'FLYING_HOVER');
    return true;
}

export function completeLanding(drone: DroneState) {
    drone.preflightDeadlineMs = null;
    drone.pendingLocalPoint = false;
    drone.pendingLocalPointSource = null;
    drone.pendingLocalPointTarget = null;
    setDroneFsmState(drone, 'IDLE');
}

export function isMovementReached(drone: DroneState) {
    return Math.sqrt(
        (drone.target_pos.x - drone.pos.x) ** 2
        + (drone.target_pos.y - drone.pos.y) ** 2
        + (drone.target_pos.z - drone.pos.z) ** 2
    ) < MOVEMENT_REACHED_EPSILON;
}
