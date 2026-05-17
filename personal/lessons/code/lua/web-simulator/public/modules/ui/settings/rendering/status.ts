import { simSettings, type GamepadInputRef } from '../../../core/state.js';
import { ALL_CHANNELS, CALIBRATION_DURATION_MS } from '../constants.js';
import type { SettingsDomRefs } from '../dom.js';
import { getDefaultRawChannelValues } from '../mapping.js';
import type { SettingsRuntimeState, AutoStatusMode } from '../runtime-state.js';
import type { AuxChannelRange } from '../../../core/state.js';
import type {
    ActionAuxChannelKey,
    ChannelKey,
    ObservedInputPosition,
    PrimaryChannelKey
} from '../types.js';

export function renderChannelValue(dom: SettingsDomRefs, key: ChannelKey, value: number): void {
    const el = dom.valueEls[key];
    if (el) el.textContent = String(value);
    if (key === 'mode' || key === 'arm' || key === 'magnet') {
        const cardEl = dom.cardValueEls[key];
        if (cardEl) cardEl.textContent = String(value);
    }
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
        button.textContent = listening ? 'Ожидание ввода...' : 'AUTO';
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
        dom.channelDataStatusEl.textContent = 'Подключите пульт, чтобы получить значения его каналов и открыть назначение.';
        dom.channelDataStatusEl.classList.remove('is-ready');
        dom.channelDataStatusEl.classList.add('is-waiting');
        return;
    }

    if (!state.activeGamepadHasChannelData) {
        dom.channelDataStatusEl.textContent = 'Жду первые значения от текущего пульта. Назначение каналов и AUTO станут доступны сразу после получения данных.';
        dom.channelDataStatusEl.classList.remove('is-ready');
        dom.channelDataStatusEl.classList.add('is-waiting');
        return;
    }

    dom.channelDataStatusEl.textContent = 'Значения каналов получены. Можно назначать входы и подбирать диапазоны по живому сигналу.';
    dom.channelDataStatusEl.classList.remove('is-waiting');
    dom.channelDataStatusEl.classList.add('is-ready');
}

export function renderMappingControlsState(dom: SettingsDomRefs, state: SettingsRuntimeState): void {
    const allowAssignment = simSettings.gamepadConnected && state.activeGamepadHasChannelData;
    for (const key of ALL_CHANNELS) {
        const select = dom.mappingSelects[key];
        if (!select) continue;
        const listening = state.autoDetectState?.channel === key;
        const shouldDisable = !allowAssignment || select.options.length === 0 || listening;
        select.disabled = shouldDisable;
        select.classList.toggle('is-auto-disabled', listening && allowAssignment);
        const controlCard = select.closest('.gp-channel-row, .gp-aux-card');
        controlCard?.classList.toggle('is-auto-detecting', listening && allowAssignment);
        controlCard?.classList.toggle('channel-recording', listening && allowAssignment);
    }
    renderAutoButtons(dom, state, allowAssignment);
}

export function renderModeMeta(
    dom: SettingsDomRefs,
    state: SettingsRuntimeState,
    liveValue: number,
    getModePositions: () => ObservedInputPosition[]
): void {
    const metaEls = [dom.modeMetaEl, dom.modeMetaCardEl].filter(Boolean) as HTMLElement[];
    if (!metaEls.length) return;
    const applyText = (text: string): void => {
        metaEls.forEach((el) => {
            el.textContent = text;
        });
    };
    if (!simSettings.gamepadConnected) {
        applyText('Пульт не подключен.');
        return;
    }
    if (!state.activeGamepadHasChannelData) {
        applyText('Жду значения канала режима.');
        return;
    }

    const positions = getModePositions();
    if (positions.length === 0) {
        applyText('Во время калибровки переключите все положения тумблера режима.');
        return;
    }

    const labels = ['LOW', 'MID', 'HIGH'];
    const description = positions
        .map((position, index) => `${labels[index] ?? `P${index + 1}`}: ${position.centerRc}`)
        .join(' | ');
    applyText(`${description} (LIVE ${liveValue})`);
}

export function renderCalibrationState(dom: SettingsDomRefs, state: SettingsRuntimeState): void {
    if (dom.gpBtnCalibrate) {
        const remainingSeconds = state.isCalibrating
            ? Math.max(1, Math.ceil((CALIBRATION_DURATION_MS - (Date.now() - state.calibrationStartedAt)) / 1000))
            : 0;
        dom.gpBtnCalibrate.textContent = state.isCalibrating ? `КАЛ. ${remainingSeconds}с` : 'КАЛИБРОВКА';
        dom.gpBtnCalibrate.style.color = state.isCalibrating ? '#f87171' : '';
        dom.gpBtnCalibrate.disabled = !simSettings.gamepadConnected;
    }
    if (dom.gpBtnResetCal) {
        dom.gpBtnResetCal.disabled = state.isCalibrating || !simSettings.gamepadCalibration.isCalibrated;
    }
}

export function renderRawMonitor(dom: SettingsDomRefs, rawChannels: number[]): void {
    if (!dom.rawChannelsListEl) return;

    const channelCount = 16;
    if (dom.rawChannelsListEl.children.length !== channelCount) {
        dom.rawChannelsListEl.innerHTML = Array.from({ length: channelCount }, (_, i) => `
            <div class="gp-raw-channel-item">
                <div class="gp-raw-channel-info">
                    <span class="gp-raw-channel-label">CH${i + 1}</span>
                    <span id="gp-raw-val-${i}" class="gp-raw-channel-value">1000</span>
                </div>
                <div class="gp-raw-channel-bar-track">
                    <div id="gp-raw-bar-${i}" class="gp-raw-channel-bar-fill"></div>
                </div>
            </div>
        `).join('');
    }

    const defaults = getDefaultRawChannelValues(channelCount);
    for (let i = 0; i < channelCount; i += 1) {
        const value = rawChannels[i] ?? defaults[i];
        const valEl = dom.rawChannelsListEl.querySelector<HTMLElement>(`#gp-raw-val-${i}`);
        const barEl = dom.rawChannelsListEl.querySelector<HTMLElement>(`#gp-raw-bar-${i}`);
        if (valEl) valEl.textContent = String(value);
        if (barEl) {
            const percent = ((value - 1000) / 1000) * 100;
            barEl.style.width = `${Math.max(0, Math.min(100, percent))}%`;
        }
    }
}

export type AuxRangeRenderingParams = {
    dom: SettingsDomRefs;
    state: SettingsRuntimeState;
    key: ActionAuxChannelKey;
    getMappingRef: (key: ChannelKey) => GamepadInputRef;
    getAuxRange: (key: ActionAuxChannelKey) => AuxChannelRange;
};

export type PrimaryChannelValues = Record<PrimaryChannelKey, number>;
