# Audit: Блочный редактор (Blockly) — соответствие API документации

Срок: 2026-09-09
Область: `public/modules/editor/blockly-mode/ + public/modules/docs/`

## 1. Исходные пути

- Lua API docs: `public/modules/docs/lua-api-docs.ts`
- Python API docs: `public/modules/docs/python-api-docs.ts`
- Блочный каталог: `public/modules/editor/blockly-mode/catalog.ts`
- Блочный конструктор/упаковка workspace: `public/modules/editor/blockly-mode/workspace.ts`
- Блочное определение инструментов / toolbox, компиляция: `public/modules/editor/blockly-mode/index.ts`
- Блочные типы: `public/modules/editor/blockly-mode/types.ts`
- Блочный UI-слой (preview, размер): `public/modules/editor/blockly-mode/ui.ts`
- Запуск/редактор-рантайм: `public/modules/editor/runtime.ts`
- Поддержка (resize/preview/пустотa): `public/modules/editor/blockly/support.ts`
- Контроллеры блока: `public/modules/editor/blockly/workspace-controller.ts`, `public/modules/editor/blockly/toggle-controller.ts`, `public/modules/editor/blockly/editor.ts`
- Блокирующие типы raw-код блока: `public/modules/editor/blockly-mode/workspace.ts` (RAW_CODE_BLOCK_TYPES)

---

## 2. Что закодировано в каталоге и компиляторе (Lua)

### Lua API каталог (ресурс каталог = lua_api_docs + категоризация)

Категории, генерируемые из `catalog.ts` через `getLuaCategory`:

- AP Lua (`ap.`)
- Таймеры Lua (`Timer.`)
- Индикация Lua (`Ledbar`)
- Сенсоры Lua (`Sensors.`)
- Камера Lua (`camera.`)
- Периферия Lua (`Gpio.`, `Uart.`, `Spi.`, `mailbox.`)
- Служебные Lua (остальное)

### Lua блоки в toolbox (из listing в index.ts, список `courseBlocks`)

- `lua_ledbar_new`
- `lua_led_set`
- `lua_timer_calllater`
- `lua_print`
- `lua_ap_push`
- `lua_event_callback`
- `lua_goto_local_point`
- `lua_event_constant` (Ev.* — из `api-docs-events.ts`)

### Lua блоки из lua-api-docs (реально превращаются в блоки через buildCatalog)

Все ключи из `luaApiDocs` попадают в каталог. Значит, блоки будут для:

- `ap.push`
- `ap.goToLocalPoint`
- `ap.goToPoint`
- `ap.updateYaw`
- `Timer.callLater`
- `Timer.new`
- `Timer.start`
- `Timer.stop`
- `Timer.callAt`
- `Timer.callAtGlobal`
- `Ledbar.new`
- `Ledbar.fromHSV`
- `Ledbar:set`
- `Sensors.lpsPosition`
- `Sensors.lpsVelocity`
- `Sensors.lpsYaw`
- `Sensors.orientation`
- `Sensors.altitude`
- `Sensors.accel`
- `Sensors.gyro`
- `Sensors.rc`
- `Sensors.battery`
- `Sensors.range`
- `Sensors.tof`
- `camera.requestMakeShot`
- `camera.checkRequestShot`
- `camera.requestRecordStart`
- `camera.requestRecordStop`
- `camera.checkRequestRecord`
- `time`
- `launchTime`
- `deltaTime`
- `sleep`
- `boardNumber`
- `Gpio.new`, `Gpio.read`, `Gpio.set`, `Gpio.reset`, `Gpio.write`, `Gpio.setFunction`
- `Uart.new`, `Uart.read`, `Uart.write`, `Uart.bytesToRead`, `Uart.setBaudRate`
- `Spi.new`, `Spi.read`, `Spi.write`, `Spi.exchange`
- `mailbox.connect`, `mailbox.hasMessages`, `mailbox.myHullNumber`, `mailbox.receive`, `mailbox.send`, `mailbox.setHullNumber`
- `Ev.MCE_PREFLIGHT`, `Ev.MCE_TAKEOFF`, `Ev.MCE_LANDING`, `Ev.ENGINES_ARM`, `Ev.ENGINES_DISARM`, `Ev.TAKEOFF_COMPLETE`, `Ev.COPTER_LANDED`, `Ev.LOW_VOLTAGE1`, `Ev.LOW_VOLTAGE2`, `Ev.POINT_REACHED`, `Ev.POINT_DECELERATION`, `Ev.SYNC_START`, `Ev.SHOCK`, `Ev.CONTROL_FAIL`, `Ev.ENGINE_FAIL`

