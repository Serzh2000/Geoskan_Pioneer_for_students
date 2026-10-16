# Настройки пульта и калибровка

Подсистема настроек геймпада: карта каналов, автоопределение входов, калибровка, диапазоны AUX и визуализация живых данных.

## Состав группы

- [`public/modules/ui/settings/autopilot-params-model.test.ts`](#public-modules-ui-settings-autopilot-params-model-test-ts)
- [`public/modules/ui/settings/autopilot-params-model.ts`](#public-modules-ui-settings-autopilot-params-model-ts)
- [`public/modules/ui/settings/autopilot-params-model/audit.ts`](#public-modules-ui-settings-autopilot-params-model-audit-ts)
- [`public/modules/ui/settings/autopilot-params-model/default-template.ts`](#public-modules-ui-settings-autopilot-params-model-default-template-ts)
- [`public/modules/ui/settings/autopilot-params-model/metadata.ts`](#public-modules-ui-settings-autopilot-params-model-metadata-ts)
- [`public/modules/ui/settings/autopilot-params-model/state.ts`](#public-modules-ui-settings-autopilot-params-model-state-ts)
- [`public/modules/ui/settings/autopilot-params-model/storage.ts`](#public-modules-ui-settings-autopilot-params-model-storage-ts)
- [`public/modules/ui/settings/autopilot-params-model/template.ts`](#public-modules-ui-settings-autopilot-params-model-template-ts)
- [`public/modules/ui/settings/autopilot-params-model/types.ts`](#public-modules-ui-settings-autopilot-params-model-types-ts)
- [`public/modules/ui/settings/autopilot-params-ui.ts`](#public-modules-ui-settings-autopilot-params-ui-ts)
- [`public/modules/ui/settings/autopilot-params-ui/config.ts`](#public-modules-ui-settings-autopilot-params-ui-config-ts)
- [`public/modules/ui/settings/autopilot-params-ui/controller.ts`](#public-modules-ui-settings-autopilot-params-ui-controller-ts)
- [`public/modules/ui/settings/autopilot-params-ui/events.ts`](#public-modules-ui-settings-autopilot-params-ui-events-ts)
- [`public/modules/ui/settings/autopilot-params-ui/helpers.ts`](#public-modules-ui-settings-autopilot-params-ui-helpers-ts)
- [`public/modules/ui/settings/autopilot-params-ui/markup.ts`](#public-modules-ui-settings-autopilot-params-ui-markup-ts)
- [`public/modules/ui/settings/autopilot-params-ui/source-api.ts`](#public-modules-ui-settings-autopilot-params-ui-source-api-ts)
- [`public/modules/ui/settings/autopilot-params-ui/types.ts`](#public-modules-ui-settings-autopilot-params-ui-types-ts)
- [`public/modules/ui/settings/constants.ts`](#public-modules-ui-settings-constants-ts)
- [`public/modules/ui/settings/dom.ts`](#public-modules-ui-settings-dom-ts)
- [`public/modules/ui/settings/gamepad/auto-detect.ts`](#public-modules-ui-settings-gamepad-auto-detect-ts)
- [`public/modules/ui/settings/gamepad/bindings.ts`](#public-modules-ui-settings-gamepad-bindings-ts)
- [`public/modules/ui/settings/gamepad/calibration.ts`](#public-modules-ui-settings-gamepad-calibration-ts)
- [`public/modules/ui/settings/gamepad/controller.ts`](#public-modules-ui-settings-gamepad-controller-ts)
- [`public/modules/ui/settings/graphics-quality.ts`](#public-modules-ui-settings-graphics-quality-ts)
- [`public/modules/ui/settings/index.ts`](#public-modules-ui-settings-index-ts)
- [`public/modules/ui/settings/input/calibration.ts`](#public-modules-ui-settings-input-calibration-ts)
- [`public/modules/ui/settings/input/observed.ts`](#public-modules-ui-settings-input-observed-ts)
- [`public/modules/ui/settings/input/ranges.ts`](#public-modules-ui-settings-input-ranges-ts)
- [`public/modules/ui/settings/input/values.ts`](#public-modules-ui-settings-input-values-ts)
- [`public/modules/ui/settings/mapping.ts`](#public-modules-ui-settings-mapping-ts)
- [`public/modules/ui/settings/mapping/legacy.ts`](#public-modules-ui-settings-mapping-legacy-ts)
- [`public/modules/ui/settings/mapping/profile.ts`](#public-modules-ui-settings-mapping-profile-ts)
- [`public/modules/ui/settings/mapping/profile/device.ts`](#public-modules-ui-settings-mapping-profile-device-ts)
- [`public/modules/ui/settings/mapping/profile/runtime.ts`](#public-modules-ui-settings-mapping-profile-runtime-ts)
- [`public/modules/ui/settings/mapping/profile/shared.ts`](#public-modules-ui-settings-mapping-profile-shared-ts)
- [`public/modules/ui/settings/rendering.ts`](#public-modules-ui-settings-rendering-ts)
- [`public/modules/ui/settings/rendering/aux-ranges.ts`](#public-modules-ui-settings-rendering-aux-ranges-ts)
- [`public/modules/ui/settings/runtime-state.ts`](#public-modules-ui-settings-runtime-state-ts)
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

<a id="public-modules-ui-settings-autopilot-params-model-test-ts"></a>
### `public/modules/ui/settings/autopilot-params-model.test.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/autopilot-params-model.test.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 1
- Ключевые символы: `importFreshModel`

<a id="public-modules-ui-settings-autopilot-params-model-ts"></a>
### `public/modules/ui/settings/autopilot-params-model.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/autopilot-params-model.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-settings-autopilot-params-model-audit-ts"></a>
### `public/modules/ui/settings/autopilot-params-model/audit.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/autopilot-params-model/audit.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 3
- Ключевые символы: `appendAutopilotAuditEntry`, `createAutopilotAuditEntry`, `safeAutopilotAuthor`

<a id="public-modules-ui-settings-autopilot-params-model-default-template-ts"></a>
### `public/modules/ui/settings/autopilot-params-model/default-template.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/autopilot-params-model/default-template.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-settings-autopilot-params-model-metadata-ts"></a>
### `public/modules/ui/settings/autopilot-params-model/metadata.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/autopilot-params-model/metadata.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-settings-autopilot-params-model-state-ts"></a>
### `public/modules/ui/settings/autopilot-params-model/state.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/autopilot-params-model/state.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 14
- Ключевые символы: `clearAutopilotAuditLog`, `exportAutopilotPropertiesText`, `getAutopilotParameterDefinitions`, `getAutopilotSettingsState`, `getAutopilotValidationSummary`, `importAutopilotProperties`, `listAutopilotGroups`, `loadAutopilotTemplateFromText`, `refreshTemplate`, `resetAutopilotParameters`, `saveState`, `updateAutopilotAuthor`, `updateAutopilotParameter`, `validateParameterValue`

<a id="public-modules-ui-settings-autopilot-params-model-storage-ts"></a>
### `public/modules/ui/settings/autopilot-params-model/storage.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/autopilot-params-model/storage.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 4
- Ключевые символы: `cloneAutopilotState`, `createInitialAutopilotState`, `loadAutopilotState`, `persistAutopilotState`

<a id="public-modules-ui-settings-autopilot-params-model-template-ts"></a>
### `public/modules/ui/settings/autopilot-params-model/template.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/autopilot-params-model/template.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 4
- Ключевые символы: `buildDefinitions`, `describeFallback`, `parseTemplate`, `titleizeSegment`

<a id="public-modules-ui-settings-autopilot-params-model-types-ts"></a>
### `public/modules/ui/settings/autopilot-params-model/types.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/autopilot-params-model/types.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-settings-autopilot-params-ui-ts"></a>
### `public/modules/ui/settings/autopilot-params-ui.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/autopilot-params-ui.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-settings-autopilot-params-ui-config-ts"></a>
### `public/modules/ui/settings/autopilot-params-ui/config.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/autopilot-params-ui/config.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-settings-autopilot-params-ui-controller-ts"></a>
### `public/modules/ui/settings/autopilot-params-ui/controller.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/autopilot-params-ui/controller.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 7
- Ключевые символы: `hide`, `initAutopilotParamsUI`, `loadSourceIntoModel`, `persistSourceFile`, `render`, `setAllExpanded`, `show`

<a id="public-modules-ui-settings-autopilot-params-ui-events-ts"></a>
### `public/modules/ui/settings/autopilot-params-ui/events.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/autopilot-params-ui/events.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 1
- Ключевые символы: `attachAutopilotParamsEvents`

<a id="public-modules-ui-settings-autopilot-params-ui-helpers-ts"></a>
### `public/modules/ui/settings/autopilot-params-ui/helpers.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/autopilot-params-ui/helpers.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 6
- Ключевые символы: `downloadTextFile`, `escapeHtml`, `formatDateTime`, `formatNumber`, `getStatusLabel`, `isParameterChanged`

<a id="public-modules-ui-settings-autopilot-params-ui-markup-ts"></a>
### `public/modules/ui/settings/autopilot-params-ui/markup.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/autopilot-params-ui/markup.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 2
- Ключевые символы: `buildGroupedMarkup`, `renderAutopilotParamsBody`

<a id="public-modules-ui-settings-autopilot-params-ui-source-api-ts"></a>
### `public/modules/ui/settings/autopilot-params-ui/source-api.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/autopilot-params-ui/source-api.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 2
- Ключевые символы: `fetchAutopilotSourceFile`, `saveAutopilotSourceFile`

<a id="public-modules-ui-settings-autopilot-params-ui-types-ts"></a>
### `public/modules/ui/settings/autopilot-params-ui/types.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/autopilot-params-ui/types.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-settings-constants-ts"></a>
### `public/modules/ui/settings/constants.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/constants.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 8
- Ключевые символы: `createDefaultBindings`, `createDefaultCalibration`, `createDefaultChannelMappings`, `createDefaultProfile`, `createDefaultWizardSteps`, `getChannelInversionIndex`, `getDefaultChannelRoles`, `getRoleLabel`

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

<a id="public-modules-ui-settings-graphics-quality-ts"></a>
### `public/modules/ui/settings/graphics-quality.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/graphics-quality.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 2
- Ключевые символы: `bindGraphicsQualityControl`, `refresh`

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
- Обнаружено функций/методов: 11
- Ключевые символы: `beginCalibration`, `finishCalibration`, `normalizeCenteredAxis`, `normalizeCenteredInput`, `normalizeInputValue`, `normalizeThrottleAxis`, `quantizeDiscreteLevel`, `resetCalibration`, `sampleCalibration`, `sanitizeCalibration`, `toAxisUnit`

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
- Обнаружено функций/методов: 4
- Ключевые символы: `getPrimaryChannelStickSlot`, `isChannelInverted`, `readRefNormalizedValue`, `readRefRcValue`

<a id="public-modules-ui-settings-mapping-ts"></a>
### `public/modules/ui/settings/mapping.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/mapping.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-settings-mapping-legacy-ts"></a>
### `public/modules/ui/settings/mapping/legacy.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/mapping/legacy.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 20
- Ключевые символы: `applyPrimaryAxisMappingForCurrentMode`, `createAuxOptions`, `createAxisOptions`, `ensureMappingsForGamepad`, `findActiveGamepad`, `getConnectedGamepads`, `getDefaultChannelValue`, `getFallbackMapping`, `getGamepadName`, `getMappingRef`, `getModePrimaryAxisIndexes`, `getPreferredAuxRefs`, `getRcPrimaryAxisMapping`, `hasInputRef`, `hasLegacyPrimaryMapping`, `isAllowedForChannel`, `isLikelyRcTransmitter`, `pushIfUnused`, `readInputRcValue`, `setMappingRef`

<a id="public-modules-ui-settings-mapping-profile-ts"></a>
### `public/modules/ui/settings/mapping/profile.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/mapping/profile.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-settings-mapping-profile-device-ts"></a>
### `public/modules/ui/settings/mapping/profile/device.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/mapping/profile/device.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 7
- Ключевые символы: `createInputSourcesFromGamepad`, `createProfileForDevice`, `createVirtualInputSources`, `detectStickMode`, `getChannelTitle`, `inferDeviceKind`, `isLikelyRadioSummary`

<a id="public-modules-ui-settings-mapping-profile-runtime-ts"></a>
### `public/modules/ui/settings/mapping/profile/runtime.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/mapping/profile/runtime.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 2
- Ключевые символы: `detectMappingConflicts`, `getDuplicateSourceConflicts`

<a id="public-modules-ui-settings-mapping-profile-shared-ts"></a>
### `public/modules/ui/settings/mapping/profile/shared.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/mapping/profile/shared.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 4
- Ключевые символы: `getDefaultControlTypeForRole`, `getRadioKeywords`, `getRoleLabel`, `getStickModeAxisPatterns`

<a id="public-modules-ui-settings-rendering-ts"></a>
### `public/modules/ui/settings/rendering.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/rendering.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 15
- Ключевые символы: `renderAutoButtons`, `renderAutoStatus`, `renderCalibrationState`, `renderChannelDataState`, `renderChannelDefaults`, `renderChannelValue`, `renderMappingControlsState`, `renderModeMeta`, `setAutoStatus`, `setClassPresence`, `setDisabledIfChanged`, `setStyleIfChanged`, `setTextIfChanged`, `syncSelectWithMapping`, `updateBar`

<a id="public-modules-ui-settings-rendering-aux-ranges-ts"></a>
### `public/modules/ui/settings/rendering/aux-ranges.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/rendering/aux-ranges.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 11
- Ключевые символы: `renderAuxRangeEditor`, `renderAuxRangeEditors`, `renderAuxRangePresetOptions`, `setClassPresence`, `setDisabledIfChanged`, `setHtmlIfChanged`, `setStyleIfChanged`, `setTextIfChanged`, `setValueIfChanged`, `toRangePercent`, `toRangeVisualPercent`

<a id="public-modules-ui-settings-runtime-state-ts"></a>
### `public/modules/ui/settings/runtime-state.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/runtime-state.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 1
- Ключевые символы: `createSettingsRuntimeState`

<a id="public-modules-ui-settings-types-ts"></a>
### `public/modules/ui/settings/types.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/types.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-settings-wizard-ts"></a>
### `public/modules/ui/settings/wizard.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/wizard.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 18
- Ключевые символы: `detectAuxInput`, `detectPrimaryInput`, `ensureWizardLoop`, `finishWizard`, `getChannelInversion`, `getCurrentChannelState`, `getCurrentStep`, `getDetectedRef`, `getPreviewRef`, `initWizard`, `isCurrentStepResolved`, `isWizardVisible`, `prepareCurrentStep`, `renderWizardState`, `sampleCurrentStep`, `startWizard`, `stopWizard`, `wizardLoop`

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
- Обнаружено функций/методов: 2
- Ключевые символы: `finishWizardSession`, `getFirstConnectedGamepad`

<a id="public-modules-ui-settings-wizard-persistence-ts"></a>
### `public/modules/ui/settings/wizard/persistence.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/wizard/persistence.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 5
- Ключевые символы: `applyAuxResults`, `applyChannelInversion`, `createWizardDraftInversion`, `persistWizardResults`, `setMappingRefForChannel`

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
- Обнаружено функций/методов: 15
- Ключевые символы: `getCurrentStepTargetAxis`, `getCurrentStepTargetStick`, `getStepStatusText`, `getStickLegend`, `getStickStatus`, `getWizardDomRefs`, `renderWizardState`, `setCheckedIfChanged`, `setClassPresence`, `setDatasetIfChanged`, `setDisabledIfChanged`, `setDisplayIfChanged`, `setHiddenIfChanged`, `setHtmlIfChanged`, `setTextIfChanged`

