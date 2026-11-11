import type { ApiDoc } from './api-docs-types.js';
import { interfaceShow, ROS2_MSGS, ROS2_SRVS } from '../python/ros2/interfaces.js';

/*
 * Справочник ROS 2 для Пионера Мини 2 и Базового с Radxa (язык «Python · SDK2»): клиентская библиотека rclpy,
 * сервисы и топики пакета gs_core, типы сообщений. Источник - docs/ros2/gs_core.md (docs.geoscan.ru); допущения
 * там, где справочник Геоскана молчит, - в docs/ros2/emulation-notes.md. Тексты `syntax` типов строятся из
 * ros2/interfaces.ts, поэтому совпадают с `ros2 interface show`.
 */

type Entry = [desc: string, syntax: string, params: string, returns: string, example: string, insertText: string, aliases?: string[]];

function entry([desc, syntax, params, returns, example, insertText, aliases]: Entry, kind: string, direction?: ApiDoc['direction']): ApiDoc {
    return { desc, syntax, params, returns, example, insertText, kind, ...(aliases ? { aliases } : {}), ...(direction ? { direction } : {}) };
}

const SERVICE_PRE = 'import rclpy\nfrom rclpy.node import Node\n';
const CALL = 'future = client.call_async(request)\nrclpy.spin_until_future_complete(node, future)\nresult = future.result()';

type ServiceRow = { name: string; type: string; desc: string; fields: string; returns: string; request: string; alias: string[]; command?: boolean };

