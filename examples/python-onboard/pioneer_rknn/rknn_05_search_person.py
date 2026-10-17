import cv2
import numpy as np
import time
from pioneer_rknn import Yolo
from pioneer_sdk2 import Pioneer, Camera, CameraType

SIZE = 640
PERSON = 0                 # класс "человек" в COCO
CONFIRM = 3  # столько кадров подряд, чтобы поверить
SEARCH_TIME = 30           # секунд на поиск

pioneer = Pioneer()
model = Yolo(model_name="yolov8n")
camera = Camera(camera_type=CameraType.MAIN)
in_air = False


def prepare(frame):
    image = cv2.resize(frame, (SIZE, SIZE))
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    return np.expand_dims(image, 0)


def person_visible():
    result = model.run([prepare(camera.get_cv_frame())])
    if result is None or result[0] is None:
        return False
    boxes, classes, scores = result
    for cls, score in zip(classes, scores):
        if int(cls) == PERSON and score > 0.5:
            return True
    return False


try:
    if not pioneer.arm():
        raise SystemExit("Моторы не запустились")
    in_air = True
    pioneer.takeoff()

    state = "SEARCH"
    seen = 0
    start = time.time()
    while state == "SEARCH":
        # Медленный поворот на месте. interval короткий: если
        # программа зависнет, дрон через 0.5 с остановится сам.
        pioneer.set_manual_speed(vx=0, vy=0, vz=0,
                                 yaw_rate=0.3, interval=0.5)
        seen = seen + 1 if person_visible() else 0
        if seen >= CONFIRM:
            state = "FOUND"
        elif time.time() - start > SEARCH_TIME:
            state = "NOT_FOUND"

    pioneer.set_manual_speed(vx=0, vy=0, vz=0,
                             yaw_rate=0, interval=0.5)
    if state == "FOUND":
        print("Человек найден")
        pioneer.led_control(r=0, g=1, b=0)
    else:
        print("Никого не нашли")
        pioneer.led_control(r=1, g=0, b=0)
    time.sleep(3)

    pioneer.land()
    in_air = False
finally:
    if in_air:
        pioneer.land()
    pioneer.disarm()
    pioneer.led_control()
    model.release()
    camera.stop()
    pioneer.close_connection()
