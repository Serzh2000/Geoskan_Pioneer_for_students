# Настройки пульта и калибровка

Подсистема настроек геймпада: карта каналов, автоопределение входов, калибровка, диапазоны AUX и визуализация живых данных.

## Состав группы

- [`public/modules/ui/settings/constants.ts`](#public-modules-ui-settings-constants-ts)
- [`public/modules/ui/settings/dom.ts`](#public-modules-ui-settings-dom-ts)
- [`public/modules/ui/settings/gamepad/auto-detect.ts`](#public-modules-ui-settings-gamepad-auto-detect-ts)
- [`public/modules/ui/settings/gamepad/bindings.ts`](#public-modules-ui-settings-gamepad-bindings-ts)
- [`public/modules/ui/settings/gamepad/calibration.ts`](#public-modules-ui-settings-gamepad-calibration-ts)
- [`public/modules/ui/settings/gamepad/controller.ts`](#public-modules-ui-settings-gamepad-controller-ts)
- [`public/modules/ui/settings/index.ts`](#public-modules-ui-settings-index-ts)
- [`public/modules/ui/settings/input/calibration.ts`](#public-modules-ui-settings-input-calibration-ts)
- [`public/modules/ui/settings/input/observed.ts`](#public-modules-ui-settings-input-observed-ts)
- [`public/modules/ui/settings/input/ranges.ts`](#public-modules-ui-settings-input-ranges-ts)
- [`public/modules/ui/settings/input/values.ts`](#public-modules-ui-settings-input-values-ts)
- [`public/modules/ui/settings/mapping.ts`](#public-modules-ui-settings-mapping-ts)
- [`public/modules/ui/settings/rendering.ts`](#public-modules-ui-settings-rendering-ts)
- [`public/modules/ui/settings/rendering/aux-ranges.ts`](#public-modules-ui-settings-rendering-aux-ranges-ts)
- [`public/modules/ui/settings/rendering/drone-viewport.ts`](#public-modules-ui-settings-rendering-drone-viewport-ts)
- [`public/modules/ui/settings/rendering/events.ts`](#public-modules-ui-settings-rendering-events-ts)
- [`public/modules/ui/settings/rendering/extra-sections.ts`](#public-modules-ui-settings-rendering-extra-sections-ts)
- [`public/modules/ui/settings/rendering/helpers.ts`](#public-modules-ui-settings-rendering-helpers-ts)
- [`public/modules/ui/settings/rendering/live-monitor.ts`](#public-modules-ui-settings-rendering-live-monitor-ts)
- [`public/modules/ui/settings/rendering/live.ts`](#public-modules-ui-settings-rendering-live-ts)
- [`public/modules/ui/settings/rendering/panel-core.ts`](#public-modules-ui-settings-rendering-panel-core-ts)
- [`public/modules/ui/settings/rendering/sections.ts`](#public-modules-ui-settings-rendering-sections-ts)
- [`public/modules/ui/settings/rendering/viewport-bridge.ts`](#public-modules-ui-settings-rendering-viewport-bridge-ts)
- [`public/modules/ui/settings/rendering/wizard-display.ts`](#public-modules-ui-settings-rendering-wizard-display-ts)
- [`public/modules/ui/settings/rendering/wizard-guided-sticks.ts`](#public-modules-ui-settings-rendering-wizard-guided-sticks-ts)
- [`public/modules/ui/settings/rendering/wizard-modal.ts`](#public-modules-ui-settings-rendering-wizard-modal-ts)
- [`public/modules/ui/settings/rendering/wizard-step-sections.ts`](#public-modules-ui-settings-rendering-wizard-step-sections-ts)
- [`public/modules/ui/settings/rendering/workspaces.ts`](#public-modules-ui-settings-rendering-workspaces-ts)
- [`public/modules/ui/settings/runtime-state.ts`](#public-modules-ui-settings-runtime-state-ts)
- [`public/modules/ui/settings/runtime.ts`](#public-modules-ui-settings-runtime-ts)
- [`public/modules/ui/settings/runtime/actions.ts`](#public-modules-ui-settings-runtime-actions-ts)
- [`public/modules/ui/settings/runtime/actions/calibration-input-actions.ts`](#public-modules-ui-settings-runtime-actions-calibration-input-actions-ts)
- [`public/modules/ui/settings/runtime/actions/profile-actions.ts`](#public-modules-ui-settings-runtime-actions-profile-actions-ts)
- [`public/modules/ui/settings/runtime/actions/shared.ts`](#public-modules-ui-settings-runtime-actions-shared-ts)
- [`public/modules/ui/settings/runtime/actions/wizard-modal-actions.ts`](#public-modules-ui-settings-runtime-actions-wizard-modal-actions-ts)
- [`public/modules/ui/settings/runtime/core.ts`](#public-modules-ui-settings-runtime-core-ts)
- [`public/modules/ui/settings/runtime/devices.ts`](#public-modules-ui-settings-runtime-devices-ts)
- [`public/modules/ui/settings/runtime/profile.ts`](#public-modules-ui-settings-runtime-profile-ts)
- [`public/modules/ui/settings/runtime/store.ts`](#public-modules-ui-settings-runtime-store-ts)
- [`public/modules/ui/settings/runtime/sync.ts`](#public-modules-ui-settings-runtime-sync-ts)
- [`public/modules/ui/settings/storage.ts`](#public-modules-ui-settings-storage-ts)
- [`public/modules/ui/settings/types.ts`](#public-modules-ui-settings-types-ts)
- [`public/modules/ui/settings/wizard.ts`](#public-modules-ui-settings-wizard-ts)
- [`public/modules/ui/settings/wizard/config.ts`](#public-modules-ui-settings-wizard-config-ts)
- [`public/modules/ui/settings/wizard/detection.ts`](#public-modules-ui-settings-wizard-detection-ts)
- [`public/modules/ui/settings/wizard/lifecycle.ts`](#public-modules-ui-settings-wizard-lifecycle-ts)
- [`public/modules/ui/settings/wizard/persistence.ts`](#public-modules-ui-settings-wizard-persistence-ts)
- [`public/modules/ui/settings/wizard/preview-ref.ts`](#public-modules-ui-settings-wizard-preview-ref-ts)
- [`public/modules/ui/settings/wizard/preview.ts`](#public-modules-ui-settings-wizard-preview-ts)
- [`public/modules/ui/settings/wizard/summary.ts`](#public-modules-ui-settings-wizard-summary-ts)
- [`public/modules/ui/settings/wizard/types.ts`](#public-modules-ui-settings-wizard-types-ts)
- [`public/modules/ui/settings/wizard/ui.ts`](#public-modules-ui-settings-wizard-ui-ts)

## Файлы

<a id="public-modules-ui-settings-constants-ts"></a>
### `public/modules/ui/settings/constants.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/constants.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 1
- Ключевые символы: `getChannelInversionIndex`

<a id="public-modules-ui-settings-dom-ts"></a>
### `public/modules/ui/settings/dom.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/dom.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 1
- Ключевые символы: `collectSettingsDomRefs`

<a id="public-modules-ui-settings-gamepad-auto-detect-ts"></a>
### `public/modules/ui/settings/gamepad/auto-detect.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/gamepad/auto-detect.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 4
- Ключевые символы: `detectAutoInput`, `getChannelLabel`, `startAutoDetection`, `stopAutoDetection`

<a id="public-modules-ui-settings-gamepad-bindings-ts"></a>
### `public/modules/ui/settings/gamepad/bindings.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/gamepad/bindings.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 4
- Ключевые символы: `bindGamepadSettingsControls`, `bindGeneralSettingsControls`, `setRangeProgress`, `syncInversionCheckboxes`

<a id="public-modules-ui-settings-gamepad-calibration-ts"></a>
### `public/modules/ui/settings/gamepad/calibration.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/gamepad/calibration.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 1
- Ключевые символы: `createGamepadCalibrationController`

<a id="public-modules-ui-settings-gamepad-controller-ts"></a>
### `public/modules/ui/settings/gamepad/controller.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/gamepad/controller.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 3
- Ключевые символы: `createGamepadSettingsController`, `getModePositions`, `getObservedStatsForRef`

<a id="public-modules-ui-settings-index-ts"></a>
### `public/modules/ui/settings/index.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/index.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 1
- Ключевые символы: `initSettingsUI`

<a id="public-modules-ui-settings-input-calibration-ts"></a>
### `public/modules/ui/settings/input/calibration.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/input/calibration.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 6
- Ключевые символы: `beginCalibration`, `finishCalibration`, `normalizeCenteredAxis`, `normalizeThrottleAxis`, `resetCalibration`, `sampleCalibration`

<a id="public-modules-ui-settings-input-observed-ts"></a>
### `public/modules/ui/settings/input/observed.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/input/observed.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 7
- Ключевые символы: `buildRangesFromPositions`, `findClosestRangeByCenter`, `getObservedPositions`, `mergeObservedPositions`, `pickRepresentativePositions`, `rememberObservedInputValue`, `resetObservedInputStats`

<a id="public-modules-ui-settings-input-ranges-ts"></a>
### `public/modules/ui/settings/input/ranges.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/input/ranges.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 6
- Ключевые символы: `applyModeRangesFromObserved`, `getAuxRange`, `getModeObservedPositions`, `getObservedStats`, `setAuxRange`, `setModeRange`

<a id="public-modules-ui-settings-input-values-ts"></a>
### `public/modules/ui/settings/input/values.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/input/values.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 7
- Ключевые символы: `getPrimaryChannelStickSlot`, `getPrimaryStickSlot`, `isChannelInverted`, `rcToCenteredNormalized`, `rcToThrottleNormalized`, `readRefNormalizedValue`, `readRefRcValue`

<a id="public-modules-ui-settings-mapping-ts"></a>
### `public/modules/ui/settings/mapping.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/mapping.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 20
- Ключевые символы: `applyPrimaryAxisMappingForCurrentMode`, `createAuxOptions`, `createAxisOptions`, `ensureMappingsForGamepad`, `findActiveGamepad`, `getConnectedGamepads`, `getDefaultChannelValue`, `getFallbackMapping`, `getGamepadName`, `getMappingRef`, `getModePrimaryAxisIndexes`, `getPreferredAuxRefs`, `getRcPrimaryAxisMapping`, `hasInputRef`, `hasLegacyPrimaryMapping`, `isAllowedForChannel`, `isLikelyRcTransmitter`, `pushIfUnused`, `readInputRcValue`, `setMappingRef`

<a id="public-modules-ui-settings-rendering-ts"></a>
### `public/modules/ui/settings/rendering.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/rendering.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 12
- Ключевые символы: `getChannelLabel`, `renderAutoButtons`, `renderAutoStatus`, `renderCalibrationState`, `renderChannelDataState`, `renderChannelDefaults`, `renderChannelValue`, `renderMappingControlsState`, `renderModeMeta`, `setAutoStatus`, `syncSelectWithMapping`, `updateBar`

<a id="public-modules-ui-settings-rendering-aux-ranges-ts"></a>
### `public/modules/ui/settings/rendering/aux-ranges.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/rendering/aux-ranges.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 5
- Ключевые символы: `renderAuxRangeEditor`, `renderAuxRangeEditors`, `renderAuxRangePresetOptions`, `toRangePercent`, `toRangeVisualPercent`

<a id="public-modules-ui-settings-rendering-drone-viewport-ts"></a>
### `public/modules/ui/settings/rendering/drone-viewport.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/rendering/drone-viewport.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 1
- Ключевые символы: `renderDroneViewport`

<a id="public-modules-ui-settings-rendering-events-ts"></a>
### `public/modules/ui/settings/rendering/events.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/rendering/events.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 2
- Ключевые символы: `bindRcSetupPanelEvents`, `closePanel`

<a id="public-modules-ui-settings-rendering-extra-sections-ts"></a>
### `public/modules/ui/settings/rendering/extra-sections.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/rendering/extra-sections.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-settings-rendering-helpers-ts"></a>
### `public/modules/ui/settings/rendering/helpers.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/rendering/helpers.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 7
- Ключевые символы: `escapeHtml`, `getLocalizedRoleLabel`, `getSwitchLabel`, `localizeSourceGroup`, `localizeSourceLabel`, `renderOptions`, `renderWarnings`

<a id="public-modules-ui-settings-rendering-live-monitor-ts"></a>
### `public/modules/ui/settings/rendering/live-monitor.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/rendering/live-monitor.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 9
- Ключевые символы: `getRoleMapping`, `getRoleSample`, `getStickDescriptors`, `renderBindings`, `renderLiveMonitor`, `renderRawInputPanel`, `renderStickMonitorWithFocus`, `toAxisPwm`, `toSignedAxis`

<a id="public-modules-ui-settings-rendering-live-ts"></a>
### `public/modules/ui/settings/rendering/live.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/rendering/live.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 9
- Ключевые символы: `buildRenderKey`, `getRoleNormalizedValue`, `setElementWidth`, `setStatusKind`, `setStyleProperty`, `setTextContent`, `toAxisPwm`, `toggleClass`, `updateLiveValues`

<a id="public-modules-ui-settings-rendering-panel-core-ts"></a>
### `public/modules/ui/settings/rendering/panel-core.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/rendering/panel-core.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 9
- Ключевые символы: `getCurrentStep`, `getRemainingPrimaryAssignments`, `getSourceOptions`, `getWizardStepDescription`, `getWizardStepTitle`, `isStepComplete`, `renderConflictResolution`, `renderNavigationHint`, `renderWorkspaceTabs`

<a id="public-modules-ui-settings-rendering-sections-ts"></a>
### `public/modules/ui/settings/rendering/sections.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/rendering/sections.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-settings-rendering-viewport-bridge-ts"></a>
### `public/modules/ui/settings/rendering/viewport-bridge.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/rendering/viewport-bridge.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 14
- Ключевые символы: `clampSigned`, `clampUnsigned`, `getBlockedPrimarySourceIds`, `getRcPreviewValues`, `getRcSignalStatus`, `getRoleMapping`, `getRoleSample`, `getWizardModalPreviewSourceId`, `hasMappedPreviewChannels`, `isRcSettingsPanelActive`, `restoreRcSettingsViewport`, `shouldUseRcViewport`, `syncRcSettingsViewport`, `updateRawActivity`

<a id="public-modules-ui-settings-rendering-wizard-display-ts"></a>
### `public/modules/ui/settings/rendering/wizard-display.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/rendering/wizard-display.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 8
- Ключевые символы: `getResolvedStickMode`, `getSourceSummary`, `isCenterCaptured`, `renderChannelPulse`, `renderSourceSelect`, `renderStepInstruction`, `renderStepper`, `renderStickModeToggle`

<a id="public-modules-ui-settings-rendering-wizard-guided-sticks-ts"></a>
### `public/modules/ui/settings/rendering/wizard-guided-sticks.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/rendering/wizard-guided-sticks.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 8
- Ключевые символы: `getCurrentGuidedStickTask`, `getGuidedStickTask`, `getGuidedStickTasks`, `getListenPrompt`, `getMonitorFocus`, `renderGuidedStickProgress`, `renderGuidedStickStep`, `renderStickModeChoiceCards`

<a id="public-modules-ui-settings-rendering-wizard-modal-ts"></a>
### `public/modules/ui/settings/rendering/wizard-modal.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/rendering/wizard-modal.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 13
- Ключевые символы: `describeAxis`, `getModeDescription`, `getWizardModalCaptureSourceLabel`, `getWizardModalFocus`, `getWizardModalInstruction`, `getWizardModalRoleLabel`, `getWizardModalSourceLabel`, `getWizardModalStepLabel`, `getWizardModalStepTitle`, `getWizardStickTarget`, `renderWizardModal`, `renderWizardModalBody`, `renderWizardModalProgress`

<a id="public-modules-ui-settings-rendering-wizard-step-sections-ts"></a>
### `public/modules/ui/settings/rendering/wizard-step-sections.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/rendering/wizard-step-sections.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 5
- Ключевые символы: `renderCalibrationStep`, `renderDeviceSection`, `renderFocusChannels`, `renderReviewSection`, `renderStepContent`

<a id="public-modules-ui-settings-rendering-workspaces-ts"></a>
### `public/modules/ui/settings/rendering/workspaces.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/rendering/workspaces.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 4
- Ключевые символы: `renderAdvancedWorkspace`, `renderMonitorWorkspace`, `renderRcSetupPanel`, `renderWizardWorkspace`

<a id="public-modules-ui-settings-runtime-state-ts"></a>
### `public/modules/ui/settings/runtime-state.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/runtime-state.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 1
- Ключевые символы: `createSettingsRuntimeState`

<a id="public-modules-ui-settings-runtime-ts"></a>
### `public/modules/ui/settings/runtime.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/runtime.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-settings-runtime-actions-ts"></a>
### `public/modules/ui/settings/runtime/actions.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/runtime/actions.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-settings-runtime-actions-calibration-input-actions-ts"></a>
### `public/modules/ui/settings/runtime/actions/calibration-input-actions.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/runtime/actions/calibration-input-actions.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 6
- Ключевые символы: `resetCalibration`, `setCalibrationField`, `setVirtualAxis`, `setVirtualButton`, `startCalibration`, `stopCalibration`

<a id="public-modules-ui-settings-runtime-actions-profile-actions-ts"></a>
### `public/modules/ui/settings/runtime/actions/profile-actions.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/runtime/actions/profile-actions.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 22
- Ключевые символы: `autoAssignPrimaryChannels`, `createProfileFromCurrentDevice`, `deleteActiveProfile`, `duplicateActiveProfile`, `getBindingActions`, `getChannelOptions`, `getExpandedVisibilityLabel`, `renameActiveProfile`, `resetWizardSession`, `setActiveProfile`, `setBinding`, `setChannelControlType`, `setChannelInvert`, `setChannelRole`, `setChannelSource`, `setExpandedChannels`, `setPreferredDevice`, `setStickMode`, `setWizardStep`, `setWorkspaceView`, `skipWizardStep`, `startAutoDetect`

<a id="public-modules-ui-settings-runtime-actions-shared-ts"></a>
### `public/modules/ui/settings/runtime/actions/shared.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/runtime/actions/shared.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 2
- Ключевые символы: `commitProfile`, `mutateActiveProfile`

<a id="public-modules-ui-settings-runtime-actions-wizard-modal-actions-ts"></a>
### `public/modules/ui/settings/runtime/actions/wizard-modal-actions.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/runtime/actions/wizard-modal-actions.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 8
- Ключевые символы: `applyWizardModalConfig`, `assignRole`, `closeWizardModal`, `openWizardModal`, `resolveDuplicateSourceConflicts`, `setBindingToChannel`, `setWizardModalMode`, `skipWizardModalAuxRole`

<a id="public-modules-ui-settings-runtime-core-ts"></a>
### `public/modules/ui/settings/runtime/core.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/runtime/core.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 12
- Ключевые символы: `captureWizardInput`, `computeWizardSourceScore`, `emitSnapshot`, `ensureRcRuntimePolling`, `formatConnectionStatus`, `getNextAuxRole`, `getRcRuntimeSnapshot`, `getWizardStepRole`, `initRcSetupRuntime`, `subscribeRcRuntime`, `tick`, `updateRcInputRuntime`

<a id="public-modules-ui-settings-runtime-devices-ts"></a>
### `public/modules/ui/settings/runtime/devices.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/runtime/devices.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 5
- Ключевые символы: `buildDeviceId`, `buildDeviceSummaries`, `computeActivity`, `getGamepads`, `getRawInputMap`

<a id="public-modules-ui-settings-runtime-profile-ts"></a>
### `public/modules/ui/settings/runtime/profile.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/runtime/profile.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 13
- Ключевые символы: `autoDetectInput`, `cloneProfile`, `computeChannelValues`, `createSamples`, `ensureProfilesHaveSources`, `getActiveDeviceSummary`, `getActiveProfile`, `getCalibration`, `getNextGuidedChannel`, `refreshWizardSteps`, `replaceActiveProfile`, `sampleCalibrationStep`, `syncActiveProfileToDevice`

<a id="public-modules-ui-settings-runtime-store-ts"></a>
### `public/modules/ui/settings/runtime/store.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/runtime/store.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 9
- Ключевые символы: `getLatestSnapshot`, `getPersistSignature`, `getPollFrameId`, `isRuntimeInitialized`, `markRuntimeInitialized`, `persistIfNeeded`, `setLatestSnapshot`, `setPollFrameId`, `setWizardModalState`

<a id="public-modules-ui-settings-runtime-sync-ts"></a>
### `public/modules/ui/settings/runtime/sync.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/runtime/sync.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 2
- Ключевые символы: `assignLegacy`, `syncLegacyState`

<a id="public-modules-ui-settings-storage-ts"></a>
### `public/modules/ui/settings/storage.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/storage.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 5
- Ключевые символы: `createInitialState`, `isStorageAvailable`, `loadRcSetupState`, `normalizeWorkspaceView`, `saveRcSetupState`

<a id="public-modules-ui-settings-types-ts"></a>
### `public/modules/ui/settings/types.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/types.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-settings-wizard-ts"></a>
### `public/modules/ui/settings/wizard.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/wizard.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 17
- Ключевые символы: `detectAuxInput`, `detectPrimaryInput`, `finishWizard`, `getChannelInversion`, `getCurrentChannelState`, `getCurrentStep`, `getDetectedRef`, `getPreviewRef`, `getResolvedPrimaryRef`, `initWizard`, `isCurrentStepResolved`, `prepareCurrentStep`, `renderWizardState`, `sampleCurrentStep`, `startWizard`, `stopWizard`, `wizardLoop`

<a id="public-modules-ui-settings-wizard-config-ts"></a>
### `public/modules/ui/settings/wizard/config.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/wizard/config.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-settings-wizard-detection-ts"></a>
### `public/modules/ui/settings/wizard/detection.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/wizard/detection.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 7
- Ключевые символы: `detectPrimaryAxis`, `getAuxCandidate`, `getAuxStepRcValue`, `getBestAuxCandidate`, `getUsedRefs`, `isBetterAuxCandidate`, `rememberSwitchTransition`

<a id="public-modules-ui-settings-wizard-lifecycle-ts"></a>
### `public/modules/ui/settings/wizard/lifecycle.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/wizard/lifecycle.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 3
- Ключевые символы: `finishWizardSession`, `getFirstConnectedGamepad`, `getResolvedPrimaryRef`

<a id="public-modules-ui-settings-wizard-persistence-ts"></a>
### `public/modules/ui/settings/wizard/persistence.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/wizard/persistence.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 6
- Ключевые символы: `applyAuxResults`, `applyChannelInversion`, `createWizardDraftInversion`, `getStoredMappingRef`, `persistWizardResults`, `setMappingRefForChannel`

<a id="public-modules-ui-settings-wizard-preview-ref-ts"></a>
### `public/modules/ui/settings/wizard/preview-ref.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/wizard/preview-ref.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 1
- Ключевые символы: `computePreviewRef`

<a id="public-modules-ui-settings-wizard-preview-ts"></a>
### `public/modules/ui/settings/wizard/preview.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/wizard/preview.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 2
- Ключевые символы: `WizardPreviewController.for`, `WizardPreviewController.if`

<a id="public-modules-ui-settings-wizard-summary-ts"></a>
### `public/modules/ui/settings/wizard/summary.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/wizard/summary.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 4
- Ключевые символы: `buildSummaryHtml`, `formatAuxRange`, `formatModeRanges`, `formatRefLabel`

<a id="public-modules-ui-settings-wizard-types-ts"></a>
### `public/modules/ui/settings/wizard/types.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/wizard/types.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-settings-wizard-ui-ts"></a>
### `public/modules/ui/settings/wizard/ui.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/wizard/ui.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 6
- Ключевые символы: `getCurrentStepTargetAxis`, `getCurrentStepTargetStick`, `getStepStatusText`, `getStickLegend`, `getStickStatus`, `renderWizardState`

