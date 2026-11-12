import { simSettings, type ChannelTuning, type GamepadInputRef } from '../../../core/state.js';
import { clamp, clampRc, getChannelInversionIndex } from '../constants.js';
import { normalizeCenteredAxis, normalizeThrottleAxis } from './calibration.js';
import type { ChannelKey, PrimaryChannelKey, StickMode } from '../types.js';
import { applyCenteredTuning, applyThrottleTuning, getChannelTuning } from './tuning.js';

export type PrimaryStickSlot = 'left-x' | 'left-y' | 'right-x' | 'right-y';

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

/**
 * The value of a channel, 0..1 for the throttle and -1..1 for the rest. The four flight channels go through the student's
 * fine tuning (zero point and dead zone); `tuning` can be passed to read the value with other settings, e.g. without any.
 */
export function readRefNormalizedValue(
    gp: Gamepad,
    ref: GamepadInputRef,
    channel: ChannelKey,
    isInverted: boolean = isChannelInverted(channel),
    tuning: ChannelTuning | null = getChannelTuning(channel)
): number {
    const index = Number(ref.slice(1));
    if (ref.startsWith('b')) {
        const buttonValue = clamp(gp.buttons[index]?.value ?? 0, 0, 1);
        if (channel === 'throttle') {
            const throttle = isInverted ? 1 - buttonValue : buttonValue;
            return tuning ? applyThrottleTuning(throttle, tuning) : throttle;
        }

        const centeredValue = buttonValue * 2 - 1;
        const signed = isInverted ? -centeredValue : centeredValue;
        return tuning ? applyCenteredTuning(signed, tuning) : signed;
    }

    const rawValue = gp.axes[index] ?? 0;
    if (channel === 'throttle') {
        if (tuning) {
            const normalizedThrottle = normalizeThrottleAxis(simSettings.gamepadCalibration, rawValue, index, 0);
            return applyThrottleTuning(isInverted ? 1 - normalizedThrottle : normalizedThrottle, tuning);
        }
        const normalizedThrottle = normalizeThrottleAxis(simSettings.gamepadCalibration, rawValue, index);
        return isInverted ? 1 - normalizedThrottle : normalizedThrottle;
    }

    if (tuning) {
        const centeredValue = normalizeCenteredAxis(simSettings.gamepadCalibration, rawValue, index, 0);
        return applyCenteredTuning(isInverted ? -centeredValue : centeredValue, tuning);
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
    if (channel === 'throttle') {
        return clampRc(1000 + normalizedValue * 1000);
    }
    return clampRc(1500 + normalizedValue * 500);
}

export function getPrimaryChannelStickSlot(channel: PrimaryChannelKey): PrimaryStickSlot {
    return MODE_PRIMARY_STICK_SLOTS[simSettings.gamepadStickMode][channel];
}
