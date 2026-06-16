import { CENTER_DEADBAND, THROTTLE_IDLE_DEADBAND, clamp } from '../constants.js';
import type { CalibrationData, InputControlType, InputSignalType } from '../types.js';

type CalibrationState = {
    min: number[];
    max: number[];
    center: number[];
    isCalibrated: boolean;
};

export function resetCalibration(calibration: CalibrationState): void {
    calibration.min.fill(-1);
    calibration.max.fill(1);
    calibration.center.fill(0);
    calibration.isCalibrated = false;
}

export function beginCalibration(calibration: CalibrationState, gp: Gamepad): number {
    calibration.min.fill(Number.POSITIVE_INFINITY);
    calibration.max.fill(Number.NEGATIVE_INFINITY);
    calibration.center.fill(0);
    const axisCount = Math.min(calibration.center.length, gp.axes.length);
    for (let i = 0; i < axisCount; i += 1) {
        const axisValue = Number.isFinite(gp.axes[i]) ? gp.axes[i] : 0;
        calibration.center[i] = axisValue;
        calibration.min[i] = axisValue;
        calibration.max[i] = axisValue;
    }
    calibration.isCalibrated = false;
    return Date.now();
}

export function finishCalibration(calibration: CalibrationState): void {
    let calibratedAxes = 0;
    for (let i = 0; i < calibration.min.length; i += 1) {
        const min = calibration.min[i];
        const max = calibration.max[i];
        const center = calibration.center[i];
        if (!Number.isFinite(min) || !Number.isFinite(max) || max - min < 0.05) {
            calibration.min[i] = -1;
            calibration.max[i] = 1;
            calibration.center[i] = Number.isFinite(center) ? clamp(center, -1, 1) : 0;
            continue;
        }
        calibration.min[i] = clamp(min, -1, 1);
        calibration.max[i] = clamp(max, -1, 1);
        calibration.center[i] = clamp(center, calibration.min[i], calibration.max[i]);
        calibratedAxes += 1;
    }
    calibration.isCalibrated = calibratedAxes > 0;
}

export function normalizeCenteredAxis(calibration: CalibrationState, rawValue: number, axisIndex: number): number {
    if (!calibration.isCalibrated) {
        const unclamped = clamp(rawValue, -1, 1);
        return Math.abs(unclamped) < CENTER_DEADBAND ? 0 : unclamped;
    }

    const min = calibration.min[axisIndex];
    const max = calibration.max[axisIndex];
    let center = calibration.center[axisIndex];

    if (!Number.isFinite(min) || !Number.isFinite(max) || max - min < 0.05) {
        const fallback = clamp(rawValue, -1, 1);
        return Math.abs(fallback) < CENTER_DEADBAND ? 0 : fallback;
    }

    if (!(center > min && center < max)) {
        center = (min + max) / 2;
    }

    const denominator = rawValue >= center ? max - center : center - min;
    if (denominator < 0.0001) return 0;

    const normalized = clamp((rawValue - center) / denominator, -1, 1);
    return Math.abs(normalized) < CENTER_DEADBAND ? 0 : normalized;
}

export function normalizeThrottleAxis(calibration: CalibrationState, rawValue: number, axisIndex: number): number {
    if (!calibration.isCalibrated) {
        const fallback = clamp((clamp(rawValue, -1, 1) + 1) / 2, 0, 1);
        if (fallback < THROTTLE_IDLE_DEADBAND) return 0;
        if (fallback > 1 - THROTTLE_IDLE_DEADBAND) return 1;
        return fallback;
    }

    const min = calibration.min[axisIndex];
    const max = calibration.max[axisIndex];
    if (!Number.isFinite(min) || !Number.isFinite(max) || max - min < 0.05) {
        return clamp((clamp(rawValue, -1, 1) + 1) / 2, 0, 1);
    }

    const normalized = clamp((rawValue - min) / (max - min), 0, 1);
    if (normalized < THROTTLE_IDLE_DEADBAND) return 0;
    if (normalized > 1 - THROTTLE_IDLE_DEADBAND) return 1;
    return normalized;
}

export function sanitizeCalibration(calibration: Partial<CalibrationData> | null | undefined): CalibrationData {
    const min = Number.isFinite(calibration?.min) ? Number(calibration?.min) : -1;
    const max = Number.isFinite(calibration?.max) ? Number(calibration?.max) : 1;
    const boundedMin = clamp(Math.min(min, max), -1, 1);
    const boundedMax = clamp(Math.max(min, max), -1, 1);
    const centerCandidate = Number.isFinite(calibration?.center) ? Number(calibration?.center) : 0;
    return {
        min: boundedMin,
        center: clamp(centerCandidate, boundedMin, boundedMax),
        max: boundedMax,
        deadzone: clamp(Number.isFinite(calibration?.deadzone) ? Number(calibration?.deadzone) : 0.04, 0, 0.3),
        trim: clamp(Number.isFinite(calibration?.trim) ? Number(calibration?.trim) : 0, -0.3, 0.3),
        invert: Boolean(calibration?.invert)
    };
}

