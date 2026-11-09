from pioneer_sdk import Pioneer, Camera
import time
import cv2

TARGET_ID = 12        # нужная метка: номер рисунка, а не расстояние
CONFIRM = 3           # столько кадров подряд нужно, чтобы поверить в находку

drone = Pioneer()
camera = Camera(view="bottom")    # расширение симулятора; на дроне - Camera()

# Словарь детектора должен совпадать со словарём, которым напечатаны метки.
# Учебные метки симулятора - DICT_6X6_250.
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


def read_target(target_id):
    """Кадр и четыре угла нужной метки; (кадр, None), если метки нет."""
    frame = camera.get_cv_frame()
    if frame is None:
        return None, None
    corners, ids, _ = detector.detectMarkers(frame)
    if ids is None:                         # меток нет - штатный исход, не ошибка
        return frame, None
    for i, value in enumerate(ids):         # ищем по ID, а не по месту в списке
        if int(value[0]) == target_id:
            return frame, corners[i][0]
    return frame, None


try:
    drone.arm()
    wait_state("ARMED", 3)
    drone.takeoff()
    wait_state("MISSION", 15)
    go(0, 0, 3)

    count = 0
    for step in range(10):
        frame, points = read_target(TARGET_ID)
        if points is None:
            count = 0                       # потеря сбрасывает счёт подряд
            print("Метка", TARGET_ID, "не видна")
        else:
            count += 1
            h, w = frame.shape[:2]
            cx = sum(float(p[0]) for p in points) / 4   # центр - среднее углов
            cy = sum(float(p[1]) for p in points) / 4
            ex, ey = cx - w / 2, cy - h / 2             # ошибка в пикселях
            print(f"Центр ({cx:.1f}, {cy:.1f}), ошибка ({ex:.1f}, {ey:.1f}), подряд {count}")
            for k in range(4):                          # обводим метку по углам
                a, b = points[k], points[(k + 1) % 4]
                cv2.line(frame, (int(a[0]), int(a[1])), (int(b[0]), int(b[1])), (0, 255, 0), 2)
            cv2.circle(frame, (round(cx), round(cy)), 4, (0, 0, 255), -1)
            cv2.imshow("ArUco", frame)
            cv2.waitKey(1)
            if count >= CONFIRM:
                print("Подтверждено: метка", TARGET_ID)
                break
        time.sleep(0.15)

    drone.land()
    wait_state("DISARMED", 15)
finally:
    drone.disarm()
    drone.close_connection()
