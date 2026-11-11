import { DONE_LINE } from './sdk2-mission-kit.js';

/**
 * Каркасы программ для миссий ROS 2 трека «Мини 2 · SDK2» (главы 14–17). Это обычный rclpy: узел, клиенты сервисов
 * `/geoscan/...`, подписки на топики `ros_pioneer_node` (его запускает сам `rclpy.init()` в симуляторе, как launch на борту).
 * Результат миссия сообщает через `print`: журнал запуска хранит печать, а не записи `get_logger()`.
 */

const indent = (text: string, spaces = 4) => text.split('\n').map((line) => (line ? ' '.repeat(spaces) + line : line)).join('\n');

/** Общая шапка: вызов сервиса с ожиданием ответа. */
export const ROS_CALL = `

def call(client, request):
    """Вызвать сервис и дождаться ответа (не дольше 5 секунд)."""
    future = client.call_async(request)
    rclpy.spin_until_future_complete(node, future, timeout_sec=5.0)
    if not future.done():
        raise SystemExit("Сервис не ответил: проверьте его имя")
    return future.result()

`;

export type RosGround = {
    /** Дополнительные import-строки. */
    imports?: string;
    /** Имя узла. */
    name?: string;
    /** Код после создания узла и функции call(). */
    before?: string;
    /** Тело программы (в блоке try). */
    body: string;
};

/** Программа на земле: узел, функция call(), тело, в finally — остановка узла. */
export function rosGroundProgram(options: RosGround): string {
    return `import rclpy
from rclpy.node import Node
${options.imports ?? ''}
rclpy.init()
node = Node('${options.name ?? 'mission'}')
${ROS_CALL}${options.before ?? ''}
try:
${indent(options.body.trimEnd())}
finally:
    node.destroy_node()
    rclpy.shutdown()
${DONE_LINE}`;
}

export type RosFlight = {
    imports?: string;
    /** Строки внутри on_event(msg): реакция на события автопилота. */
    onEvent?: string;
    /** Подписки, клиенты и состояние миссии (после каркаса). */
    setup?: string;
    /** Действия на земле до arm. */
    pre?: string;
    /** Тело полёта: дрон в воздухе, обработчики уже работают. */
    body: string;
    /** Значение frame_id по умолчанию у функции go() (по умолчанию 'map'). */
    goFrame?: string;
    /** Строки в finally после disarm. */
    after?: string;
};

/**
 * Полётный каркас: arm → takeoff → тело → land → disarm сервисами gs_core. В нём же: подписки на fly_state и
 * callback_event, функции call(), spin_for(), wait_state() и go() (полёт в точку с ожиданием события POINT_REACHED).
 */
export function rosFlightProgram(options: RosFlight): string {
    return `import rclpy
from rclpy.duration import Duration
from rclpy.node import Node
from std_msgs.msg import Int8
from std_srvs.srv import Trigger
from gs_interfaces.srv import Arm, GoToLocalPoint
${options.imports ?? ''}
ON_LAND, IN_SKY = 0, 2            # значения flight/fly_state
EVENT_POINT_REACHED = 6           # код в flight/callback_event

rclpy.init()
node = Node('mission')
state = {"fly": ON_LAND, "reached": False}


def on_fly_state(msg):
    state["fly"] = msg.data


def on_event(msg):
    if msg.data == EVENT_POINT_REACHED:
        state["reached"] = True
${options.onEvent ? indent(options.onEvent) + '\n' : ''}

node.create_subscription(Int8, '/geoscan/flight/fly_state', on_fly_state, 10)
node.create_subscription(Int8, '/geoscan/flight/callback_event', on_event, 10)
arm_client = node.create_client(Arm, '/geoscan/flight/arm')
takeoff_client = node.create_client(Trigger, '/geoscan/flight/takeoff')
land_client = node.create_client(Trigger, '/geoscan/flight/land')
disarm_client = node.create_client(Trigger, '/geoscan/flight/disarm')
go_client = node.create_client(GoToLocalPoint, '/geoscan/flight/go_to_local_point')
${ROS_CALL}
def spin_for(seconds):
    """Обрабатывать сообщения заданное время (по часам симуляции)."""
    end = node.get_clock().now() + Duration(seconds=seconds)
    while rclpy.ok() and node.get_clock().now() < end:
        rclpy.spin_once(node, timeout_sec=0.1)


def wait_state(wanted, limit=30.0):
    """Ждать нужное значение fly_state не дольше limit секунд, а не вечно."""
    end = node.get_clock().now() + Duration(seconds=limit)
    while rclpy.ok() and state["fly"] != wanted:
        if not node.get_clock().now() < end:
            raise SystemExit("Дрон не перешёл в состояние " + str(wanted) + " за " + str(int(limit)) + " с")
        rclpy.spin_once(node, timeout_sec=0.1)


def go(x, y, z, yaw=0.0, frame='${options.goFrame ?? 'map'}'):
    """Лететь в точку и дождаться прилёта (событие POINT_REACHED)."""
    state["reached"] = False
    request = GoToLocalPoint.Request(x=x, y=y, z=z, yaw=yaw, time=0.0, frame_id=frame)
    if not call(go_client, request).success:
        raise SystemExit("Точка отклонена автопилотом")
    while rclpy.ok() and not state["reached"]:
        rclpy.spin_once(node, timeout_sec=0.1)

${options.setup ?? ''}${options.pre ? options.pre.trimEnd() + '\n' : ''}
in_air = False
try:
    if not call(arm_client, Arm.Request(timeout=5.0, retries=0)).success:
        raise SystemExit("Моторы не запустились")
    call(takeoff_client, Trigger.Request())
    wait_state(IN_SKY)
    in_air = True
${indent(options.body.trimEnd())}
    call(land_client, Trigger.Request())
    wait_state(ON_LAND)
    in_air = False
finally:
    if in_air:
        call(land_client, Trigger.Request())
        wait_state(ON_LAND)
    call(disarm_client, Trigger.Request())
${options.after ? indent(options.after.trimEnd()) + '\n' : ''}    node.destroy_node()
    rclpy.shutdown()
${DONE_LINE}`;
}
