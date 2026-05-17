export type GamepadInputRef = `a${number}` | `b${number}`;

export interface AuxChannelRange {
    min: number;
    max: number;
    center?: number;
}

export interface GamepadModeRanges {
    loiter: AuxChannelRange;
    althold: AuxChannelRange;
    stabilize: AuxChannelRange;
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
        calibration: simSettings.gamepadCalibration,
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
            if (data.calibration) Object.assign(simSettings.gamepadCalibration, data.calibration);
            if (data.inversion) simSettings.gamepadInversion = data.inversion;
            if (data.auxRanges) Object.assign(simSettings.gamepadAuxRanges, data.auxRanges);
            if (data.modeRanges) Object.assign(simSettings.gamepadModeRanges, data.modeRanges);
            if (data.stickMode) simSettings.gamepadStickMode = data.stickMode;
        }
    } catch (e) {
        console.warn('[State] Failed to load gamepad settings:', e);
    }
}

export function matchesAuxRange(value: number, range: AuxChannelRange): boolean {
    const min = Math.max(1000, Math.min(range.min, range.max));
    const max = Math.min(2000, Math.max(range.min, range.max));
    return value >= min && value <= max;
}

// Load persisted settings as soon as the module is evaluated.
loadGamepadSettings();
