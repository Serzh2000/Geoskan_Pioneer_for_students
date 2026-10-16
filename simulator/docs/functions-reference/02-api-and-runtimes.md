# API-запросы и рантаймы

Интеграции Lua/Python, публикация OpenAPI, клиентские и серверные точки взаимодействия с внешними сценариями и API.

## Состав группы

- [`public/modules/lua/api-constants.ts`](#public-modules-lua-api-constants-ts)
- [`public/modules/lua/autopilot.ts`](#public-modules-lua-autopilot-ts)
- [`public/modules/lua/bridge.ts`](#public-modules-lua-bridge-ts)
- [`public/modules/lua/diagnostics.ts`](#public-modules-lua-diagnostics-ts)
- [`public/modules/lua/diagnostics/bridge.ts`](#public-modules-lua-diagnostics-bridge-ts)
- [`public/modules/lua/diagnostics/runtime-error.ts`](#public-modules-lua-diagnostics-runtime-error-ts)
- [`public/modules/lua/diagnostics/state.ts`](#public-modules-lua-diagnostics-state-ts)
- [`public/modules/lua/hardware.ts`](#public-modules-lua-hardware-ts)
- [`public/modules/lua/hardware/camera.ts`](#public-modules-lua-hardware-camera-ts)
- [`public/modules/lua/hardware/io.ts`](#public-modules-lua-hardware-io-ts)
- [`public/modules/lua/index.ts`](#public-modules-lua-index-ts)
- [`public/modules/lua/leds.ts`](#public-modules-lua-leds-ts)
- [`public/modules/lua/mailbox.ts`](#public-modules-lua-mailbox-ts)
- [`public/modules/lua/mission-guard.ts`](#public-modules-lua-mission-guard-ts)
- [`public/modules/lua/runner.ts`](#public-modules-lua-runner-ts)
- [`public/modules/lua/runtime.ts`](#public-modules-lua-runtime-ts)
- [`public/modules/lua/sensors.ts`](#public-modules-lua-sensors-ts)
- [`public/modules/lua/setup-script.ts`](#public-modules-lua-setup-script-ts)
- [`public/modules/lua/timers.ts`](#public-modules-lua-timers-ts)
- [`public/modules/lua/utils.ts`](#public-modules-lua-utils-ts)
- [`public/modules/lua/vehicles.ts`](#public-modules-lua-vehicles-ts)
- [`public/modules/python/browser-runtime.ts`](#public-modules-python-browser-runtime-ts)
- [`public/modules/python/external-bridge-binding.ts`](#public-modules-python-external-bridge-binding-ts)
- [`public/modules/python/external-bridge-runtime.ts`](#public-modules-python-external-bridge-runtime-ts)
- [`public/modules/python/external-bridge.ts`](#public-modules-python-external-bridge-ts)
- [`public/modules/python/index.ts`](#public-modules-python-index-ts)
- [`public/modules/python/local-runtime.ts`](#public-modules-python-local-runtime-ts)
- [`public/modules/python/marker-detection.ts`](#public-modules-python-marker-detection-ts)
- [`public/modules/python/pioneer-js-bridge-camera-render.ts`](#public-modules-python-pioneer-js-bridge-camera-render-ts)
- [`public/modules/python/pioneer-js-bridge-camera-shared.ts`](#public-modules-python-pioneer-js-bridge-camera-shared-ts)
- [`public/modules/python/pioneer-js-bridge-camera.ts`](#public-modules-python-pioneer-js-bridge-camera-ts)
- [`public/modules/python/pioneer-js-bridge-cv.ts`](#public-modules-python-pioneer-js-bridge-cv-ts)
- [`public/modules/python/pioneer-js-bridge.ts`](#public-modules-python-pioneer-js-bridge-ts)
- [`public/modules/python/pioneer-sdk-cv-prelude.ts`](#public-modules-python-pioneer-sdk-cv-prelude-ts)
- [`public/modules/python/pioneer-sdk-module.ts`](#public-modules-python-pioneer-sdk-module-ts)
- [`public/modules/python/pyodide-loader.ts`](#public-modules-python-pyodide-loader-ts)
- [`public/modules/python/runtime-shared.ts`](#public-modules-python-runtime-shared-ts)
- [`public/modules/python/runtime.ts`](#public-modules-python-runtime-ts)

## Файлы

<a id="public-modules-lua-api-constants-ts"></a>
### `public/modules/lua/api-constants.ts`

- Исходник: [открыть файл](../../public/modules/lua/api-constants.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 3
- Ключевые символы: `buildLuaEventTableLiteral`, `getLuaMissingGlobalConstantError`, `looksLikeLuaApiConstant`

<a id="public-modules-lua-autopilot-ts"></a>
### `public/modules/lua/autopilot.ts`

- Исходник: [открыть файл](../../public/modules/lua/autopilot.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 6
- Ключевые символы: `ap_goToLocalPoint`, `ap_goToPoint`, `ap_push`, `ap_updateYaw`, `callback`, `ensureLuaMissionCommandAllowed`

<a id="public-modules-lua-bridge-ts"></a>
### `public/modules/lua/bridge.ts`

- Исходник: [открыть файл](../../public/modules/lua/bridge.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 5
- Ключевые символы: `extractLuaSyntaxLine`, `js_validate_missing_global`, `lua_print`, `registerLuaBridgeFunctions`, `setupLuaBridgeForDrone`

<a id="public-modules-lua-diagnostics-ts"></a>
### `public/modules/lua/diagnostics.ts`

- Исходник: [открыть файл](../../public/modules/lua/diagnostics.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 0

<a id="public-modules-lua-diagnostics-bridge-ts"></a>
### `public/modules/lua/diagnostics/bridge.ts`

- Исходник: [открыть файл](../../public/modules/lua/diagnostics/bridge.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 6
- Ключевые символы: `js_diag_describe_mce`, `js_diag_get_fsm_state`, `js_diag_log`, `js_diag_record_api_call`, `readLuaNumberArg`, `readLuaStringArg`

<a id="public-modules-lua-diagnostics-runtime-error-ts"></a>
### `public/modules/lua/diagnostics/runtime-error.ts`

- Исходник: [открыть файл](../../public/modules/lua/diagnostics/runtime-error.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 8
- Ключевые символы: `buildFallbackReason`, `collectTechnicalDetailLines`, `createLuaRuntimeFailureError`, `extractLuaLine`, `extractPrimaryMessage`, `extractTraceback`, `isOpaqueLuaRuntimeValue`, `isSimultaneousCommandsFailure`

<a id="public-modules-lua-diagnostics-state-ts"></a>
### `public/modules/lua/diagnostics/state.ts`

- Исходник: [открыть файл](../../public/modules/lua/diagnostics/state.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 21
- Ключевые символы: `buildSimultaneousCommandsContextLines`, `describeCommandId`, `extractEventCommandId`, `extractTimerDelay`, `formatCompactApiContextLine`, `formatRecentApiCalls`, `formatTickMs`, `getDroneTickMs`, `getLuaDiagnosticsState`, `getLuaFsmHistoryLines`, `getMissionCommandToken`, `getRecentContextLines`, `mapLuaLogLevel`, `normalizeLocation`, `normalizeText`, `pushLuaRuntimeLog`, `recordLuaApiCall`, `recordLuaFsmTransition`, `rememberLuaErrorStack`, `rememberLuaFailureHint`, `setLuaExecutionPhase`

<a id="public-modules-lua-hardware-ts"></a>
### `public/modules/lua/hardware.ts`

- Исходник: [открыть файл](../../public/modules/lua/hardware.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 0

<a id="public-modules-lua-hardware-camera-ts"></a>
### `public/modules/lua/hardware/camera.ts`

- Исходник: [открыть файл](../../public/modules/lua/hardware/camera.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 18
- Ключевые символы: `buildTimestampSlug`, `camera_checkRequestRecord`, `camera_checkRequestShot`, `camera_requestMakeShot`, `camera_requestRecordStart`, `camera_requestRecordStop`, `downloadCanvasShot`, `ensureCaptureRenderer`, `getDroneFpvCamera`, `getRendererCanvas`, `getVideoMimeType`, `releaseCaptureRenderer`, `renderFpvFrame`, `renderTick`, `startCaptureRenderLoop`, `stopCaptureRenderLoop`, `syncCaptureRendererSize`, `triggerBrowserDownload`

<a id="public-modules-lua-hardware-io-ts"></a>
### `public/modules/lua/hardware/io.ts`

- Исходник: [открыть файл](../../public/modules/lua/hardware/io.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 7
- Ключевые символы: `gpio_new`, `isMagnetPin`, `readBooleanField`, `readNumberField`, `spi_new`, `uart_new`, `writeState`

<a id="public-modules-lua-index-ts"></a>
### `public/modules/lua/index.ts`

- Исходник: [открыть файл](../../public/modules/lua/index.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 0

<a id="public-modules-lua-leds-ts"></a>
### `public/modules/lua/leds.ts`

- Исходник: [открыть файл](../../public/modules/lua/leds.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 3
- Ключевые символы: `js_init_leds`, `js_ledbar_set`, `ledbar_fromHSV`

<a id="public-modules-lua-mailbox-ts"></a>
### `public/modules/lua/mailbox.ts`

- Исходник: [открыть файл](../../public/modules/lua/mailbox.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 7
- Ключевые символы: `mailbox_connect`, `mailbox_hasMessages`, `mailbox_myHullNumber`, `mailbox_receive`, `mailbox_send`, `mailbox_setHullNumber`, `self`

<a id="public-modules-lua-mission-guard-ts"></a>
### `public/modules/lua/mission-guard.ts`

- Исходник: [открыть файл](../../public/modules/lua/mission-guard.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 4
- Ключевые символы: `allowLuaMissionCommand`, `resetLuaMissionGuard`, `scriptHasLuaEventCallback`, `shouldDispatchLuaEvent`

<a id="public-modules-lua-runner-ts"></a>
### `public/modules/lua/runner.ts`

- Исходник: [открыть файл](../../public/modules/lua/runner.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 1
- Ключевые символы: `runCoroutine`

<a id="public-modules-lua-runtime-ts"></a>
### `public/modules/lua/runtime.ts`

- Исходник: [открыть файл](../../public/modules/lua/runtime.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 5
- Ключевые символы: `disposeLuaRuntime`, `runLuaScript`, `stopLuaScript`, `triggerLuaCallback`, `updateTimers`

<a id="public-modules-lua-sensors-ts"></a>
### `public/modules/lua/sensors.ts`

- Исходник: [открыть файл](../../public/modules/lua/sensors.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 15
- Ключевые символы: `getChannel`, `normalizeRcPwmToUnit`, `rangeBelow`, `sensors_accel`, `sensors_altitude`, `sensors_battery`, `sensors_gyro`, `sensors_lpsYaw`, `sensors_opticalFlow`, `sensors_orientation`, `sensors_pos`, `sensors_range`, `sensors_rc`, `sensors_tof`, `sensors_vel`

<a id="public-modules-lua-setup-script-ts"></a>
### `public/modules/lua/setup-script.ts`

- Исходник: [открыть файл](../../public/modules/lua/setup-script.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 10
- Ключевые символы: `__diag_format_args`, `__diag_format_value`, `__diag_location`, `__diag_log`, `__diag_record`, `__diag_traceback`, `__ensure_function`, `__ensure_number`, `__resolve_missing_global`, `__vehicle_call`

<a id="public-modules-lua-timers-ts"></a>
### `public/modules/lua/timers.ts`

- Исходник: [открыть файл](../../public/modules/lua/timers.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 6
- Ключевые символы: `js_sleep`, `normalizeLuaDelay`, `sys_deltaTime`, `sys_time`, `timer_callLater`, `timer_new`

<a id="public-modules-lua-utils-ts"></a>
### `public/modules/lua/utils.ts`

- Исходник: [открыть файл](../../public/modules/lua/utils.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 3
- Ключевые символы: `decodeLuaByteLikeValue`, `log`, `luaToStr`

<a id="public-modules-lua-vehicles-ts"></a>
### `public/modules/lua/vehicles.ts`

- Исходник: [открыть файл](../../public/modules/lua/vehicles.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 6
- Ключевые символы: `guarded`, `nameArg`, `vehicle_setSpeed`, `vehicle_start`, `vehicle_state`, `vehicle_stop`

<a id="public-modules-python-browser-runtime-ts"></a>
### `public/modules/python/browser-runtime.ts`

- Исходник: [открыть файл](../../public/modules/python/browser-runtime.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 7
- Ключевые символы: `__SimAsyncify.if`, `cancelBrowserPythonRun`, `clearActivePythonRun`, `disposeBrowserPythonRunState`, `hasActiveBrowserPythonRun`, `runBrowserPythonScript`, `validatePythonSyntax`

<a id="public-modules-python-external-bridge-binding-ts"></a>
### `public/modules/python/external-bridge-binding.ts`

- Исходник: [открыть файл](../../public/modules/python/external-bridge-binding.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 7
- Ключевые символы: `applyConnectionMetadata`, `buildBindingKey`, `findConfiguredDroneId`, `matchesConfiguredDrone`, `normalizeBridgeIp`, `resolveExternalDroneId`, `sanitizeKeyPart`

<a id="public-modules-python-external-bridge-runtime-ts"></a>
### `public/modules/python/external-bridge-runtime.ts`

- Исходник: [открыть файл](../../public/modules/python/external-bridge-runtime.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 7
- Ключевые символы: `applyExternalEvent`, `asNumber`, `callPioneerApi`, `ensureCameraUploader`, `ensureExternalBridgeRuntimeInstalled`, `setExternalDroneRuntimeState`, `syncExternalBridgeStates`

<a id="public-modules-python-external-bridge-ts"></a>
### `public/modules/python/external-bridge.ts`

- Исходник: [открыть файл](../../public/modules/python/external-bridge.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 15
- Ключевые символы: `buildConfiguredConnectionKey`, `clearBindingsForDrone`, `clearDisabledBindings`, `clearExternalBridgeQueue`, `emitExternalBridgeQueueCleared`, `emitExternalBridgeStateChanged`, `hasEnabledExternalBridgeDrones`, `isAnyExternalBridgeEnabled`, `isBridgeAllowedForDrone`, `isExternalBridgeEnabled`, `pollConfiguredBridgeConnections`, `pollExternalBridge`, `setExternalBridgeEnabled`, `syncConfiguredBridgeConnections`, `syncExternalBridgeCursorToLatest`

<a id="public-modules-python-index-ts"></a>
### `public/modules/python/index.ts`

- Исходник: [открыть файл](../../public/modules/python/index.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 0

<a id="public-modules-python-local-runtime-ts"></a>
### `public/modules/python/local-runtime.ts`

- Исходник: [открыть файл](../../public/modules/python/local-runtime.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 9
- Ключевые символы: `clearPollTimer`, `disposeLocalPythonRunState`, `fetchRuntimeStatus`, `getPollState`, `logRuntimeOutput`, `normalizeRuntimeError`, `pollRuntimeStatus`, `runLocalPythonScript`, `stopLocalPythonScript`

<a id="public-modules-python-marker-detection-ts"></a>
### `public/modules/python/marker-detection.ts`

- Исходник: [открыть файл](../../public/modules/python/marker-detection.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 8
- Ключевые символы: `blackSquareHalf`, `detectVisibleMarkers`, `gaussian`, `isHidden`, `lastMarkerFrame`, `latestMarkerDetections`, `markersInFrame`, `sealMarkerFrame`

<a id="public-modules-python-pioneer-js-bridge-camera-render-ts"></a>
### `public/modules/python/pioneer-js-bridge-camera-render.ts`

- Исходник: [открыть файл](../../public/modules/python/pioneer-js-bridge-camera-render.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 12
- Ключевые символы: `captureDroneCameraFrameBlob`, `captureDroneCameraFrameDataUrl`, `captureDroneCameraFramePixels`, `captureFreshFpvCanvas`, `dataUrlToBlob`, `ensureCaptureRenderer`, `getDroneFpvCamera`, `readCanvasBgrPixels`, `readFreshCacheEntry`, `renderDroneFpvFrame`, `setDroneCameraView`, `syncCaptureRendererSize`

<a id="public-modules-python-pioneer-js-bridge-camera-shared-ts"></a>
### `public/modules/python/pioneer-js-bridge-camera-shared.ts`

- Исходник: [открыть файл](../../public/modules/python/pioneer-js-bridge-camera-shared.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 7
- Ключевые символы: `findClosestVideoTower`, `getTowerConnectionRadius`, `getTowerStreamAnchor`, `getVideoTowerObjects`, `measureTowerDistance`, `reportCameraBridgeDebug`, `resolveConnectedCameraFeed`

<a id="public-modules-python-pioneer-js-bridge-camera-ts"></a>
### `public/modules/python/pioneer-js-bridge-camera.ts`

- Исходник: [открыть файл](../../public/modules/python/pioneer-js-bridge-camera.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 12
- Ключевые символы: `buildTimestampSlug`, `captureDroneCameraFrameDataUrl`, `closeDroneCameraConnection`, `connectDroneCamera`, `decodeDataUrlToBytes`, `disconnectDroneCamera`, `downloadDroneCameraPhoto`, `getDroneCameraCvFrame`, `getDroneCameraFrame`, `isDroneCameraConnected`, `reportMissingFeed`, `triggerBrowserDownload`

<a id="public-modules-python-pioneer-js-bridge-cv-ts"></a>
### `public/modules/python/pioneer-js-bridge-cv.ts`

- Исходник: [открыть файл](../../public/modules/python/pioneer-js-bridge-cv.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 4
- Ключевые символы: `ensureCvWindow`, `installCvKeyboardBridge`, `installCvRuntimeAPI`, `renderCvFrameSummary`

<a id="public-modules-python-pioneer-js-bridge-ts"></a>
### `public/modules/python/pioneer-js-bridge.ts`

- Исходник: [открыть файл](../../public/modules/python/pioneer-js-bridge.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 2
- Ключевые символы: `installJsRuntimeAPI`, `toFiniteNumber`

<a id="public-modules-python-pioneer-sdk-cv-prelude-ts"></a>
### `public/modules/python/pioneer-sdk-cv-prelude.ts`

- Исходник: [открыть файл](../../public/modules/python/pioneer-sdk-cv-prelude.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 0

<a id="public-modules-python-pioneer-sdk-module-ts"></a>
### `public/modules/python/pioneer-sdk-module.ts`

- Исходник: [открыть файл](../../public/modules/python/pioneer-sdk-module.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 1
- Ключевые символы: `installPioneerSdkModule`

<a id="public-modules-python-pyodide-loader-ts"></a>
### `public/modules/python/pyodide-loader.ts`

- Исходник: [открыть файл](../../public/modules/python/pyodide-loader.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 3
- Ключевые символы: `ensureNumpyLoaded`, `ensurePyodide`, `loadScript`

<a id="public-modules-python-runtime-shared-ts"></a>
### `public/modules/python/runtime-shared.ts`

- Исходник: [открыть файл](../../public/modules/python/runtime-shared.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 5
- Ключевые символы: `cleanupPythonRuntimeState`, `getDroneOrDefault`, `makeBindingKey`, `resetPythonDroneBindings`, `resolvePythonDroneId`

<a id="public-modules-python-runtime-ts"></a>
### `public/modules/python/runtime.ts`

- Исходник: [открыть файл](../../public/modules/python/runtime.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 4
- Ключевые символы: `disposePythonRunState`, `resetPendingPointState`, `runPythonScript`, `stopPythonScript`

