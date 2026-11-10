/* eslint-disable max-lines -- сценарии Python по темам в одном файле */
/**
 * Эмуляция ROS 2 (rclpy + ros_pioneer_node из gs_core): настоящий Python-код (public/modules/python/ros2/*)
 * исполняется в CPython против поддельного мира (helpers/python/run_ros2_module.py).
 * Эталон поведения - docs/ros2/gs_core.md.
 */
import { interfaceShow } from '../public/modules/python/ros2/interfaces.js';
import { runRos2, withRos2Python, type Ros2RunOptions } from './helpers/ros2-runtime.js';

const HEAD = `
import json, math, sys, rclpy
from rclpy.node import Node
from rclpy.parameter import Parameter as RParam
from rcl_interfaces.msg import SetParametersResult
from std_srvs.srv import Trigger, SetBool
import std_srvs.srv as SS
from gs_interfaces.srv import *
from gs_interfaces.msg import *
from std_msgs.msg import *
from geometry_msgs.msg import *
from sensor_msgs.msg import *
R = sys.modules['_ros2_registry']
OUT = lambda *a: print('OUT', *a)
J = lambda v: json.dumps(v)

async def reg(fn, **kw):
    kw['drone'] = 'drone-1'
    reply = json.loads(await R.dispatch(fn, json.dumps(kw)))
    if not reply['ok']:
        raise RuntimeError(reply['error'])
    return reply['result']

def student():
    rclpy.init()
    return rclpy.create_node('student')

async def call(node, path, srv, /, **kw):
    client = node.create_client(srv, path)
    if not await client.wait_for_service(5.0):
        raise RuntimeError('no service ' + path)
    future = client.call_async(srv.Request(**kw))
    await rclpy.spin_until_future_complete(node, future, timeout_sec=60.0)
    return future.result()

async def wait_fsm(state, timeout=40.0):
    t0 = world.now()
    while world.fsm != state and world.now() - t0 < timeout:
        await asyncio.sleep(0.01)

async def settle(timeout=60.0):
    t0 = world.now()
    while (world.target is not None or world.fsm != 'FLYING_HOVER') and world.now() - t0 < timeout:
        await asyncio.sleep(0.01)

async def sim_wait(seconds):
    t0 = world.now()
    while world.now() - t0 < seconds:
        await asyncio.sleep(0.01)

async def to_sky(node):
    assert (await call(node, '/geoscan/flight/arm', Arm, timeout=5.0, retries=0)).success
    assert (await call(node, '/geoscan/flight/takeoff', Trigger)).success
    await wait_fsm('FLYING_HOVER')
`;

function scenario(body: string, options: Ros2RunOptions = {}) {
    const code = `${HEAD}\nasync def main():\n${body.split('\n').map((line) => `    ${line}`).join('\n')}\n`;
    const run = runRos2(code, options);
    expect(run.result.error).toBeNull();
    return { ...run, lines: run.out.filter((line) => line.startsWith('OUT ')).map((line) => line.slice(4)) };
}

const MINI2: Ros2RunOptions = { model: 'pioneer-mini2' };
const BASIC: Ros2RunOptions = { model: 'pioneer-basic' };

describe('сообщения и интерфейсы', () => {
    withRos2Python('repr как у ROS, значения по умолчанию, вложенные типы', () => {
        const { lines } = scenario(`
OUT(repr(Int8(data=1)))
OUT(repr(Int8()))
OUT(repr(Quaternion()))
OUT(repr(TwistStamped()))
OUT(repr(Arm.Request(timeout=5.0, retries=2)))
OUT(repr(Arm.Response()))
OUT(repr(RcChannels()))
OUT(Range.INFRARED, Range.ULTRASOUND, NavStatus.OK, Led.Request.FILL)
`);
        expect(lines[0]).toBe('std_msgs.msg.Int8(data=1)');
        expect(lines[1]).toBe('std_msgs.msg.Int8(data=0)');
        expect(lines[2]).toBe('geometry_msgs.msg.Quaternion(x=0.0, y=0.0, z=0.0, w=1.0)');
        expect(lines[3]).toBe(
            'geometry_msgs.msg.TwistStamped(header=std_msgs.msg.Header(stamp=builtin_interfaces.msg.Time(sec=0, nanosec=0), frame_id=\'\'), '
            + 'twist=geometry_msgs.msg.Twist(linear=geometry_msgs.msg.Vector3(x=0.0, y=0.0, z=0.0), angular=geometry_msgs.msg.Vector3(x=0.0, y=0.0, z=0.0)))'
        );
        expect(lines[4]).toBe('gs_interfaces.srv.Arm_Request(timeout=5.0, retries=2)');
        expect(lines[5]).toBe('gs_interfaces.srv.Arm_Response(success=False)');
        expect(lines[6]).toContain('channel_8=0');
        expect(lines[7]).toBe('1 0 3 1');
    });

    withRos2Python('поля проверяются как в rclpy: типы и диапазоны', () => {
        const { lines } = scenario(`
def attempt(fn):
    try:
        fn()
        return 'ok'
    except AssertionError as e:
        return str(e)
OUT(attempt(lambda: Int8(data=1.5)))
OUT(attempt(lambda: Int8(data=200)))
OUT(attempt(lambda: Point(x=1)))
OUT(attempt(lambda: String(data=5)))
OUT(attempt(lambda: Int8(oops=1)))
OUT(attempt(lambda: Header(stamp=1)))
m = Twist()
m.linear.x = 0.5
OUT(m.linear.x, m == Twist(linear=Vector3(x=0.5)))
`);
        expect(lines[0]).toBe("The 'data' field must be of type 'int'");
        expect(lines[1]).toBe("The 'data' field must be an integer in [-128, 127]");
        expect(lines[2]).toBe("The 'x' field must be of type 'float'");
        expect(lines[3]).toBe("The 'data' field must be of type 'str'");
        expect(lines[4]).toContain('Invalid arguments passed to constructor: oops');
        expect(lines[5]).toBe("The 'stamp' field must be a sub message of type 'Time'");
        expect(lines[6]).toBe('0.5 True');
    });

    test('ros2 interface show: тексты определений', () => {
        expect(interfaceShow('gs_interfaces/srv/Arm')).toBe('float32 timeout\nint32 retries\n---\nbool success');
        expect(interfaceShow('std_msgs/msg/Int8')).toBe('int8 data');
        expect(interfaceShow('std_srvs/srv/Trigger')).toBe('---\nbool success\nstring message');
        expect(interfaceShow('gs_interfaces/srv/GoToLocalPoint')).toContain('string frame_id\n---\nbool success');
        expect(interfaceShow('gs_interfaces/srv/Led')).toContain('uint8 PIXEL=0\nuint8 FILL=1');
        expect(interfaceShow('gs_interfaces/srv/Led')).toContain('std_msgs/ColorRGBA[] leds');
        expect(interfaceShow('geometry_msgs/msg/TwistStamped')).toBe('std_msgs/Header header\ngeometry_msgs/Twist twist');
        expect(interfaceShow('std_msgs/Int8')).toBe('int8 data');
        expect(interfaceShow('nope/msg/X')).toBeNull();
    });
});

