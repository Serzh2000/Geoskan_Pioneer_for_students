import type { DroneState } from '../core/state.js';

export const LUA_EVENT_CALLBACK_PATTERN = /function\s+callback\s*\(/i;

export function scriptHasLuaEventCallback(scriptContent: string) {
    return LUA_EVENT_CALLBACK_PATTERN.test(scriptContent || '');
}

export function resetLuaMissionGuard(drone: DroneState, scriptContent: string = '') {
    drone.luaHasEventCallback = scriptHasLuaEventCallback(scriptContent);
    // Firmware only emits ENGINES_STARTED to handlers that subscribe to that
    // stage. This also keeps callback functions that register their route
    // timers after TAKEOFF_COMPLETE from registering the same timers twice.
    drone.luaHandlesEnginesStarted = /\bEv\.ENGINES_STARTED\b/i.test(scriptContent);
    drone.luaHandlesPointReached = /\bEv\.POINT_REACHED\b/i.test(scriptContent);
    drone.luaMissionCommandsAcceptedWithoutCallback = 0;
    drone.luaMissingCallbackNoticeShown = false;
}

export function shouldDispatchLuaEvent(drone: DroneState, eventId: number): boolean {
    if (eventId === 11) return drone.luaHandlesEnginesStarted;
    if (eventId === 10) return drone.luaHandlesPointReached;
    return true;
}

export function allowLuaMissionCommand(drone: DroneState) {
    // Pioneer Station does not suppress commands merely because callback()
    // is absent. Timer.callLater() is a valid way to sequence a mission, so
    // the simulator must pass those commands to the autopilot as well.
    void drone;
    return true;
}
