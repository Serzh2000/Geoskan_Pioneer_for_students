/*
 * pioneer_sdk2 в симуляторе - библиотека Пионера Мини 2 (PyPI pioneer-sdk2
 * 0.16). Повторяет её поведение, которое видит программа:
 *  - arm / takeoff / land ждут события автопилота (раннер дописывает к ним
 *    await, см. __SimAsyncify в browser-runtime.ts);
 *  - SDK ведёт автомат ON_LAND -> ARMED -> IN_SKY: команда прошлого этапа
 *    игнорируется, пропуск этапа - RuntimeError;
 *  - курс в градусах, цвет 0..1, скорость держится interval секунд;
 *  - события приходят из фонового потока SDK (здесь - задача asyncio) и
 *    доставляются подписчикам subscribe;
 *  - сообщения logger=True те же, что печатает настоящая библиотека.
 * Камера - та же виртуальная камера, что у pioneer_sdk (класс Camera
 * первого SDK), ImageViewer показывает кадры в окне симулятора.
 */
export const PIONEER_SDK2_PRELUDE = `
import asyncio as _asyncio, builtins as _builtins, enum as _enum, inspect as _inspect, math as _math, sys as _sys, types as _types
import js as _js

_sdk1 = _sys.modules['pioneer_sdk']
_sdk2 = _types.ModuleType('pioneer_sdk2')

class Event(_enum.Enum):
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

class NavSystem(_enum.Enum):
    GPS = 0
    LPS = 1
    OPT = 2

class NavStatus(_enum.Enum):
    NO_DATA = 0
    CANNOT = 1
    LOW = 2
    OK = 3

class FlyState(_enum.Enum):
    ON_LAND = 0
    ARMED = 1
    IN_SKY = 2

_CYCLE = [FlyState.ON_LAND, FlyState.ARMED, FlyState.IN_SKY]
_ALLOWED = {FlyState.ON_LAND: "arm", FlyState.ARMED: "takeoff", FlyState.IN_SKY: "flight"}
_FLYING = ("FLYING_HOVER", "FLYING_MOVING")

def _base_print(text):
    # Мимо пузыря над дроном: так печатает сама библиотека, а не программа.
    getattr(_builtins, "__sim_base_print", print)(text)
    _js.pioneer2_log(text)

def _sim_note(text):
    # Подсказка симулятора, которой нет у настоящей библиотеки.
    _base_print("[симулятор] " + text)

def _bg_task(coro):
    task = _asyncio.ensure_future(coro)
    # Раннер снимает эти задачи, когда программа закончилась (browser-runtime.ts).
    tasks = getattr(_builtins, "__sim_bg_tasks", None)
    if tasks is None:
        tasks = []
        setattr(_builtins, "__sim_bg_tasks", tasks)
    tasks.append(task)
    return task

def _check_model(drone_id):
    model = str(_js.pioneer2_drone_model(drone_id))
    if model != "pioneer-mini2":
        raise RuntimeError(
            "pioneer_sdk2 - библиотека Пионера Мини 2, а выбран другой дрон. "
            "Добавьте дрон «Пионер Мини 2» на панели «Рой» или используйте pioneer_sdk.")

class Pioneer:
    def __init__(self, serial=None, tcp="127.0.0.1:20556", baudrate=57600,
                 wait_callback=True, safety_command=True, logger=True):
        self._id = str(_js.SIM_DRONE_ID)
        _check_model(self._id)
        self.wait_callback = wait_callback
        self.safety_command = safety_command
        self._logger = logger
        self._flags = {ev: False for ev in Event}
        self.watchers = []
        self._closed = False
        self._target = None
        self._decel_sent = False
        self._grab_closed = False
        fsm = str(_js.pioneer2_snapshot(self._id).to_py()[0])
        self._state = FlyState.IN_SKY if fsm in _FLYING else (FlyState.ARMED if fsm == "PREFLIGHT" else FlyState.ON_LAND)
        self.__print_log("Соединение установлено")
        self.__print_log("Класс Пионер инициализирован")
        self._watcher = _bg_task(self._watch())

    def __print_log(self, message):
        if self._logger:
            _base_print(message)

    def set_logger(self, value=True):
        self._logger = bool(value)

    def connect(self):
        return None

    def close_connection(self):
        self._closed = True

    # ---- события -------------------------------------------------------
    def _fire(self, ev):
        self._flags[ev] = True
        if ev == Event.ENGINES_STARTED:
            self._state = FlyState.ARMED
        elif ev == Event.TAKEOFF_COMPLETE:
            self._state = FlyState.IN_SKY
        elif ev in (Event.DISARM, Event.COPTER_LANDED, Event.SHOCK):
            self._state = FlyState.ON_LAND
        for watched, callback in list(self.watchers):
            if watched == Event.ALL or watched == ev:
                result = callback(ev)
                if _inspect.isawaitable(result):
                    _bg_task(result)

    async def _watch(self):
        prev = None
        low1 = low2 = shocked = False
        while not self._closed:
            if _js.py_is_cancelled(self._id):
                return
            fsm, status, l1, l2, reached, distance, x, y, z, yaw = _js.pioneer2_snapshot(self._id).to_py()
            if prev == "TAKEOFF_PROCESS" and fsm in _FLYING:
                self._fire(Event.TAKEOFF_COMPLETE)
            if prev == "LANDING_PROCESS" and fsm == "IDLE":
                self._fire(Event.COPTER_LANDED)
            if prev is not None and prev not in ("IDLE", "LANDING_PROCESS") and fsm == "IDLE" and self._state != FlyState.ON_LAND:
                self._fire(Event.DISARM)
            if status == "CRASHED" and not shocked:
                shocked = True
                self._fire(Event.SHOCK)
            if self._target is not None and not self._decel_sent and distance < 0.5:
                self._decel_sent = True
                self._fire(Event.POINT_DECELERATION)
            if reached:
                self._target = None
                self._fire(Event.POINT_REACHED)
            if l1 and not low1:
                low1 = True
                self._fire(Event.LOW_VOLTAGE1)
            if l2 and not low2:
                low2 = True
                self._fire(Event.LOW_VOLTAGE2)
            prev = fsm
            await _asyncio.sleep(0.05)

    async def _wait_flag(self, ev, timeout=None, give_up=None):
        waited = 0.0
        while not self._flags[ev]:
            if timeout is not None and waited >= timeout:
                return False
            if give_up is not None and give_up():
                return False
            await _asyncio.sleep(0.05)
            waited += 0.05
        self._flags[ev] = False
        # Как в настоящем SDK: подписчики узнают о событии раньше, чем команда вернётся.
        await _asyncio.sleep(0)
        return True

    def subscribe(self, callback, event=Event.ALL):
        self.watchers.append((event, callback))

    def unsubscribe(self, callback, event=Event.ALL):
        for i, watcher in enumerate(self.watchers):
            if watcher[0] == event and watcher[1] == callback:
                del self.watchers[i]
                break

    def get_fly_state(self):
        return self._state

    # ---- порядок команд --------------------------------------------------
    def __check_allowed(self, command):
        if not self.wait_callback or not self.safety_command:
            return True
        if command == _ALLOWED[self._state]:
            return True
        i = _CYCLE.index(self._state)
        if command == _ALLOWED[_CYCLE[(i + 1) % 3]]:
            raise RuntimeError("Команда запрещена: её вызов приведет к некорректному поведению в полете")
        if command == _ALLOWED[_CYCLE[i - 1]]:
            return False
        raise RuntimeError("Команда запрещена: её вызов приведет к некорректному поведению в полете")

    def _fsm(self):
        return str(_js.pioneer2_snapshot(self._id).to_py()[0])

    # ---- полёт -----------------------------------------------------------
    async def arm(self, timeout=5, retries=0):
        if not self.__check_allowed("arm"):
            self.__print_log("Команда запуска моторов проигнорирована: коптер уже в воздухе")
            return False
        attempt = 0
        while attempt < retries + 1:
            self.__print_log("-> ARM" if attempt == 0 else f"Повторная попытка ARM ({attempt + 1})")
            if bool(_js.pioneer_arm(self._id)):
                await _asyncio.sleep(0.3)
                self._fire(Event.ENGINES_STARTED)
                self._flags[Event.ENGINES_STARTED] = False
                await _asyncio.sleep(0)
                self.__print_log("Моторы запущены")
                return True
            await _asyncio.sleep(timeout)
            self.__print_log("Таймаут ожидания запуска моторов.")
            self.disarm()
            attempt += 1
        self.__print_log("ARM не удался. Проверьте систему навигации. Попробуйте задать большее время таймаута или количество попыток")
        return False

    def disarm(self):
        self.__print_log("-> DISARM")
        _js.pioneer_disarm(self._id)
        self.__print_log("Двигатели остановлены")
        if self._state != FlyState.ON_LAND:
            self._fire(Event.DISARM)
        return True

    async def takeoff(self):
        if not self.__check_allowed("takeoff"):
            self.__print_log("Команда взлета проигнорирована: коптер уже в воздухе")
            return False
        self.__print_log("-> Взлет")
        self._flags[Event.TAKEOFF_COMPLETE] = False
        if not bool(_js.pioneer_takeoff(self._id)):
            return False
        if self.wait_callback:
            done = await self._wait_flag(Event.TAKEOFF_COMPLETE, give_up=lambda: self._fsm() == "IDLE")
            if not done:
                return False
            self.__print_log("Взлёт завершен")
        return True

    async def land(self):
        self.__print_log("-> Посадка")
        if self._fsm() == "IDLE":
            _sim_note("land() на земле: настоящий SDK 2 здесь навсегда остановится в ожидании посадки.")
            return True
        self._flags[Event.COPTER_LANDED] = False
        if not bool(_js.pioneer_land(self._id)):
            return False
        if self.wait_callback:
            await self._wait_flag(Event.COPTER_LANDED, give_up=lambda: self._fsm() == "IDLE" and not self._flags[Event.COPTER_LANDED])
            self.__print_log("Посадка завершена")
        return True

    def rtl(self):
        return bool(_js.pioneer2_rtl(self._id))

    def _go(self, x, y, z, yaw, time):
        self._target = (x, y, z)
        self._decel_sent = False
        self._flags[Event.POINT_REACHED] = False
        self._flags[Event.POINT_DECELERATION] = False
        yaw_rad = None if yaw is None else _math.radians(float(yaw))
        _js.pioneer2_go_to(self._id, x, y, z, yaw_rad, time)

    def go_to_local_point(self, x, y, z, yaw=None, time=0):
        if not self.__check_allowed("flight"):
            self.__print_log("Команда полета в точку проигнорирована: коптер еще не в воздухе")
            return False
        self._go(x, y, z, yaw, time)

    def go_to_local_point_body_fixed(self, x, y, z, yaw=None, time=0):
        if not self.__check_allowed("flight"):
            self.__print_log("Команда полета в точку проигнорирована: коптер еще не в воздухе")
            return False
        snap = _js.pioneer2_snapshot(self._id).to_py()
        px, py, pz, cur_yaw = snap[6], snap[7], snap[8], snap[9]
        right, forward = float(x), float(y)
        wx = right * _math.cos(cur_yaw) + forward * _math.sin(cur_yaw)
        wy = right * _math.sin(cur_yaw) - forward * _math.cos(cur_yaw)
        new_yaw = None if yaw is None else _math.degrees(cur_yaw) + float(yaw)
        self._go(px + wx, py + wy, pz + float(z), new_yaw, time)

    def go_to_global_point(self, latitude, longitude, altitude, yaw=0):
        self.__print_log("Команда может быть выполнена только когда установлена система навигации GPS")
        return False

    def go_to_global_point_relative(self, latitude_offset, longitude_offset, altitude_offset, yaw=0):
        self.__print_log("Команда может быть выполнена только когда установлена система навигации GPS")
        return False

    def point_reached(self):
        if self._flags[Event.POINT_REACHED]:
            self._flags[Event.POINT_REACHED] = False
            return True
        return False

    def point_deceleration(self):
        if self._flags[Event.POINT_DECELERATION]:
            self._flags[Event.POINT_DECELERATION] = False
            return True
        return False

    def _speed(self, vx, vy, vz, yaw_rate, interval, body_fixed):
        if not self.__check_allowed("flight"):
            self.__print_log("Команда установки скорости проигнорирована: коптер еще не в воздухе")
        if abs(yaw_rate) > 1.82:
            # Настоящий SDK молча отбрасывает такую команду (ValueError внутри try).
            _sim_note("yaw_rate больше 1.82 рад/с: команда скорости не выполнена.")
            return None
        self._target = None
        _js.pioneer2_set_manual_speed(self._id, vx, vy, vz, yaw_rate, interval, body_fixed)
        return None

    def set_manual_speed(self, vx, vy, vz, yaw_rate, interval=1.0):
        return self._speed(vx, vy, vz, yaw_rate, interval, False)

    def set_manual_speed_body_fixed(self, vx, vy, vz, yaw_rate, interval=1.0):
        return self._speed(vx, vy, vz, yaw_rate, interval, True)

    def set_yaw(self, yaw):
        if not self.__check_allowed("flight"):
            self.__print_log("Команда установки угла проигнорирована: коптер еще не в воздухе")
            return False
        snap = _js.pioneer2_snapshot(self._id).to_py()
        _js.pioneer2_go_to(self._id, snap[6], snap[7], snap[8], _math.radians(float(yaw)), 0)
        return True

    # ---- данные ----------------------------------------------------------
    def _motion(self):
        return _js.pioneer2_motion(self._id).to_py()

    def time(self):
        return 315964800.0 + float(self._motion()[12])

    def uptime(self):
        return int(self._motion()[12])

    def flight_time(self):
        return float(self._motion()[12]) if self._state == FlyState.IN_SKY else 0.0

    def get_battery_status(self):
        return (round(float(self._motion()[13]), 2), 30.0)

    def get_orientation(self):
        m = self._motion()
        return tuple(round(_math.degrees(v), 2) for v in (m[9], m[10], m[11]))

    def get_accel(self):
        m = self._motion()
        return (m[3], m[4], m[5])

    def get_gyro(self):
        m = self._motion()
        return (m[6], m[7], m[8])

    def get_mag(self):
        yaw = self._motion()[11]
        return (round(0.2 * _math.cos(yaw), 3), round(-0.2 * _math.sin(yaw), 3), -0.45)

    def get_altitude(self):
        return round(float(_js.pioneer2_snapshot(self._id).to_py()[8]), 3)

    def get_dist_sensor_data(self):
        return float(_js.pioneer_get_dist_sensor_data(self._id))

    def get_motors_rpm(self):
        fsm = self._fsm()
        rpm = 0.0 if fsm == "IDLE" else (9000.0 if fsm == "PREFLIGHT" else 21000.0)
        return [rpm, rpm, rpm, rpm]

    def get_local_position_lps(self):
        pos = _js.pioneer_get_local_position_lps(self._id).to_py()
        return (float(pos[0]), float(pos[1]), float(pos[2]))

    def get_local_velocity_lps(self):
        m = self._motion()
        return (m[0], m[1], m[2])

    def get_local_yaw_lps(self):
        deg = _math.degrees(self._motion()[11])
        return round((deg + 180.0) % 360.0 - 180.0, 2)

    def get_nav_system(self, update=False):
        return NavSystem.LPS

    def get_nav_status_lps(self):
        return NavStatus.OK

    def get_optical_data(self):
        flow_x, flow_y, quality = _js.pioneer_get_optical_flow(self._id).to_py()
        return (flow_x, flow_y, self.get_dist_sensor_data())

    def _no_gps(self, value):
        self.__print_log("Модуль навигации не установлен")
        return value

    def get_nav_status_gps(self):
        return self._no_gps(None)

    def get_global_position_gps(self):
        return self._no_gps(None)

    def get_global_velocity_gps(self):
        return self._no_gps(None)

    def get_satellites_count(self):
        return self._no_gps(None)

    def get_ranger_data(self):
        return tuple(round(float(v), 3) for v in _js.pioneer2_ranger(self._id).to_py())

    def get_param(self, name, update=False):
        self.__print_log(f"-> Параметр {name} не найден")
        return None

    def set_param(self, name, value):
        self.__print_log(f"-> Установка параметра {name} не удалась")
        return False

    def reboot_board(self):
        self.__print_log("Перезагрузка платы Mini2 запрещена")
        return False

    # ---- подсветка и полезная нагрузка -------------------------------------
    def led_control(self, led_id=255, r=0., g=0., b=0.):
        def level(v):
            return max(0.0, min(1.0, float(v))) * 255.0
        return bool(_js.pioneer_led_control(self._id, led_id, level(r), level(g), level(b)))

    def _grab_move(self, closed, movement_time=0, velocity=20):
        if velocity > 100 or velocity < 0:
            self.__print_log("-> Скорость должна быть в диапазоне от 0 до 100 включительно")
            raise ValueError("-> Скорость должна быть в диапазоне от 0 до 100 включительно")
        self._grab_closed = closed
        return bool(_js.pioneer2_grab(self._id, closed))

    def grab_close(self, movement_time=0, velocity=20):
        return self._grab_move(True, movement_time, velocity)

    def grab_open(self, movement_time=0, velocity=20):
        return self._grab_move(False, movement_time, velocity)

    def grab_stop(self):
        return True

    def cargo_set(self, grab):
        self.__print_log("-> Модуль магнитного захвата груза не поддерживается")
        return False

    def cargo_grab(self):
        return self.cargo_set(True)

    def cargo_release(self):
        return self.cargo_set(False)

CameraType = _enum.Enum("CameraType", {"MAIN": "main", "OPT": "opt"})

class Camera:
    def __init__(self, camera_type=CameraType.MAIN):
        _check_model(str(_js.SIM_DRONE_ID))
        self.camera_type = camera_type
        view = "bottom" if camera_type == CameraType.OPT else "front"
        self._camera = _sdk1.Camera(view=view)

    # Как у настоящей камеры: get_cv_frame ждёт следующий кадр, кадров - 30 в секунду.
    # Заодно цикл стрима отдаёт браузеру время на основную сцену.
    async def get_cv_frame(self, timeout=5.0):
        now = _asyncio.get_event_loop().time()
        wait = getattr(self, "_next_frame_at", 0) - now
        if wait > 0:
            await _asyncio.sleep(wait)
        self._next_frame_at = max(now, getattr(self, "_next_frame_at", 0)) + 1 / 30
        frame = self._camera.get_cv_frame()
        if frame is None:
            raise TimeoutError(f"Не удалось получить кадр в течение {timeout} секунд. Проверьте исправность камеры/media-server.")
        return frame

    async def stop(self):
        self._camera.disconnect()

class ImageViewer:
    """Окно симулятора вместо видеопотока http://10.42.0.1:8889/<имя>."""
    def imshow(self, name, frame, fps=30):
        return _sys.modules["cv2"].imshow(f"{name} · 10.42.0.1:8889/{name}", frame)

    def close(self):
        return _sys.modules["cv2"].destroyAllWindows()

class ServoPriority(_enum.Enum):
    HIGH = 0
    MEDIUM = 1
    LOW = 2

class ServoCamera:
    def __init__(self):
        _check_model(str(_js.SIM_DRONE_ID))
        self._id = str(_js.SIM_DRONE_ID)
        self.angle = 0

    # pioneer-sdk2 0.16 (README): угол от -80 (вниз) до 30 (вверх), вне диапазона - ValueError.
    def set_angle(self, angle, priority=ServoPriority.LOW):
        angle = float(angle)
        if angle < -80 or angle > 30:
            raise ValueError("Угол сервопривода камеры должен быть в диапазоне от -80 до 30 градусов")
        if not isinstance(priority, ServoPriority):
            raise ValueError("priority - ServoPriority.HIGH, MEDIUM или LOW")
        self.angle = angle
        return bool(_js.pioneer2_camera_tilt(self._id, angle))

class ConfigException(Exception):
    pass

# Как у настоящего пакета: наверху - Pioneer, Event и классы платы Мини 2,
# а FlyState, NavSystem и NavStatus - только в pioneer_sdk2.piosdk2.
for _name, _value in {
    "Pioneer": Pioneer, "Event": Event,
    "Camera": Camera, "CameraType": CameraType, "ImageViewer": ImageViewer,
    "ServoCamera": ServoCamera, "ServoPriority": ServoPriority, "ConfigException": ConfigException
}.items():
    setattr(_sdk2, _name, _value)
_piosdk2 = _types.ModuleType('pioneer_sdk2.piosdk2')
for _name, _value in {
    "Pioneer": Pioneer, "Event": Event, "FlyState": FlyState, "NavSystem": NavSystem, "NavStatus": NavStatus
}.items():
    setattr(_piosdk2, _name, _value)
_sdk2.piosdk2 = _piosdk2
_sdk2.__path__ = []
_sys.modules['pioneer_sdk2'] = _sdk2
_sys.modules['pioneer_sdk2.piosdk2'] = _piosdk2
`;
