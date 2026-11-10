"""
Запускает программу миссии «Мини 2» так, как её запускает рантайм симулятора, и записывает журнал проверки.

 - Библиотеки настоящие: pioneer_sdk2 (pioneer-sdk2-module.ts) и cv2 (pioneer-sdk-cv-prelude.ts); код ученика проходит
   через тот же преобразователь __SimAsyncify, что и в browser-runtime.ts. Поддельные только мост `js` и камера
   первого SDK.
 - Часы виртуальные: asyncio не ждёт по-настоящему, время мира идёт ровно столько, сколько программа «спала».
 - Мир считает простой автомат автопилота (взлёт на 0.4 м, полёт к точке 0.5 м/с, скорость на interval секунд, посадка),
   ведёт светодиоды и пишет те же события, что пишет мост симулятора в журнал обучения (core/learning-journal.ts):
   arm, state, print, led, position, range, velocity, camera, detect, display.

Запуск: python run_mini2_mission.py <папка> <config.json>
В папке: sdk2.py, cv.py (прелюдии), transformer.py (кусок browser-runtime.ts), program.py.
config: {"seconds": 300, "markers": false}
Последняя строка вывода - JSON после маркера @@RESULT@@: {events, samples, error}.
"""
import asyncio
import ast
import builtins
import inspect
import json
import math
import sys
import time as _time
import types

import numpy as np

folder, config_path = sys.argv[1], sys.argv[2]
with open(config_path, encoding='utf-8') as handle:
    config = json.load(handle)

EVENTS = []
SAMPLES = []
SPEED = 0.5          # м/с, горизонтальный и вертикальный перелёт к точке
TAKEOFF_SPEED = 0.4
TAKEOFF_ALT = 1.0    # TAKEOFF_MIN_ALTITUDE автопилота симулятора (autopilot/fsm-internals.ts)
YAW_SPEED = 1.5      # рад/с
LED_COUNT = 29      # как у платы симулятора: led_control(255, ...) пишет событие на каждый светодиод


class VirtualLoop(asyncio.SelectorEventLoop):
    """Цикл событий с виртуальными часами: ожидание не тратит настоящего времени."""

    def __init__(self):
        super().__init__()
        self._virtual = 0.0

    def time(self):
        return self._virtual

    def _run_once(self):
        if not self._ready and self._scheduled:
            due = self._scheduled[0]._when
            if due > self._virtual:
                self._virtual = due
        super()._run_once()


loop = VirtualLoop()
asyncio.set_event_loop(loop)
_time.monotonic = loop.time
_time.time = lambda: 1_700_000_000.0 + loop.time()


def now():
    return round(loop.time(), 4)


def vec(x, y, z):
    return {'x': float(x), 'y': float(y), 'z': float(z)}


class Result:
    def __init__(self, value):
        self.value = value

    def to_py(self):
        return self.value