---

## 3. Несоответствия Lua: каталог vs lua-api-docs

### 3.1 Категория `LOW_VOLTAGE` → LOW_VOLTAGE1 / LOW_VOLTAGE2

В `lua-api-docs-events.ts`:

- Есть `Ev.LOW_VOLTAGE1` и `Ev.LOW_VOLTAGE2`.

В `api-docs-events.ts` (список evConstants):

- Есть `LOW_VOLTAGE`, но **нет отдельных записей для 1/2**.

Файл `api-docs-events.ts` — не источник каталога (каталог читает `lua-api-docs-*.ts`). Но этот файл используется где-то ещё; наличие в нём `LOW_VOLTAGE` и отсутствие 1/2 может приводить к неполному списку констант в местах, которые берут `evConstants`.

Влияние: если где-то публикуется Ev-константы через `api-docs-events.ts`, то там отсутствуют `LOW_VOLTAGE1`, `LOW_VOLTAGE2`.

---

### 3.2 Предупреждение: не все блоки из каталога объявлены в явном списке `courseBlocks`

В `index.ts` список `courseBlocks` содержит имена только некоторых блоков. Этот список, судя по коду, нужен для категории «Учебные блоки». Каталог же содержит блоки из всех категорий Lua из `luaApiDocs`.

Итого: многие блоки Lua существуют в toolbox, но **не** в том подсписке, который может фигурировать в документации/туториалах как «основные учебные блоки». Если есть внешний контент (документация/демо), то он может быть неackуратным относительно реального набора блоков.

---

### 3.3 Lua-блок `lua_print` использует переопределение `text_print`

В `index.ts` есть переопределение `Blockly.Blocks.text_print` и генераторы для JS/Lua/Python.

Это значит блок «Текст → печать» из стандартной категории «Текст» подменяется, и в геометрии toolbox это блок `text_print`, а не отдельный кастомный блок `lua_print`. В `courseBlocks` при этом указан `lua_print`. Это не конфликт, но может волnovывать при аудите по типам блоков.

---

### 3.4 Формат вызова для блоков без параметров: все равно может генерироваться `ap.push()`

Текущий `parseCallParts` отрезает часть после `->`, затем берёт синтаксис. Для `time()`, `sleep(sec)`, и т.п., для блоков-без-аргументов, качество `defaultArgs` и `hasArgs` может быть `hasArgs=false` и вызов `time()`. Это ок.

Но проверь: `Timer.callLater(delay, func)` → в каталоге будет `hasArgs=true`, `defaultArgs="delay, func"`. Блок с текстовым полем ARGS получит `delay, func` как подсказку. Это может быть неудобно для Func, так как func — Lua function. То есть в блоке API значение-блока может требоваться реальная функция. Сейчас это «текстовое» поле, и получится строка, а не лямбда.

Вывод: **блоки Timer.* в Blockly подходят только для декларативного вызова с параметрами-константами**, а не для передачи Lua-функций.

---

## 4. Что закодировано в каталоге и компиляторе (Python)

### Python категории (из `getPythonCategory`)

- Автопилот Python (`Pioneer.arm`, `disarm`, `takeoff`, `land`, `go_to_*`, `point_reached`, `set_manual_speed`, `get_autopilot_state`)
- Сенсоры Python (`get_local_position_lps`, `get_dist_sensor_data`, `get_battery_status`)
- Индикация Python (`led_control`)
- Управление Python (`send_rc_channels`)
- Pioneer Python (остальные `Pioneer.*`)
- Камера Python (`Camera.*`)
- Служебные Python (остальное)

### Python блоки в toolbox (из listing в index.ts)

`py_led_control`, `py_time_sleep`, `py_print`, `py_arm`, `py_disarm`, `py_takeoff`, `py_land`, `py_goto_local_point`, `py_wait_point_reached`.

### Python блоки из python-api-docs (реально превращаются в блоки)

Все ключи из `pythonApiDocs` попадают в блоки:

