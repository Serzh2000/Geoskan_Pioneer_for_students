import { simSettings, type GamepadInputRef } from '../../core/state.js';
import { ALL_CHANNELS, CALIBRATION_DURATION_MS, PRIMARY_CHANNELS, clamp } from './constants.js';
import { getObservedPositions } from './input/observed.js';
import type { SettingsDomRefs } from './dom.js';
import type { SettingsRuntimeState, AutoStatusMode } from './runtime-state.js';
import type { ActionAuxChannelKey, ChannelKey, ObservedInputPosition, PrimaryChannelKey } from './types.js';
export { renderAuxRangeEditors } from './rendering/aux-ranges.js';
import { renderAuxRangeEditors } from './rendering/aux-ranges.js';

export function renderChannelValue(dom: SettingsDomRefs, key: ChannelKey, value: number): void {
    const el = dom.valueEls[key];
    if (el) el.textContent = String(value);
}

export function renderAutoStatus(dom: SettingsDomRefs, state: SettingsRuntimeState): void {
    if (!dom.autoStatusEl) return;
    dom.autoStatusEl.textContent = state.autoStatusText;
    dom.autoStatusEl.classList.toggle('is-listening', state.autoStatusMode === 'listening');
    dom.autoStatusEl.classList.toggle('is-success', state.autoStatusMode === 'success');
}

export function renderAutoButtons(dom: SettingsDomRefs, state: SettingsRuntimeState, allowAssignment: boolean): void {
    for (const key of ALL_CHANNELS) {
        const button = dom.autoButtons[key];
        if (!button) continue;
        const listening = state.autoDetectState?.channel === key;
        button.textContent = listening ? '\u0416\u0434\u0443' : '\u0410\u0432\u0442\u043e';
        button.classList.toggle('is-listening', listening);
        button.disabled = !allowAssignment;
    }
}

export function setAutoStatus(
    dom: SettingsDomRefs,
    state: SettingsRuntimeState,
    mode: AutoStatusMode,
    text: string
): void {
    state.autoStatusMode = mode;
    state.autoStatusText = text;
    renderAutoStatus(dom, state);
    renderAutoButtons(dom, state, simSettings.gamepadConnected && state.activeGamepadHasChannelData);
}

export function getChannelLabel(key: ChannelKey): string {
    switch (key) {
        case 'roll':
            return 'Roll';
        case 'pitch':
            return 'Pitch';
        case 'throttle':
            return 'Throttle';
        case 'yaw':
            return 'Yaw';
        case 'mode':
            return 'Mode';
        case 'arm':
            return 'Arm';
        case 'magnet':
            return 'Magnet';
    }
}

export function syncSelectWithMapping(
    dom: SettingsDomRefs,
    key: ChannelKey,
    getMappingRef: (key: ChannelKey) => GamepadInputRef
): void {
    const select = dom.mappingSelects[key];
    if (!select) return;
    const mappedRef = getMappingRef(key);
    const hasOption = Array.from(select.options).some((option) => option.value === mappedRef);
    if (hasOption) {
        select.value = mappedRef;
    }
}

export function renderChannelDataState(dom: SettingsDomRefs, state: SettingsRuntimeState): void {
    if (!dom.channelDataStatusEl) return;

    if (!simSettings.gamepadConnected) {
        dom.channelDataStatusEl.textContent = '\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u0435 \u043f\u0443\u043b\u044c\u0442, \u0447\u0442\u043e\u0431\u044b \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u0430\u043d\u0430\u043b\u044b.';
        dom.channelDataStatusEl.classList.remove('is-ready');
        dom.channelDataStatusEl.classList.add('is-waiting');
        return;
    }

    if (!state.activeGamepadHasChannelData) {
        dom.channelDataStatusEl.textContent = '\u0416\u0434\u0443 \u043f\u0435\u0440\u0432\u044b\u0435 \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f \u043e\u0442 \u0442\u0435\u043a\u0443\u0449\u0435\u0433\u043e \u043f\u0443\u043b\u044c\u0442\u0430.';
        dom.channelDataStatusEl.classList.remove('is-ready');
        dom.channelDataStatusEl.classList.add('is-waiting');
        return;
    }

    dom.channelDataStatusEl.textContent = '\u0421\u0438\u0433\u043d\u0430\u043b \u043f\u043e\u043b\u0443\u0447\u0435\u043d, \u043c\u043e\u0436\u043d\u043e \u043d\u0430\u0437\u043d\u0430\u0447\u0430\u0442\u044c \u043a\u0430\u043d\u0430\u043b\u044b.';
    dom.channelDataStatusEl.classList.remove('is-waiting');
    dom.channelDataStatusEl.classList.add('is-ready');
}

