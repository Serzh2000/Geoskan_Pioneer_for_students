import { simSettings, saveGamepadSettings } from '../../core/state.js';
import { ACTION_AUX_CHANNELS, ALL_CHANNELS, INVERTIBLE_CHANNELS, PRIMARY_CHANNELS, getChannelInversionIndex } from './constants.js';
import type { SettingsDomRefs } from './dom.js';
import { setMappingRef } from './mapping.js';
import type { SettingsRuntimeState } from './runtime-state.js';
import type { ActionAuxChannelKey, ChannelKey, StickMode } from './types.js';

function setRangeProgress(element: HTMLInputElement | null): void {
    if (!element) return;
    const min = Number(element.min || '0');
    const max = Number(element.max || '100');
    const value = Number(element.value || '0');
    const progress = max > min ? ((value - min) / (max - min)) * 100 : 0;
    element.style.setProperty('--range-progress', `${Math.max(0, Math.min(100, progress))}%`);
}

export function syncInversionCheckboxes(dom: SettingsDomRefs): void {
    for (const key of PRIMARY_CHANNELS) {
        const checkbox = dom.invCheckboxes[key];
        if (!checkbox) continue;
        const inversionIndex = getChannelInversionIndex(key);
        checkbox.checked = inversionIndex >= 0 ? !!simSettings.gamepadInversion[inversionIndex] : false;
    }
}

export function bindGeneralSettingsControls(dom: SettingsDomRefs): void {
    if (dom.showTracerEl) {
        dom.showTracerEl.checked = simSettings.showTracer;
        dom.showTracerEl.addEventListener('change', () => {
            simSettings.showTracer = dom.showTracerEl?.checked ?? false;
        });
    }

    if (dom.tracerColorEl) {
        dom.tracerColorEl.value = simSettings.tracerColor;
        if (dom.tracerColorVal) {
            dom.tracerColorVal.textContent = simSettings.tracerColor.toUpperCase();
        }
        dom.tracerColorEl.addEventListener('input', () => {
            simSettings.tracerColor = dom.tracerColorEl?.value ?? simSettings.tracerColor;
            if (dom.tracerColorVal) {
                dom.tracerColorVal.textContent = simSettings.tracerColor.toUpperCase();
            }
        });
    }

    if (dom.tracerWidthEl) {
        dom.tracerWidthEl.value = simSettings.tracerWidth.toString();
        setRangeProgress(dom.tracerWidthEl);
        if (dom.tracerWidthVal) {
            dom.tracerWidthVal.textContent = `${simSettings.tracerWidth.toFixed(0)} px`;
        }
        dom.tracerWidthEl.addEventListener('input', () => {
            simSettings.tracerWidth = parseFloat(dom.tracerWidthEl?.value ?? String(simSettings.tracerWidth));
            setRangeProgress(dom.tracerWidthEl);
            if (dom.tracerWidthVal) {
                dom.tracerWidthVal.textContent = `${simSettings.tracerWidth.toFixed(0)} px`;
            }
        });
    }

    if (dom.tracerShapeEl) {
        dom.tracerShapeEl.value = simSettings.tracerShape;
        dom.tracerShapeEl.addEventListener('change', () => {
            simSettings.tracerShape = dom.tracerShapeEl?.value ?? simSettings.tracerShape;
        });
    }

    if (dom.showGizmoEl) {
        dom.showGizmoEl.checked = simSettings.showGizmo;
        dom.showGizmoEl.addEventListener('change', () => {
            simSettings.showGizmo = dom.showGizmoEl?.checked ?? false;
        });
    }

    if (dom.simSpeedEl && dom.simSpeedVal) {
        dom.simSpeedEl.value = simSettings.simSpeed.toString();
        dom.simSpeedVal.textContent = `${simSettings.simSpeed.toFixed(1)}x`;
        setRangeProgress(dom.simSpeedEl);
        dom.simSpeedEl.addEventListener('input', () => {
            simSettings.simSpeed = parseFloat(dom.simSpeedEl?.value ?? String(simSettings.simSpeed));
            setRangeProgress(dom.simSpeedEl);
            if (dom.simSpeedVal) {
                dom.simSpeedVal.textContent = `${simSettings.simSpeed.toFixed(1)}x`;
            }
        });
    }
}

