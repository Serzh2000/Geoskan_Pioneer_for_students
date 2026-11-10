"""
Запускает настоящий Python-код Swarm Kit (pioneer_swarm: public/modules/python/swarm/prelude.ts) и pioneer_sdk2
против поддельного мира js с НЕСКОЛЬКИМИ дронами. Время симуляции у каждого дрона идёт, пока у него работает программа
(как drone.running в симуляторе). Цикл событий виртуальный: время прыгает к ближайшему таймеру, ничего не ждёт по-настоящему,
поэтому паузы программ (time.sleep, ожидания SDK) идут в симулируемых секундах, а тесты быстрые и детерминированные.

Запуск: python run_swarm_module.py <папка>
В папке: ros2.py, ros2_bootstrap.py (эмуляция ROS 2: сообщения для потоков телеметрии), swarm.py, swarm_bootstrap.py,
sdk2.py (pioneer_sdk2), transformer.py (кусок browser-runtime.ts), scenario.py, config.json:
  {"drones": [{"id": "d1", "name": "Пионер Мини 2 · 1", "model": "pioneer-mini2", "machine_id": "pioneer1", "sdk2": true}],
   "mode": "scenario" | "host", "seconds": 60}

mode=scenario: scenario.py определяет async def main(); доступны: js, worlds, start(drone, code), sim_sleep(секунды),
  add_drone(...), remove_drone(id), out (печать программ по дронам), calls, asyncio. Возврат main() попадает в "data".
mode=host: постоянный процесс, строки JSON на stdin -> строки @@REPLY@@ на stdout (операции call, start, wait, add, remove, world).
В конце (mode=scenario) печатается строка @@RESULT@@ с JSON.
"""
import asyncio
import ast
import builtins
import inspect
import json
import math
import os
import sys
import textwrap
import types

folder = sys.argv[1]
with open(os.path.join(folder, 'config.json'), encoding='utf-8') as f:
    config = json.load(f)


def read(name):
    with open(os.path.join(folder, name), encoding='utf-8') as f:
        return f.read()


class _VirtualSelector:
    def __init__(self, real, loop):
        self._real = real
        self._loop = loop

    def select(self, timeout=None):
        # Есть таймер впереди: время прыгает к нему. Ждать нечего вовсе (None) - настоящее ожидание (stdin в режиме host).
        if timeout is not None and timeout > 0:
            self._loop._vtime += timeout
            timeout = 0
        return self._real.select(timeout)

    def __getattr__(self, name):
        return getattr(self._real, name)


class VirtualLoop(asyncio.SelectorEventLoop):
    def __init__(self):
        super().__init__()
        self._vtime = 0.0
        self._selector = _VirtualSelector(self._selector, self)

    def time(self):
        return self._vtime


LOOP = VirtualLoop()
asyncio.set_event_loop(LOOP)
calls = []
out = {}
errors = {}
log = []


def wall_sim():
    return LOOP.time()


class Result:
    def __init__(self, value):
        self.value = value

    def to_py(self):
        return self.value


class Drone:
    """Поддельный дрон: автомат IDLE -> PREFLIGHT -> TAKEOFF_PROCESS -> FLYING_HOVER -> LANDING_PROCESS -> IDLE."""

    def __init__(self, spec):
        self.id = spec['id']
        self.name = spec.get('name', self.id)
        self.model = spec.get('model', 'pioneer-mini2')
        self.machine_id = spec.get('machine_id', self.id)
        self.sdk2 = spec.get('sdk2', True)
        self.fsm = 'IDLE'
        self.status = 'OK'
        self.pos = [float(spec.get('x', 0.0)), float(spec.get('y', 0.0)), 0.0]
        self.yaw = 0.0
        self.target = None
        self.velocity = None
        self.reached = False
        self.t = 0.0
        self.last = wall_sim()
        self.running = False
        self.battery = 7.9
        self.leds = {}
        self.vel = [0.0, 0.0, 0.0]

    def update(self):
        now = wall_sim()
        dt = max(0.0, now - self.last)
        self.last = now
        if self.running:
            self.t += dt
        self.vel = [0.0, 0.0, 0.0]
        if self.fsm == 'TAKEOFF_PROCESS':
            self.pos[2] = min(1.0, self.pos[2] + 0.5 * dt)
            self.vel[2] = 0.5
            if self.pos[2] >= 1.0:
                self.fsm = 'FLYING_HOVER'
        elif self.fsm == 'LANDING_PROCESS':
            self.pos[2] = max(0.0, self.pos[2] - 0.5 * dt)
            if self.pos[2] <= 0.0:
                self.fsm = 'IDLE'
        elif self.fsm in ('FLYING_HOVER', 'FLYING_MOVING'):
            if self.target is not None:
                dx = [self.target[i] - self.pos[i] for i in range(3)]
                dist = math.sqrt(sum(d * d for d in dx))
                step = 1.0 * dt
                if dist <= step or dist < 0.05:
                    self.pos = list(self.target)
                    self.target = None
                    self.reached = True
                    self.fsm = 'FLYING_HOVER'
                else:
                    self.pos = [self.pos[i] + dx[i] / dist * step for i in range(3)]
                    self.vel = [dx[i] / dist for i in range(3)]
                    self.fsm = 'FLYING_MOVING'

    def flying(self):
        return self.fsm in ('FLYING_HOVER', 'FLYING_MOVING')

    def distance(self):
        if self.target is None:
            return 0.0
        return math.sqrt(sum((self.target[i] - self.pos[i]) ** 2 for i in range(3)))

    def state(self):
        self.update()
        return {
            'fsm': self.fsm, 'status': self.status, 'time': self.t, 'pos': list(self.pos), 'vel': list(self.vel),
            'accel': [0.0, 0.0, 9.81], 'gyro': [0.0, 0.0, 0.0], 'rpy': [0.0, 0.0, self.yaw], 'battery': self.battery,
            'low1': False, 'low2': False,
        }


