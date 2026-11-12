import * as fengari from 'fengari-web';
export type {
    AuxChannelRange,
    CommandSource,
    DroneFsmState,
    DroneState,
    GamepadInputRef,
    LuaDiagnosticLevel,
    LuaDiagnosticsState,
    PioneerConnectionMethod,
    PythonExecutionTarget,
    ScriptLanguage,
    TickFlightCommand,
    TickCommandSignature,
    Vector3
} from './state-types.js';
export { DEFAULT_LUA_SCRIPT } from './state-types.js';
import type {
    AuxChannelRange,
    DroneState,
    GamepadInputRef,
    ScriptLanguage,
    Vector3
} from './state-types.js';
import { DEFAULT_DRONE_MODEL, type DroneModelId } from './drone-models.js';
import {
    createDroneRecord,
    createDefaultPioneerConnectionSettings,
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
// Монотонный счётчик добавленных точек трассы на дрон: rendering-слой (drone/trails.ts)
// использует его, чтобы понять, сколько НОВЫХ точек появилось с прошлого кадра,
// не перечитывая весь pathPoints[id] (который к тому же — сдвигающийся FIFO,
// так что индексы «старых» точек меняются при переполнении).
export const pathPointsVersion: Record<string, number> = { 'drone_1': 0 };

// Set while the user is dragging an object with the scene-editor's transform
// gizmo. Physics stands still for that duration so it doesn't fight the manual
// placement (ground contact snapping it back, autopilot chasing the old
// target) and so the tracer doesn't record the drag as if it were a flight.
export let isSceneEditDragActive = false;
export function setSceneEditDragActive(active: boolean) {
    isSceneEditDragActive = active;
}

export let currentScriptLanguage: ScriptLanguage = 'lua';

export function setCurrentScriptLanguage(language: ScriptLanguage) {
    currentScriptLanguage = language;
}

/** Fine tuning of one flight channel (the wizard's last step): where its zero sits and how wide the dead zone around it is. */
export type ChannelTuning = {
    trim: number;
    deadzone: number;
    /** Rates of a stick, like in a drone simulator: 0 is a straight response, 1 a strong curve (gentle near zero, steep at the ends). The throttle has none. */
    expo: number;
    /** How much of the stick's travel is used, 0.3..1: at 0.6 the stick at the end commands 60% of the full deflection. */
    rate: number;
};
export type TunedChannel = 'roll' | 'pitch' | 'throttle' | 'yaw';

/** Defaults equal the fixed dead zones the controller used before tuning existed, so nothing changes until the student tunes. */
export function defaultGamepadTuning(): Record<TunedChannel, ChannelTuning> {
    return {
        roll: { trim: 0, deadzone: 0.03, expo: 0, rate: 1 },
        pitch: { trim: 0, deadzone: 0.03, expo: 0, rate: 1 },
        yaw: { trim: 0, deadzone: 0.03, expo: 0, rate: 1 },
        throttle: { trim: 0, deadzone: 0.02, expo: 0, rate: 1 }
    };
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
    /** The student's own mapping (set by the wizard) is kept as it is; an unconfirmed one may be swapped for the stick-mode defaults when a pad is plugged in. */
    gamepadMappingConfirmed: false,
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
    gamepadTuning: defaultGamepadTuning(),
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
        mappingConfirmed: simSettings.gamepadMappingConfirmed,
        inversion: simSettings.gamepadInversion,
        auxRanges: simSettings.gamepadAuxRanges,
        modeRanges: simSettings.gamepadModeRanges,
        stickMode: simSettings.gamepadStickMode,
        tuning: simSettings.gamepadTuning,
        calibration: simSettings.gamepadCalibration
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
            simSettings.gamepadMappingConfirmed = data.mappingConfirmed === true;
            if (data.inversion) simSettings.gamepadInversion = data.inversion;
            if (data.auxRanges) Object.assign(simSettings.gamepadAuxRanges, data.auxRanges);
            if (data.modeRanges) Object.assign(simSettings.gamepadModeRanges, data.modeRanges);
            if (data.stickMode) simSettings.gamepadStickMode = data.stickMode;
            // The recorded stick ranges: without them a pad that does not report the full -1..1 would need calibrating after every reload.
            const cal = data.calibration;
            const cs = simSettings.gamepadCalibration;
            if (cal && cal.isCalibrated === true && [cal.min, cal.max, cal.center].every((a) => Array.isArray(a) && a.length === cs.min.length && a.every(Number.isFinite))) {
                cs.min = [...cal.min];
                cs.max = [...cal.max];
                cs.center = [...cal.center];
                cs.isCalibrated = true;
            }
            if (data.tuning && typeof data.tuning === 'object') {
                for (const channel of Object.keys(simSettings.gamepadTuning) as TunedChannel[]) {
                    const saved = data.tuning[channel];
                    if (saved && Number.isFinite(saved.trim) && Number.isFinite(saved.deadzone)) {
                        simSettings.gamepadTuning[channel] = {
                            trim: saved.trim,
                            deadzone: saved.deadzone,
                            expo: Number.isFinite(saved.expo) ? saved.expo : 0,
                            rate: Number.isFinite(saved.rate) ? saved.rate : 1
                        };
                    }
                }
            }
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

export function createDroneState(
    id: string,
    name: string,
    x: number = 0,
    y: number = 0,
    z: number = 0,
    model: DroneModelId = DEFAULT_DRONE_MODEL
): DroneState {
    const drone = createDroneRecord(id, name, x, y, z, model);
    drones[id] = drone;
    pathPoints[id] = [];
    pathPointsVersion[id] = 0;
    return drone;
}

// Initialize the first default drone
createDroneState('drone_1', 'Пионер Базовый 1');

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
    fengari.lua.lua_getglobal(L, fengari.to_luastring("__DRONE_ID__"));
    const idStr = fengari.lua.lua_tostring(L, -1);
    const id = idStr ? fengari.to_jsstring(idStr) : currentDroneId;
    fengari.lua.lua_pop(L, 1);
    return drones[id] || drones[currentDroneId];
}

export function resetState(id: string = currentDroneId) {
    const drone = drones[id];
    if (!drone) return;
    resetDroneRuntimeState(drone);
    pathPoints[id] = [];
    pathPointsVersion[id] = 0;
}

export function removeDroneState(id: string) {
    delete pathPoints[id];
    delete pathPointsVersion[id];
    delete drones[id];
}
