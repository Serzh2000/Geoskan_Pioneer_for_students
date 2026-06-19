import { getDroneFromLua, simSettings } from '../core/state.js';
import { getAutopilotRuntimeConfig } from '../autopilot/params-runtime.js';

export const sensors_pos = function(L: any) {
    const simState = getDroneFromLua(L);
    window.fengari.lua.lua_pushnumber(L, simState.pos.x);
    window.fengari.lua.lua_pushnumber(L, simState.pos.y);
    window.fengari.lua.lua_pushnumber(L, simState.pos.z);
    return 3;
};

export const sensors_vel = function(L: any) {
    const simState = getDroneFromLua(L);
    window.fengari.lua.lua_pushnumber(L, simState.vel.x);
    window.fengari.lua.lua_pushnumber(L, simState.vel.y);
    window.fengari.lua.lua_pushnumber(L, simState.vel.z);
    return 3;
};

export const sensors_accel = function(L: any) {
    const simState = getDroneFromLua(L);
    window.fengari.lua.lua_pushnumber(L, simState.accel.x);
    window.fengari.lua.lua_pushnumber(L, simState.accel.y);
    window.fengari.lua.lua_pushnumber(L, simState.accel.z);
    return 3;
};

export const sensors_gyro = function(L: any) {
    const simState = getDroneFromLua(L);
    window.fengari.lua.lua_pushnumber(L, simState.gyro.x);
    window.fengari.lua.lua_pushnumber(L, simState.gyro.y);
    window.fengari.lua.lua_pushnumber(L, simState.gyro.z);
    return 3;
};

export const sensors_orientation = function(L: any) {
    const simState = getDroneFromLua(L);
    window.fengari.lua.lua_pushnumber(L, simState.orientation.roll);
    window.fengari.lua.lua_pushnumber(L, simState.orientation.pitch);
    window.fengari.lua.lua_pushnumber(L, simState.orientation.yaw);
    return 3;
};

export const sensors_range = function(L: any) {
    const simState = getDroneFromLua(L);
    const minHeight = getAutopilotRuntimeConfig().sensors.altMinHeight;
    window.fengari.lua.lua_pushnumber(L, simState.pos.z >= minHeight ? simState.pos.z : 0);
    return 1;
};

export const sensors_battery = function(L: any) {
    const simState = getDroneFromLua(L);
    window.fengari.lua.lua_pushnumber(L, simState.batteryVoltage);
    return 1;
};

export const sensors_tof = function(L: any) {
    const simState = getDroneFromLua(L);
    const minHeight = getAutopilotRuntimeConfig().sensors.altMinHeight;
    const rangeMeters = simState.pos.z >= minHeight ? simState.pos.z : 0;
    window.fengari.lua.lua_pushnumber(L, rangeMeters * 1000);
    return 1;
};

function normalizeRcPwmToUnit(channel: number, neutral = 1500) {
    return Math.max(-1, Math.min(1, (channel - neutral) / 500));
}

export const sensors_rc = function(L: any) {
    const simState = getDroneFromLua(L);
    if (!simSettings.gamepadConnected) {
        for (let i = 0; i < 8; i += 1) {
            window.fengari.lua.lua_pushnumber(L, 0);
        }
        return 8;
    }

    const channels = simState.rcChannels ?? [];
    const getChannel = (idx: number, fallback: number) => {
        const value = channels[idx];
        return typeof value === 'number' ? value : fallback;
    };

    // CH1..CH4 sticks use 1500 as neutral, CH5..CH8 switches are centered around 1500 as well.
    const ch1 = normalizeRcPwmToUnit(getChannel(0, 1500), 1500);
    const ch2 = normalizeRcPwmToUnit(getChannel(1, 1500), 1500);
    const ch3 = normalizeRcPwmToUnit(getChannel(2, 1500), 1500);
    const ch4 = normalizeRcPwmToUnit(getChannel(3, 1500), 1500);
    const ch5 = normalizeRcPwmToUnit(getChannel(4, 1000), 1500);
    const ch6 = normalizeRcPwmToUnit(getChannel(5, 1000), 1500);
    const ch7 = normalizeRcPwmToUnit(getChannel(6, 1000), 1500);
    const ch8 = normalizeRcPwmToUnit(getChannel(7, getChannel(6, 1000)), 1500);

    window.fengari.lua.lua_pushnumber(L, ch1);
    window.fengari.lua.lua_pushnumber(L, ch2);
    window.fengari.lua.lua_pushnumber(L, ch3);
    window.fengari.lua.lua_pushnumber(L, ch4);
    window.fengari.lua.lua_pushnumber(L, ch5);
    window.fengari.lua.lua_pushnumber(L, ch6);
    window.fengari.lua.lua_pushnumber(L, ch7);
    window.fengari.lua.lua_pushnumber(L, ch8);
    return 8;
};
