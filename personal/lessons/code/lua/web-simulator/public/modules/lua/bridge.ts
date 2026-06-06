import { drones, getDroneFromLua } from '../core/state.js';
import { showDronePrintBubble } from '../drone/index.js';
import { log } from '../shared/logging/logger.js';
import { luaToStr } from './utils.js';
import {
    js_diag_describe_mce,
    js_diag_get_fsm_state,
    js_diag_log,
    js_diag_record_api_call
} from './diagnostics.js';
import { ap_push, ap_goToPoint, ap_goToLocalPoint, ap_updateYaw } from './autopilot.js';
import { sensors_pos, sensors_vel, sensors_accel, sensors_gyro, sensors_orientation, sensors_range, sensors_battery, sensors_tof, sensors_rc } from './sensors.js';
import { timer_callLater, timer_new, sys_time, sys_deltaTime, js_sleep } from './timers.js';
import { camera_requestMakeShot, camera_checkRequestShot, camera_requestRecordStart, camera_requestRecordStop, gpio_new, uart_new, spi_new } from './hardware.js';
import { ledbar_fromHSV, js_init_leds, js_ledbar_set } from './leds.js';
import { LUA_SETUP_SCRIPT } from './setup-script.js';

export function extractLuaSyntaxLine(errorMsg: string): number | null {
    const match = errorMsg.match(/:(\d+):/);
    return match ? Number(match[1]) : null;
}

const lua_print = function(L: any) {
    const drone = getDroneFromLua(L);
    const rawText = window.fengari.lua.lua_tostring(L, 1);
    const text = rawText ? window.fengari.to_jsstring(rawText) : '';
    showDronePrintBubble(drone.id, text);
    log(`[Lua print] ${text}`, 'info');
    return 0;
};

function registerLuaBridgeFunctions(luaState: any) {
    const lua = window.fengari.lua;

    lua.lua_register(luaState, 'js_ap_push', ap_push);
    lua.lua_register(luaState, 'js_ap_goToPoint', ap_goToPoint);
    lua.lua_register(luaState, 'js_ap_goToLocalPoint', ap_goToLocalPoint);
    lua.lua_register(luaState, 'js_ap_updateYaw', ap_updateYaw);
    lua.lua_register(luaState, 'js_sensors_pos', sensors_pos);
    lua.lua_register(luaState, 'js_sensors_vel', sensors_vel);
    lua.lua_register(luaState, 'js_sensors_accel', sensors_accel);
    lua.lua_register(luaState, 'js_sensors_gyro', sensors_gyro);
    lua.lua_register(luaState, 'js_sensors_orientation', sensors_orientation);
    lua.lua_register(luaState, 'js_sensors_range', sensors_range);
    lua.lua_register(luaState, 'js_sensors_battery', sensors_battery);
    lua.lua_register(luaState, 'js_sensors_tof', sensors_tof);
    lua.lua_register(luaState, 'js_sensors_rc', sensors_rc);
    lua.lua_register(luaState, 'js_timer_callLater', timer_callLater);
    lua.lua_register(luaState, 'js_timer_new', timer_new);
    lua.lua_register(luaState, 'js_camera_requestMakeShot', camera_requestMakeShot);
    lua.lua_register(luaState, 'js_camera_checkRequestShot', camera_checkRequestShot);
    lua.lua_register(luaState, 'js_camera_requestRecordStart', camera_requestRecordStart);
    lua.lua_register(luaState, 'js_camera_requestRecordStop', camera_requestRecordStop);
    lua.lua_register(luaState, 'js_gpio_new', gpio_new);
    lua.lua_register(luaState, 'js_uart_new', uart_new);
    lua.lua_register(luaState, 'js_spi_new', spi_new);
    lua.lua_register(luaState, 'js_sys_time', sys_time);
    lua.lua_register(luaState, 'js_sys_deltaTime', sys_deltaTime);
    lua.lua_register(luaState, 'js_ledbar_fromHSV', ledbar_fromHSV);
    lua.lua_register(luaState, 'js_init_leds', js_init_leds);
    lua.lua_register(luaState, 'js_ledbar_set', js_ledbar_set);
    lua.lua_register(luaState, 'js_sleep', js_sleep);
    lua.lua_register(luaState, 'js_print', lua_print);
    lua.lua_register(luaState, 'js_diag_log', js_diag_log);
    lua.lua_register(luaState, 'js_diag_record_api_call', js_diag_record_api_call);
    lua.lua_register(luaState, 'js_diag_get_fsm_state', js_diag_get_fsm_state);
    lua.lua_register(luaState, 'js_diag_describe_mce', js_diag_describe_mce);
}

export function setupLuaBridgeForDrone(id: string) {
    const lua = window.fengari.lua;
    const lauxlib = window.fengari.lauxlib;
    const lualib = window.fengari.lualib;

    const luaState = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(luaState);

    registerLuaBridgeFunctions(luaState);

    lua.lua_pushstring(luaState, window.fengari.to_luastring(id));
    lua.lua_setglobal(luaState, window.fengari.to_luastring('__DRONE_ID__'));

    const res = lauxlib.luaL_dostring(luaState, window.fengari.to_luastring(LUA_SETUP_SCRIPT));
    if (res !== 0) {
        const errVal = lua.lua_tostring(luaState, -1);
        console.error(`[Lua Bridge] Failed to setup environment for ${id}:`, luaToStr(errVal, luaState));
        log(`Lua Setup Error (${id}): ${luaToStr(errVal, luaState)}`, 'error');
    }

    if (drones[id]) {
        drones[id].luaState = luaState;
    }

    return luaState;
}
