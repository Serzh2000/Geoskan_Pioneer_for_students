import * as fengari from 'fengari-web';
import { drones } from '../core/state.js';
import { log } from '../shared/logging/logger.js';
import { beginEventCallbackPhase, withCommandSource } from '../autopilot/fsm.js';
import { luaToStr } from './utils.js';
import {
    createLuaRuntimeFailureError,
    rememberLuaErrorStack,
    setLuaExecutionPhase
} from './diagnostics.js';
import { runCoroutine } from './runner.js';
import { createScriptFailureError } from '../app/script-execution-notice.js';
import { failScriptRun } from '../core/script-failure.js';
import { extractLuaSyntaxLine, setupLuaBridgeForDrone } from './bridge.js';
import { resetLuaMissionGuard } from './mission-guard.js';

function disposeLuaRuntime(id: string) {
    const drone = drones[id];
    if (!drone) return;

    const luaState = drone.luaState;
    drone.luaState = null;
    drone.timers = [];
    setLuaExecutionPhase(drone, null);

    if (!luaState) return;
    try {
        fengari.lua.lua_close(luaState);
    } catch (e) {
        console.error('Error closing lua state:', e);
    }
}

export function runLuaScript(id: string, scriptContent: string) {
    const drone = drones[id];
    if (!drone) return;
    rememberLuaErrorStack(drone, null);
    resetLuaMissionGuard(drone, scriptContent);
    setLuaExecutionPhase(drone, 'main chunk');

    disposeLuaRuntime(id);

    let L;
    try {
        L = setupLuaBridgeForDrone(id);
    } catch (e) {
        console.error('Error in setupLuaBridgeForDrone:', e);
        throw e;
    }

    const loadStatus = fengari.lauxlib.luaL_loadstring(L, fengari.to_luastring(scriptContent));
    if (loadStatus !== 0) {
        const errVal = fengari.lua.lua_tostring(L, -1);
        const errorMsg = luaToStr(errVal, L);
        fengari.lua.lua_pop(L, 1);
        try {
            fengari.lua.lua_close(L);
        } catch (e) {
            console.error('Error closing lua state after syntax failure:', e);
        }
        drone.luaState = null;
        throw createScriptFailureError('syntax', errorMsg, {
            line: extractLuaSyntaxLine(errorMsg)
        });
    }

    const T = fengari.lua.lua_newthread(L);
    fengari.lua.lua_pushvalue(L, -2);
    fengari.lua.lua_xmove(L, T, 1);

    try {
        runCoroutine(L, T, 0, id, 'main chunk');
    } catch (e) {
        console.error('Error in runCoroutine:', e);
        throw e;
    } finally {
        setLuaExecutionPhase(drone, null);
    }
}

export function stopLuaScript(id: string) {
    disposeLuaRuntime(id);
}

export function updateTimers() {
    const lua = fengari.lua;
    const lauxlib = fengari.lauxlib;

    for (const id in drones) {
        const drone = drones[id];
        if (!drone.running || !drone.luaState) continue;
        const L = drone.luaState;

        for (let i = drone.timers.length - 1; i >= 0; i--) {
            const t = drone.timers[i];
            if (t.running && drone.current_time >= t.trigger_time) {
                if (t.kind === 'sleep' && t.resume_thread) {
                    withCommandSource(drone, 'timer', () => {
                        setLuaExecutionPhase(drone, `timer sleep (${(t.trigger_time - drone.current_time).toFixed(3)}s delta)`);
                        try {
                            runCoroutine(L, t.resume_thread, 0, id, 'timer sleep resume');
                        } finally {
                            setLuaExecutionPhase(drone, null);
                        }
                    });
                } else if (typeof t.callback_ref === 'number') {
                    const T = lua.lua_newthread(L);
                    lua.lua_rawgeti(L, lua.LUA_REGISTRYINDEX, t.callback_ref);
                    lua.lua_xmove(L, T, 1);

                    if (lua.lua_isfunction(T, -1)) {
                        withCommandSource(drone, 'timer', () => {
                            setLuaExecutionPhase(drone, `timer callback (${t.period || 0}s)`);
                            try {
                                runCoroutine(L, T, 0, id, 'timer callback');
                            } finally {
                                setLuaExecutionPhase(drone, null);
                            }
                        });
                    } else {
                        lua.lua_pop(T, 1);
                    }

                    lua.lua_pop(L, 1);
                }

                if (t.one_shot) {
                    if (typeof t.callback_ref === 'number') {
                        lauxlib.luaL_unref(L, lua.LUA_REGISTRYINDEX, t.callback_ref);
                    }
                    drone.timers.splice(i, 1);
                } else {
                    t.trigger_time = drone.current_time + (t.period || 0);
                    if (t.next_trigger) t.next_trigger = t.trigger_time;
                }
            }
        }
    }
}

export function triggerLuaCallback(id: string, eventId: number) {
    const drone = drones[id];
    if (!drone || !drone.luaState) return;
    const L = drone.luaState;
    beginEventCallbackPhase(drone);
    setLuaExecutionPhase(drone, `callback(event=${eventId})`);

    const lua = fengari.lua;
    const baseTop = lua.lua_gettop(L);
    // lua_newthread() pushes the new thread onto L, so obtain the callback
    // only after creating it; otherwise lua_xmove() would move the thread
    // object instead of the callback function.
    const callbackThread = lua.lua_newthread(L);
    lua.lua_getglobal(L, fengari.to_luastring('callback'));
    if (lua.lua_isfunction(L, -1)) {
        // The real autopilot invokes callback(event) from a resumable Lua
        // context. Official scripts can therefore call sleep() from inside
        // callback; sleep yields the current coroutine. Calling callback via
        // lua_pcall() on the main state incorrectly produces
        // "attempt to yield from outside a coroutine".
        lua.lua_xmove(L, callbackThread, 1);
        lua.lua_pushinteger(callbackThread, eventId);
        try {
            runCoroutine(L, callbackThread, 1, id, `callback(event=${eventId})`);
        } catch (e) {
            console.error(`[JS Error] Fatal error in triggerLuaCallback(${eventId}):`, e);
            log(`[JS Error] Fatal callback error ${eventId}: ${e}`, 'error');
        } finally {
            lua.lua_settop(L, baseTop);
            setLuaExecutionPhase(drone, null);
        }
    } else {
        lua.lua_settop(L, baseTop);
        setLuaExecutionPhase(drone, null);
    }
}
