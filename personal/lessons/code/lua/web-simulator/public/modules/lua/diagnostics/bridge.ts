/**
 * Fengari bridge callbacks для Lua diagnostics.
 * Держит только чтение аргументов из Lua и проксирование в state helpers.
 */
import { getDroneFromLua } from '../../core/state.js';
import type { LuaDiagnosticLevel } from '../../core/state.js';
import {
    describeCommandId,
    normalizeLocation,
    pushLuaRuntimeLog,
    recordLuaApiCall
} from './state.js';

function readLuaStringArg(L: any, index: number) {
    const value = window.fengari.lua.lua_tostring(L, index);
    return value ? window.fengari.to_jsstring(value) : '';
}

function readLuaNumberArg(L: any, index: number) {
    return Number(window.fengari.lua.lua_tonumber(L, index));
}

export const js_diag_log = function(L: any) {
    const drone = getDroneFromLua(L);
    const level = (readLuaStringArg(L, 1) || 'info').toLowerCase() as LuaDiagnosticLevel;
    const scope = readLuaStringArg(L, 2) || 'Lua';
    const message = readLuaStringArg(L, 3) || 'Пустое диагностическое сообщение';
    const location = readLuaStringArg(L, 4) || null;
    pushLuaRuntimeLog(drone, level, scope, message, location);
    return 0;
};

export const js_diag_record_api_call = function(L: any) {
    const drone = getDroneFromLua(L);
    const api = readLuaStringArg(L, 1) || 'unknown';
    const location = normalizeLocation(readLuaStringArg(L, 2));
    const argumentsText = readLuaStringArg(L, 3) || '';
    recordLuaApiCall(drone, api, location, argumentsText);
    return 0;
};

export const js_diag_get_fsm_state = function(L: any) {
    const drone = getDroneFromLua(L);
    window.fengari.lua.lua_pushstring(L, window.fengari.to_luastring(drone.fsmState));
    return 1;
};

export const js_diag_describe_mce = function(L: any) {
    const commandId = readLuaNumberArg(L, 1);
    window.fengari.lua.lua_pushstring(L, window.fengari.to_luastring(describeCommandId(commandId)));
    return 1;
};
