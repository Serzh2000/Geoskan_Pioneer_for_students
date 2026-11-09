"""Сегментация экземпляров (YoloSeg): цветные маски и доля кадра, занятая каждым классом."""
import cv2
import numpy as np
from pioneer_rknn import YoloSeg
from pioneer_sdk2 import Camera, ImageViewer

SIZE = 640
NAMES = {0: "person", 2: "car", 5: "bus", 7: "truck", 16: "dog", 39: "bottle", 56: "chair", 63: "laptop"}
# подписываем часто встречающиеся классы COCO; остальные — номером
MASK_ALPHA = 0.5                # прозрачность масок: 0 — не видно, 1 — сплошная заливка

camera = Camera()
viewer = ImageViewer()
print("Окно просмотра: http://10.42.0.1:8889/seg/")
model = YoloSeg(model_name="yolov8n-seg", object_thresh=0.3)


def color_of(cls):
    """Один и тот же класс — всегда один и тот же цвет."""
    b, g, r = np.random.default_rng(int(cls)).integers(60, 255, size=3)
    return int(b), int(g), int(r)


def overlay_masks(frame, boxes, classes, scores, masks):
    """Накладывает маски и возвращает словарь {класс: доля площади кадра}.

    YoloSeg возвращает маски размером 640x640 (уже обрезанные по рамке) — растягиваем их до кадра.
    """
    h, w = frame.shape[:2]
    overlay = frame.copy()
    union = {}                                       # объединённая маска по каждому классу
    for box, cls, score, mask in zip(boxes, classes, scores, masks):
        mask_full = cv2.resize(np.asarray(mask).astype(np.uint8), (w, h), interpolation=cv2.INTER_NEAREST)
        name = NAMES.get(int(cls), f"class {int(cls)}")
        union[name] = np.maximum(union.get(name, np.zeros((h, w), np.uint8)), mask_full)
        overlay[mask_full == 1] = color_of(cls)
        contours, _ = cv2.findContours(mask_full, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(frame, contours, -1, color_of(cls), 2)
        x1, y1 = int(box[0] * w / SIZE), int(box[1] * h / SIZE)
        cv2.putText(frame, f"{name} {score:.2f}", (x1, max(y1 - 6, 15)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, color_of(cls), 2)
    cv2.addWeighted(overlay, MASK_ALPHA, frame, 1 - MASK_ALPHA, 0, dst=frame)
    return {name: float(m.mean()) for name, m in union.items()}      # среднее 0/1 = доля пикселей


try:
    while True:
        try:
            frame = camera.get_cv_frame(timeout=1.0)
        except TimeoutError:
            continue
        if frame is None:
            continue

        result = model.run([np.expand_dims(cv2.resize(frame, (SIZE, SIZE)), 0)])  # 4 массива или None
        if result is not None and result[0] is not None:
            shares = overlay_masks(frame, *result)
            for i, (name, share) in enumerate(sorted(shares.items(), key=lambda kv: -kv[1])):
                cv2.putText(frame, f"{name}: {share:.1%}", (10, 25 + 25 * i),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)
        viewer.imshow("seg", frame)   # трансляция: 10.42.0.1:8889/seg
except KeyboardInterrupt:
    pass
finally:
    viewer.close()
    camera.stop()
    model.release()
