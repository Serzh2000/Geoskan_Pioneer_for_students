"""
Запускает бортовую Python-программу (pioneer_sdk2 + pioneer_rknn) против
поддельных библиотек и печатает, что сделал бы дрон.

Подделки повторяют поведение pioneer-sdk2 0.16: arm/takeoff/land блокируют
до события автопилота, курс в градусах, цвета 0..1, контроль порядка команд
(ON_LAND -> ARMED -> IN_SKY): команда прошлого этапа игнорируется, пропуск
этапа - RuntimeError. Нейросети отвечают по расписанию из config.

Время ускорено, как в run_scenario.py. Нужен numpy (кадры камеры).

Запуск: python run_onboard.py <script.py> <config.json>
config: {"seconds": 30,
         "lowVoltageAt": 12,                    # событие LOW_VOLTAGE1
         "armFails": true,                      # моторы не запускаются
         "yolo": [[t0, t1, class_id, score]],   # что видит Yolo
         "pose": [[t0, t1, "up" | "down"]],     # что видит YoloPose
         "ocr":  [[t0, t1, "текст", score]]}    # что читает PaddleOCR
Последняя строка вывода - JSON с событиями после маркера @@TRACE@@.
"""
import enum
import json
import math
import os
import sys
import threading
import time as _real_time
import types

import numpy as np

SPEED = 25.0
TRACKED_LEDS = 4

script_path, config_path = sys.argv[1], sys.argv[2]
with open(config_path, encoding='utf-8') as f:
    config = json.load(f)

_start = _real_time.monotonic()
_lock = threading.RLock()
events = []
_once = set()


def now():
    return (_real_time.monotonic() - _start) * SPEED


def record(what):
    with _lock:
        events.append({'t': round(now(), 2), 'what': what})


def record_once(what):
    with _lock:
        if what not in _once:
            _once.add(what)
            record(what)


def dump_and_exit(code=0):
    with _lock:
        sys.stdout.write('\n@@TRACE@@' + json.dumps(events, ensure_ascii=False) + '\n')
        sys.stdout.flush()
    os._exit(code)


def fmt(value, digits=2):
    text = ('%.' + str(digits) + 'f') % value
    text = text.rstrip('0').rstrip('.')
    return '0' if text in ('-0', '') else text


def sleep(seconds):
    _real_time.sleep(max(0.0, float(seconds)) / SPEED)


def window(key, t):
    for entry in config.get(key) or []:
        if entry[0] <= t < entry[1]:
            return entry
    return None


fake_time = types.ModuleType('time')
fake_time.time = now
fake_time.monotonic = now
fake_time.perf_counter = now
fake_time.sleep = sleep
sys.modules['time'] = fake_time


# --- pioneer_sdk2 -------------------------------------------------------------
class Event(enum.Enum):
    ALL = 255
    NULL = 0
    DISARM = 1
    COPTER_LANDED = 2
    LOW_VOLTAGE1 = 3
    LOW_VOLTAGE2 = 4
    POINT_REACHED = 5
    POINT_DECELERATION = 6
    TAKEOFF_COMPLETE = 7
    ENGINES_STARTED = 8
    SHOCK = 9
    LOW_CHARGE = 10


ON_LAND, ARMED, IN_SKY = 'ON_LAND', 'ARMED', 'IN_SKY'
_CYCLE = [ON_LAND, ARMED, IN_SKY]
_ALLOWED = {ON_LAND: 'arm', ARMED: 'takeoff', IN_SKY: 'flight'}


class Drone:
    SPEED_MPS = 0.5
    TAKEOFF_ALT = 1.0

    def __init__(self):
        self.pos = [0.0, 0.0, 0.0]
        self.move_from = [0.0, 0.0, 0.0]
        self.target = None
        self.move_since = 0.0
        self.move_time = 0.0
        self.yaw = 0.0
        self.leds = ['0,0,0'] * TRACKED_LEDS

    def update(self):
        if self.target is None:
            return False
        t = now()
        k = 1.0 if self.move_time <= 0 else min(1.0, (t - self.move_since) / self.move_time)
        self.pos = [a + (b - a) * k for a, b in zip(self.move_from, self.target)]
        if k >= 1.0:
            self.target = None
            return True
        return False


drone = Drone()


