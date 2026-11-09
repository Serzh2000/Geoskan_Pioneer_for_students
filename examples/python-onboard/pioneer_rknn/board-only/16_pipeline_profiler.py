"""Профилирование конвейера и ускорение за счёт параллельности.

Режим 1 (последовательный): захват -> подготовка -> инференс -> отрисовка в одном цикле.
Режим 2 (конвейер): отдельный поток всегда держит самый свежий кадр, основной поток только считает.
python3 16_pipeline_profiler.py [seq|pipe]
"""
import sys
import threading
import time
from collections import defaultdict
import cv2
import numpy as np
from pioneer_rknn import Yolo
from pioneer_sdk2 import Camera, ImageViewer

FRAMES = 200
SIZE = 640


class Stopwatch:
    """Накапливает время по именованным этапам: with sw("infer"): ..."""

    def __init__(self):
        self.total = defaultdict(float)
        self.count = defaultdict(int)

    def __call__(self, stage):
        sw = self

        class _Ctx:
            def __enter__(self):
                self.t = time.perf_counter()

            def __exit__(self, *exc):
                sw.total[stage] += time.perf_counter() - self.t
                sw.count[stage] += 1
        return _Ctx()

    def report(self, wall):
        print(f"\n{'этап':<10}{'среднее, мс':>14}{'доля':>8}")
        for stage, total in self.total.items():
            print(f"{stage:<10}{1000 * total / self.count[stage]:>14.1f}{total / wall:>8.0%}")


class LatestFrame(threading.Thread):
    """Фоновый захват: хранит только последний кадр, старые выбрасывает."""

    def __init__(self, camera):
        super().__init__(daemon=True)
        self.camera, self.frame, self.lock, self.running = camera, None, threading.Lock(), True
        self.fresh = threading.Event()

    def run(self):
        while self.running:
            try:
                frame = self.camera.get_cv_frame(timeout=1.0)
            except TimeoutError:
                continue
            if frame is not None:
                with self.lock:
                    self.frame = frame
                self.fresh.set()

    def get(self):
        self.fresh.wait()
        self.fresh.clear()
        with self.lock:
            return self.frame


mode = sys.argv[1] if len(sys.argv) > 1 else "seq"
camera, viewer = Camera(), ImageViewer()
print("Окно просмотра: http://10.42.0.1:8889/profile/")
model = Yolo(model_name="yolov8n")
sw = Stopwatch()
grabber = LatestFrame(camera) if mode == "pipe" else None
if grabber:
    grabber.start()

start = time.perf_counter()
try:
    for _ in range(FRAMES):
        with sw("capture"):
            frame = grabber.get() if grabber else camera.get_cv_frame(timeout=1.0)
        if frame is None:
            continue
        with sw("prepare"):
            tensor = np.expand_dims(cv2.resize(frame, (SIZE, SIZE)), 0)
        with sw("infer"):
            result = model.run([tensor])
        with sw("draw"):
            if result is not None and result[0] is not None:
                sx, sy = frame.shape[1] / SIZE, frame.shape[0] / SIZE
                for x1, y1, x2, y2 in result[0]:
                    cv2.rectangle(frame, (int(x1 * sx), int(y1 * sy)), (int(x2 * sx), int(y2 * sy)), (0, 255, 0), 2)
            viewer.imshow("profile", frame)   # трансляция: 10.42.0.1:8889/profile
finally:
    wall = time.perf_counter() - start
    if grabber:
        grabber.running = False
    print(f"Режим {mode}: {FRAMES} кадров за {wall:.1f} с -> {FRAMES / wall:.1f} FPS")
    sw.report(wall)
    viewer.close()
    camera.stop()
    model.release()
