import { simSettings, defaultGamepadTuning, type ChannelTuning, type TunedChannel } from '../../../core/state.js';
import { clamp } from '../constants.js';
import type { ChannelKey } from '../types.js';

/*
 * Fine tuning of the four flight channels, the step after the wizard has found them (like "fine tune" in a drone
 * simulator): the zero point (where the stick rests, shifted so that the rest reads exactly zero) and the dead zone
 * (how far the stick may move from zero before the drone notices). Inversion is set at the same step.
 */

/** How far each setting may go, and in which steps the sliders move. */
export const TUNING_LIMITS = {
    /** A stick that rests off centre by up to a quarter of its travel can still be put right. */
    trim: { min: -0.25, max: 0.25, step: 0.005 },
    /** The throttle's zero is its bottom: the point can only move upwards. */
    throttleTrim: { min: 0, max: 0.25, step: 0.005 },
    deadzone: { min: 0, max: 0.25, step: 0.005 },
    expo: { min: 0, max: 1, step: 0.01 },
    rate: { min: 0.3, max: 1, step: 0.01 }
} as const;

const TUNED: readonly ChannelKey[] = ['roll', 'pitch', 'throttle', 'yaw'];

export function isTunedChannel(channel: ChannelKey): channel is TunedChannel {
    return TUNED.includes(channel);
}

/** The settings of a flight channel, or null for the switches, which are not tuned. */
export function getChannelTuning(channel: ChannelKey): ChannelTuning | null {
    return isTunedChannel(channel) ? simSettings.gamepadTuning[channel] : null;
}

export function trimLimits(channel: TunedChannel): { min: number; max: number; step: number } {
    return channel === 'throttle' ? TUNING_LIMITS.throttleTrim : TUNING_LIMITS.trim;
}

/** Keeps a setting inside its limits. */
export function clampTuning(channel: TunedChannel, tuning: ChannelTuning): ChannelTuning {
    const trim = trimLimits(channel);
    return {
        trim: clamp(tuning.trim, trim.min, trim.max),
        deadzone: clamp(tuning.deadzone, TUNING_LIMITS.deadzone.min, TUNING_LIMITS.deadzone.max),
        expo: channel === 'throttle' ? 0 : clamp(tuning.expo, TUNING_LIMITS.expo.min, TUNING_LIMITS.expo.max),
        rate: channel === 'throttle' ? 1 : clamp(tuning.rate, TUNING_LIMITS.rate.min, TUNING_LIMITS.rate.max)
    };
}

/** The rates curve of a stick: `expo` bends it (gentle near zero, steep at the ends), `rate` scales the whole travel. */
export function applyRates(value: number, expo: number, rate: number): number {
    const e = clamp(expo, 0, 1);
    return rate * ((1 - e) * value + e * value * value * value);
}

/**
 * A centred channel (-1..1): the reading `trim` becomes zero, the ends stay the ends, the dead zone swallows what is left
 * near zero, and the rates shape what remains.
 */
export function applyCenteredTuning(value: number, tuning: ChannelTuning): number {
    const trim = clamp(tuning.trim, -0.9, 0.9);
    const shifted = value - trim;
    const scaled = clamp(shifted >= 0 ? shifted / (1 - trim) : shifted / (1 + trim), -1, 1);
    if (Math.abs(scaled) < tuning.deadzone) return 0;
    return applyRates(scaled, tuning.expo ?? 0, tuning.rate ?? 1);
}

/** The throttle (0..1): the bottom is where the reading is `trim` or less, and the dead zone is kept at both ends. */
export function applyThrottleTuning(value: number, tuning: ChannelTuning): number {
    const trim = clamp(tuning.trim, 0, 0.9);
    const scaled = clamp((value - trim) / (1 - trim), 0, 1);
    if (scaled < tuning.deadzone) return 0;
    if (scaled > 1 - tuning.deadzone) return 1;
    return scaled;
}

export function isDefaultTuning(channel: TunedChannel, tuning: ChannelTuning): boolean {
    const defaults = defaultGamepadTuning()[channel];
    return Math.abs(tuning.trim - defaults.trim) < 1e-6
        && Math.abs(tuning.deadzone - defaults.deadzone) < 1e-6
        && Math.abs((tuning.expo ?? 0) - defaults.expo) < 1e-6
        && Math.abs((tuning.rate ?? 1) - defaults.rate) < 1e-6;
}

export function cloneTuning(tuning: Record<TunedChannel, ChannelTuning>): Record<TunedChannel, ChannelTuning> {
    return {
        roll: { ...tuning.roll },
        pitch: { ...tuning.pitch },
        yaw: { ...tuning.yaw },
        throttle: { ...tuning.throttle }
    };
}

/** Puts back settings taken with cloneTuning (the wizard was cancelled). */
export function restoreTuning(saved: Record<TunedChannel, ChannelTuning>): void {
    for (const channel of Object.keys(saved) as TunedChannel[]) {
        simSettings.gamepadTuning[channel] = { ...saved[channel] };
    }
}
