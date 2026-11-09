"""Фильтр по классам и порогу уверенности: счётчик людей + индикация светодиодами (дрон на земле)."""
import cv2
import numpy as np
from pioneer_rknn import Yolo
from pioneer_sdk2 import Pioneer, Camera, ImageViewer

SIZE = 640
WATCH = {0: ("person", (0, 255, 0)), 67: ("cell phone", (255, 128, 0)), 39: ("bottle", (0, 128, 255))}
#        номер класса COCO -> (название, цвет рамки BGR)
MIN_SCORE = 0.5                 # дополнительный порог поверх object_thresh модели


def detections(result):
    """Оставляет только интересующие классы с уверенностью >= MIN_SCORE."""
    if result is None or result[0] is None:
        return []
    return [(box, int(cls), float(score)) for box, cls, score in zip(*result)
            if int(cls) in WATCH and score >= MIN_SCORE]


drone = Pioneer()
drone.set_logger(False)
camera = Camera()
viewer = ImageViewer()
print("Окно просмотра: http://10.42.0.1:8889/people/")
model = Yolo(model_name="yolov8n", object_thresh=0.3)
last_people = -1

try:
    while True:
        try:
            frame = camera.get_cv_frame(timeout=1.0)
        except TimeoutError:
            continue
        if frame is None:
            continue

        found = detections(model.run([np.expand_dims(cv2.resize(frame, (SIZE, SIZE)), 0)]))
        sx, sy = frame.shape[1] / SIZE, frame.shape[0] / SIZE
        counts = {cls: 0 for cls in WATCH}
        for (x1, y1, x2, y2), cls, score in found:
            counts[cls] += 1
            name, color = WATCH[cls]
            p1 = (int(x1 * sx), int(y1 * sy))
            cv2.rectangle(frame, p1, (int(x2 * sx), int(y2 * sy)), color, 2)
            cv2.putText(frame, f"{name} {score:.0%}", (p1[0], max(p1[1] - 6, 15)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        summary = "  ".join(f"{WATCH[c][0]}: {n}" for c, n in counts.items())
        cv2.putText(frame, summary, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)
        viewer.imshow("people", frame)   # трансляция: 10.42.0.1:8889/people
        people = counts[0]
        if people != last_people:                  # светодиоды меняем только при изменении числа
            if people == 0:
                drone.led_control()                # никого — выключено
            elif people == 1:
                drone.led_control(g=1)             # один человек — зелёный
            else:
                drone.led_control(r=1, g=0.4)      # несколько — жёлтый
            print("Людей в кадре:", people)
            last_people = people
except KeyboardInterrupt:
    pass
finally:
    drone.led_control()
    viewer.close()
    camera.stop()
    model.release()
    drone.close_connection()