worlds = {}


def drone_of(drone_id):
    return worlds[str(drone_id)]


class JS(types.ModuleType):
    SIM_DRONE_ID = 'd1'
    cancelled = set()

    # ---- Swarm Kit
    def swarm_units(self):
        rows = [{'drone': d.id, 'machine_id': d.machine_id, 'name': d.name, 'model': d.model} for d in worlds.values() if d.sdk2]
        return json.dumps(rows, ensure_ascii=False)

    def swarm_state(self, drone_id):
        d = worlds.get(str(drone_id))
        return json.dumps(d.state()) if d is not None else ''

    def swarm_clock(self):
        return wall_sim()

    def swarm_exists(self, drone_id):
        return str(drone_id) in worlds

    def swarm_log(self, text):
        log.append(text)

    def py_is_cancelled(self, drone_id):
        return str(drone_id) in self.cancelled

    # ---- pioneer_sdk2
    def pioneer2_sdk_enabled(self, drone_id):
        d = worlds.get(str(drone_id))
        return d is not None and d.sdk2

    def pioneer2_drone_model(self, drone_id):
        return drone_of(drone_id).model

    def pioneer2_log(self, text):
        return None

    def pioneer2_snapshot(self, drone_id):
        d = drone_of(drone_id)
        d.update()
        reached, d.reached = d.reached, False
        return Result([d.fsm, d.status, False, False, reached, d.distance(), d.pos[0], d.pos[1], d.pos[2], d.yaw])

    def pioneer2_motion(self, drone_id):
        d = drone_of(drone_id)
        d.update()
        return Result([d.vel[0], d.vel[1], d.vel[2], 0.0, 0.0, 9.81, 0.0, 0.0, 0.0, 0.0, 0.0, d.yaw, d.t, d.battery])

    def pioneer_get_local_position_lps(self, drone_id):
        d = drone_of(drone_id)
        d.update()
        return Result(list(d.pos))

    def pioneer_arm(self, drone_id):
        d = drone_of(drone_id)
        d.update()
        calls.append([d.id, 'arm'])
        if d.fsm != 'IDLE':
            return False
        d.fsm = 'PREFLIGHT'
        return True

    def pioneer_disarm(self, drone_id):
        d = drone_of(drone_id)
        d.update()
        calls.append([d.id, 'disarm'])
        d.fsm = 'IDLE'
        d.pos[2] = 0.0
        d.target = None
        return True

    def pioneer_takeoff(self, drone_id):
        d = drone_of(drone_id)
        d.update()
        calls.append([d.id, 'takeoff'])
        if d.fsm != 'PREFLIGHT':
            return False
        d.fsm = 'TAKEOFF_PROCESS'
        return True

    def pioneer_land(self, drone_id):
        d = drone_of(drone_id)
        d.update()
        calls.append([d.id, 'land'])
        if not d.flying():
            return False
        d.target = None
        d.fsm = 'LANDING_PROCESS'
        return True

    def pioneer2_go_to(self, drone_id, x, y, z, yaw, time):
        d = drone_of(drone_id)
        d.update()
        calls.append([d.id, 'go_to', [x, y, z]])
        if not d.flying():
            return False
        d.target = [x, y, z]
        return True

    def pioneer_led_control(self, drone_id, led, r, g, b):
        d = drone_of(drone_id)
        calls.append([d.id, 'led', [led, r, g, b]])
        d.leds[led] = [r, g, b]
        return True

    def pioneer_print(self, drone_id, text):
        return None


js = JS('js')
sys.modules['js'] = js
sys.modules['pioneer_sdk'] = types.ModuleType('pioneer_sdk')


def set_drones(specs):
    worlds.clear()
    for spec in specs:
        worlds[spec['id']] = Drone(spec)


set_drones(config.get('drones', []))


def _print(*args, **kwargs):
    frame = sys._getframe(1)
    drone = None
    while frame is not None:
        drone = frame.f_globals.get('__sim_drone_id')
        if drone:
            break
        frame = frame.f_back
    out.setdefault(drone or '-', []).append(' '.join(str(a) for a in args))


