# Настройки пульта и калибровка

Подсистема настроек геймпада: карта каналов, автоопределение входов, калибровка, диапазоны AUX и визуализация живых данных.

## Состав группы

- [`public/modules/ui/settings/auto-detect.ts`](#public-modules-ui-settings-auto-detect-ts)
- [`public/modules/ui/settings/bindings.ts`](#public-modules-ui-settings-bindings-ts)
- [`public/modules/ui/settings/calibration.ts`](#public-modules-ui-settings-calibration-ts)
- [`public/modules/ui/settings/channel-ranges.ts`](#public-modules-ui-settings-channel-ranges-ts)
- [`public/modules/ui/settings/constants.ts`](#public-modules-ui-settings-constants-ts)
- [`public/modules/ui/settings/dom.ts`](#public-modules-ui-settings-dom-ts)
- [`public/modules/ui/settings/mapping.ts`](#public-modules-ui-settings-mapping-ts)
- [`public/modules/ui/settings/observed-inputs.ts`](#public-modules-ui-settings-observed-inputs-ts)
- [`public/modules/ui/settings/rendering.ts`](#public-modules-ui-settings-rendering-ts)
- [`public/modules/ui/settings/runtime-state.ts`](#public-modules-ui-settings-runtime-state-ts)
- [`public/modules/ui/settings/types.ts`](#public-modules-ui-settings-types-ts)

## Файлы

<a id="public-modules-ui-settings-auto-detect-ts"></a>
### `public/modules/ui/settings/auto-detect.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/auto-detect.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 4
- Ключевые символы: `detectAutoInput`, `getChannelLabel`, `startAutoDetection`, `stopAutoDetection`

<a id="public-modules-ui-settings-bindings-ts"></a>
### `public/modules/ui/settings/bindings.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/bindings.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 2
- Ключевые символы: `bindGamepadSettingsControls`, `bindGeneralSettingsControls`

<a id="public-modules-ui-settings-calibration-ts"></a>
### `public/modules/ui/settings/calibration.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/calibration.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 6
- Ключевые символы: `beginCalibration`, `finishCalibration`, `normalizeCenteredAxis`, `normalizeThrottleAxis`, `resetCalibration`, `sampleCalibration`

<a id="public-modules-ui-settings-channel-ranges-ts"></a>
### `public/modules/ui/settings/channel-ranges.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/channel-ranges.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 6
- Ключевые символы: `applyModeRangesFromObserved`, `getAuxRange`, `getModeObservedPositions`, `getObservedStats`, `setAuxRange`, `setModeRange`

<a id="public-modules-ui-settings-constants-ts"></a>
### `public/modules/ui/settings/constants.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/constants.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-settings-dom-ts"></a>
### `public/modules/ui/settings/dom.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/dom.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 1
- Ключевые символы: `collectSettingsDomRefs`

<a id="public-modules-ui-settings-mapping-ts"></a>
### `public/modules/ui/settings/mapping.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/mapping.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 20
- Ключевые символы: `applyPrimaryAxisMappingForCurrentMode`, `createAuxOptions`, `createAxisOptions`, `ensureMappingsForGamepad`, `findActiveGamepad`, `getConnectedGamepads`, `getDefaultChannelValue`, `getFallbackMapping`, `getGamepadName`, `getMappingRef`, `getModePrimaryAxisIndexes`, `getPreferredAuxRefs`, `getRcPrimaryAxisMapping`, `hasInputRef`, `hasLegacyPrimaryMapping`, `isAllowedForChannel`, `isLikelyRcTransmitter`, `pushIfUnused`, `readInputRcValue`, `setMappingRef`

<a id="public-modules-ui-settings-observed-inputs-ts"></a>
### `public/modules/ui/settings/observed-inputs.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/observed-inputs.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 7
- Ключевые символы: `buildRangesFromPositions`, `findClosestRangeByCenter`, `getObservedPositions`, `mergeObservedPositions`, `pickRepresentativePositions`, `rememberObservedInputValue`, `resetObservedInputStats`

<a id="public-modules-ui-settings-rendering-ts"></a>
### `public/modules/ui/settings/rendering.ts`

- Исходник: [открыть файл](../../public/modules/ui/settings/rendering.ts)
- Кратко: Модуль карты каналов, калибровки и настроек геймпада.
- Обнаружено функций/методов: 15
- Ключевые символы: `getChannelLabel`, `renderAutoButtons`, `renderAutoStatus`, `renderAuxRangeEditor`, `renderAuxRangeEditors`, `renderAuxRangePresetOptions`, `renderCalibrationState`, `renderChannelDataState`, `renderChannelDefaults`, `renderChannelValue`, `renderMappingControlsState`, `renderModeMeta`, `setAutoStatus`, `syncSelectWithMapping`, `updateBar`

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


