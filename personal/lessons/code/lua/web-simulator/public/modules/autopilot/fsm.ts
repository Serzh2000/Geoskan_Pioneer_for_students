import type {
    CommandSource,
    DroneFsmState,
    DroneState,
    Vector3
} from '../core/state.js';
import { showEarlyRouteNotice } from '../app/script-execution-notice.js';
import { log } from '../shared/logging/logger.js';
import {
    type CommandName,
    failSimultaneousCommands,
    getCommandName,
    makeSignature,
    MOVEMENT_REACHED_EPSILON,
    PREFLIGHT_TIMEOUT_MS,
    setFsmStateAndSyncStatus,
    TAKEOFF_MIN_ALTITUDE
} from './fsm-internals.js';

export function setDroneFsmState(drone: DroneState, nextState: DroneFsmState) {
    setFsmStateAndSyncStatus(drone, nextState);
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
        && drone.status !== 'ОШИБКА'
        && drone.status !== 'CRASHED'
        && drone.status !== 'DISARMED_FALL'
    );
}

export function recordTickCommand(drone: DroneState, command: TickFlightCommand) {
    const tickMs = getCurrentTickMs(drone);
    const signature = (!drone.tickCommandSignature || drone.tickCommandSignature.tickMs !== tickMs)
        ? makeSignature(tickMs)
        : drone.tickCommandSignature;

    if (signature.commands.length > 0) {
        signature.commands.push(command);
        failSimultaneousCommands(drone, signature.commands);
    }

    signature.commands.push(command);
    drone.tickCommandSignature = signature;
}

export function beginEventCallbackPhase(drone: DroneState) {
    // Commands issued from callback(event) belong to a new event-driven phase.
    // This keeps valid FSM chains from being treated as "instantaneous" with the
    // command that produced the event while still preserving same-callback checks.
    drone.tickCommandSignature = null;
}

export function throwFsmTransitionError(drone: DroneState, command: CommandName): never {
    throw new Error(`Ошибка FSM: Невозможный переход из состояния ${drone.fsmState} через команду ${command}`);
}

export function rejectCommandByFsm(drone: DroneState, command: CommandName, message: string) {
    if (getCommandSource(drone) === 'timer') {
        log('WARNING: Таймер сработал слишком поздно. Команда отклонена конечным автоматом', 'warn');
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

    if (drone.fsmState === 'PREFLIGHT' || drone.fsmState === 'TAKEOFF_PROCESS' || drone.fsmState === 'LANDING_PROCESS') {
        if (getCommandSource(drone) === 'timer') {
            showEarlyRouteNotice();
            log('WARNING: Таймер сработал слишком поздно. Команда отклонена конечным автоматом', 'warn');
            return false;
        }
        throwFsmTransitionError(drone, 'GO_TO_LOCAL_POINT');
    }

    if (drone.fsmState !== 'FLYING_HOVER' && drone.fsmState !== 'FLYING_MOVING') {
        return rejectCommandByFsm(
            drone,
            'GO_TO_LOCAL_POINT',
            'CRITICAL WARNING: Команда goToLocalPoint вызвана на земле! Дрон не находится в воздухе. Взлет (TAKEOFF) должен полностью завершиться.'
        );
    }

    drone.target_pos = target;
    if (typeof options?.yaw === 'number') {
        drone.target_yaw = options.yaw;
    }
    drone.pointReachedFlag = false;
    drone.pendingLocalPoint = false;
    drone.pendingLocalPointSource = null;
    drone.lastAcceptedGoToTickMs = getCurrentTickMs(drone);
    setDroneFsmState(drone, 'FLYING_MOVING');
    return true;
}

export function enterPreflight(drone: DroneState) {
    if (drone.fsmState !== 'IDLE') {
        if (getCommandSource(drone) === 'timer') {
            log('WARNING: Таймер сработал слишком поздно. Команда отклонена конечным автоматом', 'warn');
            return false;
        }
        throwFsmTransitionError(drone, 'MCE_PREFLIGHT');
    }

    drone.pendingLocalPoint = false;
    drone.pendingLocalPointSource = null;
    drone.preflightDeadlineMs = getCurrentTickMs(drone) + PREFLIGHT_TIMEOUT_MS;
    setDroneFsmState(drone, 'PREFLIGHT');
    return true;
}

export function enterTakeoffProcess(drone: DroneState) {
    if (drone.fsmState !== 'PREFLIGHT') {
        if (getCommandSource(drone) === 'timer') {
            log('WARNING: Таймер сработал слишком поздно. Команда отклонена конечным автоматом', 'warn');
            return false;
        }
        if (drone.fsmState !== 'IDLE') {
            throwFsmTransitionError(drone, 'MCE_TAKEOFF');
        }
        return rejectCommandByFsm(
            drone,
            'MCE_TAKEOFF',
            'WARNING: Команда взлета проигнорирована: моторы не запущены (вызовите PREFLIGHT заранее)'
        );
    }

    drone.preflightDeadlineMs = null;
    drone.target_pos.x = drone.pos.x;
    drone.target_pos.y = drone.pos.y;
    drone.target_pos.z = Math.max(drone.pos.z + TAKEOFF_MIN_ALTITUDE, TAKEOFF_MIN_ALTITUDE);
    drone.target_alt = drone.target_pos.z;
    drone.pointReachedFlag = false;
    setDroneFsmState(drone, 'TAKEOFF_PROCESS');
    return true;
}

export function enterLandingProcess(drone: DroneState) {
    if (drone.fsmState !== 'FLYING_HOVER' && drone.fsmState !== 'FLYING_MOVING') {
        if (getCommandSource(drone) === 'timer') {
            log('WARNING: Таймер сработал слишком поздно. Команда отклонена конечным автоматом', 'warn');
            return false;
        }
        if (drone.fsmState === 'TAKEOFF_PROCESS' || drone.fsmState === 'LANDING_PROCESS') {
            throwFsmTransitionError(drone, 'MCE_LANDING');
        }
        return rejectCommandByFsm(
            drone,
            'MCE_LANDING',
            'WARNING: Посадка невозможна: дрон не находится в воздухе'
        );
    }

    if (drone.fsmState === 'FLYING_MOVING' || drone.lastAcceptedGoToTickMs === getCurrentTickMs(drone)) {
        log('WARNING: Команда посадки (LANDING) перетерла активную команду движения к точке (goToLocalPoint).', 'warn');
    }

    drone.target_pos = { x: drone.pos.x, y: drone.pos.y, z: 0 };
    drone.target_alt = 0;
    drone.pendingLocalPoint = false;
    drone.pendingLocalPointSource = null;
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
    setDroneFsmState(drone, 'IDLE');
    log('WARNING: Превышено время ожидания взлета. Моторы автоматически отключены в целях безопасности.', 'warn');
    return true;
}

export function completeTakeoff(drone: DroneState) {
    if (drone.fsmState !== 'TAKEOFF_PROCESS') return false;
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
    setDroneFsmState(drone, 'IDLE');
}

export function isMovementReached(drone: DroneState) {
    return Math.sqrt(
        (drone.target_pos.x - drone.pos.x) ** 2
        + (drone.target_pos.y - drone.pos.y) ** 2
        + (drone.target_pos.z - drone.pos.z) ** 2
    ) < MOVEMENT_REACHED_EPSILON;
}
