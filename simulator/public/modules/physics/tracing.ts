import type { DroneState } from '../core/state.js';
import { MAX_PATH_POINTS, pathPoints, pathPointsVersion } from '../core/state.js';
import { TRACE_SAMPLE_INTERVAL } from './constants.js';

const TRACE_AIRBORNE_ALTITUDE_EPSILON = 0.1;
const TRACE_MOVEMENT_EPSILON = 0.01;

function shouldKeepTracing(id: string, simState: DroneState, isFlying: boolean) {
    if (isFlying) return true;
    if (simState.pos.z > TRACE_AIRBORNE_ALTITUDE_EPSILON) return true;

    const points = pathPoints[id];
    if (!points || points.length === 0) return false;
    const last = points[points.length - 1];

    return Math.abs(last.x - simState.pos.x) > TRACE_MOVEMENT_EPSILON
        || Math.abs(last.y - simState.pos.y) > TRACE_MOVEMENT_EPSILON
        || Math.abs(last.z - simState.pos.z) > TRACE_MOVEMENT_EPSILON;
}

export function updateTracePath(id: string, simState: DroneState, dt: number, isFlying: boolean) {
    if (shouldKeepTracing(id, simState, isFlying)) {
        simState.traceSampleAccumulator += dt;
        while (simState.traceSampleAccumulator >= TRACE_SAMPLE_INTERVAL) {
            if (!pathPoints[id]) pathPoints[id] = [];
            pathPoints[id].push({ ...simState.pos });
            pathPointsVersion[id] = (pathPointsVersion[id] || 0) + 1;
            if (pathPoints[id].length > MAX_PATH_POINTS) pathPoints[id].shift();
            simState.traceSampleAccumulator -= TRACE_SAMPLE_INTERVAL;
        }
        return;
    }

    simState.traceSampleAccumulator = 0;
}
