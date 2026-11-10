"""Полёт над полем ArUco-маркеров с клавиатуры: светодиоды сообщают, что видит нижняя камера.

Управление (виртуальный пульт через send_rc_channels; латиница или русская раскладка):
  W / S — вперёд / назад      A / D — влево / вправо
  R / F — выше / ниже         Q / E — поворот влево / вправо
  Пробел — полная остановка   Esc — посадка и выход

Пока клавиши отпущены, стики в нуле: автопилот держит высоту и курс.
Кликните по сцене или окну камеры, чтобы клавиши попадали в симулятор, а не в редактор.

Светодиоды:
  * маркер появился в кадре — все светодиоды загораются цветом этого маркера;
  * маркер вышел из кадра — светодиоды продолжают гореть цветом последнего маркера;
  * маркер с другим номером — цвет меняется (цвет зависит от номера).

Словарь маркеров должен совпадать с напечатанными (в симуляторе по умолчанию 6x6_250).

Пионер Мини 2 работает с pioneer_sdk2 «из коробки». Базовый Пионер тоже может им
пользоваться, но только если на нём установлен бортовой компьютер Radxa Zero 3W.
"""
from pioneer_sdk2 import Pioneer, Camera, CameraType, ImageViewer
import colorsys
import cv2
import time

DICTIONARY = cv2.aruco.DICT_6X6_250   # у 19_aruco_distance.py — DICT_4X4_50: берите свой
ALL_LEDS = 255                        # номер «все светодиоды сразу»
GOLDEN = 0.618034                     # «золотое сечение»: соседние номера получают далёкие оттенки
FLIGHT_ALT = 1.5                      # высота после взлёта, м
STICK = 0.4                           # отклонение стика при нажатой клавише (0..1)
KEY_HOLD = 0.5                        # сколько секунд действует нажатие: перекрывает паузу автоповтора клавиши

RC_PARAMETERS = {                     # без этих значений автопилот проигнорирует «виртуальный пульт»
    "Copter_man_rcMode0": 6.0,
    "Copter_man_rcMode1": 3.0,
    "Copter_man_rcMode2": 3.0,
    "Copter_flyWithoutRc": 1.0,
    "SensorMux_rc": 2.0,
}

# клавиша -> (канал, знак). Каналы: roll — вправо «+», pitch — вперёд «-», throttle — вверх «+», yaw — влево «+»
KEYS = {
    "w": ("pitch", -1), "s": ("pitch", +1),
    "a": ("roll", -1), "d": ("roll", +1),
    "r": ("throttle", +1), "f": ("throttle", -1),
    "q": ("yaw", +1), "e": ("yaw", -1),
}
RUSSIAN = dict(zip("цфывкайу", "wasdrfqe"))   # те же физические клавиши в русской раскладке


def marker_color(marker_id):
    """Постоянный цвет для номера маркера: тот же номер — всегда тот же цвет."""
    return colorsys.hsv_to_rgb((marker_id * GOLDEN) % 1.0, 1.0, 1.0)


def biggest_marker_id(corners, ids):
    """Если в кадре несколько маркеров — берём тот, что виден крупнее (он ближе к дрону)."""
    def side(c):
        pts = c[0]
        return abs(pts[0][0] - pts[2][0]) + abs(pts[0][1] - pts[2][1])
    best = max(range(len(ids)), key=lambda i: side(corners[i]))
    return int(ids[best][0])


def send_sticks(drone, sticks):
    drone.send_rc_channels(channel_1=sticks["roll"], channel_2=sticks["pitch"],
                           channel_3=sticks["throttle"], channel_4=sticks["yaw"],
                           channel_5=1, channel_6=0, channel_7=1, channel_8=0)


detector = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(DICTIONARY),
                                   cv2.aruco.DetectorParameters())
drone = Pioneer()
drone.set_logger(False)
camera = Camera(camera_type=CameraType.OPT)         # OPT — нижняя камера
viewer = ImageViewer()
old_params = {name: drone.get_param(name, update=True) for name in RC_PARAMETERS}

last_id = None                                      # последний замеченный маркер: его цветом горят светодиоды
until = {"roll": 0.0, "pitch": 0.0, "throttle": 0.0, "yaw": 0.0}    # до какого момента стик отклонён
direction = {"roll": 0, "pitch": 0, "throttle": 0, "yaw": 0}
neutral = dict.fromkeys(until, 0.0)

try:
    for name, value in RC_PARAMETERS.items():
        drone.set_param(name, value)
    drone.arm()
    drone.takeoff()
    drone.go_to_local_point(x=0, y=0, z=FLIGHT_ALT, yaw=0, time=0)
    while not drone.point_reached():
        time.sleep(0.1)
    print("Готово к полёту: WASD — движение, R/F — высота, Q/E — поворот, Esc — посадка")

    while True:
        # --- клавиатура -> стики --------------------------------------------------------
        key = cv2.waitKey(1)
        if key == 27:                                # Esc
            break
        if key == 32:                                # пробел — все стики в ноль
            until = dict.fromkeys(until, 0.0)
        elif key > 0:
            letter = chr(key).lower()
            letter = RUSSIAN.get(letter, letter)
            if letter in KEYS:
                axis, sign = KEYS[letter]
                direction[axis], until[axis] = sign, time.monotonic() + KEY_HOLD
        now = time.monotonic()
        send_sticks(drone, {axis: STICK * direction[axis] if now < until[axis] else 0.0
                            for axis in until})

        # --- нижняя камера -> светодиоды -----------------------------------------------
        try:
            frame = camera.get_cv_frame(timeout=1.0)
        except TimeoutError:
            continue
        if frame is None:
            continue
        corners, ids, _ = detector.detectMarkers(frame)
        if ids is not None and len(ids) > 0:
            cv2.aruco.drawDetectedMarkers(frame, corners, ids)
            marker_id = biggest_marker_id(corners, ids)
            if marker_id != last_id:                # другой маркер — меняем цвет
                r, g, b = marker_color(marker_id)
                drone.led_control(ALL_LEDS, r=r, g=g, b=b)
                print(f"Маркер {marker_id}: матрица горит цветом ({r:.2f}, {g:.2f}, {b:.2f})")
                last_id = marker_id
        # маркера в кадре нет — светодиоды остаются прежнего цвета
        viewer.imshow("markers", frame)             # трансляция: 10.42.0.1:8889/markers
except KeyboardInterrupt:
    pass
finally:
    send_sticks(drone, neutral)
    if drone.get_fly_state().name == "IN_SKY":
        drone.land()
    drone.led_control(ALL_LEDS)
    for name, value in old_params.items():          # возвращаем параметры автопилота
        if value is not None:
            drone.set_param(name, value)
    viewer.close()
    camera.stop()
    drone.close_connection()
