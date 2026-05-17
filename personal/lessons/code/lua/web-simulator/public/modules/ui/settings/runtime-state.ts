import type { GamepadInputRef } from '../../core/state.js';
import { getDefaultRawChannelValues } from './mapping.js';
import type { ChannelKey, ObservedInputStats } from './types.js';

export type AutoStatusMode = 'idle' | 'listening' | 'success';

export type AutoDetectState = {
    channel: ChannelKey;
    startedAt: number;
    ignoreUntil: number;
    baselineAxes: number[];
    baselineButtons: number[];
    candidateRef: GamepadInputRef | null;
    candidateSince: number;
};

export type SettingsRuntimeState = {
    isCalibrating: boolean;
    calibrationStartedAt: number;
    activeGamepadIndex: number | null;
    activeGamepadId: string | null;
    activeGamepadHasChannelData: boolean;
    isRawMonitorOpen: boolean;
    rawMonitorValues: number[];
    observedInputStats: Map<GamepadInputRef, ObservedInputStats>;
    autoStatusMode: AutoStatusMode;
    autoStatusText: string;
    autoDetectState: AutoDetectState | null;
};

export function createSettingsRuntimeState(): SettingsRuntimeState {
    return {
        isCalibrating: false,
        calibrationStartedAt: 0,
        activeGamepadIndex: null,
        activeGamepadId: null,
        activeGamepadHasChannelData: false,
        isRawMonitorOpen: false,
        rawMonitorValues: getDefaultRawChannelValues(),
        observedInputStats: new Map<GamepadInputRef, ObservedInputStats>(),
        autoStatusMode: 'idle',
        autoStatusText: 'Нажмите AUTO и подвигайте нужный стик или тумблер.',
        autoDetectState: null
    };
}