class Pioneer:
    def __init__(self, serial=None, tcp='127.0.0.1:20556', baudrate=57600,
                 wait_callback=True, safety_command=True, logger=True):
        self.wait_callback = wait_callback
        self.safety_command = safety_command
        self._state = ON_LAND
        self._flags = {ev: threading.Event() for ev in Event}
        self._watchers = []
        self._closed = False
        self._low_sent = False
        threading.Thread(target=self._tick, daemon=True).start()

    # служебный поток: движение к точке и события автопилота
    def _tick(self):
        while not self._closed:
            with _lock:
                reached = drone.update()
                low_at = config.get('lowVoltageAt')
                low = low_at is not None and not self._low_sent and now() >= low_at
                if low:
                    self._low_sent = True
            if reached:
                self._fire(Event.POINT_REACHED)
            if low:
                record('event LOW_VOLTAGE1')
                self._fire(Event.LOW_VOLTAGE1)
            sleep(0.05)

    def _fire(self, ev):
        self._flags[ev].set()
        if ev == Event.ENGINES_STARTED:
            self._state = ARMED
        elif ev == Event.TAKEOFF_COMPLETE:
            self._state = IN_SKY
        elif ev in (Event.DISARM, Event.COPTER_LANDED, Event.SHOCK):
            self._state = ON_LAND
        for watched, callback in list(self._watchers):
            if watched in (Event.ALL, ev):
                callback(ev)

    def _check(self, command):
        if not (self.wait_callback and self.safety_command):
            return True
        if command == _ALLOWED[self._state]:
            return True
        i = _CYCLE.index(self._state)
        if command == _ALLOWED[_CYCLE[(i + 1) % 3]]:
            record('error RuntimeError: %s пропускает этап (состояние %s)' % (command, self._state))
            raise RuntimeError('Команда запрещена: её вызов приведет к некорректному поведению в полете')
        if command == _ALLOWED[_CYCLE[i - 1]]:
            record('ignored %s в состоянии %s' % (command, self._state))
            return False
        raise RuntimeError('Команда запрещена')

    def get_fly_state(self):
        return self._state

    def arm(self, timeout=5, retries=0):
        if not self._check('arm'):
            return False
        record('arm')
        if config.get('armFails'):
            sleep(timeout)
            record('disarm')
            return False
        sleep(0.3)
        self._fire(Event.ENGINES_STARTED)
        self._flags[Event.ENGINES_STARTED].clear()
        return True

    def disarm(self):
        record('disarm')
        if drone.pos[2] > 0.05:
            record('error disarm в воздухе на высоте %s м' % fmt(drone.pos[2]))
        self._fire(Event.DISARM)
        return True

    def takeoff(self):
        if not self._check('takeoff'):
            return False
        record('takeoff')
        sleep(2)
        with _lock:
            drone.pos[2] = Drone.TAKEOFF_ALT
        self._fire(Event.TAKEOFF_COMPLETE)
        self._flags[Event.TAKEOFF_COMPLETE].clear()
        return True

    def land(self):
        record('land')
        if self._state != IN_SKY:
            # Настоящий land() ждёт COPTER_LANDED без таймаута: на земле - вечно.
            record('error land() вне полёта: настоящий SDK зависнет в ожидании посадки')
            return True
        with _lock:
            drone.target = None
        sleep(2)
        with _lock:
            drone.pos[2] = 0.0
        self._fire(Event.COPTER_LANDED)
        self._flags[Event.COPTER_LANDED].clear()
        return True

    def go_to_local_point(self, x, y, z, yaw=None, time=0):
        if not self._check('flight'):
            return False
        with _lock:
            drone.update()
            target = [float(x), float(y), float(z)]
            record('goto ' + ','.join(fmt(v) for v in target))
            if yaw is not None and abs(float(yaw) - drone.yaw) > 1e-3:
                drone.yaw = float(yaw)
                record('yaw ' + fmt(drone.yaw))
            drone.move_from = list(drone.pos)
            drone.target = target
            drone.move_since = now()
            drone.move_time = max(0.0, math.dist(drone.pos, target) - 0.15) / Drone.SPEED_MPS
            self._flags[Event.POINT_REACHED].clear()
        return None

    def point_reached(self):
        flag = self._flags[Event.POINT_REACHED]
        if flag.is_set():
            flag.clear()
            return True
        return False

    def point_deceleration(self):
        return False

    def set_manual_speed(self, vx, vy, vz, yaw_rate, interval=1.0):
        if not self._check('flight'):
            return None
        if abs(yaw_rate) > 1.82:
            record('error yaw_rate %s > 1.82 рад/с: настоящий SDK молча не выполнит команду' % fmt(yaw_rate))
            return None
        text = 'speed %s,%s,%s,%s' % (fmt(float(vx)), fmt(float(vy)), fmt(float(vz)), fmt(float(yaw_rate)))
        with _lock:
            if getattr(self, '_last_speed', None) != text:
                self._last_speed = text
                record(text)
        return None

    set_manual_speed_body_fixed = set_manual_speed

    def set_yaw(self, yaw):
        if not self._check('flight'):
            return False
        drone.yaw = float(yaw)
        record('yaw ' + fmt(drone.yaw))
        return True

    def led_control(self, led_id=255, r=0., g=0., b=0.):
        for v in (r, g, b):
            if not 0 <= float(v) <= 1:
                record('error led_control: цвет %s вне 0..1' % v)
        with _lock:
            ids = range(TRACKED_LEDS) if led_id == 255 else [led_id]
            colour = ','.join(fmt(float(v)) for v in (r, g, b))
            for i in ids:
                if drone.leds[i] != colour:
                    drone.leds[i] = colour
                    record('led %d %s' % (i, colour))
        return True

    def subscribe(self, callback, event=Event.ALL):
        self._watchers.append((event, callback))

    def unsubscribe(self, callback, event=Event.ALL):
        if (event, callback) in self._watchers:
            self._watchers.remove((event, callback))

    def get_battery_status(self):
        return (7.9, 31.0)

    def get_local_position_lps(self):
        with _lock:
            drone.update()
            return tuple(round(v, 3) for v in drone.pos)

    def get_local_yaw_lps(self):
        return drone.yaw

    def get_dist_sensor_data(self):
        return drone.pos[2]

    def close_connection(self):
        self._closed = True


