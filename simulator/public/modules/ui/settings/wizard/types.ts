import type { AuxChannelRange, GamepadInputRef } from '../../../core/state.js';
import type { ChannelKey, ObservedInputPosition } from '../types.js';

export type WizardStepType = 'primary' | 'aux';
export type WizardStickTarget = 'L' | 'R' | 'both';
export type WizardAuxChannelKey = Extract<ChannelKey, 'mode' | 'arm' | 'magnet'>;

export interface WizardStep {
    instruction: string;
    channel: ChannelKey;
    type: WizardStepType;
    targetStick: WizardStickTarget;
    minPositions?: number;
    preferThreePositions?: boolean;
}

export type AxisMotionStats = {
    maxDelta: number;
    travel: number;
    activitySamples: number;
};

export type AuxDetectionResult = {
    ref: GamepadInputRef;
    positions: ObservedInputPosition[];
    ranges: AuxChannelRange[];
    selectedRange: AuxChannelRange | null;
};

export type AuxDetectionCandidate = AuxDetectionResult & {
    transitions: number;
    requiredTransitions: number;
    score: number;
    hasEnoughPositions: boolean;
    looksLikeSwitch: boolean;
    hasMiddlePosition: boolean;
};

export type WizardChannelState = {
    channel: ChannelKey;
    label: string;
    inverted: boolean;
    type: WizardStepType;
};
