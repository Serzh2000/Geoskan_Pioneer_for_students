"""Runtime patch that mirrors pioneer_sdk commands into the web simulator.

Which transport a Pioneer/Camera object gets is decided when it is created:

* ``ip`` is a URL (``Pioneer(ip="https://simulator.example.org")``) - every
  command and camera frame goes over HTTP(S) to that simulator. This is the
  way to reach a simulator on another machine: it passes home routers,
  school proxies and firewalls, unlike the drone's own UDP camera protocol.
* ``PIONEER_BROWSER_BRIDGE_URL`` is set - the same, to that URL.
* otherwise, if a simulator answers on this computer (localhost:3000/3001/
  1234) - mirror into it, as the IDLE integration always did;
* otherwise - the real, unpatched pioneer_sdk: a real drone keeps working
  with this hook installed.
"""

from __future__ import annotations

import json
import os
import base64
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
import uuid
from typing import Any


BRIDGE_PATH = "/api/external-python-bridge/event"
BRIDGE_STATE_PATH = "/api/external-python-bridge/state"
_CONFIGURED_BRIDGE_URL = os.environ.get("PIONEER_BROWSER_BRIDGE_URL", "").strip()
DEFAULT_BRIDGE_URLS = [
    f"http://127.0.0.1:{port}{BRIDGE_PATH}"
    for port in (3000, 3001, 1234)
] + [
    f"http://localhost:{port}{BRIDGE_PATH}"
    for port in (3000, 3001, 1234)
]
SESSION_ID = os.environ.get("PIONEER_BROWSER_BRIDGE_SESSION_ID", uuid.uuid4().hex)
TIMEOUT_SECONDS = float(os.environ.get("PIONEER_BROWSER_BRIDGE_TIMEOUT", "0.35"))
# A simulator on another machine is behind TLS and the internet: a command
# lost to a 0.35 s timeout would be a silently skipped arm()/takeoff().
REMOTE_POST_TIMEOUT_SECONDS = float(os.environ.get("PIONEER_BROWSER_BRIDGE_REMOTE_TIMEOUT", "5"))
REMOTE_GET_TIMEOUT_SECONDS = float(os.environ.get("PIONEER_BROWSER_BRIDGE_REMOTE_STATE_TIMEOUT", "3"))
# In URL mode the commands are meant for "the simulator's drone": they carry
# the default simulator address, which every simulated drone matches.
SIMULATOR_DRONE_IP = "127.0.0.1"
_warned_unreachable: set[str] = set()
_local_bridge_available: bool | None = None
PATCH_MARKER = "__pioneer_browser_bridge_patched__"
ORIGINAL_MARKER = "__pioneer_browser_bridge_original_pioneer__"
CAMERA_PATCH_MARKER = "__pioneer_browser_bridge_camera_patched__"
CAMERA_ORIGINAL_MARKER = "__pioneer_browser_bridge_original_camera__"
_post_lock = threading.Lock()
_resolved_bridge_url = _CONFIGURED_BRIDGE_URL or None
_PIONEER_INIT_KEYS = [
    "name",
    "ip",
    "mavlink_port",
    "connection_method",
    "device",
    "baud",
    "logger",
    "log_connection",
]
_PIONEER_CONNECTION_DEFAULTS = {
    "name": "pioneer",
    "ip": "192.168.4.1",
    "mavlink_port": 8001,
    "connection_method": "udpout",
    "device": "/dev/serial0",
    "baud": 115200,
    "logger": True,
    "log_connection": True,
}
_CAMERA_INIT_KEYS = [
    "timeout",
    "ip",
    "port",
    "video_buffer_size",
    "log_connection",
    "mavlink_port",
    "connection_method",
]
_CAMERA_CONNECTION_DEFAULTS = {
    "name": "pioneer",
    "ip": "192.168.4.1",
    "port": 18001,
    "timeout": 0.5,
    "video_buffer_size": 65000,
    "log_connection": True,
    "mavlink_port": 8001,
    "connection_method": "udpout",
}


