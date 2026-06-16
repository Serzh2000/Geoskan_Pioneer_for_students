import { installJsRuntimeAPI } from './pioneer-js-bridge.js';

const PIONEER_SDK_PRELUDE = `
import sys, types
import js

m = types.ModuleType('pioneer_sdk')

class Pioneer:
    def __init__(self, simulator=True, name='pioneer', ip='192.168.4.1', mavlink_port=8001, connection_method='udpout', device='/dev/serial0', baud=115200, logger=True, log_connection=True, **kwargs):
        self._id = js.SIM_DRONE_ID

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

    def led_control(self, r=0, g=0, b=0):
        return bool(js.pioneer_led_control(self._id, r, g, b))

    def send_rc_channels(self, channel_1=0xFF, channel_2=0xFF, channel_3=0xFF, channel_4=0xFF, channel_5=0xFF, channel_6=0xFF, channel_7=0xFF, channel_8=0xFF):
        return True

class Camera:
    def __init__(self, timeout=0.5, ip='192.168.4.1', port=8888, video_buffer_size=65000, log_connection=True):
        self._id = js.SIM_DRONE_ID
        self._ip = ip
        self._port = port

    def connected(self):
        return bool(js.pioneer_camera_connected(self._id))

    def connect(self):
        return bool(js.pioneer_camera_connect(self._id))

    def disconnect(self):
        return bool(js.pioneer_camera_disconnect(self._id))

    def get_frame(self):
        frame = js.pioneer_camera_get_frame(self._id)
        if frame is None:
            return None
        if hasattr(frame, 'to_py'):
            frame = frame.to_py()
        return bytes(frame)

    def get_cv_frame(self):
        frame = js.pioneer_camera_get_cv_frame(self._id)
        if frame is None:
            return None
        if hasattr(frame, 'to_py'):
            return frame.to_py()
        return frame

m.Pioneer = Pioneer
m.Camera = Camera
sys.modules['pioneer_sdk'] = m
`;

export async function installPioneerSdkModule(pyodide: any) {
    if ((window as any).__pioneer_sdk_installed) return;
    installJsRuntimeAPI();
    pyodide.runPython(PIONEER_SDK_PRELUDE);
    (window as any).__pioneer_sdk_installed = true;
}
