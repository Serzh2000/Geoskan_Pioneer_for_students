import cv2
import numpy as np
from pioneer_rknn import Yolo
from pioneer_sdk2 import Camera, CameraType, ImageViewer

SIZE = 640  # вход модели 640 x 640
# часть классов COCO
NAMES = {0: "person", 2: "car", 16: "dog", 39: "bottle"}

# модель из регистра на дроне
model = Yolo(model_name="yolov8n")
camera = Camera(camera_type=CameraType.MAIN)
viewer = ImageViewer()


def prepare(frame):
    """Кадр камеры -> вход нейросети: 640x640, цвета RGB."""
    image = cv2.resize(frame, (SIZE, SIZE))
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    # пакет из одного изображения
    return np.expand_dims(image, 0)


def detections(result):
    """Ответ Yolo -> список (рамка, класс, уверенность).

    Рамка - (x1, y1, x2, y2) в пикселях входа 640x640.
    Если объектов нет, модель возвращает None.
    """
    if result is None or result[0] is None:
        return []
    boxes, classes, scores = result
    return list(zip(boxes, classes, scores))


try:
    while True:
        frame = camera.get_cv_frame()
        h, w = frame.shape[:2]
        # масштаб обратно к кадру камеры
        kx, ky = w / SIZE, h / SIZE

        result = model.run([prepare(frame)])
        for (x1, y1, x2, y2), cls, score in detections(result):
            p1 = (int(x1 * kx), int(y1 * ky))
            p2 = (int(x2 * kx), int(y2 * ky))
            name = NAMES.get(int(cls), int(cls))
            label = f"{name} {score:.2f}"
            cv2.rectangle(frame, p1, p2, (0, 255, 0), 2)
            corner = (p1[0], max(p1[1] - 8, 20))
            cv2.putText(frame, label, corner, cv2.FONT_HERSHEY_SIMPLEX,
                        0.6, (0, 255, 0), 2)

        viewer.imshow(name="stream", frame=frame)
except KeyboardInterrupt:
    print("Остановлено")
finally:
    model.release()  # освободить нейропроцессор
    camera.stop()
    viewer.close()
