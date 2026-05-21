import { saveGamepadSettings, simSettings } from '../../../core/state.js';
import { CALIBRATION_DURATION_MS, axisRef, buttonRef } from '../constants.js';
import type { SettingsDomRefs } from '../dom.js';
import type { SettingsRuntimeState } from '../runtime-state.js';
import type { ActionAuxChannelKey } from '../types.js';
import {
    applyModeRangesFromObserved,
    setAuxRange
} from '../input/ranges.js';
import {
    beginCalibration as beginCalibrationValues,
    finishCalibration as finishCalibrationValues,
    normalizeCenteredAxis,
    resetCalibration as resetCalibrationValues,
    sampleCalibration
} from '../input/calibration.js';
import { getMappingRef, readInputRcValue } from '../mapping.js';
import {
    buildRangesFromPositions,
    getObservedPositions,
    rememberObservedInputValue,
    resetObservedInputStats
} from '../input/observed.js';

type GamepadCalibrationOptions = {
    dom: SettingsDomRefs;
    state: SettingsRuntimeState;
    renderAuxRangeEditorsState: () => void;
    renderCalibrationStateView: () => void;
    renderModeMetaFromDomValue: () => void;
    resetModePositionsTracking: () => void;
};

export function createGamepadCalibrationController({
    dom,
    state,
    renderAuxRangeEditorsState,
    renderCalibrationStateView,
    renderModeMetaFromDomValue,
    resetModePositionsTracking
}: GamepadCalibrationOptions) {
    const resetObservedState = (): void => {
        state.activeGamepadHasChannelData = false;
        state.observedInputStats = resetObservedInputStats();
        resetModePositionsTracking();
    };

    const sampleObservedInputs = (gp: Gamepad): void => {
        let sampled = false;

        for (let index = 0; index < gp.axes.length; index += 1) {
            const rawValue = gp.axes[index];
            if (!Number.isFinite(rawValue)) continue;
            rememberObservedInputValue(
                state.observedInputStats,
                axisRef(index),
                readInputRcValue(gp, axisRef(index), (value, axisIndex) =>
                    normalizeCenteredAxis(simSettings.gamepadCalibration, value, axisIndex)
                )
            );
            sampled = true;
        }

        for (let index = 0; index < gp.buttons.length; index += 1) {
            rememberObservedInputValue(
                state.observedInputStats,
                buttonRef(index),
                readInputRcValue(gp, buttonRef(index), (value, axisIndex) =>
                    normalizeCenteredAxis(simSettings.gamepadCalibration, value, axisIndex)
                )
            );
            sampled = true;
        }

        if (sampled) {
            state.activeGamepadHasChannelData = true;
        }
    };

    const resetCalibration = (): void => {
        resetCalibrationValues(simSettings.gamepadCalibration);
    };

    const beginCalibration = (gp: Gamepad): void => {
        state.isCalibrating = true;
        state.calibrationStartedAt = beginCalibrationValues(simSettings.gamepadCalibration, gp);
    };

    const finishCalibration = (): void => {
        state.isCalibrating = false;
        state.calibrationStartedAt = 0;
        finishCalibrationValues(simSettings.gamepadCalibration);
        applyModeRangesFromObserved(state.observedInputStats, getMappingRef('mode'));
        renderModeMetaFromDomValue();
        renderAuxRangeEditorsState();
    };

    const updateCalibrationProgress = (gp: Gamepad): void => {
        if (!state.isCalibrating) return;

        sampleCalibration(simSettings.gamepadCalibration, gp);
        if (Date.now() - state.calibrationStartedAt >= CALIBRATION_DURATION_MS) {
            finishCalibration();
        }
        renderCalibrationStateView();
    };

    const selectAuxPreset = (key: ActionAuxChannelKey, selectedIndex: number): void => {
        const ranges = buildRangesFromPositions(getObservedPositions(state.observedInputStats, getMappingRef(key)));
        const selectedRange = ranges[selectedIndex];
        if (!selectedRange) return;
        setAuxRange(key, selectedRange);
        renderAuxRangeEditorsState();
        saveGamepadSettings();
    };

    const syncAuxRangeFromControls = (key: ActionAuxChannelKey, source: 'min' | 'max'): void => {
        const controls = dom.auxRangeControls[key];
        if (!controls.minSlider || !controls.maxSlider) return;

        let minValue = Number(controls.minSlider.value);
        let maxValue = Number(controls.maxSlider.value);

        if (source === 'min') {
            controls.minSlider.style.zIndex = '3';
            controls.maxSlider.style.zIndex = '2';
        } else {
            controls.maxSlider.style.zIndex = '3';
            controls.minSlider.style.zIndex = '2';
        }

        if (minValue > maxValue) {
            if (source === 'min') {
                maxValue = minValue;
                controls.maxSlider.value = String(maxValue);
            } else {
                minValue = maxValue;
                controls.minSlider.value = String(minValue);
            }
        }

        setAuxRange(key, {
            min: minValue,
            max: maxValue,
            center: Math.round((minValue + maxValue) / 2)
        });
        renderAuxRangeEditorsState();
        saveGamepadSettings();
    };

    return {
        beginCalibration,
        finishCalibration,
        resetCalibration,
        resetObservedState,
        sampleObservedInputs,
        selectAuxPreset,
        syncAuxRangeFromControls,
        updateCalibrationProgress
    };
}
