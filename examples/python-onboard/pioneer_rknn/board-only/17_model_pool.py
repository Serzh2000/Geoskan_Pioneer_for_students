"""Пул моделей: несколько экземпляров Yolo в нескольких потоках — в 2 раза больше кадров в секунду.

Почему это работает: у Yolo.run() примерно половина времени — вычисления на NPU, половина —
постобработка на CPU (numpy). Пока одна модель занята постобработкой, другая уже считает на NPU,
а два ядра NPU RK3576 работают одновременно.

python3 17_model_pool.py [число_моделей]      (по умолчанию 3)
"""
import queue
import sys
import threading
import time
import cv2
import numpy as np
from pioneer_rknn import Yolo
from pioneer_sdk2 import Camera, ImageViewer

SIZE = 640
WORKERS = int(sys.argv[1]) if len(sys.argv) > 1 else 3
NPU_CORES = 2                                   # у RK3576 два ядра NPU: 0 и 1

camera = Camera()
viewer = ImageViewer()
print("Окно просмотра: http://10.42.0.1:8889/pool/")
tasks = queue.Queue(maxsize=WORKERS)            # кадры, ожидающие обработки
results = queue.Queue()                         # (номер кадра, кадр, результат)
stop = threading.Event()


def worker(index):
    """Своя модель на своём ядре NPU: ядра раздаются по кругу 0, 1, 0, ..."""
    model = Yolo(model_name="yolov8n", npu_core=[index % NPU_CORES])
    try:
        while not stop.is_set():
            try:
                number, frame = tasks.get(timeout=0.5)
            except queue.Empty:
                continue
            result = model.run([np.expand_dims(cv2.resize(frame, (SIZE, SIZE)), 0)])
            results.put((number, frame, result))
    finally:
        model.release()


def grabber():
    """Захват кадров: если все модели заняты, лишний кадр выбрасывается (берём свежий)."""
    number = 0
    while not stop.is_set():
        try:
            frame = camera.get_cv_frame(timeout=1.0)
        except TimeoutError:
            continue
        if frame is None:
            continue
        try:
            tasks.put_nowait((number, frame))
            number += 1
        except queue.Full:
            pass


threads = [threading.Thread(target=worker, args=(i,), daemon=True) for i in range(WORKERS)]
threads.append(threading.Thread(target=grabber, daemon=True))
for t in threads:
    t.start()

shown, last_number, window_start = 0, -1, time.monotonic()
fps = 0.0
try:
    while True:
        number, frame, result = results.get()
        if number < last_number:                # кадр «обогнали» более новые — не показываем
            continue
        last_number = number
        if result is not None and result[0] is not None:
            sx, sy = frame.shape[1] / SIZE, frame.shape[0] / SIZE
            for x1, y1, x2, y2 in result[0]:
                cv2.rectangle(frame, (int(x1 * sx), int(y1 * sy)), (int(x2 * sx), int(y2 * sy)), (0, 255, 0), 2)
        shown += 1
        if time.monotonic() - window_start >= 2.0:          # FPS за последние 2 секунды
            fps = shown / (time.monotonic() - window_start)
            shown, window_start = 0, time.monotonic()
            print(f"моделей: {WORKERS}  FPS: {fps:.1f}")
        cv2.putText(frame, f"models {WORKERS}  FPS {fps:4.1f}", (10, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        viewer.imshow("pool", frame)   # трансляция: 10.42.0.1:8889/pool
except KeyboardInterrupt:
    pass
finally:
    stop.set()
    time.sleep(1.0)                             # даём потокам освободить модели
    viewer.close()
    camera.stop()