const SERVICES: ServiceRow[] = [
    { name: '/geoscan/flight/arm', type: 'gs_interfaces/srv/Arm', desc: 'Запуск двигателей. timeout - сколько секунд ждать подтверждения запуска, retries - сколько раз повторить попытку. Каждая неудачная попытка занимает timeout секунд времени симуляции.', fields: 'timeout (float, с), retries (int)', returns: 'success: True, если моторы запущены', request: 'Arm.Request(timeout=5.0, retries=0)', alias: ['arm', 'моторы', 'запуск'], command: true },
    { name: '/geoscan/flight/takeoff', type: 'std_srvs/srv/Trigger', desc: 'Взлёт. Сервис возвращается, когда команда принята, не когда взлёт закончен: окончание - событие TAKEOFF_COMPLETE (7) в flight/callback_event и fly_state = 2.', fields: 'нет', returns: 'success, message', request: 'Trigger.Request()', alias: ['взлет'], command: true },
    { name: '/geoscan/flight/land', type: 'std_srvs/srv/Trigger', desc: 'Посадка. Команда принимается в воздухе; окончание - событие COPTER_LANDED (2) и fly_state = 0.', fields: 'нет', returns: 'success, message', request: 'Trigger.Request()', alias: ['посадка'], command: true },
    { name: '/geoscan/flight/disarm', type: 'std_srvs/srv/Trigger', desc: 'Остановка двигателей. В воздухе дрон упадёт: вызывайте после посадки.', fields: 'нет', returns: 'success, message', request: 'Trigger.Request()', alias: ['disarm', 'моторы'], command: true },
    { name: '/geoscan/flight/rtl', type: 'std_srvs/srv/Trigger', desc: 'Возврат домой. Работает только в воздухе.', fields: 'нет', returns: 'success, message', request: 'Trigger.Request()', alias: ['rtl', 'домой'], command: true },
    { name: '/geoscan/flight/go_to_local_point', type: 'gs_interfaces/srv/GoToLocalPoint', desc: 'Полёт в локальную точку. yaw - градусы: если угол совпадает с предыдущим заданным (go_to_* или set_yaw), рыскание не меняется. time - время перехода, с (0 - как получится). frame_id: "map" - мировые (локальные) оси, "base_link" - оси коптера (x вперёд, y влево, z вверх). Команда принимается только в воздухе. Окончание - событие POINT_REACHED (5).', fields: 'x, y, z (float, м), yaw (float, градусы), time (float, с), frame_id (string: "map" или "base_link")', returns: 'success', request: 'GoToLocalPoint.Request(x=1.0, y=0.0, z=1.0, yaw=0.0, time=0.0, frame_id="map")', alias: ['точка', 'полёт'], command: true },
    { name: '/geoscan/flight/go_to_global_point', type: 'gs_interfaces/srv/GoToGlobalPoint', desc: 'Полёт в глобальную точку (GPS). frame_id: "base_link" - смещение от текущей позиции, "map" - абсолютные координаты. В симуляторе модуля GNSS нет: сервис отвечает success: False и пишет причину в журнал.', fields: 'latitude, longitude, altitude (float64), yaw (градусы), frame_id', returns: 'success', request: 'GoToGlobalPoint.Request(latitude=55.0, longitude=37.0, altitude=10.0, yaw=0.0, frame_id="map")', alias: ['gps', 'gnss'], command: true },
    { name: '/geoscan/flight/set_yaw', type: 'gs_interfaces/srv/Yaw', desc: 'Рыскание (курс) в градусах. Работает в воздухе.', fields: 'angle (float, градусы)', returns: 'success', request: 'Yaw.Request(angle=90.0)', alias: ['курс', 'yaw'], command: true },
    { name: '/geoscan/alive', type: 'gs_interfaces/srv/Live', desc: 'Состояние связи с автопилотом.', fields: 'нет', returns: 'status: True, если автопилот на связи', request: 'Live.Request()', alias: ['связь'] },
    { name: '/geoscan/board/restart', type: 'std_srvs/srv/Empty', desc: 'Перезагрузка автопилота: параметры возвращаются к значениям по умолчанию. В полёте в симуляторе запрещена.', fields: 'нет', returns: 'пустой ответ', request: 'Empty.Request()', alias: ['перезагрузка'] },
    { name: '/geoscan/board/get_param', type: 'gs_interfaces/srv/GetParam', desc: 'Прочитать параметр автопилота. update=True перечитывает словарь параметров с борта.', fields: 'name (string), update (bool)', returns: 'value (float), status', request: 'GetParam.Request(name="Flight_com_takeoffAlt", update=False)', alias: ['параметр'] },
    { name: '/geoscan/board/set_param', type: 'gs_interfaces/srv/SetParam', desc: 'Записать параметр автопилота. Систему навигации меняйте сервисом navigation/set_system, а не этим.', fields: 'name (string), value (float)', returns: 'status', request: 'SetParam.Request(name="Flight_com_takeoffAlt", value=0.8)', alias: ['параметр'] },
    { name: '/geoscan/board/get_parameters', type: 'gs_interfaces/srv/ParametersList', desc: 'Все параметры автопилота. При ошибке status: False и пустой params.', fields: 'нет', returns: 'params (список gs_interfaces/Parameter), status', request: 'ParametersList.Request()', alias: ['параметры'] },
    { name: '/geoscan/board/set_parameters', type: 'gs_interfaces/srv/SetParametersList', desc: 'Записать несколько параметров: params - список gs_interfaces/Parameter (name, value). Если хотя бы один параметр нельзя записать, не записывается ни один.', fields: 'params: [{name, value}]', returns: 'status', request: 'SetParametersList.Request(params=[Parameter(name="Flight_com_takeoffAlt", value=0.8)])', alias: ['параметры'] },
    { name: '/geoscan/navigation/get_system', type: 'gs_interfaces/srv/NavigationSystem', desc: 'Текущая система навигации: GPS, LPS или OPT. При ошибке status: False и пустой navigation.', fields: 'нет', returns: 'navigation (string), status', request: 'NavigationSystem.Request()', alias: ['навигация', 'lps', 'opt'] },
    { name: '/geoscan/navigation/set_system', type: 'gs_interfaces/srv/SetNavigationSystem', desc: 'Сменить систему навигации. В полёте отклоняется, если nav_system_change_in_flight: false (у Мини 2). В симуляторе меняется значение параметра, физически навигация остаётся LPS.', fields: 'navigation (string: "GPS", "LPS", "OPT")', returns: 'status', request: 'SetNavigationSystem.Request(navigation="OPT")', alias: ['навигация'] },
    { name: '/geoscan/payload/grab', type: 'gs_interfaces/srv/Grab', desc: 'Механический захват (Мини 2, параметр grab). action: 0 - открыть, 1 - закрыть, 2 - остановить; velocity 0..100 (вне диапазона - success: False); movement_time > 0 - вызов ждёт столько секунд и захват останавливается сам. При action 2 остальные поля игнорируются. Если модуль выключен (grab: false), сервис отвечает success: False и пишет в журнал.', fields: 'movement_time (float, с), velocity (int 0..100), action (0, 1, 2)', returns: 'success', request: 'Grab.Request(movement_time=2.0, velocity=100, action=1)', alias: ['захват', 'grab'] },
    { name: '/geoscan/payload/cargo_set', type: 'std_srvs/srv/SetBool', desc: 'Магнитный захват груза (Базовый, параметр cargo). data=True - захватить, False - отпустить. При cargo: false отвечает success: False.', fields: 'data (bool)', returns: 'success, message', request: 'SetBool.Request(data=True)', alias: ['груз', 'магнит', 'cargo'] },
    { name: '/geoscan/payload/led/set', type: 'gs_interfaces/srv/Led', desc: 'Светодиоды. mode: PIXEL (0) - цвет каждого диода, индекс в leds = номер диода; FILL (1) - один цвет на всю ленту из leds[0]. Компоненты ColorRGBA - 0.0..1.0. BLINK и CHASE не реализованы. period для PIXEL и FILL не используется.', fields: 'mode (int), leds (список std_msgs/ColorRGBA), period (float)', returns: 'success', request: 'Led.Request(mode=Led.Request.FILL, leds=[ColorRGBA(r=0.0, g=1.0, b=0.0, a=1.0)], period=0.0)', alias: ['led', 'светодиод', 'цвет'] }
];