class World:
    def __init__(self, drone_id='drone-1', events=None, name='Пионер Мини 2 · 1', machine_id='pioneer1'):
        self.id = drone_id
        self.name = name
        self.machine_id = machine_id
        self.events = EVENTS if events is None else events
        self.vel = [0.0, 0.0, 0.0]
        self.rc = [1500, 1500, 1000, 1500, 1000, 1000, 1000, 1000]
        self.pos = [0.0, 0.0, 0.0]
        self.yaw = 0.0
        self.fsm = 'IDLE'
        self.target = [0.0, 0.0, 0.0]
        self.target_yaw = 0.0
        self.manual = None   # [vx, vy, vz, yaw_rate, until]
        self.reached = False
        self.leds = [dict(r=0.0, g=0.0, b=0.0, w=0.0) for _ in range(LED_COUNT)]
        self.last = 0.0
        self.home = [0.0, 0.0]
        self.rtl = False
        self.status = 'РАБОТАЕТ'

    def state(self, value):
        if value == self.fsm:
            return
        self.events.append(dict(kind='state', time=now(), state=value, **{'from': self.fsm}, pos=vec(*self.pos),
                                target=vec(*self.target), yaw=self.yaw))
        self.fsm = value

    def advance(self):
        target_time = loop.time()
        while self.last + 1e-9 < target_time:
            dt = min(0.02, target_time - self.last)
            self.last += dt
            before = list(self.pos)
            self.step(dt)
            self.vel = [(self.pos[i] - before[i]) / dt for i in range(3)]

    def step(self, dt):
        if self.manual:
            vx, vy, vz, rate, until = self.manual
            if self.last > until:
                self.manual = None
            else:
                self.pos[0] += vx * dt
                self.pos[1] += vy * dt
                self.pos[2] = max(0.0, self.pos[2] + vz * dt)
                self.yaw += rate * dt
        if self.fsm == 'TAKEOFF_PROCESS':
            self.pos[2] = min(self.target[2], self.pos[2] + TAKEOFF_SPEED * dt)
            if self.pos[2] >= self.target[2] - 1e-6:
                self.state('FLYING_HOVER')
        elif self.fsm == 'FLYING_MOVING':
            dx, dy, dz = (self.target[i] - self.pos[i] for i in range(3))
            distance = math.sqrt(dx * dx + dy * dy + dz * dz)
            dyaw = self.target_yaw - self.yaw
            if distance > 0.03:
                k = min(1.0, SPEED * dt / distance)
                for i, delta in enumerate((dx, dy, dz)):
                    self.pos[i] += delta * k
            if abs(dyaw) > 0.02:
                self.yaw += max(-YAW_SPEED * dt, min(YAW_SPEED * dt, dyaw))
            if distance <= 0.03 and abs(dyaw) <= 0.02:
                self.pos = list(self.target)
                self.yaw = self.target_yaw
                self.reached = True
                self.state('FLYING_HOVER')
                if self.rtl:
                    # Как автопилот симулятора (autopilot/params-effects.ts): над точкой старта зависает на Flight_com_homeAlt, а сажает
                    # его только Flight_com_landAtHome (по умолчанию выключен).
                    self.rtl = False
        elif self.fsm == 'LANDING_PROCESS':
            self.pos[2] = max(0.0, self.pos[2] - TAKEOFF_SPEED * dt)
            if self.pos[2] <= 0.0:
                self.state('IDLE')

    def sample(self):
        error = self.status != 'РАБОТАЕТ'
        SAMPLES.append(dict(elapsedMs=loop.time() * 1000, snapshot=dict(
            leds=[dict(led) for led in self.leds], pos=vec(*self.pos), fsmState=self.fsm, flightMode='AUTO',
            pointReachedFlag=False, recentApiCalls=[], fsmTransitions=[], status=self.status if error else 'РАБОТАЕТ')))


WORLDS = {}
world = WORLDS['drone-1'] = World()
for _index, _spec in enumerate(config.get('neighbours') or [], start=2):
    _id = 'drone-%d' % _index
    WORLDS[_id] = World(_id, [], 'Пионер Мини 2 · %d' % _index, 'pioneer%d' % _index)


def W(drone_id):
    return WORLDS.get(str(drone_id), world)


MARKERS = [(10, -1, 1, 0.03), (11, 1, -1, 0.03), (12, 0.6, 0.3, 0.03)] if config.get('markers') else []
frame_markers = {}
frame_serial = 0
drone_view = 'front'


def project_markers():
    result = []
    for marker_id, x, y, z in MARKERS:
        depth = world.pos[2] + 0.02 - z
        if depth <= 0:
            continue
        focal = 180 / math.tan(math.radians(36))
        points = []
        for ox, oy in [(-0.3, 0.3), (0.3, 0.3), (0.3, -0.3), (-0.3, -0.3)]:
            dx = x + ox - world.pos[0]
            dy = y + oy - world.pos[1]
            points.append([320 + focal * (dx * math.cos(world.yaw) + dy * math.sin(world.yaw)) / depth,
                           180 - focal * (-dx * math.sin(world.yaw) + dy * math.cos(world.yaw)) / depth])
        if all(0 <= px <= 640 and 0 <= py <= 360 for px, py in points):
            result.append(dict(id=marker_id, corners=points))
    return result


