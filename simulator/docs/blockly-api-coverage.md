# Blockly: покрытие Lua API и pioneer_sdk

Дата: 2026-09-27

Единый набор блоков `pioneer_*` (`public/modules/editor/blockly-mode/pioneer/`)
сверен с официальными источниками Geoscan:

- Lua API — «Описание методов API» (Pioneer February update 2026,
  `docs/imported/`) и примеры https://gitflic.ru/project/geoscan-llc/pioneer-lua-example;
- Python — https://github.com/geoscan/pioneer_sdk (0.5.3, он же на PyPI) и
  https://gitflic.ru/project/geoscan-llc/pioneer-sdk (0.6.1: `simulator=True`,
  `get_yaw`, `cargo_*`).

Проверка — `tests/geoscan-examples-blockly.test.ts`: официальные примеры
собраны из блоков, и поведение дрона сравнивается с оригиналом (см. ниже).

## Что было до этой работы

19 блоков: старт, моторы, взлёт, точка, курс, посадка, выключить моторы,
скорость (Python), ждать, время, два цвета, два блока светодиодов,
координата, дальномер, батарея, снимок, событие (Lua). Ни один
Lua-пример из pioneer-lua-example нельзя было собрать из блоков:

- в Lua нельзя было ждать внутри цикла или «если» — полёт по точкам в
  цикле (`circle_flight.py`, список точек в `example_go_to_point.lua`)
  не собирался;
- не было периодического таймера (`Timer.new`) — на нём построены все
  примеры «датчик → светодиоды», груз и старт с пульта;
- не было датчиков, кроме координаты, дальномера и батареи; не было груза,
  видео, HSV, списков.

## Найденные и исправленные ошибки

| Где | Ошибка | Последствие |
|---|---|---|
| Python «Лететь в точку» | `go_to_local_point(x, y, z)` без `yaw` | На настоящем pioneer_sdk — `TypeError`: `yaw` обязательный |
| Python датчики | `get_dist_sensor_data()` без `get_last_received=True` | Настоящий SDK на повторное чтение того же сообщения даёт `None`, сравнение падает |
| Lua автомат | Переходы в `callback` шли подряд без выхода | Две точки подряд: второй переход срабатывал на то же `POINT_REACHED`, вторая точка проскакивалась |
| Lua «Сделать снимок» | Ждал `checkRequestShot() == 1` | По документации 1 — ошибка: на дроне программа ждала бы вечно |
| Рантайм камеры | `checkRequest*` отвечали 0/1 по-своему | Приведено к официальному −1 (ждём) / 0 (готово) / 1 (ошибка) |
| Рантайм Lua | `Sensors.lpsYaw`, `Sensors.altitude` описаны в справке, но не реализованы | Добавлены |
| Рантайм Lua | Магнит груза только на PC3/PA1 | Добавлен PC15 (плата 1.6, официальный `example_cargo.lua`) |
| Рантайм Python | Нет `get_yaw`, `cargo_grab/release/set` из SDK 0.6.1 | Добавлены |
| Lua `fromHSV` | В справке только `Ledbar.fromHSV` | Добавлена глобальная `fromHSV`, как в документации |
| Python из блоков | Проверки `arm() is False`, опрос `get_autopilot_state() == 'MISSION'`, таймауты, `time.sleep(1)` | Такого нет ни в одном примере; теперь код как в примерах: `arm()`, `takeoff()`, точка, `while not point_reached(): pass`, `land()` |
| Рантайм Python | `arm()` и `takeoff()` подряд падали на проверке «команды в одном тике» | Каждый вызов SDK — отдельная команда, как у настоящего SDK (он ждёт подтверждения) |
| Рантайм Python | `land()` во время взлёта — ошибка автомата | Автопилот садится, как настоящий |
| Рантайм Python | `*_body_fixed` летели и разгонялись в мировых осях | Смещение и скорость в осях дрона: `y` — вперёд, `x` — вправо |
| Рантайм камеры | Официальный `take_photo_video.lua` (`while checkRequestShot() == -1 do end`) при ответе −1 вешал вкладку | Запрос принимается сразу (0), 1 — если сохранить файл не удалось |

## Python: как выглядит код

Как в официальных примерах: без проверок состояния и таймаутов, отступ
четыре пробела, `import time` — только если программа им пользуется.
Полёт в точку 1, 0, 1:

