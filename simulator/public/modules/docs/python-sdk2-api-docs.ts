import type { ApiDoc } from './api-docs-types.js';

/*
 * Справочник pioneer_sdk2 - библиотеки Пионера Мини 2 (PyPI pioneer-sdk2
 * 0.16). Источник истины - исходники библиотеки, не документация:
 * у grab_* скорость по умолчанию 20, курс в градусах, цвет 0..1.
 * Методы RC, GPS, параметров и груза описаны по pioneer_sdk2 0.11.0 (PyPI),
 * RC-каналы, Camera, RecorderControl - ещё и по сборнику SDK2 (проверен на
 * дроне с pioneer_sdk2 0.16.0). Значения Event 0.16 в сборнике не приведены.
 * Где симулятор ведёт себя иначе, чем дрон, это сказано в описании.
 */

type Entry = [desc: string, syntax: string, params: string, returns: string, example: string, insertText: string, aliases?: string[]];

function method([desc, syntax, params, returns, example, insertText, aliases]: Entry, kind = 'Method'): ApiDoc {
    return { desc, syntax, params, returns, example, insertText, kind, ...(aliases ? { aliases } : {}) };
}

const ORDER_NOTE = ' Порядок проверяется (только при wait_callback=True и safety_command=True): на земле разрешён arm(), с запущенными моторами - takeoff(), в воздухе - полётные команды. Команда прошлого этапа игнорируется (False), команда следующего или любого другого этапа - RuntimeError.';