export function renderMappingControlsState(dom: SettingsDomRefs, state: SettingsRuntimeState): void {
    const allowAssignment = simSettings.gamepadConnected && state.activeGamepadHasChannelData;
    for (const key of ALL_CHANNELS) {
        const select = dom.mappingSelects[key];
        if (!select) continue;
        select.disabled = !allowAssignment || select.options.length === 0;
    }
    renderAutoButtons(dom, state, allowAssignment);
}

export function renderModeMeta(
    dom: SettingsDomRefs,
    state: SettingsRuntimeState,
    liveValue: number,
    getModePositions: () => ObservedInputPosition[]
): void {
    if (!dom.modeMetaEl) return;
    if (!simSettings.gamepadConnected) {
        dom.modeMetaEl.textContent = '\u041f\u0443\u043b\u044c\u0442 \u043d\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d.';
        return;
    }
    if (!state.activeGamepadHasChannelData) {
        dom.modeMetaEl.textContent = '\u0416\u0434\u0443 \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f \u043a\u0430\u043d\u0430\u043b\u0430 \u0440\u0435\u0436\u0438\u043c\u0430.';
        return;
    }

    const positions = getModePositions();
    if (positions.length === 0) {
        dom.modeMetaEl.textContent = '\u0412\u043e \u0432\u0440\u0435\u043c\u044f \u043a\u0430\u043b\u0438\u0431\u0440\u043e\u0432\u043a\u0438 \u043f\u0435\u0440\u0435\u043a\u043b\u044e\u0447\u0438\u0442\u0435 \u0432\u0441\u0435 \u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u044f \u0442\u0443\u043c\u0431\u043b\u0435\u0440\u0430.';
        return;
    }

    const labels = ['LOW', 'MID', 'HIGH'];
    const description = positions
        .map((position, index) => `${labels[index] ?? `P${index + 1}`}: ${position.centerRc}`)
        .join(' | ');
    dom.modeMetaEl.textContent = `\u041f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0439: ${positions.length}. ${description}. LIVE ${liveValue}.`;
}

export function updateBar(dom: SettingsDomRefs, key: PrimaryChannelKey, value: number): void {
    const bar = dom.bars[key];
    if (!bar) return;
    if (key === 'throttle') {
        const percent = clamp((value - 1000) / 10, 0, 100);
        bar.style.left = '0%';
        bar.style.width = `${percent}%`;
        return;
    }
    const centered = clamp((value - 1500) / 10, -50, 50);
    if (centered >= 0) {
        bar.style.left = '50%';
        bar.style.width = `${centered}%`;
    } else {
        bar.style.left = `${50 + centered}%`;
        bar.style.width = `${Math.abs(centered)}%`;
    }
}

export function renderChannelDefaults(params: {
    dom: SettingsDomRefs;
    state: SettingsRuntimeState;
    getDefaultChannelValue: (key: ChannelKey) => number;
    getModePositions: () => ObservedInputPosition[];
    getMappingRef: (key: ChannelKey) => GamepadInputRef;
    getAuxRange: (key: ActionAuxChannelKey) => AuxChannelRange;
    getObservedStats: (ref: GamepadInputRef) => ObservedInputStats | null;
}): void {
    const { dom, getDefaultChannelValue, getModePositions } = params;
    for (const key of ALL_CHANNELS) {
        const value = getDefaultChannelValue(key);
        renderChannelValue(dom, key, value);
        if (PRIMARY_CHANNELS.includes(key as PrimaryChannelKey)) {
            updateBar(dom, key as PrimaryChannelKey, value);
        }
    }
    renderModeMeta(dom, params.state, getDefaultChannelValue('mode'), getModePositions);
    renderAuxRangeEditors({
        dom: params.dom,
        state: params.state,
        getMappingRef: params.getMappingRef,
        getAuxRange: params.getAuxRange,
        getDefaultChannelValue: params.getDefaultChannelValue,
        getObservedStats: params.getObservedStats
    });
}

export function renderCalibrationState(dom: SettingsDomRefs, state: SettingsRuntimeState): void {
    if (dom.gpBtnCalibrate) {
        const remainingSeconds = state.isCalibrating
            ? Math.max(1, Math.ceil((CALIBRATION_DURATION_MS - (Date.now() - state.calibrationStartedAt)) / 1000))
            : 0;
        dom.gpBtnCalibrate.textContent = state.isCalibrating
            ? `\u041a\u0410\u041b. ${remainingSeconds}\u0441`
            : '\u041a\u0410\u041b\u0418\u0411\u0420\u041e\u0412\u041a\u0410';
        dom.gpBtnCalibrate.style.color = state.isCalibrating ? '#f87171' : '';
        dom.gpBtnCalibrate.disabled = !simSettings.gamepadConnected;
    }
    if (dom.gpBtnResetCal) {
        dom.gpBtnResetCal.disabled = state.isCalibrating || !simSettings.gamepadCalibration.isCalibrated;
    }
}

