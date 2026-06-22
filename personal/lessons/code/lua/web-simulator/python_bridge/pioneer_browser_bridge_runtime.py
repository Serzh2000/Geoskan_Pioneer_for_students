"""Runtime patch that mirrors pioneer_sdk commands into the web simulator."""

from __future__ import annotations

import json
import os
import time
import base64
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
    "port": 8888,
    "timeout": 0.5,
    "video_buffer_size": 65000,
    "log_connection": True,
    "mavlink_port": 8001,
    "connection_method": "udpout",
}


def _candidate_bridge_urls() -> list[str]:
    if _CONFIGURED_BRIDGE_URL:
        return [_CONFIGURED_BRIDGE_URL]

    if _resolved_bridge_url:
        return [_resolved_bridge_url, *[url for url in DEFAULT_BRIDGE_URLS if url != _resolved_bridge_url]]

    return DEFAULT_BRIDGE_URLS


def _bridge_state_url_from_event_url(bridge_url: str) -> str:
    if bridge_url.endswith(BRIDGE_PATH):
        return f"{bridge_url[:-len(BRIDGE_PATH)]}{BRIDGE_STATE_PATH}"

    return bridge_url.rstrip("/")


def _candidate_bridge_state_urls() -> list[str]:
    return [_bridge_state_url_from_event_url(url) for url in _candidate_bridge_urls()]


def _resolve_connection_settings(args: tuple[Any, ...], kwargs: dict[str, Any]) -> dict[str, Any]:
    resolved = dict(_PIONEER_CONNECTION_DEFAULTS)
    for index, value in enumerate(args):
        if index >= len(_PIONEER_INIT_KEYS):
            break
        resolved[_PIONEER_INIT_KEYS[index]] = value
    resolved.update(kwargs)
    return resolved


def _resolve_camera_connection_settings(args: tuple[Any, ...], kwargs: dict[str, Any]) -> dict[str, Any]:
    resolved = dict(_CAMERA_CONNECTION_DEFAULTS)
    for index, value in enumerate(args):
        if index >= len(_CAMERA_INIT_KEYS):
            break
        resolved[_CAMERA_INIT_KEYS[index]] = value
    resolved.update(kwargs)
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


def _build_bridge_payload(connection: dict[str, Any], method: str, args: tuple[Any, ...], kwargs: dict[str, Any]) -> dict[str, Any]:
    return {
        "sessionId": SESSION_ID,
        "droneName": str(connection.get("name", "pioneer") or "pioneer"),
        "droneIp": str(connection.get("ip", "") or ""),
        "mavlinkPort": int(connection.get("mavlink_port", _PIONEER_CONNECTION_DEFAULTS["mavlink_port"])),
        "connectionMethod": str(connection.get("connection_method", _PIONEER_CONNECTION_DEFAULTS["connection_method"]) or "udpout"),
        "device": str(connection.get("device", _PIONEER_CONNECTION_DEFAULTS["device"]) or ""),
        "baud": int(connection.get("baud", _PIONEER_CONNECTION_DEFAULTS["baud"])),
        "method": method,
        "args": list(args),
        "kwargs": kwargs,
    }


def _report_debug(hypothesis_id: str, location: str, message: str, data: dict[str, Any]) -> None:
    # #region debug-point sdk-ports-python
    try:
        debug_url = os.environ.get("DEBUG_SERVER_URL", "http://127.0.0.1:7777/event")
        debug_payload = {
            "sessionId": os.environ.get("DEBUG_SESSION_ID", "pioneer-sdk-ports"),
            "runId": os.environ.get("DEBUG_RUN_ID", "pre-fix"),
            "hypothesisId": hypothesis_id,
            "location": location,
            "msg": message,
            "data": data,
        }
        debug_request = urllib.request.Request(
            debug_url,
            data=json.dumps(debug_payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(debug_request, timeout=0.2):
            pass
    except Exception:
        pass
    # #endregion


def _safe_post_bridge_event(connection: dict[str, Any], method: str, args: tuple[Any, ...], kwargs: dict[str, Any]) -> None:
    payload = _build_bridge_payload(connection, method, args, kwargs)
    encoded = json.dumps(payload).encode("utf-8")
    global _resolved_bridge_url
    _report_debug(
        "H1",
        "python_bridge/pioneer_browser_bridge_runtime.py:_safe_post_bridge_event",
        "Preparing mirrored browser bridge event payload",
        {
            "method": method,
            "payload": payload,
            "candidateBridgeUrls": _candidate_bridge_urls(),
        },
    )

    with _post_lock:
        for bridge_url in _candidate_bridge_urls():
            request = urllib.request.Request(
                bridge_url,
                data=encoded,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            try:
                with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS):
                    pass
                _resolved_bridge_url = bridge_url
                return
            except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError, ValueError):
                continue


def _safe_post_event(instance: Any, method: str, args: tuple[Any, ...], kwargs: dict[str, Any]) -> None:
    _safe_post_bridge_event(_get_connection_settings(instance), method, args, kwargs)


def _safe_get_external_state(instance: Any) -> dict[str, Any] | None:
    connection = _get_connection_settings(instance)
    query = urllib.parse.urlencode(
        {
            "sessionId": SESSION_ID,
            "droneIp": str(connection.get("ip", "") or ""),
            "mavlinkPort": int(connection.get("mavlink_port", _PIONEER_CONNECTION_DEFAULTS["mavlink_port"])),
            "connectionMethod": str(connection.get("connection_method", _PIONEER_CONNECTION_DEFAULTS["connection_method"]) or "udpout"),
        }
    )

    for state_url in _candidate_bridge_state_urls():
        request = urllib.request.Request(f"{state_url}?{query}", method="GET")
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
                payload = json.loads(response.read().decode("utf-8"))
            if payload.get("ok") is True:
                return payload
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError):
            continue

    return None


