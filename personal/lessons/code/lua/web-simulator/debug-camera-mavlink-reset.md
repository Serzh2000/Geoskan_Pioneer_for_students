# Debug Session: camera-mavlink-reset [OPEN]

## Симптом
- Python-скрипт с `Camera(ip='127.0.0.1', port=18001)` и `Pioneer(ip='127.0.0.1', mavlink_port=8001)` не управляет дроном.
- В Python SDK возникает `ConnectionResetError: [WinError 10054]` внутри `pymavlink`.
- Команды `arm/takeoff/go_to_local_point` завершаются `SEND_TIMEOUT`.

## Ожидаемое поведение
- Дрон принимает команды из `Pioneer`.
- Камера отдает кадры без разрыва MAVLink-соединения.

## Гипотезы
1. Серверный bridge на `8001` не поднимает корректный UDP endpoint для MAVLink, и Windows возвращает ICMP Port Unreachable, из-за чего `pymavlink` получает `WinError 10054`.
2. Python bridge принимает соединение только после определенной инициализации в UI, а прямой SDK-клиент отправляет команды раньше, чем endpoint готов.
3. Порты `8001` и `18001` подняты, но серверная часть не маршрутизирует MAVLink-команды от внешнего `Pioneer` в симуляторный runtime.
4. Внешний Python bridge сейчас поддерживает event/state API, но не эмулирует полноценный сокетный протокол `pioneer_sdk`, поэтому `Pioneer(...)` и `Camera(...)` в этом режиме несовместимы с текущим backend.
5. Камерный endpoint стартует отдельно, а MAVLink endpoint отсутствует или конфликтует по bind/transport mode (`udpin`/`udpout`) для localhost.

## План сбора фактов
- Проверить, какие серверные API и порты реально поднимаются для Python bridge.
- Найти текущую реализацию сокетного bridge для `pioneer_sdk`/camera.
- Добавить минимальную инструментализацию только в точки приема внешних Python-событий и/или порт-менеджера, если он существует.
- Воспроизвести сценарий и сопоставить логи до исправления.

## Доказательства
- По глобальному поиску в серверной части не найдено ни одного `dgram`, `createSocket`, `udp4/udp6` или другой реализации UDP-сокета для `8001/18001`.
- Серверная часть реализует только HTTP-маршруты:
  - `/api/python-runtime/run|stop|status`
  - `/api/external-python-bridge/event|state|events`
- В `public/modules/python/pioneer-sdk-module.ts` есть отдельная браузерная подмена `pioneer_sdk`, где `Pioneer` и `Camera` работают через `js.pioneer_*`, то есть через встроенный JS bridge, а не через реальный MAVLink/UDP сокет.
- В уже существующем журнале `debug-pioneer-sdk-ports.md` зафиксировано, что поддержка `pioneer_sdk` в этом проекте строится вокруг browser/local HTTP bridge, а не вокруг полноценного сетевого сокетного сервера MAVLink.
- Ваш stack trace (`pymavlink.recvfrom -> ConnectionResetError [WinError 10054]`) согласуется с ситуацией, когда UDP-пакеты отправляются на localhost-порт без живого совместимого listener.

## Статус
- Корневая причина практически подтверждена: текущая интеграция не предоставляет прямую UDP/MAVLink-совместимость для внешнего `pioneer_sdk.Pioneer`/`Camera` на `127.0.0.1:8001/18001`; ожидаемый путь интеграции здесь — browser/local bridge.