def synced(function):
    def wrapper(self, drone_id, *args):
        W(drone_id).advance()
        return function(self, drone_id, *args)
    wrapper.__name__ = function.__name__
    return wrapper


ROS_LOG = []


class JS(types.ModuleType):
    SIM_DRONE_ID = 'drone-1'

    def pioneer2_drone_model(self, _id):
        return 'pioneer-mini2'

    def pioneer2_log(self, text):
        return None

    def py_is_cancelled(self, _id):
        return False

    def pioneer_print(self, _id, text):
        world = W(_id)
        world.advance()
        world.events.append(dict(kind='print', time=now(), text=str(text)))

    @synced
    def pioneer2_snapshot(self, _id):
        world = W(_id)
        reached, world.reached = world.reached, False
        distance = math.dist(world.pos, world.target)
        return Result([world.fsm, 'OK', False, False, reached, distance, world.pos[0], world.pos[1], world.pos[2], world.yaw])

    @synced
    def pioneer2_motion(self, _id):
        world = W(_id)
        return Result([world.vel[0], world.vel[1], world.vel[2], 0.0, 0.0, 9.81, 0.0, 0.0, 0.0, 0.0, 0.0, world.yaw, loop.time() + 120.0, 8.1])

    @synced
    def pioneer_arm(self, _id):
        world = W(_id)
        accepted = world.fsm == 'IDLE'
        world.events.append(dict(kind='arm', time=now(), state=world.fsm, accepted=accepted))
        if accepted:
            world.home = [world.pos[0], world.pos[1]]
            world.state('PREFLIGHT')
        return accepted

    @synced
    def pioneer_disarm(self, _id):
        world = W(_id)
        if world.pos[2] > 0.05:
            world.status = 'CRASHED'
            world.state('IDLE')
        else:
            world.state('IDLE')
            world.manual = None
        return True

    @synced
    def pioneer_takeoff(self, _id):
        world = W(_id)
        if world.fsm != 'PREFLIGHT':
            return False
        world.target = [world.pos[0], world.pos[1], world.pos[2] + TAKEOFF_ALT]
        world.state('TAKEOFF_PROCESS')
        return True

    @synced
    def pioneer_land(self, _id):
        world = W(_id)
        if world.fsm not in ('FLYING_HOVER', 'FLYING_MOVING'):
            return False
        world.manual = None
        world.target = [world.pos[0], world.pos[1], 0.0]
        world.state('LANDING_PROCESS')
        return True

    @synced
    def pioneer2_go_to(self, _id, x, y, z, yaw, seconds):
        world = W(_id)
        if world.fsm not in ('FLYING_HOVER', 'FLYING_MOVING'):
            return False
        world.manual = None
        world.target = [float(x), float(y), float(z)]
        world.target_yaw = world.yaw if yaw is None else float(yaw)
        world.reached = False
        world.state('FLYING_MOVING')
        return True

    @synced
    def pioneer2_set_manual_speed(self, _id, vx, vy, vz, yaw_rate, interval, body_fixed):
        world = W(_id)
        if world.fsm in ('IDLE', 'PREFLIGHT'):
            return False
        x, y = float(vx), float(vy)
        if body_fixed:
            x, y = x * math.cos(world.yaw) - y * math.sin(world.yaw), x * math.sin(world.yaw) + y * math.cos(world.yaw)   # physics/frames.ts: bodyPlanarToWorld(right, forward, yaw)
        world.manual = [x, y, float(vz), float(yaw_rate), loop.time() + max(0.0, float(interval))]
        if world.fsm == 'FLYING_MOVING':
            world.state('FLYING_HOVER')
        world.events.append(dict(kind='velocity', time=now(), velocity=vec(x, y, vz), pos=vec(*world.pos), yaw=world.yaw))
        return True

    @synced
    def pioneer2_rtl(self, _id):
        world = W(_id)
        if world.fsm not in ('FLYING_HOVER', 'FLYING_MOVING'):
            return False
        world.target = [world.home[0], world.home[1], 0.5]    # Flight_com_homeAlt
        world.rtl = True
        world.state('FLYING_MOVING')
        return True

    @synced
    def pioneer_get_local_position_lps(self, _id):
        world = W(_id)
        world.events.append(dict(kind='position', time=now(), pos=vec(*world.pos), yaw=world.yaw))
        return Result(list(world.pos))

    @synced
    def pioneer_get_dist_sensor_data(self, _id):
        world = W(_id)
        value = world.pos[2] if world.pos[2] >= 0.05 else 0.0
        world.events.append(dict(kind='range', time=now(), value=value, pos=vec(*world.pos)))
        return value

    @synced
    def pioneer_get_optical_flow(self, _id):
        return Result([0.0, 0.0, 255 if W(_id).pos[2] >= 0.08 else 0])

    @synced
    def pioneer2_ranger(self, _id):
        return Result([5.0, 5.0, 5.0, 5.0, W(_id).pos[2]])

    @synced
    def pioneer_led_control(self, _id, led, r, g, b):
        world = W(_id)
        led = int(led)
        indexes = range(LED_COUNT) if led == 255 else [led] if 0 <= led < 2 else []
        for index in indexes:
            world.leds[index] = dict(r=float(r), g=float(g), b=float(b), w=0.0)
            world.events.append(dict(kind='led', time=now(), ledId=index, color=dict(world.leds[index])))
        return bool(indexes)

    def pioneer2_grab(self, _id, closed):
        return True

    def pioneer2_cargo(self, _id, grab):
        return False

    def pioneer2_camera_tilt(self, _id, angle):
        return True

    # --- ROS 2 (pioneer-ros2-bridge.ts): те же команды, что у pioneer_sdk2 ---
    def ros2_enabled(self, _id):
        return True

    def pioneer2_sdk_enabled(self, _id):
        return True

    def ros2_state(self, _id):
        world = W(_id)
        world.advance()
        return {
            'fsm': world.fsm, 'status': 'OK', 'time': loop.time(), 'pos': list(world.pos), 'vel': list(world.vel),
            'accel': [0.0, 0.0, 9.81], 'gyro': [0.0, 0.0, 0.0], 'rpy': [0.0, 0.0, world.yaw], 'battery': 7.9, 'low1': False, 'low2': False,
            'dist': world.pos[2] if world.pos[2] >= 0.05 else 0.0, 'flow': [0.0, 0.0], 'ranger': [1.0, 2.0, 3.0, 4.0, world.pos[2]],
            'ranger_hw': True, 'rc8': world.rc[7], 'model': 'pioneer-mini2', 'distance': math.dist(world.pos, world.target), 'led_count': 2,
        }

    def ros2_time(self, _id):
        return loop.time()

    def ros2_log(self, level, text):
        ROS_LOG.append([level, str(text)])

    def ros2_reached(self, _id):
        world = W(_id)
        world.advance()
        value, world.reached = world.reached, False
        return value

    def ros2_arm(self, _id):
        return self.pioneer_arm(_id)

    def ros2_disarm(self, _id):
        return self.pioneer_disarm(_id)

    def ros2_takeoff(self, _id):
        return self.pioneer_takeoff(_id)

    def ros2_land(self, _id):
        return self.pioneer_land(_id)

    def ros2_rtl(self, _id):
        return self.pioneer2_rtl(_id)

    def ros2_go_to(self, _id, x, y, z, yaw, seconds):
        return self.pioneer2_go_to(_id, x, y, z, yaw, seconds)

    def ros2_speed(self, _id, vx, vy, vz, yaw_rate, interval, body_fixed):
        return self.pioneer2_set_manual_speed(_id, vx, vy, vz, yaw_rate, interval, body_fixed)

    def ros2_led(self, _id, led, r, g, b):
        return self.pioneer_led_control(_id, led, r, g, b)

    def ros2_grab(self, _id, closed):
        return True

    def ros2_cargo(self, _id, grab):
        return False

    def ros2_rc(self, _id, *channels):
        W(_id).rc = [int(value) for value in channels]
        return True

    # --- Swarm Kit (pioneer-swarm-bridge.ts) ---
    def swarm_units(self):
        rows = [{'drone': w.id, 'machine_id': w.machine_id, 'name': w.name, 'model': 'pioneer-mini2'} for w in WORLDS.values()]
        return json.dumps(rows, ensure_ascii=False)

    def swarm_state(self, drone_id):
        w = WORLDS.get(str(drone_id))
        if w is None:
            return ''
        w.advance()
        return json.dumps({'fsm': w.fsm, 'status': 'OK', 'time': loop.time(), 'pos': list(w.pos), 'vel': list(w.vel), 'accel': [0.0, 0.0, 9.81],
                           'gyro': [0.0, 0.0, 0.0], 'rpy': [0.0, 0.0, w.yaw], 'battery': 7.9, 'low1': False, 'low2': False})

    def swarm_clock(self):
        return loop.time()

    def swarm_exists(self, drone_id):
        return str(drone_id) in WORLDS

    def swarm_log(self, text):
        return None

    # --- компьютерное зрение ---
    def pioneer_cv_detect_markers(self, dictionary, token):
        # Токен 0 - кадр без метки (серое изображение блока Bricks): детектор берёт последний снятый кадр, как мост симулятора.
        key = int(token or 0) or frame_serial
        markers = frame_markers.get(key, []) if dictionary == 'DICT_6X6_250' else []
        EVENTS.append(dict(kind='detect', time=now(), dictionary=str(dictionary), frameId=key, markers=markers,
                           pos=vec(*world.pos), yaw=world.yaw))
        return Result([[m['id'], m['corners']] for m in markers])

    def pioneer_cv_imshow_pixels(self, name, width, height, *_rest):
        EVENTS.append(dict(kind='display', time=now(), width=int(width), height=int(height)))

    def pioneer_cv_imshow(self, name, _payload):
        EVENTS.append(dict(kind='display', time=now()))

    def pioneer_cv_annotation(self, x, y):
        EVENTS.append(dict(kind='annotation', time=now(), point=dict(x=x, y=y)))

    def pioneer_cv_destroy_all_windows(self):
        return None

    def pioneer_cv_wait_key(self, _delay):
        return -1