builtins.__sim_base_print = lambda *a, **k: None
builtins.print = _print
builtins.__sim_bg_tasks = []

# Эмуляции загружаются по требованию, как в браузере: ROS 2 (сообщения) и Swarm Kit - при первом import.
exec(compile(read('ros2_bootstrap.py'), 'ros2_bootstrap', 'exec'), {'__name__': '_bootstrap', '__ros2_src': read('ros2.py')})
exec(compile(read('swarm_bootstrap.py'), 'swarm_bootstrap', 'exec'), {'__name__': '_bootstrap', '__swarm_src': read('swarm.py')})
exec(compile(read('sdk2.py'), 'sdk2_prelude', 'exec'), {'__name__': 'prelude'})
transformer = {'ast': ast, 'asyncio': asyncio, 'inspect': inspect, 'builtins': builtins}
exec(compile(read('transformer.py'), 'transformer', 'exec'), transformer)

tasks = {}


async def start(drone, code):
    """Запускает программу ученика на дроне, как кнопка «Запуск»: идентификатор дрона берётся в момент старта."""
    js.SIM_DRONE_ID = drone
    run = transformer['__sim_load'](textwrap.dedent(code).strip('\n') + '\n')
    world = drone_of(drone)
    world.running = True

    async def runner():
        try:
            await run()
        except BaseException as exc:  # noqa: BLE001
            if 'PYTHON_CANCELLED' not in str(exc):
                errors[drone] = type(exc).__name__ + ': ' + str(exc)
        finally:
            swarm = sys.modules.get('pioneer_swarm')
            if swarm is not None:
                swarm._sim_cleanup(drone)
            world.running = False

    task = asyncio.ensure_future(runner())
    tasks[drone] = task
    await asyncio.sleep(0)
    return task


async def sim_sleep(seconds):
    end = wall_sim() + float(seconds)
    while wall_sim() < end:
        await asyncio.sleep(0.005)


def add_drone(**spec):
    worlds[spec['id']] = Drone(spec)


def remove_drone(drone_id):
    worlds.pop(drone_id, None)


def snapshot():
    for d in worlds.values():
        d.update()
    return {d.id: {'fsm': d.fsm, 'pos': d.pos, 'yaw': d.yaw, 'leds': {str(k): v for k, v in d.leds.items()}, 'time': d.t, 'running': d.running}
            for d in worlds.values()}


error = None
data = None


async def finish():
    js.cancelled.update(worlds.keys())
    for task in list(tasks.values()):
        task.cancel()
    for task in builtins.__sim_bg_tasks:
        task.cancel()
    await asyncio.sleep(0.05)


async def run():
    global error, data
    mode = config.get('mode', 'scenario')
    if mode == 'host':
        loop = asyncio.get_running_loop()
        print_real = sys.__stdout__.write
        print_real('@@READY@@\n')
        sys.__stdout__.flush()
        while True:
            line = await loop.run_in_executor(None, sys.stdin.readline)
            if not line:
                break
            request = json.loads(line)
            op = request.get('op', 'call')
            if op == 'call':
                swarm = __import__('_swarm_registry')
                reply = json.loads(await swarm.dispatch(request['fn'], json.dumps(request.get('args', {}))))
            elif op == 'start':
                await start(request['drone'], request['code'])
                reply = True
            elif op == 'wait':
                await sim_sleep(request['seconds'])
                reply = True
            elif op == 'add':
                add_drone(**request['spec'])
                reply = True
            elif op == 'remove':
                remove_drone(request['drone'])
                reply = True
            elif op == 'world':
                reply = {'worlds': snapshot(), 'out': out, 'errors': errors, 'calls': calls}
            else:
                reply = {'ok': False, 'error': 'неизвестная операция ' + str(op)}
            sys.__stdout__.write('@@REPLY@@' + json.dumps(reply, ensure_ascii=False) + '\n')
            sys.__stdout__.flush()
        await finish()
        return
    namespace = {'js': js, 'worlds': worlds, 'start': start, 'sim_sleep': sim_sleep, 'add_drone': add_drone, 'remove_drone': remove_drone,
                 'out': out, 'calls': calls, 'asyncio': asyncio, 'errors': errors, 'snapshot': snapshot, 'log': log, 'tasks': tasks, 'wall_sim': wall_sim}
    exec(compile(read('scenario.py'), 'scenario', 'exec'), namespace)
    try:
        data = await asyncio.wait_for(namespace['main'](), timeout=float(config.get('seconds', 60)))
    except asyncio.TimeoutError:
        error = 'TimeoutError: сценарий не закончился вовремя'
    except BaseException as exc:  # noqa: BLE001
        error = type(exc).__name__ + ': ' + str(exc)
    await finish()


LOOP.run_until_complete(run())
if config.get('mode', 'scenario') == 'scenario':
    sys.__stdout__.write('@@RESULT@@' + json.dumps({
        'error': error, 'data': data, 'out': out, 'errors': errors, 'calls': calls, 'log': log, 'worlds': snapshot(),
    }, ensure_ascii=False) + '\n')
