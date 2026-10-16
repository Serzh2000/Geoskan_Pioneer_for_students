# Debug Session: pioneer-sdk-ports

Status: OPEN

## Симптом

- Python-код с `from pioneer_sdk import Pioneer` выполняет вызовы `arm()`, `takeoff()` и `go_to_local_point(...)`, но симулятор не воспроизводит ожидаемое поведение.
- Есть подозрение, что идентификация дронов должна строиться не только по `ip`, а по сочетанию `ip + mavlink_port` или связанных транспортных параметров.

## Фальсифицируемые гипотезы

1. `pioneer_sdk.Pioneer` различает дроны по транспортному порту (`mavlink_port` или смежным полям), а bridge сейчас теряет этот идентификатор и сводит все внешние команды к одному дрону.
2. `pioneer_sdk` использует дополнительные поля подключения помимо `ip` и `mavlink_port`, и текущее зеркало в браузер переносит не тот набор параметров.
3. Браузерная часть bridge создаёт внешний дрон по `sessionId`, а не по адресу подключения, из-за чего команды из примера попадают не в тот runtime-объект.
4. Скрипт из примера блокируется на `point_reached()`, потому что симулятор не отправляет обратно состояние достижения точки, даже если команда движения уже применена.
5. Локальный Python bridge правильно отправляет события, но в payload отсутствуют поля, по которым можно однозначно сопоставить команды конкретному дрону в симуляторе.

## План

- Изучить исходники установленного `pioneer_sdk` и подтвердить модель идентификации дронов.
- Снять runtime-данные с bridge payload и проверить, какие поля подключения реально доступны в `Pioneer`.
- На основе доказательств внести минимальную правку в bridge, чтобы дроны различались по корректным параметрам подключения.

## Доказательства

- В `pioneer_sdk` конструктор `Pioneer` создаёт транспорт как `mavutil.mavlink_connection('%s:%s:%s' % (connection_method, ip, port))`, то есть идентичность соединения действительно задаётся через `connection_method + ip + mavlink_port`.
- Runtime-лог `pre-fix` показал, что экземпляр `Pioneer` не хранит у себя `ip`, `mavlink_port` и `connection_method` как атрибуты: в payload уходили `droneIp=""`, `mavlinkPort` отсутствовал, а browser bridge не мог различать дроны по порту.
- Browser bridge до правки связывал внешний дрон только по `sessionId`, поэтому несколько `Pioneer(...)` внутри одной сессии неизбежно схлопывались в один drone state.
- Встроенный browser runtime тоже резолвил дронов только по `name/ip`, без учёта `mavlink_port`, что ломало сценарий с одним `ip` и несколькими портами.

## Внесённые изменения

- Python bridge теперь сохраняет параметры подключения (`name`, `ip`, `mavlink_port`, `connection_method`, `device`, `baud`) прямо в patched `Pioneer` и отправляет их в `/api/external-python-bridge/event`.
- Python bridge получил чтение `/api/external-python-bridge/state`, поэтому `point_reached()` может возвращать состояние из симулятора, а не только из реального MAVLink.
- Сервер получил новый канал состояния `/api/external-python-bridge/state` для связки внешнего Python и браузерного симулятора.
- Browser external bridge теперь сопоставляет дронов по `sessionId + connection_method + ip + mavlink_port`, пытается сначала найти уже существующий дрон по его `pythonConnection`, и только потом создаёт внешний `external_*`.
- Browser runtime (`pioneer_sdk` внутри браузера) тоже начал учитывать `mavlink_port` и `connection_method` при резолве дронов.

## Пост-фикс Проверка

- На mock-server подтверждено, что payload теперь содержит `droneIp="192.168.4.1"`, `mavlinkPort=8001`, `connectionMethod="udpout"`.
- На mock-server подтверждено, что цикл `while not pioneer.point_reached(): ...` перестаёт висеть бесконечно: тестовый скрипт дал `point_reached[2]=True`.

## Текущий статус

- Fix implemented, awaiting user verification in the actual simulator/browser + IDLE setup.
