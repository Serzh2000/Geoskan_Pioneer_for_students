import type {
    CommandSource,
    DroneFsmState,
    DroneState,
    TickFlightCommand
} from '../core/state.js';
import { rememberLuaFailureHint, recordLuaFsmTransition } from '../lua/diagnostics.js';
import { log } from '../shared/logging/logger.js';
import {
    type CommandName,
    canRunInSameTick,
    failSimultaneousCommands,
    getCommandName,
    makeSignature,
    setFsmStateAndSyncStatus
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

export function rejectCommandByFsm(drone: DroneState, _command: CommandName, message: string) {
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
