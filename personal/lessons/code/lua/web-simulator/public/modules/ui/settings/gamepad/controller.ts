import { currentDroneId, drones, matchesAuxRange, saveGamepadSettings, simSettings, type GamepadInputRef } from '../../../core/state.js';
import { ALL_CHANNELS, PRIMARY_CHANNELS } from '../constants.js';
import type { SettingsDomRefs } from '../dom.js';
import type { SettingsRuntimeState } from '../runtime-state.js';
import type { ActionAuxChannelKey, ChannelKey, PrimaryChannelKey } from '../types.js';
import { applyModeRangesFromObserved, getAuxRange, getModeObservedPositions, getObservedStats } from '../input/ranges.js';
import { readRefRcValue } from '../input/values.js';
import {
    applyPrimaryAxisMappingForCurrentMode,
    createAuxOptions,
    createAxisOptions,
    ensureMappingsForGamepad,
    findActiveGamepad as findActiveMappedGamepad,
    getDefaultChannelValue,
    getGamepadName,
    getMappingRef,
    isAllowedForChannel,
    setMappingRef
} from '../mapping.js';
import {
    renderAuxRangeEditors,
    renderCalibrationState,
    renderChannelDataState,
    renderChannelDefaults,
    renderChannelValue,
    renderMappingControlsState,
    renderModeMeta,
    setAutoStatus,
    syncSelectWithMapping,
    updateBar
} from '../rendering.js';
import { createGamepadCalibrationController } from './calibration.js';

export type GamepadSettingsController = ReturnType<typeof createGamepadSettingsController>;

