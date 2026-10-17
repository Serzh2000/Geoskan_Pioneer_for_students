import type { ApiDoc } from './api-docs-types.js';

/*
 * Справочник pioneer_sdk2 - библиотеки Пионера Мини 2 (PyPI pioneer-sdk2
 * 0.16). Источник истины - исходники библиотеки, не документация:
 * у grab_* скорость по умолчанию 20, курс в градусах, цвет 0..1.
 * Где симулятор ведёт себя иначе, чем дрон, это сказано в описании.
 */

type Entry = [desc: string, syntax: string, params: string, returns: string, example: string, insertText: string, aliases?: string[]];

function method([desc, syntax, params, returns, example, insertText, aliases]: Entry, kind = 'Method'): ApiDoc {
    return { desc, syntax, params, returns, example, insertText, kind, ...(aliases ? { aliases } : {}) };
}

const ORDER_NOTE = ' Порядок проверяется: на земле разрешён arm(), с запущенными моторами - takeoff(), в воздухе - полётные команды. Команда прошлого этапа игнорируется (False), пропуск этапа - RuntimeError.';

export const pythonSdk2ApiDocs: Record<string, ApiDoc> = {
    'Pioneer': method([
        'Подключение к автопилоту Пионера Мини 2. На борту дрона адрес по умолчанию верный (TCP 127.0.0.1:20556). wait_callback и safety_command включают ожидание событий и контроль порядка команд.',
        'Pioneer(serial=None, tcp="127.0.0.1:20556", baudrate=57600, wait_callback=True, safety_command=True, logger=True)',
        'serial или tcp - канал к автопилоту; logger=True печатает ход команд («-> ARM», «Моторы запущены»)',
        'объект Pioneer',
        'from pioneer_sdk2 import Pioneer\npioneer = Pioneer()',
        'Pioneer()',
        ['подключение', 'pioneer_sdk2', 'мини 2']
    ], 'Class'),
    'Pioneer.arm': method([
        'Запуск моторов. Ждёт события ENGINES_STARTED; не дождался за timeout секунд - выключает моторы и возвращает False.' + ORDER_NOTE,
        'pioneer.arm(timeout=5, retries=0) -> bool',
        'timeout - секунд ожидания, retries - повторных попыток',
        'True, если моторы запущены',
        'if not pioneer.arm():\n    raise SystemExit("Моторы не запустились")',
        'arm()',
        ['моторы', 'запуск']
    ]),
    'Pioneer.takeoff': method([
        'Взлёт. Возвращается, когда взлёт завершён (событие TAKEOFF_COMPLETE): пауза time.sleep после него не нужна.' + ORDER_NOTE,
        'pioneer.takeoff() -> bool',
        'нет',
        'bool',
        'pioneer.arm()\npioneer.takeoff()',
        'takeoff()',
        ['взлет', 'взлететь', 'старт']
    ]),
    'Pioneer.land': method([
        'Посадка. Возвращается, когда дрон на земле (событие COPTER_LANDED). Не проверяется по порядку. На настоящем дроне land() на земле ждёт вечно, симулятор предупреждает и возвращается сразу.',
        'pioneer.land() -> bool',
        'нет',
        'bool',
        'pioneer.land()\npioneer.disarm()',
        'land()',
        ['посадка', 'сесть']
    ]),
    'Pioneer.disarm': method([
        'Выключение моторов немедленно. В воздухе дрон упадёт: зовите после land().',
        'pioneer.disarm() -> bool',
        'нет',
        'bool',
        'pioneer.disarm()',
        'disarm()'
    ]),
    'Pioneer.go_to_local_point': method([
        'Полёт в точку локальной системы координат. Не ждёт прибытия: дожидайтесь point_reached(). Курс yaw - в ГРАДУСАХ, можно не указывать. time - желаемое время перелёта, с.',
        'pioneer.go_to_local_point(x, y, z, yaw=None, time=0)',
        'x, y, z - метры; yaw - градусы; time - секунды (0 - обычная скорость)',
        'None; False, если команда проигнорирована',
        'pioneer.go_to_local_point(x=1, y=0, z=1, yaw=90)\nwhile not pioneer.point_reached():\n    time.sleep(0.1)',
        'go_to_local_point(x=${1:x}, y=${2:y}, z=${3:z}, yaw=${4:0})',
        ['лететь в точку', 'точка', 'маршрут', 'goto']
    ]),
    'Pioneer.go_to_local_point_body_fixed': method([
        'Полёт на смещение относительно дрона. В симуляторе x - вправо, y - вперёд, z - вверх; yaw - поворот от текущего курса в градусах.',
        'pioneer.go_to_local_point_body_fixed(x, y, z, yaw=None, time=0)',
        'x, y, z - метры; yaw - градусы',
        'None; False, если команда проигнорирована',
        'pioneer.go_to_local_point_body_fixed(x=0, y=1, z=0, yaw=0)',
        'go_to_local_point_body_fixed(x=${1:0}, y=${2:1}, z=${3:0}, yaw=${4:0})'
    ]),
    'Pioneer.point_reached': method([
        'True один раз после прибытия в точку (событие POINT_REACHED), затем снова False до следующей точки.',
        'pioneer.point_reached() -> bool',
        'нет',
        'bool',
        'while not pioneer.point_reached():\n    time.sleep(0.1)',
        'point_reached()',
        ['прибыл', 'точка достигнута']
    ]),
    'Pioneer.point_deceleration': method([
        'True один раз, когда дрон начал тормозить перед точкой (событие POINT_DECELERATION).',
        'pioneer.point_deceleration() -> bool',
        'нет',
        'bool',
        'if pioneer.point_deceleration():\n    print("Подлетаем")',
        'point_deceleration()'
    ]),
    'Pioneer.set_manual_speed': method([
        'Полёт со скоростью в локальных осях. Одна команда держит скорость interval секунд, потом дрон зависает - повторять её в цикле не обязательно. yaw_rate - рад/с, не больше 1.82: большее значение SDK молча отбрасывает.',
        'pioneer.set_manual_speed(vx, vy, vz, yaw_rate, interval=1.0)',
        'vx, vy, vz - м/с; yaw_rate - рад/с; interval - секунд',
        'None',
        'pioneer.set_manual_speed(vx=0.5, vy=0, vz=0, yaw_rate=0, interval=2)\ntime.sleep(2)',
        'set_manual_speed(vx=${1:0}, vy=${2:0}, vz=${3:0}, yaw_rate=${4:0}, interval=${5:1.0})',
        ['скорость', 'manual speed']
    ]),
    'Pioneer.set_manual_speed_body_fixed': method([
        'То же, что set_manual_speed, но в осях дрона (в симуляторе vx - вправо, vy - вперёд).',
        'pioneer.set_manual_speed_body_fixed(vx, vy, vz, yaw_rate, interval=1.0)',
        'vx, vy, vz - м/с; yaw_rate - рад/с; interval - секунд',
        'None',
        'pioneer.set_manual_speed_body_fixed(vx=0, vy=0.3, vz=0, yaw_rate=0, interval=1)',
        'set_manual_speed_body_fixed(vx=${1:0}, vy=${2:0}, vz=${3:0}, yaw_rate=${4:0}, interval=${5:1.0})'
    ]),
    'Pioneer.set_yaw': method([
        'Повернуться на курс в градусах, оставаясь на месте.' + ORDER_NOTE,
        'pioneer.set_yaw(yaw) -> bool',
        'yaw - градусы',
        'bool',
        'pioneer.set_yaw(90)',
        'set_yaw(${1:90})',
        ['курс', 'поворот']
    ]),
    'Pioneer.rtl': method([
        'Возврат в точку взлёта и посадка (Return To Launch).',
        'pioneer.rtl() -> bool',
        'нет',
        'bool',
        'pioneer.rtl()',
        'rtl()',
        ['домой', 'возврат']
    ]),
    'Pioneer.get_fly_state': method([
        'Состояние полёта по версии SDK: FlyState.ON_LAND, FlyState.ARMED или FlyState.IN_SKY.',
        'pioneer.get_fly_state() -> FlyState',
        'нет',
        'FlyState',
        'print(pioneer.get_fly_state())',
        'get_fly_state()'
    ]),
    'Pioneer.subscribe': method([
        'Вызывать функцию при событии автопилота (без второго аргумента - при любом). Функция получает событие: event.name - его имя. Обработчик должен быть коротким: поставьте флаг, а летайте в основном цикле.',
        'pioneer.subscribe(callback, event=Event.ALL)',
        'callback(event) - функция; event - Event.*',
        'None',
        'def on_event(event):\n    print(event.name)\n\npioneer.subscribe(on_event)',
        'subscribe(${1:on_event}, Event.${2:ALL})',
        ['событие', 'callback', 'подписка']
    ]),
    'Pioneer.unsubscribe': method([
        'Отменить подписку, сделанную subscribe.',
        'pioneer.unsubscribe(callback, event=Event.ALL)',
        'те же, что в subscribe',
        'None',
        'pioneer.unsubscribe(on_event)',
        'unsubscribe(${1:on_event})'
    ]),
    'Pioneer.led_control': method([
        'Цвет светодиодов, яркость каждой составляющей от 0 до 1 (не 0..255!). У Мини 2 в симуляторе два светодиода - передние индикаторы: 0 - левый, 1 - правый; 255 - оба. led_control() без аргументов гасит все.',
        'pioneer.led_control(led_id=255, r=0, g=0, b=0) -> bool',
        'led_id - номер или 255; r, g, b - 0..1',
        'bool',
        'pioneer.led_control(r=0, g=1, b=0)   # зелёный',
        'led_control(r=${1:0}, g=${2:1}, b=${3:0})',
        ['светодиод', 'подсветка', 'цвет']
    ]),
    'Pioneer.get_battery_status': method([
        'Напряжение (В) и температура батареи.',
        'pioneer.get_battery_status() -> (voltage, temperature)',
        'нет',
        'кортеж из двух чисел или None',
        'voltage, temperature = pioneer.get_battery_status()',
        'get_battery_status()',
        ['батарея', 'заряд']
    ]),
    'Pioneer.get_local_position_lps': method([
        'Позиция в локальной системе координат, метры.',
        'pioneer.get_local_position_lps() -> (x, y, z)',
        'нет',
        'кортеж или None',
        'x, y, z = pioneer.get_local_position_lps()',
        'get_local_position_lps()',
        ['позиция', 'координаты']
    ]),
    'Pioneer.get_local_velocity_lps': method([
        'Скорость в локальной системе координат, м/с.',
        'pioneer.get_local_velocity_lps() -> (vx, vy, vz)',
        'нет',
        'кортеж или None',
        'vx, vy, vz = pioneer.get_local_velocity_lps()',
        'get_local_velocity_lps()'
    ]),
    'Pioneer.get_local_yaw_lps': method([
        'Курс в градусах, от -180 до 180.',
        'pioneer.get_local_yaw_lps() -> float',
        'нет',
        'градусы или None',
        'yaw = pioneer.get_local_yaw_lps()',
        'get_local_yaw_lps()',
        ['курс', 'yaw']
    ]),
    'Pioneer.get_orientation': method([
        'Крен, тангаж и рыскание в градусах.',
        'pioneer.get_orientation() -> (roll, pitch, yaw)',
        'нет',
        'кортеж или None',
        'roll, pitch, yaw = pioneer.get_orientation()',
        'get_orientation()'
    ]),
    'Pioneer.get_altitude': method([
        'Высота по барометру, метры.',
        'pioneer.get_altitude() -> float',
        'нет',
        'метры или None',
        'h = pioneer.get_altitude()',
        'get_altitude()'
    ]),
    'Pioneer.get_dist_sensor_data': method([
        'Дальномер вниз: расстояние до поверхности под дроном, метры.',
        'pioneer.get_dist_sensor_data() -> float',
        'нет',
        'метры или None',
        'h = pioneer.get_dist_sensor_data()',
        'get_dist_sensor_data()',
        ['дальномер', 'высота']
    ]),
    'Pioneer.get_ranger_data': method([
        'Модуль дальномеров Ranger Мини 2: расстояния вправо, влево, вперёд, назад и вниз, метры (в симуляторе - до 4 м).',
        'pioneer.get_ranger_data() -> (right, left, front, back, below)',
        'нет',
        'пять чисел; (None, ...) без модуля',
        'right, left, front, back, below = pioneer.get_ranger_data()\nif front < 0.5:\n    print("Препятствие впереди")',
        'get_ranger_data()',
        ['ranger', 'дальномеры', 'препятствие']
    ]),
    'Pioneer.get_accel': method([
        'Ускорение по осям X, Y, Z.',
        'pioneer.get_accel() -> (ax, ay, az)',
        'нет',
        'кортеж или None',
        'ax, ay, az = pioneer.get_accel()',
        'get_accel()'
    ]),
    'Pioneer.get_gyro': method([
        'Угловая скорость по осям X, Y, Z, рад/с.',
        'pioneer.get_gyro() -> (gx, gy, gz)',
        'нет',
        'кортеж или None',
        'gx, gy, gz = pioneer.get_gyro()',
        'get_gyro()'
    ]),
    'Pioneer.get_mag': method([
        'Показания магнитометра по осям X, Y, Z (в симуляторе - модель поля Земли по курсу).',
        'pioneer.get_mag() -> (mx, my, mz)',
        'нет',
        'кортеж или None',
        'mx, my, mz = pioneer.get_mag()',
        'get_mag()'
    ]),
    'Pioneer.get_optical_data': method([
        'Оптический поток (flow_x, flow_y) и дальность до поверхности, м.',
        'pioneer.get_optical_data() -> (flow_x, flow_y, range)',
        'нет',
        'кортеж или None',
        'fx, fy, h = pioneer.get_optical_data()',
        'get_optical_data()'
    ]),
    'Pioneer.get_motors_rpm': method([
        'Обороты четырёх моторов.',
        'pioneer.get_motors_rpm() -> [rpm0, rpm1, rpm2, rpm3]',
        'нет',
        'список из 4 чисел',
        'print(pioneer.get_motors_rpm())',
        'get_motors_rpm()'
    ]),
    'Pioneer.get_nav_system': method([
        'Текущая система навигации: NavSystem.GPS, LPS или OPT (в симуляторе - LPS).',
        'pioneer.get_nav_system(update=False) -> NavSystem',
        'update - перечитать параметр из автопилота',
        'NavSystem',
        'print(pioneer.get_nav_system())',
        'get_nav_system()'
    ]),
    'Pioneer.get_nav_status_lps': method([
        'Качество локальной навигации: NavStatus.NO_DATA, CANNOT, LOW или OK.',
        'pioneer.get_nav_status_lps() -> NavStatus',
        'нет',
        'NavStatus или None',
        'if pioneer.get_nav_status_lps().name == "OK":\n    pioneer.arm()',
        'get_nav_status_lps()'
    ]),
    'Pioneer.uptime': method([
        'Секунд с момента включения автопилота.',
        'pioneer.uptime() -> int',
        'нет',
        'секунды',
        'print(pioneer.uptime())',
        'uptime()'
    ]),
    'Pioneer.flight_time': method([
        'Секунд с начала полёта.',
        'pioneer.flight_time() -> float',
        'нет',
        'секунды',
        'print(pioneer.flight_time())',
        'flight_time()'
    ]),
    'Pioneer.grab_close': method([
        'Закрыть механический захват Мини 2. movement_time > 0 - двигать столько секунд, 0 - до упора; velocity - скорость 0..100 %. В симуляторе захват подхватывает груз под дроном.',
        'pioneer.grab_close(movement_time=0, velocity=20) -> bool',
        'movement_time - секунды; velocity - 0..100',
        'bool',
        'pioneer.grab_close()',
        'grab_close()',
        ['захват', 'взять груз']
    ]),
    'Pioneer.grab_open': method([
        'Открыть захват Мини 2 (отпустить груз).',
        'pioneer.grab_open(movement_time=0, velocity=20) -> bool',
        'movement_time - секунды; velocity - 0..100',
        'bool',
        'pioneer.grab_open()',
        'grab_open()',
        ['захват', 'отпустить груз']
    ]),
    'Pioneer.grab_stop': method([
        'Остановить движение захвата.',
        'pioneer.grab_stop() -> bool',
        'нет',
        'bool',
        'pioneer.grab_stop()',
        'grab_stop()'
    ]),
    'Pioneer.get_param': method([
        'Прочитать параметр автопилота по имени (в симуляторе параметров нет: None).',
        'pioneer.get_param(name, update=False)',
        'name - имя параметра',
        'значение или None',
        'pioneer.get_param("Flight_com_navSystem")',
        'get_param("${1:name}")'
    ]),
    'Pioneer.set_logger': method([
        'Включить или выключить печать хода команд.',
        'pioneer.set_logger(value=True)',
        'value - bool',
        'None',
        'pioneer.set_logger(False)',
        'set_logger(${1:False})'
    ]),
    'Pioneer.close_connection': method([
        'Закрыть соединение с автопилотом. Ставьте в finally.',
        'pioneer.close_connection()',
        'нет',
        'None',
        'try:\n    ...\nfinally:\n    pioneer.close_connection()',
        'close_connection()'
    ]),
    'Event': method([
        'События автопилота для subscribe: ALL, ENGINES_STARTED, TAKEOFF_COMPLETE, POINT_DECELERATION, POINT_REACHED, COPTER_LANDED, DISARM, LOW_VOLTAGE1 (заряда хватит вернуться), LOW_VOLTAGE2 (автопилот начал аварийную посадку), SHOCK (сильный удар), LOW_CHARGE.',
        'from pioneer_sdk2 import Event',
        'Event.ИМЯ',
        'Enum',
        'pioneer.subscribe(on_low_battery, Event.LOW_VOLTAGE1)',
        'Event.${1:LOW_VOLTAGE1}',
        ['события', 'батарея', 'событие']
    ], 'Enum'),
    'FlyState': method([
        'Состояния полёта, которые ведёт SDK: ON_LAND -> ARMED -> IN_SKY -> ON_LAND.',
        'from pioneer_sdk2.piosdk2 import FlyState',
        'FlyState.ON_LAND, ARMED, IN_SKY',
        'Enum',
        'if pioneer.get_fly_state().name == "IN_SKY":\n    pioneer.land()',
        'get_fly_state()'
    ], 'Enum'),
    'Camera': method([
        'Камера Мини 2. CameraType.MAIN - передняя, CameraType.OPT - нижняя камера оптического потока.',
        'Camera(camera_type=CameraType.MAIN)',
        'camera_type - CameraType.MAIN или CameraType.OPT',
        'объект Camera',
        'from pioneer_sdk2 import Camera, CameraType\ncamera = Camera(camera_type=CameraType.MAIN)',
        'Camera(camera_type=CameraType.${1:MAIN})',
        ['камера', 'видео']
    ], 'Class'),
    'Camera.get_cv_frame': method([
        'Следующий кадр - массив numpy с цветами BGR. Нет кадра timeout секунд - TimeoutError.',
        'camera.get_cv_frame(timeout=5.0) -> numpy.ndarray',
        'timeout - секунды',
        'кадр BGR',
        'frame = camera.get_cv_frame()',
        'get_cv_frame()',
        ['кадр', 'изображение']
    ]),
    'Camera.stop': method([
        'Остановить захват кадров. Ставьте в finally.',
        'camera.stop()',
        'нет',
        'None',
        'camera.stop()',
        'stop()'
    ]),
    'ImageViewer': method([
        'Показ кадров: на дроне - видеопоток в браузере по адресу http://10.42.0.1:8889/<имя>, в симуляторе - окно с тем же именем.',
        'ImageViewer()',
        'нет',
        'объект ImageViewer',
        'viewer = ImageViewer()\nviewer.imshow(name="stream", frame=frame)',
        'ImageViewer()',
        ['показать', 'imshow', 'поток']
    ], 'Class'),
    'ImageViewer.imshow': method([
        'Отправить кадр в поток с именем name.',
        'viewer.imshow(name, frame, fps=30)',
        'name - имя потока; frame - кадр BGR; fps - кадров в секунду',
        'None',
        'viewer.imshow(name="stream", frame=frame)',
        'imshow(name="${1:stream}", frame=${2:frame})'
    ]),
    'ImageViewer.close': method([
        'Закрыть все потоки.',
        'viewer.close()',
        'нет',
        'None',
        'viewer.close()',
        'close()'
    ]),
    'ServoCamera': method([
        'Сервопривод наклона передней камеры Мини 2. При создании проверяет, что он есть на борту. Импорт: from pioneer_sdk2 import ServoCamera, ServoPriority.',
        'ServoCamera()',
        'нет',
        'объект ServoCamera',
        'from pioneer_sdk2 import ServoCamera\nservo = ServoCamera()',
        'ServoCamera()',
        ['наклон камеры', 'сервопривод']
    ], 'Class'),
    'ServoCamera.set_angle': method([
        'Наклонить камеру сервоприводом: от -80 (почти вниз) до 30 градусов (вверх), 0 - прямо. Угол вне диапазона - ValueError. Наклон меняет и кадры Camera(CameraType.MAIN).',
        'servo.set_angle(angle, priority=ServoPriority.LOW)',
        'angle - градусы, -80..30; priority - ServoPriority.HIGH/MEDIUM/LOW',
        'bool',
        'servo.set_angle(-45)',
        'set_angle(${1:-45})',
        ['наклон', 'угол камеры']
    ])
};
