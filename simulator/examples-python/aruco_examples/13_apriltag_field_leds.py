"""Поле AprilTag 12 x 12 (семейство tag36h11, 6 x 6 ячеек): светодиоды показывают, какую метку видит дрон.

Python-программа работает на вашем компьютере и общается с дроном по Wi-Fi через модуль ESP32 (pioneer_sdk):
подключитесь к сети дрона (Pioneer_...) и запустите
    python 13_apriltag_field_leds.py

Дрон ведёте вы - с настоящего пульта. Программа ничего не взлетает, не шлёт команд полёта и не двигает дрон:
она только смотрит камерой ESP32 (OV2640) и управляет светодиодами.

  * метка появилась в кадре - все светодиоды загораются цветом этой метки;
  * метка вышла из кадра - светодиоды остаются цвета последней метки;
  * другая метка - другой цвет (палитра из 8 цветов, цвет предыдущей метки не повторяется).

Камера ESP32 смотрит ВПЕРЁД (с небольшим наклоном вниз, около 6 градусов), а не вниз. Поэтому светодиоды показывают
ближайшую метку перед носом дрона, а не ту, что точно под ним. Метки на полу камера видит, начиная с расстояния
примерно в высоту полёта: на высоте 1 м - с 1 м до нескольких метров. Угол обзора камеры 56 x 44 градуса,
кадр 640 x 480: метка должна занимать в кадре не меньше 20 пикселей, иначе её не найти.

Нужен OpenCV с модулем aruco (в OpenCV 4.7+ он в основном пакете, раньше - opencv-contrib-python).
Остановка - Ctrl+C: светодиоды гаснут.
"""
from pioneer_sdk import Pioneer, Camera
import cv2
import signal
import time

FAMILY = "DICT_APRILTAG_36h11"        # tag36h11: 6 x 6 ячеек данных; другие: DICT_APRILTAG_25h9, DICT_APRILTAG_16h5
GRID_COLUMNS = 12                     # поле 12 x 12; номер метки = строка * 12 + столбец (допущение - поправьте)
CONFIRM_FRAMES = 2                    # сколько кадров подряд метка должна быть видна, чтобы сменить цвет (против мерцания)
REFRESH_SECONDS = 1.0                 # раз в столько секунд цвет отправляется снова: автопилот мог перекрыть светодиоды
PALETTE = [                           # восемь хорошо различимых цветов, яркость каждого канала 0..255
    (255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 204, 0), (255, 0, 255), (0, 255, 255), (255, 102, 0), (255, 255, 255),
]

drone = None
camera = None
detector = None
dictionary = None
detector_parameters = None


def stop_handler(signum, frame):
    """Остановка по Ctrl+C или сигналу завершения: выходим через finally, светодиоды гасятся."""
    raise KeyboardInterrupt


def make_detector():
    """Детектор AprilTag: подходит и новому OpenCV (ArucoDetector), и старому (detectMarkers)."""
    global detector, dictionary, detector_parameters
    dictionary = cv2.aruco.getPredefinedDictionary(getattr(cv2.aruco, FAMILY))
    if hasattr(cv2.aruco, "ArucoDetector"):
        detector = cv2.aruco.ArucoDetector(dictionary, cv2.aruco.DetectorParameters())
    else:
        detector_parameters = cv2.aruco.DetectorParameters_create()


def find_tags(frame):
    if detector is not None:
        return detector.detectMarkers(frame)
    return cv2.aruco.detectMarkers(frame, dictionary, parameters=detector_parameters)


def biggest_tag_id(corners, ids):
    """Если в кадре несколько меток - берём ту, что видна крупнее (она ближе к дрону)."""
    best_id, best_side = None, -1.0
    for tag_corners, tag_id in zip(corners, ids):
        points = tag_corners[0]                         # четыре угла: (4, 2)
        side = abs(points[0][0] - points[2][0]) + abs(points[0][1] - points[2][1])
        if side > best_side:
            best_id, best_side = int(tag_id[0]), side
    return best_id


def color_index_for(tag_id, previous_index):
    """Номер цвета в палитре: та же метка - тот же цвет, а новая метка не получает цвет предыдущей."""
    index = tag_id % len(PALETTE)
    if index == previous_index:
        index = (index + 1) % len(PALETTE)
    return index


def show_color(index):
    r, g, b = PALETTE[index]
    drone.led_control(led_id=255, r=r, g=g, b=b)        # 255 - все светодиоды сразу


try:
    signal.signal(signal.SIGTERM, stop_handler)
except (ValueError, AttributeError, OSError):
    pass                                                # нет сигналов: Ctrl+C работает и так

drone = Pioneer()
camera = Camera()                                       # камера модуля ESP32 (в симуляторе тоже передняя)
make_detector()
print("Поле AprilTag %s: летите с пульта, светодиоды покажут метку перед дроном" % FAMILY)

shown_tag = None                # метка, цветом которой горят светодиоды
shown_color = None              # её номер цвета в палитре
candidate = None                # метка, которую видим, но цвет ещё не сменили
candidate_frames = 0
last_sent = 0.0

try:
    while True:
        frame = camera.get_cv_frame()
        if frame is None:
            time.sleep(0.01)
            continue

        corners, ids, _ = find_tags(frame)
        if ids is not None and len(ids) > 0:
            tag = biggest_tag_id(corners, ids)
            if tag == candidate:
                candidate_frames += 1
            else:
                candidate, candidate_frames = tag, 1
            if candidate_frames >= CONFIRM_FRAMES and tag != shown_tag:
                shown_color = color_index_for(tag, shown_color)
                shown_tag = tag
                show_color(shown_color)
                last_sent = time.monotonic()
                if tag < GRID_COLUMNS * GRID_COLUMNS:
                    print("Метка %d: строка %d, столбец %d" % (tag, tag // GRID_COLUMNS, tag % GRID_COLUMNS))
                else:
                    print("Метка %d (вне поля %d x %d)" % (tag, GRID_COLUMNS, GRID_COLUMNS))
        else:
            candidate, candidate_frames = None, 0       # метки нет: цвет остаётся прежним

        if shown_color is not None and time.monotonic() - last_sent > REFRESH_SECONDS:
            show_color(shown_color)
            last_sent = time.monotonic()
except KeyboardInterrupt:
    pass
finally:
    drone.led_control(led_id=255, r=0, g=0, b=0)        # светодиоды гасим
    drone.close_connection()
