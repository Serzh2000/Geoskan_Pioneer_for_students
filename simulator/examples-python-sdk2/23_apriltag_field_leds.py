"""Поле AprilTag 12 x 12 (семейство tag36h11, 6 x 6 ячеек): светодиоды показывают, над какой меткой дрон.

Дрон ведёте вы - с настоящего пульта. Скрипт ничего не взлетает, не шлёт команд пульта и не двигает
дрон: он только смотрит камерой Radxa вниз и управляет светодиодами.

  * метка появилась в кадре - все светодиоды загораются цветом этой метки;
  * метка вышла из кадра - светодиоды остаются цвета последней метки;
  * другая метка - другой цвет (палитра из 8 цветов, цвет предыдущей метки не повторяется).

Запуск на Radxa Zero 3W:
    python3 23_apriltag_field_leds.py
Автозапуск: сервис systemd (ExecStart=/usr/bin/python3 /home/radxa/23_apriltag_field_leds.py, Restart=on-failure).

Нужен OpenCV с модулем aruco (в OpenCV 4.7+ он в основном пакете, раньше - opencv-contrib-python).
Что проверить на настоящем дроне (в симуляторе это работает по умолчанию):
  * CAMERA_SOURCE: "sdk2" - камера через pioneer_sdk2; если кадров нет, укажите номер устройства
    (0, 1 ... по `v4l2-ctl --list-devices`) или строку GStreamer;
  * LED_IDS: (255,) - все светодиоды сразу; при необходимости перечислите номера, например (0, 1, 2, 3).
"""
from pioneer_sdk2 import Pioneer, Camera, CameraType
import cv2
import os
import signal
import time

FAMILY = "DICT_APRILTAG_36h11"        # tag36h11: 6 x 6 ячеек данных; другие: DICT_APRILTAG_25h9, DICT_APRILTAG_16h5
GRID_COLUMNS = 12                     # поле 12 x 12; номер метки = строка * 12 + столбец (допущение - поправьте)
CAMERA_SOURCE = "sdk2"                # "sdk2", номер устройства (0, 1 ...) или строка GStreamer
LED_IDS = (255,)                      # 255 - все светодиоды сразу
CONFIRM_FRAMES = 2                    # сколько кадров подряд метка должна быть видна, чтобы сменить цвет (против мерцания)
REFRESH_SECONDS = 1.0                 # раз в столько секунд цвет отправляется снова: автопилот мог перекрыть светодиоды
PHOTO_SECONDS = 5                     # раз в столько секунд сохранять кадр камеры в папку скрипта; 0 - не сохранять
MAX_PHOTOS = 200                      # хранить не больше стольких последних фото (0 - без ограничения)
try:
    PHOTO_DIR = os.path.dirname(os.path.abspath(__file__))     # папка, где лежит скрипт
except NameError:
    PHOTO_DIR = os.getcwd()
OTHER_FAMILIES = ["DICT_APRILTAG_36h11", "DICT_APRILTAG_25h9", "DICT_APRILTAG_16h5", "DICT_6X6_250", "DICT_5X5_250",
                  "DICT_4X4_250", "DICT_ARUCO_ORIGINAL"]   # для диагностики: что ещё умеем находить
STATUS_SECONDS = 5                   # раз в столько секунд писать в терминал, есть ли метка в кадре
MAX_WIDTH = 960                      # кадр шире сжимается: на Radxa так быстрее, а метки находятся всё равно
PALETTE = [                           # восемь хорошо различимых цветов, яркость 0..1
    (1, 0, 0), (0, 1, 0), (0, 0, 1), (1, 0.8, 0), (1, 0, 1), (0, 1, 1), (1, 0.4, 0), (1, 1, 1),
]

drone = None
camera_sdk = None
capture = None
detector = None
dictionary = None
detector_parameters = None


def stop_handler(signum, frame):
    """Остановка сервисом (SIGTERM) или Ctrl+C: выходим через finally, светодиоды гасятся."""
    raise KeyboardInterrupt


def open_camera():
    global camera_sdk, capture
    if CAMERA_SOURCE == "sdk2":
        # На Базовом с Radxa нижней камеры OPT в списке может не быть: берём OPT, иначе MAIN (камера Radxa, смотрит вниз)
        camera_type = getattr(CameraType, "OPT", None) or getattr(CameraType, "MAIN", None)
        print("Типы камер pioneer_sdk2:", [name for name in dir(CameraType) if not name.startswith("_")], "- берём", camera_type)
        camera_sdk = Camera(camera_type=camera_type) if camera_type is not None else Camera()
    else:
        capture = cv2.VideoCapture(CAMERA_SOURCE)
        if not capture.isOpened():
            raise RuntimeError("Камера не открылась: " + str(CAMERA_SOURCE))


