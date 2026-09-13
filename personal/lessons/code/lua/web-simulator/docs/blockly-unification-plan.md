# План: единый Blockly с генерацией в Lua и Python

Дата: 2026-09-13
Статус: к реализации
Исполнитель: Sonnet (код), владелец решений: Сергей

---

## 0. Суть задачи

Сейчас в редакторе два независимых набора блоков: `lua_*` и `python`/`py_*`. У них разные тулбоксы, разное хранение workspace и разная семантика одинаковых действий. Нужен **один набор блоков дрона**, из которого генерируется корректный код для любого из двух таргетов: Lua (Pioneer autopilot) или Python (pioneer_sdk).

Blockly это поддерживает изначально: определение блока (`Blockly.Blocks[type]`) не зависит от языка, генераторов у блока может быть сколько угодно (`luaGenerator.forBlock[type]`, `pythonGenerator.forBlock[type]`). Стандартные блоки (`controls_*`, `math_*`, `logic_*`, переменные, функции) уже так работают, их не трогаем.

---

## 1. Зафиксированные решения (не пересматривать без владельца)

1. **Один набор блоков `pioneer_*`**, у каждого блока два генератора или явная пометка «не поддерживается таргетом».
2. **Модель программы для ученика — последовательная.** Блоки «Взлететь», «Лететь в точку» и «Ждать N сек» блокирующие: следующий блок выполняется, когда действие завершилось.
3. **[РЕШЕНИЕ ПЕРЕСМОТРЕНО 2026-09-13, см. §2.1] Lua-таргет реализует последовательность через конечный автомат (FSM) с таблицей состояний**, как в официальных примерах Geoskan и в генераторе TRIK Studio: тело программы разбивается на именованные состояния (`action[state] = function() ... end`), переход между ними делает сам блок (`curr_state = "..."`), `callback(event)` вызывает `action[curr_state]()` при подходящем событии, ожидание времени — через `Timer.callLater`, а не `sleep`. Корутина не используется вообще. Бывший «План Б» из §8 стал основным планом; описание FSM-рантайма — §4.3. Ограничение то же: ожидание внутри `if` поддерживается, внутри циклов (`controls_repeat_ext`, `controls_whileUntil`, `controls_for`) — нет, такой блок отключается с предупреждением.
4. **Python-таргет** выдаёт прямой последовательный код с ожиданием через опрос (`point_reached()`, `get_autopilot_state()`) и `time.sleep`.
5. **Единицы и индексация хранятся в блоке одинаково для обоих таргетов**, пересчёт делает генератор:
   - цвет: 0..255;
   - угол в блоках: градусы, в API обоих таргетов уходит в радианах;
   - номер светодиода: как в API, с 0;
   - компоненты координат выбираются дропдауном X/Y/Z, а не числовым индексом.
6. **Блоки только для одного таргета** (события в Lua, ручная скорость в Python и т.п.) остаются в общем тулбоксе. В режиме, где блок не поддерживается, он неактивен (`setDisabledReason`) и показывает предупреждение «Недоступно в Lua/Python». Такой блок ничего не генерирует.
7. **Workspace Blockly один на дрона** (ключ не зависит от языка). Язык — только выбор таргета компиляции.
8. **Промежуточный AST/IR не вводим.** Генераторы Blockly работают напрямую.
9. **Сырой код в блоках не разрешаем:** никаких текстовых полей с аргументами (как в старом `catalog.ts`).
10. **Рантаймы симулятора** (`public/modules/lua/*`, `public/modules/python/*`) не меняем. Если сгенерированному коду нужна правка рантайма, остановись и спроси владельца.

---

## 2.1 Пересмотр решения о корутине (2026-09-13)

Владелец предоставил официальную документацию Geoskan по Lua API и реальные примеры скриптов (свои и из TRIK Studio, `C:\TRIKStudio\examples\pioneer`). Выводы:

- Официальная документация прямым текстом не рекомендует `sleep`: «Останавливает выполнение скрипта на заданное время... **Рекомендуется использовать Timer**, так как sleep блокирует дальнейшее выполнение скрипта.»
- **Ни один официальный пример Geoskan и ни один пример TRIK Studio не использует `coroutine`.** Все построены на одном и том же паттерне: глобальная переменная состояния (счётчик или строка), функция-шаг, которая делает одно действие и переключает состояние, и `callback(event)`, вызывающий текущий шаг по событию. Ожидание времени — всегда `Timer.callLater`/`Timer.new`, никогда `sleep` внутри пошаговой логики.
- Пример из TRIK Studio для линейной программы «взлёт → точка → точка → посадка» (сохранён как референс ниже) — это именованная таблица состояний `action["_STATE_NAME"] = function() ... curr_state = "_NEXT_STATE" end`, `callback` вызывает `action[curr_state]()`.
- Вывод: **корутинный подход (бывший §1 п.3, §4.3) не имеет прецедента ни в одном реальном скрипте и официально не рекомендуется** (использование вложенной пользовательской корутины нигде не документировано и не встречается). FSM-подход из бывшего «Плана Б» (§8), наоборot, это ровно то, что генерирует официальный инструмент блочного программирования (TRIK Studio) и то, что пишут вручную. Решение: **делаем FSM основным и единственным Lua-подходом**, Фаза 0 (тест корутин на реальном дроне) больше не требуется как условие для продолжения — можно оставить её на будущее как необязательную проверку производительности FSM-скриптов, но не как блокер.
- Референс из официальных примеров, подтверждающий и остальные факты §2 (`ap.push`, `ap.goToLocalPoint(x,y,z,[time])`, `ap.updateYaw(angle)` в радианах, `Ledbar.new`/`leds:set(num,r,g,b)` цвет 0..1, `Sensors.lpsPosition()` → `x,y,z`, `Timer.callLater(delay, func)`, максимум 16 одновременно ожидающих таймеров — учитывать при генерации, у нас на один активный шаг обычно не больше 1-2 таймеров, но проверить сценарий с несколькими активными ожиданиями).

Референсный пример (адаптирован из TRIK Studio, дрон Geoskan Pioneer Base):

