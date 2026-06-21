import type { DroneState } from '../core/state.js';
import {
    enterLandingProcess,
    enterPreflight,
    enterTakeoffProcess,
    setDroneFsmState,
    withCommandSource
} from '../autopilot/fsm.js';
import { triggerLuaCallback } from '../lua/index.js';
import {
    AIRBORNE_ALTITUDE_EPSILON,
    beginDisarmedFall
} from './events.js';

export type CommandQueueResult = 'continue' | 'abortFrame';

export function processCommandQueue(simState: DroneState, id: string): CommandQueueResult {
    if (simState.command_queue.length === 0) return 'continue';

    const next = simState.command_queue.shift();
    if (!next) return 'continue';

    withCommandSource(simState, next.source, () => {
        if (next.commandId === 1 || next.commandId === 4) {
            if (enterPreflight(simState)) {
                triggerLuaCallback(id, 11);
            }
        }

        if (next.commandId === 2) {
            enterTakeoffProcess(simState);
        }

        if (next.commandId === 3) {
            enterLandingProcess(simState);
        }

        if (next.commandId === 5) {
            if (simState.pos.z > AIRBORNE_ALTITUDE_EPSILON) {
                beginDisarmedFall(simState, id, 'DISARM в воздухе: двигатели отключены, начинается свободное падение.');
            } else {
                setDroneFsmState(simState, 'IDLE');
                simState.pendingLocalPoint = false;
                simState.pendingLocalPointSource = null;
                simState.pendingLocalPointTarget = null;
                simState.pointReachedFlag = false;
                simState.vel = { x: 0, y: 0, z: 0 };
                simState.target_pos = { ...simState.pos, z: 0 };
                simState.target_alt = 0;
            }
        }
    });

    return 'continue';
}