def bridge_base_from_ip(ip: Any) -> str | None:
    """``https://host[:port][/path]`` in ``ip`` -> that simulator's base URL."""
    if not isinstance(ip, str):
        return None
    value = ip.strip()
    if not value.lower().startswith(("http://", "https://")):
        return None
    parsed = urllib.parse.urlsplit(value)
    if not parsed.netloc:
        return None
    path = parsed.path.rstrip("/")
    # Someone may paste the full endpoint instead of the site address.
    for suffix in (BRIDGE_PATH, BRIDGE_STATE_PATH):
        if path.endswith(suffix):
            path = path[: -len(suffix)]
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, path, "", "")).rstrip("/")


def _warn_unreachable(base: str, error: BaseException) -> None:
    if base in _warned_unreachable:
        return
    _warned_unreachable.add(base)
    reason = getattr(error, "reason", None) or error
    hint = ""
    if urllib.parse.urlsplit(base).port is not None:
        hint = " Обычно адрес симулятора указывается без порта, как в адресной строке браузера."
    print(
        f"[pioneer-sim] Не удаётся связаться с симулятором {base}: {reason}.{hint}",
        file=sys.stderr,
        flush=True,
    )


def _candidate_bridge_urls(connection: dict[str, Any] | None = None) -> list[str]:
    base = (connection or {}).get("bridge_base")
    if base:
        return [f"{base}{BRIDGE_PATH}"]

    if _CONFIGURED_BRIDGE_URL:
        return [_CONFIGURED_BRIDGE_URL]

    if _resolved_bridge_url:
        return [_resolved_bridge_url, *[url for url in DEFAULT_BRIDGE_URLS if url != _resolved_bridge_url]]

    return DEFAULT_BRIDGE_URLS


def _bridge_state_url_from_event_url(bridge_url: str) -> str:
    if bridge_url.endswith(BRIDGE_PATH):
        return f"{bridge_url[:-len(BRIDGE_PATH)]}{BRIDGE_STATE_PATH}"

    return bridge_url.rstrip("/")


def _candidate_bridge_state_urls(connection: dict[str, Any] | None = None) -> list[str]:
    return [_bridge_state_url_from_event_url(url) for url in _candidate_bridge_urls(connection)]


def _is_local_bridge_available() -> bool:
    """Is a simulator listening on this computer? Checked once per process."""
    global _local_bridge_available
    if _local_bridge_available is None:
        _local_bridge_available = False
        for state_url in _candidate_bridge_state_urls():
            query = urllib.parse.urlencode({"sessionId": SESSION_ID})
            try:
                with urllib.request.urlopen(f"{state_url}?{query}", timeout=TIMEOUT_SECONDS) as response:
                    if json.loads(response.read().decode("utf-8")).get("ok") is True:
                        _local_bridge_available = True
                        break
            except (urllib.error.URLError, TimeoutError, OSError, ValueError):
                continue
    return _local_bridge_available


def _should_use_bridge(ip: Any) -> bool:
    return bool(bridge_base_from_ip(ip) or _CONFIGURED_BRIDGE_URL or _is_local_bridge_available())


def _resolve_connection_settings(args: tuple[Any, ...], kwargs: dict[str, Any]) -> dict[str, Any]:
    resolved = dict(_PIONEER_CONNECTION_DEFAULTS)
    for index, value in enumerate(args):
        if index >= len(_PIONEER_INIT_KEYS):
            break
        resolved[_PIONEER_INIT_KEYS[index]] = value
    resolved.update(kwargs)
    resolved["bridge_base"] = bridge_base_from_ip(resolved.get("ip"))
    return resolved


