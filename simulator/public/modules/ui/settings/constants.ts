import type { GamepadInputRef } from '../../core/state.js';
import { clamp } from '../../shared/math.js';
import type {
    ActionAuxChannelKey,
    AuxiliaryChannelKey,
    ChannelKey,
    PrimaryChannelKey
} from './types.js';

export const PRIMARY_CHANNELS: PrimaryChannelKey[] = ['roll', 'pitch', 'throttle', 'yaw'];
export const AUXILIARY_CHANNELS: AuxiliaryChannelKey[] = ['mode', 'arm', 'magnet'];
export const ACTION_AUX_CHANNELS: ActionAuxChannelKey[] = ['arm', 'magnet'];
export const ALL_CHANNELS: ChannelKey[] = [...PRIMARY_CHANNELS, ...AUXILIARY_CHANNELS];
export const INVERTIBLE_CHANNELS: ChannelKey[] = [...ALL_CHANNELS];

export const CENTER_DEADBAND = 0.03;
export const THROTTLE_IDLE_DEADBAND = 0.02;
export const CALIBRATION_DURATION_MS = 10000;
export const AUTO_DETECT_AXIS_THRESHOLD = 0.35;
export const AUTO_DETECT_AUX_AXIS_THRESHOLD = 0.3;
export const AUTO_DETECT_BUTTON_THRESHOLD = 0.45;
export const AUTO_DETECT_TIMEOUT_MS = 10000;
export const AUTO_DETECT_INPUT_SETTLE_MS = 250;
export const AUTO_DETECT_CONFIRM_MS = 120;
export const POSITION_CLUSTER_THRESHOLD = 90;
export const MIN_POSITION_SAMPLES = 6;
export const MAX_PRESET_POSITIONS = 5;

export const axisRef = (index: number): GamepadInputRef => `a${index}` as GamepadInputRef;
export const buttonRef = (index: number): GamepadInputRef => `b${index}` as GamepadInputRef;
export { clamp };
export const clampRc = (value: number): number => Math.round(clamp(value, 1000, 2000));

export function getChannelInversionIndex(channel: ChannelKey): number {
    return INVERTIBLE_CHANNELS.indexOf(channel);
}