export function createGamepadSettingsController(dom: SettingsDomRefs, state: SettingsRuntimeState) {
    const hasChannelData = (): boolean => simSettings.gamepadConnected && state.activeGamepadHasChannelData;
    const getObservedStatsForRef = (ref: GamepadInputRef) => getObservedStats(state.observedInputStats, ref);
    const getModePositions = () => getModeObservedPositions(state.observedInputStats, getMappingRef('mode'));
    const escapeHtml = (value: string): string =>
        value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    const findCurrentActiveGamepad = (): Gamepad | null =>
        findActiveMappedGamepad(state.activeGamepadIndex, state.activeGamepadId);
    const setAutoStatusState = (mode: 'idle' | 'listening' | 'success', text: string): void => {
        setAutoStatus(dom, state, mode, text);
    };
    const renderModeMetaState = (liveValue: number): void => {
        renderModeMeta(dom, state, liveValue, getModePositions);
    };
    const renderModeMetaFromDomValue = (): void => {
        renderModeMetaState(Number(dom.valueEls.mode?.textContent ?? getDefaultChannelValue('mode')));
    };
    const renderAuxRangeEditorsState = (): void => {
        renderAuxRangeEditors({
            dom,
            state,
            getMappingRef,
            getAuxRange,
            getDefaultChannelValue,
            getObservedStats: getObservedStatsForRef
        });
    };
    const renderChannelDefaultsState = (): void => {
        renderChannelDefaults({
            dom,
            state,
            getDefaultChannelValue,
            getModePositions,
            getMappingRef,
            getAuxRange,
            getObservedStats: getObservedStatsForRef
        });
    };
    const renderCalibrationStateView = (): void => {
        renderCalibrationState(dom, state);
    };
    const renderChannelDataStateView = (): void => {
        renderChannelDataState(dom, state);
    };
    const renderMappingControlsStateView = (): void => {
        renderMappingControlsState(dom, state);
    };
    const syncSelectWithMappingState = (key: ChannelKey): void => {
        syncSelectWithMapping(dom, key, getMappingRef);
    };

    let lastModePositionsCount = 0;

    const resetModePositionsTracking = (): void => {
        lastModePositionsCount = 0;
    };

    const calibration = createGamepadCalibrationController({
        dom,
        state,
        renderAuxRangeEditorsState,
        renderCalibrationStateView,
        renderModeMetaFromDomValue,
        resetModePositionsTracking
    });

    const applyStickMode = (): void => {
        const gp = findCurrentActiveGamepad();
        if (!gp) return;
        applyPrimaryAxisMappingForCurrentMode(gp);
        initMappingSelects(gp);
        renderChannelDefaultsState();
    };

    const initMappingSelects = (gp: Gamepad): void => {
        ensureMappingsForGamepad(gp, ALL_CHANNELS);
        for (const key of ALL_CHANNELS) {
            const select = dom.mappingSelects[key];
            if (!select) continue;
            select.innerHTML = PRIMARY_CHANNELS.includes(key as PrimaryChannelKey)
                ? createAxisOptions(gp)
                : createAuxOptions(gp);
            const mappedRef = getMappingRef(key);
            const hasOption = Array.from(select.options).some((option) => option.value === mappedRef);
            const nextValue = hasOption ? mappedRef : select.options[0]?.value ?? '';
            if (nextValue) {
                select.value = nextValue;
                setMappingRef(key, nextValue as GamepadInputRef);
            }
            select.onchange = () => {
                if (!hasChannelData()) {
                    syncSelectWithMappingState(key);
                    return;
                }
                const nextRef = select.value as GamepadInputRef;
                if (!isAllowedForChannel(key, nextRef)) return;
                setMappingRef(key, nextRef);
                if (key === 'mode') {
                    resetModePositionsTracking();
                    applyModeRangesFromObserved(state.observedInputStats, getMappingRef('mode'));
                    renderModeMetaFromDomValue();
                }
                renderAuxRangeEditorsState();
                saveGamepadSettings();
            };
        }
        renderMappingControlsStateView();
    };

    const syncConnectionState = (gamepad: Gamepad | null): void => {
        const wasConnected = simSettings.gamepadConnected;
        const previousIndex = state.activeGamepadIndex;
        const previousId = state.activeGamepadId;
        simSettings.gamepadConnected = gamepad !== null;
        state.activeGamepadIndex = gamepad?.index ?? null;
        state.activeGamepadId = gamepad?.id ?? null;

        const controllerChanged = (gamepad?.index ?? null) !== previousIndex || (gamepad?.id ?? null) !== previousId;
        if (controllerChanged) {
            calibration.resetObservedState();
        }

        if (dom.gamepadStatusEl) {
            if (gamepad) {
                const axisChannels = gamepad.axes.length > 0 ? `CH1-CH${gamepad.axes.length}` : 'нет axis';
                const buttons = gamepad.buttons.length > 0 ? `BTN1-BTN${gamepad.buttons.length}` : 'без кнопок';
                const gamepadName = escapeHtml(getGamepadName(gamepad));
                dom.gamepadStatusEl.innerHTML =
                    `<span class="gamepad-status-pill__name">${gamepadName}</span><span class="gamepad-status-pill__meta">· ${axisChannels} · ${buttons} · Mode ${simSettings.gamepadStickMode}</span>`;
                dom.gamepadStatusEl.classList.add('is-connected');
                dom.gamepadStatusEl.classList.remove('is-disconnected');
            } else {
                dom.gamepadStatusEl.textContent = 'Пульт не подключен';
                dom.gamepadStatusEl.classList.add('is-disconnected');
                dom.gamepadStatusEl.classList.remove('is-connected');
            }
        }

        if (dom.gamepadInfoEl) {
            dom.gamepadInfoEl.style.display = gamepad ? 'block' : 'none';
        }

        if (gamepad && (!wasConnected || controllerChanged)) {
            initMappingSelects(gamepad);
        }

        if (!gamepad && state.isCalibrating) {
            calibration.finishCalibration();
        }

        renderCalibrationStateView();
        renderChannelDataStateView();
        renderMappingControlsStateView();
        renderModeMetaFromDomValue();
        renderAuxRangeEditorsState();
    };

    const readChannelValue = (gp: Gamepad, key: ChannelKey): number => {
        const inputRef = getMappingRef(key);
        return readRefRcValue(gp, inputRef, key);
    };

    const updateDroneChannels = (gp: Gamepad): void => {
        const drone = drones[currentDroneId];
        if (!drone) return;

        calibration.sampleObservedInputs(gp);

        const modeRef = getMappingRef('mode');
        const modePositions = getModePositions();
        if (modePositions.length !== lastModePositionsCount) {
            const oldCount = lastModePositionsCount;
            lastModePositionsCount = modePositions.length;
            if (lastModePositionsCount >= 2 && lastModePositionsCount > oldCount) {
                applyModeRangesFromObserved(state.observedInputStats, modeRef);
                renderAuxRangeEditorsState();
                saveGamepadSettings();
            }
        }

        const roll = readChannelValue(gp, 'roll');
        const pitch = readChannelValue(gp, 'pitch');
        const throttle = readChannelValue(gp, 'throttle');
        const yaw = readChannelValue(gp, 'yaw');
        const mode = readChannelValue(gp, 'mode');
        const arm = readChannelValue(gp, 'arm');
        const magnet = readChannelValue(gp, 'magnet');

        drone.rcChannels[0] = roll;
        drone.rcChannels[1] = pitch;
        drone.rcChannels[2] = throttle;
        drone.rcChannels[3] = yaw;
        drone.rcChannels[4] = mode;
        drone.rcChannels[5] = arm;
        drone.rcChannels[6] = magnet;
        drone.rcChannels[7] = magnet;

        updateBar(dom, 'roll', roll);
        updateBar(dom, 'pitch', pitch);
        updateBar(dom, 'throttle', throttle);
        updateBar(dom, 'yaw', yaw);

        renderChannelValue(dom, 'roll', roll);
        renderChannelValue(dom, 'pitch', pitch);
        renderChannelValue(dom, 'throttle', throttle);
        renderChannelValue(dom, 'yaw', yaw);
        renderChannelValue(dom, 'mode', mode);
        renderChannelValue(dom, 'arm', arm);
        renderChannelValue(dom, 'magnet', magnet);
        renderModeMetaState(mode);
        renderAuxRangeEditorsState();
        renderChannelDataStateView();
        renderMappingControlsStateView();

        const magnetActive = matchesAuxRange(magnet, simSettings.gamepadAuxRanges.magnet);
        if (magnetActive && !drone.magnetGripper.active) {
            drone.magnetGripper.active = true;
        } else if (!magnetActive && drone.magnetGripper.active) {
            drone.magnetGripper.active = false;
        }
    };

    const resetDroneChannelsToSafeValues = (): void => {
        const drone = drones[currentDroneId];
        if (!drone) return;
        drone.rcChannels[0] = 1500;
        drone.rcChannels[1] = 1500;
        drone.rcChannels[2] = 1000;
        drone.rcChannels[3] = 1500;
        drone.rcChannels[4] = 1000;
        drone.rcChannels[5] = 1000;
        drone.rcChannels[6] = 1000;
        drone.rcChannels[7] = 1000;
        drone.magnetGripper.active = false;
        renderAuxRangeEditorsState();
    };

    return {
        applyStickMode,
        beginCalibration: calibration.beginCalibration,
        findCurrentActiveGamepad,
        finishCalibration: calibration.finishCalibration,
        hasChannelData,
        renderAuxRangeEditorsState,
        renderCalibrationStateView,
        renderChannelDataStateView,
        renderChannelDefaultsState,
        renderMappingControlsStateView,
        renderModeMetaState,
        resetCalibration: calibration.resetCalibration,
        resetDroneChannelsToSafeValues,
        resetModePositionsTracking,
        selectAuxPreset: calibration.selectAuxPreset,
        setAutoStatusState,
        syncAuxRangeFromControls: calibration.syncAuxRangeFromControls,
        syncConnectionState,
        syncSelectWithMappingState,
        updateCalibrationProgress: calibration.updateCalibrationProgress,
        updateDroneChannels
    };
}
