import { currentDroneId, drones } from '../core/state.js';

export const cancelledRuns: Record<string, boolean> = {};
export const localOriginByDrone: Record<string, { x: number; y: number; z: number }> = {};
export const lastManualSpeedUpdateMs: Record<string, number> = {};

export function getDroneOrDefault(id: string) {
    return drones[id] || drones[currentDroneId];
}

export function cleanupPythonRuntimeState(droneId: string) {
    delete cancelledRuns[droneId];
    delete localOriginByDrone[droneId];
    delete lastManualSpeedUpdateMs[droneId];
}
