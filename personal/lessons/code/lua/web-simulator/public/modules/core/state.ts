export type {
    AuxChannelRange,
    CommandSource,
    DroneFsmState,
    DroneState,
    FlightMode,
    GamepadInputRef,
    GamepadModeRanges,
    LedColor,
    LuaApiCallRecord,
    LuaDiagnosticLevel,
    LuaDiagnosticsState,
    LuaFsmTransitionRecord,
    LuaRuntimeLogEntry,
    Orientation,
    PioneerConnectionMethod,
    PioneerConnectionSettings,
    PythonExecutionTarget,
    QueuedMceCommand,
    ScriptLanguage,
    TickFlightCommand,
    TickCommandSignature,
    TimerTask,
    Vector3
} from './state-types.js';
import {
    DEFAULT_LUA_SCRIPT,
    DEFAULT_PYTHON_SCRIPT
} from './state-types.js';
export {
    DEFAULT_LUA_SCRIPT,
    DEFAULT_PYTHON_SCRIPT
} from './state-types.js';
import type {
    AuxChannelRange,
    DroneState,
    GamepadInputRef,
    ScriptLanguage,
    Vector3
} from './state-types.js';
import {
    createDroneRecord,
    createDefaultPioneerConnectionSettings,
    createEmptyLuaDiagnosticsState,
    isDroneArmed,
    resetDroneRuntimeState
} from './state-drone.js';

/**
 * Модуль глобального состояния симулятора.
 * Хранит данные обо всех дронах (позиции, скорости, логика автопилота),
 * настройках симуляции (скорость, трассеры), общем состоянии среды (работает/остановлено),
 * а также точки траектории для отрисовки шлейфа (pathPoints).
 */
export const drones: Record<string, DroneState> = {};
export let currentDroneId: string = 'drone_1';
export const MAX_PATH_POINTS = 2000;
export const pathPoints: Record<string, Vector3[]> = { 'drone_1': [] };

export let currentScriptLanguage: ScriptLanguage = 'lua';

export function setCurrentScriptLanguage(language: ScriptLanguage) {
    currentScriptLanguage = language;
}

export const simSettings = {
    showTracer: true,
    tracerColor: '#38bdf8',
    tracerWidth: 2,
    tracerShape: 'line', // 'line', 'points', 'both'
    showGizmo: true,
    simSpeed: 1.0,
    gamepadConnected: false,
    gamepadStickMode: 2 as 1 | 2 | 3 | 4,
    gamepadMapping: {
        roll: 'a2' as GamepadInputRef,
        pitch: 'a1' as GamepadInputRef,
        throttle: 'a3' as GamepadInputRef,
        yaw: 'a0' as GamepadInputRef,
        modeSwitch: 'b4' as GamepadInputRef,
        armSwitch: 'b5' as GamepadInputRef,
        magnetBtn: 'b6' as GamepadInputRef
    },
    gamepadCalibration: {
        min: Array.from({ length: 16 }, () => -1),
        max: Array.from({ length: 16 }, () => 1),
        center: Array.from({ length: 16 }, () => 0),
        isCalibrated: false
    },
    gamepadInversion: [false, false, false, true, false, false, false, false], // R, P, T, Y, Mode, Arm, Magnet
    gamepadAuxRanges: {
        arm: { min: 1800, max: 2100, center: 2000 } as AuxChannelRange,
        magnet: { min: 1800, max: 2100, center: 2000 } as AuxChannelRange
    },
    gamepadModeRanges: {
        // Standard 3-position switch values for RadioMaster TX12/TX15/TX16 (1000, 1500, 2000)
        loiter: { min: 900, max: 1250, center: 1000 } as AuxChannelRange,
        althold: { min: 1251, max: 1750, center: 1500 } as AuxChannelRange,
        stabilize: { min: 1751, max: 2100, center: 2000 } as AuxChannelRange
    }
};

const STORAGE_KEY = 'geoskan_sim_gamepad_settings';

