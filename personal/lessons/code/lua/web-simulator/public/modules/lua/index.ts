import { drones, currentDroneId, getDroneFromLua } from '../core/state.js';
import { showDronePrintBubble } from '../drone/index.js';
import { log } from '../shared/logging/logger.js';
import { beginEventCallbackPhase, withCommandSource } from '../autopilot/fsm.js';
import { luaToStr } from './utils.js';
import { triggerEvent } from '../autopilot/mce-events.js';
import {
    createLuaRuntimeFailureError,
    js_diag_describe_mce,
    js_diag_get_fsm_state,
    js_diag_log,
    js_diag_record_api_call,
    rememberLuaErrorStack,
    setLuaExecutionPhase
} from './diagnostics.js';
import { runCoroutine } from './runner.js';
import { ap_push, ap_goToPoint, ap_goToLocalPoint, ap_updateYaw } from './autopilot.js';
import { sensors_pos, sensors_vel, sensors_accel, sensors_gyro, sensors_orientation, sensors_range, sensors_battery, sensors_tof, sensors_rc } from './sensors.js';
import { timer_callLater, timer_new, sys_time, sys_deltaTime, js_sleep } from './timers.js';
import { camera_requestMakeShot, camera_checkRequestShot, camera_requestRecordStart, camera_requestRecordStop, gpio_new, uart_new, spi_new } from './hardware.js';
import { ledbar_fromHSV, js_init_leds, js_ledbar_set } from './leds.js';
import { createScriptFailureError, showScriptFailureNotice } from '../app/script-execution-notice.js';

