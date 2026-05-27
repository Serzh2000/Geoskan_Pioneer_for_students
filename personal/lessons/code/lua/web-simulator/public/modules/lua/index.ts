import { drones, currentDroneId, getDroneFromLua } from '../core/state.js';
import { showDronePrintBubble } from '../drone/index.js';
import { log } from '../shared/logging/logger.js';
import { beginEventCallbackPhase, withCommandSource } from '../autopilot/fsm.js';
import { luaToStr } from './utils.js';
import { triggerEvent } from '../autopilot/mce-events.js';
import { runCoroutine } from './runner.js';
import { ap_push, ap_goToPoint, ap_goToLocalPoint, ap_updateYaw } from './autopilot.js';
import { sensors_pos, sensors_vel, sensors_accel, sensors_gyro, sensors_orientation, sensors_range, sensors_battery, sensors_tof, sensors_rc } from './sensors.js';
import { timer_callLater, timer_new, sys_time, sys_deltaTime, js_sleep } from './timers.js';
import { camera_requestMakeShot, camera_checkRequestShot, camera_requestRecordStart, camera_requestRecordStop, gpio_new, uart_new, spi_new } from './hardware.js';
import { ledbar_fromHSV, js_init_leds, js_ledbar_set } from './leds.js';

const lua_print = function(L: any) {
    const drone = getDroneFromLua(L);
    const rawText = window.fengari.lua.lua_tostring(L, 1);
    const text = rawText ? window.fengari.to_jsstring(rawText) : '';
    showDronePrintBubble(drone.id, text);
    log(`[Lua print] ${text}`, 'info');
    return 0;
};

