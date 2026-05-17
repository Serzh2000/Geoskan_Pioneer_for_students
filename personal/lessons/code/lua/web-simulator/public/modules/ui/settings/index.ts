/**
 * Модуль интерфейса настроек симулятора.
 * Инициализирует вкладку "Настройки", связывая чекбоксы и ползунки
 * с глобальным состоянием `simSettings`. Позволяет управлять отображением
 * трассера, гизмо трансформации, скоростью симуляции и USB-пультом.
 */
import { simSettings } from '../../core/state.js';
import { detectAutoInput, startAutoDetection, stopAutoDetection } from './auto-detect.js';
import { bindGamepadSettingsControls, bindGeneralSettingsControls, syncInversionCheckboxes } from './bindings.js';
import { collectSettingsDomRefs } from './dom.js';
import { createGamepadSettingsController } from './gamepad-controller.js';
import { setMappingRef } from './mapping.js';
import { createSettingsRuntimeState } from './runtime-state.js';

export function initSettingsUI() {
    const dom = collectSettingsDomRefs();
    const state = createSettingsRuntimeState();
    const controller = createGamepadSettingsController(dom, state);

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

    window.addEventListener('gamepadsettingschanged', () => {
        controller.resetModePositionsTracking();
        syncInversionCheckboxes(dom);
        const gp = controller.findCurrentActiveGamepad();
        if (gp) {
            controller.syncConnectionState(gp);
            controller.updateDroneChannels(gp);
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

    const updateGamepadState = (): void => {
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
            controller.updateDroneChannels(activeGamepad);
        } else {
            controller.resetDroneChannelsToSafeValues();
            controller.renderChannelDefaultsState();
        }

        requestAnimationFrame(updateGamepadState);
    };

    controller.resetCalibration();
    controller.renderChannelDefaultsState();
    controller.setAutoStatusState(state.autoStatusMode, state.autoStatusText);
    controller.renderChannelDataStateView();
    controller.renderMappingControlsStateView();
    controller.renderCalibrationStateView();
    controller.updateChannelsMonitor(state.rawMonitorValues);
    controller.syncConnectionState(controller.findCurrentActiveGamepad());
    updateGamepadState();
}