```python
from pioneer_sdk import Pioneer

pioneer = Pioneer()

pioneer.arm()
pioneer.takeoff()
pioneer.go_to_local_point(x=1, y=0, z=1, yaw=0)
while not pioneer.point_reached():
    pass
pioneer.land()

pioneer.close_connection()
```

`takeoff()` не ждёт конца взлёта: точку автопилот держит до его окончания
(так делают `aruco_flight.py` и `circle_flight.py`). Поэтому блоки, стоящие
сразу после «Взлететь» (например, светодиоды), в Python срабатывают в
начале взлёта, а в Lua — после `TAKEOFF_COMPLETE`. Конца посадки код ждёт,
только если после неё в программе ещё что-то есть (повторный `arm()` во
время посадки автопилот отклонит); другого способа, кроме
`get_autopilot_state()`, у pioneer_sdk нет.

## Матрица: Lua API

| API | Блок | Python |
|---|---|---|
| `ap.push(MCE_PREFLIGHT/TAKEOFF/LANDING)`, `ENGINES_DISARM` | Запустить моторы, Взлететь, Приземлиться, Выключить моторы | `arm/takeoff/land/disarm` |
| `ap.goToLocalPoint(x, y, z)` | Лететь в точку | `go_to_local_point(..., yaw=текущий курс)` |
| `ap.goToLocalPoint(x, y, z, time)` | Лететь в точку … за N сек | нет в SDK — только Lua |
| `ap.updateYaw(angle)` | Повернуться на курс; Лететь в точку … курс | `go_to_local_point` с `yaw` |
| `ap.goToPoint(lat, lon, alt)` (GPS) | — | нет в SDK; в симуляторе нет GPS-сцены |
| `Timer.callLater` | Ждать N сек (шаг программы), Через N сек выполнить | `time.sleep`, поток |
| `Timer.new` + `start/stop` | Каждые N сек (именованный), Остановить таймер | поток с флагом остановки |
| `Timer.callAt`, `Timer.callAtGlobal` | — | в симуляторе не реализованы |
| `time()` | Секунд с начала программы | `time.time()` |
| `sleep` | не используется (документация советует Timer) | — |
| `deltaTime`, `launchTime`, `boardNumber` | — | нет в SDK |
| `Ledbar.new/set` | Все светодиоды, Светодиод № | `led_control` |
| `fromHSV` | Цвет тон/насыщенность/яркость | `colorsys` |
| `Sensors.lpsPosition` | координата X/Y/Z | `get_local_position_lps` |
| `Sensors.lpsYaw` | курс, ° | `get_yaw` (SDK 0.6.1, `simulator=True`) |
| `Sensors.lpsVelocity` | скорость по оси | нет в SDK — только Lua |
| `Sensors.orientation` | крен/тангаж | нет в SDK — только Lua |
| `Sensors.accel`, `Sensors.gyro` | ускорение, угловая скорость по оси | нет в SDK — только Lua |
| `Sensors.altitude` | высота по барометру | нет в SDK — только Lua |
| `Sensors.range` | дальномер | `get_dist_sensor_data` |
| `Sensors.battery` | батарея | `get_battery_status` |
| `Sensors.rc` | канал пульта 1–8 | нет в SDK — только Lua |
| `camera.requestMakeShot/checkRequestShot` | Сделать снимок | кадр `Camera.get_frame` |
| `camera.requestRecordStart/Stop/checkRequestRecord` | Начать/Остановить запись видео | нет в SDK — только Lua |
| `Gpio` (магнит груза) | Груз: захватить/отпустить | `cargo_grab/release` (SDK 0.6.1) |
| `Gpio` прочие пины, `Uart`, `Spi` | — | нет в SDK; внешние модули вне симулятора |
| `mailbox.*` | — | в симуляторе не реализован |
| `callback(event)` | Когда событие от автопилота | нет в SDK (опрос) — только Lua |
| `Vehicle.*` (только симулятор) | Запустить/остановить транспорт, скорость транспорта | `Vehicle` |

## Матрица: pioneer_sdk