export function setupLuaBridgeForDrone(id: string) {
    const L = window.fengari.L;
    const lua = window.fengari.lua;
    const lauxlib = window.fengari.lauxlib;
    const lualib = window.fengari.lualib;

    const setupScript = `
        Ev = { 
            MCE_PREFLIGHT=1, MCE_TAKEOFF=2, MCE_LANDING=3, ENGINES_ARM=4, ENGINES_DISARM=5, 
            TAKEOFF_COMPLETE=6, COPTER_LANDED=7, LOW_VOLTAGE=8, STATE_CHANGED=9, POINT_REACHED=10,
            ENGINES_STARTED=11, POINT_DECELERATION=12, LOW_VOLTAGE1=13, LOW_VOLTAGE2=14,
            SYNC_START=15, SHOCK=16, CONTROL_FAIL=17, ENGINE_FAIL=18
        }
        
        -- Поддержка старого API: делаем константы глобальными
        for k, v in pairs(Ev) do
            _G[k] = v
        end

        ap = { 
            push = js_ap_push,
            goToPoint = js_ap_goToPoint,
            goToLocalPoint = js_ap_goToLocalPoint,
            updateYaw = js_ap_updateYaw
        }
        Sensors = { 
            lpsPosition = js_sensors_pos,
            lpsVelocity = js_sensors_vel,
            accel = js_sensors_accel,
            gyro = js_sensors_gyro,
            orientation = js_sensors_orientation,
            range = js_sensors_range,
            battery = js_sensors_battery,
            tof = js_sensors_tof,
            rc = js_sensors_rc
        }
        Timer = { 
            callLater = js_timer_callLater,
            new = js_timer_new
        }
        camera = {
            requestMakeShot = js_camera_requestMakeShot,
            checkRequestShot = js_camera_checkRequestShot,
            requestRecordStart = js_camera_requestRecordStart,
            requestRecordStop = js_camera_requestRecordStop,
            checkRequestRecord = js_camera_checkRequestShot
        }
        Gpio = { new = js_gpio_new, A=1, B=2, C=3, D=4, E=5, INPUT=0, OUTPUT=1, ALTFU=2 }
        Uart = { new = js_uart_new, PARITY_NONE=0, PARITY_EVEN=1, PARITY_ODD=2, ONE_STOP=1, TWO_STOP=2 }
        Spi = { new = js_spi_new, MSB=0, LSB=1, MODE0=0, MODE1=1, MODE2=2, MODE3=3 }
        
        time = js_sys_time
        deltaTime = js_sys_deltaTime
        launchTime = function() return 0 end
        boardNumber = "SIMULATOR"
        sleep = js_sleep
        print = function(...)
            local parts = {}
            for i = 1, select("#", ...) do
                parts[i] = tostring(select(i, ...))
            end
            js_print(table.concat(parts, "\t"))
        end

        Ledbar = {}
        Ledbar.fromHSV = js_ledbar_fromHSV
        Ledbar.__index = Ledbar
        function Ledbar.new(count)
            local obj = setmetatable({ count = count }, Ledbar)
            js_init_leds(count)
            return obj
        end
        function Ledbar:set(index, r, g, b, w)
            js_ledbar_set(index, r or 0, g or 0, b or 0, w or 0)
        end
        function callback(event) end
    `;

    const luaState = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(luaState);

    lua.lua_register(luaState, "js_ap_push", ap_push);
    lua.lua_register(luaState, "js_ap_goToPoint", ap_goToPoint);
    lua.lua_register(luaState, "js_ap_goToLocalPoint", ap_goToLocalPoint);
    lua.lua_register(luaState, "js_ap_updateYaw", ap_updateYaw);
    lua.lua_register(luaState, "js_sensors_pos", sensors_pos);
    lua.lua_register(luaState, "js_sensors_vel", sensors_vel);
    lua.lua_register(luaState, "js_sensors_accel", sensors_accel);
    lua.lua_register(luaState, "js_sensors_gyro", sensors_gyro);
    lua.lua_register(luaState, "js_sensors_orientation", sensors_orientation);
    lua.lua_register(luaState, "js_sensors_range", sensors_range);
    lua.lua_register(luaState, "js_sensors_battery", sensors_battery);
    lua.lua_register(luaState, "js_sensors_tof", sensors_tof);
    lua.lua_register(luaState, "js_sensors_rc", sensors_rc);
    lua.lua_register(luaState, "js_timer_callLater", timer_callLater);
    lua.lua_register(luaState, "js_timer_new", timer_new);
    lua.lua_register(luaState, "js_camera_requestMakeShot", camera_requestMakeShot);
    lua.lua_register(luaState, "js_camera_checkRequestShot", camera_checkRequestShot);
    lua.lua_register(luaState, "js_camera_requestRecordStart", camera_requestRecordStart);
    lua.lua_register(luaState, "js_camera_requestRecordStop", camera_requestRecordStop);
    lua.lua_register(luaState, "js_gpio_new", gpio_new);
    lua.lua_register(luaState, "js_uart_new", uart_new);
    lua.lua_register(luaState, "js_spi_new", spi_new);
    lua.lua_register(luaState, "js_sys_time", sys_time);
    lua.lua_register(luaState, "js_sys_deltaTime", sys_deltaTime);
    lua.lua_register(luaState, "js_ledbar_fromHSV", ledbar_fromHSV);
    lua.lua_register(luaState, "js_init_leds", js_init_leds);
    lua.lua_register(luaState, "js_ledbar_set", js_ledbar_set);
    lua.lua_register(luaState, "js_sleep", js_sleep);
    lua.lua_register(luaState, "js_print", lua_print);

    // Save Drone ID in the Lua registry/global
    lua.lua_pushstring(luaState, window.fengari.to_luastring(id));
    lua.lua_setglobal(luaState, window.fengari.to_luastring("__DRONE_ID__"));

    const res = lauxlib.luaL_dostring(luaState, window.fengari.to_luastring(setupScript));
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

export function runLuaScript(id: string, scriptContent: string) {
    const drone = drones[id];
    if (!drone) return;

    if (drone.luaState) {
        try {
            window.fengari.lua.lua_close(drone.luaState);
        } catch (e) {
            console.error("Error closing lua state:", e);
        }
    }
    
    let L;
    try {
        L = setupLuaBridgeForDrone(id);
    } catch (e) {
        console.error("Error in setupLuaBridgeForDrone:", e);
        throw e;
    }

    const loadStatus = window.fengari.lauxlib.luaL_loadstring(L, window.fengari.to_luastring(scriptContent));
    if (loadStatus !== 0) {
        const errVal = window.fengari.lua.lua_tostring(L, -1);
        const errorMsg = luaToStr(errVal, L);
        log(`Ошибка синтаксиса (${id}): ${errorMsg}`, 'error');
        window.fengari.lua.lua_pop(L, 1);
        return;
    }

    const T = window.fengari.lua.lua_newthread(L);
    window.fengari.lua.lua_pushvalue(L, -2); // copy function to top of L
    window.fengari.lua.lua_xmove(L, T, 1);   // move function from L to T
    
    try {
        runCoroutine(L, T, 0, id);
    } catch (e) {
        console.error("Error in runCoroutine:", e);
        throw e;
    }
}

export function stopLuaScript(id: string) {
    const drone = drones[id];
    if (drone && drone.luaState) {
        window.fengari.lua.lua_close(drone.luaState);
        drone.luaState = null;
    }
}

export function updateTimers() {
    const lua = window.fengari.lua;
    const lauxlib = window.fengari.lauxlib;

    for (const id in drones) {
        const drone = drones[id];
        if (!drone.running || !drone.luaState) continue;
        const L = drone.luaState;

        for (let i = drone.timers.length - 1; i >= 0; i--) {
            const t = drone.timers[i];
            if (t.running && drone.current_time >= t.trigger_time) {
                
                const T = lua.lua_newthread(L);
                lua.lua_rawgeti(L, lua.LUA_REGISTRYINDEX, t.callback_ref);
                lua.lua_xmove(L, T, 1);
                
                if (lua.lua_isfunction(T, -1)) {
                    withCommandSource(drone, 'timer', () => {
                        runCoroutine(L, T, 0, id);
                    });
                } else {
                    lua.lua_pop(T, 1);
                }
                
                lua.lua_pop(L, 1);

                if (t.one_shot) {
                    lauxlib.luaL_unref(L, lua.LUA_REGISTRYINDEX, t.callback_ref);
                    drone.timers.splice(i, 1);
                } else {
                    t.trigger_time = drone.current_time + (t.period || 0); 
                    if(t.next_trigger) t.next_trigger = t.trigger_time;
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
    
    // console.log(`[Lua Debug] Triggering callback ${eventId} for drone ${id}`);
    
    window.fengari.lua.lua_getglobal(L, window.fengari.to_luastring("callback"));
    if (window.fengari.lua.lua_isfunction(L, -1)) {
        window.fengari.lua.lua_pushinteger(L, eventId);
        try {
            if (window.fengari.lua.lua_pcall(L, 1, 0, 0) !== 0) {
                const errVal = window.fengari.lua.lua_tostring(L, -1);
                const errorMsg = luaToStr(errVal, L);
                console.error(`[Lua Error] callback(${eventId}) on ${id}:`, errorMsg);
                log(`[Lua Error] ${errorMsg}`, 'error');
                window.fengari.lua.lua_pop(L, 1);
            }
        } catch (e) {
            console.error(`[JS Error] Fatal error in triggerLuaCallback(${eventId}):`, e);
            log(`[JS Error] Фатальная ошибка в коллбэке ${eventId}: ${e}`, 'error');
        }
    } else {
        window.fengari.lua.lua_pop(L, 1);
    }
}