describe('ros_pioneer_node: параметры по конфигам', () => {
    withRos2Python('mini2: таблица из справочника', () => {
        const { lines } = scenario(`
student()
OUT(J(await reg('launch_status')))
params = await reg('param_list', node='/ros_pioneer_node')
names = params['/ros_pioneer_node']
for n in ['board_name', 'gtlp_version', 'grab', 'cargo', 'nav_system_change_in_flight', 'board_reboot', 'topics.gnss', 'topics.ranger', 'range_sensor.max_range']:
    OUT(n, J((await reg('param_get', node='/ros_pioneer_node', name=n))['value']))
OUT(len([n for n in names if n.startswith('topics.')]))
`, MINI2);
        expect(JSON.parse(lines[0])).toEqual({ running: true, config: 'mini2' });
        expect(lines.slice(1, 10)).toEqual([
            'board_name "Pioneer Mini 2"', 'gtlp_version 2', 'grab true', 'cargo false', 'nav_system_change_in_flight false',
            'board_reboot false', 'topics.gnss false', 'topics.ranger true', 'range_sensor.max_range 4.0'
        ]);
        expect(lines[10]).toBe('13');
    });

    withRos2Python('razero (Базовый с Radxa): другие значения', () => {
        const { lines } = scenario(`
student()
for n in ['board_name', 'gtlp_version', 'grab', 'cargo', 'nav_system_change_in_flight', 'board_reboot', 'topics.motors_rpm', 'topics.ranger']:
    OUT(n, J((await reg('param_get', node='/ros_pioneer_node', name=n))['value']))
`, BASIC);
        expect(lines).toEqual([
            'board_name "Razero"', 'gtlp_version 1', 'grab false', 'cargo true', 'nav_system_change_in_flight true',
            'board_reboot true', 'topics.motors_rpm false', 'topics.ranger false'
        ]);
    });

    withRos2Python('topics.* читаются при запуске, остальные параметры меняются на лету', () => {
        const { lines } = scenario(`
student()
a = await reg('param_set', node='/ros_pioneer_node', name='topics.gnss', value=True)
OUT(a['successful'], a['reason'][:40])
b = await reg('param_set', node='/ros_pioneer_node', name='grab', value=False)
OUT(b['successful'])
c = await reg('param_set', node='/ros_pioneer_node', name='grab', value=3)
OUT(c['successful'])
OUT(J((await reg('param_get', node='/ros_pioneer_node', name='grab'))['value']))
`, MINI2);
        expect(lines[0]).toMatch(/^False Параметр topics.gnss читается/);
        expect(lines[1]).toBe('True');
        expect(lines[2]).toBe('False');
        expect(lines[3]).toBe('false');
    });
});

describe('сервисы полёта', () => {
    withRos2Python('полётный цикл из справочника: arm, takeoff, go_to_local_point (map), land, disarm', () => {
        const { lines, result } = scenario(`
node = student()
OUT('arm', (await call(node, '/geoscan/flight/arm', Arm, timeout=5.0, retries=0)).success, world.fsm)
OUT('takeoff', (await call(node, '/geoscan/flight/takeoff', Trigger)).success)
await wait_fsm('FLYING_HOVER')
r = await call(node, '/geoscan/flight/go_to_local_point', GoToLocalPoint, x=1.0, y=2.0, z=1.5, yaw=0.0, time=0.0, frame_id='map')
OUT('go', r.success)
await settle()
OUT('pos', [round(v, 2) for v in world.pos])
OUT('land', (await call(node, '/geoscan/flight/land', Trigger)).success)
await wait_fsm('IDLE')
OUT('disarm', (await call(node, '/geoscan/flight/disarm', Trigger)).success, world.fsm)
`, MINI2);
        expect(lines).toEqual(['arm True PREFLIGHT', 'takeoff True', 'go True', 'pos [1.0, 2.0, 1.5]', 'land True', 'disarm True IDLE']);
        expect(result.calls.map((c) => c[0])).toEqual(['arm', 'takeoff', 'go_to', 'land', 'disarm']);
    });

    withRos2Python('команды в неподходящем состоянии отклоняются с записью в журнал', () => {
        const { lines, result } = scenario(`
node = student()
OUT((await call(node, '/geoscan/flight/takeoff', Trigger)).success)
r = await call(node, '/geoscan/flight/go_to_local_point', GoToLocalPoint, x=1.0, z=1.0, frame_id='map')
OUT(r.success)
OUT((await call(node, '/geoscan/flight/land', Trigger)).success)
OUT((await call(node, '/geoscan/flight/rtl', Trigger)).success)
OUT((await call(node, '/geoscan/flight/set_yaw', Yaw, angle=90.0)).success)
`, MINI2);
        expect(lines).toEqual(['False', 'False', 'False', 'False', 'False']);
        const text = result.log.map((entry) => entry[1]).join('\n');
        expect(text).toContain('Взлёт отклонён');
        expect(text).toContain('[ERROR]');
        expect(result.calls.some((c) => c[0] === 'go_to')).toBe(false);
    });

    withRos2Python('arm при повторном вызове ждёт timeout и retries, потом отказывает', () => {
        const { lines, result } = scenario(`
node = student()
OUT((await call(node, '/geoscan/flight/arm', Arm, timeout=0.5, retries=0)).success)
t0 = world.now()
r = await call(node, '/geoscan/flight/arm', Arm, timeout=1.0, retries=2)
OUT(r.success, round(world.now() - t0) >= 3)
`, MINI2);
        expect(lines).toEqual(['True', 'False True']);
        expect(result.calls.filter((c) => c[0] === 'arm')).toHaveLength(4);
    });

    withRos2Python('go_to_local_point: base_link - оси коптера (x вперёд, y влево, z вверх), map - мировые', () => {
        const { lines } = scenario(`
node = student()
await to_sky(node)
go = lambda **kw: call(node, '/geoscan/flight/go_to_local_point', GoToLocalPoint, **kw)
await go(x=1.0, y=0.0, z=0.0, yaw=0.0, time=0.0, frame_id='base_link')
await settle()
OUT([round(v, 2) for v in world.pos])
await go(x=0.0, y=1.0, z=0.5, yaw=0.0, time=0.0, frame_id='base_link')
await settle()
OUT([round(v, 2) for v in world.pos])
await go(x=0.0, y=0.0, z=0.0, yaw=0.0, time=0.0, frame_id='')
OUT(len([c for c in calls if c[0] == 'go_to']))
await go(x=0.0, y=0.0, z=0.0, yaw=0.0, time=0.0, frame_id='odom')
OUT(len([c for c in calls if c[0] == 'go_to']))
`, MINI2);
        expect(lines[0]).toBe('[0.0, 1.0, 1.0]');
        expect(lines[1]).toBe('[-1.0, 1.0, 1.5]');
        expect(lines[2]).toBe('2');
        expect(lines[3]).toBe('2');
    });

    withRos2Python('yaw: угол, равный прошлому заданному, рыскание не меняет', () => {
        const { lines } = scenario(`
node = student()
await to_sky(node)
go = lambda yaw: call(node, '/geoscan/flight/go_to_local_point', GoToLocalPoint, x=0.0, y=0.0, z=1.0, yaw=yaw, time=0.0, frame_id='map')
def last_yaw():
    v = [c for c in calls if c[0] == 'go_to'][-1][1][3]
    return None if v is None else round(math.degrees(v), 1)
await go(0.0); OUT(last_yaw())
await go(90.0); OUT(last_yaw())
await go(90.0); OUT(last_yaw())
await go(-45.0); OUT(last_yaw())
await call(node, '/geoscan/flight/set_yaw', Yaw, angle=30.0); OUT(last_yaw())
await go(30.0); OUT(last_yaw())
await go(0.0); OUT(last_yaw())
`, MINI2);
        expect(lines).toEqual(['None', '90.0', 'None', '-45.0', '30.0', 'None', '0.0']);
    });

    withRos2Python('time > 0 передаётся как время перехода; rtl и set_yaw в воздухе принимаются', () => {
        const { lines } = scenario(`
node = student()
await to_sky(node)
await call(node, '/geoscan/flight/go_to_local_point', GoToLocalPoint, x=1.0, y=1.0, z=1.0, yaw=0.0, time=4.0, frame_id='map')
OUT([c for c in calls if c[0] == 'go_to'][-1][1][4])
OUT((await call(node, '/geoscan/flight/set_yaw', Yaw, angle=45.0)).success)
OUT((await call(node, '/geoscan/flight/rtl', Trigger)).success)
`, MINI2);
        expect(lines).toEqual(['4.0', 'True', 'True']);
    });

    withRos2Python('go_to_global_point: GNSS в симуляторе нет, отказ с объяснением', () => {
        const { lines, result } = scenario(`
node = student()
await to_sky(node)
r = await call(node, '/geoscan/flight/go_to_global_point', GoToGlobalPoint, latitude=55.0, longitude=37.0, altitude=10.0, yaw=0.0, frame_id='map')
OUT(r.success)
r = await call(node, '/geoscan/flight/go_to_global_point', GoToGlobalPoint, latitude=55.0, longitude=37.0, altitude=10.0, yaw=0.0, frame_id='')
OUT(r.success)
`, MINI2);
        expect(lines).toEqual(['False', 'False']);
        expect(result.log.map((e) => e[1]).join('\n')).toContain('GPS');
    });
});