type TopicRow = { name: string; type: string; desc: string; flag: string; example: string; alias: string[]; direction?: ApiDoc['direction'] };

const TOPICS: TopicRow[] = [
    { name: '/geoscan/sensors/imu', type: 'sensor_msgs/msg/Imu', desc: 'Ускорение, угловая скорость и ориентация (кватернион из roll/pitch/yaw борта).', flag: 'topics.imu', example: 'node.create_subscription(Imu, "/geoscan/sensors/imu", on_imu, 10)', alias: ['imu', 'гироскоп'] },
    { name: '/geoscan/sensors/altitude', type: 'std_msgs/msg/Float32', desc: 'Высота по барометру, м.', flag: 'topics.altitude', example: 'node.create_subscription(Float32, "/geoscan/sensors/altitude", on_altitude, 10)', alias: ['высота'] },
    { name: '/geoscan/sensors/range', type: 'sensor_msgs/msg/Range', desc: 'Дальномер вниз. Тип излучения, min_range, max_range и field_of_view берутся из параметров range_sensor.* конфига; вне диапазона - -inf / +inf.', flag: 'topics.range', example: 'node.create_subscription(Range, "/geoscan/sensors/range", on_range, 10)', alias: ['дальномер'] },
    { name: '/geoscan/sensors/motors_rpm', type: 'gs_interfaces/msg/MotorsRpm', desc: 'Обороты четырёх моторов. По умолчанию включён у Мини 2, у Базового с Radxa выключен.', flag: 'topics.motors_rpm', example: 'node.create_subscription(MotorsRpm, "/geoscan/sensors/motors_rpm", on_rpm, 10)', alias: ['моторы', 'обороты'] },
    { name: '/geoscan/sensors/battery_state', type: 'sensor_msgs/msg/BatteryState', desc: 'Напряжение и температура АКБ.', flag: 'topics.battery', example: 'node.create_subscription(BatteryState, "/geoscan/sensors/battery_state", on_battery, 10)', alias: ['батарея', 'акб'] },
    { name: '/geoscan/flight/fly_state', type: 'std_msgs/msg/Int8', desc: 'Состояние полёта: 0 - на земле, 1 - моторы запущены, 2 - в воздухе.', flag: 'topics.fly_state', example: 'node.create_subscription(Int8, "/geoscan/flight/fly_state", on_state, 10)', alias: ['состояние'] },
    { name: '/geoscan/flight/callback_event', type: 'std_msgs/msg/Int8', desc: 'События автопилота: 3 COPTER_LANDED, 4 LOW_VOLTAGE1, 5 LOW_VOLTAGE2, 6 POINT_REACHED, 7 POINT_DECELERATION, 8 TAKEOFF_COMPLETE, 9 ENGINES_STARTED, 10 SHOCK, 11 LOW_CHARGE, 12 DISARM (настоящие числа борта, те же, что Event.value в pioneer_sdk2).', flag: 'topics.callback_event', example: 'node.create_subscription(Int8, "/geoscan/flight/callback_event", on_event, 10)', alias: ['событие', 'event'] },
    { name: '/geoscan/navigation/local/position', type: 'geometry_msgs/msg/Point', desc: 'Локальная позиция LPS, м. То же в local/velocity (Vector3), local/yaw (Float32) и local/status (NavStatus: 0 NO_DATA, 1 CANNOT, 2 LOW, 3 OK).', flag: 'topics.lps', example: 'node.create_subscription(Point, "/geoscan/navigation/local/position", on_position, 10)', alias: ['позиция', 'lps'] },
    { name: '/geoscan/navigation/global/position', type: 'gs_interfaces/msg/PointGPS', desc: 'GPS: global/position, global/velocity, global/status и navigation/satellites. По умолчанию выключено (topics.gnss: false); в симуляторе модуля GNSS нет, даже при включении данные не публикуются.', flag: 'topics.gnss', example: 'node.create_subscription(PointGPS, "/geoscan/navigation/global/position", on_gps, 10)', alias: ['gps', 'gnss'] },
    { name: '/geoscan/navigation/opt/velocity', type: 'gs_interfaces/msg/OptVelocity', desc: 'Оптический поток: x, y.', flag: 'topics.optical_flow', example: 'node.create_subscription(OptVelocity, "/geoscan/navigation/opt/velocity", on_flow, 10)', alias: ['поток'] },
    { name: '/geoscan/payload/ranger', type: 'gs_interfaces/msg/RangerData', desc: 'Модуль Ranger: right, left, front, back, above_below, метры. Топик создаётся только при topics.ranger: true (у Мини 2).', flag: 'topics.ranger', example: 'node.create_subscription(RangerData, "/geoscan/payload/ranger", on_ranger, 10)', alias: ['ranger', 'дальномеры'] },
    { name: '/geoscan/rc/trigger', type: 'std_msgs/msg/Int32', desc: 'Значение канала RC; публикуется при изменении.', flag: 'topics.rc', example: 'node.create_subscription(Int32, "/geoscan/rc/trigger", on_rc, 10)', alias: ['rc', 'пульт'] },
    { name: '/geoscan/flight/cmd_vel', type: 'geometry_msgs/msg/TwistStamped', desc: 'Управление скоростью (подписка узла, вы публикуете): twist.linear.x/y/z - м/с, twist.angular.z - рад/с (лимит +-1.82, angular.x/y игнорируются). header.frame_id: "base_link" - оси коптера, "map" - мировые; пустой или другой frame_id игнорируется с предупреждением. Скорость держится 0.5 с: публикуйте постоянно. Только при topics.cmd_vel: true.', flag: 'topics.cmd_vel', example: 'pub = node.create_publisher(TwistStamped, "/geoscan/flight/cmd_vel", 10)\nmsg = TwistStamped()\nmsg.header.frame_id = "base_link"\nmsg.twist.linear.x = 0.5\npub.publish(msg)', alias: ['скорость', 'cmd_vel'], direction: 'to-autopilot' },
    { name: '/geoscan/rc/set_channels', type: 'gs_interfaces/msg/RcChannels', desc: 'Каналы channel_1 ... channel_8 (подписка узла, вы публикуете). Для удержания связи публикуйте постоянно. Только при topics.rc: true.', flag: 'topics.rc', example: 'pub = node.create_publisher(RcChannels, "/geoscan/rc/set_channels", 10)\npub.publish(RcChannels(channel_8=2000))', alias: ['rc', 'каналы'], direction: 'to-autopilot' }
];

