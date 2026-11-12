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
         "ocr":  [[t0, t1, "текст", score]],    # что читает PaddleOCR
         "rc8":  [[t, значение]]}               # положение тумблера SWA (8 канал) с момента t
Программа запускается в текущей папке (тест даёт пустую временную): файлы, которые она создала,
попадают в трассу строками "file <имя> <первая строка>".
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


_files_before = set(os.listdir('.'))


def record_new_files():
    for name in sorted(set(os.listdir('.')) - _files_before):
        if os.path.isdir(name):
            record('dir ' + name)
            continue
        with open(name, encoding='utf-8', errors='replace') as f:
            record('file %s %s' % (name, f.readline().strip()))


def dump_and_exit(code=0):
    with _lock:
        record_new_files()
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
fake_time.strftime = _real_time.strftime
fake_time.localtime = _real_time.localtime
fake_time.gmtime = _real_time.gmtime
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


class NavSystem(enum.Enum):
    GPS = 0
    LPS = 1
    OPT = 2


class NavStatus(enum.Enum):
    NO_DATA = 0
    CANNOT = 1
    LOW = 2
    OK = 3


# Параметры автопилота, как в pioneer-sdk2-module.ts: остальных get_param не знает.
PARAMS = {
    'Flight_com_navSystem': 1.0, 'Flight_com_takeoffAlt': 0.4, 'Copter_man_rcMode0': 0.0,
    'Copter_man_rcMode1': 0.0, 'Copter_man_rcMode2': 0.0, 'Copter_flyWithoutRc': 0.0, 'SensorMux_rc': 0.0,
}
PARAMS_LOCKED = ('Flight_com_navSystem',)
RC_PARAMS = {
    'Copter_man_rcMode0': 6.0, 'Copter_man_rcMode1': 3.0, 'Copter_man_rcMode2': 3.0,
    'Copter_flyWithoutRc': 1.0, 'SensorMux_rc': 2.0,
}

ON_LAND, ARMED, IN_SKY = 'ON_LAND', 'ARMED', 'IN_SKY'


