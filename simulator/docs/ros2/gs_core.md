# Пакет gs_core (ROS 2 Jazzy) — справочник Геоскана

Источник: https://docs.geoscan.ru/pioneer/soft/pioneer-os/ros2/ (скопировано пользователем 10.11.2026; это эталон для эмуляции в симуляторе и для главы учебника).

Обеспечивает связь между полётным контроллером Geoscan и микрокомпьютером, публикует телеметрию борта в топики ROS и предоставляет сервисы управления полётом, параметрами автопилота и полезной нагрузкой.

## Описание пакета
Основная нода `ros_pioneer_node`: телеметрия борта в топики ROS, сервисы управления полётом, параметрами автопилота и полезной нагрузкой.

| Борт | Конфиг | Launch |
|---|---|---|
| Пионер Мини 2 | config/mini2.yaml | pioneer_mini2_full_launch.py |
| Пионер Базовый с модулем Razero | config/razero.yaml | pioneer_razero_full_launch.py |

### Установка
Пионер Мини 2 — мета-пакет `ros-jazzy-pioneer-mini2` (весь стек): `sudo apt update && sudo apt install ros-jazzy-pioneer-mini2`.
Пионер Базовый с Razero — `ros-jazzy-pioneer-razero`. Только пакет: `sudo apt install ros-jazzy-gs-core`.
Из исходников: сначала собрать `gs_interfaces`, затем `source /opt/ros/jazzy/setup.bash; cd ~/ros2_ws; colcon build --packages-select gs_core; source install/setup.bash`.
Нужен бортовой модуль `proto` версии 2.0.0+ (`sudo apt install proto`), без него узел не запустится.

### Состав пакета
- Ноды: `ros_pioneer_node`.
- Launch: `pioneer_mini2_full_launch.py` — ros_pioneer_node + camera_node / camera_servo из gs_camera (config/mini2.yaml); `pioneer_razero_full_launch.py` — ros_pioneer_node + camera_node из gs_camera (config/razero.yaml, без camera_servo).
- Конфигурация: config/mini2.yaml, config/razero.yaml.
- Нужны: Python `proto`; ROS `rclpy`, `gs_interfaces`, `geometry_msgs`, `sensor_msgs`, `std_msgs`, `std_srvs`; для launch ещё `gs_camera`.

### Запуск
```
ros2 launch gs_core pioneer_mini2_full_launch.py     # узел автопилота и обе камеры
ros2 launch gs_core pioneer_razero_full_launch.py    # узел автопилота и основная камера
ros2 run gs_core ros_pioneer_node --ros-args --params-file /path/to/mini2.yaml
```
Связь с автопилотом — TCP 127.0.0.1:20556.

## Параметры
Задаются YAML-файлом борта через `--ros-args --params-file` или `Node(parameters=[config])` в launch.

### Параметры борта
| Параметр | Тип | mini2 | razero | Описание |
|---|---|---|---|---|
| shortname | string | mini2 | razero | Каталог в resource/ с .properties навигации |
| board_reboot | bool | false | true | Перезагружать автопилот при старте ноды |
| board_name | string | Pioneer Mini 2 | Razero | Название борта |
| gtlp_version | int | 2 | 1 | Версия протокола обмена |
| grab | bool | true | false | Механический захват |
| cargo | bool | false | true | Магнитный захват груза |
| nav_system_change_in_flight | bool | false | true | Разрешить смену системы навигации в полёте |
| range_sensor.radiation_type | string | INFRARED | INFRARED | Тип излучения sensors/range: ULTRASOUND / INFRARED |
| range_sensor.min_range | float | 0.05 | 0.05 | Минимальная дистанция, м |
| range_sensor.max_range | float | 4.0 | 4.0 | Максимальная дистанция, м |
| range_sensor.field_of_view | float | 0.26 | 0.26 | Угол обзора, рад |

### Параметры топиков
`topics.*` включает/отключает создание паблишеров/подписок. false — топика нет. true, а модуля на борту нет — топик есть, но данные не публикуются.