| Метод | Блок |
|---|---|
| `arm`, `disarm`, `takeoff`, `land` | Запустить/выключить моторы, Взлететь, Приземлиться |
| `go_to_local_point` | Лететь в точку; … курс |
| `go_to_local_point_body_fixed` | Сместиться относительно дрона (только Python) |
| `set_manual_speed`, `set_manual_speed_body_fixed` | Скорость; Скорость в осях дрона (только Python) |
| `point_reached`, `get_autopilot_state` | внутри блоков полёта |
| `get_local_position_lps`, `get_dist_sensor_data`, `get_battery_status`, `get_yaw` | датчики |
| `led_control` | светодиоды |
| `cargo_grab`, `cargo_release`, `cargo_set` | Груз |
| `Camera.get_frame` | Сделать снимок |
| `send_rc_channels` | — (ручное управление, в Blockly нет клавиатуры) |
| `lua_script_upload`, `lua_script_control` | — (управление другой программой) |
| `get_optical_data`, `get_preflight_state`, `get_autopilot_version`, `reboot_board`, `raspberry_*`, Wi-Fi, FTP | — (служебное, вне учебных программ) |
| `Camera.get_cv_frame` + OpenCV/ArUco | — (компьютерное зрение, только Python, отдельная задача) |

## Сверка с официальными примерами

`tests/geoscan-examples-blockly.test.ts`. Lua — рантайм симулятора с
физикой; Python — CPython на поддельном pioneer_sdk с моделью дрона
(`tests/helpers/python/run_scenario.py`). Сравнивается то, что видно на
дроне: взлёт/посадка, точки, курс, груз, ручная скорость, цвета четырёх
бортовых светодиодов, для примеров с таймерами — и время.

| Пример | Lua из блоков = оригинал | Python из блоков = оригинал | Lua = Python из тех же блоков |
|---|---|---|---|
| `example_go_to_point.lua` | ✔ (±2.5 с) | — | ✔ |
| `example_path.lua` | ✔ | — | ✔ |
| `rc_script_start.lua` | ✔ | пульт — только Lua | — |
| `example_led_blink.lua` | ✔ (±0.1 с, те же случайные цвета) | событие — только Lua | — |
| `pioneer_led_blink.lua` | ✔ | — | ✔ |
| `example_get_accel.lua` | ✔ | акселерометр — только Lua | — |
| `example_get_position.lua` | ✔ | — | ✔ |
| `example_cargo.lua` | ✔ | пульт — только Lua | — |
| `take_photo_video.lua` | те же вызовы камеры в том же порядке (камеру в Node не запустить) | — | — |
| `LED_hight_change.py` | — | ✔ | ✔ |
| `circle_flight.py` | — | ✔ | ✔ (цикл с ожиданием в Lua) |
| `manual_speed.py` | скорость — только Python | ✔ | — |

Не собирались из блоков: `aruco_flight.py`, `detect_aruco*.py`,
`frames_from_camera.py`, `camera_stream.py` (компьютерное зрение и окно
видео), `WASD_flight.py` (клавиатура), `LUA_script_start.py`, `ftp.py`,
`wifi.py`, `upload_lua_serial.py` (служебные), `example_led.lua` (цифры на
LED-матрице — собирается из списков и циклов, но громоздко),
`example_get_gyro/orientation/velocity/tof.lua` (те же, что
`example_get_accel`, с другим датчиком).

## Открытые вопросы

1. **Единицы `Sensors.orientation`.** Симулятор отдаёт радианы, справка
   тоже пишет радианы, а официальный `example_get_orientation.lua` делит на
   `maxRoll = 180` — то есть на дроне, похоже, градусы. Блок «крен/тангаж»
   переводит радианы симулятора в градусы; если на дроне градусы, в Lua для
   дрона перевод лишний. Нужна проверка на железе.
2. **Внешний мост MAVLink** (Python на компьютере ученика → сайт) не шлёт
   `DISTANCE_SENSOR`, `BATTERY_STATUS`, `VISION_POSITION_ESTIMATE` и не
   принимает `MAV_CMD_DO_SET_RELAY`: Python из блоков с дальномером,
   батареей, курсом или грузом через мост не заработает. Внутри браузера
   всё работает.
3. **Светодиоды в Python.** Настоящий `led_control` принимает только
   `led_id` 0–3 и 255; блок «Светодиод №» разрешает любой номер (в Lua — до
   28 с LED-модулем).
4. **Число светодиодов в Lua** — по-прежнему 29 (открытый вопрос 3 плана
   `docs/blockly-unification-plan.md`).
