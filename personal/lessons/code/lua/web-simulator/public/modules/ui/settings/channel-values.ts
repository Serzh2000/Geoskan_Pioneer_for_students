import { simSettings, type GamepadInputRef } from '../../core/state.js';
import { clamp, clampRc, getChannelInversionIndex, toRcValue } from './constants.js';
import { normalizeCenteredAxis, normalizeThrottleAxis } from './calibration.js';
import type { ChannelKey, PrimaryChannelKey, StickMode } from './types.js';

export type PrimaryStickSlot = 'left-x' | 'left-y' | 'right-x' | 'right-y';

const PRIMARY_SLOT_AXIS_INDEXES: Record<PrimaryStickSlot, number> = {
    'left-x': 0,
    'left-y': 1,
    'right-x': 2,
    'right-y': 3
};

const MODE_PRIMARY_STICK_SLOTS: Record<StickMode, Record<PrimaryChannelKey, PrimaryStickSlot>> = {
    1: { yaw: 'left-x', pitch: 'left-y', roll: 'right-x', throttle: 'right-y' },
    2: { yaw: 'left-x', throttle: 'left-y', roll: 'right-x', pitch: 'right-y' },
    3: { roll: 'left-x', pitch: 'left-y', yaw: 'right-x', throttle: 'right-y' },
    4: { roll: 'left-x', throttle: 'left-y', yaw: 'right-x', pitch: 'right-y' }
};

export function isChannelInverted(channel: ChannelKey): boolean {
    const inversionIndex = getChannelInversionIndex(channel);
    return inversionIndex >= 0 ? !!simSettings.gamepadInversion[inversionIndex] : false;
}

export function readRefNormalizedValue(
    gp: Gamepad,
    ref: GamepadInputRef,
    channel: ChannelKey,
    isInverted: boolean = isChannelInverted(channel)
): number {
    const index = Number(ref.slice(1));
    if (ref.startsWith('b')) {
        const buttonValue = clamp(gp.buttons[index]?.value ?? 0, 0, 1);
        if (channel === 'throttle') {
            return isInverted ? 1 - buttonValue : buttonValue;
        }

        const centeredValue = buttonValue * 2 - 1;
        return isInverted ? -centeredValue : centeredValue;
    }

    const rawValue = gp.axes[index] ?? 0;
    if (channel === 'throttle') {
        const normalizedThrottle = normalizeThrottleAxis(simSettings.gamepadCalibration, rawValue, index);
        return isInverted ? 1 - normalizedThrottle : normalizedThrottle;
    }

    const centeredValue = normalizeCenteredAxis(simSettings.gamepadCalibration, rawValue, index);
    return isInverted ? -centeredValue : centeredValue;
}

export function readRefRcValue(
    gp: Gamepad,
    ref: GamepadInputRef,
    channel: ChannelKey,
    isInverted: boolean = isChannelInverted(channel)
): number {
    const normalizedValue = readRefNormalizedValue(gp, ref, channel, isInverted);
    return toRcValue(normalizedValue, channel !== 'throttle');
}

export function rcToCenteredNormalized(value: number): number {
    return clamp((value - 1500) / 500, -1, 1);
}

export function rcToThrottleNormalized(value: number): number {
    return clamp((value - 1000) / 1000, 0, 1);
}

export function getPrimaryStickSlot(_ref: GamepadInputRef | null): PrimaryStickSlot | null {
    return null; // Legacy: physical axis no longer dictates visual slot
}

export function getPrimaryChannelStickSlot(channel: PrimaryChannelKey, _ref: GamepadInputRef | null = null): PrimaryStickSlot {
    return MODE_PRIMARY_STICK_SLOTS[simSettings.gamepadStickMode][channel];
}

export function getPrimaryChannelAxisIndex(channel: PrimaryChannelKey, axisCount: number): number | null {
    const slot = getPrimaryChannelStickSlot(channel);
    const axisIndex = PRIMARY_SLOT_AXIS_INDEXES[slot];
    return axisIndex < axisCount ? axisIndex : null;
}

export function getPrimaryChannelAxisCandidateIndexes(channel: PrimaryChannelKey, axisCount: number): number[] {
    const slot = getPrimaryChannelStickSlot(channel);
    const isLeftStick = slot.startsWith('left');
    const pair = isLeftStick ? [0, 1] : [2, 3];
    const preferred = getPrimaryChannelAxisIndex(channel, axisCount);
    const indexes = pair.filter((index) => index < axisCount);
    if (preferred === null || !indexes.includes(preferred)) return indexes;
    return [preferred, ...indexes.filter((index) => index !== preferred)];
}