def _resolve_camera_connection_settings(args: tuple[Any, ...], kwargs: dict[str, Any]) -> dict[str, Any]:
    resolved = dict(_CAMERA_CONNECTION_DEFAULTS)
    for index, value in enumerate(args):
        if index >= len(_CAMERA_INIT_KEYS):
            break
        resolved[_CAMERA_INIT_KEYS[index]] = value
    resolved.update(kwargs)
    resolved["bridge_port"] = int(resolved.get("port", _CAMERA_CONNECTION_DEFAULTS["port"]))
    resolved["bridge_connection_method"] = "camera"
    resolved["bridge_base"] = bridge_base_from_ip(resolved.get("ip"))
    return resolved


def _get_connection_settings(instance: Any) -> dict[str, Any]:
    stored = getattr(instance, "_browser_bridge_connection", None)
    if isinstance(stored, dict):
        return stored

    return {
        "name": getattr(instance, "name", _PIONEER_CONNECTION_DEFAULTS["name"]),
        "ip": getattr(instance, "ip", _PIONEER_CONNECTION_DEFAULTS["ip"]),
        "mavlink_port": getattr(instance, "mavlink_port", _PIONEER_CONNECTION_DEFAULTS["mavlink_port"]),
        "connection_method": getattr(instance, "connection_method", _PIONEER_CONNECTION_DEFAULTS["connection_method"]),
        "device": getattr(instance, "device", _PIONEER_CONNECTION_DEFAULTS["device"]),
        "baud": getattr(instance, "baud", _PIONEER_CONNECTION_DEFAULTS["baud"]),
        "logger": getattr(instance, "logger", _PIONEER_CONNECTION_DEFAULTS["logger"]),
        "log_connection": getattr(instance, "log_connection", _PIONEER_CONNECTION_DEFAULTS["log_connection"]),
    }


def _payload_drone_ip(connection: dict[str, Any]) -> str:
    # The URL addresses the simulator, not a drone inside it.
    if connection.get("bridge_base"):
        return SIMULATOR_DRONE_IP
    return str(connection.get("ip", "") or "")


def _timeouts(connection: dict[str, Any]) -> tuple[float, float]:
    """(POST, GET) timeouts: generous for a simulator across the internet."""
    if connection.get("bridge_base") or _CONFIGURED_BRIDGE_URL.startswith("https://"):
        return REMOTE_POST_TIMEOUT_SECONDS, REMOTE_GET_TIMEOUT_SECONDS
    return TIMEOUT_SECONDS, TIMEOUT_SECONDS


def _build_bridge_payload(connection: dict[str, Any], method: str, args: tuple[Any, ...], kwargs: dict[str, Any]) -> dict[str, Any]:
    bridge_port = int(connection.get("bridge_port", connection.get("mavlink_port", _PIONEER_CONNECTION_DEFAULTS["mavlink_port"])))
    bridge_connection_method = str(connection.get("bridge_connection_method", connection.get("connection_method", _PIONEER_CONNECTION_DEFAULTS["connection_method"])) or "udpout")
    return {
        "sessionId": SESSION_ID,
        "droneName": str(connection.get("name", "pioneer") or "pioneer"),
        "droneIp": _payload_drone_ip(connection),
        "mavlinkPort": bridge_port,
        "connectionMethod": bridge_connection_method,
        "device": str(connection.get("device", _PIONEER_CONNECTION_DEFAULTS["device"]) or ""),
        "baud": int(connection.get("baud", _PIONEER_CONNECTION_DEFAULTS["baud"])),
        "method": method,
        "args": list(args),
        "kwargs": kwargs,
    }