function extractLuaSyntaxLine(errorMsg: string): number | null {
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
        
        -- Duplicate API event constants: available via Ev and as globals
        for k, v in pairs(Ev) do
            _G[k] = v
        end

        local __ap_push_impl = js_ap_push
        local __ap_goToPoint_impl = js_ap_goToPoint
        local __ap_goToLocalPoint_impl = js_ap_goToLocalPoint
        local __ap_updateYaw_impl = js_ap_updateYaw
        local __timer_callLater_impl = js_timer_callLater
        local __timer_new_impl = js_timer_new

        local function __diag_location(level)
            local info = debug.getinfo(level or 3, "nSl")
            if not info then
                return "script:?:?"
            end
            local source = info.short_src or info.source or "script"
            local line = info.currentline or "?"
            local name = info.name and (" [" .. info.name .. "]") or ""
            return string.format("%s:%s%s", source, tostring(line), name)
        end

        local function __diag_format_value(value, depth)
            local valueType = type(value)
            depth = depth or 0
            if valueType == "string" then
                return string.format("%q", value)
            end
            if valueType ~= "table" then
                return tostring(value)
            end
            if depth >= 1 then
                return "{...}"
            end

            local parts = {}
            local count = 0
            for key, item in pairs(value) do
                count = count + 1
                if count > 6 then
                    parts[#parts + 1] = "..."
                    break
                end
                parts[#parts + 1] = tostring(key) .. "=" .. __diag_format_value(item, depth + 1)
            end
            return "{" .. table.concat(parts, ", ") .. "}"
        end

        local function __diag_format_args(...)
            local parts = {}
            for i = 1, select("#", ...) do
                parts[#parts + 1] = __diag_format_value(select(i, ...))
            end
            return table.concat(parts, ", ")
        end

        local function __diag_traceback(err)
            return debug.traceback(tostring(err), 2)
        end

        __traceback_handler = __diag_traceback

        local function __diag_log(level, scope, message, location)
            js_diag_log(level, scope, message, location or "")
        end

        local function __diag_record(api, location, argumentsText)
            js_diag_record_api_call(api, location, argumentsText)
        end

        local function __ensure_number(name, value, location)
            if type(value) ~= "number" then
                error(string.format("%s ожидал число, но получил %s; место вызова: %s", name, type(value), location), 3)
            end
        end

        local function __ensure_function(name, value, location)
            if type(value) ~= "function" then
                error(string.format("%s ожидал функцию callback, но получил %s; место вызова: %s", name, type(value), location), 3)
            end
        end

        ap = {}
        function ap.push(event)
            local location = __diag_location(2)
            local fsm = js_diag_get_fsm_state()
            local eventDesc = js_diag_describe_mce(event)
            local argumentsText = "event=" .. __diag_format_args(event)
            __diag_record("ap.push", location, argumentsText)
            __diag_log("debug", "ap.push", string.format("Перед вызовом: %s; FSM=%s", eventDesc, fsm), location)
            __ensure_number("ap.push", event, location)
            local ok, result = xpcall(function()
                return __ap_push_impl(event)
            end, __diag_traceback)
            if not ok then
                error(result, 0)
            end
            __diag_log("info", "ap.push", string.format("Команда отправлена в очередь: %s; FSM до вызова=%s", eventDesc, fsm), location)
            return result
        end

        function ap.goToPoint(lat, lon, alt)
            local location = __diag_location(2)
            __diag_record("ap.goToPoint", location, __diag_format_args(lat, lon, alt))
            __diag_log("debug", "ap.goToPoint", string.format("Перед вызовом: lat=%s, lon=%s, alt=%s; FSM=%s", tostring(lat), tostring(lon), tostring(alt), js_diag_get_fsm_state()), location)
            __ensure_number("ap.goToPoint(lat)", lat, location)
            __ensure_number("ap.goToPoint(lon)", lon, location)
            __ensure_number("ap.goToPoint(alt)", alt, location)
            local ok, result = xpcall(function()
                return __ap_goToPoint_impl(lat, lon, alt)
            end, __diag_traceback)
            if not ok then
                error(result, 0)
            end
            return result
        end

        function ap.goToLocalPoint(x, y, z, t)
            local location = __diag_location(2)
            __diag_record("ap.goToLocalPoint", location, __diag_format_args(x, y, z, t))
            __diag_log("debug", "ap.goToLocalPoint", string.format("Перед вызовом: x=%s, y=%s, z=%s, t=%s; FSM=%s", tostring(x), tostring(y), tostring(z), tostring(t), js_diag_get_fsm_state()), location)
            __ensure_number("ap.goToLocalPoint(x)", x, location)
            __ensure_number("ap.goToLocalPoint(y)", y, location)
            __ensure_number("ap.goToLocalPoint(z)", z, location)
            local ok, result = xpcall(function()
                return __ap_goToLocalPoint_impl(x, y, z, t)
            end, __diag_traceback)
            if not ok then
                error(result, 0)
            end
            return result
        end

        function ap.updateYaw(yaw)
            local location = __diag_location(2)
            __diag_record("ap.updateYaw", location, __diag_format_args(yaw))
            __diag_log("debug", "ap.updateYaw", string.format("Перед вызовом: yaw=%s; FSM=%s", tostring(yaw), js_diag_get_fsm_state()), location)
            __ensure_number("ap.updateYaw", yaw, location)
            local ok, result = xpcall(function()
                return __ap_updateYaw_impl(yaw)
            end, __diag_traceback)
            if not ok then
                error(result, 0)
            end
            return result
        end

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
        Timer = {}
        function Timer.callLater(delay, callback)
            local location = __diag_location(2)
            __diag_record("Timer.callLater", location, __diag_format_args(delay, callback))
            __diag_log("debug", "Timer.callLater", string.format("Регистрация таймера: delay=%s; FSM=%s", tostring(delay), js_diag_get_fsm_state()), location)
            __ensure_number("Timer.callLater(delay)", delay, location)
            __ensure_function("Timer.callLater(callback)", callback, location)
            local ok, result = xpcall(function()
                return __timer_callLater_impl(delay, callback)
            end, __diag_traceback)
            if not ok then
                error(result, 0)
            end
            return result
        end

        function Timer.new(period, callback)
            local location = __diag_location(2)
            __diag_record("Timer.new", location, __diag_format_args(period, callback))
            __diag_log("debug", "Timer.new", string.format("Создание периодического таймера: period=%s; FSM=%s", tostring(period), js_diag_get_fsm_state()), location)
            __ensure_number("Timer.new(period)", period, location)
            __ensure_function("Timer.new(callback)", callback, location)
            local ok, result = xpcall(function()
                return __timer_new_impl(period, callback)
            end, __diag_traceback)
            if not ok then
                error(result, 0)
            end
            return result
        end
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
    lua.lua_register(luaState, "js_diag_log", js_diag_log);
    lua.lua_register(luaState, "js_diag_record_api_call", js_diag_record_api_call);
    lua.lua_register(luaState, "js_diag_get_fsm_state", js_diag_get_fsm_state);
    lua.lua_register(luaState, "js_diag_describe_mce", js_diag_describe_mce);

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
    rememberLuaErrorStack(drone, null);
    setLuaExecutionPhase(drone, 'main chunk');

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
        window.fengari.lua.lua_pop(L, 1);
        try {
            window.fengari.lua.lua_close(L);
        } catch (e) {
            console.error('Error closing lua state after syntax failure:', e);
        }
        drone.luaState = null;
        throw createScriptFailureError('syntax', errorMsg, {
            line: extractLuaSyntaxLine(errorMsg)
        });
    }

    const T = window.fengari.lua.lua_newthread(L);
    window.fengari.lua.lua_pushvalue(L, -2); // copy function to top of L
    window.fengari.lua.lua_xmove(L, T, 1);   // move function from L to T
    
    try {
        runCoroutine(L, T, 0, id, 'main chunk');
    } catch (e) {
        console.error("Error in runCoroutine:", e);
        throw e;
    } finally {
        setLuaExecutionPhase(drone, null);
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
    setLuaExecutionPhase(drone, `callback(event=${eventId})`);
    
    // console.log(`[Lua Debug] Triggering callback ${eventId} for drone ${id}`);

    const lua = window.fengari.lua;
    const baseTop = lua.lua_gettop(L);
    lua.lua_getglobal(L, window.fengari.to_luastring("__traceback_handler"));
    const errorHandlerIndex = lua.lua_gettop(L);
    lua.lua_getglobal(L, window.fengari.to_luastring("callback"));
    if (lua.lua_isfunction(L, -1)) {
        lua.lua_pushinteger(L, eventId);
        try {
            if (lua.lua_pcall(L, 1, 0, errorHandlerIndex) !== 0) {
                const errVal = lua.lua_tostring(L, -1);
                const errorMsg = luaToStr(errVal, L);
                rememberLuaErrorStack(drone, errorMsg);
                console.error(`[Lua Error] callback(${eventId}) on ${id}:`, errorMsg);
                log(`[Lua Error] ${errorMsg}`, 'error');
                drone.running = false;
                drone.status = 'ОШИБКА';
                showScriptFailureNotice('lua', createLuaRuntimeFailureError(drone, `callback(event=${eventId})`, errorMsg));
                lua.lua_pop(L, 1);
            }
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

