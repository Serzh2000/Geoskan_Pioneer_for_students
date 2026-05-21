import { CENTER_DEADBAND, THROTTLE_IDLE_DEADBAND, clamp } from '../constants.js';

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

export function sampleCalibration(calibration: CalibrationState, gp: Gamepad): void {
    const axisCount = Math.min(calibration.min.length, gp.axes.length);
    for (let i = 0; i < axisCount; i += 1) {
        const axisValue = gp.axes[i];
        if (!Number.isFinite(axisValue)) continue;
        calibration.min[i] = Math.min(calibration.min[i], axisValue);
        calibration.max[i] = Math.max(calibration.max[i], axisValue);
    }
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