def grab_frame():
    """Следующий кадр или None, если его нет."""
    if camera_sdk is not None:
        try:
            return camera_sdk.get_cv_frame(timeout=1.0)
        except TimeoutError:
            return None
    ok, frame = capture.read()
    return frame if ok else None


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


def which_families_see(frame):
    """Диагностика: какие семейства меток находят что-то в кадре (если выбрано не то семейство)."""
    found = []
    for name in OTHER_FAMILIES:
        if not hasattr(cv2.aruco, name):
            continue
        other = cv2.aruco.getPredefinedDictionary(getattr(cv2.aruco, name))
        if hasattr(cv2.aruco, "ArucoDetector"):
            ids = cv2.aruco.ArucoDetector(other, cv2.aruco.DetectorParameters()).detectMarkers(frame)[1]
        else:
            ids = cv2.aruco.detectMarkers(frame, other, parameters=cv2.aruco.DetectorParameters_create())[1]
        if ids is not None and len(ids) > 0:
            found.append("%s %s" % (name, [int(i[0]) for i in ids]))
    return found


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
    for led in LED_IDS:
        drone.led_control(led, r=r, g=g, b=b)


def leds_off():
    for led in LED_IDS:
        drone.led_control(led)                          # без цвета = выключить


try:
    signal.signal(signal.SIGTERM, stop_handler)
except (ValueError, AttributeError, OSError):
    pass                                                # не главный поток или нет сигналов: Ctrl+C работает и так

drone = Pioneer()
drone.set_logger(False)
open_camera()
make_detector()
print("Поле AprilTag %s: летите с пульта, светодиоды покажут метку под дроном" % FAMILY)

shown_tag = None                # метка, цветом которой горят светодиоды
shown_color = None              # её номер цвета в палитре
candidate = None                # метка, которую видим, но цвет ещё не сменили
candidate_frames = 0
last_sent = 0.0
last_status = 0.0
last_photo = 0.0
raw_reported = False
saved_photos = []
visible_tag = None             # метка в текущем кадре

try:
    while True:
        frame = grab_frame()
        if frame is None:
            continue
        if not raw_reported:
            raw_reported = True
            print("Сырой кадр: shape=%s dtype=%s" % (str(frame.shape), str(frame.dtype)))
        if frame.shape[1] > MAX_WIDTH:
            scale = MAX_WIDTH / frame.shape[1]
            frame = cv2.resize(frame, (MAX_WIDTH, int(frame.shape[0] * scale)))

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
            visible_tag = tag
        else:
            candidate, candidate_frames = None, 0       # метки нет: цвет остаётся прежним
            visible_tag = None

        if time.monotonic() - last_status >= STATUS_SECONDS:
            last_status = time.monotonic()
            if visible_tag is not None:
                print("Метка в кадре: ЕСТЬ (номер %d)" % visible_tag)
            else:
                # Диагностика: размер и яркость кадра, не видит ли метку другое семейство, снимок для просмотра
                others = which_families_see(frame)
                print("Метка в кадре: НЕТ | кадр %dx%d, яркость %d/255 | другие семейства: %s" % (
                    frame.shape[1], frame.shape[0], int(frame.mean()), others if others else "не видят"))

        if PHOTO_SECONDS and time.monotonic() - last_photo >= PHOTO_SECONDS:
            last_photo = time.monotonic()
            photo_path = os.path.join(PHOTO_DIR, time.strftime("photo_%Y%m%d_%H%M%S.jpg"))
            if cv2.imwrite(photo_path, frame):
                saved_photos.append(photo_path)
                while MAX_PHOTOS and len(saved_photos) > MAX_PHOTOS:     # старые удаляем, чтобы не забить диск
                    try:
                        os.remove(saved_photos.pop(0))
                    except OSError:
                        pass
            else:
                print("Не удалось сохранить фото:", photo_path)

        if shown_color is not None and time.monotonic() - last_sent > REFRESH_SECONDS:
            show_color(shown_color)
            last_sent = time.monotonic()
except KeyboardInterrupt:
    pass
finally:
    leds_off()
    if camera_sdk is not None:
        camera_sdk.stop()
    if capture is not None:
        capture.release()
    drone.close_connection()