export function saveGamepadSettings() {
    if (typeof localStorage === 'undefined') return;
    const data = {
        mapping: simSettings.gamepadMapping,
        inversion: simSettings.gamepadInversion,
        auxRanges: simSettings.gamepadAuxRanges,
        modeRanges: simSettings.gamepadModeRanges,
        stickMode: simSettings.gamepadStickMode
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadGamepadSettings() {
    if (typeof localStorage === 'undefined') return;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            if (data.mapping) Object.assign(simSettings.gamepadMapping, data.mapping);
            if (data.inversion) simSettings.gamepadInversion = data.inversion;
            if (data.auxRanges) Object.assign(simSettings.gamepadAuxRanges, data.auxRanges);
            if (data.modeRanges) Object.assign(simSettings.gamepadModeRanges, data.modeRanges);
            if (data.stickMode) simSettings.gamepadStickMode = data.stickMode;
        }
    } catch (e) {
        console.warn('[State] Failed to load gamepad settings:', e);
    }
}

// Load on init
loadGamepadSettings();

export function matchesAuxRange(value: number, range: AuxChannelRange): boolean {
    const min = Math.max(1000, Math.min(range.min, range.max));
    const max = Math.min(2000, Math.max(range.min, range.max));
    return value >= min && value <= max;
}

export function createDroneState(id: string, name: string, x: number = 0, y: number = 0, z: number = 0): DroneState {
    const drone = createDroneRecord(id, name, x, y, z);
    drones[id] = drone;
    pathPoints[id] = [];
    return drone;
}

// Initialize the first default drone
createDroneState('drone_1', 'Pioneer 1');

// Backward compatibility alias: simState points to the currently selected drone
export const simState = new Proxy({} as DroneState, {
    get: (target, prop) => {
        if (!drones[currentDroneId]) return undefined;
        return (drones[currentDroneId] as any)[prop];
    },
    set: (target, prop, value) => {
        if (!drones[currentDroneId]) return false;
        (drones[currentDroneId] as any)[prop] = value;
        return true;
    }
});

export function setCurrentDrone(id: string) {
    if (!drones[id]) return;
    currentDroneId = id;
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('drone-selection-changed', {
            detail: {
                droneId: id
            }
        }));
    }
}

export function ensureDronePythonConnectionSettings(id: string = currentDroneId) {
    const drone = drones[id];
    if (!drone) {
        return createDefaultPioneerConnectionSettings();
    }

    if (!drone.pythonConnection) {
        drone.pythonConnection = createDefaultPioneerConnectionSettings();
    }

    return drone.pythonConnection;
}

export function resetRuntimeStatePreservePose(id: string = currentDroneId) {
    const drone = drones[id];
    if (!drone) return;
    const posePos = { x: drone.pos.x, y: drone.pos.y, z: drone.pos.z };
    const poseOrientation = {
        roll: drone.orientation.roll,
        pitch: drone.orientation.pitch,
        yaw: drone.orientation.yaw
    };

    resetState(id);

    drone.pos = posePos;
    drone.orientation = poseOrientation;
    drone.target_alt = posePos.z;
    drone.target_pos = { x: posePos.x, y: posePos.y, z: posePos.z };
    drone.target_yaw = poseOrientation.yaw;
}

export function getDroneFromLua(L: any): DroneState {
    window.fengari.lua.lua_getglobal(L, window.fengari.to_luastring("__DRONE_ID__"));
    const idStr = window.fengari.lua.lua_tostring(L, -1);
    const id = idStr ? window.fengari.to_jsstring(idStr) : currentDroneId;
    window.fengari.lua.lua_pop(L, 1);
    return drones[id] || drones[currentDroneId];
}

export function resetState(id: string = currentDroneId) {
    const drone = drones[id];
    if (!drone) return;
    resetDroneRuntimeState(drone);
    pathPoints[id] = [];
}

export function removeDroneState(id: string) {
    delete pathPoints[id];
    delete drones[id];
}
