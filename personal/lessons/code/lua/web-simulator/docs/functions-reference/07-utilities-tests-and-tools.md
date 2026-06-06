# Утилиты, тесты и инструменты

Вспомогательные функции общего назначения, автоматические тесты и инженерные скрипты для генерации или обслуживания проекта.

## Состав группы

- [`jest.config.js`](#jest-config-js)
- [`package-lock.json`](#package-lock-json)
- [`public/fragments/layout/global-header.html`](#public-fragments-layout-global-header-html)
- [`public/fragments/layout/main-scene.html`](#public-fragments-layout-main-scene-html)
- [`public/fragments/layout/sidebar-panels.html`](#public-fragments-layout-sidebar-panels-html)
- [`public/fragments/layout/sidebar-tabs.html`](#public-fragments-layout-sidebar-tabs-html)
- [`public/fragments/modals/gamepad-wizard.html`](#public-fragments-modals-gamepad-wizard-html)
- [`public/fragments/panels/channel-monitor.html`](#public-fragments-panels-channel-monitor-html)
- [`public/fragments/panels/docs.html`](#public-fragments-panels-docs-html)
- [`public/fragments/panels/drones.html`](#public-fragments-panels-drones-html)
- [`public/fragments/panels/editor.html`](#public-fragments-panels-editor-html)
- [`public/fragments/panels/gamepad.html`](#public-fragments-panels-gamepad-html)
- [`public/fragments/panels/gamepad/mapping-pane.html`](#public-fragments-panels-gamepad-mapping-pane-html)
- [`public/fragments/panels/gamepad/monitor-pane.html`](#public-fragments-panels-gamepad-monitor-pane-html)
- [`public/fragments/panels/logs.html`](#public-fragments-panels-logs-html)
- [`public/fragments/panels/manager.html`](#public-fragments-panels-manager-html)
- [`public/fragments/panels/manager/hierarchy.html`](#public-fragments-panels-manager-hierarchy-html)
- [`public/fragments/panels/manager/inspector.html`](#public-fragments-panels-manager-inspector-html)
- [`public/fragments/panels/rc-settings.html`](#public-fragments-panels-rc-settings-html)
- [`public/fragments/panels/settings.html`](#public-fragments-panels-settings-html)
- [`public/index.html`](#public-index-html)
- [`public/modules/app/animation-loop.ts`](#public-modules-app-animation-loop-ts)
- [`public/modules/app/global-error.ts`](#public-modules-app-global-error-ts)
- [`public/modules/app/language-selector.ts`](#public-modules-app-language-selector-ts)
- [`public/modules/app/script-execution-notice-templates.ts`](#public-modules-app-script-execution-notice-templates-ts)
- [`public/modules/app/script-execution-notice.ts`](#public-modules-app-script-execution-notice-ts)
- [`public/modules/app/script-execution-notice/error.ts`](#public-modules-app-script-execution-notice-error-ts)
- [`public/modules/app/script-execution-notice/humanize.ts`](#public-modules-app-script-execution-notice-humanize-ts)
- [`public/modules/app/script-execution-notice/lua-validation.ts`](#public-modules-app-script-execution-notice-lua-validation-ts)
- [`public/modules/app/script-execution-notice/python-validation.ts`](#public-modules-app-script-execution-notice-python-validation-ts)
- [`public/modules/app/script-execution-notice/state.ts`](#public-modules-app-script-execution-notice-state-ts)
- [`public/modules/app/script-execution-notice/types.ts`](#public-modules-app-script-execution-notice-types-ts)
- [`public/modules/app/simulation-controls.ts`](#public-modules-app-simulation-controls-ts)
- [`public/modules/app/theme-toggle.ts`](#public-modules-app-theme-toggle-ts)
- [`public/modules/autopilot/fsm-internals.ts`](#public-modules-autopilot-fsm-internals-ts)
- [`public/modules/autopilot/fsm.ts`](#public-modules-autopilot-fsm-ts)
- [`public/modules/autopilot/mce-events.ts`](#public-modules-autopilot-mce-events-ts)
- [`public/modules/core/gamepad-settings.ts`](#public-modules-core-gamepad-settings-ts)
- [`public/modules/core/state-types.ts`](#public-modules-core-state-types-ts)
- [`public/modules/core/state.ts`](#public-modules-core-state-ts)
- [`public/modules/docs/api-docs-events.ts`](#public-modules-docs-api-docs-events-ts)
- [`public/modules/docs/api-docs-types.ts`](#public-modules-docs-api-docs-types-ts)
- [`public/modules/docs/api-docs.ts`](#public-modules-docs-api-docs-ts)
- [`public/modules/docs/lua-api-docs.ts`](#public-modules-docs-lua-api-docs-ts)
- [`public/modules/docs/python-api-docs.ts`](#public-modules-docs-python-api-docs-ts)
- [`public/modules/shared/logging/logger.ts`](#public-modules-shared-logging-logger-ts)
- [`tests/cargo-contact.test.ts`](#tests-cargo-contact-test-ts)
- [`tests/editor-blockly-ui.test.ts`](#tests-editor-blockly-ui-test-ts)
- [`tests/frames.test.ts`](#tests-frames-test-ts)
- [`tests/fsm.test.ts`](#tests-fsm-test-ts)
- [`tests/helpers/script-execution-notice-harness.ts`](#tests-helpers-script-execution-notice-harness-ts)
- [`tests/logger.test.ts`](#tests-logger-test-ts)
- [`tests/lua-sleep.test.ts`](#tests-lua-sleep-test-ts)
- [`tests/mission-guide.test.ts`](#tests-mission-guide-test-ts)
- [`tests/paths.test.ts`](#tests-paths-test-ts)
- [`tests/rc-settings.test.ts`](#tests-rc-settings-test-ts)
- [`tests/script-execution-notice-failures.test.ts`](#tests-script-execution-notice-failures-test-ts)
- [`tests/script-execution-notice-scenarios.test.ts`](#tests-script-execution-notice-scenarios-test-ts)
- [`tests/state.test.ts`](#tests-state-test-ts)
- [`tests/tracing.test.ts`](#tests-tracing-test-ts)
- [`tools/audit_and_refactor.ts`](#tools-audit-and-refactor-ts)
- [`tools/functions-reference/config.mjs`](#tools-functions-reference-config-mjs)
- [`tools/functions-reference/renderer.mjs`](#tools-functions-reference-renderer-mjs)
- [`tools/functions-reference/scanner.mjs`](#tools-functions-reference-scanner-mjs)
- [`tools/generate_functions_reference_index.mjs`](#tools-generate-functions-reference-index-mjs)
- [`tools/generate_marker_dictionaries.mjs`](#tools-generate-marker-dictionaries-mjs)
- [`tools/playwright/temp-playwright-probe.mjs`](#tools-playwright-temp-playwright-probe-mjs)
- [`tools/playwright/temp-playwright-repro.mjs`](#tools-playwright-temp-playwright-repro-mjs)
- [`tools/revert_lua.ts`](#tools-revert-lua-ts)
- [`tools/run_tests.ts`](#tools-run-tests-ts)

## Файлы

<a id="jest-config-js"></a>
### `jest.config.js`

- Исходник: [открыть файл](../../jest.config.js)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="package-lock-json"></a>
### `package-lock.json`

- Исходник: [открыть файл](../../package-lock.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="public-fragments-layout-global-header-html"></a>
### `public/fragments/layout/global-header.html`

- Исходник: [открыть файл](../../public/fragments/layout/global-header.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-layout-main-scene-html"></a>
### `public/fragments/layout/main-scene.html`

- Исходник: [открыть файл](../../public/fragments/layout/main-scene.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-layout-sidebar-panels-html"></a>
### `public/fragments/layout/sidebar-panels.html`

- Исходник: [открыть файл](../../public/fragments/layout/sidebar-panels.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-layout-sidebar-tabs-html"></a>
### `public/fragments/layout/sidebar-tabs.html`

- Исходник: [открыть файл](../../public/fragments/layout/sidebar-tabs.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-modals-gamepad-wizard-html"></a>
### `public/fragments/modals/gamepad-wizard.html`

- Исходник: [открыть файл](../../public/fragments/modals/gamepad-wizard.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-channel-monitor-html"></a>
### `public/fragments/panels/channel-monitor.html`

- Исходник: [открыть файл](../../public/fragments/panels/channel-monitor.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-docs-html"></a>
### `public/fragments/panels/docs.html`

- Исходник: [открыть файл](../../public/fragments/panels/docs.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-drones-html"></a>
### `public/fragments/panels/drones.html`

- Исходник: [открыть файл](../../public/fragments/panels/drones.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-editor-html"></a>
### `public/fragments/panels/editor.html`

- Исходник: [открыть файл](../../public/fragments/panels/editor.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-gamepad-html"></a>
### `public/fragments/panels/gamepad.html`

- Исходник: [открыть файл](../../public/fragments/panels/gamepad.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-gamepad-mapping-pane-html"></a>
### `public/fragments/panels/gamepad/mapping-pane.html`

- Исходник: [открыть файл](../../public/fragments/panels/gamepad/mapping-pane.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-gamepad-monitor-pane-html"></a>
### `public/fragments/panels/gamepad/monitor-pane.html`

- Исходник: [открыть файл](../../public/fragments/panels/gamepad/monitor-pane.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-logs-html"></a>
### `public/fragments/panels/logs.html`

- Исходник: [открыть файл](../../public/fragments/panels/logs.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-manager-html"></a>
### `public/fragments/panels/manager.html`

- Исходник: [открыть файл](../../public/fragments/panels/manager.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-manager-hierarchy-html"></a>
### `public/fragments/panels/manager/hierarchy.html`

- Исходник: [открыть файл](../../public/fragments/panels/manager/hierarchy.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-manager-inspector-html"></a>
### `public/fragments/panels/manager/inspector.html`

- Исходник: [открыть файл](../../public/fragments/panels/manager/inspector.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-rc-settings-html"></a>
### `public/fragments/panels/rc-settings.html`

- Исходник: [открыть файл](../../public/fragments/panels/rc-settings.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-settings-html"></a>
### `public/fragments/panels/settings.html`

- Исходник: [открыть файл](../../public/fragments/panels/settings.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-index-html"></a>
### `public/index.html`

- Исходник: [открыть файл](../../public/index.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-modules-app-animation-loop-ts"></a>
### `public/modules/app/animation-loop.ts`

- Исходник: [открыть файл](../../public/modules/app/animation-loop.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `animate`, `getAnimationFrameId`, `startAnimationLoop`

<a id="public-modules-app-global-error-ts"></a>
### `public/modules/app/global-error.ts`

- Исходник: [открыть файл](../../public/modules/app/global-error.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `registerGlobalErrorHandler`

<a id="public-modules-app-language-selector-ts"></a>
### `public/modules/app/language-selector.ts`

- Исходник: [открыть файл](../../public/modules/app/language-selector.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `getSavedScriptLanguage`, `initScriptLanguageSelector`

<a id="public-modules-app-script-execution-notice-templates-ts"></a>
### `public/modules/app/script-execution-notice-templates.ts`

- Исходник: [открыть файл](../../public/modules/app/script-execution-notice-templates.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 11
- Ключевые символы: `buildScriptFailureLocation`, `callback`, `collectScriptFailureTechnicalDetails`, `escapeHtml`, `normalizeNoticeText`, `renderEarlyRouteHtml`, `renderFailureSection`, `renderFailureStack`, `renderIssuesHtml`, `renderScriptFailureHtml`, `renderSimultaneousCommandsHtml`

<a id="public-modules-app-script-execution-notice-ts"></a>
### `public/modules/app/script-execution-notice.ts`

- Исходник: [открыть файл](../../public/modules/app/script-execution-notice.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 9
- Ключевые символы: `collectScenarioValidationResult`, `hasLuaEarlyRouteIssue`, `scriptHasVisibleDelay`, `showEarlyRouteNotice`, `showScenarioValidationNotice`, `showScriptFailureNotice`, `showSimultaneousCommandsNotice`, `validateScenarioBeforeLaunch`, `warnAboutInstantExecution`

<a id="public-modules-app-script-execution-notice-error-ts"></a>
### `public/modules/app/script-execution-notice/error.ts`

- Исходник: [открыть файл](../../public/modules/app/script-execution-notice/error.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `createScriptFailureError`, `getLastNonEmptyLine`, `normalizeScriptFailureError`

<a id="public-modules-app-script-execution-notice-humanize-ts"></a>
### `public/modules/app/script-execution-notice/humanize.ts`

- Исходник: [открыть файл](../../public/modules/app/script-execution-notice/humanize.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `humanizeLuaFsmRuntimeMessage`, `humanizeLuaRuntimeMessage`, `humanizeLuaSyntaxMessage`, `humanizePythonRuntimeMessage`, `humanizePythonSyntaxMessage`, `humanizeScriptFailure`

<a id="public-modules-app-script-execution-notice-lua-validation-ts"></a>
### `public/modules/app/script-execution-notice/lua-validation.ts`

- Исходник: [открыть файл](../../public/modules/app/script-execution-notice/lua-validation.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 10
- Ключевые символы: `collectLuaBlockingIssues`, `collectLuaDelayedMissionCommands`, `collectLuaIssues`, `collectLuaMissionCommandGroups`, `collectLuaMissionCommands`, `countLuaBlockClosers`, `countLuaBlockOpeners`, `detectLuaEarlyRouteIssue`, `hasLuaEarlyRouteIssue`, `stripLuaManagedBlocks`

<a id="public-modules-app-script-execution-notice-python-validation-ts"></a>
### `public/modules/app/script-execution-notice/python-validation.ts`

- Исходник: [открыть файл](../../public/modules/app/script-execution-notice/python-validation.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `collectPythonIssues`

<a id="public-modules-app-script-execution-notice-state-ts"></a>
### `public/modules/app/script-execution-notice/state.ts`

- Исходник: [открыть файл](../../public/modules/app/script-execution-notice/state.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `getNoticeSuppressionState`, `markEarlyRouteNoticeAsShown`, `markSimultaneousNoticeAsShown`, `resetScriptExecutionNoticeState`, `shouldSuppressEarlyRouteNotice`, `shouldSuppressSimultaneousNotice`

<a id="public-modules-app-script-execution-notice-types-ts"></a>
### `public/modules/app/script-execution-notice/types.ts`

- Исходник: [открыть файл](../../public/modules/app/script-execution-notice/types.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-app-simulation-controls-ts"></a>
### `public/modules/app/simulation-controls.ts`

- Исходник: [открыть файл](../../public/modules/app/simulation-controls.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `configureSimulationControls`, `resetSimulationState`, `restartAndRunSimulation`

<a id="public-modules-app-theme-toggle-ts"></a>
### `public/modules/app/theme-toggle.ts`

- Исходник: [открыть файл](../../public/modules/app/theme-toggle.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `applyAppTheme`, `getStoredTheme`, `getSystemTheme`, `initThemeToggle`, `resolveTheme`, `updateThemeToggleButton`

<a id="public-modules-autopilot-fsm-internals-ts"></a>
### `public/modules/autopilot/fsm-internals.ts`

- Исходник: [открыть файл](../../public/modules/autopilot/fsm-internals.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `failSimultaneousCommands`, `getCommandName`, `getTickCommandLabel`, `makeSignature`, `setFsmStateAndSyncStatus`, `syncStatus`

<a id="public-modules-autopilot-fsm-ts"></a>
### `public/modules/autopilot/fsm.ts`

- Исходник: [открыть файл](../../public/modules/autopilot/fsm.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 20
- Ключевые символы: `applyGoToLocalPointRequest`, `beginEventCallbackPhase`, `completeLanding`, `completePointReached`, `completeTakeoff`, `enterLandingProcess`, `enterPreflight`, `enterTakeoffProcess`, `getCommandSource`, `getCurrentTickMs`, `handlePreflightTimeout`, `isDroneAirborneState`, `isDroneMovingState`, `isMovementReached`, `queueMceCommand`, `recordTickCommand`, `rejectCommandByFsm`, `setDroneFsmState`, `shouldSpinRotors`, `throwFsmTransitionError`

<a id="public-modules-autopilot-mce-events-ts"></a>
### `public/modules/autopilot/mce-events.ts`

- Исходник: [открыть файл](../../public/modules/autopilot/mce-events.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `EventEmitter.emit`, `EventEmitter.if`, `EventEmitter.off`, `EventEmitter.on`, `pushCommand`, `runMCETests`, `testCb`, `triggerEvent`

<a id="public-modules-core-gamepad-settings-ts"></a>
### `public/modules/core/gamepad-settings.ts`

- Исходник: [открыть файл](../../public/modules/core/gamepad-settings.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `loadGamepadSettings`, `matchesAuxRange`, `saveGamepadSettings`

<a id="public-modules-core-state-types-ts"></a>
### `public/modules/core/state-types.ts`

- Исходник: [открыть файл](../../public/modules/core/state-types.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-core-state-ts"></a>
### `public/modules/core/state.ts`

- Исходник: [открыть файл](../../public/modules/core/state.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 11
- Ключевые символы: `createDroneState`, `createEmptyLuaDiagnosticsState`, `getDroneFromLua`, `isDroneArmed`, `loadGamepadSettings`, `matchesAuxRange`, `resetRuntimeStatePreservePose`, `resetState`, `saveGamepadSettings`, `setCurrentDrone`, `setCurrentScriptLanguage`

<a id="public-modules-docs-api-docs-events-ts"></a>
### `public/modules/docs/api-docs-events.ts`

- Исходник: [открыть файл](../../public/modules/docs/api-docs-events.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-docs-api-docs-types-ts"></a>
### `public/modules/docs/api-docs-types.ts`

- Исходник: [открыть файл](../../public/modules/docs/api-docs-types.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-docs-api-docs-ts"></a>
### `public/modules/docs/api-docs.ts`

- Исходник: [открыть файл](../../public/modules/docs/api-docs.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-docs-lua-api-docs-ts"></a>
### `public/modules/docs/lua-api-docs.ts`

- Исходник: [открыть файл](../../public/modules/docs/lua-api-docs.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-docs-python-api-docs-ts"></a>
### `public/modules/docs/python-api-docs.ts`

- Исходник: [открыть файл](../../public/modules/docs/python-api-docs.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-shared-logging-logger-ts"></a>
### `public/modules/shared/logging/logger.ts`

- Исходник: [открыть файл](../../public/modules/shared/logging/logger.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 12
- Ключевые символы: `classifyLogTone`, `countEntriesByCategory`, `createEmptyStateElement`, `createLogEntryElement`, `createTabButton`, `extractTagAndMessage`, `getEmptyMessage`, `log`, `renderLogStream`, `renderLogsUI`, `renderTabs`, `resolveLogCategory`

<a id="tests-cargo-contact-test-ts"></a>
### `tests/cargo-contact.test.ts`

- Исходник: [открыть файл](../../tests/cargo-contact.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `runUntilGroundContact`

<a id="tests-editor-blockly-ui-test-ts"></a>
### `tests/editor-blockly-ui.test.ts`

- Исходник: [открыть файл](../../tests/editor-blockly-ui.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 3
- Ключевые символы: `createMockClassList`, `createMockElement`, `createMockInput`

<a id="tests-frames-test-ts"></a>
### `tests/frames.test.ts`

- Исходник: [открыть файл](../../tests/frames.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-fsm-test-ts"></a>
### `tests/fsm.test.ts`

- Исходник: [открыть файл](../../tests/fsm.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `captureLogLine`

<a id="tests-helpers-script-execution-notice-harness-ts"></a>
### `tests/helpers/script-execution-notice-harness.ts`

- Исходник: [открыть файл](../../tests/helpers/script-execution-notice-harness.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `createScriptExecutionNoticeHarness`

<a id="tests-logger-test-ts"></a>
### `tests/logger.test.ts`

- Исходник: [открыть файл](../../tests/logger.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-lua-sleep-test-ts"></a>
### `tests/lua-sleep.test.ts`

- Исходник: [открыть файл](../../tests/lua-sleep.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-mission-guide-test-ts"></a>
### `tests/mission-guide.test.ts`

- Исходник: [открыть файл](../../tests/mission-guide.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-paths-test-ts"></a>
### `tests/paths.test.ts`

- Исходник: [открыть файл](../../tests/paths.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-rc-settings-test-ts"></a>
### `tests/rc-settings.test.ts`

- Исходник: [открыть файл](../../tests/rc-settings.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-script-execution-notice-failures-test-ts"></a>
### `tests/script-execution-notice-failures.test.ts`

- Исходник: [открыть файл](../../tests/script-execution-notice-failures.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-script-execution-notice-scenarios-test-ts"></a>
### `tests/script-execution-notice-scenarios.test.ts`

- Исходник: [открыть файл](../../tests/script-execution-notice-scenarios.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `callback`, `changeColor`

<a id="tests-state-test-ts"></a>
### `tests/state.test.ts`

- Исходник: [открыть файл](../../tests/state.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-tracing-test-ts"></a>
### `tests/tracing.test.ts`

- Исходник: [открыть файл](../../tests/tracing.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tools-audit-and-refactor-ts"></a>
### `tools/audit_and_refactor.ts`

- Исходник: [открыть файл](../../tools/audit_and_refactor.ts)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 3
- Ключевые символы: `getLDocTemplate`, `processLuaFile`, `walkDir`

<a id="tools-functions-reference-config-mjs"></a>
### `tools/functions-reference/config.mjs`

- Исходник: [открыть файл](../../tools/functions-reference/config.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 6
- Ключевые символы: `classifyFile`, `isMatch`, `relativeToRoot`, `slugFromPath`, `summaryForFile`, `toPosix`

<a id="tools-functions-reference-renderer-mjs"></a>
### `tools/functions-reference/renderer.mjs`

- Исходник: [открыть файл](../../tools/functions-reference/renderer.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 4
- Ключевые символы: `ensureDir`, `relativeLink`, `renderGroupFile`, `renderRootIndex`

<a id="tools-functions-reference-scanner-mjs"></a>
### `tools/functions-reference/scanner.mjs`

- Исходник: [открыть файл](../../tools/functions-reference/scanner.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 4
- Ключевые символы: `buildMetadataByFile`, `collectTrackedFiles`, `extractFunctions`, `walk`

<a id="tools-generate-functions-reference-index-mjs"></a>
### `tools/generate_functions_reference_index.mjs`

- Исходник: [открыть файл](../../tools/generate_functions_reference_index.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 0

<a id="tools-generate-marker-dictionaries-mjs"></a>
### `tools/generate_marker_dictionaries.mjs`

- Исходник: [открыть файл](../../tools/generate_marker_dictionaries.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 5
- Ключевые символы: `chunk`, `formatDataBlock`, `loadSources`, `main`, `parseSourceArrays`

<a id="tools-playwright-temp-playwright-probe-mjs"></a>
### `tools/playwright/temp-playwright-probe.mjs`

- Исходник: [открыть файл](../../tools/playwright/temp-playwright-probe.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 0

<a id="tools-playwright-temp-playwright-repro-mjs"></a>
### `tools/playwright/temp-playwright-repro.mjs`

- Исходник: [открыть файл](../../tools/playwright/temp-playwright-repro.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 3
- Ключевые символы: `buildLesson1`, `buildLesson2`, `snapshot`

<a id="tools-revert-lua-ts"></a>
### `tools/revert_lua.ts`

- Исходник: [открыть файл](../../tools/revert_lua.ts)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 2
- Ключевые символы: `processLuaFile`, `walkDir`

<a id="tools-run-tests-ts"></a>
### `tools/run_tests.ts`

- Исходник: [открыть файл](../../tools/run_tests.ts)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 2
- Ключевые символы: `runLuaTest`, `walkDir`

