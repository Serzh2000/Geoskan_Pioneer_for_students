"""
Запускает Python-программу для Пионера против поддельного pioneer_sdk и
печатает, что сделал бы дрон: взлёт, точки, курс, светодиоды, груз.

Так сравниваются официальные примеры pioneer_sdk и их копии, собранные из
блоков Blockly: обе программы идут здесь на одной и той же модели дрона.

Время ускорено (SPEED раз): time.sleep(1) длится 1/SPEED настоящей секунды,
а time.time()/monotonic() считают «виртуальные» секунды. Потоки (Timer-блоки
Blockly) работают как есть — это обычные потоки Python.

Запуск: python run_scenario.py <script.py> <config.json>
config: {"seconds": 30, "tof": [[t, metres], ...]}
Последняя строка вывода — JSON с событиями, после маркера @@TRACE@@.
"""
import json
import math
import os
import sys
import threading
import time as _real_time
import types

SPEED = 25.0
TRACKED_LEDS = 4

script_path, config_path = sys.argv[1], sys.argv[2]
with open(config_path, encoding='utf-8') as f:
    config = json.load(f)

_start = _real_time.monotonic()
_lock = threading.RLock()
events = []


def now():
    return (_real_time.monotonic() - _start) * SPEED


def record(what):
    with _lock:
        events.append({'t': round(now(), 2), 'what': what})


def dump_and_exit(code=0):
    with _lock:
        sys.stdout.write('\n@@TRACE@@' + json.dumps(events, ensure_ascii=False) + '\n')
        sys.stdout.flush()
    os._exit(code)


# --- time с ускоренными часами -------------------------------------------
fake_time = types.ModuleType('time')
fake_time.time = now
fake_time.monotonic = now
fake_time.perf_counter = now
fake_time.sleep = lambda seconds: _real_time.sleep(max(0.0, float(seconds)) / SPEED)
sys.modules['time'] = fake_time


# --- модель дрона ---------------------------------------------------------
class Drone:
    SPEED_MPS = 0.5
    TAKEOFF_ALT = 1.0

    def __init__(self):
        self.pos = [0.0, 0.0, 0.0]
        self.phase = 'DISARMED'
        self.phase_since = 0.0
        self.move_from = [0.0, 0.0, 0.0]
        self.target = None
        self.move_since = 0.0
        self.move_time = 0.0
        self.reached = False
        self.yaw = 0.0
        self.leds = ['0,0,0'] * TRACKED_LEDS
        self.cargo = False

    def update(self):
        t = now()
        if self.phase == 'TAKEOFF' and t - self.phase_since >= 2:
            self.pos[2] = self.TAKEOFF_ALT
            self.set_phase('MISSION')
        if self.phase == 'LANDING' and t - self.phase_since >= 2:
            self.pos[2] = 0.0
            self.set_phase('DISARMED')
        if self.target is not None:
            k = 1.0 if self.move_time <= 0 else min(1.0, (t - self.move_since) / self.move_time)
            self.pos = [a + (b - a) * k for a, b in zip(self.move_from, self.target)]
            if k >= 1.0:
                self.target = None
                self.reached = True

    def set_phase(self, phase):
        self.phase = phase
        self.phase_since = now()

    def go_to(self, x, y, z, yaw):
        self.update()
        target = [float(x), float(y), float(z)]
        record('goto ' + ','.join(fmt(v) for v in target))
        if yaw is not None and abs(float(yaw) - self.yaw) > 1e-3:
            self.yaw = float(yaw)
            record('yaw ' + fmt(self.yaw, 3))
        self.move_from = list(self.pos)
        self.target = target
        self.move_since = now()
        # Точка засчитывается в радиусе 0.15 м, как в автопилоте симулятора
        # (MOVEMENT_REACHED_EPSILON).
        self.move_time = max(0.0, math.dist(self.pos, target) - 0.15) / self.SPEED_MPS
        self.reached = False

    def set_led(self, i, r, g, b):
        colour = ','.join(str(int(round(float(v)))) for v in (r, g, b))
        if self.leds[i] != colour:
            self.leds[i] = colour
            record('led %d %s' % (i, colour))


def fmt(value, digits=2):
    text = ('%.' + str(digits) + 'f') % value
    text = text.rstrip('0').rstrip('.')
    return '0' if text in ('-0', '') else text


drone = Drone()
if config.get('pos'):
    drone.pos = [float(v) for v in config['pos']]


def tof_at(t):
    profile = config.get('tof')
    if not profile:
        return drone.pos[2]
    value = profile[0][1]
    for start, metres in profile:
        if t >= start:
            value = metres
    return value


