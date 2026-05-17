import { DEFAULT_PWM_CENTER, DEFAULT_PWM_MAX, DEFAULT_PWM_MIN } from './constants.js';
import type { CalibrationData, InputControlType, InputSignalType } from './types.js';

const EPSILON = 1e-6;

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function sanitizeCalibration(input?: Partial<CalibrationData> | null): CalibrationData {
    const min = Number.isFinite(input?.min) ? Number(input?.min) : -1;
    const max = Number.isFinite(input?.max) ? Number(input?.max) : 1;
    const center = Number.isFinite(input?.center) ? Number(input?.center) : 0;
    return {
        min: Math.min(min, max - EPSILON),
        max: Math.max(max, min + EPSILON),
        center: clamp(center, min, max),
        deadzone: clamp(Number.isFinite(input?.deadzone) ? Number(input?.deadzone) : 0.04, 0, 0.4),
        trim: clamp(Number.isFinite(input?.trim) ? Number(input?.trim) : 0, -0.3, 0.3),
        invert: Boolean(input?.invert)
    };
}

export function sampleCalibration(current: CalibrationData, rawValue: number): CalibrationData {
    const next = sanitizeCalibration(current);
    next.min = Math.min(next.min, rawValue);
    next.max = Math.max(next.max, rawValue);
    return sanitizeCalibration(next);
}

export function captureCalibrationCenter(current: CalibrationData, rawValue: number): CalibrationData {
    return sanitizeCalibration({ ...current, center: rawValue });
}

export function normalizeCenteredInput(rawValue: number, calibration: CalibrationData): number {
    const safe = sanitizeCalibration(calibration);
    const lowSpan = Math.max(EPSILON, safe.center - safe.min);
    const highSpan = Math.max(EPSILON, safe.max - safe.center);
    const normalized = rawValue >= safe.center
        ? (rawValue - safe.center) / highSpan
        : -((safe.center - rawValue) / lowSpan);
    const trimmed = clamp(normalized + safe.trim, -1, 1);
    const withDeadzone = Math.abs(trimmed) <= safe.deadzone ? 0 : trimmed;
    return safe.invert ? -withDeadzone : withDeadzone;
}

export function normalizeUnsignedInput(rawValue: number, calibration: CalibrationData): number {
    const safe = sanitizeCalibration(calibration);
    const span = Math.max(EPSILON, safe.max - safe.min);
    const normalized = clamp((rawValue - safe.min) / span, 0, 1);
    const centered = (normalized * 2) - 1;
    const adjusted = safe.invert ? -centered : centered;
    return clamp((adjusted + 1) / 2, 0, 1);
}

export function quantizeDiscreteLevel(normalizedValue: number, positions: number): number {
    if (positions <= 1) return 0;
    const clamped = clamp(normalizedValue, 0, 1);
    const level = Math.round(clamped * (positions - 1));
    return clamp(level, 0, positions - 1);
}

export function discreteLevelToPwm(level: number, positions: number): number {
    if (positions <= 1) return DEFAULT_PWM_CENTER;
    const clampedLevel = clamp(level, 0, positions - 1);
    const ratio = clampedLevel / (positions - 1);
    return Math.round(DEFAULT_PWM_MIN + ratio * (DEFAULT_PWM_MAX - DEFAULT_PWM_MIN));
}

export function normalizedToPwm(
    normalizedValue: number,
    controlType: InputControlType,
    signalType: InputSignalType
): number {
    if (signalType === 'button' || controlType === 'switch-2pos' || controlType === 'momentary' || controlType === 'button') {
        return normalizedValue >= 0.5 ? DEFAULT_PWM_MAX : DEFAULT_PWM_MIN;
    }
    if (controlType === 'switch-3pos') {
        return discreteLevelToPwm(quantizeDiscreteLevel(normalizedValue, 3), 3);
    }
    if (controlType === 'selector-6pos') {
        return discreteLevelToPwm(quantizeDiscreteLevel(normalizedValue, 6), 6);
    }
    if (controlType === 'throttle' || controlType === 'knob') {
        return Math.round(DEFAULT_PWM_MIN + clamp(normalizedValue, 0, 1) * (DEFAULT_PWM_MAX - DEFAULT_PWM_MIN));
    }
    const centered = clamp(normalizedValue, -1, 1);
    return Math.round(DEFAULT_PWM_CENTER + centered * 500);
}

export function normalizeInputValue(
    rawValue: number,
    calibration: CalibrationData,
    controlType: InputControlType,
    signalType: InputSignalType
): { normalizedValue: number; pwmValue: number; discreteLevel: number | null } {
    if (signalType === 'button' || controlType === 'switch-2pos' || controlType === 'momentary' || controlType === 'button') {
        const normalizedValue = rawValue >= 0.5 ? 1 : 0;
        return {
            normalizedValue,
            pwmValue: normalizedToPwm(normalizedValue, controlType, signalType),
            discreteLevel: normalizedValue >= 0.5 ? 1 : 0
        };
    }

    if (controlType === 'throttle' || controlType === 'knob' || controlType === 'selector-6pos' || controlType === 'switch-3pos') {
        const normalizedValue = normalizeUnsignedInput(rawValue, calibration);
        const positions = controlType === 'selector-6pos' ? 6 : controlType === 'switch-3pos' ? 3 : 0;
        return {
            normalizedValue,
            pwmValue: normalizedToPwm(normalizedValue, controlType, signalType),
            discreteLevel: positions ? quantizeDiscreteLevel(normalizedValue, positions) : null
        };
    }

    const normalizedValue = normalizeCenteredInput(rawValue, calibration);
    return {
        normalizedValue,
        pwmValue: normalizedToPwm(normalizedValue, controlType, signalType),
        discreteLevel: null
    };
}
