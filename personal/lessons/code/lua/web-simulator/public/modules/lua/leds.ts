import * as fengari from 'fengari-web';
import { getDroneFromLua } from '../core/state.js';

export const ledbar_fromHSV = function(L: any) {
    const h = fengari.lua.lua_tonumber(L, 1);
    const s = fengari.lua.lua_tonumber(L, 2);
    const v = fengari.lua.lua_tonumber(L, 3);
    
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    
    fengari.lua.lua_pushnumber(L, r);
    fengari.lua.lua_pushnumber(L, g);
    fengari.lua.lua_pushnumber(L, b);
    return 3;
};

export const js_init_leds = function(L: any) {
    const count = fengari.lua.lua_tointeger(L, 1);
    const simState = getDroneFromLua(L);
    simState.leds = Array.from({ length: count }, () => ({r: 0, g: 0, b: 0, w: 0}));
    return 0;
};

export const js_ledbar_set = function(L: any) {
    if (fengari.lua.lua_gettop(L) < 4) return 0;
    const index = fengari.lua.lua_tointeger(L, 1);
    const r = fengari.lua.lua_tonumber(L, 2);
    const g = fengari.lua.lua_tonumber(L, 3);
    const b = fengari.lua.lua_tonumber(L, 4);
    
    const simState = getDroneFromLua(L);
    if (simState.leds && index >= 0 && index < simState.leds.length) {
        simState.leds[index] = { r: r * 255, g: g * 255, b: b * 255, w: 0 };
    }
    return 0;
};

