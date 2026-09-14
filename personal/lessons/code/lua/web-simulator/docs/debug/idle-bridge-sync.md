# Debug Session: idle-bridge-sync

Status: RESOLVED

## Symptom

- Пользователь запускает обычный Python-код через `Python IDLE` / внешний скрипт с настоящим `pioneer_sdk`.
- Ожидается, что bridge отправит команды в локальный сервер, а браузер начнет анимацию.
- Фактически "ничего не происходит": камера показывает картинку, дрон в 3D-сцене не взлетает,
  и **нигде** нет ошибок — ни в stdout скрипта, ни в консоли сервера, ни в консоли браузера.

## Confirmed root cause

**Защита от одновременных команд считала `arm()` и `takeoff()`, разнесённые в реальности на
секунды, командами одного тика — потому что симулированное время замирает, когда вкладка
симулятора уходит в фон.**

Механика целиком:

1. `recordTickCommand()` (`public/modules/autopilot/fsm-runtime.ts`) группирует команды по
   `getCurrentTickMs(drone)`, то есть по `Math.round(drone.current_time * 1000)`.
2. `drone.current_time` растёт только внутри `updatePhysics()`, который вызывается из
   `requestAnimationFrame` (`public/modules/app/animation-loop.ts`).
3. Браузер полностью останавливает `requestAnimationFrame` в фоновой вкладке. А при работе с
   внешним Python вкладка симулятора **всегда** в фоне: ученик смотрит в IDLE и в окно `cv2`.
   Измерено прямо в работающем приложении: `document.visibilityState === "hidden"` →
   **0 кадров rAF за секунду** (callback не вызвался ни разу за 45 с).
4. Симулированное время замирает ⇒ `tickMs` не меняется ⇒ `arm` и `takeoff` попадают в одну
   сигнатуру ⇒ `canRunInSameTick(['preflight'], 'takeoff') === false` ⇒
   `failSimultaneousCommands()`: миссия сбрасывается в `IDLE`, статус `ОШИБКА`, и бросается
   `CRITICAL ERROR: Commands PREFLIGHT, TAKEOFF run at the same time.`
5. Это исключение улетало в «тихий» `catch {}` цикла поллинга
   (`public/modules/python/external-bridge.ts`) — поэтому ошибки не видел никто. Вдобавок
   `state.nextAfterId` при броске не сдвигался, и то же самое событие применялось снова и
   снова, каждый раз молча падая.
6. Python-сторона тоже молчит: `python_bridge/pioneer_browser_bridge_runtime.py` гасит любые
   HTTP-ошибки (`except ...: continue`) и возвращает `True` из всех методов.

Итог для пользователя: дрон «арминг» на доли секунды, затем сваливается в `DISARMED`,
дальше ничего не происходит, и ни одна из трёх сторон ошибку не показывает.

## Evidence (собрано на живом стенде, а не из чтения кода)

Проверена вся цепочка по стадиям:

| Стадия | Результат |
| --- | --- |
| Python → сервер (POST `/event`) | ✅ события доходят (`__init__`, `arm`, `takeoff`, `go_to_local_point`) |
| Сервер записывает событие | ✅ видно в `GET /api/external-python-bridge/events` |
| Браузер поллит очередь | ✅ ~24 запроса `/events` + 24 `/state` за 3 с |
| Браузер резолвит дрон | ✅ binding на `drone_1`, `POST /state` с `droneId: "drone_1"` |
| Браузер применяет команды | ❌ `arm` применялся, `takeoff` падал с `CRITICAL ERROR` |

Ключевой лог, снятый обёрткой вокруг `window.pioneer_takeoff` в работающем приложении:

```
{ n: "pioneer_arm",     before: "DISARMED", after: "ARMED",    ok: true  }
{ n: "pioneer_takeoff", before: "ARMED",    after: "DISARMED", ok: false,
  err: "CRITICAL ERROR: Commands PREFLIGHT, TAKEOFF run at the same time." }
{ n: "pioneer_takeoff", before: "DISARMED", after: "DISARMED", ok: true, ret: false }  // молчаливый повтор
```

Третья строка — то самое бесконечное переприменение из-за несдвинутого `nextAfterId`.

## Hypotheses (итог)