```lua
local curr_state = "_GEO_TAKEOFF_1"

action = {
    ["_GEO_TAKEOFF_1"] = function ()
        ap.push(Ev.MCE_PREFLIGHT)
        sleep(2) -- допустимо на верхнем уровне (не внутри пользовательской корутины)
        ap.push(Ev.MCE_TAKEOFF)
        curr_state = "_GO_TO_POINT_1"
    end,
    ["_GO_TO_POINT_1"] = function ()
        ap.goToLocalPoint(1, 1, 1)
        curr_state = "_GO_TO_POINT_2"
    end,
    ["_GO_TO_POINT_2"] = function ()
        ap.goToLocalPoint(0, 0, 1)
        curr_state = "_GEO_LANDING_1"
    end,
    ["_GEO_LANDING_1"] = function ()
        ap.push(Ev.MCE_LANDING)
        curr_state = "_FINAL_NODE_1"
    end,
    ["_FINAL_NODE_1"] = function ()
        ap.push(Ev.ENGINES_DISARM)
        curr_state = "NONE"
    end,
}

function callback(event)
    if event == Ev.TAKEOFF_COMPLETE then action[curr_state]() end
    if event == Ev.POINT_REACHED then action[curr_state]() end
    if event == Ev.COPTER_LANDED then sleep(2); action[curr_state]() end
end

action[curr_state]()
```

Даже здесь `sleep(2)` используется внутри шага верхнего уровня — официальная рекомендация против `sleep` касается длинных ожиданий (это блокирует весь скрипт на это время, включая обработку `callback`), а не одиночных коротких пауз. Для генератора блоков `pioneer_wait` безопаснее и последовательнее с рекомендацией всё равно использовать `Timer.callLater` (см. §4.3), а не голый `sleep`.

## 2.2 Единицы цвета в Python `led_control` (2026-09-13)

Владелец также сверил Python-часть с `pioneer-python-example` на GitFlic (`gitflic.ru/project/geoscan-llc/pioneer-python-example`). Обнаружено и исправлено расхождение: реальный `pioneer_sdk.led_control(r, g, b)` принимает **0..1** (во всех официальных примерах — дробные значения вроде `r=0.1`), а наш симулятор внутри исторически ждал **0..255** (`pioneer_led_control` в `pioneer-js-bridge.ts` передавал r/g/b без масштабирования дальше в `d.leds`, а рендер и Lua-мост уже были на 0..255 — см. `lua/leds.ts`, `drone-model/index.ts`). Исправлено: `pioneer_led_control` теперь умножает входящие r/g/b на 255 (как уже делал Lua-мост), а все Python-генераторы цвета (старые sdk2-блоки `led_all`/`led_index`, новые `pioneer_led_all`/`pioneer_led_index`) делят на 255 перед вызовом. Обновлена и документация в `python-api-docs.ts`.

**Не исправлено намеренно (отдельная задача, вне этой ветки):** блок `py_led_control` (сырые текстовые поля, урок «как есть») и текстовый контент уроков/curriculum в `public/modules/ui/mission-guide/**`, где `led_control(r=255, ...)` фигурирует как «правильный» пример — это большая правка учебного контента, не связанная с унификацией Blockly.

---

## 2. Проверенные факты о рантаймах (не перепроверять заново)

### Lua (симулятор, Fengari)
- `luaL_openlibs` вызывается ([bridge.ts:96](../public/modules/lua/bridge.ts)), поэтому `coroutine`, `math`, `string`, `table` доступны.
- Главный чанк выполняется в отдельном потоке через `runCoroutine` ([runtime.ts:67-72](../public/modules/lua/runtime.ts)). `callback(event)` вызывается через `lua_getglobal('callback')` ([runtime.ts:146-152](../public/modules/lua/runtime.ts)). Колбэки `Timer.callLater` запускаются в новом потоке ([runtime.ts:107-115](../public/modules/lua/runtime.ts)).
- **`sleep(t)` в симуляторе реализован через `lua_yield` текущего потока** ([timers.ts:99-117](../public/modules/lua/timers.ts)). Вызов внутри пользовательской корутины сломает механику возобновления. **В генерируемом Lua-коде `sleep` не используем**, ждём только через `Timer.callLater` + `coroutine.yield`.
- `Timer.callLater(delay, fn)` проверяет, что `fn` — функция ([setup-script.ts:202-207](../public/modules/lua/setup-script.ts)).
- Функций `ap.point_reached`, `ap.setManualSpeed`, `ap.goToLocalPointBodyFixed` и `task.wait` в рантайме **нет**.
- API из [lua-api-docs-flight.ts](../public/modules/docs/lua-api-docs-flight.ts):
  - `ap.goToLocalPoint(x, y, z, [time])`
  - `ap.updateYaw(angle)`, угол в радианах
  - `Ledbar.new(count)`
  - `leds:set(index, r, g, b, [w])`: index 0..N-1, цвет 0..1
  - `Sensors.lpsPosition()` возвращает **три значения** `x, y, z`, а не таблицу
  - `Sensors.range()` возвращает метры
  - `Sensors.battery()` возвращает вольты
  - `time()` — секунды с включения
- Направления событий: [lua-api-docs-events.ts](../public/modules/docs/lua-api-docs-events.ts), поле `direction`.
  - В автопилот (`to-autopilot`): `MCE_PREFLIGHT`, `MCE_TAKEOFF`, `MCE_LANDING`, `ENGINES_ARM`, `ENGINES_DISARM`.
  - От автопилота (`from-autopilot`): `TAKEOFF_COMPLETE`, `COPTER_LANDED`, `LOW_VOLTAGE1/2`, `POINT_REACHED`, `ENGINES_STARTED`, `POINT_DECELERATION`, `SYNC_START`, `SHOCK`, `CONTROL_FAIL`, `ENGINE_FAIL`.
- Mission guard пропускает все команды, если в скрипте есть `function callback(` ([mission-guard.ts](../public/modules/lua/mission-guard.ts)).
- Статический анализатор [lua-validation.ts](../public/modules/app/script-execution-notice/lua-validation.ts) показывает уведомления перед запуском. Он делит сценарий на «шаги» по `sleep(`, поэтому на корутинном коде даст ложное «несколько команд миссии в одном шаге». Это надо поправить в фазе 7.

### Python (симулятор, Pyodide)
- Класс `Pioneer` находится в [pioneer-sdk-module.ts:151-223](../public/modules/python/pioneer-sdk-module.ts). Методы:
  - `arm`, `disarm`, `takeoff`, `land`
  - `go_to_local_point(x, y, z, yaw=None)`, `go_to_local_point_body_fixed`
  - `point_reached`
  - `set_manual_speed`, `set_manual_speed_body_fixed`
  - `get_local_position_lps`, `get_dist_sensor_data`, `get_battery_status`, `get_autopilot_state`
  - `led_control(led_id=255, r, g, b)`
  - `send_rc_channels`, `lua_script_control`, `close_connection`