def _summarize_camera_result(result: Any) -> dict[str, Any]:
    summary: dict[str, Any] = {
        "type": type(result).__name__ if result is not None else "NoneType",
        "isNone": result is None,
    }
    if isinstance(result, (bytes, bytearray)):
        summary["length"] = len(result)
    elif isinstance(result, dict):
        summary["keys"] = sorted(str(key) for key in result.keys())[:20]
    else:
        payload = getattr(result, "payload", None)
        if isinstance(payload, dict):
            summary["payloadKeys"] = sorted(str(key) for key in payload.keys())[:20]
        shape = getattr(result, "shape", None)
        if shape is not None:
            summary["shape"] = list(shape) if isinstance(shape, tuple) else shape
    return summary


def _decode_data_url_bytes(data_url: str | None) -> bytes | None:
    if not data_url or "," not in data_url:
        return None
    try:
        return base64.b64decode(data_url.split(",", 1)[1])
    except Exception:
        return None


def _poll_external_camera_state(connection: dict[str, Any], attempts: int = 8, delay_seconds: float = 0.05) -> dict[str, Any] | None:
    for attempt in range(attempts):
        state = _safe_get_external_state(type("_CameraStateProxy", (), {"_browser_bridge_connection": connection})())
        if state and (state.get("cameraConnected") or state.get("cameraFrameDataUrl")):
            return state
        if attempt + 1 < attempts:
            time.sleep(delay_seconds)
    return _safe_get_external_state(type("_CameraStateProxy", (), {"_browser_bridge_connection": connection})())


def _build_browser_mirrored_pioneer(original_class: type) -> type:
    class BrowserMirroredPioneer(original_class):  # type: ignore[misc, valid-type]
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            connection = _resolve_connection_settings(args, kwargs)
            self._browser_bridge_connection = connection
            self.name = connection["name"]
            self.ip = connection["ip"]
            self.mavlink_port = connection["mavlink_port"]
            self.connection_method = connection["connection_method"]
            self.device = connection["device"]
            self.baud = connection["baud"]
            self._browser_bridge_point_reached_seen = False
            super().__init__(*args, **kwargs)
            _safe_post_event(self, "__init__", args, kwargs)

        def arm(self, *args: Any, **kwargs: Any):
            result = super().arm(*args, **kwargs)
            _safe_post_event(self, "arm", args, kwargs)
            return result

        def disarm(self, *args: Any, **kwargs: Any):
            result = super().disarm(*args, **kwargs)
            _safe_post_event(self, "disarm", args, kwargs)
            return result

        def takeoff(self, *args: Any, **kwargs: Any):
            result = super().takeoff(*args, **kwargs)
            _safe_post_event(self, "takeoff", args, kwargs)
            return result

        def land(self, *args: Any, **kwargs: Any):
            result = super().land(*args, **kwargs)
            _safe_post_event(self, "land", args, kwargs)
            return result

        def go_to_local_point(self, *args: Any, **kwargs: Any):
            result = super().go_to_local_point(*args, **kwargs)
            self._browser_bridge_point_reached_seen = False
            _safe_post_event(self, "go_to_local_point", args, kwargs)
            return result

        def go_to_local_point_body_fixed(self, *args: Any, **kwargs: Any):
            result = super().go_to_local_point_body_fixed(*args, **kwargs)
            self._browser_bridge_point_reached_seen = False
            _safe_post_event(self, "go_to_local_point_body_fixed", args, kwargs)
            return result

        def point_reached(self, *args: Any, **kwargs: Any):
            state = _safe_get_external_state(self)
            if state is not None:
                point_reached = bool(state.get("pointReached"))
                if not point_reached:
                    self._browser_bridge_point_reached_seen = False
                    return False
                if getattr(self, "_browser_bridge_point_reached_seen", False):
                    return False

                self._browser_bridge_point_reached_seen = True
                return True

            return super().point_reached(*args, **kwargs)

        def set_manual_speed(self, *args: Any, **kwargs: Any):
            result = super().set_manual_speed(*args, **kwargs)
            _safe_post_event(self, "set_manual_speed", args, kwargs)
            return result

        def set_manual_speed_body_fixed(self, *args: Any, **kwargs: Any):
            result = super().set_manual_speed_body_fixed(*args, **kwargs)
            _safe_post_event(self, "set_manual_speed_body_fixed", args, kwargs)
            return result

        def led_control(self, *args: Any, **kwargs: Any):
            result = super().led_control(*args, **kwargs)
            _safe_post_event(self, "led_control", args, kwargs)
            return result

        def send_rc_channels(self, *args: Any, **kwargs: Any):
            result = super().send_rc_channels(*args, **kwargs)
            _safe_post_event(self, "send_rc_channels", args, kwargs)
            return result

        def lua_script_control(self, *args: Any, **kwargs: Any):
            result = super().lua_script_control(*args, **kwargs)
            _safe_post_event(self, "lua_script_control", args, kwargs)
            return result

        def close_connection(self, *args: Any, **kwargs: Any):
            try:
                result = super().close_connection(*args, **kwargs)
            finally:
                _safe_post_event(self, "close_connection", args, kwargs)
            return result

    BrowserMirroredPioneer.__name__ = original_class.__name__
    BrowserMirroredPioneer.__qualname__ = original_class.__qualname__
    BrowserMirroredPioneer.__module__ = original_class.__module__
    return BrowserMirroredPioneer


