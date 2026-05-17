import type { GamepadInputRef } from '../../core/state.js';
import type { ActionAuxChannelKey, AuxiliaryChannelKey, ChannelKey, PrimaryChannelKey } from './types.js';

export const PRIMARY_CHANNELS: PrimaryChannelKey[] = ['roll', 'pitch', 'throttle', 'yaw'];
export const AUXILIARY_CHANNELS: AuxiliaryChannelKey[] = ['mode', 'arm', 'magnet'];
export const ACTION_AUX_CHANNELS: ActionAuxChannelKey[] = ['arm', 'magnet'];
export const ALL_CHANNELS: ChannelKey[] = [...PRIMARY_CHANNELS, ...AUXILIARY_CHANNELS];
export const INVERTIBLE_CHANNELS: ChannelKey[] = [...ALL_CHANNELS];

export const CENTER_DEADBAND = 0.01; // 5 units (5/500)
export const THROTTLE_IDLE_DEADBAND = 0.01;
export const CALIBRATION_DURATION_MS = 10000;
export const AUTO_DETECT_AXIS_THRESHOLD = 0.3; // 300 units (300/1000)
export const AUTO_DETECT_AUX_AXIS_THRESHOLD = 0.3;
export const AUTO_DETECT_BUTTON_THRESHOLD = 0.45;
export const AUTO_DETECT_TIMEOUT_MS = 10000;
export const AUTO_DETECT_INPUT_SETTLE_MS = 250;
export const AUTO_DETECT_CONFIRM_MS = 120;
export const POSITION_CLUSTER_THRESHOLD = 200; // Updated for better 1000-1500-2000 separation
export const MIN_POSITION_SAMPLES = 6;
export const MAX_PRESET_POSITIONS = 5;

export const RC_MIN = 1000;
export const RC_CENTER = 1500;
export const RC_MAX = 2000;
export const RC_RANGE = 500;

export const axisRef = (index: number): GamepadInputRef => `a${index}` as GamepadInputRef;
export const buttonRef = (index: number): GamepadInputRef => `b${index}` as GamepadInputRef;
export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
export const clampRc = (value: number): number => Math.round(clamp(value, RC_MIN, RC_MAX));

/**
 * Converts normalized value (-1.0 to 1.0 or 0.0 to 1.0) to RC microseconds (1000-2000)
 */
export function toRcValue(normalized: number, centered = true): number {
    if (centered) {
        return Math.round(RC_CENTER + normalized * RC_RANGE);
    }
    return Math.round(RC_MIN + normalized * (RC_MAX - RC_MIN));
}

export function getChannelInversionIndex(channel: ChannelKey): number {
    return INVERTIBLE_CHANNELS.indexOf(channel);
}