export const pythonSdk2ApiDocs: Record<string, ApiDoc> = {
    'Pioneer': method([
        'Подключение к автопилоту Пионера Мини 2. На борту дрона адрес по умолчанию верный (TCP 127.0.0.1:20556); в симуляторе serial и tcp не используются. wait_callback и safety_command включают ожидание событий и контроль порядка команд.',
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
        'Текущая система навигации: NavSystem.GPS, LPS или OPT; читается из параметра Flight_com_navSystem (в симуляторе - LPS).',
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
        'Значение параметра автопилота по имени. Первый вызов (и вызов с update=True) печатает «-> Загрузка словаря автопилота ...». Нет такого параметра - None. В симуляторе известны только Flight_com_navSystem (1.0 - LPS), Copter_com_takeoffAlt и параметры RC из send_rc_channels. update=True читает значение заново; для знакомых имён результат тот же.',
        'pioneer.get_param(name, update=False) -> float',
        'name - имя параметра; update - перечитать словарь параметров',
        'число или None',
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
    'Pioneer.connect': method([
        'Устанавливает соединение с автопилотом. Pioneer() делает это сам, вызывать connect() вручную не нужно. В симуляторе ничего не делает.',
        'pioneer.connect()',
        'нет',
        'None',
        'pioneer.connect()',
        'connect()'
    ]),
    'Pioneer.time': method([
        'Время работы автопилота в секундах с начала GPS-эпохи (6 января 1980). В симуляторе - начало эпохи плюс время работы симуляции.',
        'pioneer.time() -> float',
        'нет',
        'секунды или None при ошибке',
        'print(pioneer.time())',
        'time()'
    ]),
    'Pioneer.reboot_board': method([
        'Перезагрузка основной платы дрона. Для Мини 2 перезагрузка запрещена: печатает «Перезагрузка платы Pioneer Mini 2 запрещена» и возвращает False. В симуляторе всегда так.',
        'pioneer.reboot_board() -> bool',
        'нет',
        'True, если перезагрузка разрешена и выполнена, иначе False',
        'if not pioneer.reboot_board():\n    print("Перезагрузка запрещена")',
        'reboot_board()'
    ]),
    'Pioneer.go_to_global_point': method([
        'Полёт в точку по координатам GPS. Работает только при системе навигации GPS. У Мини 2 в симуляторе навигация LPS (локальная), поэтому как на дроне без GPS: порядок команд проверяется, затем печатается «Команда может быть выполнена только когда установлена система навигации GPS» и возвращается False. Для полёта в симуляторе используйте go_to_local_point.' + ORDER_NOTE,
        'pioneer.go_to_global_point(latitude, longitude, altitude, yaw=0) -> bool',
        'latitude, longitude - градусы; altitude - метры над уровнем моря; yaw - градусы',
        'True, если команда отправлена, иначе False',
        'if not pioneer.go_to_global_point(55.7512, 37.6184, 120):\n    pioneer.go_to_local_point(1, 0, 1)',
        'go_to_global_point(latitude=${1:55.0}, longitude=${2:37.0}, altitude=${3:100}, yaw=${4:0})',
        ['gps', 'глобальная точка', 'широта', 'долгота']
    ]),
    'Pioneer.go_to_global_point_relative': method([
        'Полёт на смещение от текущей точки в градусах широты и долготы. Только при навигации GPS. В симуляторе (LPS) - как go_to_global_point: печатает пояснение и возвращает False.' + ORDER_NOTE,
        'pioneer.go_to_global_point_relative(latitude_offset, longitude_offset, altitude_offset, yaw=0) -> bool',
        'latitude_offset, longitude_offset - градусы; altitude_offset - метры; yaw - градусы',
        'True, если команда отправлена, иначе False',
        'pioneer.go_to_global_point_relative(0.0001, 0.0001, 0)',
        'go_to_global_point_relative(latitude_offset=${1:0.0001}, longitude_offset=${2:0.0001}, altitude_offset=${3:0}, yaw=${4:0})'
    ]),
    'Pioneer.get_global_position_gps': method([
        'Широта, долгота (градусы) и высота (м) по GPS. В симуляторе GPS-модуля нет: печатает «Модуль навигации не установлен» и возвращает None, как дрон без GNSS.',
        'pioneer.get_global_position_gps() -> (lat, lon, alt)',
        'нет',
        'кортеж или None (в симуляторе всегда None)',
        'position = pioneer.get_global_position_gps()\nif position is None:\n    print("GPS нет")',
        'get_global_position_gps()',
        ['gps', 'координаты gps']
    ]),
    'Pioneer.get_global_velocity_gps': method([
        'Скорость по GPS: северная, восточная и вертикальная, м/с. В симуляторе GPS нет: возвращает None.',
        'pioneer.get_global_velocity_gps() -> (north, east, down)',
        'нет',
        'кортеж или None (в симуляторе всегда None)',
        'print(pioneer.get_global_velocity_gps())',
        'get_global_velocity_gps()'
    ]),
    'Pioneer.get_satellites_count': method([
        'Число видимых спутников GPS и ГЛОНАСС. В симуляторе GPS нет: возвращает None.',
        'pioneer.get_satellites_count() -> (gps, glonass)',
        'нет',
        'кортеж или None (в симуляторе всегда None)',
        'print(pioneer.get_satellites_count())',
        'get_satellites_count()',
        ['спутники']
    ]),
    'Pioneer.get_nav_status_gps': method([
        'Качество GPS-навигации: NavStatus.NO_DATA, CANNOT, LOW или OK. В симуляторе GPS нет: возвращает None.',
        'pioneer.get_nav_status_gps() -> NavStatus',
        'нет',
        'NavStatus или None (в симуляторе всегда None)',
        'print(pioneer.get_nav_status_gps())',
        'get_nav_status_gps()'
    ]),
    'Pioneer.set_param': method([
        'Записать параметр автопилота. Если параметра нет - печатает «Установка параметра ... не удалась» и возвращает False. В симуляторе известны только параметры RC из README (Copter_man_rcMode0, Copter_man_rcMode1, Copter_man_rcMode2, Copter_flyWithoutRc, SensorMux_rc); Copter_com_takeoffAlt (высота взлёта, 0.4 м по умолчанию); Flight_com_navSystem читается, но не меняется: навигация симулятора всегда LPS. Значение запоминается до конца программы и, кроме RC-набора, не влияет на полёт и не меняет параметры автопилота в панели настроек симулятора.',
        'pioneer.set_param(name, value) -> bool',
        'name - имя параметра; value - число',
        'True, если параметр записан, иначе False',
        'pioneer.set_param("Copter_flyWithoutRc", 1)',
        'set_param("${1:name}", ${2:1})',
        ['параметр', 'настройка автопилота']
    ]),
    'Pioneer.send_rc_channels': method([
        'Отправляет значения RC-каналов (как с пульта). Автопилот слушает их, если выставлены параметры: Copter_man_rcMode0=6, Copter_man_rcMode1=3, Copter_man_rcMode2=3, Copter_flyWithoutRc=1, SensorMux_rc=2. На борту RC нужно отправлять постоянно, чтобы не пропала связь. Значения от -1 до 1: канал 1 - правый стик вправо (1) / влево (-1); канал 2 - правый стик назад (1) / вперёд (-1); канал 3 - левый стик вверх (1) / вниз (-1); канал 4 - левый стик влево (1) / вправо (-1); каналы 5-8 - тумблеры пульта: 5 - SWC (0/1/2), 6 - SWD (0/2), 7 - SWB (0/1/2), 8 - SWA (0/2). В симуляторе, когда параметры выставлены и дрон в воздухе, каналы 1-4 дают скорость в осях дрона (до 1 м/с, вверх до 0.5 м/с) на 0.5 с; без параметров вызов только запоминает каналы.',
        'pioneer.send_rc_channels(channel_1=0, channel_2=0, channel_3=0, channel_4=0, channel_5=1, channel_6=0, channel_7=1, channel_8=0) -> bool',
        'channel_1..channel_4 - стики, числа от -1 до 1; channel_5..channel_8 - тумблеры (положение 0, 1 или 2)',
        'True, если команда отправлена',
        'pioneer.set_param("Copter_man_rcMode0", 6)\npioneer.set_param("Copter_man_rcMode1", 3)\npioneer.set_param("Copter_man_rcMode2", 3)\npioneer.set_param("Copter_flyWithoutRc", 1)\npioneer.set_param("SensorMux_rc", 2)\nfor _ in range(20):\n    pioneer.send_rc_channels(channel_2=-0.5)   # вперёд\n    time.sleep(0.1)',
        'send_rc_channels(channel_1=${1:0}, channel_2=${2:0}, channel_3=${3:0}, channel_4=${4:0})',
        ['rc', 'пульт', 'стики', 'каналы']
    ]),
    'Pioneer.rc_sdk1_to_sdk2': method([
        'Пересчёт значений RC-каналов pioneer_sdk (1000..2000) в значения для send_rc_channels. Формула в pioneer_sdk2 0.11.0 именно такая: channel_1 = channel_4 - 3, channel_2 = channel_3 - 3, channel_3 = (новый channel_1) - 3, channel_4 = (новый channel_2) - 3; режим 2000 даёт 1, иначе 0. Симулятор повторяет её как есть.',
        'pioneer.rc_sdk1_to_sdk2(channel_1=0, channel_2=0, channel_3=0, channel_4=0, channel_5=2000) -> tuple',
        'channel_1..channel_4 - значения каналов pioneer_sdk; channel_5 - канал режима (2000 - включён)',
        'кортеж из 5 значений',
        'ch1, ch2, ch3, ch4, ch5 = pioneer.rc_sdk1_to_sdk2(1500, 1500, 1500, 1500, 2000)',
        'rc_sdk1_to_sdk2(${1:1500}, ${2:1500}, ${3:1500}, ${4:1500}, ${5:2000})'
    ]),
    'Pioneer.get_rc_channel': method([
        'Читает значение RC-канала автопилота (поле, которое настроено для платы). Это восьмой канал, тумблер SWA: положение 0, 1 или 2. В симуляторе пульта нет: 0, а после send_rc_channels - значение channel_8.',
        'pioneer.get_rc_channel() -> int',
        'нет',
        'число или None при ошибке',
        'print(pioneer.get_rc_channel())',
        'get_rc_channel()'
    ]),
    'Pioneer.set_rc_trigger': method([
        'Вызывает функцию, когда меняется значение RC-канала (get_rc_channel). Проверка раз в 0.1 с; первый раз функция вызывается сразу с текущим значением. Функция получает новое значение. Ошибка внутри функции печатается как «-> Ошибка при чтении поля или вызове колбэка».',
        'pioneer.set_rc_trigger(callback)',
        'callback(value) - функция',
        'None',
        'def on_rc(value):\n    print("RC:", value)\n\npioneer.set_rc_trigger(on_rc)',
        'set_rc_trigger(${1:on_rc})',
        ['триггер', 'rc']
    ]),
    'Pioneer.cargo_set': method([
        'Включает (True) или выключает (False) магнитный захват груза. Модуль есть только у Базового Пионера: у Мини 2 (и в симуляторе) печатает «-> Модуль магнитного захвата груза не поддерживается» и возвращает False. Для Мини 2 берите grab_close / grab_open.',
        'pioneer.cargo_set(grab) -> bool',
        'grab - True включить, False выключить',
        'True, если команда выполнена, иначе False',
        'if not pioneer.cargo_set(True):\n    pioneer.grab_close()',
        'cargo_set(${1:True})',
        ['магнит', 'груз']
    ]),
    'Pioneer.cargo_grab': method([
        'Включает магнитный захват груза (то же, что cargo_set(True)). У Мини 2 не поддерживается: False.',
        'pioneer.cargo_grab() -> bool',
        'нет',
        'bool',
        'pioneer.cargo_grab()',
        'cargo_grab()'
    ]),
    'Pioneer.cargo_release': method([
        'Выключает магнитный захват груза (то же, что cargo_set(False)). У Мини 2 не поддерживается: False.',
        'pioneer.cargo_release() -> bool',
        'нет',
        'bool',
        'pioneer.cargo_release()',
        'cargo_release()'
    ]),
    'NavSystem': method([
        'Системы навигации: GPS (ГНСС), LPS (локальная, «Локус»), OPT (оптическая). Возвращается из get_nav_system(); в симуляторе - LPS. Импорт: from pioneer_sdk2.piosdk2 import NavSystem.',
        'from pioneer_sdk2.piosdk2 import NavSystem',
        'NavSystem.GPS, LPS, OPT',
        'Enum',
        'if pioneer.get_nav_system() == NavSystem.LPS:\n    print("Локальная навигация")',
        'NavSystem.${1:LPS}'
    ], 'Enum'),
    'NavStatus': method([
        'Состояние навигации: NO_DATA (нет данных с модуля), CANNOT (позицию оценить нельзя), LOW (малое доверие), OK (успешная оценка). Возвращается из get_nav_status_lps() и get_nav_status_gps(). Импорт: from pioneer_sdk2.piosdk2 import NavStatus.',
        'from pioneer_sdk2.piosdk2 import NavStatus',
        'NavStatus.NO_DATA, CANNOT, LOW, OK',
        'Enum',
        'if pioneer.get_nav_status_lps() == NavStatus.OK:\n    pioneer.arm()',
        'NavStatus.${1:OK}'
    ], 'Enum'),
    'ServoPriority': method([
        'Приоритет команды сервопривода камеры: HIGH, MEDIUM, LOW (по умолчанию LOW). Передаётся вторым аргументом в ServoCamera.set_angle.',
        'from pioneer_sdk2 import ServoPriority',
        'ServoPriority.HIGH, MEDIUM, LOW',
        'Enum',
        'servo.set_angle(-30, ServoPriority.HIGH)',
        'ServoPriority.${1:LOW}'
    ], 'Enum'),
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
        'Следующий кадр - массив numpy с цветами BGR (30 кадров в секунду). Нет кадра timeout секунд - TimeoutError; на всякий случай проверяйте и кадр на None. После поворота ServoCamera в очереди могут быть старые кадры: пропустите несколько.',
        'camera.get_cv_frame(timeout=5.0) -> numpy.ndarray',
        'timeout - секунды',
        'кадр BGR',
        'frame = camera.get_cv_frame()',
        'get_cv_frame()',
        ['кадр', 'изображение']
    ]),
    'Camera.stop': method([
        'Остановить захват кадров. Ставьте в finally; на дроне без stop() программа после конца кода не завершается.',
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
    'CameraType': method([
        'Тип камеры для Camera и RecorderControl: CameraType.MAIN - основная передняя камера, CameraType.OPT - нижняя камера оптической навигации. Импорт: from pioneer_sdk2 import CameraType.',
        'from pioneer_sdk2 import CameraType',
        'CameraType.MAIN, CameraType.OPT',
        'Enum',
        'camera = Camera(camera_type=CameraType.OPT)',
        'CameraType.${1:MAIN}'
    ], 'Enum'),
    'RecorderControl': method([
        'Запись видео и фото камеры в галерею дрона (только Мини 2). На дроне видео попадает в /mnt/media/videos/, фото в /mnt/media/photos/; их видно в галерее Pioneer Code. В симуляторе библиотека проверяет аргументы, ведёт состояние записи и печатает, что сделала, но файлы не создаёт.',
        'RecorderControl()',
        'нет',
        'объект RecorderControl',
        'from pioneer_sdk2 import RecorderControl, CameraType\nrecorder = RecorderControl()',
        'RecorderControl()',
        ['запись видео', 'фото', 'галерея']
    ], 'Class'),
    'RecorderControl.get_camera_recording_configs': method([
        'Режимы записи камеры: список (ширина, высота, fps). Любой элемент можно передать в start_recording и take_photo. В симуляторе - свои режимы: у MAIN 1280x720 и 640x360 при 30 fps, у OPT 640x480.',
        'recorder.get_camera_recording_configs(camera_type=CameraType.MAIN) -> list',
        'camera_type - CameraType.MAIN или OPT',
        'список режимов',
        'configs = recorder.get_camera_recording_configs(CameraType.MAIN)\nconfig = configs[0] if configs else None',
        'get_camera_recording_configs(CameraType.${1:MAIN})'
    ]),
    'RecorderControl.start_recording': method([
        'Начать видеозапись. Запись идёт параллельно с полётом; остановите её stop_recording в finally. config=None - первый доступный режим. Повторный запуск при идущей записи - RuntimeError.',
        'recorder.start_recording(camera_type=CameraType.MAIN, config=None, output_dir="/mnt/media/videos")',
        'camera_type - камера; config - режим из get_camera_recording_configs; output_dir - папка на дроне',
        'True, если запись началась',
        'recorder.start_recording(CameraType.MAIN, config)',
        'start_recording(CameraType.${1:MAIN})'
    ]),
    'RecorderControl.stop_recording': method([
        'Остановить видеозапись камеры. Если запись не шла - False.',
        'recorder.stop_recording(camera_type=CameraType.MAIN)',
        'camera_type - камера',
        'True, если запись остановлена',
        'recorder.stop_recording(CameraType.MAIN)',
        'stop_recording(CameraType.${1:MAIN})'
    ]),
    'RecorderControl.take_photo': method([
        'Сделать фото. Имя файла - непустое, с расширением .jpg, .jpeg или .png, иначе ValueError. На дроне ошибка камеры - RuntimeError.',
        'recorder.take_photo(file_name, camera_type=CameraType.MAIN, config=None, output_dir="/mnt/media/photos")',
        'file_name - имя файла; camera_type - камера; config - режим; output_dir - папка на дроне',
        'True, если фото сделано',
        'recorder.take_photo("point_1.jpg", CameraType.MAIN, config)',
        'take_photo("${1:photo.jpg}", CameraType.${2:MAIN})'
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
