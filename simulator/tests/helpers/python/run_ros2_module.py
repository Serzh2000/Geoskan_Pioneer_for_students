"""
Запускает настоящий Python-код эмуляции ROS 2 (rclpy, gs_core: public/modules/python/ros2/*) против поддельного
мира js: автомат IDLE -> PREFLIGHT -> TAKEOFF_PROCESS -> FLYING_HOVER -> LANDING_PROCESS -> IDLE, перелёты к точке
со скоростью 1 м/с, ускоренное время симуляции (SPEED раз быстрее настенного).

Запуск: python run_ros2_module.py <папка>
В папке: ros2.py (весь текст эмуляции), bootstrap.py (загрузчик по требованию), transformer.py (кусок browser-runtime.ts),
scenario.py, config.json: {"model": "pioneer-mini2" | "pioneer-basic", "mode": "scenario" | "program" | "lazy", "seconds": 60}.

mode=scenario: в scenario.py корутина main(), доступны js, world, calls, rclpy-модули уже загружены.
mode=program: scenario.py - программа ученика, она проходит через __SimAsyncify, как в браузере.
mode=lazy: как program, но эмуляция грузится загрузчиком по требованию при первом import rclpy.
В конце печатается строка @@RESULT@@ с JSON: состояние мира, журнал вызовов моста, журнал ROS и ошибка.
"""
import asyncio
import ast
import builtins
import inspect
import json
import math
import os
import sys
import time as _time
import types

folder = sys.argv[1]
with open(os.path.join(folder, 'config.json'), encoding='utf-8') as f:
    config = json.load(f)


def read(name):
    with open(os.path.join(folder, name), encoding='utf-8') as f:
        return f.read()


SPEED = float(config.get('speed', 20.0))
START = _time.monotonic()
calls = []
ros_log = []


class World:
    def __init__(self, model):
        self.model = model
        self.fsm = 'IDLE'
        self.pos = [0.0, 0.0, 0.0]
        self.yaw = 0.0
        self.target = None
        self.target_until = None
        self.velocity = None
        self.reached = False
        self.last = 0.0
        self.leds = {}
        self.grab = False
        self.rc = [1500] * 8
        self.battery = 7.9
        self.status = 'OK'
        self.led_count = 2 if model == 'pioneer-mini2' else 4
        self.offset = 0.0

    def now(self):
        return (_time.monotonic() - START) * SPEED - self.offset

    def update(self):
        t = self.now()
        dt = max(0.0, t - self.last)
        self.last = t
        if self.fsm == 'TAKEOFF_PROCESS':
            self.pos[2] = min(1.0, self.pos[2] + 0.5 * dt)
            if self.pos[2] >= 1.0:
                self.fsm = 'FLYING_HOVER'
        elif self.fsm == 'LANDING_PROCESS':
            self.pos[2] = max(0.0, self.pos[2] - 0.5 * dt)
            if self.pos[2] <= 0.0:
                self.fsm = 'IDLE'
        elif self.fsm in ('FLYING_HOVER', 'FLYING_MOVING'):
            if self.velocity is not None:
                vx, vy, vz, wz, until = self.velocity
                if t < until:
                    self.pos[0] += vx * dt
                    self.pos[1] += vy * dt
                    self.pos[2] = max(0.2, self.pos[2] + vz * dt)
                    self.yaw += wz * dt
                    self.fsm = 'FLYING_MOVING'
                else:
                    self.velocity = None
                    self.fsm = 'FLYING_HOVER'
            elif self.target is not None:
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
                    self.fsm = 'FLYING_MOVING'

    def rewind(self):
        # Кнопка «Сначала»: время симуляции снова с нуля, дрон на земле.
        self.offset += self.now()
        self.last = 0.0
        self.fsm = 'IDLE'
        self.pos = [0.0, 0.0, 0.0]
        self.target = None
        self.velocity = None

    def flying(self):
        return self.fsm in ('FLYING_HOVER', 'FLYING_MOVING')

    def distance(self):
        if self.target is None:
            return 0.0
        return math.sqrt(sum((self.target[i] - self.pos[i]) ** 2 for i in range(3)))

    def state(self):
        self.update()
        mini2 = self.model == 'pioneer-mini2'
        return {
            'fsm': self.fsm, 'status': self.status, 'time': self.now(),
            'pos': list(self.pos), 'vel': [0, 0, 0], 'accel': [0, 0, 9.8], 'gyro': [0, 0, 0],
            'rpy': [0, 0, self.yaw], 'battery': self.battery, 'low1': False, 'low2': False,
            'dist': self.pos[2], 'flow': [0, 0], 'ranger': [1, 2, 3, 4, self.pos[2]], 'ranger_hw': mini2,
            'rc8': self.rc[7], 'model': self.model, 'distance': self.distance(), 'led_count': self.led_count,
        }


