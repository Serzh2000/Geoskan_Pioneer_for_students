"""Быстрый конвейер детекции: пул моделей + быстрая постобработка + быстрые ядра CPU.

Что ускоряем по сравнению с примером 17 (замеры на «Пионер Мини 2»):
  1. Постобработка. Yolo.post_process() считает DFL (exp и softmax) для всех 8400 ячеек сетки,
     а потом отбрасывает почти все. Мы сначала отбираем ячейки по порогу, а DFL считаем только
     для кандидатов: 41 мс -> 13 мс, результат тот же.
  2. Ядра CPU. У RK3576 четыре быстрых ядра Cortex-A72 (4-7) и четыре медленных A53 (0-3).
     Привязка процесса к A72 ускоряет numpy-часть в 1.5 раза.
  3. Пул моделей на двух ядрах NPU (как в примере 17): пока одна модель занята CPU, другая — NPU.

python3 18_fast_pipeline.py [число_моделей]      (по умолчанию 3)
"""
import os
import queue
import sys
import threading
import time
import cv2
import numpy as np
from pioneer_rknn import Yolo, ModelContainer
from pioneer_sdk2 import Camera, ImageViewer

SIZE = 640
WORKERS = int(sys.argv[1]) if len(sys.argv) > 1 else 3
NPU_CORES = 2
CONF, IOU = 0.25, 0.45                          # те же пороги, что у Yolo по умолчанию
GRID = np.arange(16, dtype=np.float32)[None, :, None]

os.sched_setaffinity(0, {4, 5, 6, 7})           # только быстрые ядра Cortex-A72


def fast_post(outputs):
    """Постобработка YOLOv8 (9 выходных тензоров) -> (рамки x1y1x2y2, классы, уверенности)."""
    boxes, scores, classes = [], [], []
    for i in range(3):                          # три сетки: 80x80, 40x40, 20x20
        box, cls = outputs[3 * i], outputs[3 * i + 1]          # (1,64,h,w) и (1,80,h,w)
        h, w = cls.shape[2:]
        stride = SIZE // h
        cls = cls[0].reshape(80, -1)
        best = cls.argmax(0)                                    # лучший класс каждой ячейки
        score = cls[best, np.arange(cls.shape[1])]
        idx = np.nonzero(score >= CONF)[0]                      # 1) сначала порог
        if idx.size == 0:
            continue
        d = box[0].reshape(4, 16, -1)[:, :, idx]                # 2) DFL только для кандидатов
        d = np.exp(d - d.max(1, keepdims=True))
        d = (d / d.sum(1, keepdims=True) * GRID).sum(1)         # (4, k): расстояния до сторон
        gx, gy = idx % w + 0.5, idx // w + 0.5
        boxes.append(np.stack([(gx - d[0]) * stride, (gy - d[1]) * stride,
                               (gx + d[2]) * stride, (gy + d[3]) * stride], 1))
        scores.append(score[idx])
        classes.append(best[idx])
    if not boxes:
        return None, None, None
    b, s, c = np.concatenate(boxes), np.concatenate(scores), np.concatenate(classes)
    # 3) NMS: рамки разных классов сдвигаем далеко друг от друга, чтобы они не подавляли друг друга
    bo = b + (c * 4096).astype(np.float32)[:, None]
    area = (bo[:, 2] - bo[:, 0]) * (bo[:, 3] - bo[:, 1])
    order, keep = s.argsort()[::-1], []
    while order.size:
        i, rest = order[0], order[1:]
        keep.append(i)
        xx1, yy1 = np.maximum(bo[i, 0], bo[rest, 0]), np.maximum(bo[i, 1], bo[rest, 1])
        xx2, yy2 = np.minimum(bo[i, 2], bo[rest, 2]), np.minimum(bo[i, 3], bo[rest, 3])
        inter = np.clip(xx2 - xx1, 0, None) * np.clip(yy2 - yy1, 0, None)
        order = rest[inter / (area[i] + area[rest] - inter) <= IOU]
    return b[keep], c[keep], s[keep]


camera = Camera()
viewer = ImageViewer()
print("Окно просмотра: http://10.42.0.1:8889/fast/")
tasks = queue.Queue(maxsize=WORKERS)
results = queue.Queue()
stop = threading.Event()


def worker(index):
    model = Yolo(model_name="yolov8n", npu_core=[index % NPU_CORES])
    try:
        while not stop.is_set():
            try:
                number, frame = tasks.get(timeout=0.5)
            except queue.Empty:
                continue
            tensor = np.expand_dims(cv2.resize(frame, (SIZE, SIZE)), 0)
            raw = ModelContainer.run(model, [tensor])          # только NPU, без post_process
            results.put((number, frame, fast_post(raw)))
    finally:
        model.release()


def grabber():
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
            pass                                # все модели заняты — берём следующий, более свежий кадр


threads = [threading.Thread(target=worker, args=(i,), daemon=True) for i in range(WORKERS)]
threads.append(threading.Thread(target=grabber, daemon=True))
for t in threads:
    t.start()

shown, last_number, window_start, fps = 0, -1, time.monotonic(), 0.0
try:
    while True:
        number, frame, (boxes, classes, scores) = results.get()
        if number < last_number:
            continue
        last_number = number
        if boxes is not None:
            sx, sy = frame.shape[1] / SIZE, frame.shape[0] / SIZE
            for (x1, y1, x2, y2), cl, sc in zip(boxes, classes, scores):
                p1, p2 = (int(x1 * sx), int(y1 * sy)), (int(x2 * sx), int(y2 * sy))
                cv2.rectangle(frame, p1, p2, (0, 255, 0), 2)
                cv2.putText(frame, f"{int(cl)} {sc:.2f}", (p1[0], p1[1] - 5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
        shown += 1
        if time.monotonic() - window_start >= 2.0:
            fps = shown / (time.monotonic() - window_start)
            shown, window_start = 0, time.monotonic()
            print(f"моделей: {WORKERS}  FPS: {fps:.1f}")
        cv2.putText(frame, f"fast  models {WORKERS}  FPS {fps:4.1f}", (10, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        viewer.imshow("fast", frame)   # трансляция: 10.42.0.1:8889/fast
except KeyboardInterrupt:
    pass
finally:
    stop.set()
    time.sleep(1.0)
    viewer.close()
    camera.stop()