def _safe_post_bridge_event(connection: dict[str, Any], method: str, args: tuple[Any, ...], kwargs: dict[str, Any]) -> None:
    payload = _build_bridge_payload(connection, method, args, kwargs)
    encoded = json.dumps(payload, default=str).encode("utf-8")
    post_timeout, _ = _timeouts(connection)
    global _resolved_bridge_url
    with _post_lock:
        last_error: BaseException | None = None
        for bridge_url in _candidate_bridge_urls(connection):
            request = urllib.request.Request(
                bridge_url,
                data=encoded,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            try:
                with urllib.request.urlopen(request, timeout=post_timeout):
                    pass
                if not connection.get("bridge_base"):
                    _resolved_bridge_url = bridge_url
                return
            except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError, ValueError) as error:
                last_error = error
                continue
        # A simulator the script names explicitly must not fail silently.
        base = connection.get("bridge_base")
        if base and last_error is not None:
            _warn_unreachable(base, last_error)


def _safe_post_event(instance: Any, method: str, args: tuple[Any, ...], kwargs: dict[str, Any]) -> None:
    _safe_post_bridge_event(_get_connection_settings(instance), method, args, kwargs)


def _safe_get_external_state(instance: Any) -> dict[str, Any] | None:
    connection = _get_connection_settings(instance)
    bridge_port = int(connection.get("bridge_port", connection.get("mavlink_port", _PIONEER_CONNECTION_DEFAULTS["mavlink_port"])))
    bridge_connection_method = str(connection.get("bridge_connection_method", connection.get("connection_method", _PIONEER_CONNECTION_DEFAULTS["connection_method"])) or "udpout")
    query = urllib.parse.urlencode(
        {
            "sessionId": SESSION_ID,
            "droneIp": _payload_drone_ip(connection),
            "mavlinkPort": bridge_port,
            "connectionMethod": bridge_connection_method,
        }
    )
    _, get_timeout = _timeouts(connection)

    last_error: BaseException | None = None
    for state_url in _candidate_bridge_state_urls(connection):
        request = urllib.request.Request(f"{state_url}?{query}", method="GET")
        try:
            with urllib.request.urlopen(request, timeout=get_timeout) as response:
                payload = json.loads(response.read().decode("utf-8"))
            if payload.get("ok") is True:
                return payload
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError) as error:
            last_error = error
            continue

    base = connection.get("bridge_base")
    if base and last_error is not None:
        _warn_unreachable(base, last_error)
    return None


def _decode_data_url_bytes(data_url: str | None) -> bytes | None:
    if not data_url or "," not in data_url:
        return None
    try:
        return base64.b64decode(data_url.split(",", 1)[1])
    except Exception:
        return None


def _poll_external_camera_state(connection: dict[str, Any], attempts: int = 1) -> dict[str, Any] | None:
    return _safe_get_external_state(type("_CameraStateProxy", (), {"_browser_bridge_connection": connection})())


def _is_point_reached_from_autopilot_state(autopilot_state: str | None, point_reached: bool | None) -> bool:
    if autopilot_state is None:
        return False

    if autopilot_state in ("TAKEOFF", "MISSION", "LANDING") and bool(point_reached):
        return True

    return False