- Методов `set_yaw`, `update_yaw`, `get_local_velocity_lps`, `get_global_position_gps`, `get_ranger_data`, `go_to_point`, `grab_open`, `grab_close` в SDK **нет**.
- **Все команды неблокирующие**: они сразу возвращают `bool`. Ждать нужно в сгенерированном коде.
- `go_to_local_point(..., yaw=None)` сохраняет текущий целевой курс ([pioneer-js-bridge.ts:125-134](../public/modules/python/pioneer-js-bridge.ts)). Курс хранится в `d.target_yaw`, это то же поле, что у Lua `ap.updateYaw`, то есть в радианах.
- Маппинг состояний `get_autopilot_state()` находится в [pioneer-js-bridge.ts](../public/modules/python/pioneer-js-bridge.ts) около строки 205 (например, `TAKEOFF_PROCESS` → `'TAKEOFF'`). Условия для `takeoff` смотри в строках 107-112.
- Перед работой с `time.sleep` в Pyodide прочитай [docs/debug/python-page-freeze.md](debug/python-page-freeze.md) и [docs/debug/blockly-sleep-nameerror.md](debug/blockly-sleep-nameerror.md).

### Редактор
- Workspace сохраняется по ключу `${droneId}:${language}` ([dom.ts:24](../public/modules/editor/dom.ts)) в `localStorage['geoskan_editor_session_v1']` ([session.ts](../public/modules/editor/index/session.ts)).
- **Баг:** в [workspace-controller.ts](../public/modules/editor/blockly/workspace-controller.ts) обработчик `addChangeListener` замыкает `language` из первого вызова `ensureBlocklyWorkspace`. После смены языка правки сохраняются под старым ключом и компилируются старым генератором.
- Тесты Blockly headless: `new Blockly.Workspace()` + `workspaceToCode`. Образец с «прогревом» динамических импортов для Jest — [tests/blockly-codegen.test.ts:50-61](../tests/blockly-codegen.test.ts).
- Команды: `npm test`, `npm run type-check`, `npm run lint`. У lint порог `--max-warnings=627`, новых предупреждений не добавлять.

---

## 3. Известные дефекты текущей реализации

Эти дефекты не чиним точечно: они исчезают вместе со старыми блоками. Они нужны как регрессионные примеры для контрактного теста (фаза 1).

| Где | Что |
|---|---|
| [lua-definitions.ts:221](../public/modules/editor/blockly-mode/lua-definitions.ts) | `task.wait` и `ap.point_reached()` не существуют, а `while` блокирует событийный Lua |
| lua-definitions.ts:71, :287, :311 | `ap.goToLocalPointBodyFixed`, `ap.setManualSpeed`, `ap.setManualSpeedBodyFixed` не существуют |
| lua-definitions.ts:421-425 | `[0, 0, 0][0]`: синтаксическая ошибка в Lua |
| lua-definitions.ts:331-354 | цвет приходит как Python-кортеж `(255, 0, 0)`, а у `colour_picker` нет Lua-генератора |
| lua-definitions.ts:517 | value-блок возвращает строку вместо `[code, order]` |
| [pioneer-sdk2-definitions.ts:136](../public/modules/editor/blockly-mode/pioneer-sdk2-definitions.ts) | `pioneer.set_yaw()` не существует; подпись «в градусах» |
| pioneer-sdk2-definitions.ts:138 | подпись «Достигнута точка», а код `not pioneer.point_reached()` |
| [teaching-python-definitions.ts:484-499](../public/modules/editor/blockly-mode/teaching-python-definitions.ts) | алиасы `py_*` скопированы до переопределения в sdk2, поэтому уроки и тулбокс генерируют разный код |
| index.ts:568-603, catalog.ts | около 80 блоков с текстовым полем ARGS, ни один не попадает в тулбокс (мёртвый код) |
| workspace.ts:8-9, 58-62 | блоки `lua_raw_code`/`py_raw_code` нигде не определены; тернарный оператор с одинаковыми ветками |
| teaching-lua-definitions.ts vs lua-definitions.ts | одни и те же блоки регистрируются дважды, какая версия победит, решает порядок импорта |

---

## 4. Целевая архитектура

```
public/modules/editor/blockly-mode/
  pioneer/
    registry.ts          ← definePioneerBlock(), список блоков, поддержка таргетов
    blocks/
      program.ts         ← pioneer_start
      flight.ts          ← preflight / takeoff / go_to / set_yaw / land / disarm / set_manual_speed
      time.ts            ← wait / time
      leds.ts            ← led_all / led_index / colour_preset / colour_rgb
      sensors.ts         ← position / distance / battery
      events.ts          ← on_event (Lua)
    targets/
      types.ts           ← PioneerTarget = 'lua' | 'python'
      lua-runtime.ts     ← строковый пролог: корутина, __wait_event, __wait_seconds, LED-хелперы
      python-runtime.ts  ← строковый пролог: импорты, Pioneer(), _pioneer_wait_*, _pioneer_led, _pioneer_position
      compile.ts         ← compilePioneerWorkspace(workspace, target): string
    toolbox.ts           ← единый тулбокс (XML или JSON) с shadow-значениями
    legacy-map.ts        ← конвертация старых XML (lua_* / py_* / sdk2) в pioneer_*
  blockly-core.ts        ← остаётся: локаль, text_print, init
  loader.ts              ← остаётся
  index.ts               ← тонкий фасад: ensureEditorBlocklyDefinitions / buildMainEditorToolbox / compileMainEditorWorkspace
```

### 4.1 Контракт регистрации

```ts
type PioneerTarget = 'lua' | 'python';

type PioneerBlockSpec = {
    type: `pioneer_${string}`;
    category: 'program' | 'flight' | 'time' | 'leds' | 'sensors' | 'events';
    init: (this: Blockly.Block) => void;              // только внешний вид и типы входов
    targets: Partial<Record<PioneerTarget, (block: Blockly.Block, gen: Blockly.CodeGenerator) => string | [string, number]>>;
    // Идентификаторы API, которые генератор имеет право вызывать (для контрактного теста)
    apiUsage?: Partial<Record<PioneerTarget, string[]>>;
};

export function definePioneerBlock(spec: PioneerBlockSpec): void;
export function isBlockSupported(type: string, target: PioneerTarget): boolean;
export function getPioneerBlockTypes(): string[];
```

