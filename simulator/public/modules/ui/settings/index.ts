/**
 * Модуль интерфейса настроек симулятора.
 * Инициализирует вкладку "Настройки", связывая чекбоксы и ползунки
 * с глобальным состоянием `simSettings`. Позволяет управлять отображением
 * трассера, гизмо трансформации, скоростью симуляции и USB-пультом.
 */
import { simSettings } from '../../core/state.js';
import { detectAutoInput, startAutoDetection, stopAutoDetection } from './gamepad/auto-detect.js';
import { bindGamepadSettingsControls, bindGeneralSettingsControls, syncInversionCheckboxes } from './gamepad/bindings.js';
import { collectSettingsDomRefs } from './dom.js';
import { createGamepadSettingsController } from './gamepad/controller.js';
import { setMappingRef } from './mapping.js';
import { initAutopilotParamsUI } from './autopilot-params-ui.js';
import { createSettingsRuntimeState } from './runtime-state.js';
import { initWizard } from './wizard.js';
import { bindGraphicsQualityControl } from './graphics-quality.js';

const GAMEPAD_UI_POLL_INTERVAL_MS = 50;

export function initSettingsUI() {
    const dom = collectSettingsDomRefs();
    const state = createSettingsRuntimeState();
    const controller = createGamepadSettingsController(dom, state);
    const gamepadPanel = document.getElementById('gamepad-panel');
    let updateFrameId = 0;

    initAutopilotParamsUI();
    initWizard();
    bindGraphicsQualityControl();
    bindGeneralSettingsControls(dom);
    bindGamepadSettingsControls({
        dom,
        state,
        startAutoDetection: (channel) => startAutoDetection({
            state,
            channel,
            findActiveGamepad: controller.findCurrentActiveGamepad,
            hasChannelData: controller.hasChannelData,
            setAutoStatus: controller.setAutoStatusState
        }),
        findActiveGamepad: controller.findCurrentActiveGamepad,
        beginCalibration: controller.beginCalibration,
        finishCalibration: controller.finishCalibration,
        resetCalibration: controller.resetCalibration,
        renderCalibrationState: controller.renderCalibrationStateView,
        applyStickMode: controller.applyStickMode,
        syncAuxRangeFromControls: controller.syncAuxRangeFromControls,
        selectAuxPreset: controller.selectAuxPreset
    });

    const isLegacyPanelOpen = (): boolean => !!gamepadPanel && gamepadPanel.getClientRects().length > 0;

    window.addEventListener('gamepadsettingschanged', () => {
        controller.resetModePositionsTracking();
        syncInversionCheckboxes(dom);
        const gp = controller.findCurrentActiveGamepad();
        if (gp) {
            controller.syncConnectionState(gp);
            controller.updateDroneChannels(gp, isLegacyPanelOpen());
        } else {
            controller.renderChannelDefaultsState();
        }
        controller.renderAuxRangeEditorsState();
        controller.renderChannelDataStateView();
        controller.renderMappingControlsStateView();
        controller.renderModeMetaState(Number(dom.valueEls.mode?.textContent ?? '1000'));
    });

    const refreshConnectionState = (): void => {
        const gamepad = controller.findCurrentActiveGamepad();
        controller.syncConnectionState(gamepad);
        if (!gamepad && state.autoDetectState) {
            stopAutoDetection(state, controller.setAutoStatusState, 'idle', 'Пульт отключён. AUTO-привязка остановлена.');
        }
    };

    window.addEventListener('gamepadconnected', refreshConnectionState);
    window.addEventListener('gamepaddisconnected', refreshConnectionState);

    let lastPollAt = 0;
    let wasDisconnectedIdle = false;
    // The transmitter flies the drone whether or not its panel is on screen: the panel lives in a dialog that is closed in
    // flight, and a loop that waited for it to be visible left the drone deaf to the sticks. Only a hidden tab stops it.
    const isGamepadUiVisible = (): boolean => !!gamepadPanel
        && document.visibilityState !== 'hidden'
        && gamepadPanel.isConnected;
    const stopUpdateLoop = (): void => {
        if (updateFrameId !== 0) {
            window.cancelAnimationFrame(updateFrameId);
            updateFrameId = 0;
        }
    };
    const ensureUpdateLoop = (resetTiming = false): void => {
        if (!isGamepadUiVisible()) {
            stopUpdateLoop();
            return;
        }

        if (resetTiming) {
            lastPollAt = 0;
        }

        if (updateFrameId === 0) {
            updateFrameId = window.requestAnimationFrame(updateGamepadState);
        }
    };
    const updateGamepadState = (time: number): void => {
        updateFrameId = 0;
        if (!isGamepadUiVisible()) {
            return;
        }

        if (time - lastPollAt < GAMEPAD_UI_POLL_INTERVAL_MS) {
            ensureUpdateLoop();
            return;
        }
        lastPollAt = time;

        const activeGamepad = controller.findCurrentActiveGamepad();
        const connectionChanged =
            (activeGamepad?.index ?? null) !== state.activeGamepadIndex ||
            simSettings.gamepadConnected !== (activeGamepad !== null);

        if (connectionChanged) {
            controller.syncConnectionState(activeGamepad);
        }

        if (activeGamepad) {
            detectAutoInput({
                state,
                gp: activeGamepad,
                setMappingRef,
                syncSelectWithMapping: controller.syncSelectWithMappingState,
                setAutoStatus: controller.setAutoStatusState
            });
            controller.updateCalibrationProgress(activeGamepad);
            controller.updateDroneChannels(activeGamepad, isLegacyPanelOpen());
            wasDisconnectedIdle = false;
        } else {
            if (!wasDisconnectedIdle || connectionChanged) {
                controller.resetDroneChannelsToSafeValues();
                controller.renderChannelDefaultsState();
                wasDisconnectedIdle = true;
            }
        }

        ensureUpdateLoop();
    };

    document.addEventListener('visibilitychange', () => ensureUpdateLoop(true));

    // The stick ranges the wizard recorded were loaded with the settings: they are kept (calibration starts out at the defaults anyway).
    controller.renderChannelDefaultsState();
    controller.setAutoStatusState(state.autoStatusMode, state.autoStatusText);
    controller.renderChannelDataStateView();
    controller.renderMappingControlsStateView();
    controller.renderCalibrationStateView();
    controller.syncConnectionState(controller.findCurrentActiveGamepad());
    ensureUpdateLoop(true);
}
