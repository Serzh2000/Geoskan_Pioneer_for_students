import { showSimultaneousCommandsNotice } from '../app/script-execution-notice.js';
import type {
    DroneFsmState,
    DroneState,
    TickCommandSignature,
    TickFlightCommand
} from '../core/state.js';
import { rememberLuaFailureHint, recordLuaFsmTransition } from '../lua/diagnostics.js';
import { log } from '../shared/logging/logger.js';
import { MCECommands } from './mce-events.js';

export const PREFLIGHT_TIMEOUT_MS = 3000;
export const MOVEMENT_REACHED_EPSILON = 0.15;
export const TAKEOFF_MIN_ALTITUDE = 1.0;

export type CommandName =
    | 'MCE_PREFLIGHT'
    | 'MCE_TAKEOFF'
    | 'MCE_LANDING'
    | 'GO_TO_LOCAL_POINT'
    | 'ENGINES_ARM'
    | 'ENGINES_DISARM';

export function makeSignature(tickMs: number): TickCommandSignature {
    return {
        tickMs,
        commands: []
    };
}

export function getTickCommandLabel(command: TickFlightCommand): string {
    switch (command) {
        case 'preflight':
            return 'PREFLIGHT';
        case 'takeoff':
            return 'TAKEOFF';
        case 'goToLocalPoint':
            return 'goToLocalPoint';
        case 'landing':
            return 'LANDING';
        default:
            return command;
    }
}

export function getCommandName(commandId: number): CommandName {
    switch (commandId) {
        case MCECommands.MCE_PREFLIGHT:
            return 'MCE_PREFLIGHT';
        case MCECommands.MCE_TAKEOFF:
            return 'MCE_TAKEOFF';
        case MCECommands.MCE_LANDING:
            return 'MCE_LANDING';
        case MCECommands.ENGINES_ARM:
            return 'ENGINES_ARM';
        case MCECommands.ENGINES_DISARM:
            return 'ENGINES_DISARM';
        default:
            return 'ENGINES_DISARM';
    }
}

export function syncStatus(drone: DroneState): void {
    drone.status = drone.fsmState;
}

export function setFsmStateAndSyncStatus(drone: DroneState, nextState: DroneFsmState): void {
    drone.fsmState = nextState;
    syncStatus(drone);
}

export function failSimultaneousCommands(drone: DroneState, commands: TickFlightCommand[]): never {
    const labels = commands.map(getTickCommandLabel);
    const message = `CRITICAL ERROR: Commands ${labels.join(', ')} run at the same time. Split them with Timer.callLater(...) or callback(event).`;
    rememberLuaFailureHint(
        drone,
        `Команды миссии запущены одновременно без паузы: ${labels.join(', ')}.`,
        ['Разнесите эти команды по этапам через `Timer.callLater(...)`, `sleep(...)` или `callback(event)`.']
    );
    showSimultaneousCommandsNotice(labels);
    drone.running = false;
    drone.status = '\u041e\u0428\u0418\u0411\u041a\u0410';
    recordLuaFsmTransition(drone, drone.fsmState, 'IDLE', 'simultaneous mission commands', drone.currentCommandSource || 'system');
    drone.fsmState = 'IDLE';
    drone.command_queue = [];
    drone.pendingLocalPoint = false;
    drone.pendingLocalPointSource = null;
    drone.preflightDeadlineMs = null;
    drone.tickCommandSignature = null;
    log(message, 'error');
    throw new Error(message);
}
