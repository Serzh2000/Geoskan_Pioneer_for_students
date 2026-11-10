# Эмуляция ROS 2 (gs_core) в симуляторе: устройство, допущения, консоль

Эталон поведения - `docs/ros2/gs_core.md`. Здесь записано то, чего в нём нет и что пришлось выбрать.

## Где что лежит

| Файл | Что |
|---|---|
| `public/modules/python/ros2/interfaces.ts` | Единственное описание типов сообщений и сервисов, таблицы `mini2` / `razero`, `interfaceShow` (`ros2 interface show`) |
| `public/modules/python/ros2/prelude-core.ts` | Python: классы сообщений из `interfaces.ts`, `rclpy` (Node, паблишер, подписка, клиент, сервис, таймер, Rate, параметры, экзекьюторы, Future) |
| `public/modules/python/ros2/prelude-node.ts` | Python: `ros_pioneer_node`, `gs_core.launch`, реестр `_ros2_registry` |
| `public/modules/python/ros2/prelude.ts` | Загрузчик по требованию: текст выполняется при первом `import rclpy` (или `std_msgs`, ...), программы без ROS 2 ничего не платят |
| `public/modules/python/pioneer-ros2-bridge.ts` | JS-мост `ros2_*`: те же команды дрону, что у `pioneer_sdk2`, но без `PYTHON_CANCELLED` после «Стоп» |
| `public/modules/python/ros2/registry.ts` | TS-фасад реестра для консоли (`Ros2Registry`), `browser-host.ts` - его хост поверх Pyodide |
| `public/modules/docs/python-ros2-api-docs.ts` | Справочник в панели API (показывается в режиме «Python · SDK2») |
| `examples/python-onboard/ros2/*.py`, `simulator/examples-python-ros2/` | 10 примеров, в меню примеров SDK2 группа «ROS 2» |

ROS 2 - часть режима «Python · SDK2» (Мини 2 и Базовый с Radxa Zero 3W), отдельного языка нет.

## Жизнь ros_pioneer_node

Узел запускается лениво: при `rclpy.init()` в программе или при первом обращении консоли к фасаду (`autoLaunch`). Это аналог `ros2 launch gs_core pioneer_mini2_full_launch.py`, который уже работает, когда человек садится за терминал. Конфиг по модели дрона: Мини 2 - `mini2`, Базовый - `razero`. Узел переживает программу ученика (после неё исчезают только её узлы) и сам останавливается, когда дрона нет или ему выбран не SDK2. Перезапуск с другими параметрами (`-p topics.gnss:=true`): `Ros2Registry.launch({ parameters: { 'topics.gnss': true } })` или из программы `gs_core.launch.restart_pioneer_node(parameters={...})`.

Время - симулятора (`ros2_time` и `time` состояния моста = общие часы физики `simClock()`, а не `drone.current_time`: у дрона без программы он стоит, а консоль работает без программы): таймеры, `Rate`, таймауты `wait_for_service`, `call`, `spin_once` и `arm` идут по нему и ускоряются вместе с симуляцией. `time.sleep` в программе, как и в остальных программах симулятора, - настенные секунды.

## Как консоль вызывает реестр

```ts
import { createRos2Registry } from '.../python/ros2/browser-host.js';
const ros2 = createRos2Registry(currentDroneId);          // autoLaunch: узел запустится сам

await ros2.topicList();            // ros2 topic list -t   [{ name, types, publishers, subscribers }]
await ros2.topicInfo(name);        // ros2 topic info
await ros2.topicEcho(name, { count: 1, timeoutSec: 5 });   // [{ msg, yaml }]
await ros2.topicPub(name, msgDict, { type, once: true });   // ros2 topic pub --once / -r
await ros2.serviceList();          // ros2 service list -t
await ros2.serviceType(name);      // ros2 service type
await ros2.serviceCall(name, requestDict, { type });        // { request, response, response_repr, yaml }
await ros2.paramList(); ros2.paramGet(node, name); ros2.paramSet(node, name, value);
await ros2.nodeList(); ros2.nodeInfo(name);
await ros2.launch({ config, parameters });                  // ros2 launch / ros2 run ... -p ...
Ros2Registry.interfaceShow('gs_interfaces/srv/Arm');        // ros2 interface show (без Python)
Ros2Registry.interfaceList();
```