def _build_browser_mirrored_camera(original_class: type) -> type:
    class BrowserMirroredCamera:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            connection = _resolve_camera_connection_settings(args, kwargs)
            self._browser_bridge_connection = connection
            self.ip = connection["ip"]
            self.port = connection["port"]
            self.timeout = connection["timeout"]
            self.VIDEO_BUFFER_SIZE = connection["video_buffer_size"]
            self.log_connection = connection["log_connection"]
            self.connected = False
            _report_debug(
                "H1",
                "python_bridge/pioneer_browser_bridge_runtime.py:Camera.__init__",
                "External Python instantiated pioneer_sdk.Camera",
                {
                    "args": list(args),
                    "kwargs": kwargs,
                    "resolvedConnection": connection,
                },
            )
            self.connect()

        def connect(self, *args: Any, **kwargs: Any):
            _safe_post_bridge_event(self._browser_bridge_connection, "camera_connect", args, kwargs)
            state = _poll_external_camera_state(self._browser_bridge_connection)
            self.connected = bool(state.get("cameraConnected")) if state else False
            _report_debug(
                "H2",
                "python_bridge/pioneer_browser_bridge_runtime.py:Camera.connect",
                "External Python called Camera.connect()",
                {
                    "connected": self.connected,
                    "hasFrame": bool(state and state.get("cameraFrameDataUrl")),
                },
            )
            return self.connected

        def disconnect(self, *args: Any, **kwargs: Any):
            _safe_post_bridge_event(self._browser_bridge_connection, "camera_disconnect", args, kwargs)
            self.connected = False
            _report_debug(
                "H2",
                "python_bridge/pioneer_browser_bridge_runtime.py:Camera.disconnect",
                "External Python called Camera.disconnect()",
                {
                    "connected": self.connected,
                },
            )
            return True

        def get_frame(self, *args: Any, **kwargs: Any):
            state = _poll_external_camera_state(self._browser_bridge_connection)
            self.connected = bool(state.get("cameraConnected")) if state else False
            result = _decode_data_url_bytes(state.get("cameraFrameDataUrl") if state else None)
            _report_debug(
                "H4",
                "python_bridge/pioneer_browser_bridge_runtime.py:Camera.get_frame",
                "External Python called Camera.get_frame()",
                _summarize_camera_result(result),
            )
            return result

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
            _report_debug(
                "H5",
                "python_bridge/pioneer_browser_bridge_runtime.py:Camera.get_cv_frame",
                "External Python called Camera.get_cv_frame()",
                _summarize_camera_result(result),
            )
            return result

    BrowserMirroredCamera.__name__ = original_class.__name__
    BrowserMirroredCamera.__qualname__ = original_class.__qualname__
    BrowserMirroredCamera.__module__ = original_class.__module__
    return BrowserMirroredCamera


def patch_pioneer_sdk_module(module: Any) -> None:
    original_class = getattr(module, "Pioneer", None)
    original_camera_class = getattr(module, "Camera", None)
    if original_class is None and original_camera_class is None:
        return

    _report_debug(
        "H1",
        "python_bridge/pioneer_browser_bridge_runtime.py:patch_pioneer_sdk_module",
        "Patching pioneer_sdk module for browser bridge",
        {
            "hasPioneer": original_class is not None,
            "hasCamera": getattr(module, "Camera", None) is not None,
            "module": getattr(module, "__name__", "pioneer_sdk"),
        },
    )
    if original_class is not None and not getattr(module, PATCH_MARKER, False):
        setattr(module, ORIGINAL_MARKER, original_class)
        setattr(module, "Pioneer", _build_browser_mirrored_pioneer(original_class))
        setattr(module, PATCH_MARKER, True)
    if original_camera_class is not None and not getattr(module, CAMERA_PATCH_MARKER, False):
        setattr(module, CAMERA_ORIGINAL_MARKER, original_camera_class)
        setattr(module, "Camera", _build_browser_mirrored_camera(original_camera_class))
        setattr(module, CAMERA_PATCH_MARKER, True)