`definePioneerBlock` регистрирует `Blockly.Blocks[type]` и `luaGenerator.forBlock[type]` / `pythonGenerator.forBlock[type]` для тех таргетов, что указаны в `targets`. Для остальных регистрирует генератор-заглушку: он возвращает `''`, а для value-блока `['nil'/'None', ORDER_ATOMIC]`. Реально такой блок будет отключён.

### 4.2 Компиляция

`compilePioneerWorkspace(workspace, target)`:
1. `generator.init(workspace)`.
2. Берёт **только** цепочку под `pioneer_start` (если блоков `pioneer_start` несколько, используется первый, остальные получают предупреждение) и все `pioneer_on_event`. Прочие верхнеуровневые блоки: определения функций (`procedures_def*`) генерируются как обычно, остальные блоки-сироты игнорируются и получают `setWarningText('Блок не подключён к «Начало программы»')`.
3. Собирает итоговый текст: пролог таргета + `generator.finish()` (definitions_) + тело.
4. Первая строка результата — маркер `-- @pioneer-blockly v1` или `# @pioneer-blockly v1`.

**Защита от зависания в циклах:**
- Lua: **[пересмотрено 2026-09-13]** блоков-ожиданий внутри циклов больше не будет (см. §4.3) — то есть цикл в сгенерированном коде исполняется как обычный синхронный Lua-цикл внутри одного сегмента `action[...]`, без yield/паузы. Настоящий бесконечный цикл (`while true do end` без выхода) в Fengari подвесит вкладку так же, как подвесил бы в любом ручном Lua-скрипте — это не специфика Blockly. `luaGenerator.INFINITE_LOOP_TRAP = '__loop_guard()\n'`, где `__loop_guard()` — счётчик итераций (или проверка `time() - __t0`), кидающий `error(...)` при превышении разумного предела. Это защита от зависания, а не механизм ожидания.
- Python: `pythonGenerator.INFINITE_LOOP_TRAP = 'time.sleep(0.01)\n'`.
- Ловушку устанавливать только на время `compilePioneerWorkspace` и восстанавливать после, чтобы не задеть сторонние вызовы генераторов (например, тесты стандартных блоков).

### 4.3 Lua-пролог: конечный автомат по состояниям (эталон; менять только с обоснованием)

**Пересмотрено 2026-09-13, см. §2.1** — вместо вложенной корутины используется FSM-таблица состояний, как в официальных примерах Geoskan и в генераторе TRIK Studio. Каждый блок-ожидание (`preflight`, `takeoff`, `go_to`, `land`, `wait`) — это граница состояния: код *до* него в текущей ветке дописывается в текущее состояние, сам блок завершает состояние переходом (`curr_state = "<следующее>"`), а событие/таймер, которых он ждёт, вызывает `action[curr_state]()` дальше.

```lua
-- @pioneer-blockly v1
local __state = "__s0"
local __t0 = time()

local action = {}
-- (definitions_: пользовательские функции и LED/position-хелперы, только если используются)
-- local leds = Ledbar.new(29)
-- local function __led_set(i, c) leds:set(i, c[1] / 255, c[2] / 255, c[3] / 255) end
-- local function __led_all(c) for i = 0, 28 do __led_set(i, c) end end

action["__s0"] = function()
    -- тело до первого блока-ожидания
end
-- ... остальные состояния, по одному на каждый блок-ожидание ...

local function __advance()
    local fn = action[__state]
    if fn ~= nil then fn() end
end

function callback(event)
    -- ветки pioneer_on_event: if event == Ev.SHOCK then ... end (не двигают __state)
    -- ветки, сгенерированные блоками-ожиданиями: if __state == "__sN" and event == Ev.X then __state = "__sN+1"; __advance() end
end

__advance()
```

Конкретное соответствие блок → состояние/переход генерирует `compilePioneerWorkspace`: обходя цепочку под `pioneer_start`, генератор режет её на сегменты по каждому блоку-ожиданию, печатает сегмент как `action["__sN"] = function() <код сегмента без блока ожидания> <вызов события/таймера, которого блок ждёт> end`, а условие возобновления (`if __state == "__sN" and event == Ev.X then __state = "__sN+1"; __advance() end` или для `pioneer_wait` — `Timer.callLater(t, function() if __state == "__sN" then __state = "__sN+1"; __advance() end end)`, вызванный прямо в сегменте) добавляет в `callback`/в тело сегмента соответственно. Имена состояний — генерируемые (`__s0`, `__s1`, ...), а не по смыслу блока (в отличие от примера TRIK), чтобы не зависеть от количества блоков одного типа.

**Ограничение (реализовано 2026-09-14, уже, чем задумывалось в §8):** блок-ожидание внутри `controls_repeat_ext`/`controls_whileUntil`/`controls_for` **не поддерживается** — отключается (`wait_in_loop`) с предупреждением «В Lua ожидание внутри цикла не поддерживается». Блок-ожидание внутри `controls_if`/`controls_ifelse` **тоже не реализовано** и отключается (`wait_in_conditional`) — корректное разбиение обеих веток на FSM-сегменты со сходящимся «состоянием после `if`» это отдельная компиляторная задача, которую сознательно отложили, а не сделали приблизительно. Блок-ожидание внутри пользовательской функции (`procedures_defnoreturn`/`defreturn`) **тоже не проверяется и не отключается** — известный пробел, оставлен как есть (см. отчёт реализации в git-истории ветки `feature/unified-blockly`, коммит `f4a817d` и предыдущий).

Правило по событиям: блоки ожидания **нельзя** ставить внутрь `pioneer_on_event` — там нет отдельного `__state`-сегмента, это просто побочная ветка в `callback`. В `onchange` блока-ожидания проверяй предков; если блок внутри `pioneer_on_event`, отключай его (`setDisabledReason(true, 'wait_in_event')`) и показывай предупреждение.

### 4.4 Python-пролог (эталон)

