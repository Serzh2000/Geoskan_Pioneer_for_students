from pioneer_sdk import Pioneer, Camera
import time
import cv2
import numpy as np

TARGET_ID = 12
MARKER = 0.84          # сторона ЧЁРНОГО квадрата метки, м. Метка симулятора: лист 1.05 м, чёрный квадрат ~0.84 м.
                       # На настоящем дроне измерьте линейкой рисунок без белого поля.
half = MARKER / 2

# Углы метки в её системе координат: центр - начало, X вправо, Y вверх, Z от метки к наблюдателю.
# Порядок - как у углов из детектора: левый верхний, правый верхний, правый нижний, левый нижний.
OBJECT_POINTS = np.array([(-half, half, 0), (half, half, 0), (half, -half, 0), (-half, -half, 0)], dtype=np.float32)

# Параметры камеры: матрица K и коэффициенты искажений. В симуляторе FileStorage отдаёт идеальную
# нижнюю камеру (кадр 640x360, угол обзора по вертикали 72 градуса, искажений нет).
# На настоящем дроне здесь лежит файл data.yml, полученный калибровкой.
storage = cv2.FileStorage("data.yml", cv2.FILE_STORAGE_READ)
K = storage.getNode("mtx").mat()
dist = storage.getNode("dist").mat()
storage.release()

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
    time.sleep(1.5)                 # корпус успокаивается, кадр снимается без смаза


def marker_pose(target_id):
    """Вектор tvec метки в системе камеры (метры) или None: нет кадра, нет метки, поза не найдена."""
    frame = camera.get_cv_frame()
    if frame is None:
        return None
    corners, ids, _ = detector.detectMarkers(frame)
    if ids is None:
        return None
    for i, value in enumerate(ids):
        if int(value[0]) == target_id:
            ok, rvec, tvec = cv2.solvePnP(OBJECT_POINTS, corners[i][0], K, dist,
                                          flags=cv2.SOLVEPNP_IPPE_SQUARE)
            return tvec.ravel() if ok else None
    return None


try:
    drone.arm()
    wait_state("ARMED", 3)
    drone.takeoff()
    wait_state("MISSION", 15)

    for z in (2.0, 3.0, 4.0):
        go(0.6, 0.3, z)             # над меткой 12 учебной сцены
        tvec = marker_pose(TARGET_ID)
        if tvec is None:
            print(f"z={z}: метка {TARGET_ID} не видна")
            continue
        distance = float(np.linalg.norm(tvec))
        print(f"z={z}: tvec=({tvec[0]:.2f}, {tvec[1]:.2f}, {tvec[2]:.2f}) м, до метки {distance:.2f} м")

    drone.land()
    wait_state("DISARMED", 15)
finally:
    drone.disarm()
    drone.close_connection()
