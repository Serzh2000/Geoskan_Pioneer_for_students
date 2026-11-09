"""Эксперимент: как пороги object_thresh и nms_thresh влияют на число найденных объектов.

python3 06_threshold_experiment.py bus.jpg

Модель загружается один раз: пороги — обычные атрибуты объекта Yolo, их можно менять на лету.
Каждая пара порогов показывается в окне просмотра http://10.42.0.1:8889/thresholds/ — видно, как
появляются и исчезают рамки.
"""
import sys
import time
import cv2
import numpy as np
from pioneer_rknn import Yolo
from pioneer_sdk2 import ImageViewer

OBJECT_THRESHOLDS = [0.10, 0.25, 0.40, 0.60, 0.80]
NMS_THRESHOLDS = [0.30, 0.45, 0.70, 0.95]
SIZE = 640
SHOW_EACH = 1.5                     # секунд показываем каждую пару порогов

image = cv2.imread(sys.argv[1] if len(sys.argv) > 1 else "bus.jpg")
if image is None:
    raise SystemExit("Не удалось прочитать изображение")
tensor = np.expand_dims(cv2.resize(image, (SIZE, SIZE)), 0)
sx, sy = image.shape[1] / SIZE, image.shape[0] / SIZE

model = Yolo(model_name="yolov8n")
viewer = ImageViewer()
print("Окно просмотра: http://10.42.0.1:8889/thresholds/")
table = {}
try:
    for obj_t in OBJECT_THRESHOLDS:
        for nms_t in NMS_THRESHOLDS:
            model.object_thresh, model.nms_thresh = obj_t, nms_t
            result = model.run([tensor])
            boxes = [] if result is None or result[0] is None else result[0]
            table[(obj_t, nms_t)] = len(boxes)

            frame = image.copy()
            for x1, y1, x2, y2 in boxes:
                cv2.rectangle(frame, (int(x1 * sx), int(y1 * sy)), (int(x2 * sx), int(y2 * sy)), (0, 255, 0), 2)
            cv2.putText(frame, f"object={obj_t:.2f} nms={nms_t:.2f} -> {len(boxes)}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
            end = time.time() + SHOW_EACH
            while time.time() < end:
                viewer.imshow("thresholds", frame, fps=10)   # трансляция: 10.42.0.1:8889/thresholds
                time.sleep(0.1)
finally:
    viewer.close()
    model.release()

# Строки — object_thresh, столбцы — nms_thresh
print("object \\ nms " + "".join(f"{n:>8.2f}" for n in NMS_THRESHOLDS))
for obj_t in OBJECT_THRESHOLDS:
    print(f"{obj_t:>12.2f} " + "".join(f"{table[(obj_t, n)]:>8d}" for n in NMS_THRESHOLDS))