class FlyState(enum.Enum):
    ON_LAND = 0
    ARMED = 1
    IN_SKY = 2

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
        self.decel_sent = True
        self.takeoff_at = None

    def progress(self):
        if self.target is None:
            return 1.0
        return 1.0 if self.move_time <= 0 else min(1.0, (now() - self.move_since) / self.move_time)

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
        self._rc_callback = None
        self._rc_seen = 0
        self._params = dict(PARAMS)
        self._rc_label = None
        self._rc_last = [0.0] * 4
        self._rc_ignored = False
        threading.Thread(target=self._tick, daemon=True).start()

    # служебный поток: движение к точке и события автопилота
    def _tick(self):
        while not self._closed:
            with _lock:
                slowing = drone.target is not None and drone.move_time > 0 and not drone.decel_sent and drone.progress() >= 0.8
                if slowing:
                    drone.decel_sent = True
                reached = drone.update()
                low_at = config.get('lowVoltageAt')
                low = low_at is not None and not self._low_sent and now() >= low_at
                if low:
                    self._low_sent = True
            if slowing:
                self._fire(Event.POINT_DECELERATION)
            if reached:
                self._fire(Event.POINT_REACHED)
            self._poll_rc()
            if low:
                record('event LOW_VOLTAGE1')
                self._fire(Event.LOW_VOLTAGE1)
            sleep(0.05)

    def _rc_now(self):
        value = 0
        for t, v in config.get('rc8') or []:
            if now() >= t:
                value = v
        return value

    def _poll_rc(self):
        value = self._rc_now()
        if value != self._rc_seen:
            self._rc_seen = value
            if self._rc_callback is not None:
                self._rc_callback(value)

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
        return FlyState[self._state]

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
            drone.takeoff_at = now()
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
            drone.decel_sent = False
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
        return drone.target is not None and drone.move_time > 0 and drone.progress() >= 0.8

    def go_to_local_point_body_fixed(self, x, y, z, yaw=None, time=0):
        """x - вправо, y - вперёд, z - вверх от корпуса; yaw - поворот в градусах от текущего курса."""
        if not self._check('flight'):
            return False
        with _lock:
            drone.update()
            record('body %s,%s,%s' % (fmt(float(x)), fmt(float(y)), fmt(float(z))))
            rad = math.radians(drone.yaw)
            dx = float(y) * math.cos(rad) + float(x) * math.sin(rad)
            dy = float(y) * math.sin(rad) - float(x) * math.cos(rad)
            target = [drone.pos[0] + dx, drone.pos[1] + dy, drone.pos[2] + float(z)]
            if yaw is not None and abs(float(yaw)) > 1e-3:
                drone.yaw += float(yaw)
                record('turn %s' % fmt(float(yaw)))
            drone.move_from = list(drone.pos)
            drone.target = target
            drone.decel_sent = False
            drone.move_since = now()
            drone.move_time = max(0.0, math.dist(drone.pos, target) - 0.15) / Drone.SPEED_MPS
            self._flags[Event.POINT_REACHED].clear()
        return None

    def set_logger(self, value=True):
        pass

    def flight_time(self):
        if self._state == IN_SKY and drone.takeoff_at is not None:
            return round(now() - drone.takeoff_at, 1)
        return 0.0

    def rtl(self):
        record('rtl')
        with _lock:
            drone.update()
            drone.move_from = list(drone.pos)
            drone.target = [0.0, 0.0, drone.pos[2]]
            drone.decel_sent = False
            drone.move_since = now()
            drone.move_time = max(0.0, math.dist(drone.pos, drone.target) - 0.15) / Drone.SPEED_MPS
        return True

    # --- датчики ---------------------------------------------------------------
    def get_accel(self):
        return (0.0, 0.0, 9.81)

    def get_gyro(self):
        return (0.0, 0.0, 0.0)

    def get_mag(self):
        return (0.2, 0.0, -0.45)

    def get_orientation(self):
        return (0.0, 0.0, round(math.degrees(drone.yaw), 2))

    def get_altitude(self):
        return round(drone.pos[2], 3)

    def get_optical_data(self):
        return (0.0, 0.0, drone.pos[2])

    def get_local_velocity_lps(self):
        return (0.0, 0.0, 0.0)

    def get_ranger_data(self):
        return (None, None, None, None, None)      # модуля Ranger нет

    def get_motors_rpm(self):
        return [0.0] * 4 if self._state == ON_LAND else [21000.0] * 4

    def get_nav_system(self, update=False):
        return NavSystem.LPS

    def get_nav_status_lps(self):
        return NavStatus.CANNOT if config.get('navNotReady') else NavStatus.OK

    # --- параметры автопилота (как в pioneer-sdk2-module.ts) -----------------------
    def get_param(self, name, update=False):
        return self._params.get(name)

    def set_param(self, name, value):
        if name in self._params and name not in PARAMS_LOCKED:
            self._params[name] = float(value)
            record('param %s=%s' % (name, fmt(float(value))))
            return True
        return False

    # --- виртуальный пульт --------------------------------------------------------
    def send_rc_channels(self, channel_1=0, channel_2=0, channel_3=0, channel_4=0,
                         channel_5=1, channel_6=0, channel_7=1, channel_8=0):
        sticks = [float(channel_1), float(channel_2), float(channel_3), float(channel_4)]
        if any(abs(v) > 1 for v in sticks):
            record('error rc: стик вне -1..1')
        # Резкий скачок стика = резкий манёвр: плавный профиль не должен прыгать больше чем на 0.1.
        if any(abs(a - b) > 0.1 for a, b in zip(sticks, self._rc_last)):
            record('error rc: стик прыгнул больше чем на 0.1 за такт')
        self._rc_last = sticks
        listens = all(self._params.get(k) == v for k, v in RC_PARAMS.items())
        names = ['roll', 'pitch', 'throttle', 'yaw']
        moving = [n for n, v in zip(names, sticks) if abs(v) > 1e-9]
        if moving and not (listens and self._state == IN_SKY):
            if not self._rc_ignored:
                self._rc_ignored = True
                record('ignored rc: автопилот не слушает пульт (параметры или не в воздухе)')
            return True
        label = 'rc ' + ('+'.join(moving) if moving else 'neutral')
        if label != self._rc_label:
            self._rc_label = label
            record(label)
        return True

    def get_rc_channel(self):
        return self._rc_now()

    def set_rc_trigger(self, callback):
        self._rc_callback = callback

    # --- захват -----------------------------------------------------------------
    def _grab(self, name, movement_time, velocity):
        if not 0 <= velocity <= 100:
            raise ValueError('Скорость должна быть в диапазоне от 0 до 100 включительно')
        record('grab %s' % name)
        return True

    def grab_open(self, movement_time=0, velocity=20):
        return self._grab('open', movement_time, velocity)

    def grab_close(self, movement_time=0, velocity=20):
        return self._grab('close', movement_time, velocity)

    def grab_stop(self):
        return True

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


