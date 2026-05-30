import { getDroneFromLua } from '../core/state.js';
import { log } from '../shared/logging/logger.js';

export const timer_callLater = function(L: any) {
    if (window.fengari.lua.lua_gettop(L) < 2) return 0;
    const requestedDelay = window.fengari.lua.lua_tonumber(L, 1);
    const delay = Number.isFinite(requestedDelay) ? Math.max(0, requestedDelay) : 0;
    window.fengari.lua.lua_pushvalue(L, 2);
    const func_ref = window.fengari.lauxlib.luaL_ref(L, window.fengari.lua.LUA_REGISTRYINDEX);
    const simState = getDroneFromLua(L);
    
    simState.timers.push({
        trigger_time: simState.current_time + delay,
        callback_ref: func_ref,
        one_shot: true,
        running: true,
        kind: 'callback',
        sourceState: simState.fsmState
    });
    log(`[Lua Timer] callLater(${delay}s) registered`, 'info');
    return 0;
};

export const timer_new = function(L: any) {
    if (window.fengari.lua.lua_gettop(L) < 2) return 0;
    const requestedPeriod = window.fengari.lua.lua_tonumber(L, 1);
    const period = Number.isFinite(requestedPeriod) ? Math.max(0, requestedPeriod) : 0;
    window.fengari.lua.lua_pushvalue(L, 2);
    const func_ref = window.fengari.lauxlib.luaL_ref(L, window.fengari.lua.LUA_REGISTRYINDEX);
    const simState = getDroneFromLua(L);
    
    const timer_obj = {
        period: period,
        callback_ref: func_ref,
        next_trigger: simState.current_time + period,
        trigger_time: simState.current_time + period,
        one_shot: false,
        running: false,
        kind: 'callback',
        sourceState: simState.fsmState
    };
    
    simState.timers.push(timer_obj);
    log(`[Lua Timer] new(${period}s) created`, 'info');
    
    window.fengari.lua.lua_newtable(L);
    window.fengari.lua.lua_pushlightuserdata(L, timer_obj);
    window.fengari.lua.lua_setfield(L, -2, "__ptr");
    
    window.fengari.lua.lua_pushcfunction(L, (L: any) => {
        window.fengari.lua.lua_getfield(L, 1, "__ptr");
        const ptr = window.fengari.lua.lua_touserdata(L, -1);
        ptr.running = true;
        ptr.next_trigger = getDroneFromLua(L).current_time + ptr.period;
        ptr.trigger_time = ptr.next_trigger;
        ptr.sourceState = getDroneFromLua(L).fsmState;
        log(`[Lua Timer] start()`, 'info');
        return 0;
    });
    window.fengari.lua.lua_setfield(L, -2, "start");
    
    window.fengari.lua.lua_pushcfunction(L, (L: any) => {
        window.fengari.lua.lua_getfield(L, 1, "__ptr");
        const ptr = window.fengari.lua.lua_touserdata(L, -1);
        ptr.running = false;
        log(`[Lua Timer] stop()`, 'info');
        return 0;
    });
    window.fengari.lua.lua_setfield(L, -2, "stop");
    
    return 1;
};

export const sys_time = function(L: any) {
    const simState = getDroneFromLua(L);
    window.fengari.lua.lua_pushnumber(L, simState.current_time);
    return 1;
};

export const sys_deltaTime = function(L: any) {
    window.fengari.lua.lua_pushnumber(L, 0.05); 
    return 1;
};

export const js_sleep = function(L: any) {
    const requestedDelay = window.fengari.lua.lua_tonumber(L, 1);
    const delay = Number.isFinite(requestedDelay) ? Math.max(0, requestedDelay) : 0;
    const simState = getDroneFromLua(L);

    simState.timers.push({
        trigger_time: simState.current_time + delay,
        one_shot: true,
        running: true,
        resume_thread: L,
        kind: 'sleep',
        sourceState: simState.fsmState
    });
    log(`[Lua Timer] sleep(${delay}s) registered`, 'info');
    return window.fengari.lua.lua_yield(L, 0);
};
