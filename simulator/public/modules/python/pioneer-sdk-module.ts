import { installJsRuntimeAPI } from './pioneer-js-bridge.js';
import { PIONEER_CV_PRELUDE } from './pioneer-sdk-cv-prelude.js';
import { PIONEER_SDK2_PRELUDE } from './pioneer-sdk2-module.js';
import { PIONEER_RKNN_PRELUDE } from './pioneer-rknn-module.js';

const PIONEER_SDK_PRELUDE = `
import asyncio, inspect, sys, types
import hashlib as _hashlib
import js

_WIFI_STATE = {}

m = types.ModuleType('pioneer_sdk')
${PIONEER_CV_PRELUDE}
import threading as _real_threading

threading_mod = types.ModuleType('threading')

# Подменять модуль целиком нельзя: numpy и прочие пакеты берут из threading Lock/RLock/local,
# и без них импорт падает. Кооперативными с asyncio делаются только Thread и Event.
for _threading_attr in dir(_real_threading):
    if not _threading_attr.startswith('__'):
        setattr(threading_mod, _threading_attr, getattr(_real_threading, _threading_attr))

class _Event:
    def __init__(self):
        self._flag = False

    def set(self):
        self._flag = True

    def clear(self):
        self._flag = False

    def is_set(self):
        return self._flag

    async def wait(self, timeout=None):
        elapsed = 0.0
        while not self._flag:
            if timeout is not None and elapsed >= timeout:
                return False
            await asyncio.sleep(0.01)
            elapsed += 0.01
        return True

class _Thread:
    def __init__(self, target=None, args=None, kwargs=None, daemon=None):
        self._target = target
        self._args = tuple(args or ())
        self._kwargs = dict(kwargs or {})
        self.daemon = daemon
        self._task = None

    async def start(self):
        if self._task is not None or self._target is None:
            return None
        result = self._target(*self._args, **self._kwargs)
        if inspect.isawaitable(result):
            self._task = asyncio.create_task(result)
        else:
            async def _runner():
                return result
            self._task = asyncio.create_task(_runner())
        return None

    async def join(self, timeout=None):
        if self._task is None:
            return None
        try:
            if timeout is None:
                await self._task
            else:
                await asyncio.wait_for(asyncio.shield(self._task), timeout)
        except asyncio.TimeoutError:
            return None
        return None

    def is_alive(self):
        return self._task is not None and not self._task.done()

threading_mod.Event = _Event
threading_mod.Thread = _Thread
sys.modules['threading'] = threading_mod

class Pioneer:
    def __init__(self, simulator=True, name='pioneer', ip='192.168.4.1', mavlink_port=8001, connection_method='udpout', device='/dev/serial0', baud=115200, logger=True, log_connection=True, **kwargs):
        self._id = js.pioneer_resolve_drone_id(name, ip, mavlink_port, connection_method)
        self.name = name
        self.ip = ip
        self.mavlink_port = mavlink_port
        self.connection_method = connection_method
        self.device = device
        self.baud = baud
        self._logger = bool(logger)
        self._log_connection = bool(log_connection)

    def log(self, msg, msg_type=None):
        # Как в настоящем SDK: сообщения библиотеки печатаются с именем дрона, если логирование включено.
        if msg_type == "connection" and not self._log_connection:
            return
        if msg_type != "connection" and not self._logger:
            return
        if msg_type is None:
            print(f"[{self.name}] {msg}")
        else:
            print(f"[{self.name}] <{msg_type}> {msg}")

    def set_logger(self, value=True):
        self._logger = bool(value)

    def set_log_connection(self, value=True):
        self._log_connection = bool(value)

    def connected(self):
        return True

    def close_connection(self):
        return js.pioneer_close_connection(self._id)

    def arm(self):
        return bool(js.pioneer_arm(self._id))

    def disarm(self):
        return bool(js.pioneer_disarm(self._id))

    def takeoff(self):
        return bool(js.pioneer_takeoff(self._id))

    def land(self):
        return bool(js.pioneer_land(self._id))

    def go_to_local_point(self, x=None, y=None, z=None, yaw=None):
        return bool(js.pioneer_go_to_local_point(self._id, x, y, z, yaw))

    def go_to_local_point_body_fixed(self, x, y, z, yaw):
        return bool(js.pioneer_go_to_local_point_body_fixed(self._id, x, y, z, yaw))

    def point_reached(self):
        return bool(js.pioneer_point_reached(self._id))

    def set_manual_speed(self, vx, vy, vz, yaw_rate):
        return bool(js.pioneer_set_manual_speed(self._id, vx, vy, vz, yaw_rate))

    def set_manual_speed_body_fixed(self, vx, vy, vz, yaw_rate):
        return bool(js.pioneer_set_manual_speed_body_fixed(self._id, vx, vy, vz, yaw_rate))

    def get_local_position_lps(self, get_last_received=True):
        return js.pioneer_get_local_position_lps(self._id)

    def get_dist_sensor_data(self, get_last_received=True):
        return js.pioneer_get_dist_sensor_data(self._id)

    def get_battery_status(self, get_last_received=True):
        return js.pioneer_get_battery_status(self._id)

    def get_autopilot_state(self):
        return js.pioneer_get_autopilot_state(self._id)

    def get_preflight_state(self):
        # Настоящий SDK отдаёт словарь битов предстартовой проверки из автопилота: ненулевое значение значит «флаг поднят».
        # В симуляторе проблем с батареей, навигацией и зоной нет, а UavStartAllowed поднят, пока моторы выключены.
        ready = js.pioneer_get_autopilot_state(self._id) == 'DISARMED'
        return {'BatteryLow': 0, 'NavSystem': 0, 'Area': 0, 'Attitude': 0, 'RcExpected': 0, 'RcMode': 0,
                'RcUnexpected': 0, 'UavStartAllowed': 128 if ready else 0}

    def get_autopilot_version(self):
        # [flight_sw_version, board_version, flight_custom_version]; в симуляторе это постоянные значения.
        return [16909056, 1, [0, 0, 0, 0, 0, 0, 0, 0]]

    # get_yaw и cargo_* есть только в pioneer_sdk 0.6.1 с GitFlic, и там они
    # работают лишь при Pioneer(simulator=True), иначе NotImplementedError.
    def get_yaw(self, get_last_received=True):
        return js.pioneer_get_yaw(self._id)

    def cargo_set(self, grab):
        return bool(js.pioneer_cargo_set(self._id, bool(grab)))

    def cargo_grab(self):
        return self.cargo_set(True)

    def cargo_release(self):
        return self.cargo_set(False)

    def get_optical_flow(self, get_last_received=True):
        # (flow_x, flow_y, quality): угловая скорость потока, рад/с, в осях дрона
        # (x - вперёд, y - вправо) и качество 0..255. Относительная скорость
        # над поверхностью: v = (flow - вращение) * высота.
        flow_x, flow_y, quality = js.pioneer_get_optical_flow(self._id).to_py()
        return flow_x, flow_y, int(quality)

    def get_optical_data(self, get_last_received=False):
        # Имя и формат настоящего SDK (сообщение OPTICAL_FLOW_RAD): интегральные значения за 20 мс, расстояние и качество.
        # Это те же данные, что отдаёт get_optical_flow(), в виде словаря.
        flow_x, flow_y, quality = self.get_optical_flow()
        interval = 0.02
        distance = js.pioneer_get_dist_sensor_data(self._id)
        return {'integration_time_us': 20000, 'integrated_x': flow_x * interval, 'integrated_y': flow_y * interval,
                'distance': distance, 'integrated_xgyro': 0.0, 'integrated_ygyro': 0.0, 'integrated_zgyro': 0.0,
                'temperature': 0, 'quality': quality}

    def led_control(self, led_id=255, r=0, g=0, b=0):
        return bool(js.pioneer_led_control(self._id, led_id, r, g, b))

    def reboot_board(self):
        # Перезагрузка полётного контроллера: моторы выключаются, как после disarm().
        self.log('sending REBOOT_BOARD ...')
        return bool(js.pioneer_disarm(self._id))

    def lua_script_upload(self, lua_source):
        # На дроне скрипт записывается в память автопилота, а запускается командой lua_script_control('Start').
        js.pioneer_lua_script_upload(self._id, str(lua_source))
        self.log('Lua-скрипт загружен на дрон (в симуляторе: сохранён как скрипт этого дрона)')

    def raspberry_poweroff(self):
        self.log('sending RPi_POWEROFF ...')
        return True

    def raspberry_reboot(self):
        self.log('sending RPi_REBOOT ...')
        return True

    def raspberry_led_custom(self, mode=1, timer=0, color1=(0, 0, 0), color2=(0, 0, 0)):
        # Светодиоды Raspberry Pi на виртуальном дроне отсутствуют: команда принимается и не меняет сцену.
        for color in (color1, color2):
            if len(color) != 3:
                raise ValueError("color1 и color2 должны быть кортежами из трёх чисел (r, g, b).")
        self.log(f'sending RPi_LED mode={mode} timer={timer} ...')
        return True

    def raspberry_start_capture(self, interval=0.1, total_images=0, sequence_number=0):
        self.log('sending RPi_START_CAPTURE ...')
        return True

    def raspberry_stop_capture(self):
        self.log('sending RPi_STOP_CAPTURE ...')
        return True

    # Wi-Fi модуль ESP32 на борту: в симуляторе настройки хранятся в памяти страницы, как у настоящей платы после
    # включения. Сети нет, поэтому подключение к чужой точке доступа всегда «успешно».
    def _wifi(self):
        state = _WIFI_STATE.get(self._id)
        if state is None:
            state = _WIFI_STATE[self._id] = {'ap_ssid': 'Pioneer_sim', 'ap_password': '12345678', 'sta_ssid': None, 'sta_password': None}
        return state

    @staticmethod
    def _wifi_ascii(value, limit, what):
        try:
            return str(value).encode('ascii')[:limit].decode('ascii')
        except UnicodeEncodeError:
            raise ValueError(f"{what}: допустимы только ASCII-символы (латиница, цифры, знаки)")

    @staticmethod
    def _wifi_digest(password):
        # Настоящая плата отдаёт пароль только в виде MD5-хеша.
        return None if password is None else _hashlib.md5(password.encode('ascii')).hexdigest()

    def send_sta_connect(self, ssid, password):
        state = self._wifi()
        state['sta_ssid'] = self._wifi_ascii(ssid, 32, 'ssid')
        state['sta_password'] = self._wifi_ascii(password, 64, 'password')

    def send_sta_disconnect(self):
        state = self._wifi()
        state['sta_ssid'] = None
        state['sta_password'] = None

    def send_ap_ssid(self, ssid):
        self._wifi()['ap_ssid'] = self._wifi_ascii(ssid, 32, 'ssid')

    def send_ap_password(self, password):
        self._wifi()['ap_password'] = self._wifi_ascii(password, 64, 'password')

    def receive_wifi_config_ap(self, blocking=True, timeout=0.3):
        state = self._wifi()
        return types.SimpleNamespace(ssid=state['ap_ssid'], password=self._wifi_digest(state['ap_password']))

    def ap_set_ssid(self, ssid):
        self.send_ap_ssid(ssid)
        return True

    def ap_set_password(self, password):
        self.send_ap_password(password)
        return True

    def sta_connect(self, ssid, password):
        self.send_sta_connect(ssid, password)
        self.log(f'STA подключена к «{ssid}» (в симуляторе сети нет, подключение условное)')
        return True

    def sta_disconnect(self):
        self.send_sta_disconnect()
        return True

    def try_get_sta_status(self):
        state = self._wifi()
        return state['sta_ssid'], self._wifi_digest(state['sta_password'])

    def try_get_ap_status(self):
        state = self._wifi()
        return state['ap_ssid'], self._wifi_digest(state['ap_password'])

    def send_rc_channels(self, channel_1=0xFF, channel_2=0xFF, channel_3=0xFF, channel_4=0xFF, channel_5=0xFF, channel_6=0xFF, channel_7=0xFF, channel_8=0xFF):
        return bool(js.pioneer_send_rc_channels(
            self._id,
            channel_1,
            channel_2,
            channel_3,
            channel_4,
            channel_5,
            channel_6,
            channel_7,
            channel_8
        ))

    def lua_script_control(self, state='Stop', command=None):
        # В настоящем SDK аргумент называется state и принимает 'Start' или 'Stop'; command оставлен для старых программ.
        value = state if command is None else command
        if str(value).lower() not in ('start', 'stop'):
            raise ValueError(f"Argument 'state' must be one of the following values: 'Stop', 'Start'. But your value is '{value}'.")
        return bool(js.pioneer_lua_script_control(self._id, value))


class Camera:
    def __init__(self, timeout=0.5, ip='192.168.4.1', port=None, video_buffer_size=65000, log_connection=True, view='front'):
        if port is None:
            port = js.pioneer_get_default_camera_port(js.SIM_DRONE_ID)
        self._id = js.pioneer_resolve_drone_id('camera', ip, port, 'camera')
        self._ip = ip
        self._port = port
        # Simulator extension: bottom view shares the lower camera shown in the scene.
        js.pioneer_camera_set_view(self._id, str(view))
        self.connect()

    def connected(self):
        return bool(js.pioneer_camera_connected(self._id))

    def connect(self):
        return bool(js.pioneer_camera_connect(self._id))

    def disconnect(self):
        return bool(js.pioneer_camera_disconnect(self._id))

    def get_frame(self):
        # Настоящий SDK вытаскивает из UDP-датаграммы кусок между FFD8 и FFD9, то есть целый
        # JPEG. Здесь кадр уже целиком в памяти, так что отдаём те же самые байты картинки.
        if not self.connected():
            self.connect()
        frame = js.pioneer_camera_get_frame(self._id)
        if frame is None:
            return bytes()
        return _js_bytes(frame)

    def get_cv_frame(self):
        if not self.connected():
            self.connect()
        frame = js.pioneer_camera_get_cv_frame(self._id)
        if frame is None:
            return None
        width = int(frame.width)
        height = int(frame.height)
        raw = _js_bytes(frame.data)
        numpy = _numpy_or_none()
        if numpy is not None and width > 0 and height > 0 and len(raw) == width * height * 3:
            # frombuffer поверх bytes отдаёт read-only view, а cv2.imdecode возвращает
            # изменяемый массив — копия нужна, чтобы рисование по кадру не падало.
            return _remember_frame(numpy.frombuffer(raw, dtype=numpy.uint8).reshape((height, width, 3)).copy(), frame.frameId)
        return _remember_frame(SimCvFrame({"connected": True, "drone_id": self._id}, raw, width, height), frame.frameId)

# pioneer_sdk2 ниже выполняется в том же пространстве имён и подменяет имя Camera своим классом (для Мини 2),
# поэтому VideoStream держит ссылку на камеру первого SDK, а не ищет её по имени при вызове.
_SdkCamera = Camera

class VideoStream:
    def __init__(self, *args, **kwargs):
        self.camera = _SdkCamera(*args, **kwargs)
        self.running = False

    async def start(self):
        self.running = True
        return self.camera.connect()

    async def stop(self):
        self.running = False
        return self.camera.disconnect()

    def connected(self):
        return self.camera.connected()

class VehicleError(Exception):
    pass

def _vehicle_result(raw):
    ok, value = raw.to_py() if hasattr(raw, 'to_py') else raw
    if not ok:
        raise VehicleError(value)
    return value

class Vehicle:
    # Только в симуляторе: машина или поезд на сцене, по названию из их настроек.
    def __init__(self, name):
        self.name = str(name)

    # async, like Thread.start in this runtime: the script runner awaits every
    # .start()/.stop() call automatically, so for the student it is still train.start().
    async def start(self):
        return bool(_vehicle_result(js.pioneer_vehicle_start(self.name)))

    async def stop(self):
        return bool(_vehicle_result(js.pioneer_vehicle_stop(self.name)))

    def set_speed(self, speed):
        return bool(_vehicle_result(js.pioneer_vehicle_set_speed(self.name, float(speed))))

    def get_state(self):
        # Истинное положение - для настройки сценария и проверки результата.
        # В миссии слежения ориентируйтесь на камеру и оптический поток.
        name, kind, x, y, z, heading, speed, moving, marker_id = _vehicle_result(js.pioneer_vehicle_state(self.name))
        return {'name': name, 'kind': kind, 'x': x, 'y': y, 'z': z, 'heading': heading,
                'speed': speed, 'moving': bool(moving), 'marker_id': marker_id}


m.Pioneer = Pioneer
m.Vehicle = Vehicle
m.VehicleError = VehicleError
m.Camera = Camera
m.VideoStream = VideoStream
sys.modules['pioneer_sdk'] = m
`;

export async function installPioneerSdkModule(pyodide: any) {
    if ((window as any).__pioneer_sdk_installed) return;
    installJsRuntimeAPI();
    pyodide.runPython(PIONEER_SDK_PRELUDE);
    // pioneer_sdk2 (Пионер Мини 2) строится поверх классов первого SDK.
    pyodide.runPython(PIONEER_SDK2_PRELUDE);
    // pioneer_rknn (нейросети Мини 2) - «зрение» симулятора по сцене.
    pyodide.runPython(PIONEER_RKNN_PRELUDE);
    (window as any).__pioneer_sdk_installed = true;
}
