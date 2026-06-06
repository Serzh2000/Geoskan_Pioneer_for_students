# API-запросы и рантаймы

Интеграции Lua/Python, публикация OpenAPI, клиентские и серверные точки взаимодействия с внешними сценариями и API.

## Состав группы

- [`openapi.yaml`](#openapi-yaml)
- [`public/modules/lua/autopilot.ts`](#public-modules-lua-autopilot-ts)
- [`public/modules/lua/bridge.ts`](#public-modules-lua-bridge-ts)
- [`public/modules/lua/diagnostics.ts`](#public-modules-lua-diagnostics-ts)
- [`public/modules/lua/diagnostics/bridge.ts`](#public-modules-lua-diagnostics-bridge-ts)
- [`public/modules/lua/diagnostics/runtime-error.ts`](#public-modules-lua-diagnostics-runtime-error-ts)
- [`public/modules/lua/diagnostics/state.ts`](#public-modules-lua-diagnostics-state-ts)
- [`public/modules/lua/hardware.ts`](#public-modules-lua-hardware-ts)
- [`public/modules/lua/index.ts`](#public-modules-lua-index-ts)
- [`public/modules/lua/leds.ts`](#public-modules-lua-leds-ts)
- [`public/modules/lua/runner.ts`](#public-modules-lua-runner-ts)
- [`public/modules/lua/runtime.ts`](#public-modules-lua-runtime-ts)
- [`public/modules/lua/sensors.ts`](#public-modules-lua-sensors-ts)
- [`public/modules/lua/setup-script.ts`](#public-modules-lua-setup-script-ts)
- [`public/modules/lua/timers.ts`](#public-modules-lua-timers-ts)
- [`public/modules/lua/utils.ts`](#public-modules-lua-utils-ts)
- [`public/modules/python/index.ts`](#public-modules-python-index-ts)
- [`public/modules/python/pioneer-js-bridge-camera.ts`](#public-modules-python-pioneer-js-bridge-camera-ts)
- [`public/modules/python/pioneer-js-bridge.ts`](#public-modules-python-pioneer-js-bridge-ts)
- [`public/modules/python/pioneer-sdk-module.ts`](#public-modules-python-pioneer-sdk-module-ts)
- [`public/modules/python/runtime-shared.ts`](#public-modules-python-runtime-shared-ts)
- [`public/modules/python/runtime.ts`](#public-modules-python-runtime-ts)

## Файлы

<a id="openapi-yaml"></a>
### `openapi.yaml`

- Исходник: [открыть файл](../../openapi.yaml)
- Кратко: Контракт API и источник схемы для Swagger/OpenAPI.
- Обнаружено функций/методов: 0

<a id="public-modules-lua-autopilot-ts"></a>
### `public/modules/lua/autopilot.ts`

- Исходник: [открыть файл](../../public/modules/lua/autopilot.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 5
- Ключевые символы: `ap_goToLocalPoint`, `ap_goToPoint`, `ap_push`, `ap_updateYaw`, `setLocalFrameOrigin`

<a id="public-modules-lua-bridge-ts"></a>
### `public/modules/lua/bridge.ts`

- Исходник: [открыть файл](../../public/modules/lua/bridge.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 4
- Ключевые символы: `extractLuaSyntaxLine`, `lua_print`, `registerLuaBridgeFunctions`, `setupLuaBridgeForDrone`

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
- Обнаружено функций/методов: 11
- Ключевые символы: `camera_checkRequestShot`, `camera_requestMakeShot`, `camera_requestRecordStart`, `camera_requestRecordStop`, `gpio_new`, `isMagnetPin`, `readBooleanField`, `readNumberField`, `spi_new`, `uart_new`, `writeState`

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
- Обнаружено функций/методов: 4
- Ключевые символы: `runLuaScript`, `stopLuaScript`, `triggerLuaCallback`, `updateTimers`

<a id="public-modules-lua-sensors-ts"></a>
### `public/modules/lua/sensors.ts`

- Исходник: [открыть файл](../../public/modules/lua/sensors.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 11
- Ключевые символы: `getChannel`, `normalizeRcPwmToUnit`, `sensors_accel`, `sensors_battery`, `sensors_gyro`, `sensors_orientation`, `sensors_pos`, `sensors_range`, `sensors_rc`, `sensors_tof`, `sensors_vel`

<a id="public-modules-lua-setup-script-ts"></a>
### `public/modules/lua/setup-script.ts`

- Исходник: [открыть файл](../../public/modules/lua/setup-script.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 9
- Ключевые символы: `__diag_format_args`, `__diag_format_value`, `__diag_location`, `__diag_log`, `__diag_record`, `__diag_traceback`, `__ensure_function`, `__ensure_number`, `callback`

<a id="public-modules-lua-timers-ts"></a>
### `public/modules/lua/timers.ts`

- Исходник: [открыть файл](../../public/modules/lua/timers.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 5
- Ключевые символы: `js_sleep`, `sys_deltaTime`, `sys_time`, `timer_callLater`, `timer_new`

<a id="public-modules-lua-utils-ts"></a>
### `public/modules/lua/utils.ts`

- Исходник: [открыть файл](../../public/modules/lua/utils.ts)
- Кратко: Модуль Lua-моста и исполнения Lua-логики.
- Обнаружено функций/методов: 2
- Ключевые символы: `log`, `luaToStr`

<a id="public-modules-python-index-ts"></a>
### `public/modules/python/index.ts`

- Исходник: [открыть файл](../../public/modules/python/index.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 0

<a id="public-modules-python-pioneer-js-bridge-camera-ts"></a>
### `public/modules/python/pioneer-js-bridge-camera.ts`

- Исходник: [открыть файл](../../public/modules/python/pioneer-js-bridge-camera.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 13
- Ключевые символы: `closeDroneCameraConnection`, `connectDroneCamera`, `disconnectDroneCamera`, `encodeFramePayload`, `findClosestVideoTower`, `getDroneCameraCvFrame`, `getDroneCameraFrame`, `getTowerConnectionRadius`, `getTowerStreamAnchor`, `getVideoTowerObjects`, `isDroneCameraConnected`, `measureTowerDistance`, `resolveConnectedVideoTower`

<a id="public-modules-python-pioneer-js-bridge-ts"></a>
### `public/modules/python/pioneer-js-bridge.ts`

- Исходник: [открыть файл](../../public/modules/python/pioneer-js-bridge.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 1
- Ключевые символы: `installJsRuntimeAPI`

<a id="public-modules-python-pioneer-sdk-module-ts"></a>
### `public/modules/python/pioneer-sdk-module.ts`

- Исходник: [открыть файл](../../public/modules/python/pioneer-sdk-module.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 1
- Ключевые символы: `installPioneerSdkModule`

<a id="public-modules-python-runtime-shared-ts"></a>
### `public/modules/python/runtime-shared.ts`

- Исходник: [открыть файл](../../public/modules/python/runtime-shared.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 1
- Ключевые символы: `getDroneOrDefault`

<a id="public-modules-python-runtime-ts"></a>
### `public/modules/python/runtime.ts`

- Исходник: [открыть файл](../../public/modules/python/runtime.ts)
- Кратко: Модуль Python/Pyodide-интеграции.
- Обнаружено функций/методов: 6
- Ключевые символы: `ensurePyodide`, `initPythonRuntime`, `loadScript`, `runPythonScript`, `stopPythonScript`, `validatePythonSyntax`

