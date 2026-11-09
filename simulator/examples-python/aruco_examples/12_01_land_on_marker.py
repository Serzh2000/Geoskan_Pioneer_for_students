from pioneer_sdk import Pioneer, Camera
import time
import cv2

TARGET_ID = 12
K = 2.0             # коэффициент: нормированная ошибка -> скорость, м/с
LIMIT = 0.3         # предел скорости, м/с
DEAD_ZONE = 8       # допуск центрирования, пиксели
STABLE = 3          # столько кадров подряд в допуске = «по центру»

drone = Pioneer()
camera = Camera(view="bottom")    # расширение симулятора; на дроне - Camera()
dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250)
detector = cv2.aruco.ArucoDetector(dictionary)


def wait_state(state, limit):
    deadline = time.monotonic() + limit
    while time.monotonic() < deadline:
        if drone.get_autopilot_state() == state:
            return True
        time.sleep(0.05)
    return False


def go(x, y, z):
    drone.go_to_local_point(x=x, y=y, z=z, yaw=0)
    deadline = time.monotonic() + 30
    while not drone.point_reached() and time.monotonic() < deadline:
        time.sleep(0.05)
    time.sleep(1.5)


def observation(target_id):
    """Ошибка (ex, ey) центра метки от центра кадра в пикселях или None."""
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
            return cx - w / 2, cy - h / 2
    return None


def clamp(value, limit):
    return max(-limit, min(limit, value))


def align(target_id, max_frames=120):
    """Навести дрон на метку. True - метка в центре STABLE кадров подряд."""
    stable = 0
    lost = 0
    for _ in range(max_frames):
        error = observation(target_id)
        if error is None:
            drone.set_manual_speed(vx=0, vy=0, vz=0, yaw_rate=0)   # старую ошибку не используем
            stable = 0
            lost += 1
            if lost >= 10:                                         # поиск не бесконечен
                print("Метка потеряна")
                return False
        else:
            lost = 0
            ex, ey = error
            if abs(ex) <= DEAD_ZONE and abs(ey) <= DEAD_ZONE:
                drone.set_manual_speed(vx=0, vy=0, vz=0, yaw_rate=0)
                stable += 1
                if stable >= STABLE:
                    return True
            else:
                stable = 0
                # Нижняя камера, курс 0: вправо по кадру = +X сцены, вверх по кадру = +Y.
                # Пиксельная ось y растёт вниз, поэтому у vy знак минус.
                vx = clamp(K * ex / 640, LIMIT)
                vy = clamp(-K * ey / 360, LIMIT)
                drone.set_manual_speed(vx=vx, vy=vy, vz=0, yaw_rate=0)
        time.sleep(0.1)
    drone.set_manual_speed(vx=0, vy=0, vz=0, yaw_rate=0)
    return False


try:
    drone.arm()
    wait_state("ARMED", 3)
    drone.takeoff()
    wait_state("MISSION", 15)
    go(0, 0, 3)

    if not align(TARGET_ID):
        print("Цель не наведена: сажусь на месте")
    else:
        print("По центру на 3 м, снижаюсь")
        position = drone.get_local_position_lps()
        if position is not None:
            go(position[0], position[1], 1.5)       # снижение - отдельный этап
        if align(TARGET_ID):
            print("По центру на 1.5 м, посадка на метку")
        else:
            print("Центр на 1.5 м не подтверждён: сажусь на месте")
    drone.land()
    wait_state("DISARMED", 20)
    position = drone.get_local_position_lps()
    if position is not None:
        print(f"Сел в точке ({position[0]:.2f}, {position[1]:.2f})")
finally:
    drone.disarm()
    drone.close_connection()
