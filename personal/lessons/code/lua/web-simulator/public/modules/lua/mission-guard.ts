import type { DroneState } from '../core/state.js';

export const LUA_EVENT_CALLBACK_PATTERN = /function\s+callback\s*\(/i;

export function scriptHasLuaEventCallback(scriptContent: string) {
    return LUA_EVENT_CALLBACK_PATTERN.test(scriptContent || '');
}

export function resetLuaMissionGuard(drone: DroneState, scriptContent: string = '') {
    drone.luaHasEventCallback = scriptHasLuaEventCallback(scriptContent);
    drone.luaMissionCommandsAcceptedWithoutCallback = 0;
    drone.luaMissingCallbackNoticeShown = false;
}

export function allowLuaMissionCommand(drone: DroneState) {
    if (drone.luaHasEventCallback) return true;
    if (drone.luaMissionCommandsAcceptedWithoutCallback === 0) {
        drone.luaMissionCommandsAcceptedWithoutCallback = 1;
        return true;
    }
    return false;
}