world = None


class JS(types.ModuleType):
    SIM_DRONE_ID = 'drone-1'

    def py_is_cancelled(self, _id):
        return False

    def pioneer2_sdk_enabled(self, _id):
        return True

    def ros2_state(self, _id):
        return world.state()

    def ros2_time(self, _id):
        return world.now()

    def ros2_log(self, level, text):
        ros_log.append([level, text])

    def ros2_reached(self, _id):
        world.update()
        value, world.reached = world.reached, False
        return value

    def ros2_arm(self, _id):
        world.update()
        calls.append(['arm'])
        if world.fsm != 'IDLE':
            return False
        world.fsm = 'PREFLIGHT'
        return True

    def ros2_disarm(self, _id):
        world.update()
        calls.append(['disarm'])
        world.fsm = 'IDLE'
        world.pos[2] = 0.0
        world.target = None
        return True

    def ros2_takeoff(self, _id):
        world.update()
        calls.append(['takeoff'])
        if world.fsm != 'PREFLIGHT':
            return False
        world.fsm = 'TAKEOFF_PROCESS'
        return True

    def ros2_land(self, _id):
        world.update()
        calls.append(['land'])
        if not world.flying():
            return False
        world.target = None
        world.velocity = None
        world.fsm = 'LANDING_PROCESS'
        return True

    def ros2_rtl(self, _id):
        world.update()
        calls.append(['rtl'])
        if not world.flying():
            return False
        world.target = [0.0, 0.0, 1.0]
        return True

    def ros2_go_to(self, _id, x, y, z, yaw, time):
        world.update()
        calls.append(['go_to', [x, y, z, yaw, time]])
        if not world.flying():
            return False
        world.target = [x, y, z]
        world.velocity = None
        if yaw is not None:
            world.yaw = yaw
        return True

    def ros2_speed(self, _id, vx, vy, vz, yaw_rate, interval, body):
        world.update()
        calls.append(['speed', [vx, vy, vz, yaw_rate, interval, body]])
        if not world.flying():
            return False
        if body:
            c, s = math.cos(world.yaw), math.sin(world.yaw)
            vx, vy = vx * c - vy * s, vx * s + vy * c
        world.velocity = (vx, vy, vz, yaw_rate, world.now() + interval)
        world.target = None
        return True

    def ros2_led(self, _id, led, r, g, b):
        calls.append(['led', [led, r, g, b]])
        if led == 255:
            for i in range(world.led_count):
                world.leds[i] = [r, g, b]
            return True
        if 0 <= led < world.led_count:
            world.leds[led] = [r, g, b]
            return True
        return False

    def ros2_grab(self, _id, closed):
        calls.append(['grab', closed])
        if world.model != 'pioneer-mini2':
            return False
        world.grab = bool(closed)
        return True

    def ros2_cargo(self, _id, grab):
        calls.append(['cargo', grab])
        if world.model == 'pioneer-mini2':
            return False
        world.grab = bool(grab)
        return True

    def ros2_rc(self, _id, *channels):
        calls.append(['rc', list(channels)])
        world.rc = list(channels)
        return True


