import * as fengari from 'fengari-web';
import { getDroneFromLua, simSettings } from '../core/state.js';
import { getAutopilotRuntimeConfig } from '../autopilot/params-runtime.js';
import { measureSurfaceBelow, readOpticalFlow } from '../sensors/downward.js';

export const sensors_pos = function(L: any) {
    const simState = getDroneFromLua(L);
    fengari.lua.lua_pushnumber(L, simState.pos.x);
    fengari.lua.lua_pushnumber(L, simState.pos.y);
    fengari.lua.lua_pushnumber(L, simState.pos.z);
    return 3;
};

export const sensors_vel = function(L: any) {
    const simState = getDroneFromLua(L);
    fengari.lua.lua_pushnumber(L, simState.vel.x);
    fengari.lua.lua_pushnumber(L, simState.vel.y);
    fengari.lua.lua_pushnumber(L, simState.vel.z);
    return 3;
};

export const sensors_accel = function(L: any) {
    const simState = getDroneFromLua(L);
    fengari.lua.lua_pushnumber(L, simState.accel.x);
    fengari.lua.lua_pushnumber(L, simState.accel.y);
    fengari.lua.lua_pushnumber(L, simState.accel.z);
    return 3;
};

export const sensors_gyro = function(L: any) {
    const simState = getDroneFromLua(L);
    fengari.lua.lua_pushnumber(L, simState.gyro.x);
    fengari.lua.lua_pushnumber(L, simState.gyro.y);
    fengari.lua.lua_pushnumber(L, simState.gyro.z);
    return 3;
};

export const sensors_orientation = function(L: any) {
    const simState = getDroneFromLua(L);
    fengari.lua.lua_pushnumber(L, simState.orientation.roll);
    fengari.lua.lua_pushnumber(L, simState.orientation.pitch);
    fengari.lua.lua_pushnumber(L, simState.orientation.yaw);
    return 3;
};

// Distance to whatever is straight below - ground, a roof, a moving train.
function rangeBelow(simState: any) {
    const minHeight = getAutopilotRuntimeConfig().sensors.altMinHeight;
    const range = measureSurfaceBelow(simState.pos).range;
    return range >= minHeight ? range : 0;
}

export const sensors_range = function(L: any) {
    fengari.lua.lua_pushnumber(L, rangeBelow(getDroneFromLua(L)));
    return 1;
};

export const sensors_battery = function(L: any) {
    const simState = getDroneFromLua(L);
    fengari.lua.lua_pushnumber(L, simState.batteryVoltage);
    return 1;
};

export const sensors_tof = function(L: any) {
    fengari.lua.lua_pushnumber(L, rangeBelow(getDroneFromLua(L)) * 1000);
    return 1;
};

/** flowX, flowY (rad/s, body frame), quality 0..255 - see sensors/downward.ts. */
export const sensors_opticalFlow = function(L: any) {
    const reading = readOpticalFlow(getDroneFromLua(L));
    fengari.lua.lua_pushnumber(L, reading.flowX);
    fengari.lua.lua_pushnumber(L, reading.flowY);
    fengari.lua.lua_pushinteger(L, reading.quality);
    return 3;
};

function normalizeRcPwmToUnit(channel: number, neutral = 1500) {
    return Math.max(-1, Math.min(1, (channel - neutral) / 500));
}

export const sensors_rc = function(L: any) {
    const simState = getDroneFromLua(L);
    if (!simSettings.gamepadConnected) {
        for (let i = 0; i < 8; i += 1) {
            fengari.lua.lua_pushnumber(L, 0);
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

    fengari.lua.lua_pushnumber(L, ch1);
    fengari.lua.lua_pushnumber(L, ch2);
    fengari.lua.lua_pushnumber(L, ch3);
    fengari.lua.lua_pushnumber(L, ch4);
    fengari.lua.lua_pushnumber(L, ch5);
    fengari.lua.lua_pushnumber(L, ch6);
    fengari.lua.lua_pushnumber(L, ch7);
    fengari.lua.lua_pushnumber(L, ch8);
    return 8;
};