const RCLPY: Record<string, Entry> = {
    'rclpy.init': ['Запускает ROS 2 в программе. Вызывается один раз, до создания узлов. Вместе с ним в симуляторе стартует ros_pioneer_node (пакет gs_core): топики /geoscan/... и сервисы уже есть.', 'rclpy.init(args=None)', 'args - аргументы командной строки; -p имя:=значение задаёт параметры узлов программы', 'None', 'import rclpy\nrclpy.init()', 'rclpy.init()', ['запуск', 'ros']],
    'rclpy.ok': ['True, пока ROS работает: до rclpy.shutdown() и до остановки программы кнопкой.', 'rclpy.ok() -> bool', 'нет', 'bool', 'while rclpy.ok():\n    rclpy.spin_once(node, timeout_sec=0.1)', 'rclpy.ok()'],
    'rclpy.shutdown': ['Останавливает ROS в программе: узлы программы уничтожаются. ros_pioneer_node продолжает работать.', 'rclpy.shutdown()', 'нет', 'None', 'node.destroy_node()\nrclpy.shutdown()', 'rclpy.shutdown()'],
    'rclpy.create_node': ['Создаёт узел без класса. Эквивалент Node(имя).', 'rclpy.create_node(node_name, namespace=None, parameter_overrides=None) -> Node', 'node_name - имя узла', 'Node', 'node = rclpy.create_node("my_node")', 'rclpy.create_node("my_node")'],
    'rclpy.spin': ['Обрабатывает обратные вызовы узла (таймеры, подписки, сервисы), пока работает ROS. Время - симулятора.', 'rclpy.spin(node, executor=None)', 'node - узел', 'None', 'rclpy.spin(node)', 'rclpy.spin(node)', ['крутить', 'обработка']],
    'rclpy.spin_once': ['Один проход обработки обратных вызовов: ждёт готовый вызов не дольше timeout_sec секунд симуляции.', 'rclpy.spin_once(node, executor=None, timeout_sec=None)', 'timeout_sec - сколько ждать; 0 - не ждать', 'None', 'while rclpy.ok():\n    rclpy.spin_once(node, timeout_sec=0.1)', 'rclpy.spin_once(node, timeout_sec=0.1)'],
    'rclpy.spin_until_future_complete': ['Крутит обработку, пока не придёт ответ сервиса (future.done()). Как ждать ответ на call_async.', 'rclpy.spin_until_future_complete(node, future, executor=None, timeout_sec=None)', 'future - результат client.call_async', 'None; ответ - future.result()', 'future = client.call_async(request)\nrclpy.spin_until_future_complete(node, future)\nprint(future.result().success)', 'rclpy.spin_until_future_complete(node, future)'],
    'Node': ['Узел ROS 2. Обычно пишут класс-наследник с super().__init__("имя"). Обратные вызовы - методы класса.', 'class MyNode(Node):\n    def __init__(self):\n        super().__init__("my_node")', 'node_name - имя узла; parameter_overrides - значения параметров', 'Node', 'class MyNode(Node):\n    def __init__(self):\n        super().__init__("my_node")\n        self.create_timer(1.0, self.on_timer)\n\n    def on_timer(self):\n        self.get_logger().info("tick")', 'class MyNode(Node):\n    def __init__(self):\n        super().__init__("my_node")', ['узел']],
    'Node.create_publisher': ['Создаёт паблишер топика. Публикуется сообщение того же типа (publish проверяет тип).', 'node.create_publisher(msg_type, topic, qos_profile=10) -> Publisher', 'msg_type - класс сообщения, topic - имя топика, qos_profile - глубина очереди или QoSProfile', 'Publisher', 'pub = node.create_publisher(Int8, "/my/topic", 10)\npub.publish(Int8(data=1))', 'node.create_publisher(Int8, "/my/topic", 10)', ['публикация']],
    'Node.create_subscription': ['Подписка на топик: callback вызывается при каждом сообщении, когда узел обрабатывается (spin). Сообщения копятся в очереди глубиной qos_profile.', 'node.create_subscription(msg_type, topic, callback, qos_profile=10) -> Subscription', 'callback(msg) - обработчик', 'Subscription', 'def on_altitude(msg):\n    print(msg.data)\nnode.create_subscription(Float32, "/geoscan/sensors/altitude", on_altitude, 10)', 'node.create_subscription(Float32, "/geoscan/sensors/altitude", self.on_message, 10)', ['подписка']],
    'Node.create_client': ['Клиент сервиса. Запрос отправляют client.call_async(request); ответ - future.result().', 'node.create_client(srv_type, srv_name) -> Client', 'srv_type - класс сервиса, srv_name - имя', 'Client', 'client = node.create_client(Trigger, "/geoscan/flight/takeoff")', 'node.create_client(Trigger, "/geoscan/flight/takeoff")', ['сервис']],
    'Node.create_service': ['Свой сервис: callback(request, response) заполняет и возвращает response; вызывается при spin узла.', 'node.create_service(srv_type, srv_name, callback) -> Service', 'callback(request, response) -> response', 'Service', 'def handle(request, response):\n    response.success = True\n    return response\nnode.create_service(Trigger, "my_service", handle)', 'node.create_service(Trigger, "my_service", self.handle)'],
    'Node.create_timer': ['Таймер: callback вызывается каждые timer_period_sec секунд времени симуляции при spin узла. Методы таймера: cancel(), reset(), is_canceled().', 'node.create_timer(timer_period_sec, callback) -> Timer', 'timer_period_sec - период, с', 'Timer', 'timer = node.create_timer(0.5, self.on_timer)', 'node.create_timer(0.5, self.on_timer)', ['таймер', 'период']],
    'Node.create_rate': ['Частота цикла: rate.sleep() ждёт до следующего такта (время симуляции).', 'node.create_rate(frequency) -> Rate', 'frequency - Гц', 'Rate', 'rate = node.create_rate(10)\nrate.sleep()', 'node.create_rate(10)'],
    'Node.get_logger': ['Журнал узла: debug, info, warn, error, fatal. Строки идут в журнал симулятора как «[INFO] [время] [узел]: текст».', 'node.get_logger().info(text)', 'text - сообщение; once=True, throttle_duration_sec', 'logger', 'node.get_logger().info("Взлетели")', 'node.get_logger().info("")', ['лог', 'журнал']],
    'Node.get_clock': ['Часы узла: get_clock().now() - время симулятора как rclpy.time.Time (nanoseconds, to_msg()).', 'node.get_clock().now() -> Time', 'нет', 'Time', 'stamp = node.get_clock().now().to_msg()', 'node.get_clock().now()', ['время']],
    'Node.declare_parameter': ['Объявляет параметр узла со значением по умолчанию; значение можно переопределить через parameter_overrides или rclpy.init(args=["--ros-args", "-p", "имя:=значение"]). Читать: node.get_parameter(имя).value.', 'node.declare_parameter(name, value) -> Parameter', 'name, value', 'Parameter', 'node.declare_parameter("speed", 0.5)\nspeed = node.get_parameter("speed").value', 'node.declare_parameter("speed", 0.5)', ['параметр']],
    'Client.call_async': ['Отправляет запрос сервису и возвращает Future. Ответ - после rclpy.spin_until_future_complete.', 'client.call_async(request) -> Future', 'request - Тип.Request()', 'Future', 'future = client.call_async(Trigger.Request())', 'client.call_async(request)'],
    'Client.wait_for_service': ['Ждёт, пока сервис появится (не дольше timeout_sec секунд симуляции). ros_pioneer_node запущен вместе с rclpy.init(), поэтому сервисы gs_core готовы сразу.', 'client.wait_for_service(timeout_sec=None) -> bool', 'timeout_sec', 'bool', 'while not client.wait_for_service(timeout_sec=1.0):\n    node.get_logger().info("жду сервис")', 'client.wait_for_service(timeout_sec=1.0)'],
    'Publisher.publish': ['Публикует сообщение подписчикам топика.', 'publisher.publish(msg)', 'msg - сообщение того же типа, что у паблишера', 'None', 'pub.publish(String(data="привет"))', 'pub.publish(msg)'],
    'gs_core.launch.restart_pioneer_node': ['Только в симуляторе: перезапускает ros_pioneer_node с другими параметрами - как `ros2 run gs_core ros_pioneer_node --ros-args -p topics.gnss:=true`. config - "mini2" или "razero" (по умолчанию по модели дрона). Параметры узла сбрасываются к конфигу, узлы программы остаются.', 'restart_pioneer_node(parameters=None, config=None) -> str', 'parameters - {"topics.gnss": True}', 'название конфига', 'from gs_core.launch import restart_pioneer_node\nrestart_pioneer_node(parameters={"topics.gnss": True})', 'restart_pioneer_node(parameters={})', ['gnss', 'параметры узла', 'launch']]
};