**[пересмотрено 2026-09-14]** Первоначальный набросок ниже держал четыре именованные обёртки ожидания (`_pioneer_wait_armed`/`_takeoff`/`_landed`/`_point`), `import math` и `_pioneer_t0 = time.time()` в фиксированном прологе — они печатались в КАЖДОЙ программе, даже когда на холсте нет ни одного блока, которому это нужно (например, программа «моторы → взлёт → посадка» без единого `pioneer_go_to`/`pioneer_set_yaw`/`pioneer_time` всё равно тащила за собой `_pioneer_wait_point`, `import math` и точку отсчёта времени). Это и была основная жалоба владельца: генерируемый код выглядел пугающе многословным по сравнению с официальными примерами Geoskan.

Фактическая реализация: общий опрос-примитив остался один — `_pioneer_wait(condition, timeout, message)`, — но он попадает в `headerDefinitions` (через `generator.definitions_`, как LED/position-хелперы, `blocks/leds.ts`/`blocks/sensors.ts`) только если хотя бы один блок полёта (`pioneer_preflight`/`pioneer_takeoff`/`pioneer_go_to`/`pioneer_set_yaw`/`pioneer_land`) реально на холсте. Конкретное условие/таймаут/сообщение (`ARMED`/15с, `MISSION`/30с, `DISARMED`/30с, `point_reached`/60с) каждый такой блок подставляет **инлайн** прямо в месте вызова (`blocks/flight.ts`), а не через отдельную именованную функцию. `import math` и `_pioneer_t0 = time.time()` — тем же приёмом: первое ставит `pioneer_set_yaw`/`pioneer_set_manual_speed` (ключ `import_math`, тот же, каким сама `pythonGenerator` помечает свои условные импорты — см. `math_number`/`math_atan2`/`math_random_int` в `generators/python`), второе — `pioneer_time` (`blocks/time.ts`).

```python
# @pioneer-blockly v1
from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

def _pioneer_wait(condition, timeout, message):
    started = time.time()
    while not condition():
        if time.time() - started > timeout:
            raise RuntimeError(message)
        time.sleep(0.05)

# ... тело pioneer_start: инлайн-вызовы _pioneer_wait(...) с условием по
# pioneer.get_autopilot_state() (маппинг — pioneer-js-bridge.ts, ~стр. 205)
# или pioneer.point_reached; import math / _pioneer_t0 / _pioneer_led /
# _pioneer_position — через definitions_, только при использовании ...

pioneer.close_connection()
```

---

## 5. Каталог блоков v1

Входы `Number` в тулбоксе всегда получают `<shadow type="math_number">` со значением по умолчанию.

| type | Вид для ученика | Lua | Python | Таргеты |
|---|---|---|---|---|
| `pioneer_start` | hat «Начало программы», неудаляемый | тело `__main` | тело скрипта | оба |
| `pioneer_preflight` | «Запустить моторы» | `ap.push(Ev.MCE_PREFLIGHT)`<br>`__wait_event(Ev.ENGINES_STARTED)` | `pioneer.arm()`<br>`_pioneer_wait(lambda: ...get_autopilot_state() == 'ARMED', 15, ...)` | оба |
| `pioneer_takeoff` | «Взлететь» | `ap.push(Ev.MCE_TAKEOFF)`<br>`__wait_event(Ev.TAKEOFF_COMPLETE)` | `pioneer.takeoff()`<br>`_pioneer_wait(lambda: ...get_autopilot_state() == 'MISSION', 30, ...)` | оба |
| `pioneer_go_to` | «Лететь в точку X [] Y [] Z [] м» | `ap.goToLocalPoint(x, y, z)`<br>`__wait_event(Ev.POINT_REACHED)` | `pioneer.go_to_local_point(x=x, y=y, z=z)`<br>`_pioneer_wait(pioneer.point_reached, 60, ...)` | оба |
| `pioneer_set_yaw` | «Повернуться на курс [] °» | `ap.updateYaw(math.rad(a))` | `_pioneer_set_yaw(math.radians(a))`: `go_to_local_point` в текущие координаты с `yaw`, затем ожидание точки через `_pioneer_wait` | оба (**проверить в симуляторе**, что поведение совпадает) |
| `pioneer_land` | «Приземлиться» | `ap.push(Ev.MCE_LANDING)`<br>`__wait_event(Ev.COPTER_LANDED)` | `pioneer.land()`<br>`_pioneer_wait(lambda: ...get_autopilot_state() == 'DISARMED', 30, ...)` | оба |
| `pioneer_disarm` | «Выключить моторы» | `ap.push(Ev.ENGINES_DISARM)` | `pioneer.disarm()` | оба |
| `pioneer_set_manual_speed` | «Скорость Vx [] Vy [] Vz [] м/с, поворот [] °/с» | — | `pioneer.set_manual_speed(vx, vy, vz, math.radians(r))` | только Python |
| `pioneer_wait` | «Ждать [] сек» | `__wait_seconds(t)` | `time.sleep(t)` | оба |
| `pioneer_time` | value «Секунд с начала программы» | `(time() - __t0)` | `(time.time() - _pioneer_t0)` | оба |
| `pioneer_colour_preset` | value, дропдаун: красный/зелёный/синий/жёлтый/белый/выключен | `{255, 0, 0}` | `(255, 0, 0)` | оба |
| `pioneer_colour_rgb` | value «R [] G [] B []» (0..255) | `{r, g, b}` | `(r, g, b)` | оба |
| `pioneer_led_all` | «Все светодиоды: цвет [колор]» | `__led_all(c)` | `_pioneer_led(255, c)` | оба |
| `pioneer_led_index` | «Светодиод № [] цвет [колор]» | `__led_set(n, c)` | `_pioneer_led(n, c)` | оба (**проверить** диапазон `led_id` в `pioneer_led_control` моста) |
| `pioneer_position` | value «Координата [X/Y/Z], м» | `(select(k, Sensors.lpsPosition()))`, где k=1..3 | `_pioneer_position(k-1)`: ждёт данных до 1 с, иначе `RuntimeError` с русским текстом | оба |
| `pioneer_distance` | value «Дальномер, м» | `Sensors.range()` | `pioneer.get_dist_sensor_data()` | оба |
| `pioneer_battery` | value «Батарея, В» | `Sensors.battery()` | `pioneer.get_battery_status()` | оба |
| `pioneer_on_event` | hat «Когда событие [дропдаун from-autopilot с русскими подписями из `luaApiEventLabels`]» | ветка `if event == Ev.X then ... end` в `callback` | — | только Lua |