- `Pioneer.arm`
- `Pioneer.disarm`
- `Pioneer.takeoff`
- `Pioneer.land`
- `Pioneer.close_connection`
- `Pioneer.go_to_local_point`
- `Pioneer.go_to_local_point_body_fixed`
- `Pioneer.point_reached`
- `Pioneer.set_manual_speed`
- `Pioneer.get_local_position_lps`
- `Pioneer.get_dist_sensor_data`
- `Pioneer.get_battery_status`
- `Pioneer.get_autopilot_state`
- `Pioneer.led_control`
- `Pioneer.send_rc_channels`
- `Pioneer.lua_script_control`
- `Camera.get_frame`
- `Camera.get_cv_frame`
- `Camera.connect`
- `Camera.disconnect`
- `Camera.connected`
- `VideoStream.start`
- `VideoStream.stop`
- `VideoStream.connected`

---

## 5. Несоответствия Python: каталог vs python-api-docs

### 5.1 Python API стек вызова сильно отличается у некоторых методов

- Некоторые методы Python ожидают `get_last_received=...`, но `parseCallParts` берёт аргументы из синтаксиса (включая именованные). Это даёт `defaultArgs="get_last_received=True"` — ок.
- Однако, для `VideoStream.start/stop` синтаксис в docs: `await stream.start()`. В Blockly это превратится в `stream.start()`, без `await`. Это **отклонение от документации**. Если код будет выполняться в Python в синхронном контексте, то это может не сработать.

### 5.2 Для Python-блоков нет категории, специфичной для VideoStream

В `getPythonCategory` нет явного разбора `VideoStream.*` — попадают в «Служебные Python». Это не ошибка, но может затруднять навигацию.

### 5.3 `py_wait_point_reached` в courseBlocks vs `Pioneer.point_reached` в каталоге

В `courseBlocks` указан `py_wait_point_reached`. Каталог содержит `Pioneer.point_reached`. Это значит, что список courseBlocks содержит имя, **не совпадающее** с типом блока в каталоге (если это ложное совпадение), либо это подразумевает отдельный блок, которого нет в каталоге. Проверено: в `catalog.ts` имя типа формируется как `${language}_api_stmt_${sanitizeKey(key)}`, для `Pioneer.point_reached` → `python_api_stmt_pioneer_point_reached`.

То есть `py_wait_point_reached` — это **отсутствующий блок** (нет в каталоге). Вывод: `courseBlocks` содержит имя блока, которого нет в каталоге → toolbox не сможет его отобразить (пустой слот).

---

## 6. Специфичные выводы по ролям

- **catalog.ts**: источник категорий и список *явных* учебных блоков.
- **workspace.ts**: raw-блоки (`lua_raw_code`, `py_raw_code`), стартовый XML Lua содержит `lua_ap_push` + `lua_timer_calllater`; Python по умолчанию начинается с `createRawCodeWorkspaceXml` (сырой код).
- **index.ts**: toolbox, влияющие блоки `text_print`, компиляция.
- **lisp-style блоки**: для Lua есть `lua_event_constant` (Ev.*) из `evConstants`, но `evConstants` не содержит `LOW_VOLTAGE1`, `LOW_VOLTAGE2`.

---

## 7. Рекомендации

1. Привести `evConstants` в `api-docs-events.ts` в соответствие с `lua-api-docs-events.ts` (добавить `LOW_VOLTAGE1`, `LOW_VOLTAGE2`, `ENGINES_STARTED`, `CONTROL_FAIL`, `ENGINE_FAIL`, и т.п.). Иначе в местах использования `evConstants` список событий будет неполным.
2. Проверить и убрать из `courseBlocks` (index.ts) использование `py_wait_point_reached`, заменить на корректный тип `python_api_stmt_pioneer_point_reached`, либо добавить такой блок явно.
3. Для `VideoStream.start/stop` решить вопрос `await`: либо изменить docs-синтаксис, либо учесть в генерации Python (но генератор общий, и `await` ломает Lua). Лучше явно не включать асинхронные блоки в Blockly без поддержки корутин.
4. Для `Timer.*` блоков (Lua) документировать ограничение: ARGS — текстовое поле, не создаёт Lua-функции.
5. Обновить пользовательские материалы, где указаны «основные блоки», потому что лабораторный набор сейчас шире, чем список `courseBlocks`.

---

## 8. Итог

- Lua: каталог почти полный относительно `lua-api-docs`. Основные расхождения в Ev-константах (справочник `evConstants`), и в наличии `py_wait_point_reached`-подобного несовпадения только для Python.
- Python: расхождение в `py_wait_point_reached` (нет блока), асинхронность `VideoStream` и отсутствие явной категории.
