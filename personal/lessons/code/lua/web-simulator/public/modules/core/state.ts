export type {
    AuxChannelRange,
    CommandSource,
    DroneFsmState,
    DroneState,
    FlightMode,
    GamepadInputRef,
    GamepadModeRanges,
    LedColor,
    Orientation,
    QueuedMceCommand,
    ScriptLanguage,
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
    ScriptLanguage
} from './state-types.js';

/**
 * Модуль глобального состояния симулятора.
 * Хранит данные обо всех дронах (позиции, скорости, логика автопилота),
 * настройках симуляции (скорость, трассеры), общем состоянии среды (работает/остановлено),
 * а также точки траектории для отрисовки шлейфа (pathPoints).
 */
export const drones: Record<string, DroneState> = {};
export let currentDroneId: string = 'drone_1';

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
    const drone: DroneState = {
        id, name,
        running: false,
        current_time: 0,
        pos: { x, y, z },
        vel: { x: 0, y: 0, z: 0 },
        accel: { x: 0, y: 0, z: 9.81 },
        gyro: { x: 0, y: 0, z: 0 },
        orientation: { roll: 0, pitch: 0, yaw: 0 },
        battery: 100,
        status: 'IDLE',
        fsmState: 'IDLE',
        flightMode: 'AUTO',
        rcChannels: [1500, 1500, 1000, 1500, 1000, 1000, 1000, 1000],
        magnetGripper: {
            active: false,
            attachedObjectId: null
        },
        target_alt: z,
        target_pos: { x, y, z },
        target_yaw: 0,
        pendingLocalPoint: false,
        pendingLocalPointSource: null,
        pointReachedFlag: false,
        traceSampleAccumulator: 0,
        command_queue: [],
        preflightDeadlineMs: null,
        currentCommandSource: null,
        lastAcceptedGoToTickMs: null,
        tickCommandSignature: null,
        timers: [],
        leds: Array.from({ length: 29 }, () => ({ r: 0, g: 0, b: 0, w: 0 })),
        script: DEFAULT_LUA_SCRIPT,
        pythonScript: DEFAULT_PYTHON_SCRIPT,
        printBubbleText: '',
        printBubbleUntil: 0,
        luaState: null
    };
    drones[id] = drone;
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
    if (drones[id]) currentDroneId = id;
}

export const MAX_PATH_POINTS = 2000;
export const pathPoints: Record<string, Vector3[]> = { 'drone_1': [] };

const DISARMED_STATUSES = new Set([
    'IDLE',
    'ОШИБКА',
    'CRASHED',
    'DISARMED_FALL'
]);

export function isDroneArmed(drone: DroneState): boolean {
    return !DISARMED_STATUSES.has(drone.status);
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
    drone.running = false;
    drone.current_time = 0;
    drone.vel = { x: 0, y: 0, z: 0 };
    drone.accel = { x: 0, y: 0, z: 9.81 };
    drone.gyro = { x: 0, y: 0, z: 0 };
    drone.battery = 100;
    drone.status = 'IDLE';
    drone.fsmState = 'IDLE';
    drone.command_queue = [];
    drone.preflightDeadlineMs = null;
    drone.currentCommandSource = null;
    drone.lastAcceptedGoToTickMs = null;
    drone.tickCommandSignature = null;
    drone.timers = [];
    drone.leds = Array.from({ length: 29 }, () => ({ r: 0, g: 0, b: 0, w: 0 }));
    drone.rcChannels = [1500, 1500, 1000, 1500, 1000, 1000, 1000, 1000];
    drone.magnetGripper.active = false;
    drone.magnetGripper.attachedObjectId = null;
    drone.pendingLocalPoint = false;
    drone.pendingLocalPointSource = null;
    drone.pointReachedFlag = false;
    drone.traceSampleAccumulator = 0;
    drone.printBubbleText = '';
    drone.printBubbleUntil = 0;
    pathPoints[id] = [];
}
