"""Поиск ArUco-маркеров и оценка расстояния до них.

Нужен файл data.yml с параметрами камеры — его создаёт скрипт калибровки
(camera_calibration.py из репозитория примеров Pioneer-SDK2).
"""
from pioneer_sdk2 import Camera, ImageViewer
import cv2
import numpy as np

MARKER_SIZE = 0.10      # длина стороны напечатанного маркера, м — измерьте линейкой!

# Углы маркера в его собственной системе координат (центр маркера — начало отсчёта)
half = MARKER_SIZE / 2
MARKER_POINTS = np.array([(-half,  half, 0), (half,  half, 0),
                          (half, -half, 0), (-half, -half, 0)], dtype=np.float32)


def load_calibration(path="data.yml"):
    storage = cv2.FileStorage(path, cv2.FILE_STORAGE_READ)
    matrix = storage.getNode("mtx").mat()
    dist = storage.getNode("dist").mat()
    storage.release()
    if matrix is None:
        raise FileNotFoundError("Нет файла калибровки " + path)
    return matrix, dist


camera_matrix, dist_coeffs = load_calibration()
detector = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50),
                                   cv2.aruco.DetectorParameters())
camera = Camera()
viewer = ImageViewer()
print("Окно просмотра: http://10.42.0.1:8889/aruco/")

try:
    while True:
        try:
            frame = camera.get_cv_frame(timeout=1.0)
        except TimeoutError:
            continue
        if frame is None:
            continue

        corners, ids, _ = detector.detectMarkers(frame)
        if ids is not None:
            cv2.aruco.drawDetectedMarkers(frame, corners, ids)
            for marker_corners, marker_id in zip(corners, ids.flatten()):
                ok, rvec, tvec = cv2.solvePnP(MARKER_POINTS, marker_corners[0],
                                              camera_matrix, dist_coeffs,
                                              flags=cv2.SOLVEPNP_IPPE_SQUARE)
                if not ok:
                    continue
                x, y, z = tvec.flatten()               # смещение маркера относительно камеры, м
                distance = float(np.linalg.norm(tvec))
                cv2.drawFrameAxes(frame, camera_matrix, dist_coeffs, rvec, tvec, MARKER_SIZE / 2)
                text = f"id={marker_id} d={distance:.2f}m x={x:+.2f} y={y:+.2f}"
                px, py = marker_corners[0][0].astype(int)
                cv2.putText(frame, text, (px, py - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 255), 2)
                print(text)
        viewer.imshow("aruco", frame)   # трансляция: 10.42.0.1:8889/aruco
except KeyboardInterrupt:
    pass
finally:
    viewer.close()
    camera.stop()