js = JS('js')
sys.modules['js'] = js


def read(name):
    with open(f'{folder}/{name}', encoding='utf-8') as handle:
        return handle.read()


cv_namespace = {'__name__': 'cv_prelude'}
sdk1 = types.ModuleType('pioneer_sdk')


class FakeCamera:
    """Камера первого SDK: кадр 640x360, метки проецируются на кадр нижней камеры, в журнал идёт событие camera."""

    def __init__(self, view='front', **_kwargs):
        # Как в симуляторе: вид один на дрона и задаётся при создании камеры, побеждает созданная последней.
        global drone_view
        drone_view = view

    def get_cv_frame(self):
        global frame_serial
        world.advance()
        frame_serial += 1
        markers = project_markers() if drone_view == 'bottom' else []
        frame_markers[frame_serial] = markers
        frame = np.full((360, 640, 3), 30, dtype=np.uint8)
        cv_namespace['_remember_frame'](frame, frame_serial)
        EVENTS.append(dict(kind='camera', time=now(), frameId=frame_serial, width=640, height=360, view=drone_view,
                           pos=vec(*world.pos), yaw=world.yaw, markers=markers))
        return frame

    def disconnect(self):
        return None


sdk1.Camera = FakeCamera
sys.modules['pioneer_sdk'] = sdk1