js = JS('js')
sys.modules['js'] = js
world = None
model = config.get('model', 'pioneer-mini2')
mode = config.get('mode', 'scenario')

error = None


async def run():
    global world, error
    world = World(model)
    world.last = world.now()
    if mode == 'scenario':
        exec(compile(read('ros2.py'), 'ros2_prelude', 'exec'), {'__name__': '_ros2_prelude'})
        namespace = {'js': js, 'world': world, 'calls': calls, 'asyncio': asyncio, 'log': ros_log}
        exec(compile(read('scenario.py'), 'scenario', 'exec'), namespace)
        try:
            await asyncio.wait_for(namespace['main'](), timeout=float(config.get('seconds', 60)) / SPEED)
        except asyncio.TimeoutError:
            error = 'TimeoutError: сценарий не закончился вовремя'
        except BaseException as exc:  # noqa: BLE001
            error = type(exc).__name__ + ': ' + str(exc)
        return
    if mode == 'host':
        # Постоянный процесс для проверки TS-фасада консоли: строки JSON на stdin -> строки @@REPLY@@ на stdout.
        exec(compile(read('ros2.py'), 'ros2_prelude', 'exec'), {'__name__': '_ros2_prelude'})
        registry = sys.modules['_ros2_registry']
        loop = asyncio.get_running_loop()
        print('@@READY@@', flush=True)
        while True:
            line = await loop.run_in_executor(None, sys.stdin.readline)
            if not line:
                return
            request = json.loads(line)
            if request.get('op') == 'world':
                world.update()
                reply = {'fsm': world.fsm, 'pos': world.pos, 'yaw': world.yaw, 'leds': {str(k): v for k, v in world.leds.items()}, 'grab': world.grab, 'rc': world.rc, 'calls': calls, 'log': ros_log}
            else:
                reply = json.loads(await registry.dispatch(request['fn'], json.dumps(request.get('args', {}))))
            print('@@REPLY@@' + json.dumps(reply, ensure_ascii=False), flush=True)
    if mode == 'lazy':
        builtins.__ros2_src = read('ros2.py')
        exec(compile(read('bootstrap.py'), 'bootstrap', 'exec'), {'__name__': '_bootstrap', '__ros2_src': builtins.__ros2_src})
    else:
        exec(compile(read('ros2.py'), 'ros2_prelude', 'exec'), {'__name__': '_ros2_prelude'})
    namespace = {'ast': ast, 'asyncio': asyncio, 'inspect': inspect, 'builtins': builtins, '__sim_ros': True}
    exec(compile(read('transformer.py'), 'transformer', 'exec'), namespace)
    builtins.__sim_bg_tasks = []
    user_main = namespace['__sim_load'](read('scenario.py'))
    try:
        await asyncio.wait_for(user_main(), timeout=float(config.get('seconds', 60)) / SPEED)
    except asyncio.TimeoutError:
        error = 'TimeoutError: программа не закончилась вовремя'
    except BaseException as exc:  # noqa: BLE001
        error = type(exc).__name__ + ': ' + str(exc)
    for task in builtins.__sim_bg_tasks:
        task.cancel()
    rclpy = sys.modules.get('rclpy')
    if rclpy is not None:
        rclpy._sim_cleanup()


asyncio.run(run())
world.update()
print('@@RESULT@@' + json.dumps({
    'error': error, 'fsm': world.fsm, 'pos': world.pos, 'yaw': world.yaw, 'leds': {str(k): v for k, v in world.leds.items()},
    'grab': world.grab, 'rc': world.rc, 'calls': calls, 'log': ros_log, 'modules': sorted(m for m in sys.modules if m.startswith(('rclpy', 'gs_', 'std_', 'geometry_', 'sensor_')))[:5],
}, ensure_ascii=False))