CameraType = enum.Enum('CameraType', {'MAIN': 'main', 'OPT': 'opt'})


class Camera:
    def __init__(self, camera_type=CameraType.MAIN, *args, **kwargs):
        record_once('camera ' + camera_type.name)

    def get_cv_frame(self, timeout=5.0):
        sleep(1 / 30)
        return np.zeros((480, 640, 3), dtype=np.uint8)

    def stop(self):
        pass


class ImageViewer:
    def imshow(self, name, frame, fps=30):
        if not (isinstance(frame, np.ndarray) and frame.ndim == 3):
            record('error imshow: кадр не BGR-изображение')
        record_once('show ' + name)

    def close(self):
        pass


class ServoPriority(enum.Enum):
    HIGH = 0
    MEDIUM = 1
    LOW = 2


class ServoCamera:
    """pioneer-sdk2 0.16 (README): угол -80..30, вне диапазона - ValueError."""
    def set_angle(self, angle, priority=ServoPriority.LOW):
        angle = float(angle)
        if angle < -80 or angle > 30:
            raise ValueError('Угол сервопривода камеры должен быть в диапазоне от -80 до 30 градусов')
        record('servo ' + fmt(angle))
        return True


sdk2 = types.ModuleType('pioneer_sdk2')
sdk2.Pioneer = Pioneer
sdk2.Event = Event
sdk2.Camera = Camera
sdk2.CameraType = CameraType
sdk2.ImageViewer = ImageViewer
sdk2.ServoCamera = ServoCamera
sdk2.ServoPriority = ServoPriority
sys.modules['pioneer_sdk2'] = sdk2


# --- pioneer_rknn -------------------------------------------------------------
def _check_input(inputs, model):
    ok = (isinstance(inputs, list) and len(inputs) == 1 and isinstance(inputs[0], np.ndarray)
          and inputs[0].shape == (1, model.img_height, model.img_width, 3))
    if not ok:
        shape = getattr(inputs[0], 'shape', None) if isinstance(inputs, list) and inputs else None
        record_once('error вход модели %s, нужен [(1, %d, %d, 3)]' % (shape, model.img_height, model.img_width))


class ModelContainer:
    def __init__(self, model_path=None, model_name=None, target=None, device_id=None):
        record_once('model ' + str(model_name or model_path))
        self._released = False

    def release(self):
        self._released = True
        record_once('release')


