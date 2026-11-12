"""Проверка камеры Radxa: по одному кадру из pioneer_sdk2 и из каждого /dev/video* (OpenCV).

Зачем: кадр из pioneer_sdk2 приходит с чёрными полосами и тремя разноцветными кусками (испорчен формат или шаг строк).
Скрипт сохраняет снимки рядом с собой и печатает размеры - по ним видно, через какой источник кадр чистый.

Запуск на Radxa:
    python3 24_camera_probe.py
Снимки: probe_sdk.jpg, probe_video0.jpg, probe_video1.jpg ... (в папке скрипта).
Дополнительно в терминале Radxa полезно выполнить:
    v4l2-ctl --list-devices
    v4l2-ctl -d /dev/video0 --list-formats-ext
"""
from pioneer_sdk2 import Camera, CameraType
import cv2
import os
import time

try:
    FOLDER = os.path.dirname(os.path.abspath(__file__))
except NameError:
    FOLDER = os.getcwd()
MAX_DEVICE = 8                  # проверяем /dev/video0 ... video7


def save(name, frame):
    path = os.path.join(FOLDER, name)
    cv2.imwrite(path, frame)
    print("  сохранено:", path)


print("== pioneer_sdk2 ==")
try:
    camera_type = getattr(CameraType, "OPT", None) or getattr(CameraType, "MAIN", None)
    camera = Camera(camera_type=camera_type) if camera_type is not None else Camera()
    frame = None
    for _ in range(10):                                   # первые кадры бывают пустыми или тёмными
        try:
            frame = camera.get_cv_frame(timeout=1.0)
        except TimeoutError:
            frame = None
        time.sleep(0.2)
    if frame is None:
        print("  кадров нет")
    else:
        print("  shape=%s dtype=%s среднее=%.0f" % (str(frame.shape), str(frame.dtype), float(frame.mean())))
        save("probe_sdk.jpg", frame)
    camera.stop()
except Exception as error:
    print("  ошибка:", error)

print("== OpenCV, /dev/video* ==")
for index in range(MAX_DEVICE):
    capture = cv2.VideoCapture(index)
    if not capture.isOpened():
        capture.release()
        continue
    frame = None
    for _ in range(10):
        ok, grabbed = capture.read()
        if ok:
            frame = grabbed
        time.sleep(0.1)
    if frame is None:
        print("video%d: открылась, но кадров нет" % index)
    else:
        print("video%d: shape=%s среднее=%.0f" % (index, str(frame.shape), float(frame.mean())))
        save("probe_video%d.jpg" % index, frame)
    capture.release()
print("Готово. Откройте снимки: какой из них без полос?")