Типы выходов: цвет — `'PioneerColour'`, числа — `'Number'`. Входы цвета проверяют `'PioneerColour'`, чтобы переменная тоже подходила; соединение по `null`-типу переменной Blockly разрешит.

Стандартные блоки остаются как есть: `controls_*`, `logic_*`, `math_*`, `text`, `text_print`, переменные, функции.

**Вне скоупа v1**, но зафиксировать в бэклоге в конце этого файла при завершении: камера и видеопоток (Python), CV/ИИ-блоки из `pioneer-sdk2-definitions.ts` (вызывают несуществующие функции), GPIO/UART/SPI/mailbox (Lua), `go_to_local_point_body_fixed`, `send_rc_channels`, `lua_script_control`.

---

## 6. Фазы

Каждая фаза — отдельный коммит (или несколько) в ветке `feature/unified-blockly`. После каждой фазы должны проходить `npm test`, `npm run type-check` и `npm run lint`. Старые блоки не удалять до фазы 9: до этого момента обе системы живут параллельно, а новая включается в фазе 7.

### Фаза 0. Проверка корутин на реальном Пионере — [ОТМЕНЕНА/НЕОБЯЗАТЕЛЬНА, см. §2.1]

**Решение от 2026-09-13:** Lua-таргет больше не использует корутины (см. §1 п.3, §2.1, §4.3), поэтому эта фаза перестала быть условием для продолжения. Скрипт ниже сохранён как документация того, что проверялось и почему от подхода отказались — гонять его на реальном дроне не обязательно. Если Сергей всё же хочет запустить его для общего интереса (проверить, что корутины на автопилоте вообще есть/работают), это ни на что в плане не влияет.

Проверку (если будет делаться) выполняет Сергей на реальном дроне. Скрипт:

```lua
local leds = Ledbar.new(4)   -- бортовые светодиоды; с LED-модулем поставить 29
local function paint(r, g, b) for i = 0, 3 do leds:set(i, r, g, b) end end

local co
local function resume() local ok, err = coroutine.resume(co); if not ok then print(err) end end

co = coroutine.create(function()
    paint(1, 0, 0)                  -- красный
    Timer.callLater(2, resume); coroutine.yield()
    paint(0, 1, 0)                  -- зелёный через 2 с
    Timer.callLater(2, resume); coroutine.yield()
    paint(0, 0, math.rad(180) / math.pi)  -- синий: проверка math
end)

function callback(event) end
resume()
```

**Ожидается:** красный → через 2 с зелёный → через 2 с синий.
- Если так и есть: план в силе.
- Если нет: работаем по плану Б (§8). Фазы 1–3 от результата не зависят, их можно начинать сразу.

### Фаза 1. Контрактные тесты (сначала красные)

Файл: `tests/pioneer-blockly-contract.test.ts`.

1. **Белый список API.** Для каждого `type` из `getPioneerBlockTypes()` и каждого поддерживаемого таргета: создать блок, заполнить числовые входы `math_number`, цветовые — `pioneer_colour_preset`, сгенерировать код через `compilePioneerWorkspace`. Затем извлечь все вызовы регэкспом `/\b([A-Za-z_][\w]*(?:[.:][A-Za-z_]\w*)*)\s*\(/g` и сверить каждый с разрешённым набором:
   - **Lua:** ключи `luaApiDocs`, с нормализацией `Ledbar:set` → `leds:set`; стандартная библиотека `print`, `error`, `select`, `tostring`, `math.*`; хелперы `__*`; имена пользовательских функций. **[пересмотрено 2026-09-13]** `coroutine.*` из белого списка убрать — FSM-подход (§2.1, §4.3) корутины не использует.
   - **Python:** `pioneer.<m>`, где `m` ищется регэкспом `def (\w+)` внутри `class Pioneer` в исходнике [pioneer-sdk-module.ts](../public/modules/python/pioneer-sdk-module.ts); `time.sleep`, `time.time`, `math.*`, `print`, `RuntimeError`; хелперы `_pioneer_*`; `Pioneer`, `condition`.
2. **Покрытие таргетов.** Каждый блок из тулбокса зарегистрирован в `Blockly.Blocks` и имеет генератор для каждого таргета из `targets`. Блоки без генератора для таргета отмечаются `isBlockSupported(type, target) === false`.
3. **Синтаксис Lua.** Посмотри, как в `tests/` уже поднимается Fengari (`grep -rl fengari tests`). Если в Node это возможно, скомпилируй каждый сгенерированный Lua-скрипт через `luaL_loadstring` без выполнения и проверь, что ошибок нет. Если Fengari в Jest не поднимается, опиши причину в PR и пропусти пункт.
4. **Регрессии.** Вручную собрать минимальные программы из старых блоков `lua_waiting_for_point`, `lua_get_pv_by_index` и `update_yaw` и прогнать через тот же белый список, с пометкой `test.failing` или отдельным `describe('legacy (ожидаемо падает)')`. Это доказательство, что тест ловит реальные дефекты. После фазы 9 эти тесты удалить.

**Приёмка:** тесты написаны, падают из-за отсутствия реализации, а легаси-тесты показывают найденные дефекты.

### Фаза 2. Инфраструктура

1. Создать `pioneer/registry.ts`, `pioneer/targets/types.ts`, `pioneer/targets/compile.ts` по контракту §4.1–4.2.
2. Создать `pioneer/toolbox.ts`: единый XML-тулбокс; категории «Программа», «Полёт», «Время», «Светодиоды», «Датчики», «События», затем стандартные «Логика», «Циклы», «Числа», «Текст», «Переменные», «Функции». Формат shadow-блоков взять из стандартного Blockly.
3. Подключить регистрацию в `ensureEditorBlocklyDefinitions()` ([index.ts](../public/modules/editor/blockly-mode/index.ts)) **рядом** со старой, без удаления.
4. Пока новый тулбокс в UI не включается: только через экспорт `buildPioneerToolbox()`.
5. **Попутно исправить баг замыкания языка** в [workspace-controller.ts](../public/modules/editor/blockly/workspace-controller.ts): обработчик изменений должен брать актуальный язык (передать геттер `getCurrentLanguage()` в контроллер вместо захвата параметра). Добавить тест: создать workspace для `lua`, вызвать `ensureBlocklyWorkspace` для `python`, изменить блок и проверить, что сохранилось под python-ключом и скомпилировалось Python-генератором.