class Pioneer:
    def __init__(self, *args, **kwargs):
        self._last_state = None

    def arm(self):
        with _lock:
            drone.update()
            record('arm')
            drone.set_phase('ARMED')
            return True

    def disarm(self):
        with _lock:
            record('disarm')
            drone.set_phase('DISARMED')
            return True

    def takeoff(self):
        with _lock:
            drone.update()
            record('takeoff')
            drone.set_phase('TAKEOFF')
            return True

    def land(self):
        with _lock:
            drone.update()
            record('land')
            drone.target = None
            drone.set_phase('LANDING')
            return True

    def go_to_local_point(self, x, y, z, yaw):
        with _lock:
            drone.go_to(x, y, z, yaw)
            return True

    def go_to_local_point_body_fixed(self, x, y, z, yaw):
        with _lock:
            drone.update()
            c, s = math.cos(drone.yaw), math.sin(drone.yaw)
            dx, dy = float(x) * c - float(y) * s, float(x) * s + float(y) * c
            drone.go_to(drone.pos[0] + dx, drone.pos[1] + dy, drone.pos[2] + float(z), None)
            return True

    def set_manual_speed(self, vx, vy, vz, yaw_rate):
        record('speed %s,%s,%s' % (fmt(float(vx)), fmt(float(vy)), fmt(float(vz))))
        return True

    set_manual_speed_body_fixed = set_manual_speed

    def point_reached(self):
        with _lock:
            drone.update()
            _real_time.sleep(0.0005)
            if drone.reached:
                drone.reached = False
                return True
            return False

    def get_autopilot_state(self):
        with _lock:
            drone.update()
            return drone.phase

    def get_local_position_lps(self, get_last_received=False):
        with _lock:
            drone.update()
            return list(drone.pos)

    def get_dist_sensor_data(self, get_last_received=False):
        return tof_at(now())

    def get_battery_status(self, get_last_received=False):
        return 8.0

    def get_yaw(self, get_last_received=False):
        return drone.yaw

    def led_control(self, led_id=255, r=0, g=0, b=0):
        with _lock:
            ids = range(TRACKED_LEDS) if led_id == 255 else [led_id]
            for i in ids:
                drone.set_led(i, r, g, b)
            return True

    def cargo_grab(self):
        return self.cargo_set(True)

    def cargo_release(self):
        return self.cargo_set(False)

    def cargo_set(self, grab):
        with _lock:
            if drone.cargo != bool(grab):
                drone.cargo = bool(grab)
                record('cargo ' + ('grab' if grab else 'release'))
            return True

    def close_connection(self):
        pass


class Camera:
    def __init__(self, *args, **kwargs):
        pass

    def get_frame(self):
        return None

    def get_cv_frame(self):
        return None


sdk = types.ModuleType('pioneer_sdk')
sdk.Pioneer = Pioneer
sdk.Camera = Camera
sys.modules['pioneer_sdk'] = sdk

# cv2/numpy только для официальных примеров с камерой: окна здесь не нужны.
cv2 = types.ModuleType('cv2')
cv2.imshow = lambda *args, **kwargs: None
cv2.waitKey = lambda *args, **kwargs: (_real_time.sleep(0.001 / SPEED) or -1)
cv2.destroyAllWindows = lambda *args, **kwargs: None
cv2.imdecode = lambda *args, **kwargs: None
cv2.IMREAD_COLOR = 1
sys.modules['cv2'] = cv2
if 'numpy' not in sys.modules:
    try:
        import numpy  # noqa: F401
    except ImportError:
        np = types.ModuleType('numpy')
        np.frombuffer = lambda *args, **kwargs: None
        np.uint8 = 'uint8'
        sys.modules['numpy'] = np


def _thread_error(args):
    record('error %s: %s' % (args.exc_type.__name__, args.exc_value))


threading.excepthook = _thread_error


def watchdog():
    _real_time.sleep(float(config.get('seconds', 30)) / SPEED)
    dump_and_exit(0)


with open(script_path, encoding='utf-8') as f:
    source = f.read()
code = compile(source, script_path, 'exec')

# Часы — с запуска программы, а не интерпретатора: импорт numpy занимает
# настоящую секунду, то есть десятки виртуальных.
_start = _real_time.monotonic()
threading.Thread(target=watchdog, daemon=True).start()
try:
    exec(code, {'__name__': '__main__'})
except SystemExit:
    pass
except BaseException as error:  # noqa: BLE001 — ошибка программы тоже результат
    record('error %s: %s' % (type(error).__name__, error))
dump_and_exit(0)
