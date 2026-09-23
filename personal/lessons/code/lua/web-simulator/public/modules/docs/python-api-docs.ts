import type { ApiDoc } from './api-docs-types.js';

export const pythonApiDocs: Record<string, ApiDoc> = {
    'Pioneer.arm': {
        desc: 'Запуск моторов квадрокоптера.',
        syntax: 'pioneer.arm() -> bool',
        params: 'none',
        returns: 'bool',
        example: 'pioneer.arm()',
        kind: 'Method',
        insertText: 'arm()'
    },
    'Pioneer.disarm': {
        desc: 'Отключение моторов квадрокоптера.',
        syntax: 'pioneer.disarm() -> bool',
        params: 'none',
        returns: 'bool',
        example: 'pioneer.disarm()',
        kind: 'Method',
        insertText: 'disarm()'
    },
    'Pioneer.takeoff': {
        desc: 'Команда взлета на высоту takeoffAlt, заданную в параметрах автопилота.',
        syntax: 'pioneer.takeoff() -> bool',
        params: 'none',
        returns: 'bool',
        example: 'pioneer.takeoff()',
        kind: 'Method',
        insertText: 'takeoff()',
        aliases: ['взлет', 'взлететь', 'старт', 'takeoff']
    },
    'Pioneer.land': {
        desc: 'Команда посадки.',
        syntax: 'pioneer.land() -> bool',
        params: 'none',
        returns: 'bool',
        example: 'pioneer.land()',
        kind: 'Method',
        insertText: 'land()',
        aliases: ['посадка', 'приземление', 'сесть', 'landing', 'land']
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
        aliases: ['лететь в точку', 'точка', 'маршрут', 'goto']
    },
    'Pioneer.go_to_local_point_body_fixed': {
        desc: 'Полет в точку в системе координат самого дрона, body-fixed.',
        syntax: 'pioneer.go_to_local_point_body_fixed(x, y, z, yaw) -> bool',
        params: 'x, y, z (м), yaw (радианы)',
        returns: 'bool',
        example: 'pioneer.go_to_local_point_body_fixed(x=0, y=0, z=1, yaw=0)',
        kind: 'Method',
        insertText: 'go_to_local_point_body_fixed(x=${1:x}, y=${2:y}, z=${3:z}, yaw=${4:yaw})'
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
        insertText: 'set_manual_speed(vx=${1:vx}, vy=${2:vy}, vz=${3:vz}, yaw_rate=${4:yaw_rate})'
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
        desc: 'Расстояние до поверхности прямо под дроном: до земли, крыши дома или крыши едущего поезда.',
        syntax: 'pioneer.get_dist_sensor_data(get_last_received=True) -> float|None',
        params: 'get_last_received (bool)',
        returns: 'meters или None',
        example: 'd = pioneer.get_dist_sensor_data()',
        kind: 'Method',
        insertText: 'get_dist_sensor_data(get_last_received=${1:True})'
    },
    'Pioneer.get_battery_status': {
        desc: 'Статус батареи, обычно напряжение.',
        syntax: 'pioneer.get_battery_status(get_last_received=True) -> float|None',
        params: 'get_last_received (bool)',
        returns: 'voltage или None',
        example: 'v = pioneer.get_battery_status()',
        kind: 'Method',
        insertText: 'get_battery_status(get_last_received=${1:True})'
    },
    'Pioneer.get_autopilot_state': {
        desc: 'Текущее состояние автопилота.',
        syntax: 'pioneer.get_autopilot_state() -> str',
        params: 'none',
        returns: 'str',
        example: 'print(pioneer.get_autopilot_state())',
        kind: 'Method',
        insertText: 'get_autopilot_state()'
    },
    'Pioneer.led_control': {
        desc: 'Управление RGB-светодиодами.',
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
        insertText: 'send_rc_channels(channel_1=${1:1500}, channel_2=${2:1500}, channel_3=${3:1500}, channel_4=${4:1500})'
    },
    'Pioneer.lua_script_control': {
        desc: 'Запуск или остановка сохраненного Lua-скрипта на выбранном дроне.',
        syntax: 'pioneer.lua_script_control(command) -> bool',
        params: 'command ("Start" | "Stop")',
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
