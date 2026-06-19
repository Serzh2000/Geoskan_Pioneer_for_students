/**
 * Модуль физического движка симулятора.
 * Отвечает за расчет кинематики полета каждого дрона:
 * применение управляющих воздействий (от автопилота или скрипта),
 * расчет скоростей, координат, ориентации (кватернионов),
 * а также обработку столкновений с объектами сцены (препятствиями).
 */
import { drones } from '../core/state.js';
import { updateAutopilotParameterEffects } from '../autopilot/params-effects.js';
import { handlePreflightTimeout } from '../autopilot/fsm.js';
import { updateTimers } from '../lua/index.js';
import { getObstacles } from '../drone/index.js';
import { checkPhysicsEvents } from './events.js';
import { updateBatteryState } from './battery.js';
import { updateDetachedCargoPhysics, updateMagnetGripper } from './magnet-gripper.js';
import { processCommandQueue } from './commands.js';
import { updateActiveFlight } from './flight-update.js';
import { isDroneFlying } from './helpers.js';
import {
    resolveGroundContact,
    updateCrashedState,
    updateDisarmedFallState,
    updateGroundedState
} from './state-transitions.js';
import { updateTracePath } from './tracing.js';

export function updatePhysics(dt: number) {
    updateTimers();
    updateDetachedCargoPhysics(dt, getObstacles);

    for (const id in drones) {
        const simState = drones[id];
        const prevPos = { ...simState.pos };
        handlePreflightTimeout(simState);
        if (processCommandQueue(simState, id) === 'abortFrame') return;

        const isFlying = isDroneFlying(simState);
        if (simState.running) {
            simState.current_time += dt;
        }

        updateActiveFlight(simState, id, dt, isFlying, getObstacles);
        updateAutopilotParameterEffects(simState, id);
        updateMagnetGripper(simState, getObstacles);
        updateTracePath(id, simState, dt, isFlying);

        if (isFlying) {
            resolveGroundContact(simState, id, prevPos);
        } else if (simState.status === 'DISARMED_FALL') {
            updateDisarmedFallState(simState, id, dt, prevPos);
        } else if (simState.status === 'CRASHED') {
            updateCrashedState(simState, dt);
        } else {
            updateGroundedState(simState, dt);
        }

        if (simState.status !== 'CRASHED') {
            checkPhysicsEvents(simState, prevPos);
        }

        updateBatteryState(simState, id, dt);
    }
}