**Приёмка:** `compilePioneerWorkspace` для пустого `pioneer_start` выдаёт валидный пролог обоих таргетов; тест бага замыкания зелёный.

### Фаза 3. Блоки без модели ожидания

Блоки: `pioneer_start`, `pioneer_wait`, `pioneer_time`, `pioneer_colour_preset`, `pioneer_colour_rgb`, `pioneer_led_all`, `pioneer_led_index`, `pioneer_position`, `pioneer_distance`, `pioneer_battery`.

- LED- и position-хелперы добавлять через `generator.definitions_` только при использовании блока.
- Lua: `Ledbar.new(29)`. Число 29 вынести в константу `PIONEER_LED_COUNT` с комментарием, что это значение уроков (см. открытый вопрос 3).
- Тесты кодогенерации на каждый блок и оба таргета, с проверкой точной строки для ключевых случаев: пересчёт цвета /255 в Lua, `select(k, ...)`, индекс k-1 в Python.

**Приёмка:** контрактные тесты для этих блоков зелёные.

### Фаза 4. Полёт и FSM-рантайм

**[пересмотрено 2026-09-13, см. §2.1]** Фазы 1–4 изначально были реализованы на корутинах; после пересмотра решения Lua-часть (`lua-runtime.ts` и Lua-генераторы блоков полёта) переписывается на FSM без изменения контракта фазы 2 (registry/toolbox/compile) и без изменения Python-части.

1. `pioneer/targets/lua-runtime.ts`: пролог §4.3 (FSM-таблица состояний) и сборка сегментов `action[...]` / `callback`.
2. `pioneer/targets/python-runtime.ts`: пролог §4.4. Условия `_pioneer_wait_armed/_takeoff/_landed` вывести из маппинга состояний в `pioneer-js-bridge.ts` и `python-api-docs.ts`. В комментарии к каждому хелперу указать, по какому состоянию и почему. Таймауты 15/30/60 с.
3. Блоки: `pioneer_preflight`, `pioneer_takeoff`, `pioneer_go_to`, `pioneer_set_yaw`, `pioneer_land`, `pioneer_disarm`, `pioneer_set_manual_speed` (только Python).
4. `INFINITE_LOOP_TRAP` по §4.2.
5. Интеграционный тест в стиле существующих «Интеграционные тесты Lua» ([blockly-codegen.test.ts:776+](../tests/blockly-codegen.test.ts)): программа «моторы → взлёт → точка (1, 0, 1) → ждать 2 → посадка» генерируется в оба таргета, проходит белый список и синтаксическую проверку Lua.
6. **Ручная проверка в симуляторе** (`npm start`, preview): один и тот же workspace запустить в Lua и в Python. Дрон проходит одинаковый маршрут, консоль без ошибок. Приложить скриншоты или логи в PR.

**Приёмка:** маршрут одинаковый в обоих режимах; `pioneer_set_yaw` ведёт себя одинаково, а если нет, описать расхождение и спросить владельца.

### Фаза 5. События (Lua)

1. `pioneer_on_event` (hat): дропдаун `from-autopilot` из `luaApiDocsEvents`, подписи из `luaApiEventLabels`.
2. Генерация веток в `callback(event)` **до** блока возобновления корутины.
3. `onchange` у блоков ожидания: отключать их внутри `pioneer_on_event` (§4.3).
4. Тесты: ветка генерируется; блок ожидания внутри события отключён и не генерирует код.

### Фаза 6. Поддержка таргетов в UI

1. При построении тулбокса и при смене языка неподдерживаемые блоки получают `setDisabledReason(true, 'unsupported_target')` и `setWarningText('Недоступно в Python')` (или «в Lua»). При возврате языка всё снимается.
2. Во flyout тулбокса неподдерживаемые блоки тоже неактивны (через `disabled="true"` в XML или слушатель flyout; выбрать то, что работает в Blockly 12, и описать выбор в PR).
3. Тест: `pioneer_on_event` в Python-режиме отключён и не даёт кода; `pioneer_set_manual_speed` в Lua-режиме — то же самое.

### Фаза 7. Интеграция в редактор

1. Переключить `buildMainEditorToolbox` и `compileMainEditorWorkspace` на новую систему.
2. **Ключ workspace:** `${droneId}:blockly` вместо `${droneId}:${language}`. Черновики текста (`textDraftByKey`) остаются по языкам.
3. **Смена языка при включённом Blockly:** workspace не перезагружается. Меняется таргет, пересчитываются disabled-блоки, превью кода перегенерируется, в черновик текста нового языка пишется сгенерированный код.
4. Удалить `getStarterBlocklyWorkspaceXml` с его Lua-only логикой. Стартовый workspace для обоих языков: `pioneer_start` → `pioneer_preflight` → `pioneer_takeoff` → `pioneer_land`.
5. **Валидатор Lua** ([lua-validation.ts](../public/modules/app/script-execution-notice/lua-validation.ts)): считать `__wait_event(` и `__wait_seconds(` разделителями шагов наравне с `sleep(` в `collectLuaMissionCommandGroups`. Добавить тест: сгенерированный полётный скрипт не даёт ложных предупреждений.
6. Проверить `collectPythonIssues` на сгенерированном Python тем же способом.
7. Ручная проверка в preview: включить Blockly, собрать программу, переключить Lua ↔ Python. Workspace тот же, код в превью меняется, запуск работает в обоих режимах. Перезагрузка страницы сохраняет workspace.

### Фаза 8. Миграция старых данных и уроки

**Зависит от ответа на открытый вопрос 2.**