Ошибки приходят как `Ros2Error` с русским текстом. Словарь запроса - как в YAML `ros2 service call`: числа приводятся к типу поля, неизвестное поле - ошибка. `inf` и `nan` в ответе - строки `'inf'`, `'-inf'`, `'nan'`. `request` и `response_repr` готовы для печати как у `ros2 service call` (`requester: making request: ...`, `response: ...`). Вызов сервиса, который реализует программа ученика, без её `spin` даёт таймаут.

Вне Python живут только `interface show` и `interface list`. Standard-топики `/rosout`, `/parameter_events` и служебные сервисы параметров узлов (`/node/get_parameters` и т. п.) не эмулируются: `ros2 param` идёт напрямую через реестр.

## Допущения там, где справочник молчит

**Поля gs_interfaces.** Справочник называет только часть полей. Взято как есть: `Arm.Request(timeout, retries)`, `GoToLocalPoint(x, y, z, yaw, time, frame_id)`, `GoToGlobalPoint(latitude, longitude, altitude, yaw, frame_id)`, `Yaw(angle)`, `GetParam(name, update)`, `SetParam(name, value)`, `Parameter(name, value)`, `SetNavigationSystem(navigation)`, `NavigationSystem.Response(navigation, status)`, `ParametersList.Response(params, status)`, `Grab(movement_time, velocity, action)`, `Led(mode, leds, period)` с `PIXEL=0`, `FILL=1`, `RcChannels(channel_1..channel_8)`, `NavStatus` со значениями 0..3, `OptVelocity(x, y)`, `RangerData(right, left, front, back, above_below)`. Допущено:
- ответы команд (`Arm`, `GoTo*`, `Yaw`, `Grab`, `Led`) - одно поле `bool success`; причина отказа - в журнале (справочник: «запишет в лог»);
- ответы сервисов борта (`Live`, `GetParam`, `SetParam`, `SetParametersList`, `SetNavigationSystem`) - `bool status` (как у `NavigationSystem` и `ParametersList`); `GetParam.Response` ещё `float32 value`;
- `Led.Request` ещё константы `BLINK=2`, `CHASE=3` (номера допущены, режимы не реализованы);
- `NavStatus.status` (uint8), `MotorsRpm.rpm` (`float32[4]`), `SatellitesGPS.satellites` (uint8), типы `int32` у `RcChannels` и `int32 velocity`, `uint8 action` у `Grab`;
- `Parameter.value` - `float32`: параметры автопилота числовые.

**Заголовки.** По справочнику `header` заполняют (stamp, `frame_id=base_link`) только `MotorsRpm`, `PointGPS`, `SatellitesGPS`, `OptVelocity`, `RangerData`. У `Imu`, `Range`, `BatteryState` заголовок не заполняется. Время в stamp - симулятора плюс эпоха 1980-01-06, как `time()` у `pioneer_sdk2`.

**Коды.** `fly_state`: 0 на земле, 1 моторы запущены, 2 в воздухе; `callback_event`: коды `Event` из `pioneer_sdk2` (1 DISARM, 2 COPTER_LANDED, 3/4 LOW_VOLTAGE1/2, 5 POINT_REACHED, 6 POINT_DECELERATION, 7 TAKEOFF_COMPLETE, 8 ENGINES_STARTED, 9 SHOCK, 10 LOW_CHARGE).

