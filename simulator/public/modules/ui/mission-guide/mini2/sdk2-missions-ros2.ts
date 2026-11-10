import { DONE_LINE, type Sdk2Mission } from './sdk2-mission-kit.js';
import { ROS_CALL, rosFlightProgram, rosGroundProgram } from './sdk2-ros2-kit.js';

/**
 * Главы 14–17: ROS 2 внутри режима «Python · SDK2». Узел `ros_pioneer_node` (gs_core) запускает `rclpy.init()`,
 * а программа ученика — обычный rclpy: клиенты сервисов, подписки, паблишеры, таймеры. Примеры: examples-python-ros2.
 */
const N = { group: 'ros2-services', groupTitle: '14. ROS 2: сервисы полёта' };
const O = { group: 'ros2-topics', groupTitle: '15. ROS 2: топики и телеметрия' };
const P = { group: 'ros2-payload', groupTitle: '16. ROS 2: параметры, навигация и нагрузка' };
const Q = { group: 'ros2-project', groupTitle: '17. ROS 2: итоговый проект' };

export const ROS2_MISSIONS: Sdk2Mission[] = [
    {
        ...N, id: 'sdk2-ros2-hello', title: 'Первый узел rclpy',
        goal: 'Создать узел ROS 2, найти сервис автопилота `geoscan/alive` и вызвать его. Дрон остаётся на земле.',
        steps: [
            '`rclpy.init()` запускает ROS 2 и заодно узел `ros_pioneer_node` дрона: он превращает автопилот в топики и сервисы с префиксом `/geoscan/`. `Node(\'hello\')` — ваш собственный узел в этой сети.',
            '`create_client(тип, имя)` создаёт клиента сервиса, `call_async(запрос)` отправляет вызов и сразу возвращает `future` — обещание ответа. `Live` — сервис «автопилот на связи?».',
            'Ответа нужно дождаться: узел «крутят» функцией, которая обрабатывает сообщения, пока `future` не готов. Вместо `___` впишите её имя: `spin_until_future_complete`.',
            'Нажмите «Проверить полёт»: в журнале имя узла и «Автопилот на связи: True». Ответ лежит в `future.result()`.'
        ],
        hint: 'Название функции говорит само за себя: spin (крутить) until (пока не) future_complete (будет завершено). Первым аргументом идёт узел, вторым — future.',
        outcome: 'Вы подключились к дрону через ROS 2: узел, клиент сервиса, вызов и ожидание ответа. Эта связка нужна в каждой следующей миссии.',
        starter: `import rclpy
from rclpy.node import Node
from gs_interfaces.srv import Live

rclpy.init()
node = Node('hello')
print("Узел:", node.get_name())

client = node.create_client(Live, '/geoscan/alive')
if not client.wait_for_service(timeout_sec=5.0):
    print("Сервис не найден")
else:
    future = client.call_async(Live.Request())
    rclpy.___(node, future)
    print("Автопилот на связи:", future.result().status)

node.destroy_node()
rclpy.shutdown()
${DONE_LINE}`,
        answers: ['spin_until_future_complete'], waitMs: 30000,
        check: (g) => {
            g.basics(false).noArm();
            g.expectText('Узел:', 'hello', 'Создайте узел командой Node(\'hello\') и напечатайте node.get_name().');
            g.expectText('Автопилот на связи:', 'True', 'Дождитесь ответа сервиса /geoscan/alive и напечатайте future.result().status.');
        }
    },
    {
        ...N, id: 'sdk2-ros2-cycle', title: 'Полётный цикл сервисами',
        goal: 'Взлететь и сесть только сервисами `gs_core`: arm → takeoff → land → disarm, а о состоянии дрона узнавать из топика.',
        steps: [
            'Команды полёта — это сервисы: `arm` (запрос `Arm` с `timeout` и `retries`), `takeoff`, `land`, `disarm` (запросы `Trigger` без полей). Каждый возвращает `success`. Сервис отвечает, когда команда принята, а не когда дрон взлетел.',
            'О том, что дрон уже в воздухе, сообщает топик `flight/fly_state`: 0 — на земле, 1 — моторы запущены, 2 — в воздухе. Подписка запоминает его в словаре `state`, а `wait_state` крутит узел, пока значение не станет нужным.',
            'В заготовке два пропуска. Первый — имя сервиса посадки в `/geoscan/flight/___`: `land`. Второй — состояние, которого ждём после посадки: `ON_LAND`.',
            'Нажмите «Проверить полёт»: в журнале «В воздухе» и «На земле», дрон висит около трёх секунд.'
        ],
        hint: 'Имя сервиса посадки совпадает с английским словом land. После посадки fly_state снова равен ON_LAND (константа уже объявлена выше).',
        outcome: 'Полный цикл полёта через ROS 2. Обратите внимание на порядок: сервис отвечает быстро, а факт взлёта подтверждает топик.',
        starter: `import rclpy
from rclpy.duration import Duration
from rclpy.node import Node
from std_msgs.msg import Int8
from std_srvs.srv import Trigger
from gs_interfaces.srv import Arm

ON_LAND, IN_SKY = 0, 2    # значения flight/fly_state

rclpy.init()
node = Node('flight_cycle')
state = {"fly": ON_LAND}


def on_fly_state(msg):
    state["fly"] = msg.data


node.create_subscription(Int8, '/geoscan/flight/fly_state', on_fly_state, 10)
arm_client = node.create_client(Arm, '/geoscan/flight/arm')
takeoff_client = node.create_client(Trigger, '/geoscan/flight/takeoff')
land_client = node.create_client(Trigger, '/geoscan/flight/___')
disarm_client = node.create_client(Trigger, '/geoscan/flight/disarm')
${ROS_CALL}
def wait_state(wanted):
    while rclpy.ok() and state["fly"] != wanted:
        rclpy.spin_once(node, timeout_sec=0.1)


in_air = False
try:
    if not call(arm_client, Arm.Request(timeout=5.0, retries=0)).success:
        raise SystemExit("Моторы не запустились")
    call(takeoff_client, Trigger.Request())
    wait_state(IN_SKY)
    in_air = True
    print("В воздухе")
    end = node.get_clock().now() + Duration(seconds=3)
    while rclpy.ok() and node.get_clock().now() < end:
        rclpy.spin_once(node, timeout_sec=0.1)
    call(land_client, Trigger.Request())
    wait_state(___)
    in_air = False
    print("На земле")
finally:
    if in_air:
        call(land_client, Trigger.Request())
        wait_state(ON_LAND)
    call(disarm_client, Trigger.Request())
    node.destroy_node()
    rclpy.shutdown()
${DONE_LINE}`,
        answers: ['land', 'ON_LAND'], waitMs: 90000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            if (g.takeoffDone && g.landStart && g.airTime() < 2.5) g.fail('Дрон не повис', `В воздухе дрон провёл ${g.airTime().toFixed(1)} с, а нужно около трёх.`, 'Оставьте цикл с rclpy.spin_once на три секунды между взлётом и посадкой.');
            g.order(['В воздухе', 'На земле'], 'Печатайте «В воздухе» после wait_state(IN_SKY) и «На земле» после wait_state(ON_LAND).');
        }
    },
    {
        ...N, id: 'sdk2-ros2-go-map', title: 'Точка в системе map',
        goal: 'Отправить дрон в точки сервисом `go_to_local_point` в мировых осях `map` и дождаться прилёта по событию автопилота.',
        steps: [
            '`go_to_local_point` принимает `x, y, z` (метры), `yaw` (градусы), `time` (сек, 0 — по умолчанию) и `frame_id`. В `map` координаты — те же, что у `get_local_position_lps`: начало в точке старта. Все числа должны быть вещественными: `1.0`, а не `1` (rclpy проверяет типы).',
            'Сервис отвечает, когда команда принята. Прилёт сообщает событие `POINT_REACHED` в топике `flight/callback_event`: функция `go()` каркаса сбрасывает флаг, отправляет точку и ждёт, пока обработчик не поднимет флаг.',
            'Вместо `___` впишите имя системы координат по умолчанию в `go()`: мировые оси называются `map`.',
            'Нажмите «Проверить полёт»: дрон летит в (1.5, 0.5) на высоте 1 м, возвращается в (0, 0) и садится.'
        ],
        hint: 'Мировая система координат в ROS называется map (карта). Пишется в кавычках, строчными буквами, без пробелов.',
        outcome: 'Вы летите по точкам через ROS 2: сервис отправил команду, а топик событий подтвердил прилёт. Так же устроены и миссии на pioneer_sdk2, только вместо point_reached() — событие.',
        starter: rosFlightProgram({ goFrame: '___', body: 'go(1.5, 0.5, 1.0)\nprint("Долетели")\ngo(0.0, 0.0, 1.0)' }),
        answers: ['map'], waitMs: 120000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing().route([[1.5, 0.5, 1], [0, 0, 1]]);
            g.expectText('Долетели', '', 'Оставьте print("Долетели") после первой точки.');
        }
    },
    {
        ...N, id: 'sdk2-ros2-base-link', title: 'Шаги в base_link и правило курса',
        goal: 'Облететь квадрат шагами «вперёд на метр» в осях дрона `base_link`, поворачивая курс так, чтобы не крутить дрон лишний раз.',
        steps: [
            '`frame_id: base_link` — оси самого коптера: `x` — вперёд (по носу), `y` — влево, `z` — вверх; координаты считаются как смещение от текущей позиции. Нос дрона смотрит вдоль +Y сцены, поэтому шаг `x=1.0` из старта приводит в точку (0, 1).',
            'Правило курса: `yaw` — абсолютный курс в градусах. Если он совпадает с предыдущим заданным, дрон не поворачивается; если нет — поворачивается. Значит, в каждом шаге нужно передавать тот курс, который у дрона сейчас (`heading`), иначе `yaw=0.0` развернёт его обратно.',
            'Поворот на месте — тот же сервис с нулевым смещением и новым курсом. Но «долетел» не значит «повернулся»: точка с нулевым смещением достигается сразу, а дрон ещё крутится. Поэтому `turn_to()` ждёт, пока курс из топика `navigation/local/yaw` дойдёт до нужного, иначе следующий шаг пойдёт не туда. В заготовке не хватает того, на сколько прибавлять курс после каждой стороны: впишите `90.0` вместо `___` (градусы, против часовой).',
            'Нажмите «Проверить полёт»: дрон идёт по сторонам квадрата (0, 1) → (−1, 1) → (−1, 0) → (0, 0) и садится.'
        ],
        hint: 'Квадрат состоит из четырёх сторон и четырёх поворотов по 90 градусов. Курс накапливается: 90, 180, 270, 360.',
        outcome: 'Оси base_link удобны для «шагов от дрона», а правило курса надо помнить: пишите в yaw актуальный курс, а меняйте его осознанно.',
        starter: rosFlightProgram({
            imports: 'import math\nfrom std_msgs.msg import Float32\n',
            setup: `heading = 0.0       # последний заданный курс, градусы
current = {"yaw": 0.0}    # курс по топику local/yaw, градусы


def on_yaw(msg):
    current["yaw"] = math.degrees(msg.data)


node.create_subscription(Float32, '/geoscan/navigation/local/yaw', on_yaw, 10)


def turn_to(angle):
    """Повернуть на месте и дождаться, пока курс по local/yaw дойдёт до angle."""
    go(0.0, 0.0, 0.0, yaw=angle, frame='base_link')
    while rclpy.ok() and abs((current["yaw"] - angle + 180) % 360 - 180) > 5.0:
        rclpy.spin_once(node, timeout_sec=0.1)

`,
            body: `for side in range(4):
    go(1.0, 0.0, 0.0, yaw=heading, frame='base_link')    # шаг вперёд
    print("Сторона", side + 1)
    heading += ___
    turn_to(heading)`
        }),
        answers: ['90.0'], waitMs: 240000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing().route([[0, 1, 1], [-1, 1, 1], [-1, 0, 1], [0, 0, 1]]);
            if (g.texts('Сторона').length !== 4) g.fail('Сторон не четыре', `Напечатано строк «Сторона» — ${g.texts('Сторона').length}.`, 'Печатайте номер стороны в цикле, по одной строке на сторону.');
        }
    },
    {
        ...N, id: 'sdk2-ros2-denied', title: 'Отказ сервиса',
        goal: 'Научить программу не падать, когда сервис отказал: проверять `success` и реагировать.',
        steps: [
            'Сервис не бросает исключение, если команда недопустима: он отвечает `success=False`, а причину пишет в журнал узла. Взлёт до `arm`, посадка на земле, `go_to_local_point` на земле — всё это отказы.',
            'В заготовке `try_call` вызывает сервис, печатает «готово» или «отказ» и возвращает признак. Сначала программа нарочно просит взлёт до `arm` и получает отказ, потом всё делает в правильном порядке.',
            'Вместо `___` впишите поле ответа, которое хранит результат: `success`.',
            'Нажмите «Проверить полёт»: «Взлёт без arm: отказ», «arm: готово», «takeoff: готово», «land: готово».'
        ],
        hint: 'У ответов Trigger и Arm одно общее поле с результатом: response.success. Не путайте с message — это текст причины.',
        outcome: 'Отказ — обычный ответ, а не ошибка программы. Проверяйте success после каждой команды полёта и решайте, что делать дальше.',
        starter: rosFlightProgram({
            pre: '', body: 'print("Дрон в воздухе")',
            setup: `
def try_call(name, client, request):
    """Вызвать сервис и сообщить результат."""
    response = call(client, request)
    print(name + ":", "готово" if response.___ else "отказ")
    return response.success


`
        }).replace(`    if not call(arm_client, Arm.Request(timeout=5.0, retries=0)).success:
        raise SystemExit("Моторы не запустились")
    call(takeoff_client, Trigger.Request())
    wait_state(IN_SKY)
    in_air = True`, `    try_call("Взлёт без arm", takeoff_client, Trigger.Request())     # arm ещё не было: отказ
    if not try_call("arm", arm_client, Arm.Request(timeout=5.0, retries=0)):
        raise SystemExit("Моторы не запустились")
    if not try_call("takeoff", takeoff_client, Trigger.Request()):
        raise SystemExit("Взлёт отклонён")
    wait_state(IN_SKY)
    in_air = True`).replace(`    call(land_client, Trigger.Request())
    wait_state(ON_LAND)
    in_air = False
finally:`, `    try_call("land", land_client, Trigger.Request())
    wait_state(ON_LAND)
    in_air = False
    try_call("Посадка на земле", land_client, Trigger.Request())     # уже сели: отказ
finally:`),
        answers: ['success'], waitMs: 90000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            g.order(['Взлёт без arm: отказ', 'arm: готово', 'takeoff: готово', 'land: готово', 'Посадка на земле: отказ'], 'Печатайте результат каждого вызова: «готово», если success=True, и «отказ», если False.');
            const beforeArm = g.states.find((event) => event.state === 'TAKEOFF_PROCESS');
            if (beforeArm && g.arms[0] && beforeArm.time < g.arms[0].time) g.fail('Взлёт прошёл до arm', 'Сервис takeoff не должен срабатывать, пока моторы не запущены.', 'Взлёт — только после успешного arm.');
        }
    },
    {
        ...N, id: 'sdk2-ros2-rtl', title: 'Возврат домой: rtl',
        goal: 'Улететь от старта и вызвать сервис `rtl`: автопилот сам вернёт дрон к точке старта, а посадит его уже программа.',
        steps: [
            '`rtl` (return to launch) — «домой»: автопилот сам летит к точке старта и зависает над ней на высоте `Flight_com_homeAlt` (по умолчанию 0,5 м). Сажает дрон только параметр `Flight_com_landAtHome`, а он по умолчанию выключен. Запрос сервиса — `Trigger`; отвечает он сразу.',
            'Событие `POINT_REACHED` после `rtl` не приходит: возврат — не `go_to_local_point`. Прилёт домой определяют по топику `navigation/local/position`: функция `home_distance()` считает расстояние от старта до последней позиции. Пока оно больше 0,3 м, узел крутится.',
            'Вместо `___` в `/geoscan/flight/___` впишите имя сервиса возврата домой: `rtl`.',
            'Нажмите «Проверить полёт»: дрон летит в (1.5, 0.5, 1), по команде возвращается к старту, а каркас сажает его.'
        ],
        hint: 'Название сервиса — три буквы, сокращение от return to launch (возврат на точку старта).',
        outcome: 'rtl — запасной выход: его вызывают при потере связи, разряде батареи или ошибке в программе. После возврата не забудьте посадить дрон.',
        starter: rosFlightProgram({
            imports: 'import math\nfrom geometry_msgs.msg import Point\n',
            setup: `rtl_client = node.create_client(Trigger, '/geoscan/flight/___')
position = {"x": 0.0, "y": 0.0}


def on_position(msg):
    position["x"], position["y"] = msg.x, msg.y


node.create_subscription(Point, '/geoscan/navigation/local/position', on_position, 10)


def home_distance():
    """Расстояние до точки старта (0, 0) по горизонтали, метры."""
    return math.hypot(position["x"], position["y"])

`,
            body: `go(1.5, 0.5, 1.0)
print("Далеко от старта")
if not call(rtl_client, Trigger.Request()).success:
    raise SystemExit("rtl отклонён")
print("Возвращаемся")
while rclpy.ok() and home_distance() > 0.3:
    rclpy.spin_once(node, timeout_sec=0.1)
print("Дома")`
        }),
        answers: ['rtl'], waitMs: 180000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing().route([[1.5, 0.5, 1]]);
            g.order(['Далеко от старта', 'Возвращаемся', 'Дома'], 'Вызовите сервис rtl после того, как дрон долетел до точки (1.5, 0.5, 1), и дождитесь возвращения по топику local/position.');
            const end = g.last?.pos;
            if (end && Math.hypot(end.x, end.y) > 0.6) g.fail('Дрон сел не у старта', `Посадка в точке (${end.x.toFixed(1)}, ${end.y.toFixed(1)}).`, 'Дождитесь, пока home_distance() станет меньше 0,3 м, и только потом сажайте дрон.');
        }
    },
    {
        ...O, id: 'sdk2-ros2-sub-battery', title: 'Подписка на батарею',
        goal: 'Подписаться на топик `sensors/battery_state` и прочитать напряжение батареи. Дрон остаётся на земле.',
        steps: [
            'Топики — вторая половина ROS 2: узел публикует данные, а ваш узел на них подписывается. `create_subscription(тип, имя, обработчик, очередь)`: тип сообщения, имя топика, функция, которая вызывается на каждое сообщение, и длина очереди.',
            'Обработчик получает сообщение `msg`. У `sensor_msgs/BatteryState` есть поле `voltage` — напряжение в вольтах. Положите его в словарь `data`: так значение доступно основной программе.',
            'Вместо `___` впишите имя поля с напряжением: `voltage`.',
            'Нажмите «Проверить полёт»: узел крутится, пока не придёт первое сообщение, и печатает «Напряжение: …».'
        ],
        hint: 'Поле называется так же, как физическая величина по-английски: voltage. Ещё в сообщении есть temperature, percentage и другие.',
        outcome: 'Вы подписались на топик ROS 2 и прочитали данные датчика. Обработчик подписки вызывается из spin, поэтому узел нужно «крутить».',
        starter: rosGroundProgram({
            imports: 'from sensor_msgs.msg import BatteryState\n',
            before: `data = {"voltage": None}


def on_battery(msg):
    data["voltage"] = msg.___


node.create_subscription(BatteryState, '/geoscan/sensors/battery_state', on_battery, 10)
`,
            body: 'waited = 0\nwhile data["voltage"] is None and waited < 50:\n    rclpy.spin_once(node, timeout_sec=0.1)\n    waited += 1\nprint("Напряжение:", round(data["voltage"] or 0.0, 2))'
        }),
        answers: ['voltage'], waitMs: 30000,
        check: (g) => {
            g.basics(false).noArm();
            g.expectNumber('Напряжение:', 3, 30, 'Положите в словарь msg.voltage и напечатайте его после spin_once.');
        }
    },
    {
        ...O, id: 'sdk2-ros2-flight-telemetry', title: 'Высота и позиция в полёте',
        goal: 'Подписаться на высоту и локальную позицию, слетать в точку и сообщить, что показали топики.',
        steps: [
            '`sensors/altitude` (`std_msgs/Float32`) — высота над землёй в метрах, число лежит в поле `data`. `navigation/local/position` (`geometry_msgs/Point`) — позиция `x, y, z` в системе старта.',
            'Обработчики запоминают максимум высоты и последнюю позицию. Вместо `___` впишите имя поля Float32, в котором лежит число: `data`.',
            'Программа взлетает, летит в (1, 0, 1), секунду крутит узел, чтобы получить свежие данные, и печатает «Высота: …» и «Позиция: …».',
            'Нажмите «Проверить полёт»: высота близка к 1 м, позиция — к (1, 0, 1).'
        ],
        hint: 'У std_msgs Float32, Int8 и других «простых» типов одно поле, и называется оно data.',
        outcome: 'Телеметрия приходит топиками на частоте, которую задаёт узел (высота 10 Гц, позиция 20 Гц). Подписка не опрашивает дрон — она получает всё, что он публикует.',
        starter: rosFlightProgram({
            imports: 'from std_msgs.msg import Float32\nfrom geometry_msgs.msg import Point\n',
            setup: `telemetry = {"altitude": 0.0, "position": (0.0, 0.0, 0.0)}


def on_altitude(msg):
    telemetry["altitude"] = max(telemetry["altitude"], msg.___)


def on_position(msg):
    telemetry["position"] = (msg.x, msg.y, msg.z)


node.create_subscription(Float32, '/geoscan/sensors/altitude', on_altitude, 10)
node.create_subscription(Point, '/geoscan/navigation/local/position', on_position, 10)

`,
            body: 'go(1.0, 0.0, 1.0)\nspin_for(1.0)\nprint("Высота:", round(telemetry["altitude"], 1))\nx, y, z = telemetry["position"]\nprint("Позиция:", round(x, 1), round(y, 1), round(z, 1))'
        }),
        answers: ['data'], waitMs: 120000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            g.expectNumber('Высота:', 0.6, 1.5, 'Запоминайте msg.data из топика sensors/altitude.');
            const p = g.numbers('Позиция:');
            if (!p || p.length < 3) g.fail('Нет строки «Позиция:»', 'Позиция не напечатана тремя числами.', 'Печатайте x, y, z из последнего сообщения local/position.');
            else if (Math.hypot(p[0] - 1, p[1]) > 0.5 || Math.abs(p[2] - 1) > 0.5) g.fail('Позиция не совпала', `Напечатана позиция (${p.join(', ')}), ожидалась около (1, 0, 1).`, 'Печатайте позицию после прилёта и spin_for(1.0): топик должен обновиться.');
        }
    },
    {
        ...O, id: 'sdk2-ros2-events', title: 'События автопилота',
        goal: 'Читать топик `flight/callback_event`: автопилот сообщает числовыми кодами о запуске моторов, взлёте, прилёте и посадке.',
        steps: [
            '`callback_event` (`std_msgs/Int8`) публикует событие в момент, когда оно произошло: 8 — моторы запущены, 7 — взлёт завершён, 5 — точка достигнута, 2 — посадка завершена, 1 — моторы остановлены. Это те же коды, что в `Event` пакета `pioneer_sdk2`.',
            'В каркасе уже есть обработчик `on_event`, он ловит код 5 для `go()`. Дополнительная строка печатает название события по таблице `NAMES`. Одно название в таблице пропущено.',
            'Вместо `___` впишите название события с кодом 7: `TAKEOFF_COMPLETE`.',
            'Нажмите «Проверить полёт»: журнал показывает ENGINES_STARTED, TAKEOFF_COMPLETE, POINT_REACHED, COPTER_LANDED по порядку.'
        ],
        hint: 'Событие, которое приходит, когда takeoff закончен: take-off complete заглавными буквами через подчёркивание.',
        outcome: 'События — это «уведомления» автопилота. Программа на ROS 2 не опрашивает дрон, а реагирует на сообщения.',
        starter: rosFlightProgram({
            setup: 'NAMES = {1: "DISARM", 2: "COPTER_LANDED", 5: "POINT_REACHED", 7: "___", 8: "ENGINES_STARTED"}\n\n',
            onEvent: 'print("Событие:", NAMES.get(msg.data, msg.data))',
            body: 'go(1.0, 0.0, 1.0)'
        }),
        answers: ['TAKEOFF_COMPLETE'], waitMs: 120000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            g.order(['Событие: ENGINES_STARTED', 'Событие: TAKEOFF_COMPLETE', 'Событие: POINT_REACHED', 'Событие: COPTER_LANDED'], 'Печатайте NAMES.get(msg.data, msg.data) в on_event; код 7 — TAKEOFF_COMPLETE.');
        }
    },
    {
        ...O, id: 'sdk2-ros2-cmd-vel', title: 'Скорость cmd_vel в осях base_link',
        goal: 'Лететь не в точку, а со скоростью: публиковать `TwistStamped` в топик `flight/cmd_vel` дважды в секунду и сильнее.',
        steps: [
            '`create_publisher(тип, имя, очередь)` создаёт паблишер, `publish(msg)` отправляет сообщение. `geometry_msgs/TwistStamped` несёт скорость: `twist.linear.x/y/z` в м/с и `twist.angular.z` в рад/с, а `header.frame_id` выбирает оси: `base_link` — оси дрона (x вперёд), `map` — мировые.',
            'Каждое сообщение держит скорость 0,5 с, потом дрон зависает. Поэтому скорость публикуют постоянно: здесь 30 раз с шагом 0,1 с — три секунды полёта вперёд на 0,3 м/с.',
            'Вместо `___` впишите систему координат, в которой x — вперёд по носу: `base_link`.',
            'Нажмите «Проверить полёт»: дрон уходит вперёд (вдоль +Y сцены) почти на метр и садится.'
        ],
        hint: 'Слово link в названии — «звено»: base_link — корпус робота. Системы в ROS: map (мир) и base_link (корпус).',
        outcome: 'Скорость задаёт непрерывное движение и подходит для слежения и ручного управления. Не забывайте публиковать постоянно, иначе дрон остановится.',
        starter: rosFlightProgram({
            imports: 'from geometry_msgs.msg import TwistStamped\n',
            setup: `velocity_pub = node.create_publisher(TwistStamped, '/geoscan/flight/cmd_vel', 10)


def send_velocity(forward, left=0.0):
    msg = TwistStamped()
    msg.header.frame_id = '___'
    msg.twist.linear.x = forward
    msg.twist.linear.y = left
    velocity_pub.publish(msg)

`,
            body: 'for _ in range(30):    # 30 раз по 0.1 с\n    send_velocity(0.3)\n    rclpy.spin_once(node, timeout_sec=0.1)\nspin_for(1.0)    # последнее сообщение держит скорость 0.5 с: дадим дрону остановиться\nprint("Скорость отправлена")'
        }),
        answers: ['base_link'], waitMs: 120000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            const forward = g.velocities().filter((event) => event.velocity!.y > 0.2 && Math.abs(event.velocity!.x) < 0.1);
            if (forward.length < 20) g.fail('Скорость вперёд почти не подавалась', `Подходящих команд скорости — ${forward.length}, нужно хотя бы 20.`, 'Публикуйте TwistStamped с frame_id base_link и linear.x = 0.3 в цикле, по одному сообщению на spin_once.');
            const begin = g.takeoffDone?.pos;
            const end = [...g.states].reverse().find((event) => event.state === 'LANDING_PROCESS')?.pos;
            if (begin && end && end.y - begin.y < 0.6) g.fail('Дрон почти не сдвинулся', `Смещение вперёд — ${(end.y - begin.y).toFixed(2)} м.`, 'Скорость 0,3 м/с в течение трёх секунд даёт около 0,9 м; публикуйте сообщение в каждом обороте цикла.');
        }
    },
    {
        ...O, id: 'sdk2-ros2-square-vel', title: 'Квадрат скоростью по таймеру',
        goal: 'Облететь квадрат скоростью в мировых осях `map`, раздавая команды из таймера `create_timer`.',
        steps: [
            '`create_timer(период, функция)` вызывает функцию каждые `период` секунд, пока узел крутится (`spin`). Это удобнее ручного цикла: частота публикации не зависит от остального кода.',
            'Таймер вызывается каждые 0,1 с. Каждые 25 вызовов (2,5 с на стороне при скорости 0,4 м/с = 1 м) меняется сторона квадрата. Скорости сторон лежат в списке `LEGS`: «вперёд» (+X), «влево» (+Y), «назад» (−X) и «вправо» (−Y).',
            'В списке не хватает четвёртой стороны. Вместо `___` впишите кортеж скорости `(0.0, -0.4)`.',
            'Нажмите «Проверить полёт»: дрон идёт по квадрату 1×1 м в осях `map` и возвращается к старту.'
        ],
        hint: 'Каждая сторона — пара (vx, vy). Квадрат замыкается, когда сумма скоростей по каждой оси равна нулю: после +0.4 по X и -0.4 по X нужно +0.4 и -0.4 по Y.',
        outcome: 'Скорость по таймеру — типовая схема управления в ROS: частота задаётся таймером, а логика хранится в состоянии узла.',
        starter: rosFlightProgram({
            imports: 'from geometry_msgs.msg import TwistStamped\n',
            setup: `LEGS = [(0.4, 0.0), (0.0, 0.4), (-0.4, 0.0), ___]
TICKS_PER_LEG = 25
velocity_pub = node.create_publisher(TwistStamped, '/geoscan/flight/cmd_vel', 10)
tick = {"n": 0}


def on_timer():
    leg = tick["n"] // TICKS_PER_LEG
    if leg < len(LEGS):
        msg = TwistStamped()
        msg.header.frame_id = 'map'
        msg.twist.linear.x, msg.twist.linear.y = LEGS[leg]
        velocity_pub.publish(msg)
    tick["n"] += 1


`,
            body: 'timer = node.create_timer(0.1, on_timer)\nwhile rclpy.ok() and tick["n"] < TICKS_PER_LEG * len(LEGS):\n    rclpy.spin_once(node, timeout_sec=0.1)\ntimer.cancel()\nspin_for(1.0)    # последнее сообщение держит скорость 0.5 с: дадим дрону остановиться\nprint("Квадрат пройден")'
        }),
        answers: ['(0.0, -0.4)'], waitMs: 180000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            const moves = g.velocities().filter((event) => Math.hypot(event.velocity!.x, event.velocity!.y) > 0.3);
            if (moves.length < 60) g.fail('Команд скорости мало', `Команд скорости — ${moves.length}, а нужно хотя бы 60.`, 'Публикуйте TwistStamped из таймера на каждом тике, пока идёт квадрат.');
            const xs = g.samples.map((sample) => sample.snapshot.pos.x);
            const ys = g.samples.map((sample) => sample.snapshot.pos.y);
            if (Math.max(...xs) - Math.min(...xs) < 0.6 || Math.max(...ys) - Math.min(...ys) < 0.6) g.fail('Квадрат не получился', 'Дрон не прошёл ни по X, ни по Y хотя бы на 0,6 м.', 'Проверьте четыре стороны LEGS: две по X и две по Y с разными знаками.');
            const begin = g.takeoffDone?.pos;
            const end = [...g.states].reverse().find((event) => event.state === 'LANDING_PROCESS')?.pos;
            if (begin && end && Math.hypot(end.x - begin.x, end.y - begin.y) > 0.7) g.fail('Дрон не вернулся к старту', `До начала квадрата ${Math.hypot(end.x - begin.x, end.y - begin.y).toFixed(2)} м.`, 'Четвёртая сторона должна вернуть дрон: скорость (0.0, -0.4).');
        }
    },
    {
        ...O, id: 'sdk2-ros2-rc', title: 'Каналы RC: rc/set_channels и rc/trigger',
        goal: 'Публиковать каналы виртуального пульта и читать из `rc/trigger`, как меняется 8-й канал. Дрон остаётся на земле.',
        steps: [
            '`rc/set_channels` (`gs_interfaces/RcChannels`) — восемь каналов `channel_1 … channel_8`, значения 1000…2000, центр 1500. Каналы нужно публиковать постоянно, пока нужна связь с «пультом».',
            '`rc/trigger` (`std_msgs/Int32`) сообщает значение 8-го канала при каждом изменении. На восьмой канал обычно назначают тумблер: 1000, 1500 или 2000.',
            'Вместо `___` впишите значение, которое «включает» тумблер: `2000`. Остальные ручки стоят по центру, газ — внизу.',
            'Нажмите «Проверить полёт»: в журнале «Тумблер: 2000».'
        ],
        hint: 'Максимум шкалы пульта — 2000. Значения 1000 и 1500 — «выключено» и «середина».',
        outcome: 'Вы управляете каналами пульта из ROS 2. На этой схеме строят свои джойстики и пульты на клавиатуре.',
        starter: rosGroundProgram({
            imports: 'from std_msgs.msg import Int32\nfrom gs_interfaces.msg import RcChannels\n',
            before: `rc_pub = node.create_publisher(RcChannels, '/geoscan/rc/set_channels', 10)


def on_trigger(msg):
    print("Тумблер:", msg.data)


def send_rc():
    msg = RcChannels()
    msg.channel_1 = msg.channel_2 = msg.channel_4 = 1500
    msg.channel_3 = 1000                        # газ внизу
    msg.channel_5 = msg.channel_6 = msg.channel_7 = 1500
    msg.channel_8 = ___                         # тумблер
    rc_pub.publish(msg)


node.create_subscription(Int32, '/geoscan/rc/trigger', on_trigger, 10)
node.create_timer(0.1, send_rc)
`,
            body: 'end = node.get_clock().now().nanoseconds + 3 * 10**9\nwhile rclpy.ok() and node.get_clock().now().nanoseconds < end:\n    rclpy.spin_once(node, timeout_sec=0.1)'
        }),
        answers: ['2000'], waitMs: 30000,
        check: (g) => {
            g.basics(false).noArm();
            const values = g.texts('Тумблер:').map(Number);
            if (!values.includes(2000)) g.fail('Тумблер не сработал', `Из rc/trigger пришло: ${values.join(', ') || 'ничего'}.`, 'Опубликуйте channel_8 = 2000 в rc/set_channels и крутите узел минимум секунду.');
        }
    },
    {
        ...P, id: 'sdk2-ros2-params', title: 'Параметры автопилота по сервису',
        goal: 'Прочитать и записать параметр автопилота сервисами `board/get_param` и `board/set_param`, обработать отсутствующий параметр.',
        steps: [
            '`board/get_param` (`GetParam`: `name`, `update`) возвращает `value` и `status`. `board/set_param` (`SetParam`: `name`, `value`) записывает параметр и отвечает `status`. Неизвестное имя даёт `status=False`.',
            'Параметр `Copter_com_takeoffAlt` — высота взлёта. Функция `read()` возвращает значение или `None`, если параметра нет.',
            'Вместо `___` впишите новое значение высоты взлёта: `0.8`.',
            'Нажмите «Проверить полёт»: «Высота взлёта: 0.4», «Записали: True», «Теперь: 0.8», «Несуществующий: None». В конце программа возвращает 0.4.'
        ],
        hint: 'Значение — обычное число с точкой: 0.8. Параметры автопилота числовые, вещественные.',
        outcome: 'Параметры автопилота читаются и записываются сервисами. Всегда возвращайте изменённое на место: параметры «липнут» к узлу.',
        starter: rosGroundProgram({
            imports: 'from gs_interfaces.srv import GetParam, SetParam\n',
            before: `get_client = node.create_client(GetParam, '/geoscan/board/get_param')
set_client = node.create_client(SetParam, '/geoscan/board/set_param')


def read(name):
    response = call(get_client, GetParam.Request(name=name, update=False))
    return round(response.value, 2) if response.status else None


def write(name, value):
    return call(set_client, SetParam.Request(name=name, value=value)).status

`,
            body: `NAME = 'Copter_com_takeoffAlt'
print("Высота взлёта:", read(NAME))
print("Записали:", write(NAME, ___))
print("Теперь:", read(NAME))
print("Несуществующий:", read('No_such_param'))
write(NAME, 0.4)    # вернуть как было`
        }),
        answers: ['0.8'], waitMs: 30000,
        check: (g) => {
            g.basics(false).noArm();
            g.expectText('Высота взлёта:', '0.4', 'Прочитайте параметр через board/get_param и напечатайте response.value.');
            g.expectText('Записали:', 'True', 'Запишите значение через board/set_param и напечатайте status.');
            g.expectText('Теперь:', '0.8', 'После записи 0.8 повторное чтение должно вернуть 0.8.');
            g.expectText('Несуществующий:', 'None', 'Для неизвестного имени get_param отвечает status=False: верните None.');
        }
    },
    {
        ...P, id: 'sdk2-ros2-nav-system', title: 'Система навигации и запрет в полёте',
        goal: 'Сменить систему навигации сервисом `navigation/set_system` на земле и убедиться, что в воздухе Мини 2 это запрещает.',
        steps: [
            '`navigation/get_system` возвращает текущую систему (`GPS`, `LPS`, `OPT`), `navigation/set_system` меняет её: систему нужно менять именно им, а не через `set_param`. На Мини 2 параметр узла `nav_system_change_in_flight` равен `false`, поэтому в полёте смена отклоняется.',
            'Программа читает систему, на земле переключает её на `OPT` (успех), возвращает `LPS`, взлетает и пробует переключить снова — теперь отказ. Напечатайте, как всё прошло.',
            'Вместо `___` впишите название системы, на которую переключаемся на земле: `OPT`.',
            'Нажмите «Проверить полёт»: «Сейчас: LPS», «На земле: готово», «В воздухе: отказ». Дрон взлетает и садится.'
        ],
        hint: 'Допустимые значения — строки GPS, LPS и OPT, заглавными буквами. Для пробы подойдёт OPT: оптический поток.',
        outcome: 'Одни параметры борта можно менять когда угодно, другие — только на земле. Об отказе вы узнаёте из ответа сервиса, а не по исключению.',
        starter: rosFlightProgram({
            imports: 'from gs_interfaces.srv import NavigationSystem, SetNavigationSystem\n',
            setup: `get_system = node.create_client(NavigationSystem, '/geoscan/navigation/get_system')
set_system = node.create_client(SetNavigationSystem, '/geoscan/navigation/set_system')


def current():
    return call(get_system, NavigationSystem.Request()).navigation


def switch(name):
    return call(set_system, SetNavigationSystem.Request(navigation=name)).status

`,
            pre: `print("Сейчас:", current())
print("На земле:", "готово" if switch('___') else "отказ")
switch('LPS')    # вернуть как было
`,
            body: 'print("В воздухе:", "готово" if switch(\'OPT\') else "отказ")\nspin_for(1.0)'
        }),
        answers: ['OPT'], waitMs: 90000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            g.order(['Сейчас: LPS', 'На земле: готово', 'В воздухе: отказ'], 'Переключайте систему сервисом set_system: на земле он готов, в воздухе отказывает.');
        }
    },
    {
        ...P, id: 'sdk2-ros2-led', title: 'Светодиоды: PIXEL и FILL',
        goal: 'Управлять светодиодами сервисом `payload/led/set`: каждому диоду свой цвет (`PIXEL`) и один цвет на всю ленту (`FILL`).',
        steps: [
            'Запрос `Led`: `mode` и список `leds` из `ColorRGBA` (компоненты `r, g, b, a` от 0.0 до 1.0). `PIXEL` (0) — диод с номером `i` получает цвет `leds[i]`. `FILL` (1) — вся лента одного цвета из `leds[0]`.',
            'Программа показывает красный и зелёный по диодам (`PIXEL`), затем всю ленту синим и гасит её чёрным.',
            'Вместо `___` впишите режим «одним цветом всё»: `FILL` (обращение вида `Led.Request.FILL`).',
            'Нажмите «Проверить полёт»: диод 0 — красный, синий, выкл.; диод 1 — зелёный, синий, выкл.'
        ],
        hint: 'FILL — «залить». Константы режимов лежат внутри Led.Request: PIXEL и FILL.',
        outcome: 'Подсветкой управляют сервисом: удобно сигнализировать этапы миссии. Всегда гасите светодиоды в конце.',
        starter: rosGroundProgram({
            imports: 'import time\nfrom std_msgs.msg import ColorRGBA\nfrom gs_interfaces.srv import Led\n',
            before: `led_client = node.create_client(Led, '/geoscan/payload/led/set')


def color(r, g, b):
    return ColorRGBA(r=r, g=g, b=b, a=1.0)


def show(mode, colors):
    ok = call(led_client, Led.Request(mode=mode, leds=colors)).success
    print("Подсветка:", "готово" if ok else "отказ")

`,
            body: 'show(Led.Request.PIXEL, [color(1.0, 0.0, 0.0), color(0.0, 1.0, 0.0)])    # красный и зелёный\ntime.sleep(1)\nshow(Led.Request.___, [color(0.0, 0.0, 1.0)])                           # вся лента синяя\ntime.sleep(1)\nshow(Led.Request.FILL, [color(0.0, 0.0, 0.0)])                          # погасить'
        }),
        answers: ['FILL'], waitMs: 30000,
        check: (g) => {
            g.basics(false).noArm();
            const first = g.ledSequence(0).join(',');
            const second = g.ledSequence(1).join(',');
            if (first !== 'red,blue,off') g.fail('Диод 0 мигнул не так', `Цвета диода 0: ${first || 'нет'}, ожидалось red,blue,off.`, 'Сначала PIXEL (красный), затем FILL синий, затем FILL чёрный.');
            if (second !== 'green,blue,off') g.fail('Диод 1 мигнул не так', `Цвета диода 1: ${second || 'нет'}, ожидалось green,blue,off.`, 'Во втором элементе PIXEL должен быть зелёный.');
        }
    },
    {
        ...P, id: 'sdk2-ros2-grab', title: 'Захват и отказ магнита',
        goal: 'Закрыть и открыть механический захват Мини 2 сервисом `payload/grab` и увидеть, что магнитный `cargo_set` на этой модели отказывает.',
        steps: [
            '`payload/grab` (`Grab`): `action` — 0 открыть, 1 закрыть, 2 остановить; `velocity` — 0…100 (вне диапазона — отказ); `movement_time` — секунды: при `> 0` сервис ждёт это время и сам останавливает захват.',
            '`payload/cargo_set` (`SetBool`) — магнитный захват Базового. На Мини 2 параметр узла `cargo: false`, поэтому сервис отвечает `success=False`. Модуль не поддерживается — программа не падает.',
            'Вместо `___` впишите код действия «открыть»: `0`.',
            'Нажмите «Проверить полёт»: «Закрыть: True», «Открыть: True», «Скорость 150: False», «Магнит: False».'
        ],
        hint: 'Закрыть — 1, остановить — 2, открыть — 0. Это те же числа, что в описании сервиса.',
        outcome: 'Набор оборудования зависит от модели борта; его описывает конфиг узла (`grab`, `cargo`). Отказ сервиса сообщает, что модуль не поддерживается.',
        starter: rosGroundProgram({
            imports: 'from std_srvs.srv import SetBool\nfrom gs_interfaces.srv import Grab\n',
            before: `grab_client = node.create_client(Grab, '/geoscan/payload/grab')
cargo_client = node.create_client(SetBool, '/geoscan/payload/cargo_set')


def grab(action, velocity=100):
    return call(grab_client, Grab.Request(movement_time=1.0, velocity=velocity, action=action)).success

`,
            body: 'print("Закрыть:", grab(1))\nprint("Открыть:", grab(___))\nprint("Скорость 150:", grab(1, velocity=150))\nprint("Магнит:", call(cargo_client, SetBool.Request(data=True)).success)'
        }),
        answers: ['0'], waitMs: 30000,
        check: (g) => {
            g.basics(false).noArm();
            g.order(['Закрыть: True', 'Открыть: True', 'Скорость 150: False', 'Магнит: False'], 'Захват: action 1 закрывает, 0 открывает; скорость выше 100 и магнит на Мини 2 отказывают.');
        }
    },
    {
        ...P, id: 'sdk2-ros2-topics-flag', title: 'Конфиг узла: включаем GNSS-топики',
        goal: 'Понять, что набор топиков задаёт конфиг: перезапустить `ros_pioneer_node` с параметром `topics.gnss` и увидеть, как появляются топики.',
        steps: [
            'Каждый параметр `topics.*` включает или отключает семейство топиков. В конфиге Мини 2 (`mini2.yaml`) `topics.gnss: false` — топиков `navigation/global/*` нет. У Базового с Razero отличаются `motors_rpm`, `ranger`, `grab` и `cargo` — различия видны в таблице конфигов справочника.',
            '`node.get_topic_names_and_types()` возвращает все топики сети; функция `has_topic` проверяет, есть ли нужный. Перезапуск узла с новыми параметрами — `restart_pioneer_node(parameters={...})` из `gs_core.launch`.',
            'Вместо `___` впишите значение параметра, которое включает топики: `True`.',
            'Нажмите «Проверить полёт»: «GNSS до: False» и «GNSS после: True». Дрон остаётся на земле.'
        ],
        hint: 'Булев параметр включается значением True (с заглавной буквы), выключается False.',
        outcome: 'Конфиг борта — часть программы: он определяет, какие топики и сервисы существуют. Данные GNSS в симуляторе не публикуются, но сами топики появляются.',
        starter: rosGroundProgram({
            name: 'topics_probe',
            imports: 'from gs_core.launch import restart_pioneer_node\n',
            before: `GNSS_TOPIC = '/geoscan/navigation/global/position'


def has_topic(name):
    return any(topic == name for topic, _types in node.get_topic_names_and_types())

`,
            body: 'print("GNSS до:", has_topic(GNSS_TOPIC))\nrestart_pioneer_node(parameters={\'topics.gnss\': ___})\nprint("GNSS после:", has_topic(GNSS_TOPIC))'
        }),
        answers: ['True'], waitMs: 30000,
        check: (g) => {
            g.basics(false).noArm();
            g.expectText('GNSS до:', 'False', 'Перед перезапуском GNSS-топиков в Мини 2 нет.');
            g.expectText('GNSS после:', 'True', 'Перезапустите узел с parameters={\'topics.gnss\': True}.');
        }
    },
    {
        ...Q, id: 'sdk2-ros2-machine', title: 'Миссия — узел-автомат',
        goal: 'Собрать миссию как узел-автомат: таймер смотрит на состояние, сервисы вызываются через `call_async`, события приходят из топика.',
        steps: [
            'Ожидание внутри обработчиков блокирует узел, поэтому большие программы пишут автоматами. Состояние хранится в `self.state`, таймер раз в 0,2 с вызывает `step()`, а сервисы отправляются без ожидания: `self.future = client.call_async(...)`; в следующий вызов `step()` ответ смотрят у `future`.',
            'Переход между этапами делают события автопилота из `callback_event`: код 7 — взлёт завершён, 5 — точка достигнута, 2 — посадка завершена.',
            'В заготовке пропущены коды двух событий: `EVENT_POINT_REACHED` и `EVENT_COPTER_LANDED`. Впишите по порядку: `5` и `2`.',
            'Нажмите «Проверить полёт»: автомат печатает этапы ARM, TAKEOFF, FLY, FLY, LAND, DONE и пролетает точки (1, 0, 1) и (1, 1, 1).'
        ],
        hint: 'Нужные числа есть в шаге 2: «точка достигнута» — 5, «посадка завершена» — 2.',
        outcome: 'Автомат на таймере — основа настоящих миссий на ROS 2: узел всегда отзывчив, а логика читается как таблица переходов.',
        starter: `import rclpy
from rclpy.node import Node
from std_msgs.msg import Int8
from std_srvs.srv import Trigger
from gs_interfaces.srv import Arm, GoToLocalPoint

EVENT_POINT_REACHED = ___
EVENT_COPTER_LANDED = ___
EVENT_TAKEOFF_COMPLETE = 7

POINTS = [(1.0, 0.0, 1.0), (1.0, 1.0, 1.0)]


class Mission(Node):
    def __init__(self):
        super().__init__('mission')
        self.state = 'ARM'
        self.future = None
        self.event = None
        self.point = 0
        self.create_subscription(Int8, '/geoscan/flight/callback_event', self.on_event, 10)
        self.arm_client = self.create_client(Arm, '/geoscan/flight/arm')
        self.takeoff_client = self.create_client(Trigger, '/geoscan/flight/takeoff')
        self.go_client = self.create_client(GoToLocalPoint, '/geoscan/flight/go_to_local_point')
        self.land_client = self.create_client(Trigger, '/geoscan/flight/land')
        self.disarm_client = self.create_client(Trigger, '/geoscan/flight/disarm')
        self.create_timer(0.2, self.step)

    def on_event(self, msg):
        self.event = msg.data

    def request(self, state, client, request):
        """Отправить сервис без ожидания и перейти в состояние state."""
        self.event = None
        self.future = client.call_async(request)
        self.state = state
        print("Этап:", state)

    def fly_next(self):
        x, y, z = POINTS[self.point]
        self.point += 1
        go = GoToLocalPoint.Request(x=x, y=y, z=z, yaw=0.0, time=0.0, frame_id='map')
        self.request('FLY', self.go_client, go)

    def step(self):
        if self.future is not None and not self.future.done():
            return                                           # ждём ответ сервиса
        if self.future is not None:
            ok = self.future.result().success
            self.future = None
            if not ok:
                print("Сервис отказал на этапе", self.state)
                self.request('DONE', self.disarm_client, Trigger.Request())
                return
        if self.state == 'ARM':
            self.request('TAKEOFF', self.arm_client, Arm.Request(timeout=5.0, retries=0))
        elif self.state == 'TAKEOFF':
            self.request('WAIT_TAKEOFF', self.takeoff_client, Trigger.Request())
        elif self.state == 'WAIT_TAKEOFF' and self.event == EVENT_TAKEOFF_COMPLETE:
            self.fly_next()
        elif self.state == 'FLY' and self.event == EVENT_POINT_REACHED:
            if self.point < len(POINTS):
                self.fly_next()
            else:
                self.request('LAND', self.land_client, Trigger.Request())
        elif self.state == 'LAND' and self.event == EVENT_COPTER_LANDED:
            self.request('DONE', self.disarm_client, Trigger.Request())


rclpy.init()
node = Mission()
while rclpy.ok() and node.state != 'DONE':
    rclpy.spin_once(node, timeout_sec=0.2)
rclpy.spin_once(node, timeout_sec=0.5)    # дослать disarm
node.destroy_node()
rclpy.shutdown()
${DONE_LINE}`,
        answers: ['5', '2'], waitMs: 180000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing().route([[1, 0, 1], [1, 1, 1]]);
            g.order(['Этап: TAKEOFF', 'Этап: WAIT_TAKEOFF', 'Этап: FLY', 'Этап: FLY', 'Этап: LAND', 'Этап: DONE'], 'Автомат должен пройти этапы по порядку: ARM, TAKEOFF, FLY, FLY, LAND, DONE.');
        }
    },
    {
        ...Q, id: 'sdk2-ros2-patrol', title: 'Патруль узлом: сервисы, топики и подсветка',
        goal: 'Итог главы: патруль по трём точкам с телеметрией батареи, сигналами подсветки и аккуратной реакцией на отказ сервиса.',
        steps: [
            'Узел `Patrol` использует всё из главы: сервисы (`arm`, `takeoff`, `go_to_local_point`, `land`, `disarm`, `led/set`), топики (`callback_event`, `battery_state`) и таймер-автомат. Состояние подсвечивается: жёлтый — подготовка и взлёт, зелёный — патруль, синий — посадка, затем светодиоды гаснут.',
            'Функция `paint(r, g, b)` красит всю ленту (`FILL`). Значения 0…1: `(1.0, 1.0, 0.0)` — жёлтый. На патруль нужен зелёный: `(0.0, 1.0, 0.0)`.',
            'Вместо `___` впишите три числа зелёного цвета через запятую: `0.0, 1.0, 0.0`.',
            'Отказ любого сервиса переводит автомат в безопасную посадку: посмотрите ветку `if not ok`.',
            'Нажмите «Проверить полёт»: журнал «Минимальное напряжение: …», маршрут по трём точкам и цвета жёлтый → зелёный → синий → выкл.'
        ],
        hint: 'Зелёный в RGB — это (0, 1, 0): красная и синяя составляющие равны нулю, зелёная максимальна.',
        outcome: 'Это каркас реальной бортовой программы: автомат, подсветка состояния, контроль батареи и запасной выход. Его можно расширить своими точками и датчиками.',
        starter: `import rclpy
from rclpy.node import Node
from std_msgs.msg import ColorRGBA, Int8
from std_srvs.srv import Trigger
from sensor_msgs.msg import BatteryState
from gs_interfaces.srv import Arm, GoToLocalPoint, Led

EVENT_COPTER_LANDED = 2
EVENT_POINT_REACHED = 5
EVENT_TAKEOFF_COMPLETE = 7

POINTS = [(1.0, 0.0, 1.0), (1.0, 1.0, 1.0), (0.0, 1.0, 1.0)]


class Patrol(Node):
    def __init__(self):
        super().__init__('patrol')
        self.state = 'START'
        self.future = None
        self.event = None
        self.point = 0
        self.min_voltage = 99.0
        self.create_subscription(Int8, '/geoscan/flight/callback_event', self.on_event, 10)
        self.create_subscription(BatteryState, '/geoscan/sensors/battery_state', self.on_battery, 10)
        self.arm_client = self.create_client(Arm, '/geoscan/flight/arm')
        self.takeoff_client = self.create_client(Trigger, '/geoscan/flight/takeoff')
        self.go_client = self.create_client(GoToLocalPoint, '/geoscan/flight/go_to_local_point')
        self.land_client = self.create_client(Trigger, '/geoscan/flight/land')
        self.disarm_client = self.create_client(Trigger, '/geoscan/flight/disarm')
        self.led_client = self.create_client(Led, '/geoscan/payload/led/set')
        self.create_timer(0.2, self.step)

    def on_event(self, msg):
        self.event = msg.data

    def on_battery(self, msg):
        self.min_voltage = min(self.min_voltage, msg.voltage)

    def paint(self, r, g, b):
        """Покрасить всю ленту одним цветом (режим FILL)."""
        self.led_client.call_async(Led.Request(mode=Led.Request.FILL, leds=[ColorRGBA(r=r, g=g, b=b, a=1.0)]))

    def request(self, state, client, request):
        self.event = None
        self.future = client.call_async(request)
        self.state = state

    def fly_next(self):
        x, y, z = POINTS[self.point]
        self.point += 1
        self.request('PATROL', self.go_client, GoToLocalPoint.Request(x=x, y=y, z=z, yaw=0.0, time=0.0, frame_id='map'))

    def step(self):
        if self.future is not None and not self.future.done():
            return
        if self.future is not None:
            ok = self.future.result().success
            self.future = None
            if not ok:
                print("Сервис отказал на этапе", self.state)
                self.paint(1.0, 0.0, 0.0)
                self.request('DONE', self.disarm_client, Trigger.Request())
                return
        if self.state == 'START':
            self.paint(1.0, 1.0, 0.0)                         # жёлтый: подготовка и взлёт
            self.request('ARM', self.arm_client, Arm.Request(timeout=5.0, retries=0))
        elif self.state == 'ARM':
            self.request('TAKEOFF', self.takeoff_client, Trigger.Request())
        elif self.state == 'TAKEOFF' and self.event == EVENT_TAKEOFF_COMPLETE:
            self.paint(___)                                   # зелёный: патруль
            self.fly_next()
        elif self.state == 'PATROL' and self.event == EVENT_POINT_REACHED:
            print("Точка", self.point, "из", len(POINTS))
            if self.point < len(POINTS):
                self.fly_next()
            else:
                self.paint(0.0, 0.0, 1.0)                     # синий: посадка
                self.request('LAND', self.land_client, Trigger.Request())
        elif self.state == 'LAND' and self.event == EVENT_COPTER_LANDED:
            self.paint(0.0, 0.0, 0.0)                         # выключить подсветку
            self.request('DONE', self.disarm_client, Trigger.Request())


rclpy.init()
node = Patrol()
while rclpy.ok() and node.state != 'DONE':
    rclpy.spin_once(node, timeout_sec=0.2)
rclpy.spin_once(node, timeout_sec=0.5)
print("Минимальное напряжение:", round(node.min_voltage, 2))
node.destroy_node()
rclpy.shutdown()
${DONE_LINE}`,
        answers: ['0.0, 1.0, 0.0'], waitMs: 240000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing().route([[1, 0, 1], [1, 1, 1], [0, 1, 1]]);
            g.expectNumber('Минимальное напряжение:', 3, 30, 'Подпишитесь на sensors/battery_state и держите минимум msg.voltage.');
            const colors = g.ledSequence(0).join(',');
            if (colors !== 'yellow,green,blue,off') g.fail('Подсветка не по этапам', `Цвета диода 0: ${colors || 'нет'}, ожидалось yellow,green,blue,off.`, 'Жёлтый на старте, зелёный на патруле, синий на посадке, затем выключить.');
        }
    }
];