describe('борт, параметры автопилота, навигация', () => {
    withRos2Python('alive, get_param / set_param, get_parameters / set_parameters', () => {
        const { lines } = scenario(`
node = student()
OUT((await call(node, '/geoscan/alive', Live)).status)
r = await call(node, '/geoscan/board/get_param', GetParam, name='Copter_com_takeoffAlt', update=True)
OUT(round(r.value, 2), r.status)
r = await call(node, '/geoscan/board/get_param', GetParam, name='Nope', update=False)
OUT(r.status)
OUT((await call(node, '/geoscan/board/set_param', SetParam, name='Copter_com_takeoffAlt', value=1.5)).status)
r = await call(node, '/geoscan/board/get_param', GetParam, name='Copter_com_takeoffAlt', update=False)
OUT(r.value)
OUT((await call(node, '/geoscan/board/set_param', SetParam, name='Flight_com_navSystem', value=2.0)).status)
OUT((await call(node, '/geoscan/board/set_param', SetParam, name='Unknown', value=2.0)).status)
r = await call(node, '/geoscan/board/get_parameters', ParametersList)
OUT(r.status, len(r.params), r.params[0].name)
bad = SetParametersList.Request(params=[Parameter(name='Copter_com_takeoffAlt', value=2.0), Parameter(name='Nope', value=1.0)])
c = node.create_client(SetParametersList, '/geoscan/board/set_parameters')
f = c.call_async(bad)
await rclpy.spin_until_future_complete(node, f)
OUT(f.result().status)
r = await call(node, '/geoscan/board/get_param', GetParam, name='Copter_com_takeoffAlt', update=False)
OUT(r.value)
good = SetParametersList.Request(params=[Parameter(name='Copter_com_takeoffAlt', value=2.0), Parameter(name='Copter_man_rcMode0', value=6.0)])
f = c.call_async(good)
await rclpy.spin_until_future_complete(node, f)
OUT(f.result().status)
r = await call(node, '/geoscan/board/get_param', GetParam, name='Copter_man_rcMode0', update=False)
OUT(r.value)
await call(node, '/geoscan/board/restart', SS.Empty)
r = await call(node, '/geoscan/board/get_param', GetParam, name='Copter_com_takeoffAlt', update=False)
OUT(round(r.value, 2))
`, MINI2);
        expect(lines).toEqual([
            'True', '0.4 True', 'False', 'True', '1.5', 'False', 'False', 'True 7 Flight_com_navSystem', 'False', '1.5', 'True', '6.0', '0.4'
        ]);
    });

    withRos2Python('навигация: get_system / set_system, отказ в полёте по nav_system_change_in_flight', () => {
        const mini = scenario(`
node = student()
r = await call(node, '/geoscan/navigation/get_system', NavigationSystem)
OUT(r.navigation, r.status)
OUT((await call(node, '/geoscan/navigation/set_system', SetNavigationSystem, navigation='OPT')).status)
OUT((await call(node, '/geoscan/navigation/get_system', NavigationSystem)).navigation)
OUT((await call(node, '/geoscan/navigation/set_system', SetNavigationSystem, navigation='XYZ')).status)
await to_sky(node)
OUT((await call(node, '/geoscan/navigation/set_system', SetNavigationSystem, navigation='LPS')).status)
OUT((await call(node, '/geoscan/navigation/get_system', NavigationSystem)).navigation)
`, MINI2);
        expect(mini.lines).toEqual(['LPS True', 'True', 'OPT', 'False', 'False', 'OPT']);
        expect(mini.result.log.map((e) => e[1]).join('\n')).toContain('в полёте отклонена');

        const basic = scenario(`
node = student()
await to_sky(node)
OUT((await call(node, '/geoscan/navigation/set_system', SetNavigationSystem, navigation='OPT')).status)
OUT((await call(node, '/geoscan/navigation/get_system', NavigationSystem)).navigation)
`, BASIC);
        expect(basic.lines).toEqual(['True', 'OPT']);
    });
});

