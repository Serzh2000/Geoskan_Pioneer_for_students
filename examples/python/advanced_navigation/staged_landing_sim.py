"""Посадка на ArUco-метку в симуляторе: наведение по пикселям и снижение ступенями.

Где запускать: редактор симулятора, язык Python, сцена с меткой 12 под стартом
(её готовит миссия Python 99 «Посадка по ArUco» в панели «Обучение»).
Camera(view="bottom") - расширение симулятора; на настоящем дроне камеру
выбирают под его оборудование, а знаки поправок проверяют заново.
"""
import time

import cv2
from pioneer_sdk import Pioneer, Camera

TARGET_ID = 12
KP = 2.0                  # П-коэффициент: доля кадра -> м/с
V_MAX = 0.3               # предел скорости, м/с
TOL_PX = 8                # допуск центрирования, пиксели
STABLE_FRAMES = 3         # столько кадров подряд метка должна быть в допуске
LEVELS = [3.0, 2.0, 1.5]  # ступени снижения, м

pioneer = Pioneer()
camera = Camera(view="bottom")
dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250)
detector = cv2.aruco.ArucoDetector(dictionary)


def wait_for(test, limit=120):
    deadline = time.monotonic() + limit
    while time.monotonic() < deadline:
        if test():
            return
        time.sleep(0.05)
    raise RuntimeError("тайм-аут ожидания")


def go(x, y, z):
    pioneer.go_to_local_point(x, y, z, yaw=None)
    wait_for(pioneer.point_reached)
    time.sleep(1.5)  # корпус успокаивается, следующий кадр снят уже на месте


def clamp(value, limit):
    return max(-limit, min(limit, value))


def observe(target_id):
    """Свежий кадр -> ошибка (ex, ey) центра метки от центра кадра и размеры кадра."""
    frame = camera.get_cv_frame()
    if frame is None:
        return None
    corners, ids, _ = detector.detectMarkers(frame)
    if ids is None:
        return None
    for i, value in enumerate(ids):
        if int(value[0]) == target_id:
            points = corners[i][0]
            h, w = frame.shape[:2]
            cx = sum(float(p[0]) for p in points) / 4
            cy = sum(float(p[1]) for p in points) / 4
            return cx - w / 2, cy - h / 2, w, h
    return None


def align(target_id, attempts=120):
    """П-регулятор по двум осям; True, когда метка STABLE_FRAMES кадров подряд в допуске."""
    stable = 0
    for _ in range(attempts):
        seen = observe(target_id)
        if seen is None:
            pioneer.set_manual_speed(0, 0, 0, 0)   # по устаревшей ошибке не летим
            stable = 0
        else:
            ex, ey, w, h = seen
            if abs(ex) <= TOL_PX and abs(ey) <= TOL_PX:
                pioneer.set_manual_speed(0, 0, 0, 0)
                stable += 1
                if stable >= STABLE_FRAMES:
                    return True
            else:
                stable = 0
                # Знаки - для нижней камеры симулятора (миссии 92 и 96):
                # метка правее центра -> летим по +X, ниже центра -> по -Y.
                vx = clamp(KP * ex / w, V_MAX)
                vy = clamp(-KP * ey / h, V_MAX)
                pioneer.set_manual_speed(vx, vy, 0, 0)
        time.sleep(0.1)
    pioneer.set_manual_speed(0, 0, 0, 0)
    return False


pioneer.arm()
pioneer.takeoff()
wait_for(lambda: pioneer.get_autopilot_state() == "MISSION")
try:
    go(0, 0, LEVELS[0])
    for level in LEVELS:
        x, y, _ = pioneer.get_local_position_lps()
        go(x, y, level)                     # снижаемся, сохраняя измеренные X и Y
        if not align(TARGET_ID):
            raise RuntimeError("Метка не наведена на высоте %.1f м" % level)
        print("По центру на высоте", level)
    pioneer.land()
    wait_for(lambda: pioneer.get_autopilot_state() == "DISARMED")
    lx, ly, _ = pioneer.get_local_position_lps()
    print("Посадка в точке:", round(lx, 2), round(ly, 2))
except RuntimeError as error:
    pioneer.set_manual_speed(0, 0, 0, 0)
    pioneer.land()
    print("Прервано:", error)