1. `pioneer/legacy-map.ts`: функция `migrateLegacyWorkspaceXml(xml): { xml: string; lost: string[] }`. Маппинг:

   | Старые типы | Новый тип | Примечание |
   |---|---|---|
   | `lua_preflight`, `lua_arm`, `preflight`, `py_arm` | `pioneer_preflight` | |
   | `lua_takeoff`, `lua_takeoff_alias`, `take_off`, `py_takeoff` | `pioneer_takeoff` | |
   | `lua_landing`, `lua_land_alias`, `landing`, `py_land` | `pioneer_land` | |
   | `lua_engines_disarm`, `lua_disarm`, `engines_disarm`, `py_disarm` | `pioneer_disarm` | |
   | `lua_go_to_local_point`, `lua_goto_local_point`, `lua_goto_local_point_alias`, `go_local_point`, `py_goto_local_point` | `pioneer_go_to` | X/Y/Z: поля переносятся в shadow-значения, value-входы переносятся как есть |
   | `waiting_for_point`, `py_wait_point_reached`, `lua_waiting_for_point`, `lua_wait_point_reached` | удаляются | `pioneer_go_to` уже ждёт |
   | `sleep`, `py_time_sleep`, `lua_sleep`, `lua_time_sleep` | `pioneer_wait` | поле `TIME` или вход `NAME` → вход `SECONDS` |
   | `py_led_control`, `led_all`, `led_index` | `pioneer_led_all` / `pioneer_led_index` + `pioneer_colour_rgb` | для Lua `lua_led_set` цвет пересчитать 0..1 → 0..255 |
   | `lua_ledbar_new` | удаляется | лента создаётся в прологе |
   | `lua_get_local_position` + `lua_get_pv_by_index`, `get_local_position_lps` + `get_local_position_component` | `pioneer_position` | |
   | `lua_callback_open`, `lua_callback_end`, `lua_event_callback`, `lua_ap_push`, `lua_timer_calllater` | попадают в `lost` | |

2. **Загрузка сессии:** если есть `${droneId}:blockly`, используем его. Иначе берём `${droneId}:lua` или `${droneId}:python` (сначала текущий язык) и мигрируем. Если `lost` не пуст, workspace всё равно загружается (без потерянных блоков), в лог пишется одно информационное сообщение с перечнем, а текстовые черновики старых языков не трогаем: там остаётся последний сгенерированный код.
3. **Уроки** ([mission-guide/lessons](../public/modules/ui/mission-guide/lessons), [evaluation](../public/modules/ui/mission-guide/evaluation)): заменить `targetBlockIds` на `pioneer_*` и переписать проверки XML (`lua-led-single`, `lua-led-sequence`, проверку `COUNT = 29`, границы callback) под новые блоки в соответствии с решением по вопросу 2.
4. Тесты: миграция каждого ряда таблицы; сессия со старым ключом открывается.

### Фаза 9. Удаление старого и документация

1. Перед удалением сделать `grep` по каждому экспорту, чтобы не осталось использований. Удалить:
   - `catalog.ts`, `types.ts` (если после grep не используется), `teaching-lua-definitions.ts`, `teaching-python-definitions.ts`, `lua-definitions.ts`, `pioneer-sdk2-definitions.ts`;
   - `LUA_FULL_BLOCK_TYPES`, `getCourseBlockTypes`, `extendCatalogWithCourseBlocks`, `defineStatementBlock`, `defineLuaEventConstantBlock`, `renderStandardCategories`, `renderPioneerSdkCategories`;
   - `RAW_CODE_BLOCK_TYPES` и связанный код в `workspace.ts`.
2. Удалить или переписать тесты `blockly-codegen.test.ts` и `blockly-python-blocks.test.ts`, которые проверяют старые блоки. Стандартные проверки (`controls_for`, `controls_if`, `logic_compare`, совместимость типов) перенести в новый файл.
3. Удалить `docs/blockly-audit.md` (устарел), в конец этого файла добавить раздел «Итог реализации» и бэклог из §5.
4. `npm run build` проходит.

---

## 7. Правила работы

- Одна фаза — один логический PR или серия коммитов; в описании: что сделано, как проверено, что отложено.
- Комментарии в коде — на русском, в стиле существующих файлов; комментировать «почему», а не «что».
- Не расширять скоуп (CV, камера, GPIO) без запроса.
- Не менять рантаймы симулятора (§1 п.10).
- Если факт из §2 оказался неверным, остановись, опиши расхождение и спроси владельца. Не подгоняй тесты под фактическое поведение молча.
- Не использовать `any` в новом коде, где тип выводится из Blockly.

---

## 8. [ИСТОРИЧЕСКОЕ, см. §2.1] «План Б», ставший основным планом

Этот раздел описывал запасной вариант на случай, если корутины на реальном Пионере не заработают. 2026-09-13 выяснилось (§2.1), что ни один официальный скрипт/пример Geoskan или TRIK Studio корутины не использует вообще, и этот вариант стал основным и единственным — актуальное описание перенесено в §4.3, §1 п.3. Текст ниже оставлен для истории и не противоречит текущему плану:

Lua-таргет компилирует тело в явный конечный автомат:
- каждый блок ожидания — граница состояния;
- `callback(event)` и `Timer.callLater` переводят автомат на следующее состояние.

Ограничение: блоки ожидания внутри `controls_if` поддерживаются (ветвление по состояниям), а внутри циклов (`controls_repeat_ext`, `controls_whileUntil`, `controls_for`) **не поддерживаются** в Lua-таргете. Такие блоки отключаются с предупреждением «В Lua ожидание внутри цикла не поддерживается».

---

## 9. Открытые вопросы к владельцу

1. ~~Корутины на реальном Пионере: результат фазы 0.~~ **Снято 2026-09-13** — Lua-таргет больше не использует корутины (§2.1), вопрос неактуален.
2. **Уроки, которые учат Lua-структуре явно** (`callback(event)`, `Timer.callLater`, `lua-led-sequence`, `lua-flight`, `lua-core`). В Blockly-режиме учить только абстрактным блокам, а callback оставить урокам текстового режима? Или сохранить отдельную Lua-категорию «как устроено внутри»?
3. **Число светодиодов:** 29 (LED-модуль, как в уроках) или 4 (бортовые) по умолчанию. Нужен ли выбор в блоке?
4. **`Pioneer(simulator=True)`** в сгенерированном Python: нужен ли режим экспорта для реального дрона?
5. **Смена языка при включённом Blockly** перезаписывает текстовый черновик нового языка сгенерированным кодом (предложение: да). Подтвердить.

---

## 10. Definition of Done

- В редакторе один тулбокс блоков дрона; переключение Lua ↔ Python не меняет workspace, а только генерируемый код.
- Контрактный тест (белый список API + покрытие таргетов) зелёный и прогоняется в `npm test`.
- Эталонная программа из фазы 4 одинаково летает в симуляторе в обоих режимах.
- Старые сессии и уроки открываются через миграцию.
- Старые файлы блоков и мёртвый код удалены; `npm test`, `npm run type-check`, `npm run lint`, `npm run build` проходят.