export function bindGamepadSettingsControls(params: {
    dom: SettingsDomRefs;
    state: SettingsRuntimeState;
    startAutoDetection: (channel: ChannelKey) => void;
    findActiveGamepad: () => Gamepad | null;
    beginCalibration: (gp: Gamepad) => void;
    finishCalibration: () => void;
    resetCalibration: () => void;
    renderCalibrationState: () => void;
    applyStickMode: () => void;
    syncAuxRangeFromControls: (key: ActionAuxChannelKey, source: 'min' | 'max') => void;
    selectAuxPreset: (key: ActionAuxChannelKey, selectedIndex: number) => void;
}): void {
    const {
        dom,
        state,
        startAutoDetection,
        findActiveGamepad,
        beginCalibration,
        finishCalibration,
        resetCalibration,
        renderCalibrationState,
        applyStickMode,
        syncAuxRangeFromControls,
        selectAuxPreset
    } = params;

    for (const key of PRIMARY_CHANNELS) {
        const checkbox = dom.invCheckboxes[key];
        if (!checkbox) continue;
        const inversionIndex = getChannelInversionIndex(key);
        checkbox.checked = inversionIndex >= 0 ? !!simSettings.gamepadInversion[inversionIndex] : false;
        checkbox.onchange = () => {
            if (inversionIndex < 0) return;
            simSettings.gamepadInversion[inversionIndex] = checkbox.checked;
            saveGamepadSettings();
        };
    }

    if (dom.gpStickModeSelect) {
        dom.gpStickModeSelect.value = String(simSettings.gamepadStickMode);
        dom.gpStickModeSelect.onchange = () => {
            const nextMode = Number(dom.gpStickModeSelect?.value ?? simSettings.gamepadStickMode) as StickMode;
            simSettings.gamepadStickMode = [1, 2, 3, 4].includes(nextMode) ? nextMode : 2;
            applyStickMode();
            saveGamepadSettings();
        };
    }

    for (const key of ALL_CHANNELS) {
        const select = dom.mappingSelects[key];
        if (select) {
            select.onchange = () => {
                setMappingRef(key, select.value as typeof simSettings.gamepadMapping.roll);
                saveGamepadSettings();
            };
        }
    }

    for (const key of ALL_CHANNELS) {
        const button = dom.autoButtons[key];
        if (!button) continue;
        button.onclick = () => {
            startAutoDetection(key);
        };
    }

    if (dom.gpBtnCalibrate) {
        dom.gpBtnCalibrate.onclick = () => {
            const gp = findActiveGamepad();
            if (!gp) return;
            if (state.isCalibrating) {
                finishCalibration();
            } else {
                beginCalibration(gp);
            }
            renderCalibrationState();
        };
    }

    if (dom.gpBtnResetCal) {
        dom.gpBtnResetCal.onclick = () => {
            state.isCalibrating = false;
            state.calibrationStartedAt = 0;
            resetCalibration();
            renderCalibrationState();
        };
    }

    for (const key of ACTION_AUX_CHANNELS) {
        const controls = dom.auxRangeControls[key];
        if (controls.presetSelect) {
            controls.presetSelect.onchange = () => {
                selectAuxPreset(key, Number(controls.presetSelect?.value ?? '-1'));
            };
        }
        if (controls.minSlider) {
            controls.minSlider.oninput = () => {
                syncAuxRangeFromControls(key, 'min');
            };
        }
        if (controls.maxSlider) {
            controls.maxSlider.oninput = () => {
                syncAuxRangeFromControls(key, 'max');
            };
        }
    }
}
