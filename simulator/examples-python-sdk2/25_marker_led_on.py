"""Простейший вариант: метка 6 x 6 видна - светодиоды горят, метки нет - погасли.
Цвет зависит от номера метки: сменился номер - сменился цвет (палитра PALETTE ниже).

Ищутся оба семейства "6 на 6": AprilTag tag36h11 и ArUco 6x6 (DICT_6X6_250). Дрон ведёте вы, с пульта:
скрипт ничего не взлетает и не двигает, он только смотрит камерой и управляет светодиодами.

Запуск на Radxa Zero 3W:
    python3 25_marker_led_on.py
Остановка - Ctrl+C: светодиоды гаснут.
"""
from pioneer_sdk2 import Pioneer, Camera, CameraType
import cv2
import signal
import time

FAMILIES = ["DICT_APRILTAG_36h11", "DICT_6X6_250"]     # какие метки считаем "6 на 6"
CAMERA_SOURCE = "sdk2"            # "sdk2", номер устройства (0, 1 ...) или строка GStreamer
LED_IDS = (255,)                  # 255 - все светодиоды сразу
PALETTE = [                       # цвет по номеру метки: PALETTE[номер % число цветов], яркость 0..1
    (1, 0, 0),                    # 0 - красный
    (0, 1, 0),                    # 1 - зелёный
    (0, 0, 1),                    # 2 - синий
    (1, 1, 0),                    # 3 - жёлтый
    (1, 0, 1),                    # 4 - пурпурный
    (0, 1, 1),                    # 5 - голубой
    (1, 1, 1),                    # 6 - белый
]
CONFIRM_FRAMES = 2                # сколько кадров подряд метка (с тем же номером) должна быть видна, чтобы зажечь или сменить цвет
LOST_SECONDS = 0.5                # столько секунд метки нет - тогда гасим (против мерцания)
MAX_WIDTH = 960                   # кадр шире сжимается: на Radxa так быстрее

drone = None
camera_sdk = None
capture = None
detectors = []                    # (имя, детектор или None, словарь, параметры)


def stop_handler(signum, frame):
    raise KeyboardInterrupt


def open_camera():
    global camera_sdk, capture
    if CAMERA_SOURCE == "sdk2":
        camera_type = getattr(CameraType, "OPT", None) or getattr(CameraType, "MAIN", None)
        camera_sdk = Camera(camera_type=camera_type) if camera_type is not None else Camera()
    else:
        capture = cv2.VideoCapture(CAMERA_SOURCE)
        if not capture.isOpened():
            raise RuntimeError("Камера не открылась: " + str(CAMERA_SOURCE))


def grab_frame():
    if camera_sdk is not None:
        try:
            return camera_sdk.get_cv_frame(timeout=1.0)
        except TimeoutError:
            return None
    ok, frame = capture.read()
    return frame if ok else None


def make_detectors():
    for name in FAMILIES:
        dictionary = cv2.aruco.getPredefinedDictionary(getattr(cv2.aruco, name))
        if hasattr(cv2.aruco, "ArucoDetector"):
            detectors.append((name, cv2.aruco.ArucoDetector(dictionary, cv2.aruco.DetectorParameters()), dictionary, None))
        else:
            detectors.append((name, None, dictionary, cv2.aruco.DetectorParameters_create()))


def find_marker(frame):
    """Название семейства и номер найденной метки или (None, None)."""
    for name, detector, dictionary, parameters in detectors:
        if detector is not None:
            ids = detector.detectMarkers(frame)[1]
        else:
            ids = cv2.aruco.detectMarkers(frame, dictionary, parameters=parameters)[1]
        if ids is not None and len(ids) > 0:
            return name, int(ids[0][0])
    return None, None


def color_for(marker_id):
    return PALETTE[marker_id % len(PALETTE)]


def set_leds(on, marker_id=0):
    r, g, b = color_for(marker_id)
    for led in LED_IDS:
        if on:
            drone.led_control(led, r=r, g=g, b=b)
        else:
            drone.led_control(led)                      # без цвета = выключить


try:
    signal.signal(signal.SIGTERM, stop_handler)
except (ValueError, AttributeError, OSError):
    pass

drone = Pioneer()
drone.set_logger(False)
open_camera()
make_detectors()
print("Ищу метки 6 x 6 (%s): светодиоды горят, пока метка в кадре" % ", ".join(FAMILIES))

leds_on = False
shown_id = None                   # номер метки, под который сейчас выставлен цвет
candidate_id = None               # номер, который видим в последних кадрах
seen_frames = 0                   # сколько кадров подряд виден candidate_id
last_seen = 0.0

try:
    while True:
        frame = grab_frame()
        if frame is None:
            continue
        if frame.shape[1] > MAX_WIDTH:
            scale = MAX_WIDTH / frame.shape[1]
            frame = cv2.resize(frame, (MAX_WIDTH, int(frame.shape[0] * scale)))

        family, marker_id = find_marker(frame)
        now = time.monotonic()
        if family is not None:
            last_seen = now
            if marker_id == candidate_id:
                seen_frames += 1
            else:
                candidate_id = marker_id          # номер сменился: считаем кадры заново
                seen_frames = 1
            if seen_frames >= CONFIRM_FRAMES and (not leds_on or shown_id != candidate_id):
                set_leds(True, candidate_id)
                leds_on = True
                shown_id = candidate_id
                print("Метка %s номер %d: светодиоды %s" % (family, candidate_id, color_for(candidate_id)))
        else:
            seen_frames = 0
            candidate_id = None
            if leds_on and now - last_seen > LOST_SECONDS:
                set_leds(False)
                leds_on = False
                shown_id = None
                print("Метки нет: светодиоды погашены")
except KeyboardInterrupt:
    pass
finally:
    set_leds(False)
    if camera_sdk is not None:
        camera_sdk.stop()
    if capture is not None:
        capture.release()
    drone.close_connection()
