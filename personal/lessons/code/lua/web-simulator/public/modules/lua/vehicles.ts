import * as fengari from 'fengari-web';
import { vehicleGetState, vehicleSetSpeed, vehicleStart, vehicleStop } from '../vehicles/api.js';

/*
 * Lua side of the vehicle API (setup-script.ts wraps these as Vehicle.*).
 * Each returns true, or nil + message so the Lua wrapper can raise a
 * readable error at the caller's line.
 */

function nameArg(L: any) {
    const raw = fengari.lua.lua_tostring(L, 1);
    return raw ? fengari.to_jsstring(raw) : '';
}

function guarded(L: any, run: () => number) {
    try {
        return run();
    } catch (error) {
        fengari.lua.lua_pushnil(L);
        fengari.lua.lua_pushstring(L, fengari.to_luastring(error instanceof Error ? error.message : String(error)));
        return 2;
    }
}

export const vehicle_start = (L: any) => guarded(L, () => {
    vehicleStart(nameArg(L));
    fengari.lua.lua_pushboolean(L, true);
    return 1;
});

export const vehicle_stop = (L: any) => guarded(L, () => {
    vehicleStop(nameArg(L));
    fengari.lua.lua_pushboolean(L, true);
    return 1;
});

export const vehicle_setSpeed = (L: any) => guarded(L, () => {
    vehicleSetSpeed(nameArg(L), fengari.lua.lua_tonumber(L, 2));
    fengari.lua.lua_pushboolean(L, true);
    return 1;
});

/** x, y, z, heading, speed, moving */
export const vehicle_state = (L: any) => guarded(L, () => {
    const state = vehicleGetState(nameArg(L));
    fengari.lua.lua_pushnumber(L, state.x);
    fengari.lua.lua_pushnumber(L, state.y);
    fengari.lua.lua_pushnumber(L, state.z);
    fengari.lua.lua_pushnumber(L, state.heading);
    fengari.lua.lua_pushnumber(L, state.speed);
    fengari.lua.lua_pushboolean(L, state.moving);
    return 6;
});