| Параметр | mini2 | razero | Что включает |
|---|---|---|---|
| topics.imu | true | true | sensors/imu |
| topics.altitude | true | true | sensors/altitude |
| topics.range | true | true | sensors/range |
| topics.motors_rpm | true | false | sensors/motors_rpm |
| topics.battery | true | true | sensors/battery_state |
| topics.callback_event | true | true | flight/callback_event |
| topics.fly_state | true | true | flight/fly_state |
| topics.optical_flow | true | true | navigation/opt/velocity |
| topics.ranger | true | false | payload/ranger |
| topics.rc | true | true | rc/trigger и подписку rc/set_channels |
| topics.cmd_vel | true | true | подписку flight/cmd_vel |
| topics.gnss | false | false | navigation/global/*, navigation/satellites (в т.ч. global/status) |
| topics.lps | true | true | navigation/local/* (в т.ч. local/status) |

Что выключено в поставляемых конфигах: gnss (оба) — нет navigation/global/* и satellites; motors_rpm (razero) — нет sensors/motors_rpm; ranger (razero) — нет payload/ranger; grab (razero=false) — payload/grab вернёт отказ; cargo (mini2=false) — payload/cargo_set вернёт success: false; board_reboot (mini2=false) — автопилот не перезагружается при старте; nav_system_change_in_flight (mini2=false) — navigation/set_system в полёте отклоняется.

Включить GNSS: в yaml `ros_pioneer_node: ros__parameters: topics: gnss: true` либо `ros2 run gs_core ros_pioneer_node --ros-args --params-file /path/to/mini2.yaml -p topics.gnss:=true`.

## Сервисы
### Полёт
- `geoscan/flight/arm` (gs_interfaces/Arm) — запуск двигателей. Запрос: `timeout` (сек ожидания подтверждения), `retries`. `ros2 service call /geoscan/flight/arm gs_interfaces/srv/Arm "{timeout: 5, retries: 0}"`
- `geoscan/flight/takeoff` (std_srvs/Trigger) — взлёт.
- `geoscan/flight/land` (std_srvs/Trigger) — посадка.
- `geoscan/flight/disarm` (std_srvs/Trigger) — остановка двигателей.
- `geoscan/flight/rtl` (std_srvs/Trigger) — возврат домой.
- `geoscan/flight/go_to_local_point` (gs_interfaces/GoToLocalPoint) — полёт в локальную точку. `yaw` в градусах: если угол совпадает с предыдущим заданным (go_to_* или set_yaw), рыскание не меняется. `time` — время перехода, с. `frame_id`: `base_link` — оси коптера; `map` — мировые (локальные) оси. `ros2 service call /geoscan/flight/go_to_local_point gs_interfaces/srv/GoToLocalPoint "{x: 0.0, y: 0.0, z: 1.0, yaw: 0.0, time: 5, frame_id: 'map'}"`
- `geoscan/flight/go_to_global_point` (gs_interfaces/GoToGlobalPoint) — полёт в глобальную точку; yaw в градусах (та же логика). `frame_id`: `base_link` — смещение относительно текущей позиции (оси коптера); `map` — абсолютные GPS-координаты. Поля: latitude, longitude, altitude, yaw, frame_id.
- `geoscan/flight/set_yaw` (gs_interfaces/Yaw) — рыскание, `angle` в градусах.

### Борт и параметры
- `geoscan/alive` (gs_interfaces/Live) — статус соединения с автопилотом.
- `geoscan/board/restart` (std_srvs/Empty) — перезагрузка автопилота.
- `geoscan/board/get_param` (gs_interfaces/GetParam) — прочитать параметр; `update: true` перечитывает словарь параметров с борта. Поля: name, update.
- `geoscan/board/set_param` (gs_interfaces/SetParam) — записать параметр: name, value.
- `geoscan/board/get_parameters` (gs_interfaces/ParametersList) — все параметры; при ошибке status: false и пустой params.
- `geoscan/board/set_parameters` (gs_interfaces/SetParametersList) — записать несколько; `params: [{name, value}]` (сообщение gs_interfaces/Parameter).

### Навигация
- `geoscan/navigation/get_system` (gs_interfaces/NavigationSystem) — текущая система: GPS, LPS, OPT; при ошибке status: false и пустой navigation.
- `geoscan/navigation/set_system` (gs_interfaces/SetNavigationSystem) — `navigation: 'OPT'`; сменить систему нужно этим сервисом, а не через board/set_parameters; в полёте отклоняется при nav_system_change_in_flight: false.

## Топики
### Публикации
У MotorsRpm, PointGPS, SatellitesGPS, OptVelocity, RangerData поле header заполняется: stamp и frame_id=base_link.
- `geoscan/sensors/battery_state` (sensor_msgs/BatteryState) — напряжение и температура АКБ.
- `geoscan/flight/fly_state` (std_msgs/Int8) — состояние полёта.
- `geoscan/flight/callback_event` (std_msgs/Int8) — события автопилота.
- `geoscan/sensors/imu` (sensor_msgs/Imu) — accel, gyro, ориентация (кватернион из roll/pitch/yaw борта).
- `geoscan/sensors/altitude` (std_msgs/Float32) — высота по барометру.
- `geoscan/sensors/range` (sensor_msgs/Range) — дальномер; тип излучения, min_range/max_range/field_of_view из range_sensor.* конфига.
- `geoscan/sensors/motors_rpm` (gs_interfaces/MotorsRpm) — обороты четырёх моторов.
- `geoscan/navigation/local/position` (geometry_msgs/Point), `local/velocity` (geometry_msgs/Vector3), `local/yaw` (std_msgs/Float32), `local/status` (gs_interfaces/NavStatus) — локальные координаты, скорость, курс и статус LPS (NO_DATA=0, CANNOT=1, LOW=2, OK=3). При topics.lps: true.
- `geoscan/navigation/global/position` (gs_interfaces/PointGPS), `global/velocity` (geometry_msgs/Vector3), `global/status` (gs_interfaces/NavStatus), `geoscan/navigation/satellites` (gs_interfaces/SatellitesGPS) — GPS; коды статуса те же. По умолчанию выключены.
- `geoscan/navigation/opt/velocity` (gs_interfaces/OptVelocity) — оптический поток: x, y.
- `geoscan/rc/trigger` (std_msgs/Int32) — значение канала RC.
Топики полезной нагрузки — ниже.

### Подписки
- `geoscan/flight/cmd_vel` (geometry_msgs/TwistStamped) — управление скоростью: twist.linear.x/y/z — м/с, twist.angular.z — рад/с (лимит ±1.82; angular.x/y игнорируются). `header.frame_id`: `base_link` — оси коптера, `map` — мировые. Пустой/другой frame_id игнорируется с предупреждением в логе. Только при topics.cmd_vel: true. `ros2 topic pub --once /geoscan/flight/cmd_vel geometry_msgs/msg/TwistStamped "{header: {frame_id: 'base_link'}, twist: {linear: {x: 0.5, y: 0.0, z: 0.0}, angular: {z: 0.0}}}"`
- `geoscan/rc/set_channels` (gs_interfaces/RcChannels) — каналы channel_1 … channel_8; для удержания связи публиковать постоянно. Только при topics.rc: true.

## Полезная нагрузка
Модуль включается своим параметром. Выключен — сервис всё равно создаётся, но вызов вернёт отказ и запишет в лог, что модуль не поддерживается. Топик payload/ranger при выключенном параметре не создаётся вообще.

| Модуль | Параметр | mini2 | razero | Сервис / топик | Тип |
|---|---|---|---|---|---|
| Механический захват | grab | true | false | geoscan/payload/grab | gs_interfaces/Grab |
| Магнитный захват груза | cargo | false | true | geoscan/payload/cargo_set | std_srvs/SetBool |
| Ranger | topics.ranger | true | false | geoscan/payload/ranger | gs_interfaces/RangerData |
| LED модуль | — | всегда | всегда | geoscan/payload/led/set | gs_interfaces/Led |

- Механический захват: `action`: 0 — открыть, 1 — закрыть, 2 — остановить; `velocity` 0..100 (вне диапазона — false); `movement_time` с: при >0 вызов блокируется на это время и захват останавливается сам, при 0 движение до явной остановки; при action 2 оба поля игнорируются. `{movement_time: 2.0, velocity: 100, action: 1}`.
- Магнитный захват: `data: true` — захватить, false — отпустить; при cargo: false вернёт success: false.
- LED модуль: `mode`: PIXEL=0 — цвет каждого диода (индекс в leds = номер), FILL=1 — один цвет на всю ленту из leds[0] (на борт уходит id 255). BLINK/CHASE не реализованы. Компоненты ColorRGBA — 0.0..1.0. `period` для PIXEL/FILL не используется. `{mode: 1, leds: [{r: 0.0, g: 1.0, b: 0.0, a: 1.0}], period: 0.0}`.
- Ranger: right, left, front, back, above_below, метры; топик только при topics.ranger: true.

## Полезные команды
```
ros2 service list
ros2 service type <название_сервиса>
ros2 interface show <тип_сервиса>
ros2 param list
ros2 service call <service_name> <service_type> '{args_json}'
```
Сервис без аргументов можно вызывать без аргументов.

### Пример: полётный цикл
```
ros2 service call /geoscan/flight/arm gs_interfaces/srv/Arm "{timeout: 5, retries: 0}"
ros2 service call /geoscan/flight/takeoff std_srvs/srv/Trigger "{}"
ros2 service call /geoscan/flight/go_to_local_point gs_interfaces/srv/GoToLocalPoint "{x: 0.0, y: 0.0, z: 1.0, yaw: 0.0, time: 5, frame_id: 'map'}"
ros2 service call /geoscan/flight/land std_srvs/srv/Trigger "{}"
ros2 service call /geoscan/flight/disarm std_srvs/srv/Trigger "{}"
```