class Yolo(ModelContainer):
    def __init__(self, model_path=None, model_name=None, target=None, device_id=None,
                 object_thresh=0.25, nms_thresh=0.45, img_width=640, img_height=640):
        super().__init__(model_path, model_name, target, device_id)
        self.img_width, self.img_height = img_width, img_height

    def run(self, inputs):
        _check_input(inputs, self)
        hit = window('yolo', now())
        if hit is None:
            return None, None, None
        _, _, cls, score = hit
        return (np.array([[200.0, 120.0, 440.0, 600.0]]), np.array([cls]), np.array([score]))


class YoloPose(Yolo):
    class DetectBox:
        def __init__(self, classId, score, xmin, ymin, xmax, ymax, keypoint):
            self.classId, self.score = classId, score
            self.xmin, self.ymin, self.xmax, self.ymax = xmin, ymin, xmax, ymax
            self.keypoint = keypoint

    def run(self, inputs):
        _check_input(inputs, self)
        hit = window('pose', now())
        if hit is None:
            return []
        k = np.zeros((17, 3))
        k[:, 2] = 0.9
        k[5] = k[6] = (300, 250, 0.9)                     # плечи
        wrist_y = 150 if hit[2] == 'up' else 400
        k[9] = k[10] = (300, wrist_y, 0.9)                # запястья
        return [YoloPose.DetectBox(0, 0.9, 200, 100, 440, 600, k)]


class PaddleOCR:
    def __init__(self, det_model_path=None, rec_model_path=None, rec_model_name=None, det_model_name=None):
        record_once('ocr %s + %s' % (det_model_name or det_model_path, rec_model_name or rec_model_path))

    def run(self, img):
        if not (isinstance(img, np.ndarray) and img.ndim == 3):
            record_once('error PaddleOCR.run ждёт одно изображение')
        hit = window('ocr', now())
        if hit is None:
            return [], []
        box = np.array([[10, 10], [200, 10], [200, 60], [10, 60]])
        return [box], [[(hit[2], hit[3])]]


class ModelRegistry:
    def __init__(self, url='http://127.0.0.1:7777/model'):
        pass

    def list_model(self):
        return {'yolov8n': {'arch': 'yolov8'}, 'yolov8n-pose': {'arch': 'yolov8-pose'}}

    def get_model_info(self, name):
        return {'name': name, 'arch': 'yolov8', 'version': '1'}


rknn = types.ModuleType('pioneer_rknn')
for _cls in (ModelContainer, Yolo, YoloPose, PaddleOCR, ModelRegistry):
    setattr(rknn, _cls.__name__, _cls)
sys.modules['pioneer_rknn'] = rknn


# cv2 без окон и без зависимости от установленного OpenCV.
cv2 = types.ModuleType('cv2')
cv2.COLOR_BGR2RGB = 4
cv2.FONT_HERSHEY_SIMPLEX = 0


def _resize(image, size, *args, **kwargs):
    w, h = size
    return np.zeros((h, w) + image.shape[2:], dtype=image.dtype)


cv2.resize = _resize
cv2.cvtColor = lambda image, code: image.copy()
cv2.rectangle = lambda image, p1, p2, *args, **kwargs: record_once('rect %d,%d-%d,%d' % (*p1, *p2))
cv2.putText = lambda image, text, *args, **kwargs: record_once('text ' + text) if not text.startswith('640x480') else None
cv2.circle = lambda *args, **kwargs: None
sys.modules['cv2'] = cv2


# Вывод программы тоже попадает в трассу: "print <текст>".
import builtins

_real_print = builtins.print


def _print(*args, sep=' ', end='\n', file=None, flush=False):
    if file is None:
        record('print ' + sep.join(str(a) for a in args))
    _real_print(*args, sep=sep, end=end, file=file, flush=flush)


builtins.print = _print


def _thread_error(args):
    record('error %s: %s' % (args.exc_type.__name__, args.exc_value))


threading.excepthook = _thread_error


def watchdog():
    _real_time.sleep(float(config.get('seconds', 30)) / SPEED)
    dump_and_exit(0)


with open(script_path, encoding='utf-8') as f:
    source = f.read()
code = compile(source, script_path, 'exec')

_start = _real_time.monotonic()
threading.Thread(target=watchdog, daemon=True).start()
try:
    exec(code, {'__name__': '__main__'})
    record('exit')
except SystemExit as stop:
    record('exit %s' % stop.code if stop.code else 'exit')
except BaseException as error:  # noqa: BLE001 — ошибка программы тоже результат
    record('error %s: %s' % (type(error).__name__, error))
dump_and_exit(0)