exec(compile('import asyncio, inspect, sys, types\nimport js\n' + read('cv.py'), 'cv-prelude', 'exec'), cv_namespace)
exec(compile(read('sdk2.py'), 'sdk2-prelude', 'exec'), {'__name__': 'sdk2_prelude'})

# ROS 2 и Swarm Kit грузятся по требованию, как в браузере: при первом import rclpy / pioneer_swarm.
USES_ROS2 = bool(config.get('ros2'))
if USES_ROS2:
    exec(compile(read('ros2_bootstrap.py'), 'ros2_bootstrap', 'exec'), {'__name__': '_bootstrap', '__ros2_src': read('ros2.py')})
if config.get('neighbours') is not None:
    exec(compile(read('ros2_bootstrap.py'), 'ros2_bootstrap', 'exec'), {'__name__': '_bootstrap', '__ros2_src': read('ros2.py')})
    exec(compile(read('swarm_bootstrap.py'), 'swarm_bootstrap', 'exec'), {'__name__': '_bootstrap', '__swarm_src': read('swarm.py')})

namespace = {'ast': ast, 'asyncio': asyncio, 'inspect': inspect, 'builtins': builtins, '__sim_ros': USES_ROS2}
exec(compile(read('transformer.py'), 'transformer', 'exec'), namespace)

