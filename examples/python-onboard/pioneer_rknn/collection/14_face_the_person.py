"""Полёт: дрон висит на месте и поворачивается к ближайшему человеку (Yolo + П-регулятор по курсу)."""
import time
import cv2
import numpy as np
from pioneer_rknn import Yolo
from pioneer_sdk2 import Pioneer, Camera, ImageViewer

SIZE = 640
PERSON = 0                      # индекс класса "person" в COCO
HEIGHT = 1.5                    # рабочая высота, м
KP_YAW = 0.003                  # рад/с на пиксель отклонения
MAX_YAW = 0.5                   # ограничение скорости поворота, рад/с
DEAD_ZONE = 30                  # пикселей
COMMAND_INTERVAL = 0.3


def biggest_person(result, frame_shape):
    if result is None or result[0] is None:
        return None
    sx, sy = frame_shape[1] / SIZE, frame_shape[0] / SIZE        # рамки приходят в координатах 640x640
    people = [(int(x1 * sx), int(y1 * sy), int(x2 * sx), int(y2 * sy))
              for (x1, y1, x2, y2), c in zip(result[0], result[1]) if int(c) == PERSON]
    return max(people, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]), default=None)


def yaw_rate_for(box, frame_width):
    error = frame_width / 2 - (box[0] + box[2]) / 2     # >0 — человек левее центра
    if abs(error) < DEAD_ZONE:
        return 0.0
    return float(np.clip(KP_YAW * error, -MAX_YAW, MAX_YAW))   # положительный yaw_rate — поворот влево


drone = Pioneer()
drone.set_logger(False)
camera = Camera()
viewer = ImageViewer()
print("Окно просмотра: http://10.42.0.1:8889/follow/")
model = Yolo(model_name="yolov8n", object_thresh=0.4)

try:
    drone.arm()
    drone.takeoff()
    drone.go_to_local_point(x=0, y=0, z=HEIGHT, yaw=0, time=0)
    while not drone.point_reached():
        time.sleep(0.1)

    while True:
        try:
            frame = camera.get_cv_frame(timeout=0.3)
        except TimeoutError:
            frame = None
        if frame is None:
            drone.set_manual_speed_body_fixed(0, 0, 0, 0, COMMAND_INTERVAL)   # нет кадра — висим
            continue

        box = biggest_person(model.run([np.expand_dims(cv2.resize(frame, (SIZE, SIZE)), 0)]), frame.shape)
        yaw_rate = 0.0 if box is None else yaw_rate_for(box, frame.shape[1])
        drone.set_manual_speed_body_fixed(0, 0, 0, yaw_rate, COMMAND_INTERVAL)

        if box is not None:
            cv2.rectangle(frame, box[:2], box[2:], (0, 255, 0), 2)
        cv2.putText(frame, f"yaw_rate={yaw_rate:+.2f}", (10, 25), cv2.FONT_HERSHEY_SIMPLEX,
                    0.7, (0, 255, 255), 2)
        viewer.imshow("follow", frame)   # трансляция: 10.42.0.1:8889/follow
except KeyboardInterrupt:
    pass
finally:
    if drone.get_fly_state().name == "IN_SKY":
        drone.set_manual_speed_body_fixed(0, 0, 0, 0, COMMAND_INTERVAL)
        drone.land()
    viewer.close()
    camera.stop()
    model.release()
    drone.close_connection()