describe('полезная нагрузка', () => {
    withRos2Python('LED: PIXEL, FILL, цвета 0..1 уходят на борт как 0..255', () => {
        const { lines, result } = scenario(`
node = student()
c = lambda r, g, b: ColorRGBA(r=r, g=g, b=b, a=1.0)
R1 = await call(node, '/geoscan/payload/led/set', Led, mode=Led.Request.PIXEL, leds=[c(1.0, 0.0, 0.0), c(0.0, 1.0, 0.0)], period=0.0)
OUT(R1.success, J(world.leds))
R2 = await call(node, '/geoscan/payload/led/set', Led, mode=Led.Request.FILL, leds=[c(0.0, 0.0, 1.0)], period=0.0)
OUT(R2.success, J(world.leds))
R3 = await call(node, '/geoscan/payload/led/set', Led, mode=Led.Request.PIXEL, leds=[c(0.5, 0.5, 0.5)] * 3, period=0.0)
OUT(R3.success)
R4 = await call(node, '/geoscan/payload/led/set', Led, mode=2, leds=[c(1.0, 1.0, 1.0)], period=1.0)
OUT(R4.success)
R5 = await call(node, '/geoscan/payload/led/set', Led, mode=Led.Request.FILL, leds=[], period=0.0)
OUT(R5.success)
`, MINI2);
        expect(lines[0]).toBe('True {"0": [255.0, 0.0, 0.0], "1": [0.0, 255.0, 0.0]}');
        expect(lines[1]).toBe('True {"0": [0.0, 0.0, 255.0], "1": [0.0, 0.0, 255.0]}');
        expect(lines.slice(2)).toEqual(['False', 'False', 'False']);
        expect(result.log.map((e) => e[1]).join('\n')).toContain('BLINK и CHASE не реализованы');
    });

    withRos2Python('grab: аргументы, механический захват только при grab: true', () => {
        const { lines, result } = scenario(`
node = student()
g = lambda **kw: call(node, '/geoscan/payload/grab', Grab, **kw)
OUT((await g(movement_time=0.0, velocity=100, action=1)).success, world.grab)
OUT((await g(movement_time=0.0, velocity=50, action=0)).success, world.grab)
OUT((await g(movement_time=0.0, velocity=101, action=1)).success)
OUT((await g(movement_time=0.0, velocity=-1, action=1)).success)
OUT((await g(movement_time=0.0, velocity=500, action=2)).success)
OUT((await g(movement_time=0.0, velocity=10, action=7)).success)
t0 = world.now()
OUT((await g(movement_time=2.0, velocity=100, action=1)).success, world.now() - t0 >= 2.0, world.grab)
`, MINI2);
        expect(lines).toEqual(['True True', 'True False', 'False', 'False', 'True', 'False', 'True True True']);
        expect(result.calls.filter((c) => c[0] === 'grab')).toHaveLength(3);

        const razero = scenario(`
node = student()
OUT((await call(node, '/geoscan/payload/grab', Grab, movement_time=0.0, velocity=10, action=1)).success)
`, BASIC);
        expect(razero.lines).toEqual(['False']);
        expect(razero.result.log.map((e) => e[1]).join('\n')).toContain('захвата не поддерживается');
        expect(razero.result.calls.some((c) => c[0] === 'grab')).toBe(false);
    });

    withRos2Python('cargo_set: магнит только при cargo: true, иначе success: false', () => {
        const mini = scenario(`
node = student()
r = await call(node, '/geoscan/payload/cargo_set', SetBool, data=True)
OUT(r.success, world.grab)
`, MINI2);
        expect(mini.lines).toEqual(['False False']);
        expect(mini.result.log.map((e) => e[1]).join('\n')).toContain('не поддерживается');

        const basic = scenario(`
node = student()
OUT((await call(node, '/geoscan/payload/cargo_set', SetBool, data=True)).success, world.grab)
OUT((await call(node, '/geoscan/payload/cargo_set', SetBool, data=False)).success, world.grab)
`, BASIC);
        expect(basic.lines).toEqual(['True True', 'True False']);
    });

    withRos2Python('сервисы выключенных модулей существуют, топик ranger не создаётся', () => {
        const { lines } = scenario(`
student()
services = [s['name'] for s in await reg('service_list')]
topics = [t['name'] for t in await reg('topic_list')]
OUT('/geoscan/payload/grab' in services, '/geoscan/payload/cargo_set' in services, '/geoscan/payload/led/set' in services)
OUT('/geoscan/payload/ranger' in topics)
`, BASIC);
        expect(lines).toEqual(['True True True', 'False']);
    });
});

