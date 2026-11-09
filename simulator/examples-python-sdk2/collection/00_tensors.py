"""Что такое тензор: формы данных на входе и выходе нейросетей Pioneer-RKNN.

python3 00_tensors.py bus.jpg

Программа ничего не рисует — она печатает формы массивов на каждом шаге:
кадр -> входной тензор -> «сырые» выходы NPU -> результат после постобработки.
"""
import sys
import time
import cv2
import numpy as np
from pioneer_rknn import Yolo, YoloSeg, YoloPose, ModelContainer
from pioneer_sdk2 import ImageViewer

image = cv2.imread(sys.argv[1] if len(sys.argv) > 1 else "bus.jpg")
shown = image.copy()                                   # кадр для окна просмотра — на него допишем формы
print("Изображение (H, W, каналы BGR):", image.shape, image.dtype)
print("Пиксель в точке (100, 200), значения B, G, R:", image[100, 200])

tensor = np.expand_dims(cv2.resize(image, (640, 640)), 0)
print("Входной тензор (batch, H, W, каналы):", tensor.shape, "— элементов:", tensor.size)

for cls, name in ((Yolo, "yolov8n"), (YoloSeg, "yolov8n-seg"), (YoloPose, "yolov8n-pose")):
    model = cls(model_name=name, npu_core=[0])
    raw = ModelContainer.run(model, [tensor])          # только NPU, без постобработки
    print(f"\n{name}: {len(raw)} выходных тензоров")
    for out in raw:
        print("   ", tuple(np.asarray(out).shape))
    result = model.run([tensor])                       # NPU + постобработка библиотеки
    if cls is YoloPose:
        print("  после постобработки: людей", len(result), "| ключевые точки первого:",
              np.asarray(result[0].keypoint).reshape(-1, 3).shape if result else None)
    elif result is not None and result[0] is not None:
        print("  после постобработки:", [tuple(np.asarray(r).shape) for r in result])
    line = f"{name}: {len(raw)} outputs, first {tuple(np.asarray(raw[0]).shape)}"
    cv2.putText(shown, line, (10, 30 + 30 * [Yolo, YoloSeg, YoloPose].index(cls)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
    model.release()

# Окно просмотра: входное изображение и формы выходов (15 секунд)
viewer = ImageViewer()
print("Окно просмотра: http://10.42.0.1:8889/tensors/")
end = time.time() + 15
while time.time() < end:
    viewer.imshow("tensors", shown, fps=10)            # трансляция: 10.42.0.1:8889/tensors
    time.sleep(0.1)
viewer.close()
