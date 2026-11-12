import { saveGamepadSettings, simSettings } from '../../../core/state.js';
import { SETTINGS_CHANGED_EVENT } from './config.js';

/** Everything the wizard can change in the controller settings, taken before a screen opens so Cancel can put it back. */
export type SettingsSnapshot = ReturnType<typeof take>;

function take() {
    return JSON.parse(JSON.stringify({
        mapping: simSettings.gamepadMapping,
        confirmed: simSettings.gamepadMappingConfirmed,
        inversion: simSettings.gamepadInversion,
        auxRanges: simSettings.gamepadAuxRanges,
        modeRanges: simSettings.gamepadModeRanges,
        tuning: simSettings.gamepadTuning,
        calibration: simSettings.gamepadCalibration
    })) as {
        mapping: typeof simSettings.gamepadMapping;
        confirmed: boolean;
        inversion: boolean[];
        auxRanges: typeof simSettings.gamepadAuxRanges;
        modeRanges: typeof simSettings.gamepadModeRanges;
        tuning: typeof simSettings.gamepadTuning;
        calibration: typeof simSettings.gamepadCalibration;
    };
}

export const takeSettingsSnapshot = take;

export function restoreSettingsSnapshot(snapshot: SettingsSnapshot): void {
    Object.assign(simSettings.gamepadMapping, snapshot.mapping);
    simSettings.gamepadMappingConfirmed = snapshot.confirmed;
    simSettings.gamepadInversion = [...snapshot.inversion];
    Object.assign(simSettings.gamepadAuxRanges, snapshot.auxRanges);
    Object.assign(simSettings.gamepadModeRanges, snapshot.modeRanges);
    for (const channel of Object.keys(snapshot.tuning) as Array<keyof typeof snapshot.tuning>) {
        simSettings.gamepadTuning[channel] = { ...snapshot.tuning[channel] };
    }
    simSettings.gamepadCalibration.min = [...snapshot.calibration.min];
    simSettings.gamepadCalibration.max = [...snapshot.calibration.max];
    simSettings.gamepadCalibration.center = [...snapshot.calibration.center];
    simSettings.gamepadCalibration.isCalibrated = snapshot.calibration.isCalibrated;
    // Some screens save as they go: what was saved in between goes back too, so a reload does not bring the dropped changes back.
    saveGamepadSettings();
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT));
}