def _build_browser_mirrored_pioneer(original_class: type) -> type:
    class BrowserMirroredPioneer(original_class):  # type: ignore[misc, valid-type]
        def __new__(cls, *args: Any, **kwargs: Any):
            if not _should_use_bridge(_resolve_connection_settings(args, kwargs).get("ip")):
                # No simulator to mirror into: a real drone over real MAVLink.
                return original_class(*args, **kwargs)
            return object.__new__(cls)

        def __init__(self, *args: Any, **kwargs: Any) -> None:
            connection = _resolve_connection_settings(args, kwargs)
            self._browser_bridge_connection = connection
            self.name = connection["name"]
            self.ip = connection["ip"]
            self.mavlink_port = connection["mavlink_port"]
            self.connection_method = connection["connection_method"]
            self.device = connection["device"]
            self.baud = connection["baud"]
            self.logger = connection["logger"]
            self.log_connection = connection["log_connection"]
            self._logger = self.logger
            self._log_connection = self.log_connection
            self._last_point_reached_state = False
            _safe_post_event(self, "__init__", args, kwargs)

        def arm(self, *args: Any, **kwargs: Any):
            _safe_post_event(self, "arm", args, kwargs)
            return True

        def disarm(self, *args: Any, **kwargs: Any):
            _safe_post_event(self, "disarm", args, kwargs)
            return True

        def takeoff(self, *args: Any, **kwargs: Any):
            self._last_point_reached_state = False
            _safe_post_event(self, "takeoff", args, kwargs)
            return True

        def land(self, *args: Any, **kwargs: Any):
            _safe_post_event(self, "land", args, kwargs)
            return True

        def go_to_local_point(self, *args: Any, **kwargs: Any):
            self._last_point_reached_state = False
            _safe_post_event(self, "go_to_local_point", args, kwargs)
            return True

        def go_to_local_point_body_fixed(self, *args: Any, **kwargs: Any):
            self._last_point_reached_state = False
            _safe_post_event(self, "go_to_local_point_body_fixed", args, kwargs)
            return True

        def point_reached(self, *args: Any, **kwargs: Any):
            state = _safe_get_external_state(self)
            if state is not None:
                point_reached = _is_point_reached_from_autopilot_state(
                    state.get("autopilotState"),
                    state.get("pointReached"),
                )

                if point_reached and not getattr(self, "_last_point_reached_state", False):
                    self._last_point_reached_state = True
                    return True

                self._last_point_reached_state = point_reached
                return point_reached

            return False

        def set_manual_speed(self, *args: Any, **kwargs: Any):
            _safe_post_event(self, "set_manual_speed", args, kwargs)
            return True

        def set_manual_speed_body_fixed(self, *args: Any, **kwargs: Any):
            _safe_post_event(self, "set_manual_speed_body_fixed", args, kwargs)
            return True

        def led_control(self, *args: Any, **kwargs: Any):
            _safe_post_event(self, "led_control", args, kwargs)
            return True

        def send_rc_channels(self, *args: Any, **kwargs: Any):
            _safe_post_event(self, "send_rc_channels", args, kwargs)
            return True

        def lua_script_control(self, *args: Any, **kwargs: Any):
            _safe_post_event(self, "lua_script_control", args, kwargs)
            return True

        def get_local_position_lps(self, *args: Any, **kwargs: Any):
            state = _safe_get_external_state(self)
            position = state.get("localPosition") if state else None
            if isinstance(position, dict):
                return [position.get("x", 0.0), position.get("y", 0.0), position.get("z", 0.0)]
            return [0.0, 0.0, 0.0]

        def get_autopilot_state(self, *args: Any, **kwargs: Any):
            state = _safe_get_external_state(self)
            return state.get("autopilotState") if state else None

        def close_connection(self, *args: Any, **kwargs: Any):
            _safe_post_event(self, "close_connection", args, kwargs)
            return True

    BrowserMirroredPioneer.__name__ = original_class.__name__
    BrowserMirroredPioneer.__qualname__ = original_class.__qualname__
    BrowserMirroredPioneer.__module__ = original_class.__module__
    return BrowserMirroredPioneer


