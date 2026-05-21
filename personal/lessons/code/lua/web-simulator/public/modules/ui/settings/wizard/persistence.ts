import { simSettings, type GamepadInputRef } from '../../../core/state.js';
import { INVERTIBLE_CHANNELS, getChannelInversionIndex } from '../constants.js';
import { buildRangesFromPositions, pickRepresentativePositions } from '../input/observed.js';
import type { ChannelKey } from '../types.js';
import type { AuxDetectionResult, WizardAuxChannelKey } from './types.js';

const WIZARD_CHANNELS: ChannelKey[] = ['roll', 'pitch', 'throttle', 'yaw', 'mode', 'arm', 'magnet'];

export function createWizardDraftInversion(): boolean[] {
    return INVERTIBLE_CHANNELS.map((_, index) => !!simSettings.gamepadInversion[index]);
}

export function getStoredMappingRef(channel: ChannelKey): GamepadInputRef | null {
    switch (channel) {
        case 'roll':
            return simSettings.gamepadMapping.roll;
        case 'pitch':
            return simSettings.gamepadMapping.pitch;
        case 'throttle':
            return simSettings.gamepadMapping.throttle;
        case 'yaw':
            return simSettings.gamepadMapping.yaw;
        case 'mode':
            return simSettings.gamepadMapping.modeSwitch;
        case 'arm':
            return simSettings.gamepadMapping.armSwitch;
        case 'magnet':
            return simSettings.gamepadMapping.magnetBtn;
    }
}

export function persistWizardResults(params: {
    detectedMapping: Partial<Record<ChannelKey, GamepadInputRef>>;
    auxResults: Partial<Record<WizardAuxChannelKey, AuxDetectionResult>>;
    wizardDraftInversion: boolean[];
}): void {
    const { detectedMapping, auxResults, wizardDraftInversion } = params;

    for (const channel of WIZARD_CHANNELS) {
        const ref = detectedMapping[channel];
        if (ref) {
            setMappingRefForChannel(channel, ref);
        }
    }

    applyChannelInversion(wizardDraftInversion);
    applyAuxResults(auxResults);
}

function setMappingRefForChannel(channel: ChannelKey, ref: GamepadInputRef) {
    switch (channel) {
        case 'roll':
            simSettings.gamepadMapping.roll = ref;
            break;
        case 'pitch':
            simSettings.gamepadMapping.pitch = ref;
            break;
        case 'throttle':
            simSettings.gamepadMapping.throttle = ref;
            break;
        case 'yaw':
            simSettings.gamepadMapping.yaw = ref;
            break;
        case 'mode':
            simSettings.gamepadMapping.modeSwitch = ref;
            break;
        case 'arm':
            simSettings.gamepadMapping.armSwitch = ref;
            break;
        case 'magnet':
            simSettings.gamepadMapping.magnetBtn = ref;
            break;
    }
}

function applyChannelInversion(wizardDraftInversion: boolean[]) {
    for (const channel of INVERTIBLE_CHANNELS) {
        const inversionIndex = getChannelInversionIndex(channel);
        if (inversionIndex < 0) continue;
        simSettings.gamepadInversion[inversionIndex] = wizardDraftInversion[inversionIndex] ?? false;
    }
}

function applyAuxResults(auxResults: Partial<Record<WizardAuxChannelKey, AuxDetectionResult>>) {
    const modeResult = auxResults.mode;
    if (modeResult) {
        const positions = modeResult.positions.length > 3
            ? pickRepresentativePositions(modeResult.positions, 3)
            : modeResult.positions;
        const ranges = buildRangesFromPositions(positions);
        if (ranges.length >= 2) {
            simSettings.gamepadModeRanges.loiter = ranges[0];
            simSettings.gamepadModeRanges.althold = ranges[Math.min(1, ranges.length - 1)];
            simSettings.gamepadModeRanges.stabilize = ranges[Math.min(2, ranges.length - 1)];
        }
    }

    if (auxResults.arm?.selectedRange) {
        simSettings.gamepadAuxRanges.arm = auxResults.arm.selectedRange;
    }

    if (auxResults.magnet?.selectedRange) {
        simSettings.gamepadAuxRanges.magnet = auxResults.magnet.selectedRange;
    }
}
