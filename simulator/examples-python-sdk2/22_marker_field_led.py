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
  * маркер с другим номером — другой цвет (палитра из 8 цветов, цвет предыдущего маркера не повторяется).

Словарь маркеров должен совпадать с напечатанными (в симуляторе по умолчанию 6x6_250).

Пионер Мини 2 работает с pioneer_sdk2 «из коробки». Базовый Пионер тоже может им
пользоваться, но только если на нём установлен бортовой компьютер Radxa Zero 3W.
"""
from pioneer_sdk2 import Pioneer, Camera, CameraType, ImageViewer
import cv2
import time

DICTIONARY = cv2.aruco.DICT_6X6_250   # у 19_aruco_distance.py — DICT_4X4_50: берите свой
ALL_LEDS = 255                        # номер «все светодиоды сразу»
PALETTE = [                           # восемь хорошо различимых цветов (красный, зелёный, синий ...), яркость 0..1
    (1, 0, 0), (0, 1, 0), (0, 0, 1), (1, 0.8, 0), (1, 0, 1), (0, 1, 1), (1, 0.4, 0), (1, 1, 1),
]
FLIGHT_ALT = 1.5                      # высота после взлёта, м
STICK = 0.4                           # отклонение стика при нажатой клавише (0..1)
KEY_HOLD = 0.5                        # сколько секунд действует нажатие: перекрывает паузу автоповтора клавиши
STICK_STEP = 0.05                     # на сколько стик может измениться за кадр: плавный разгон и торможение

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


def marker_color_index(marker_id, previous_index):
    """Номер цвета в палитре: тот же маркер — тот же цвет, а новый маркер никогда не получает цвет предыдущего."""
    index = marker_id % len(PALETTE)
    if index == previous_index:                 # номера 3 и 11 дали бы один цвет — берём следующий
        index = (index + 1) % len(PALETTE)
    return index


def biggest_marker_id(corners, ids):
    """Если в кадре несколько маркеров — берём тот, что виден крупнее (он ближе к дрону)."""
    best_id, best_side = None, -1.0
    for marker_corners, marker_id in zip(corners, ids):
        points = marker_corners[0]                        # четыре угла: (4, 2)
        side = abs(points[0][0] - points[2][0]) + abs(points[0][1] - points[2][1])
        if side > best_side:
            best_id, best_side = int(marker_id[0]), side
    return best_id


def send_sticks(drone, sticks):
    drone.send_rc_channels(channel_1=sticks["roll"], channel_2=sticks["pitch"],
                           channel_3=sticks["throttle"], channel_4=sticks["yaw"],
                           channel_5=1, channel_6=0, channel_7=1, channel_8=0)


def approach(current, target):
    """Сдвигает стик к цели не больше чем на STICK_STEP: резкий рывок стика — это резкий манёвр дрона."""
    return current + max(-STICK_STEP, min(STICK_STEP, target - current))


def release_sticks(drone, sticks):
    """Плавно возвращает все стики в ноль (перед посадкой и при выходе)."""
    while any(abs(value) > 1e-9 for value in sticks.values()):
        for axis in sticks:
            sticks[axis] = approach(sticks[axis], 0.0)
        send_sticks(drone, sticks)
        time.sleep(0.03)


detector = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(DICTIONARY),
                                   cv2.aruco.DetectorParameters())
drone = Pioneer()
drone.set_logger(False)
camera = Camera(camera_type=CameraType.OPT)         # OPT — нижняя камера
viewer = ImageViewer()
old_params = {name: drone.get_param(name, update=True) for name in RC_PARAMETERS}

last_id = None                                      # последний замеченный маркер: его цветом горят светодиоды
last_color = None                                   # номер цвета последнего маркера в палитре
until = {"roll": 0.0, "pitch": 0.0, "throttle": 0.0, "yaw": 0.0}    # до какого момента стик отклонён
direction = {"roll": 0, "pitch": 0, "throttle": 0, "yaw": 0}
sticks = dict.fromkeys(until, 0.0)                                   # что сейчас отправлено на «пульт»

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
        for axis in sticks:
            target = STICK * direction[axis] if now < until[axis] else 0.0
            sticks[axis] = approach(sticks[axis], target)
        send_sticks(drone, sticks)

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
                last_color = marker_color_index(marker_id, last_color)
                r, g, b = PALETTE[last_color]
                drone.led_control(ALL_LEDS, r=r, g=g, b=b)
                print(f"Маркер {marker_id}: светодиоды горят цветом ({r}, {g}, {b})")
                last_id = marker_id
        # маркера в кадре нет — светодиоды остаются прежнего цвета
        viewer.imshow("markers", frame)             # трансляция: 10.42.0.1:8889/markers
except KeyboardInterrupt:
    pass
finally:
    release_sticks(drone, sticks)
    if drone.get_fly_state().name == "IN_SKY":
        drone.land()
    drone.led_control(ALL_LEDS)
    for name, value in old_params.items():          # возвращаем параметры автопилота
        if value is not None:
            drone.set_param(name, value)
    viewer.close()
    camera.stop()
    drone.close_connection()
