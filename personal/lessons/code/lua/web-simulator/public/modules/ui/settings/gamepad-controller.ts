import { currentDroneId, drones, matchesAuxRange, saveGamepadSettings, simSettings, type GamepadInputRef } from '../../core/state.js';
import { ALL_CHANNELS, PRIMARY_CHANNELS } from './constants.js';
import type { SettingsDomRefs } from './dom.js';
import type { SettingsRuntimeState } from './runtime-state.js';
import type { ActionAuxChannelKey, ChannelKey, PrimaryChannelKey } from './types.js';
import { applyModeRangesFromObserved, getAuxRange, getModeObservedPositions, getObservedStats } from './channel-ranges.js';
import { readRefRcValue } from './channel-values.js';
import {
    applyPrimaryAxisMappingForCurrentMode,
    createAuxOptions,
    createAxisOptions,
    ensureMappingsForGamepad,
    findActiveGamepad as findActiveMappedGamepad,
    getDefaultChannelValue,
    getDefaultRawChannelValues,
    getGamepadName,
    getRawPwmChannels,
    getMappingRef,
    isAllowedForChannel,
    setMappingRef
} from './mapping.js';
import {
    renderAuxRangeEditors,
    renderAuxSwitchPreview,
    renderCalibrationState,
    renderChannelDataState,
    renderChannelDefaults,
    renderChannelValue,
    renderMappingControlsState,
    renderModeMeta,
    renderRawMonitor,
    renderStickPreview,
    setAutoStatus,
    syncSelectWithMapping,
    updateBar
} from './rendering.js';
import { createGamepadCalibrationController } from './gamepad-calibration.js';

export type GamepadSettingsController = ReturnType<typeof createGamepadSettingsController>;

export function createGamepadSettingsController(dom: SettingsDomRefs, state: SettingsRuntimeState) {
    const hasChannelData = (): boolean => simSettings.gamepadConnected && state.activeGamepadHasChannelData;
    const getObservedStatsForRef = (ref: GamepadInputRef) => getObservedStats(state.observedInputStats, ref);
    const getModePositions = () => getModeObservedPositions(state.observedInputStats, getMappingRef('mode'));
    const findCurrentActiveGamepad = (): Gamepad | null =>
        findActiveMappedGamepad(state.activeGamepadIndex, state.activeGamepadId);
    const setAutoStatusState = (mode: 'idle' | 'listening' | 'success', text: string): void => {
        setAutoStatus(dom, state, mode, text);
    };
    const renderModeMetaState = (liveValue: number): void => {
        renderModeMeta(dom, state, liveValue, getModePositions);
    };
    const renderAuxSwitchPreviewState = (values?: { mode: number; arm: number; magnet: number }): void => {
        renderAuxSwitchPreview({
            dom,
            state,
            values: values ?? {
                mode: Number(dom.valueEls.mode?.textContent ?? getDefaultChannelValue('mode')),
                arm: Number(dom.valueEls.arm?.textContent ?? getDefaultChannelValue('arm')),
                magnet: Number(dom.valueEls.magnet?.textContent ?? getDefaultChannelValue('magnet'))
            },
            getModePositions,
            getAuxRange
        });
    };
    const renderModeMetaFromDomValue = (): void => {
        renderModeMetaState(Number(dom.valueEls.mode?.textContent ?? getDefaultChannelValue('mode')));
        renderAuxSwitchPreviewState();
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

    const toggleRawMonitor = (show: boolean): void => {
        if (!dom.rawMonitorEl) return;
        state.isRawMonitorOpen = show;
        dom.rawMonitorEl.classList.toggle('is-open', show);
        if (show) {
            updateChannelsMonitor(state.rawMonitorValues);
        }
    };

    const updateChannelsMonitor = (data: number[] | undefined): void => {
        const nextValues = getDefaultRawChannelValues();
        data?.slice(0, nextValues.length).forEach((value, index) => {
            if (Number.isFinite(value)) {
                nextValues[index] = value;
            }
        });
        state.rawMonitorValues = nextValues;
        renderRawMonitor(dom, nextValues);
    };

    if (dom.btnMonitorEl) {
        dom.btnMonitorEl.onclick = () => toggleRawMonitor(true);
    }
    if (dom.rawMonitorEl) {
        dom.rawMonitorEl.onclick = (event) => {
            if (event.target === dom.rawMonitorEl) {
                toggleRawMonitor(false);
            }
        };
    }
    if (dom.rawMonitorCloseEl) {
        dom.rawMonitorCloseEl.onclick = () => toggleRawMonitor(false);
    }

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
        if (gp) {
            applyPrimaryAxisMappingForCurrentMode(gp);
            initMappingSelects(gp);
        }
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
                dom.gamepadStatusEl.textContent =
                    `Пульт: ${getGamepadName(gamepad)} | ${axisChannels} | ${buttons} | Stick Mode ${simSettings.gamepadStickMode}`;
                dom.gamepadStatusEl.style.color = '#15803d';
            } else {
                dom.gamepadStatusEl.textContent = 'Пульт не подключен';
                dom.gamepadStatusEl.style.color = '#64748b';
            }
        }

        if (dom.gamepadInfoEl) {
            dom.gamepadInfoEl.classList.toggle('is-disconnected', !gamepad);
        }

        if (dom.gamepadOverlayEl) {
            dom.gamepadOverlayEl.style.display = gamepad ? 'none' : 'flex';
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

    const applyPwmFrame = (frame: {
        rawChannels: number[];
        roll: number;
        pitch: number;
        throttle: number;
        yaw: number;
        mode: number;
        arm: number;
        magnet: number;
    }): void => {
        updateChannelsMonitor(frame.rawChannels);
        updateBar(dom, 'roll', frame.roll);
        updateBar(dom, 'pitch', frame.pitch);
        updateBar(dom, 'throttle', frame.throttle);
        updateBar(dom, 'yaw', frame.yaw);
        renderStickPreview(dom, {
            roll: frame.roll,
            pitch: frame.pitch,
            throttle: frame.throttle,
            yaw: frame.yaw
        });

        renderChannelValue(dom, 'roll', frame.roll);
        renderChannelValue(dom, 'pitch', frame.pitch);
        renderChannelValue(dom, 'throttle', frame.throttle);
        renderChannelValue(dom, 'yaw', frame.yaw);
        renderChannelValue(dom, 'mode', frame.mode);
        renderChannelValue(dom, 'arm', frame.arm);
        renderChannelValue(dom, 'magnet', frame.magnet);
        renderModeMetaState(frame.mode);
        renderAuxSwitchPreviewState({
            mode: frame.mode,
            arm: frame.arm,
            magnet: frame.magnet
        });
    };

    const updateDroneChannels = (gp: Gamepad): void => {
        const drone = drones[currentDroneId];
        if (!drone) return;

        calibration.sampleObservedInputs(gp);
        const rawChannels = getRawPwmChannels(gp);

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

        applyPwmFrame({
            rawChannels,
            roll,
            pitch,
            throttle,
            yaw,
            mode,
            arm,
            magnet
        });
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
        updateChannelsMonitor([]);
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
        updateChannelsMonitor,
        updateCalibrationProgress: calibration.updateCalibrationProgress,
        updateDroneChannels
    };
}