**Частоты** (в симулируемых Гц): imu 30; altitude, range, motors_rpm, fly_state, optical_flow, ranger 10; local/* 20; battery 2; global/* 5; satellites 1. `rc/trigger` - при изменении 8-го канала, `callback_event` - по событию.

**Блокировка сервисов.** `arm` ждёт подтверждения (при неудаче `timeout` секунд на каждую из `retries + 1` попыток), `grab` с `movement_time > 0` - это время (справочник). `takeoff`, `land`, `go_to_local_point`, `set_yaw`, `rtl` возвращаются, когда команда принята; об окончании сообщают `flight/callback_event` и `fly_state`. Команды полёта вне подходящего состояния (`takeoff` без `arm`, `go_to_local_point` на земле) отвечают `success: False` и пишут причину.

**Оси.** `map` - локальные координаты сцены (как у `get_local_position_lps`). `base_link` - как в REP 103: x вперёд (по носу), y влево, z вверх; для `go_to_local_point` это смещение от текущей позиции. `yaw` - абсолютный курс в градусах (положительный - против часовой). Угол, равный прошлому заданному, рыскание не меняет; до первой команды прошлым считается 0. Пустой или чужой `frame_id` сервисов полёта - отказ с записью в журнал (для `cmd_vel` - игнор с предупреждением, как в справочнике).

**cmd_vel.** `angular.z` ограничивается до ±1.82 (в `pioneer_sdk2` такая команда отбрасывается; здесь «лимит» понят как предел). Линейные скорости не ограничиваются: их предел задаёт автопилот. Каждое сообщение держит скорость 0.5 с, потом дрон зависает: публиковать нужно постоянно. На земле команда игнорируется с предупреждением.

**rc/set_channels.** Значения - как у `pioneer_send_rc_channels` симулятора (1000..2000, центр 1500), каналы уходят на тот же ручной путь, что и пульт.

**Параметры автопилота** (`board/get_param`, `set_param`): известные симулятору (`Flight_com_navSystem`, `Copter_com_takeoffAlt`, `Copter_man_rcMode0..2`, `Copter_flyWithoutRc`, `SensorMux_rc`); остальных нет, `status: false`. `Flight_com_navSystem` меняется только `navigation/set_system`. `board/restart` возвращает параметры к значениям по умолчанию, в полёте запрещён.

**Навигация.** `set_system` меняет значение, физически навигация симулятора всегда LPS. Топики `navigation/global/*` и `navigation/satellites` при `topics.gnss: true` создаются, но данные не публикуются; `go_to_global_point` всегда `success: False`. При `topics.ranger: true` на борту без Ranger (Базовый) топик есть, данных нет.

**Параметры узла.** `topics.*` и `shortname`, `board_*`, `gtlp_version` читаются при запуске: `ros2 param set` для них отказывает с подсказкой про перезапуск. `grab`, `cargo`, `nav_system_change_in_flight`, `range_sensor.*` действуют сразу. Вне диапазона датчика `sensors/range.range` - `-inf` / `+inf` (REP 117).

**rclpy.**
- Потоков в браузере нет: `MultiThreadedExecutor` выполняет обратные вызовы, которые ждут (`async` после преобразования раннера), параллельно задачами цикла событий; остальное - как `SingleThreadedExecutor`.
- Раннер дописывает `await` к `spin*`, `wait_for_service`, `call`, `Rate.sleep`, `Clock.sleep_for`, поэтому в программе они выглядят как в настоящем rclpy. Синхронный `client.call(request)` не требует отдельного потока (в настоящем rclpy ему нужен крутящийся экзекьютор).
- Ответ сервиса приходит в `future` без `spin` клиента (в настоящем rclpy - при обработке экзекьютором).
- Поля сообщений проверяются как в rclpy: `Point(x=1)` - `AssertionError`, нужен `1.0`.
- Параметры узла: `Node(parameter_overrides=[...])` и `rclpy.init(args=['--ros-args', '-p', 'имя:=значение'])`.
- `rclpy.ok()` становится `False` после кнопки «Стоп»; ошибки в обратных вызовах выходят из `spin`, как в rclpy.

## Исправление раннера

Вызов `arm`/`takeoff`/`land`/`get_cv_frame`/`spin` из метода класса ученика падал с `NameError: _Класс__sim_await`: компилятор искажал имя `__sim_await` внутри класса. Вспомогательная функция теперь доступна ещё и под именем `__sim_await__` (с двумя подчёркиваниями на конце, его не искажают).

## Консоль ros2 (вкладка «ROS 2» нижней панели редактора)

Вкладка видна, пока выбранному дрону доступен режим «Python · SDK2» (Мини 2 или Базовый с Radxa); при смене дрона, языка или модели `terminal-workbench.ts` зовёт `sync()`. Консоль работает без запущенной программы и ходит в реестр выбранного дрона (`createRos2Registry(id, { autoLaunch: false })` - запуск узла делает сама консоль, см. ниже).

| Файл | Что |
|---|---|
| `public/modules/python/ros2/console/tokenize.ts` | Разбор строки как в bash: кавычки, `\`-продолжение, комментарии `#`, признак незавершённой строки |
| `.../console/yaml.ts` | YAML-подмножество аргументов ros2: поточный стиль, строки, числа, true/false, блочные словари и списки |
| `.../console/specs.ts`, `parser.ts`, `help.ts` | Таблица команд (одна на разбор, справку `-h` и Tab), разбор в `ParsedLine`, usage в формате argparse |
| `.../console/executor.ts`, `foreground.ts`, `context.ts` | Выполнение команд против реестра: вывод в `ctx.write`, время `ctx.clock`, остановка через `AbortSignal` |
| `.../console/format.ts`, `complete.ts`, `history.ts`, `clock.ts` | Форматы вывода, дополнение по Tab, история, часы симуляции и `raceAbort` |
| `public/modules/ui/panels/ros2-console.ts`, `ros2-console-intro.ts` | DOM: строка ввода, пустое состояние со справкой и кнопками «Копировать» / «Выполнить» |

**Поддерживается:** `ros2 topic list|info|type|find|echo|pub`, `service list|type|find|call`, `interface list|show`, `param list|get|set|dump`, `node list|info`, `launch gs_core <файл>`, `run gs_core ros_pioneer_node --ros-args ...`, `pkg list|executables`, `action list` (пусто), справка `ros2 -h` и `ros2 <команда> -h`; встроенные `help`, `clear`, `history`, `source` (ничего не делает: окружение уже настроено). Опции: `-t`, `-c`, `-v` (info), `--once`, `--field`, `-r`, `-1`/`--once`, `-t N` (pub), `-r` у `service call`.

**Отличия от настоящего ros2 (Jazzy):**
- Узел считается запущенным, пока дрон в SDK2: первая команда запускает его сама (как будто `ros2 launch` уже работает). `ros2 launch` / `ros2 run` показывают строки запуска и работают до Ctrl+C; если узла не было или его перезапустили (другой конфиг, `-p` / `имя:=значение`), Ctrl+C его останавливает, и до следующего `launch` / `run` команды видят пустой граф. Если узел уже работал и параметров нет, `launch` только присоединяется (перезапуска нет, остановки по Ctrl+C тоже).
- `--params-file` понимает только конфиги gs_core: `mini2.yaml`, `razero.yaml` (любой каталог перед именем). Файловой системы нет. `-p имя:=значение` поддерживает числа, `true/false` и строки; `-r` (переименование) отказывает. У `launch` аргументы `имя:=значение` трактуются как параметры узла (в gs_core launch-аргументов нет).
- `topic echo -n N` - расширение симулятора (в ros2 такой опции нет). Поток `echo` без `--once` забирает сообщения порциями по 0.25 с симуляции, поэтому на очень быстрой симуляции возможны пропуски между порциями. Нет `--csv`, `--qos-*`, `--no-arr`, `topic hz|bw|delay`, `bag`, `lifecycle`, `doctor`.
- `service call`: тип можно опустить (в Jazzy он обязателен); `-r Гц` повторяет вызов. После вызова печатаются новые строки журнала узла (причины отказа `success: False`) серым/жёлтым с префиксом `[ros_pioneer_node-1]`; в настоящем ros2 они идут в терминал launch.
- Списки не содержат `/rosout`, `/parameter_events` и служебных сервисов параметров (`/node/get_parameters`...), `ros2 param list` - `use_sim_time` и т. п. из эмуляции rclpy.
- Все метки времени и таймауты - симулируемые секунды: пауза симуляции останавливает `echo`, `pub -r` и ожидание ответа.
- Вставка нескольких строк выполняет их подряд без пауз: `go_to_local_point` сразу после `takeoff` будет отклонён (дрон ещё не в воздухе). Кнопка «Выполнить» у полётного цикла ждёт состояние дрона (FSM) между командами.
- Дополнение по Tab пропускает пустую строку и повторное нажатие без результата, чтобы не запирать клавиатурный фокус.