class RecorderControl:
    """Запись и фото основной/нижней камеры (режимы - как в pioneer-sdk2-module.ts)."""
    CONFIGS = {CameraType.MAIN: [(1280, 720, 30), (640, 360, 30)], CameraType.OPT: [(640, 480, 30)]}

    def __init__(self):
        self._recording = {}

    def get_camera_recording_configs(self, camera_type=CameraType.MAIN):
        return list(self.CONFIGS[camera_type])

    def _config(self, camera_type, config):
        if config is not None and tuple(config) not in self.CONFIGS[camera_type]:
            record('error режим записи не поддерживается: %s' % (config,))

    def start_recording(self, camera_type=CameraType.MAIN, config=None, output_dir='/mnt/media/videos'):
        self._config(camera_type, config)
        if self._recording.get(camera_type):
            record('error запись уже идёт')
        self._recording[camera_type] = True
        record('rec start %s' % camera_type.name)
        return True

    def stop_recording(self, camera_type=CameraType.MAIN):
        if not self._recording.pop(camera_type, False):
            return False
        record('rec stop %s' % camera_type.name)
        return True

    def take_photo(self, file_name, camera_type=CameraType.MAIN, config=None, output_dir='/mnt/media/photos'):
        if not str(file_name).lower().endswith(('.jpg', '.jpeg', '.png')):
            record('error фото: имя файла без расширения изображения')
        self._config(camera_type, config)
        record('photo %s' % file_name)
        return True


sdk2 = types.ModuleType('pioneer_sdk2')
sdk2.Pioneer = Pioneer
sdk2.Event = Event
sdk2.Camera = Camera
sdk2.CameraType = CameraType
sdk2.ImageViewer = ImageViewer
sdk2.ServoCamera = ServoCamera
sdk2.ServoPriority = ServoPriority
sdk2.RecorderControl = RecorderControl
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
cv2.line = lambda *args, **kwargs: None
cv2.LINE_AA = 16
cv2.addWeighted = lambda a, alpha, b, beta, gamma, dst=None: dst if dst is not None else a
cv2.imwrite = lambda name, image: (record('imwrite %s' % name), True)[1]
cv2.vconcat = lambda images: np.vstack(images)


# ArUco по расписанию из config.markers: [[t0, t1, id], ...] - какие маркеры видит камера. Углы в формате OpenCV:
# по массиву (1, 4, 2) на маркер, ids - массив (N, 1) или None.
class _ArucoDetector:
    def __init__(self, dictionary, params=None):
        self.dictionary = dictionary

    def detectMarkers(self, frame):
        t = now()
        seen = [entry for entry in config.get('markers') or [] if entry[0] <= t < entry[1]]
        if not seen:
            return (), None, ()
        corners = []
        for k, entry in enumerate(seen):
            x = 100 + k * 150
            corners.append(np.array([[[x, 100], [x + 80, 100], [x + 80, 180], [x, 180]]], dtype=np.float32))
        return tuple(corners), np.array([[int(entry[2])] for entry in seen], dtype=np.int32), ()


cv2.aruco = types.SimpleNamespace(
    DICT_4X4_50='DICT_4X4_50', DICT_6X6_250='DICT_6X6_250',
    DICT_APRILTAG_16h5='DICT_APRILTAG_16h5', DICT_APRILTAG_25h9='DICT_APRILTAG_25h9', DICT_APRILTAG_36h11='DICT_APRILTAG_36h11',
    getPredefinedDictionary=lambda name: name,
    DetectorParameters=lambda: None,
    ArucoDetector=_ArucoDetector,
    drawDetectedMarkers=lambda frame, corners, ids=None, *args, **kwargs: frame,
)

# Нажатия клавиш по расписанию из config.keys: [[t, "w"], ...]; waitKey отдаёт код клавиши один раз, как в симуляторе.
_keys_consumed = [0]


def _wait_key(delay=0):
    keys = config.get('keys') or []
    if _keys_consumed[0] < len(keys) and keys[_keys_consumed[0]][0] <= now():
        key = keys[_keys_consumed[0]][1]
        _keys_consumed[0] += 1
        return key if isinstance(key, int) else ord(key)
    return -1


cv2.waitKey = _wait_key
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
