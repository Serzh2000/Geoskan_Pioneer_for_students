import { simSettings, saveGamepadSettings } from '../../core/state.js';
import { ACTION_AUX_CHANNELS, ALL_CHANNELS, INVERTIBLE_CHANNELS, PRIMARY_CHANNELS, getChannelInversionIndex } from './constants.js';
import type { SettingsDomRefs } from './dom.js';
import { setMappingRef } from './mapping.js';
import type { SettingsRuntimeState } from './runtime-state.js';
import type { ActionAuxChannelKey, ChannelKey, StickMode } from './types.js';

function syncStickModeButtons(dom: SettingsDomRefs, activeMode: StickMode): void {
    dom.gpStickModeButtons.forEach((button) => {
        const isActive = Number(button.dataset.gpStickMode ?? '0') === activeMode;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-checked', String(isActive));
    });
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
        dom.tracerColorEl.addEventListener('input', () => {
            simSettings.tracerColor = dom.tracerColorEl?.value ?? simSettings.tracerColor;
        });
    }

    if (dom.tracerWidthEl) {
        dom.tracerWidthEl.value = simSettings.tracerWidth.toString();
        dom.tracerWidthEl.addEventListener('input', () => {
            simSettings.tracerWidth = parseFloat(dom.tracerWidthEl?.value ?? String(simSettings.tracerWidth));
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
        dom.simSpeedEl.addEventListener('input', () => {
            simSettings.simSpeed = parseFloat(dom.simSpeedEl?.value ?? String(simSettings.simSpeed));
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
        syncStickModeButtons(dom, simSettings.gamepadStickMode);
        const applyStickModeValue = () => {
            const nextMode = Number(dom.gpStickModeSelect?.value ?? simSettings.gamepadStickMode) as StickMode;
            simSettings.gamepadStickMode = [1, 2, 3, 4].includes(nextMode) ? nextMode : 2;
            syncStickModeButtons(dom, simSettings.gamepadStickMode);
            applyStickMode();
            saveGamepadSettings();
        };
        dom.gpStickModeSelect.onchange = applyStickModeValue;
        dom.gpStickModeButtons.forEach((button) => {
            button.onclick = () => {
                if (!dom.gpStickModeSelect) return;
                dom.gpStickModeSelect.value = button.dataset.gpStickMode ?? dom.gpStickModeSelect.value;
                applyStickModeValue();
            };
        });
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