function typeEntry(key: string): ApiDoc {
    const isSrv = key.includes('/srv/');
    const shown = key.split('/');
    const name = shown[2];
    const pkg = `${shown[0]}.${shown[1]}`;
    const text = interfaceShow(key) ?? '';
    return {
        desc: `${isSrv ? 'Тип сервиса' : 'Тип сообщения'} ${key}. Определение (ros2 interface show):\n${text}`,
        syntax: text || '(нет полей)',
        params: 'поля - в определении; значения по умолчанию нулевые, числа с плавающей точкой - только float (1.0, а не 1)',
        returns: isSrv ? `${name}.Request() и ${name}.Response()` : `${name}()`,
        example: `from ${pkg} import ${name}\n${isSrv ? `request = ${name}.Request()` : `msg = ${name}()`}`,
        insertText: isSrv ? `${name}.Request()` : `${name}()`,
        kind: 'Type',
        aliases: [name.toLowerCase()]
    };
}

function build(): Record<string, ApiDoc> {
    const docs: Record<string, ApiDoc> = {};
    for (const [key, value] of Object.entries(RCLPY)) docs[key] = entry(value, key.includes('.') || key === 'Node' ? (key === 'Node' ? 'Class' : 'Method') : 'Function');
    for (const row of SERVICES) {
        docs[row.name] = entry([
            `${row.desc} Тип: ${row.type}.`,
            `ros2 service call ${row.name} ${row.type}`,
            row.fields,
            row.returns,
            `${SERVICE_PRE}client = node.create_client(${row.type.split('/')[2]}, "${row.name}")\nrequest = ${row.request}\n${CALL}`,
            `node.create_client(${row.type.split('/')[2]}, "${row.name}")`,
            row.alias
        ], 'Service', row.command ? 'to-autopilot' : undefined);
    }
    for (const row of TOPICS) {
        docs[row.name] = entry([
            `${row.desc}${row.flag ? ` Включается параметром ${row.flag}.` : ''} Тип: ${row.type}.`,
            `ros2 topic echo ${row.name}`,
            `тип сообщения ${row.type}`,
            row.type.split('/')[2],
            row.example,
            row.example.split('\n')[0],
            row.alias
        ], 'Topic', row.direction);
    }
    for (const key of Object.keys(ROS2_MSGS).concat(Object.keys(ROS2_SRVS))) {
        if (/^(builtin_interfaces|rcl_interfaces)\//.test(key)) continue;
        docs[key] = typeEntry(key);
    }
    return docs;
}

export const pythonRos2ApiDocs: Record<string, ApiDoc> = build();
