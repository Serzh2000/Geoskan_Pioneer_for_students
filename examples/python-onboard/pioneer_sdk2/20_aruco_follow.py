"""Удержание дистанции до ArUco-маркера и поворот к нему (П-регулятор).

Захват кадров и распознавание идут в отдельном потоке, чтобы медленная
обработка изображения не задерживала отправку команд скорости.
"""
from pioneer_sdk2 import Pioneer, Camera, ImageViewer
import cv2
import numpy as np
import threading
import time

MARKER_SIZE = 0.10       # сторона маркера, м
TARGET_DISTANCE = 1.2    # желаемая дистанция до маркера, м
KP_DIST = 0.6            # м/с на метр ошибки дистанции
KP_YAW = 1.5             # рад/с на радиан углового отклонения
MAX_V, MAX_YAW = 0.4, 0.6
LOST_TIMEOUT = 0.5       # через сколько секунд без маркера останавливаться

half = MARKER_SIZE / 2
MARKER_POINTS = np.array([(-half, half, 0), (half, half, 0),
                          (half, -half, 0), (-half, -half, 0)], dtype=np.float32)


class MarkerTracker(threading.Thread):
    def __init__(self, matrix, dist):
        super().__init__(daemon=True)
        self.matrix, self.dist = matrix, dist
        self.detector = cv2.aruco.ArucoDetector(
            cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50), cv2.aruco.DetectorParameters())
        self.camera, self.viewer = Camera(), ImageViewer()
        print("Окно просмотра: http://10.42.0.1:8889/follow/")
        self.lock = threading.Lock()
        self.tvec, self.seen_at = None, 0.0
        self.running = True

    def run(self):
        while self.running:
            try:
                frame = self.camera.get_cv_frame(timeout=0.5)
            except TimeoutError:
                continue
            if frame is None:
                continue
            corners, ids, _ = self.detector.detectMarkers(frame)
            if ids is not None:
                ok, rvec, tvec = cv2.solvePnP(MARKER_POINTS, corners[0][0], self.matrix, self.dist,
                                              flags=cv2.SOLVEPNP_IPPE_SQUARE)
                if ok:
                    with self.lock:                       # данные читает другой поток — защищаем
                        self.tvec, self.seen_at = tvec.flatten(), time.monotonic()
                    cv2.drawFrameAxes(frame, self.matrix, self.dist, rvec, tvec, half)
            self.viewer.imshow("follow", frame)   # трансляция: 10.42.0.1:8889/follow
    def latest(self):
        """Последнее положение маркера или None, если он давно не виден."""
        with self.lock:
            if self.tvec is None or time.monotonic() - self.seen_at > LOST_TIMEOUT:
                return None
            return self.tvec.copy()

    def stop(self):
        self.running = False
        self.join()
        self.viewer.close()
        self.camera.stop()


def control(tvec):
    """По положению маркера (x вправо, z вперёд — оси камеры) вычисляет vy и yaw_rate."""
    x, _, z = tvec
    distance_error = z - TARGET_DISTANCE           # >0 — маркер дальше, чем нужно
    angle_error = np.arctan2(x, z)                 # >0 — маркер правее оси камеры
    vy = np.clip(KP_DIST * distance_error, -MAX_V, MAX_V)
    yaw_rate = np.clip(-KP_YAW * angle_error, -MAX_YAW, MAX_YAW)   # минус: положительный yaw_rate — влево
    return float(vy), float(yaw_rate)


storage = cv2.FileStorage("data.yml", cv2.FILE_STORAGE_READ)
matrix, dist = storage.getNode("mtx").mat(), storage.getNode("dist").mat()
storage.release()

tracker = MarkerTracker(matrix, dist)
tracker.start()
drone = Pioneer()
drone.set_logger(False)

try:
    drone.arm()
    drone.takeoff()
    drone.go_to_local_point(x=0, y=0, z=1.3, yaw=0, time=0)
    while not drone.point_reached():
        time.sleep(0.1)

    while True:
        tvec = tracker.latest()
        vy, yaw_rate = control(tvec) if tvec is not None else (0.0, 0.0)
        drone.set_manual_speed_body_fixed(0, vy, 0, yaw_rate, 0.3)
        time.sleep(0.1)
except KeyboardInterrupt:
    pass
finally:
    if drone.get_fly_state().name == "IN_SKY":
        drone.set_manual_speed_body_fixed(0, 0, 0, 0, 0.3)
        drone.land()
    tracker.stop()
    drone.close_connection()