builtins.__sim_bg_tasks = []
_real_print = builtins.print
builtins.__sim_base_print = lambda *args, **kwargs: None


def sim_print(*args, sep=' ', end='\n', **kwargs):
    js.pioneer_print(js.SIM_DRONE_ID, sep.join(str(a) for a in args))


builtins.print = sim_print

error = None
bots = []


async def start_neighbours():
    """Программы соседей стартуют первыми и не печатают: print идёт на дрон, который стартовал последним (как в браузере)."""
    for index, spec in enumerate(config.get('neighbours') or [], start=2):
        code = (spec or {}).get('code')
        drone_id = 'drone-%d' % index
        if not code:
            continue
        js.SIM_DRONE_ID = drone_id
        main = namespace['__sim_load'](code)
        W(drone_id).running = True

        async def runner(main=main, drone_id=drone_id):
            try:
                await main()
            except BaseException as exc:  # noqa: BLE001
                BOT_ERRORS[drone_id] = type(exc).__name__ + ': ' + str(exc)

        bots.append(asyncio.ensure_future(runner()))
        await asyncio.sleep(0)
        await asyncio.sleep(0)
    js.SIM_DRONE_ID = 'drone-1'


BOT_ERRORS = {}


async def sampler():
    while True:
        world.advance()
        world.sample()
        await asyncio.sleep(0.1)


async def run():
    global error
    ticker = asyncio.ensure_future(sampler())
    try:
        await start_neighbours()
        js.SIM_DRONE_ID = 'drone-1'
        namespace['__user_main'] = namespace['__sim_load'](read('program.py'))
        await asyncio.wait_for(namespace['__user_main'](), timeout=float(config.get('seconds', 300)))
    except asyncio.TimeoutError:
        error = 'TimeoutError: программа не закончилась вовремя'
    except BaseException as exc:  # noqa: BLE001 - SystemExit из программы ученика тоже конец опыта
        error = type(exc).__name__ + ': ' + str(exc)
    ticker.cancel()
    for bot in bots:
        bot.cancel()
    for background in builtins.__sim_bg_tasks:
        background.cancel()
    rclpy_module = sys.modules.get('rclpy')
    if rclpy_module is not None and USES_ROS2:
        rclpy_module._sim_cleanup()
    swarm_module = sys.modules.get('pioneer_swarm')
    if swarm_module is not None:
        swarm_module._sim_cleanup('drone-1')
    world.advance()
    if error and not error.startswith('SystemExit'):
        world.status = 'ОШИБКА'
    world.sample()


loop.run_until_complete(run())
builtins.print = _real_print
# Журнал обучения в браузере хранит последние 4096 событий (core/learning-journal.ts): тест тоже обрезает.
EVENTS = EVENTS[-4096:]
print('@@RESULT@@' + json.dumps({'events': EVENTS, 'samples': SAMPLES, 'error': error, 'botErrors': BOT_ERRORS, 'rosLog': ROS_LOG}, ensure_ascii=False))