def _build_browser_mirrored_camera(original_class: type) -> type:
    class BrowserMirroredCamera:
        def __new__(cls, *args: Any, **kwargs: Any):
            if not _should_use_bridge(_resolve_camera_connection_settings(args, kwargs).get("ip")):
                return original_class(*args, **kwargs)
            return object.__new__(cls)

        def __init__(self, *args: Any, **kwargs: Any) -> None:
            connection = _resolve_camera_connection_settings(args, kwargs)
            self._browser_bridge_connection = connection
            self.ip = connection["ip"]
            self.port = connection["port"]
            self.timeout = connection["timeout"]
            self.VIDEO_BUFFER_SIZE = connection["video_buffer_size"]
            self.log_connection = connection["log_connection"]
            self._connected = False
            self.connect()

        def connect(self, *args: Any, **kwargs: Any):
            _safe_post_bridge_event(self._browser_bridge_connection, "camera_connect", args, kwargs)
            state = _poll_external_camera_state(self._browser_bridge_connection)
            self._connected = bool(state.get("cameraConnected")) if state else False
            return self._connected

        def disconnect(self, *args: Any, **kwargs: Any):
            _safe_post_bridge_event(self._browser_bridge_connection, "camera_disconnect", args, kwargs)
            self._connected = False
            return True

        def connected(self):
            return self._connected

        def get_frame(self, *args: Any, **kwargs: Any):
            state = _poll_external_camera_state(self._browser_bridge_connection)
            self._connected = bool(state.get("cameraConnected")) if state else False
            return _decode_data_url_bytes(state.get("cameraFrameDataUrl") if state else None)

        def get_cv_frame(self, *args: Any, **kwargs: Any):
            raw_bytes = self.get_frame(*args, **kwargs)
            result: Any = None
            if raw_bytes:
                try:
                    import cv2  # type: ignore
                    import numpy as np  # type: ignore

                    buffer = np.frombuffer(raw_bytes, dtype=np.uint8)
                    result = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
                except Exception:
                    result = raw_bytes
            return result

    BrowserMirroredCamera.__name__ = original_class.__name__
    BrowserMirroredCamera.__qualname__ = original_class.__qualname__
    BrowserMirroredCamera.__module__ = original_class.__module__
    return BrowserMirroredCamera


def _build_browser_mirrored_video_stream(camera_class: type, original_class: type | None) -> type:
    class BrowserMirroredVideoStream:
        def __new__(cls, *args: Any, **kwargs: Any):
            # The real VideoStream takes no address: bridge only if configured or local.
            if original_class is not None and not _should_use_bridge(kwargs.get("ip")):
                return original_class(*args, **kwargs)
            return object.__new__(cls)

        def __init__(self, *args: Any, **kwargs: Any) -> None:
            self.camera = camera_class(*args, **kwargs)
            self.running = False

        def start(self, *args: Any, **kwargs: Any):
            self.running = True
            return self.camera.connect(*args, **kwargs)

        def stop(self, *args: Any, **kwargs: Any):
            self.running = False
            return self.camera.disconnect(*args, **kwargs)

        def connected(self):
            return self.camera.connected()

    if original_class is not None:
        BrowserMirroredVideoStream.__name__ = original_class.__name__
        BrowserMirroredVideoStream.__qualname__ = original_class.__qualname__
        BrowserMirroredVideoStream.__module__ = original_class.__module__
    else:
        BrowserMirroredVideoStream.__name__ = "VideoStream"
        BrowserMirroredVideoStream.__qualname__ = "VideoStream"
    return BrowserMirroredVideoStream


def patch_pioneer_sdk_module(module: Any) -> None:
    original_class = getattr(module, "Pioneer", None)
    original_camera_class = getattr(module, "Camera", None)
    original_video_stream_class = getattr(module, "VideoStream", None)
    if original_class is None and original_camera_class is None and original_video_stream_class is None:
        return

    if original_class is not None and not getattr(module, PATCH_MARKER, False):
        setattr(module, ORIGINAL_MARKER, original_class)
        setattr(module, "Pioneer", _build_browser_mirrored_pioneer(original_class))
        setattr(module, PATCH_MARKER, True)
    if original_camera_class is not None and not getattr(module, CAMERA_PATCH_MARKER, False):
        setattr(module, CAMERA_ORIGINAL_MARKER, original_camera_class)
        browser_camera_class = _build_browser_mirrored_camera(original_camera_class)
        setattr(module, "Camera", browser_camera_class)
        setattr(module, "VideoStream", _build_browser_mirrored_video_stream(browser_camera_class, original_video_stream_class))
        setattr(module, CAMERA_PATCH_MARKER, True)
