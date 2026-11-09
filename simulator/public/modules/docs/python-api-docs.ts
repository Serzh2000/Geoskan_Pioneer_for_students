import type { ApiDoc } from './api-docs-types.js';

export const pythonApiDocs: Record<string, ApiDoc> = {
    'Pioneer.arm': {
        desc: 'Запуск моторов квадрокоптера.',
        syntax: 'pioneer.arm() -> bool',
        params: 'none',
        returns: 'bool',
        example: 'pioneer.arm()',
        kind: 'Method',
        insertText: 'arm()',
        direction: 'to-autopilot'
    },
    'Pioneer.disarm': {
        desc: 'Отключение моторов квадрокоптера.',
        syntax: 'pioneer.disarm() -> bool',
        params: 'none',
        returns: 'bool',
        example: 'pioneer.disarm()',
        kind: 'Method',
        insertText: 'disarm()',
        direction: 'to-autopilot'
    },
    'Pioneer.takeoff': {
        desc: 'Команда взлета на высоту takeoffAlt, заданную в параметрах автопилота.',
        syntax: 'pioneer.takeoff() -> bool',
        params: 'none',
        returns: 'bool',
        example: 'pioneer.takeoff()',
        kind: 'Method',
        insertText: 'takeoff()',
        aliases: ['взлет', 'взлететь', 'старт', 'takeoff'],
        direction: 'to-autopilot'
    },
    'Pioneer.land': {
        desc: 'Команда посадки.',
        syntax: 'pioneer.land() -> bool',
        params: 'none',
        returns: 'bool',
        example: 'pioneer.land()',
        kind: 'Method',
        insertText: 'land()',
        aliases: ['посадка', 'приземление', 'сесть', 'landing', 'land'],
        direction: 'to-autopilot'
    },
    'Pioneer.connected': {
        desc: 'Проверить, есть ли связь с дроном. В симуляторе всегда True.',
        syntax: 'pioneer.connected() -> bool',
        params: 'none',
        returns: 'bool',
        example: 'if pioneer.connected():\n    print("связь есть")',
        kind: 'Method',
        insertText: 'connected()'
    },
    'Pioneer.close_connection': {
        desc: 'Закрыть MAVLink-соединение. В симуляторе может быть заглушкой.',
        syntax: 'pioneer.close_connection()',
        params: 'none',
        returns: 'nil',
        example: 'pioneer.close_connection()',
        kind: 'Method',
        insertText: 'close_connection()'
    },
    'Pioneer.go_to_local_point': {
        desc: 'Полет в точку в локальной системе координат сцены, в метрах.',
        syntax: 'pioneer.go_to_local_point(x=None, y=None, z=None, yaw=None) -> bool',
        params: 'x, y, z (м), yaw (радианы, опционально)',
        returns: 'bool',
        example: 'pioneer.go_to_local_point(x=1, y=1, z=1, yaw=0)',
        kind: 'Method',
        insertText: 'go_to_local_point(x=${1:x}, y=${2:y}, z=${3:z}, yaw=${4:yaw})',
        aliases: ['лететь в точку', 'точка', 'маршрут', 'goto'],
        direction: 'to-autopilot'
    },
    'Pioneer.go_to_local_point_body_fixed': {
        desc: 'Полет в точку в системе координат самого дрона, body-fixed.',
        syntax: 'pioneer.go_to_local_point_body_fixed(x, y, z, yaw) -> bool',
        params: 'x, y, z (м), yaw (радианы)',
        returns: 'bool',
        example: 'pioneer.go_to_local_point_body_fixed(x=0, y=0, z=1, yaw=0)',
        kind: 'Method',
        insertText: 'go_to_local_point_body_fixed(x=${1:x}, y=${2:y}, z=${3:z}, yaw=${4:yaw})',
        direction: 'to-autopilot'
    },
    'Pioneer.point_reached': {
        desc: 'Latch-флаг достижения новой точки. Сбрасывается после вызова.',
        syntax: 'pioneer.point_reached() -> bool',
        params: 'none',
        returns: 'bool',
        example: 'if pioneer.point_reached():\n    print("reached")',
        kind: 'Method',
        insertText: 'point_reached()'
    },
    'Pioneer.set_manual_speed': {
        desc: 'Полет с заданной скоростью. Команду нужно отправлять постоянно.',
        syntax: 'pioneer.set_manual_speed(vx, vy, vz, yaw_rate) -> bool',
        params: 'vx, vy, vz (м/с), yaw_rate (рад/с)',
        returns: 'bool',
        example: 'pioneer.set_manual_speed(vx=0, vy=1, vz=0, yaw_rate=0)',
        kind: 'Method',
        insertText: 'set_manual_speed(vx=${1:vx}, vy=${2:vy}, vz=${3:vz}, yaw_rate=${4:yaw_rate})',
        direction: 'to-autopilot'
    },
    'Pioneer.get_local_position_lps': {
        desc: 'Текущие координаты в локальной системе позиционирования LPS.',
        syntax: 'pioneer.get_local_position_lps(get_last_received=True) -> list|None',
        params: 'get_last_received (bool)',
        returns: '[x, y, z] или None',
        example: 'pos = pioneer.get_local_position_lps()',
        kind: 'Method',
        insertText: 'get_local_position_lps(get_last_received=${1:True})'
    },
    'Pioneer.get_dist_sensor_data': {
        desc: 'Расстояние до поверхности прямо под дроном: до земли, крыши дома или крыши едущего поезда. В настоящем SDK при get_last_received=False метод возвращает None, пока нет нового измерения; в симуляторе измерение есть всегда.',
        syntax: 'pioneer.get_dist_sensor_data(get_last_received=True) -> float|None',
        params: 'get_last_received (bool)',
        returns: 'meters или None',
        example: 'd = pioneer.get_dist_sensor_data()',
        kind: 'Method',
        insertText: 'get_dist_sensor_data(get_last_received=${1:True})'
    },
    'Pioneer.get_battery_status': {
        desc: 'Напряжение батареи в вольтах (у заряженной литий-полимерной батареи около 4.2 В на банку; чем ниже, тем меньше заряд).',
        syntax: 'pioneer.get_battery_status(get_last_received=True) -> float|None',
        params: 'get_last_received (bool)',
        returns: 'voltage или None',
        example: 'v = pioneer.get_battery_status()',
        kind: 'Method',
        insertText: 'get_battery_status(get_last_received=${1:True})'
    },
    'Pioneer.get_yaw': {
        desc: 'Курс дрона в радианах. Есть в pioneer_sdk 0.6.1 (GitFlic) и работает только с Pioneer(simulator=True).',
        syntax: 'pioneer.get_yaw(get_last_received=True) -> float|None',
        params: 'get_last_received (bool)',
        returns: 'yaw (радианы) или None',
        example: 'yaw = pioneer.get_yaw(get_last_received=True)',
        kind: 'Method',
        insertText: 'get_yaw(get_last_received=${1:True})'
    },
    'Pioneer.cargo_grab': {
        desc: 'Включить магнит захвата груза. Есть в pioneer_sdk 0.6.1 (GitFlic) и работает только с Pioneer(simulator=True).',
        syntax: 'pioneer.cargo_grab() -> bool',
        params: 'none',
        returns: 'bool',
        example: 'pioneer.cargo_grab()',
        kind: 'Method',
        insertText: 'cargo_grab()'
    },
    'Pioneer.cargo_release': {
        desc: 'Выключить магнит и отпустить груз. Есть в pioneer_sdk 0.6.1 (GitFlic) и работает только с Pioneer(simulator=True).',
        syntax: 'pioneer.cargo_release() -> bool',
        params: 'none',
        returns: 'bool',
        example: 'pioneer.cargo_release()',
        kind: 'Method',
        insertText: 'cargo_release()'
    },
    'Pioneer.cargo_set': {
        desc: 'True — захватить груз, False — отпустить. Есть в pioneer_sdk 0.6.1 (GitFlic), только с Pioneer(simulator=True).',
        syntax: 'pioneer.cargo_set(grab) -> bool',
        params: 'grab (bool)',
        returns: 'bool',
        example: 'pioneer.cargo_set(True)',
        kind: 'Method',
        insertText: 'cargo_set(${1:True})'
    },
    'Pioneer.get_autopilot_state': {
        desc: 'Текущее состояние автопилота (строка): DISARMED — двигатели выключены; ARMED — подготовка принята (после arm()); TAKEOFF — взлёт; MISSION — полёт; LANDING — посадка.',
        syntax: 'pioneer.get_autopilot_state() -> str',
        params: 'none',
        returns: 'str',
        example: 'print(pioneer.get_autopilot_state())',
        kind: 'Method',
        insertText: 'get_autopilot_state()'
    },
    'Pioneer.led_control': {
        desc: 'Управление RGB-светодиодами. Цвет складывается из трёх каналов: красного (r), зелёного (g) и синего (b); каждый — целое число от 0 (канал выключен) до 255 (максимум). Белый — все три на 255, выключенный светодиод — все три на 0. led_id — номер светодиода (счёт с 0), 255 означает «все сразу». Возвращает True, если команда принята.',
        syntax: 'pioneer.led_control(led_id=255, r=0, g=0, b=0) -> bool',
        params: 'led_id (255 = все; 0..3 = LED 1..4), r,g,b (0..255)',
        returns: 'bool',
        example: 'pioneer.led_control(led_id=255, r=255, g=0, b=0)',
        kind: 'Method',
        insertText: 'led_control(led_id=${1:255}, r=${2:r}, g=${3:g}, b=${4:b})'
    },
    'Pioneer.send_rc_channels': {
        desc: 'Имитация приема значений по каналам пульта управления.',
        syntax: 'pioneer.send_rc_channels(channel_1..channel_8) -> bool',
        params: 'channel_1..channel_8 (int)',
        returns: 'bool',
        example: 'pioneer.send_rc_channels(channel_1=1500, channel_2=1500, channel_3=1500, channel_4=1500)',
        kind: 'Method',
        insertText: 'send_rc_channels(channel_1=${1:1500}, channel_2=${2:1500}, channel_3=${3:1500}, channel_4=${4:1500})',
        direction: 'to-autopilot'
    },
    'Pioneer.lua_script_control': {
        desc: 'Запуск или остановка сохраненного Lua-скрипта на выбранном дроне.',
        syntax: 'pioneer.lua_script_control(state=\'Stop\') -> bool',
        params: 'state ("Start" | "Stop"); другое значение вызывает ValueError',
        returns: 'bool',
        example: 'pioneer.lua_script_control("Start")',
        kind: 'Method',
        insertText: 'lua_script_control(${1:"Start"})'
    },

    // Camera
    'Camera.get_frame': {
        desc: 'Получить кадр как массив байтов.',
        syntax: 'camera.get_frame() -> bytes|None',
        params: 'none',
        returns: 'bytes или None',
        example: 'frame = camera.get_frame()',
        kind: 'Method',
        insertText: 'get_frame()'
    },
    'Camera.get_cv_frame': {
        desc: 'Получить предварительно декодированный кадр в формате OpenCV.',
        syntax: 'camera.get_cv_frame() -> frame',
        params: 'none',
        returns: 'frame',
        example: 'img = camera.get_cv_frame()',
        kind: 'Method',
        insertText: 'get_cv_frame()'
    },
    'Camera.connect': {
        desc: 'Подключить камеру к ближайшей видеовышке в зоне действия симулятора.',
        syntax: 'camera.connect() -> bool',
        params: 'none',
        returns: 'bool',
        example: 'camera.connect()',
        kind: 'Method',
        insertText: 'connect()'
    },
    'Camera.disconnect': {
        desc: 'Отключить камеру от текущей видеовышки.',
        syntax: 'camera.disconnect() -> bool',
        params: 'none',
        returns: 'bool',
        example: 'camera.disconnect()',
        kind: 'Method',
        insertText: 'disconnect()'
    },
    'Camera.connected': {
        desc: 'Проверить, подключена ли камера к видеовышке в данный момент.',
        syntax: 'camera.connected() -> bool',
        params: 'none',
        returns: 'bool',
        example: 'camera.connected()',
        kind: 'Method',
        insertText: 'connected()'
    },
    'VideoStream.start': {
        desc: 'Запустить совместимый video-stream wrapper поверх камеры симулятора.',
        syntax: 'await stream.start()',
        params: 'none',
        returns: 'None',
        example: 'stream.start()',
        kind: 'Method',
        insertText: 'start()'
    },
    'VideoStream.stop': {
        desc: 'Остановить video-stream wrapper.',
        syntax: 'await stream.stop()',
        params: 'none',
        returns: 'None',
        example: 'stream.stop()',
        kind: 'Method',
        insertText: 'stop()'
    },
    'VideoStream.connected': {
        desc: 'Проверить состояние подключения video-stream wrapper.',
        syntax: 'stream.connected() -> bool',
        params: 'none',
        returns: 'bool',
        example: 'stream.connected()',
        kind: 'Method',
        insertText: 'connected()'
    },
    'Pioneer.get_optical_flow': {
        desc: "Датчик оптического потока (как PMW3901): как быстро поверхность под дроном «уезжает» в кадре. Над едущим поездом показывает движение относительно крыши: если дрон держится ровно над ней, поток близок к нулю. Шумит; качество падает ниже 8 см и выше 3 м. Скорость относительно поверхности: v = (flow - вращение) * высота.",
        syntax: "pioneer.get_optical_flow() -> (flow_x, flow_y, quality)",
        params: "нет",
        returns: "flow_x, flow_y (рад/с, оси дрона: x - вперёд, y - вправо), quality (0..255)",
        example: "fx, fy, q = pioneer.get_optical_flow()\nh = pioneer.get_dist_sensor_data()\nif q > 100:\n    v_forward = fx * h  # м/с относительно поверхности",
        kind: "Method",
        insertText: "get_optical_flow()"
    },
    'Pioneer.set_manual_speed_body_fixed': {
        desc: 'Полёт с заданной скоростью в осях самого дрона: vx вперёд, vy вправо. Команду нужно отправлять постоянно.',
        syntax: 'pioneer.set_manual_speed_body_fixed(vx, vy, vz, yaw_rate) -> bool',
        params: 'vx, vy, vz (м/с), yaw_rate (рад/с)',
        returns: 'bool',
        example: 'pioneer.set_manual_speed_body_fixed(vx=0.5, vy=0, vz=0, yaw_rate=0)',
        kind: 'Method',
        insertText: 'set_manual_speed_body_fixed(vx=${1:vx}, vy=${2:vy}, vz=${3:vz}, yaw_rate=${4:yaw_rate})',
        direction: 'to-autopilot'
    },
    'Pioneer.get_optical_data': {
        desc: 'Данные датчика оптического потока в формате настоящего SDK (сообщение OPTICAL_FLOW_RAD): интегральные значения за 20 мс, расстояние до поверхности и качество. В симуляторе строятся из тех же измерений, что и get_optical_flow().',
        syntax: 'pioneer.get_optical_data(get_last_received=False) -> dict',
        params: 'get_last_received (bool)',
        returns: '{\'integration_time_us\', \'integrated_x\', \'integrated_y\', \'distance\', \'integrated_xgyro\', \'integrated_ygyro\', \'integrated_zgyro\', \'temperature\', \'quality\'}',
        example: 'data = pioneer.get_optical_data()\nprint(data[\'quality\'], data[\'distance\'])',
        kind: 'Method',
        insertText: 'get_optical_data()',
        aliases: ['оптический поток', 'optical flow']
    },
    'Pioneer.get_preflight_state': {
        desc: 'Результат предстартовой проверки автопилота: словарь флагов BatteryLow, NavSystem, Area, Attitude, RcExpected, RcMode, RcUnexpected, UavStartAllowed. Ненулевое значение означает, что флаг поднят. В симуляторе проблем нет, UavStartAllowed поднят, пока моторы выключены.',
        syntax: 'pioneer.get_preflight_state() -> dict',
        params: 'нет',
        returns: '{\'BatteryLow\': 0, ..., \'UavStartAllowed\': 128}',
        example: 'state = pioneer.get_preflight_state()\nprint(state[\'UavStartAllowed\'])',
        kind: 'Method',
        insertText: 'get_preflight_state()'
    },
    'Pioneer.get_autopilot_version': {
        desc: 'Версия автопилота: [версия прошивки, версия платы, пользовательская версия]. В симуляторе значения постоянные.',
        syntax: 'pioneer.get_autopilot_version() -> list',
        params: 'нет',
        returns: '[flight_sw_version, board_version, flight_custom_version]',
        example: 'print(pioneer.get_autopilot_version())',
        kind: 'Method',
        insertText: 'get_autopilot_version()'
    },
    'Pioneer.lua_script_upload': {
        desc: 'Загрузить Lua-скрипт в память дрона (на настоящем дроне он компилируется и записывается по MAVLink FTP). Запускается он командой lua_script_control("Start"). В симуляторе текст сохраняется как скрипт этого дрона.',
        syntax: 'pioneer.lua_script_upload(lua_source)',
        params: 'lua_source (str) - текст Lua-программы',
        returns: 'None',
        example: 'pioneer.lua_script_upload(\'print("привет")\')\npioneer.lua_script_control("Start")',
        kind: 'Method',
        insertText: 'lua_script_upload(${1:lua_source})'
    },
    'Pioneer.reboot_board': {
        desc: 'Перезагрузить полётный контроллер. В симуляторе моторы выключаются, как после disarm().',
        syntax: 'pioneer.reboot_board() -> bool',
        params: 'нет',
        returns: 'bool',
        example: 'pioneer.reboot_board()',
        kind: 'Method',
        insertText: 'reboot_board()',
        direction: 'to-autopilot'
    },
    'Pioneer.raspberry_poweroff': {
        desc: 'Выключить бортовой Raspberry Pi. В симуляторе команда принимается и ничего не меняет.',
        syntax: 'pioneer.raspberry_poweroff() -> bool',
        params: 'нет',
        returns: 'bool',
        example: 'pioneer.raspberry_poweroff()',
        kind: 'Method',
        insertText: 'raspberry_poweroff()'
    },
    'Pioneer.raspberry_reboot': {
        desc: 'Перезагрузить бортовой Raspberry Pi. В симуляторе команда принимается и ничего не меняет.',
        syntax: 'pioneer.raspberry_reboot() -> bool',
        params: 'нет',
        returns: 'bool',
        example: 'pioneer.raspberry_reboot()',
        kind: 'Method',
        insertText: 'raspberry_reboot()'
    },
    'Pioneer.raspberry_led_custom': {
        desc: 'Задать подсветку на дроне с Raspberry Pi: режим, период и два цвета (r, g, b). В симуляторе команда принимается и ничего не меняет.',
        syntax: 'pioneer.raspberry_led_custom(mode=1, timer=0, color1=(0, 0, 0), color2=(0, 0, 0)) -> bool',
        params: 'mode (int), timer (int), color1 и color2 (кортежи r, g, b)',
        returns: 'bool',
        example: 'pioneer.raspberry_led_custom(mode=1, timer=0, color1=(255, 0, 0), color2=(0, 0, 255))',
        kind: 'Method',
        insertText: 'raspberry_led_custom(mode=${1:1}, timer=${2:0}, color1=${3:(255, 0, 0)}, color2=${4:(0, 0, 255)})'
    },
    'Pioneer.raspberry_start_capture': {
        desc: 'Запустить съёмку камерой Raspberry Pi: интервал между кадрами, число кадров (0 - снимать до остановки) и номер серии. В симуляторе команда принимается и ничего не меняет.',
        syntax: 'pioneer.raspberry_start_capture(interval=0.1, total_images=0, sequence_number=0) -> bool',
        params: 'interval (с), total_images (int), sequence_number (int)',
        returns: 'bool',
        example: 'pioneer.raspberry_start_capture(interval=0.5, total_images=10)',
        kind: 'Method',
        insertText: 'raspberry_start_capture(interval=${1:0.1}, total_images=${2:0})'
    },
    'Pioneer.raspberry_stop_capture': {
        desc: 'Остановить съёмку камерой Raspberry Pi. В симуляторе команда принимается и ничего не меняет.',
        syntax: 'pioneer.raspberry_stop_capture() -> bool',
        params: 'нет',
        returns: 'bool',
        example: 'pioneer.raspberry_stop_capture()',
        kind: 'Method',
        insertText: 'raspberry_stop_capture()'
    },
    'Pioneer.set_logger': {
        desc: 'Включить или выключить сообщения библиотеки (печать вида «[pioneer] ...»).',
        syntax: 'pioneer.set_logger(value=True)',
        params: 'value (bool)',
        returns: 'None',
        example: 'pioneer.set_logger(False)',
        kind: 'Method',
        insertText: 'set_logger(${1:False})'
    },
    'Pioneer.set_log_connection': {
        desc: 'Включить или выключить сообщения о состоянии соединения.',
        syntax: 'pioneer.set_log_connection(value=True)',
        params: 'value (bool)',
        returns: 'None',
        example: 'pioneer.set_log_connection(False)',
        kind: 'Method',
        insertText: 'set_log_connection(${1:False})'
    },
    'Pioneer.log': {
        desc: 'Напечатать сообщение библиотеки в том же формате, что и сам SDK: «[имя] сообщение».',
        syntax: 'pioneer.log(msg, msg_type=None)',
        params: 'msg (str), msg_type (str, необязательно)',
        returns: 'None',
        example: 'pioneer.log("готов")',
        kind: 'Method',
        insertText: 'log(${1:"сообщение"})'
    },
    'Pioneer.sta_connect': {
        desc: 'Настройка Wi-Fi модуля Пионера. Настройки Wi-Fi модуля ESP32 хранятся в памяти страницы до её перезагрузки; сети в симуляторе нет, поэтому подключение к чужой точке доступа всегда «успешно». Пароль плата отдаёт только в виде MD5-хеша.',
        syntax: 'pioneer.sta_connect(ssid, password)',
        params: 'ssid, password',
        returns: 'True/None; try_get_*: (ssid, MD5 пароля)',
        example: 'pioneer.sta_connect(ssid, password)',
        kind: 'Method',
        insertText: 'sta_connect(ssid, password)'
    },
    'Pioneer.sta_disconnect': {
        desc: 'Настройка Wi-Fi модуля Пионера. Настройки Wi-Fi модуля ESP32 хранятся в памяти страницы до её перезагрузки; сети в симуляторе нет, поэтому подключение к чужой точке доступа всегда «успешно». Пароль плата отдаёт только в виде MD5-хеша.',
        syntax: 'pioneer.sta_disconnect()',
        params: 'нет',
        returns: 'True/None; try_get_*: (ssid, MD5 пароля)',
        example: 'pioneer.sta_disconnect()',
        kind: 'Method',
        insertText: 'sta_disconnect()'
    },
    'Pioneer.ap_set_ssid': {
        desc: 'Настройка Wi-Fi модуля Пионера. Настройки Wi-Fi модуля ESP32 хранятся в памяти страницы до её перезагрузки; сети в симуляторе нет, поэтому подключение к чужой точке доступа всегда «успешно». Пароль плата отдаёт только в виде MD5-хеша.',
        syntax: 'pioneer.ap_set_ssid(ssid)',
        params: 'ssid',
        returns: 'True/None; try_get_*: (ssid, MD5 пароля)',
        example: 'pioneer.ap_set_ssid(ssid)',
        kind: 'Method',
        insertText: 'ap_set_ssid(ssid)'
    },
    'Pioneer.ap_set_password': {
        desc: 'Настройка Wi-Fi модуля Пионера. Настройки Wi-Fi модуля ESP32 хранятся в памяти страницы до её перезагрузки; сети в симуляторе нет, поэтому подключение к чужой точке доступа всегда «успешно». Пароль плата отдаёт только в виде MD5-хеша.',
        syntax: 'pioneer.ap_set_password(password)',
        params: 'password',
        returns: 'True/None; try_get_*: (ssid, MD5 пароля)',
        example: 'pioneer.ap_set_password(password)',
        kind: 'Method',
        insertText: 'ap_set_password(password)'
    },
    'Pioneer.send_sta_connect': {
        desc: 'Настройка Wi-Fi модуля Пионера. Настройки Wi-Fi модуля ESP32 хранятся в памяти страницы до её перезагрузки; сети в симуляторе нет, поэтому подключение к чужой точке доступа всегда «успешно». Пароль плата отдаёт только в виде MD5-хеша.',
        syntax: 'pioneer.send_sta_connect(ssid, password)',
        params: 'ssid, password',
        returns: 'True/None; try_get_*: (ssid, MD5 пароля)',
        example: 'pioneer.send_sta_connect(ssid, password)',
        kind: 'Method',
        insertText: 'send_sta_connect(ssid, password)'
    },
    'Pioneer.send_sta_disconnect': {
        desc: 'Настройка Wi-Fi модуля Пионера. Настройки Wi-Fi модуля ESP32 хранятся в памяти страницы до её перезагрузки; сети в симуляторе нет, поэтому подключение к чужой точке доступа всегда «успешно». Пароль плата отдаёт только в виде MD5-хеша.',
        syntax: 'pioneer.send_sta_disconnect()',
        params: 'нет',
        returns: 'True/None; try_get_*: (ssid, MD5 пароля)',
        example: 'pioneer.send_sta_disconnect()',
        kind: 'Method',
        insertText: 'send_sta_disconnect()'
    },
    'Pioneer.send_ap_ssid': {
        desc: 'Настройка Wi-Fi модуля Пионера. Настройки Wi-Fi модуля ESP32 хранятся в памяти страницы до её перезагрузки; сети в симуляторе нет, поэтому подключение к чужой точке доступа всегда «успешно». Пароль плата отдаёт только в виде MD5-хеша.',
        syntax: 'pioneer.send_ap_ssid(ssid)',
        params: 'ssid',
        returns: 'True/None; try_get_*: (ssid, MD5 пароля)',
        example: 'pioneer.send_ap_ssid(ssid)',
        kind: 'Method',
        insertText: 'send_ap_ssid(ssid)'
    },
    'Pioneer.send_ap_password': {
        desc: 'Настройка Wi-Fi модуля Пионера. Настройки Wi-Fi модуля ESP32 хранятся в памяти страницы до её перезагрузки; сети в симуляторе нет, поэтому подключение к чужой точке доступа всегда «успешно». Пароль плата отдаёт только в виде MD5-хеша.',
        syntax: 'pioneer.send_ap_password(password)',
        params: 'password',
        returns: 'True/None; try_get_*: (ssid, MD5 пароля)',
        example: 'pioneer.send_ap_password(password)',
        kind: 'Method',
        insertText: 'send_ap_password(password)'
    },
    'Pioneer.try_get_sta_status': {
        desc: 'Настройка Wi-Fi модуля Пионера. Настройки Wi-Fi модуля ESP32 хранятся в памяти страницы до её перезагрузки; сети в симуляторе нет, поэтому подключение к чужой точке доступа всегда «успешно». Пароль плата отдаёт только в виде MD5-хеша.',
        syntax: 'pioneer.try_get_sta_status()',
        params: 'нет',
        returns: 'True/None; try_get_*: (ssid, MD5 пароля)',
        example: 'pioneer.try_get_sta_status()',
        kind: 'Method',
        insertText: 'try_get_sta_status()'
    },
    'Pioneer.try_get_ap_status': {
        desc: 'Настройка Wi-Fi модуля Пионера. Настройки Wi-Fi модуля ESP32 хранятся в памяти страницы до её перезагрузки; сети в симуляторе нет, поэтому подключение к чужой точке доступа всегда «успешно». Пароль плата отдаёт только в виде MD5-хеша.',
        syntax: 'pioneer.try_get_ap_status()',
        params: 'нет',
        returns: 'True/None; try_get_*: (ssid, MD5 пароля)',
        example: 'pioneer.try_get_ap_status()',
        kind: 'Method',
        insertText: 'try_get_ap_status()'
    },
    'Pioneer.receive_wifi_config_ap': {
        desc: 'Настройка Wi-Fi модуля Пионера. Настройки Wi-Fi модуля ESP32 хранятся в памяти страницы до её перезагрузки; сети в симуляторе нет, поэтому подключение к чужой точке доступа всегда «успешно». Пароль плата отдаёт только в виде MD5-хеша.',
        syntax: 'pioneer.receive_wifi_config_ap()',
        params: 'нет',
        returns: 'True/None; try_get_*: (ssid, MD5 пароля)',
        example: 'pioneer.receive_wifi_config_ap()',
        kind: 'Method',
        insertText: 'receive_wifi_config_ap()'
    },
    'Vehicle': {
        desc: "Только в симуляторе: машина или поезд на сцене по названию из их настроек. from pioneer_sdk import Vehicle",
        syntax: "Vehicle(name)",
        params: "name (str) - например \"Поезд 1\"",
        returns: "объект Vehicle; если такого нет - VehicleError при первом вызове",
        example: "from pioneer_sdk import Vehicle\ntrain = Vehicle(\"Поезд 1\")",
        kind: "Class",
        insertText: "Vehicle(\"${1:Поезд 1}\")"
    },
    'Vehicle.start': {
        desc: "Только в симуляторе: трогает с места машину или поезд.",
        syntax: "vehicle.start() -> bool",
        params: "нет",
        returns: "True",
        example: "train.start()",
        kind: "Method",
        insertText: "start()"
    },
    'Vehicle.stop': {
        desc: "Только в симуляторе: плавно останавливает машину или поезд.",
        syntax: "vehicle.stop() -> bool",
        params: "нет",
        returns: "True",
        example: "train.stop()",
        kind: "Method",
        insertText: "stop()"
    },
    'Vehicle.set_speed': {
        desc: "Только в симуляторе: скорость машины или поезда, 0-15 м/с; разгон плавный.",
        syntax: "vehicle.set_speed(speed) -> bool",
        params: "speed (float, м/с)",
        returns: "True",
        example: "train.set_speed(3)",
        kind: "Method",
        insertText: "set_speed(${1:3})"
    },
    'Vehicle.get_state': {
        desc: "Только в симуляторе: истинное положение и скорость - для настройки сценария и проверки. В миссии слежения используйте камеру и оптический поток.",
        syntax: "vehicle.get_state() -> dict",
        params: "нет",
        returns: "{'x', 'y', 'z', 'heading', 'speed', 'moving', 'marker_id', ...}",
        example: "state = train.get_state()\nprint(state[\"x\"], state[\"y\"], state[\"speed\"])",
        kind: "Method",
        insertText: "get_state()"
    }
};
