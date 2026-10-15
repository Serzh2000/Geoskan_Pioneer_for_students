import { saveGamepadSettings, type GamepadInputRef } from '../../../core/state.js';
import type { ChannelKey } from '../types.js';
import { SETTINGS_CHANGED_EVENT } from './config.js';
import { persistWizardResults } from './persistence.js';
import type { AuxDetectionResult, WizardAuxChannelKey } from './types.js';

export function getFirstConnectedGamepad(): Gamepad | null {
    if (typeof navigator.getGamepads !== 'function') return null;
    const connected = Array.from(navigator.getGamepads()).filter((gp): gp is Gamepad => gp !== null);
    return connected[0] ?? null;
}

export function finishWizardSession(params: {
    detectedMapping: Partial<Record<ChannelKey, GamepadInputRef>>;
    auxResults: Partial<Record<WizardAuxChannelKey, AuxDetectionResult>>;
    wizardDraftInversion: boolean[];
    stopWizard: () => void;
}): void {
    persistWizardResults({
        detectedMapping: params.detectedMapping,
        auxResults: params.auxResults,
        wizardDraftInversion: params.wizardDraftInversion
    });
    saveGamepadSettings();
    window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT));

    const overlay = document.getElementById('gp-wizard-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    params.stopWizard();
}
