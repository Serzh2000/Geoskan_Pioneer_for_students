"""Две камеры — две модели на разных ядрах NPU (у RK3576 их два: 0 и 1), обработка в двух потоках.

Основная камера ищет людей, камера оптической навигации (смотрит вниз) — любые объекты.
"""
import threading
import time
import cv2
import numpy as np
from pioneer_rknn import Yolo
from pioneer_sdk2 import Camera, CameraType, ImageViewer

SIZE = 640
PERSON = 0                          # номер класса "person" в COCO

viewer = ImageViewer()
print("Окно просмотра: http://10.42.0.1:8889/main/, http://10.42.0.1:8889/bottom/")
viewer_lock = threading.Lock()      # один ImageViewer на два потока — публикуем кадры по очереди
stop = threading.Event()


def worker(camera_type, npu_core, stream_name, only_person):
    """Отдельный поток: своя камера, своя модель на своём ядре NPU, свой RTSP-поток."""
    camera = Camera(camera_type=camera_type)
    model = Yolo(model_name="yolov8n", npu_core=[npu_core])
    fps, last = 0.0, time.monotonic()
    try:
        while not stop.is_set():
            try:
                frame = camera.get_cv_frame(timeout=1.0)
            except TimeoutError:
                continue
            if frame is None:
                continue
            result = model.run([np.expand_dims(cv2.resize(frame, (SIZE, SIZE)), 0)])
            if result is not None and result[0] is not None:
                sx, sy = frame.shape[1] / SIZE, frame.shape[0] / SIZE
                for (x1, y1, x2, y2), cls, score in zip(*result):
                    if only_person and int(cls) != PERSON:
                        continue
                    cv2.rectangle(frame, (int(x1 * sx), int(y1 * sy)), (int(x2 * sx), int(y2 * sy)),
                                  (0, 255, 0), 2)
            now = time.monotonic()
            fps, last = 0.9 * fps + 0.1 / max(now - last, 1e-3), now
            cv2.putText(frame, f"NPU core {npu_core}  FPS {fps:.1f}", (10, 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            with viewer_lock:
                viewer.imshow(stream_name, frame)   # трансляция: 10.42.0.1:8889/main или bottom
    finally:
        camera.stop()
        model.release()


threads = [
    threading.Thread(target=worker, args=(CameraType.MAIN, 0, "main", True)),
    threading.Thread(target=worker, args=(CameraType.OPT, 1, "bottom", False)),
]
for t in threads:
    t.start()

try:
    for t in threads:
        while t.is_alive():
            t.join(timeout=0.5)          # join с тайм-аутом позволяет поймать Ctrl+C
except KeyboardInterrupt:
    stop.set()
    for t in threads:
        t.join()
finally:
    viewer.close()
