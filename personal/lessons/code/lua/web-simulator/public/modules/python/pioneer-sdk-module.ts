import { installJsRuntimeAPI } from './pioneer-js-bridge.js';
import { PIONEER_CV_PRELUDE } from './pioneer-sdk-cv-prelude.js';

const PIONEER_SDK_PRELUDE = `
import asyncio, inspect, sys, types
import js

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

    def led_control(self, led_id=255, r=0, g=0, b=0):
        return bool(js.pioneer_led_control(self._id, led_id, r, g, b))

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

    def lua_script_control(self, command):
        return bool(js.pioneer_lua_script_control(self._id, command))

class Camera:
    def __init__(self, timeout=0.5, ip='192.168.4.1', port=None, video_buffer_size=65000, log_connection=True):
        if port is None:
            port = js.pioneer_get_default_camera_port(js.SIM_DRONE_ID)
        self._id = js.pioneer_resolve_drone_id('camera', ip, port, 'camera')
        self._ip = ip
        self._port = port
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
            return SimCvFrame({
                "connected": False,
                "message": "camera-not-connected",
                "drone_id": self._id
            })
        width = int(frame.width)
        height = int(frame.height)
        raw = _js_bytes(frame.data)
        numpy = _numpy_or_none()
        if numpy is not None and width > 0 and height > 0 and len(raw) == width * height * 3:
            # frombuffer поверх bytes отдаёт read-only view, а cv2.imdecode возвращает
            # изменяемый массив — копия нужна, чтобы рисование по кадру не падало.
            return numpy.frombuffer(raw, dtype=numpy.uint8).reshape((height, width, 3)).copy()
        return SimCvFrame({"connected": True, "drone_id": self._id}, raw, width, height)

class VideoStream:
    def __init__(self, *args, **kwargs):
        self.camera = Camera(*args, **kwargs)
        self.running = False

    async def start(self):
        self.running = True
        return self.camera.connect()

    async def stop(self):
        self.running = False
        return self.camera.disconnect()

    def connected(self):
        return self.camera.connected()

m.Pioneer = Pioneer
m.Camera = Camera
m.VideoStream = VideoStream
sys.modules['pioneer_sdk'] = m
`;

export async function installPioneerSdkModule(pyodide: any) {
    if ((window as any).__pioneer_sdk_installed) return;
    installJsRuntimeAPI();
    pyodide.runPython(PIONEER_SDK_PRELUDE);
    (window as any).__pioneer_sdk_installed = true;
}
