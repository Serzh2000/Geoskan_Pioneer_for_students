# Что мы узнали с реальных бортов (Razero и Мини 2), 11–12 ноября 2026

Источники: `simulator/reference/razero-disk/` (диск Базового с Radxa Zero 3W), `simulator/reference/mini2-disk/` (диск Мини 2 + `proto-introspection/`), полный образ Мини 2 `reference/mini2-full/` (не в git). Манифесты: `MANIFEST.md` в каждой папке.

## 1. Факты (проверено на борту)
1. **Оба борта** — PioneerOS (Ubuntu 24.04.5), aarch64; одинаковые версии: pioneer_sdk2 0.16.0, pioneer_dds 0.4.0, pioneer_swarm 0.1.3, plazlink-server-rs 0.2.1, proto 2.0.2, pioneer-bricks 2.3.0, pioneer-rknn 1.10.0, rknn-toolkit-lite2 2.3.0.
2. **Цепочка**: автопилот → UART (Мини 2 `/dev/ttyS3`, Razero `/dev/ttyS4`, 115200) → `plazlink-server-rs` (TCP 20556, служба plazlink-core) → `pioneer_sdk2` (`Pioneer()` подключается к `127.0.0.1:20556`) → swarm-server (DDS) / Bricks (порт 2020) / пользовательские программы.
3. **`board_config.json`** решает, какие модули SDK2 доступны. Razero: `gtlp_version 1`, `board_reboot true`, без ranger/grab/servo/flashlight, `cargo true`, одна камера main 1080×720@30. Мини 2: `gtlp_version 2`, `board_reboot false`, ranger/grab/servo(−80..30), камеры main (1080×720 для программы, запись до 4K) и opt 1280×800@60, `recorder true`, `cargo false`.
4. **Значения `Event`** настоящего SDK: ALL 0, NULL 1, COPTER_LANDED 3, LOW_VOLTAGE1 4, LOW_VOLTAGE2 5, POINT_REACHED 6, POINT_DECELERATION 7, TAKEOFF_COMPLETE 8, ENGINES_STARTED 9, SHOCK 10, LOW_CHARGE 11, DISARM 12.
5. **232 параметра автопилота** (Мини 2) с именами и значениями. Параметра `Copter_com_takeoffAlt` не существует: высота взлёта — `Flight_com_takeoffAlt` (0.5). `Flight_com_navSystem` = 2 (OPT). RC-режимы по умолчанию: `Copter_man_rcMode0/1/2` = 1/2/4, `Copter_flyWithoutRc` = 1, `SensorMux_rc` = 0.
6. **Протокол Plazlink** (расшифрован из работающего `proto`): 11 компонентов и 178 полей автопилота (имя, тип, флаги, масштаб, границы), таблица «поле SDK → компонент» (`HUB_MAP`), номера сообщений, `BoardState` (DISARM 0, ARM 1, TAKEOFF 2, RTL 3, LAND 4), `ManualSpeedMode` (GLOBAL 0, BODY 1), коды ответов `Result`, системные команды (калибровки, 18 перезагрузка, 19 bootloader, 20 IMU self-test), типы БПЛА (12 = GeoScan Pioneer).
7. **Службы и порты Мини 2:** plazlink 20556, Bricks 2020, web-меню 9090, code-server 9999, model-registry 7777, dufs (записи) 5000, mediamtx RTSP 8554 / WebRTC 8889 / API 9997, gRPC 50051, pm2-ctrl 17222, pm2-test-server 4000.
8. **Рой/ROS 2**: `swarm-server` публикует в DDS (Fast DDS 2.14) топики из `configs/type/aero.json` (navigation/local/position|velocity|yaw, sensors/imu|altitude|battery_state, flight/callback_event) и принимает сервисы flight/arm, disarm, takeoff, land, go_to_local_point, go_to_global_point, set_yaw, payload/grab, payload/led/set; `swarm_msgs`: Heartbeat, NamespaceConfig, TopicConfig; `gs_interfaces`: 8 msg и 13 srv.
9. **Сбой «Борт не поддерживается»** на Razero — не ошибка программы, а выбор не того UART скриптом `select_uart.py` (таймаут 3 с). Решено не воспроизводить: вендор исправит.
10. **Bricks 2.3.0:** сервер лишь запускает готовый Python; генерация кода — во фронтенде (`dist/`); список блоков в симе совпадает по составу.
11. Базовые показания Мини 2 на земле: батарея 7,33 В (температура 30), ориентация (−0.89, 3.07, 0.0)°, accel (0.053, −0.015, 1.0), gyro (0.008, 0.002, −0.004), `get_mag` (17.52, 0, −0.001), ranger None×5 без модуля.

## 2. Что уже встроено в симулятор
- Значения `Event` и словарь из 232 параметров SDK2; переименование `Copter_com_takeoffAlt` → `Flight_com_takeoffAlt` (код, миссии, примеры, справочники, книга).
- Профиль Razero из `board_config.json` (данные в `public/modules/python/board-configs.ts`): без Ranger/захвата, `gtlp_version 1`, разрешён `reboot_board`, навигация OPT.
- Округление ручной скорости как у SDK (см/с, сотые доли град/с, мс).
- Тесты: SDK2, ROS2, рой, примеры книги — 450 тестов зелёные.

## 3. Что встраиваем дальше (решения)
| № | Что | Где |
|---|---|---|
| 1 | База протокола Plazlink (компоненты, поля, коды) как данные + тест на соответствие снятому JSON | `public/modules/hardware/plazlink/protocol-db.ts` |
| 2 | Конфиг Мини 2 рядом с Razero (`MINI2_BOARD_CONFIG`) и справочник служб/портов в документации | `board-configs.ts`, `docs/` |
| 3 | Книга: исправить имена параметров и значения Event; добавить сведения о бортах (конфиг, цепочка связи, порты, DDS), приложение «Протокол Plazlink» | `book/tex/` |
| 4 | Интерактивный учебник: новые задания по реальным параметрам, события, различиям бортов | `public/modules/ui/mission-guide/` |
| 5 | Не делаем: воспроизведение ошибки «Борт не поддерживается»; физика полёта (нет на диске); модели RKNN |  |