describe('публикации', () => {
    const TOPIC_PRE = `
node = student()
got = {}
def keep(name):
    return lambda msg: got.setdefault(name, []).append(msg)
async def listen(topic, cls, seconds=1.0):
    node.create_subscription(cls, topic, keep(topic), 50)
    await rclpy.spin_until_future_complete(node, rclpy.Future(), timeout_sec=seconds)
`;

    withRos2Python('mini2: набор топиков по умолчанию (без gnss)', () => {
        const { lines } = scenario(`
student()
names = sorted(t['name'] for t in await reg('topic_list'))
OUT(J([n.replace('/geoscan/', '') for n in names]))
`, MINI2);
        expect(JSON.parse(lines[0])).toEqual([
            'flight/callback_event', 'flight/cmd_vel', 'flight/fly_state', 'navigation/local/position', 'navigation/local/status',
            'navigation/local/velocity', 'navigation/local/yaw', 'navigation/opt/velocity', 'payload/ranger', 'rc/set_channels', 'rc/trigger',
            'sensors/altitude', 'sensors/battery_state', 'sensors/imu', 'sensors/motors_rpm', 'sensors/range'
        ]);
    });

    withRos2Python('razero: нет motors_rpm и payload/ranger', () => {
        const { lines } = scenario(`
student()
names = [t['name'] for t in await reg('topic_list')]
OUT('/geoscan/sensors/motors_rpm' in names, '/geoscan/payload/ranger' in names, '/geoscan/sensors/imu' in names)
`, BASIC);
        expect(lines).toEqual(['False False True']);
    });

    withRos2Python('перезапуск узла с topics.gnss:=true: топики есть, данных нет; false убирает топик', () => {
        const { lines } = scenario(`
node = student()
r = await reg('launch', parameters={'topics.gnss': True, 'topics.imu': False}, restart=True)
OUT(r['parameters']['topics.gnss'])
names = [t['name'] for t in await reg('topic_list')]
OUT([n.replace('/geoscan/navigation/', '') for n in names if '/navigation/global' in n or 'satellites' in n])
OUT('/geoscan/sensors/imu' in names)
await to_sky(node)
`.replace('await to_sky(node)', `
node.create_subscription(PointGPS, '/geoscan/navigation/global/position', keep, 10) if False else None
got = []
node.create_subscription(PointGPS, '/geoscan/navigation/global/position', got.append, 10)
await rclpy.spin_until_future_complete(node, rclpy.Future(), timeout_sec=1.0)
OUT(len(got))
OUT((await call(node, '/geoscan/alive', Live)).status)
`), MINI2);
        expect(lines[0]).toBe('True');
        expect(JSON.parse(lines[1].replace(/'/g, '"')).sort()).toEqual(['global/position', 'global/status', 'global/velocity', 'satellites']);
        expect(lines[2]).toBe('False');
        expect(lines[3]).toBe('0');
        expect(lines[4]).toBe('True');
    });

    withRos2Python('неизвестный параметр или значение не того типа при запуске - ошибка', () => {
        const { lines } = scenario(`
student()
for params in ({'topics.nope': True}, {'topics.gnss': 'maybe'}, {'grab': 5}):
    try:
        await reg('launch', parameters=params, restart=True)
        OUT('ok')
    except RuntimeError as e:
        OUT('error')
`, MINI2);
        expect(lines).toEqual(['error', 'error', 'error']);
    });

    withRos2Python('fly_state и callback_event: ARMED -> IN_SKY -> ON_LAND, события автопилота', () => {
        const { lines } = scenario(`${TOPIC_PRE}
events = []
node.create_subscription(Int8, '/geoscan/flight/callback_event', lambda m: events.append(m.data), 50)
states = []
node.create_subscription(Int8, '/geoscan/flight/fly_state', lambda m: states.append(m.data), 50)
await to_sky(node)
await rclpy.spin_until_future_complete(node, rclpy.Future(), timeout_sec=1.0)
await call(node, '/geoscan/flight/land', Trigger)
await wait_fsm('IDLE')
await rclpy.spin_until_future_complete(node, rclpy.Future(), timeout_sec=1.0)
OUT(J(events))
OUT(J(sorted(set(states))))
OUT(states[-1])
`, MINI2);
        expect(JSON.parse(lines[0])).toEqual([8, 7, 2]);
        expect(JSON.parse(lines[1])).toEqual([0, 1, 2]);
        expect(lines[2]).toBe('0');
    });

    withRos2Python('POINT_REACHED приходит событием 5', () => {
        const { lines } = scenario(`${TOPIC_PRE}
events = []
node.create_subscription(Int8, '/geoscan/flight/callback_event', lambda m: events.append(m.data), 50)
await to_sky(node)
await call(node, '/geoscan/flight/go_to_local_point', GoToLocalPoint, x=0.0, y=1.5, z=1.0, yaw=0.0, time=0.0, frame_id='map')
await settle()
await rclpy.spin_until_future_complete(node, rclpy.Future(), timeout_sec=0.5)
OUT(J(events))
`, MINI2);
        const events = JSON.parse(lines[0]) as number[];
        expect(events).toContain(5);
        expect(events).toContain(6);
        expect(events.indexOf(6)).toBeLessThan(events.indexOf(5));
    });

    withRos2Python('данные датчиков: imu, altitude, range, battery, motors_rpm, ranger, optical flow, local/*', () => {
        const { lines } = scenario(`${TOPIC_PRE}
await to_sky(node)
for topic, cls in [('sensors/imu', Imu), ('sensors/altitude', Float32), ('sensors/range', Range), ('sensors/battery_state', BatteryState),
                   ('sensors/motors_rpm', MotorsRpm), ('payload/ranger', RangerData), ('navigation/opt/velocity', OptVelocity),
                   ('navigation/local/position', Point), ('navigation/local/velocity', Vector3), ('navigation/local/yaw', Float32),
                   ('navigation/local/status', NavStatus)]:
    node.create_subscription(cls, '/geoscan/' + topic, keep(topic), 50)
await rclpy.spin_until_future_complete(node, rclpy.Future(), timeout_sec=1.0)
g = lambda name: got[name][-1]
OUT(round(g('sensors/altitude').data, 2))
OUT(g('sensors/imu').orientation.w, g('sensors/imu').linear_acceleration.z, repr(g('sensors/imu').header.frame_id))
OUT(g('sensors/range').radiation_type, round(g('sensors/range').min_range, 2), g('sensors/range').max_range, round(g('sensors/range').field_of_view, 2), g('sensors/range').range)
OUT(round(g('sensors/battery_state').voltage, 1), g('sensors/battery_state').temperature)
m = g('sensors/motors_rpm')
OUT(m.rpm, m.header.frame_id, m.header.stamp.sec > 0)
r = g('payload/ranger')
OUT(r.right, r.left, r.front, r.back, round(r.above_below, 2), r.header.frame_id)
o = g('navigation/opt/velocity')
OUT(o.x, o.y, o.header.frame_id)
OUT(round(g('navigation/local/position').z, 2), g('navigation/local/yaw').data, g('navigation/local/status').status)
`, MINI2);
        expect(lines[0]).toBe('1.0');
        expect(lines[1]).toBe("1.0 9.8 ''");
        expect(lines[2]).toBe('1 0.05 4.0 0.26 1.0');
        expect(lines[3]).toBe('7.9 30.0');
        expect(lines[4]).toBe('[21000.0, 21000.0, 21000.0, 21000.0] base_link True');
        expect(lines[5]).toBe('1.0 2.0 3.0 4.0 1.0 base_link');
        expect(lines[6]).toBe('0.0 0.0 base_link');
        expect(lines[7]).toBe('1.0 0.0 3');
    });

    withRos2Python('range вне диапазона датчика - inf (REP 117); параметры range_sensor.* берутся из конфига', () => {
        const { lines } = scenario(`${TOPIC_PRE}
await reg('launch', parameters={'range_sensor.radiation_type': 'ULTRASOUND', 'range_sensor.max_range': 0.5}, restart=True)
node.create_subscription(Range, '/geoscan/sensors/range', keep('r'), 50)
await to_sky(node)
await rclpy.spin_until_future_complete(node, rclpy.Future(), timeout_sec=0.5)
m = got['r'][-1]
OUT(m.radiation_type, m.max_range, m.range)
`, MINI2);
        expect(lines).toEqual(['0 0.5 inf']);
    });

    withRos2Python('частоты в симулируемом времени: imu ~30 Гц, battery ~2 Гц, fly_state ~10 Гц', () => {
        const { lines } = scenario(`${TOPIC_PRE}
node.create_subscription(Imu, '/geoscan/sensors/imu', keep('imu'), 500)
node.create_subscription(BatteryState, '/geoscan/sensors/battery_state', keep('bat'), 500)
node.create_subscription(Int8, '/geoscan/flight/fly_state', keep('fs'), 500)
await rclpy.spin_until_future_complete(node, rclpy.Future(), timeout_sec=4.0)
OUT(len(got['imu']), len(got['bat']), len(got['fs']))
`, { ...MINI2, speed: 2 });
        const [imu, bat, fs] = lines[0].split(' ').map(Number);
        expect(imu).toBeGreaterThan(60);
        expect(imu).toBeLessThan(150);
        expect(bat).toBeGreaterThanOrEqual(5);
        expect(bat).toBeLessThanOrEqual(10);
        expect(fs).toBeGreaterThan(25);
        expect(fs).toBeLessThan(50);
    });

    withRos2Python('время симуляции пошло назад (сброс сцены): публикации возобновляются сразу', () => {
        const { lines } = scenario(`${TOPIC_PRE}
await rclpy.spin_until_future_complete(node, rclpy.Future(), timeout_sec=3.0)
world.rewind()
states = []
node.create_subscription(Int8, '/geoscan/flight/fly_state', lambda m: states.append(m.data), 50)
await rclpy.spin_until_future_complete(node, rclpy.Future(), timeout_sec=1.0)
OUT(len(states) > 3)
`, { ...MINI2, speed: 4 });
        expect(lines).toEqual(['True']);
    });

    withRos2Python('rc/trigger публикуется при изменении значения канала', () => {
        const { lines } = scenario(`${TOPIC_PRE}
vals = []
node.create_subscription(Int32, '/geoscan/rc/trigger', lambda m: vals.append(m.data), 50)
await rclpy.spin_until_future_complete(node, rclpy.Future(), timeout_sec=0.5)
world.rc[7] = 2000
await rclpy.spin_until_future_complete(node, rclpy.Future(), timeout_sec=0.5)
world.rc[7] = 1000
await rclpy.spin_until_future_complete(node, rclpy.Future(), timeout_sec=0.5)
OUT(J(vals))
`, MINI2);
        expect(JSON.parse(lines[0])).toEqual([1500, 2000, 1000]);
    });
});

describe('подписки ros_pioneer_node: cmd_vel и rc/set_channels', () => {
    const PUB = `
node = student()
pub = node.create_publisher(TwistStamped, '/geoscan/flight/cmd_vel', 10)
def twist(frame, x=0.0, y=0.0, z=0.0, wz=0.0, wx=0.0):
    m = TwistStamped()
    m.header.frame_id = frame
    m.twist.linear.x, m.twist.linear.y, m.twist.linear.z = x, y, z
    m.twist.angular.z = wz
    m.twist.angular.x = wx
    return m
async def tick():
    await rclpy.spin_until_future_complete(node, rclpy.Future(), timeout_sec=0.3)
def speeds():
    return [c[1] for c in calls if c[0] == 'speed']
`;

    withRos2Python('cmd_vel: base_link (x вперёд, y влево) и map, скорость держится 0.5 с', () => {
        const { lines } = scenario(`${PUB}
await to_sky(node)
pub.publish(twist('base_link', x=0.5, y=0.2, z=0.1, wz=0.3, wx=9.0)); await tick()
pub.publish(twist('map', x=0.5, y=0.2)); await tick()
OUT(J(speeds()))
`, MINI2);
        expect(JSON.parse(lines[0])).toEqual([[-0.2, 0.5, 0.1, 0.3, 0.5, true], [0.5, 0.2, 0.0, 0.0, 0.5, false]]);
    });

    withRos2Python('cmd_vel: пустой и чужой frame_id игнорируются с предупреждением, angular.z ограничен ±1.82', () => {
        const { lines, result } = scenario(`${PUB}
await to_sky(node)
pub.publish(twist('', x=1.0)); await tick()
pub.publish(twist('odom', x=1.0)); await tick()
OUT(len(speeds()))
pub.publish(twist('map', wz=5.0)); await tick()
pub.publish(twist('map', wz=-5.0)); await tick()
OUT([s[3] for s in speeds()])
`, MINI2);
        expect(lines).toEqual(['0', '[1.82, -1.82]']);
        const warns = result.log.filter((e) => e[0] === 'WARN').map((e) => e[1]).join('\n');
        expect(warns).toContain('frame_id');
        expect(warns).toContain('1.82');
    });

    withRos2Python('cmd_vel на земле: команда не выполняется, предупреждение в журнале', () => {
        const { result } = scenario(`${PUB}
pub.publish(twist('map', x=1.0)); await tick()
`, MINI2);
        expect(result.log.some((e) => e[0] === 'WARN' && e[1].includes('не в воздухе'))).toBe(true);
    });

    withRos2Python('topics.cmd_vel: false - подписки нет', () => {
        const { lines } = scenario(`
node = student()
await reg('launch', parameters={'topics.cmd_vel': False, 'topics.rc': False}, restart=True)
names = [t['name'] for t in await reg('topic_list')]
OUT('/geoscan/flight/cmd_vel' in names, '/geoscan/rc/set_channels' in names, '/geoscan/rc/trigger' in names)
`, MINI2);
        expect(lines).toEqual(['False False False']);
    });

    withRos2Python('rc/set_channels: каналы 1..8 уходят в автопилот', () => {
        const { lines } = scenario(`
node = student()
pub = node.create_publisher(RcChannels, '/geoscan/rc/set_channels', 10)
pub.publish(RcChannels(channel_1=1500, channel_2=1600, channel_3=1100, channel_4=1500, channel_5=2000, channel_6=1000, channel_7=1500, channel_8=2000))
await rclpy.spin_until_future_complete(node, rclpy.Future(), timeout_sec=0.3)
OUT(J(world.rc))
`, MINI2);
        expect(JSON.parse(lines[0])).toEqual([1500, 1600, 1100, 1500, 2000, 1000, 1500, 2000]);
    });
});

describe('rclpy: клиентская часть', () => {
    withRos2Python('таймер идёт по времени симуляции; create_rate; get_clock', () => {
        const { lines } = scenario(`
node = student()
ticks = []
timer = node.create_timer(0.5, lambda: ticks.append(round(node.get_clock().now().nanoseconds / 1e9 - 315964800, 1)))
await rclpy.spin_until_future_complete(node, rclpy.Future(), timeout_sec=3.2)
OUT(len(ticks))
timer.cancel()
n = len(ticks)
await rclpy.spin_until_future_complete(node, rclpy.Future(), timeout_sec=1.0)
OUT(len(ticks) == n, timer.is_canceled())
rate = node.create_rate(2.0)
t0 = world.now()
for _ in range(4):
    await rate.sleep()
OUT(round(world.now() - t0))
`, { ...MINI2, speed: 8 });
        expect(Number(lines[0])).toBeGreaterThanOrEqual(5);
        expect(Number(lines[0])).toBeLessThanOrEqual(7);
        expect(lines[1]).toBe('True True');
        expect(lines[2]).toBe('2');
    });

    withRos2Python('параметры узла: declare/get/set, переопределения, исключения', () => {
        const { lines } = scenario(`
rclpy.init(args=['--ros-args', '-p', 'speed:=2.5', '-p', 'name:=abc'])
node = rclpy.create_node('p', parameter_overrides=[RParam('height', value=3)])
OUT(node.declare_parameter('speed', 1.0).value, node.declare_parameter('height', 1).value, node.declare_parameter('name', 'x').value)
OUT(node.declare_parameter('fresh', 7).value, node.get_parameter('fresh').value)
r = node.set_parameters([RParam('fresh', value=9)])
OUT(r[0].successful, node.get_parameter('fresh').value)
r = node.set_parameters([RParam('fresh', value='text')])
OUT(r[0].successful, r[0].reason[:25])
try:
    node.get_parameter('missing')
except Exception as e:
    OUT(type(e).__name__)
try:
    node.declare_parameter('fresh', 1)
except Exception as e:
    OUT(type(e).__name__)
node.add_on_set_parameters_callback(lambda ps: SetParametersResult(successful=False, reason='no'))
OUT(node.set_parameters([RParam('fresh', value=1)])[0].successful)
`, MINI2);
        expect(lines[0]).toBe('2.5 3 abc');
        expect(lines[1]).toBe('7 7');
        expect(lines[2]).toBe('True 9');
        expect(lines[3]).toBe('False Wrong parameter type, par');
        expect(lines[4]).toBe('ParameterNotDeclaredException');
        expect(lines[5]).toBe('ParameterAlreadyDeclaredException');
    });

    withRos2Python('сервис ученика: вызов через spin, консоль без spin получает таймаут', () => {
        const { lines } = scenario(`
node = student()
def handle(req, res):
    res.success = req.data
    res.message = 'hello'
    return res
node.create_service(SetBool, 'my_service', handle)
client = node.create_client(SetBool, '/my_service')
OUT(await client.wait_for_service(1.0))
f = client.call_async(SetBool.Request(data=True))
OUT(f.done())
await rclpy.spin_until_future_complete(node, f)
OUT(f.result().success, f.result().message)
try:
    await reg('service_call', name='/my_service', request={'data': True}, timeout_sec=0.5)
except RuntimeError as e:
    OUT('timeout')
`, MINI2);
        expect(lines).toEqual(['True', 'False', 'True hello', 'timeout']);
    });

    withRos2Python('паблишер и подписка: типы, очередь depth, TRANSIENT_LOCAL', () => {
        const { lines } = scenario(`
from rclpy.qos import QoSProfile, DurabilityPolicy
node = student()
pub = node.create_publisher(String, 'chatter', 10)
got = []
node.create_subscription(String, 'chatter', lambda m: got.append(m.data), 3)
for i in range(5):
    pub.publish(String(data=str(i)))
await rclpy.spin_once(node, timeout_sec=0.1)
await rclpy.spin_once(node, timeout_sec=0.1)
await rclpy.spin_once(node, timeout_sec=0.1)
OUT(J(got))
try:
    pub.publish(Int8(data=1))
except TypeError as e:
    OUT('TypeError')
latched = node.create_publisher(String, 'latched', QoSProfile(depth=1, durability=DurabilityPolicy.TRANSIENT_LOCAL))
latched.publish(String(data='first'))
late = []
node.create_subscription(String, 'latched', lambda m: late.append(m.data), QoSProfile(depth=1, durability=DurabilityPolicy.TRANSIENT_LOCAL))
await rclpy.spin_once(node, timeout_sec=0.1)
OUT(J(late), pub.get_subscription_count(), node.count_publishers('chatter'))
`, MINI2);
        expect(JSON.parse(lines[0])).toEqual(['2', '3', '4']);
        expect(lines[1]).toBe('TypeError');
        expect(lines[2]).toBe('["first"] 1 1');
    });

    withRos2Python('rclpy.init дважды - ошибка; shutdown убирает узлы ученика, ros_pioneer_node остаётся', () => {
        const { lines } = scenario(`
node = student()
try:
    rclpy.init()
except RuntimeError as e:
    OUT('twice')
OUT(rclpy.ok(), J(await reg('node_list')))
rclpy.shutdown()
OUT(rclpy.ok())
rclpy.init()
OUT(J(await reg('node_list')))
`, MINI2);
        expect(lines).toEqual(['twice', 'True ["/ros_pioneer_node", "/student"]', 'False', '["/ros_pioneer_node"]']);
    });

    withRos2Python('до rclpy.init() узел создать нельзя', () => {
        const { lines } = scenario(`
try:
    rclpy.create_node('early')
except Exception as e:
    OUT(type(e).__name__)
`, MINI2);
        expect(lines).toEqual(['NotInitializedException']);
    });

    withRos2Python('журнал: формат [LEVEL] [время] [узел]: текст, once и throttle', () => {
        const { result } = scenario(`
node = student()
log = node.get_logger()
log.info('привет')
log.warn('внимание')
log.error('плохо')
log.debug('скрыто')
for _ in range(3):
    log.info('один раз', once=True)
`, MINI2);
        const texts = result.log.map((e) => e[1]);
        expect(texts.some((t) => /^\[INFO\] \[\d+\.\d{9}\] \[student\]: привет$/.test(t))).toBe(true);
        expect(result.log.map((e) => e[0])).toEqual(['INFO', 'WARN', 'ERROR', 'INFO']);
        expect(texts.some((t) => t.includes('скрыто'))).toBe(false);
    });

    withRos2Python('MultiThreadedExecutor запускает ждущие обратные вызовы параллельно', () => {
        const { lines } = scenario(`
from rclpy.executors import MultiThreadedExecutor, SingleThreadedExecutor
node = student()
order = []
async def slow(name, seconds):
    order.append(name + ' start')
    await asyncio.sleep(seconds)
    order.append(name + ' end')
node.create_timer(0.1, lambda: slow('a', 0.3))
node.create_timer(0.1, lambda: slow('b', 0.3))
ex = MultiThreadedExecutor()
ex.add_node(node)
await ex.spin_until_future_complete(rclpy.Future(), timeout_sec=0.6)
OUT(order[:2])
`, { ...MINI2, speed: 5 });
        expect(lines[0]).toBe("['a start', 'b start']");
    });
});

describe('реестр консоли (_ros2_registry)', () => {
    withRos2Python('списки топиков и сервисов с типами; тип топика; информация об узле', () => {
        const { lines } = scenario(`
student()
topics = {t['name']: t['types'] for t in await reg('topic_list')}
OUT(J(topics['/geoscan/flight/cmd_vel']), J(topics['/geoscan/sensors/imu']))
services = {s['name']: s['types'] for s in await reg('service_list')}
OUT(len(services), J(services['/geoscan/flight/arm']), J(services['/geoscan/board/restart']))
OUT(await reg('service_type', name='/geoscan/payload/led/set'))
info = await reg('topic_info', name='/geoscan/flight/cmd_vel')
OUT(info['type'], J(info['subscribers']), J(info['publishers']))
node = await reg('node_info', node='/ros_pioneer_node')
OUT(len(node['service_servers']), len(node['publishers']))
`, MINI2);
        expect(lines[0]).toBe('["geometry_msgs/msg/TwistStamped"] ["sensor_msgs/msg/Imu"]');
        expect(lines[1]).toBe('19 ["gs_interfaces/srv/Arm"] ["std_srvs/srv/Empty"]');
        expect(lines[2]).toBe('gs_interfaces/srv/Led');
        expect(lines[3]).toBe('geometry_msgs/msg/TwistStamped [{"node": "/ros_pioneer_node", "type": "geometry_msgs/msg/TwistStamped"}] []');
        expect(lines[4]).toMatch(/^19 \d+$/);
    });

    withRos2Python('вызов сервиса из консоли без программы ученика: полётный цикл', () => {
        const { lines } = scenario(`
await reg('launch', restart=False)
call_ = lambda name, req=None, type=None: reg('service_call', name=name, request=req or {}, type=type)
r = await call_('/geoscan/flight/arm', {'timeout': 5, 'retries': 0}, 'gs_interfaces/srv/Arm')
OUT(r['response'], r['request'], r['response_repr'])
OUT((await call_('/geoscan/flight/takeoff', {}, 'std_srvs/srv/Trigger'))['response']['success'])
await wait_fsm('FLYING_HOVER')
r = await call_('/geoscan/flight/go_to_local_point', {'x': 0.0, 'y': 0.0, 'z': 1.0, 'yaw': 0.0, 'time': 5, 'frame_id': 'map'})
OUT(r['response'])
OUT((await call_('/geoscan/flight/land'))['yaml'])
`, MINI2);
        expect(lines[0]).toContain("{'success': True} gs_interfaces.srv.Arm_Request(timeout=5.0, retries=0) gs_interfaces.srv.Arm_Response(success=True)");
        expect(lines[1]).toBe('True');
        expect(lines[2]).toBe("{'success': True}");
        expect(lines[3]).toBe('success: true');
    });

    withRos2Python('ошибки консоли: чужой тип, нет сервиса, неверное поле', () => {
        const { lines } = scenario(`
await reg('launch', restart=False)
for kw in [dict(name='/geoscan/flight/arm', type='std_srvs/srv/Trigger'), dict(name='/nope'),
           dict(name='/geoscan/flight/arm', request={'oops': 1}), dict(name='/geoscan/flight/arm', request={'timeout': 'x'})]:
    try:
        await reg('service_call', **kw)
        OUT('ok')
    except RuntimeError as e:
        OUT(str(e)[:24])
`, MINI2);
        expect(lines[0]).toContain('Тип сервиса');
        expect(lines[1]).toContain('недоступен');
        expect(lines[2]).toContain('Неизвестное поле');
        expect(lines[3]).toBeDefined();
    });

    withRos2Python('echo топика и pub в cmd_vel из консоли', () => {
        const { lines } = scenario(`
await reg('launch', restart=False)
await to_sky(student())
items = await reg('topic_echo', name='/geoscan/sensors/altitude', count=2, timeout_sec=5)
OUT(len(items), J(items[0]['msg']), items[0]['yaml'])
r = await reg('topic_pub', name='/geoscan/flight/cmd_vel', type='geometry_msgs/msg/TwistStamped',
              msg={'header': {'frame_id': 'base_link'}, 'twist': {'linear': {'x': 0.5, 'y': 0.0, 'z': 0.0}, 'angular': {'z': 0.0}}})
OUT(r['published'], [c[1] for c in calls if c[0] == 'speed'])
try:
    await reg('topic_echo', name='/nothing', count=1, timeout_sec=0.2)
except RuntimeError as e:
    OUT('no topic')
`, MINI2);
        expect(lines[0]).toBe('2 {"data": 1.0} data: 1.0');
        expect(lines[1]).toBe('1 [[-0.0, 0.5, 0.0, 0.0, 0.5, True]]');
        expect(lines[2]).toBe('no topic');
    });

    withRos2Python('echo печатает yaml вложенных сообщений как ros2 topic echo', () => {
        const { lines } = scenario(`
await reg('launch', restart=False)
items = await reg('topic_echo', name='/geoscan/sensors/motors_rpm', count=1, timeout_sec=5)
OUT(items[0]['yaml'].replace(chr(10), '|'))
`, MINI2);
        expect(lines[0]).toMatch(/^header:\| {2}stamp:\| {4}sec: \d+\| {4}nanosec: \d+\| {2}frame_id: 'base_link'\|rpm:\|- 0\.0\|- 0\.0\|- 0\.0\|- 0\.0$/);
    });

    withRos2Python('param list/get/set; запуск как ros2 run ... -p topics.gnss:=true', () => {
        const { lines } = scenario(`
student()
lst = await reg('param_list')
OUT(J(sorted(lst)), 'topics.gnss' in lst['/ros_pioneer_node'], 'use_sim_time' in lst['/ros_pioneer_node'])
OUT(J(await reg('param_get', node='/ros_pioneer_node', name='gtlp_version')))
try:
    await reg('param_get', node='/ros_pioneer_node', name='nope')
except RuntimeError as e:
    OUT('undeclared')
await reg('launch', config='razero', parameters={'topics.gnss': True}, restart=True)
OUT(J(await reg('param_get', node='/ros_pioneer_node', name='board_name')), J(await reg('launch_status')))
`, MINI2);
        expect(lines[0]).toBe('["/ros_pioneer_node", "/student"] True True');
        expect(JSON.parse(lines[1])).toEqual({ type: 'integer', value: 2 });
        expect(lines[2]).toBe('undeclared');
        expect(lines[3]).toBe('{"type": "string", "value": "Razero"} {"running": true, "config": "razero"}');
    });

    withRos2Python('stop убирает ros_pioneer_node вместе с топиками и сервисами', () => {
        const { lines } = scenario(`
student()
await reg('stop')
OUT(len(await reg('service_list')), len(await reg('topic_list')), (await reg('launch_status'))['running'])
await reg('launch', restart=False)
OUT(len(await reg('service_list')))
`, MINI2);
        expect(lines).toEqual(['0 0 False', '19']);
    });
});