1. Python hook не активируется — **опровергнуто**: hook патчит `pioneer_sdk.Pioneer`, события уходят.
2. POST не доходит до сервера — **опровергнуто** в норме, но см. «Вторая проблема» ниже.
3. Сервер не отдаёт очередь — **опровергнуто**: `/events` отдаёт всё корректно.
4. Браузерный polling не стартует / не применяет события — **частично подтверждено**: polling
   стартует и события применяет, но падал на `takeoff` (и глушил ошибку).
5. Создаётся не тот drone id — **опровергнуто**: binding корректно ложится на `drone_1`.

## Вторая проблема (тот же симптом, другая причина)

Общий rate-limit `/api` (30 запросов/60 с, `server.ts`) выедался за ~1.5 секунды самим же
браузерным поллингом (~20 запросов/с на одну привязку дрона), после чего сервер отвечал `429`
**на всё, включая приём команд** `POST /api/external-python-bridge/event`. Обе стороны ошибки
глушат, поэтому симптом внешне неотличим от основной проблемы. Воспроизведено:
`post takeoff -> 429`, `post go_to -> 429`.

## Fix

- `public/modules/python/external-bridge-runtime.ts` — каждое событие внешнего моста начинает
  свою фазу команд (`beginEventCallbackPhase`), ровно как `callback(event)` в Lua. Внешние
  команды приходят отдельными сетевыми событиями и не могут быть «одновременными».
- `public/modules/python/external-bridge.ts` — ошибка одной команды больше не глушится и не
  роняет цикл: она логируется в системный журнал, курсор `nextAfterId` сдвигается, остальные
  события продолжают применяться.
- `server.ts` — весь префикс `/api/external-python-bridge` выведен из-под общего лимитера и
  получает собственный (6000/60 с, настраивается `BRIDGE_RATE_LIMIT_MAX`).

## Verification

`tests/external-bridge-frozen-clock.test.ts` — воспроизводит замерший таймер (`current_time`
не меняется между командами). Без фикса оба теста падают с тем самым
`CRITICAL ERROR: Commands PREFLIGHT, TAKEOFF run at the same time.`, с фиксом проходят и
доказывают, что дрон реально набирает высоту и доезжает до точки.

End-to-end на живом стенде с **настоящим** `pioneer_sdk` (скрипт владельца репозитория:
`arm()` → `takeoff()` → `go_to_local_point(2, 2, 2, 0)`):

```
pos=[0.20, 0.20, 1.35] state=MISSION
pos=[1.04, 1.04, 1.99] state=MISSION
pos=[2.00, 2.00, 2.00] state=MISSION
```

Переходы FSM в браузере: `IDLE → PREFLIGHT → TAKEOFF_PROCESS → FLYING_HOVER → FLYING_MOVING →
FLYING_HOVER` с финальной позицией ровно `(2, 2, 2)`.

## Notes

- Поведение «в фоне rAF стоит» никуда не делось: пока вкладка свёрнута, физика не идёт и дрон
  не летит. Разница в том, что миссия больше не разрушается — она корректно стоит в
  `TAKEOFF_PROCESS` и продолжается, как только вкладку возвращают на передний план. До фикса
  миссия убивалась насовсем, и возврат вкладки уже ничего не чинил.
- На машине владельца в `%APPDATA%\Python\Python313\site-packages` установлена **устаревшая**
  копия `pioneer_browser_bridge_runtime.py` с отладочными `_report_debug()`-вызовами на
  `http://127.0.0.1:7777/event` (остатки сессии `pioneer-sdk-ports`). Её стоит переустановить
  из `python_bridge/`.
- Важно: на этой машине hook полностью подменяет `pioneer_sdk.Pioneer`, поэтому реальные
  MAVLink-пакеты на порт 8001 из пользовательского скрипта **не уходят вообще** — весь трафик
  идёт по HTTP. `server/mavlink-bridge.ts` при этом исправен и слушает 8001/18001; обе дороги
  сходятся в общий `recordExternalPythonBridgeEvent`, и починенная часть (браузерная) общая
  для обеих.
- Мелкий смежный дефект, не чинился: `POST /api/external-python-bridge/clear` сбрасывает
  серверный счётчик id в 0, но не трогает `nextAfterId` в уже открытых вкладках — после
  внешнего вызова `/clear` (или перезапуска сервера) такая вкладка молча игнорирует новые события,
  пока её не перезагрузят. Через UI-кнопку сброса это не воспроизводится: она дёргает
  `clearExternalBridgeQueue()`, который чинит курсор.
