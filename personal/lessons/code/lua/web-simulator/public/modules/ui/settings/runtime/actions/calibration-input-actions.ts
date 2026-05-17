import { captureCalibrationCenter, sanitizeCalibration } from '../../calibration.js';
import { createDefaultCalibration } from '../../constants.js';
import { getRawInputMap } from '../../runtime-devices.js';
import { persistedState, virtualAxes, virtualButtons } from '../../runtime-store.js';
import { getCalibration } from '../../runtime-profile.js';
import type { CalibrationData } from '../../types.js';
import { updateRcInputRuntime } from '../../runtime-core.js';
import { cloneProfile, getActiveProfile, mutateActiveProfile, replaceActiveProfile } from './shared.js';

export function startCalibration(): void {
    const profile = cloneProfile(getActiveProfile());
    const rawInputs = getRawInputMap(profile.deviceId);
    for (const mapping of profile.channelMappings.slice(0, 8)) {
        if (!mapping.sourceId) continue;
        const rawValue = rawInputs[mapping.sourceId] ?? 0;
        profile.calibration[mapping.sourceId] = captureCalibrationCenter(getCalibration(profile, mapping.sourceId), rawValue);
    }
    replaceActiveProfile(profile);
    persistedState.wizard.calibrationActive = true;
    updateRcInputRuntime();
}

export function stopCalibration(): void {
    persistedState.wizard.calibrationActive = false;
    updateRcInputRuntime();
}

export function resetCalibration(sourceId: string | null = null): void {
    mutateActiveProfile((profile) => {
        if (sourceId) {
            profile.calibration[sourceId] = createDefaultCalibration();
            return;
        }
        for (const source of profile.inputSources) {
            profile.calibration[source.id] = createDefaultCalibration();
        }
    });
}

export function setCalibrationField(sourceId: string, key: keyof CalibrationData, value: number | boolean): void {
    mutateActiveProfile((profile) => {
        const current = getCalibration(profile, sourceId);
        profile.calibration[sourceId] = sanitizeCalibration({
            ...current,
            [key]: value
        });
    });
}

export function setVirtualAxis(index: number, value: number): void {
    if (index < 0 || index >= virtualAxes.length) return;
    virtualAxes[index] = Math.max(-1, Math.min(1, value));
    updateRcInputRuntime();
}

export function setVirtualButton(index: number, pressed: boolean): void {
    if (index < 0 || index >= virtualButtons.length) return;
    virtualButtons[index] = pressed ? 1 : 0;
    updateRcInputRuntime();
}