export function captureCalibrationCenter(calibration: CalibrationData, rawValue: number): CalibrationData {
    const next = sanitizeCalibration(calibration);
    const clamped = clamp(rawValue, -1, 1);
    return {
        ...next,
        center: clamped,
        min: Math.min(next.min, clamped),
        max: Math.max(next.max, clamped)
    };
}

export function normalizeCenteredInput(rawValue: number, calibration: CalibrationData): number {
    const safe = sanitizeCalibration(calibration);
    const min = safe.min;
    const max = safe.max;
    const center = safe.center;
    const denominator = rawValue >= center ? Math.max(0.0001, max - center) : Math.max(0.0001, center - min);
    let normalized = clamp((rawValue - center) / denominator, -1, 1);
    if (safe.invert) normalized *= -1;
    normalized = clamp(normalized + safe.trim, -1, 1);
    return Math.abs(normalized) < safe.deadzone ? 0 : normalized;
}

export function quantizeDiscreteLevel(value: number, levels: number): number {
    const safeLevels = Math.max(1, Math.floor(levels));
    if (safeLevels === 1) return 0;
    const normalized = clamp(value, 0, 1);
    return Math.min(safeLevels - 1, Math.floor(normalized * safeLevels));
}

function toAxisUnit(rawValue: number, calibration: CalibrationData, controlType: InputControlType): number {
    if (controlType === 'throttle') {
        let normalized = (clamp(rawValue, -1, 1) + 1) / 2;
        if (calibration.invert) normalized = 1 - normalized;
        normalized = clamp(normalized, 0, 1);
        normalized = clamp(normalized + calibration.trim, 0, 1);
        if (normalized < THROTTLE_IDLE_DEADBAND) return 0;
        if (normalized > 1 - THROTTLE_IDLE_DEADBAND) return 1;
        return normalized;
    }
    return normalizeCenteredInput(rawValue, calibration);
}

export function normalizeInputValue(
    rawValue: number,
    calibration: CalibrationData,
    controlType: InputControlType,
    signalType: InputSignalType
): { normalizedValue: number; pwmValue: number; discreteLevel?: number } {
    const safeCalibration = sanitizeCalibration(calibration);
    if (signalType === 'button') {
        const normalizedValue = clamp(rawValue, 0, 1);
        return {
            normalizedValue,
            pwmValue: Math.round(1000 + normalizedValue * 1000),
            discreteLevel: normalizedValue >= 0.5 ? 1 : 0
        };
    }

    const normalizedValue = toAxisUnit(rawValue, safeCalibration, controlType);
    if (controlType === 'switch-2pos' || controlType === 'button' || controlType === 'momentary') {
        const value01 = clamp((normalizedValue + 1) / 2, 0, 1);
        const discreteLevel = quantizeDiscreteLevel(value01, 2);
        return {
            normalizedValue: value01,
            pwmValue: discreteLevel === 1 ? 2000 : 1000,
            discreteLevel
        };
    }
    if (controlType === 'switch-3pos') {
        const value01 = clamp((normalizedValue + 1) / 2, 0, 1);
        const discreteLevel = quantizeDiscreteLevel(value01, 3);
        return {
            normalizedValue: value01,
            pwmValue: [1000, 1500, 2000][discreteLevel] ?? 1500,
            discreteLevel
        };
    }
    if (controlType === 'selector-6pos') {
        const value01 = clamp((normalizedValue + 1) / 2, 0, 1);
        const discreteLevel = quantizeDiscreteLevel(value01, 6);
        return {
            normalizedValue: value01,
            pwmValue: Math.round(1000 + (discreteLevel / 5) * 1000),
            discreteLevel
        };
    }
    if (controlType === 'throttle') {
        return {
            normalizedValue,
            pwmValue: Math.round(1000 + normalizedValue * 1000)
        };
    }
    return {
        normalizedValue,
        pwmValue: Math.round(1500 + normalizedValue * 500)
    };
}

export function sampleCalibration(calibration: CalibrationState, gp: Gamepad): void;
export function sampleCalibration(calibration: CalibrationData, rawValue: number): CalibrationData;
export function sampleCalibration(calibration: CalibrationState | CalibrationData, source: Gamepad | number): void | CalibrationData {
    if (typeof source === 'number') {
        const current = sanitizeCalibration(calibration as CalibrationData);
        const rawValue = clamp(source, -1, 1);
        return {
            ...current,
            min: Math.min(current.min, rawValue),
            max: Math.max(current.max, rawValue)
        };
    }

    const legacy = calibration as CalibrationState;
    const gp = source;
    const axisCount = Math.min(legacy.min.length, gp.axes.length);
    for (let i = 0; i < axisCount; i += 1) {
        const axisValue = gp.axes[i];
        if (!Number.isFinite(axisValue)) continue;
        legacy.min[i] = Math.min(legacy.min[i], axisValue);
        legacy.max[i] = Math.max(legacy.max[i], axisValue);
    }
}
