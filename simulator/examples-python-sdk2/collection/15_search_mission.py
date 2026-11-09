"""Поисковая миссия: облёт точек, осмотр с поворотом на месте, фото и «маячок» при находке.

Ищем объект класса TARGET_ID (по умолчанию человек). Найденные кадры сохраняются в папку.
"""
import math
import os
import time
import cv2
import numpy as np
from pioneer_rknn import Yolo
from pioneer_sdk2 import Pioneer, Camera, ServoCamera, ImageViewer

SIZE = 640
TARGET_ID = 0                   # номер класса COCO: 0 — "person", 2 — "car", 16 — "dog"
MIN_SCORE = 0.55
SEARCH_POINTS = [(0, 0), (1.5, 0), (1.5, 1.5), (0, 1.5)]
HEIGHT = 1.6
HEADINGS = 4                    # в каждой точке осматриваемся в 4 направлениях
OUT_DIR = time.strftime("finds_%Y%m%d_%H%M%S")

drone = Pioneer()
drone.set_logger(False)
camera = Camera()
viewer = ImageViewer()                     # окно просмотра: http://10.42.0.1:8889/search/
print("Окно просмотра: http://10.42.0.1:8889/search/")
servo = ServoCamera()
model = Yolo(model_name="yolov8n")


def go(x, y, yaw):
    drone.go_to_local_point(x=x, y=y, z=HEIGHT, yaw=yaw, time=0)
    started = time.monotonic()
    while not drone.point_reached() and time.monotonic() - started < 15:
        time.sleep(0.1)


def look_for_target():
    """Берёт свежий кадр и возвращает (кадр, список рамок цели)."""
    frame = None
    for _ in range(3):                                   # пропускаем кадры, снятые во время поворота
        try:
            frame = camera.get_cv_frame(timeout=1.0)
        except TimeoutError:
            pass
    if frame is None:
        return None, []
    result = model.run([np.expand_dims(cv2.resize(frame, (SIZE, SIZE)), 0)])
    if result is None or result[0] is None:
        return frame, []
    sx, sy = frame.shape[1] / SIZE, frame.shape[0] / SIZE
    found = [(int(x1 * sx), int(y1 * sy), int(x2 * sx), int(y2 * sy))
             for (x1, y1, x2, y2), c, s in zip(*result) if int(c) == TARGET_ID and s >= MIN_SCORE]
    shown = frame.copy()
    for x1, y1, x2, y2 in found:
        cv2.rectangle(shown, (x1, y1), (x2, y2), (0, 0, 255), 3)
    viewer.imshow("search", shown, fps=10)              # трансляция: 10.42.0.1:8889/search
    return frame, found


def beacon(times=3):
    for _ in range(times):
        drone.led_control(r=1)
        time.sleep(0.25)
        drone.led_control()
        time.sleep(0.25)


finds = 0
try:
    os.makedirs(OUT_DIR, exist_ok=True)
    servo.set_angle(-20)                                 # смотрим немного вниз
    drone.arm()
    drone.takeoff()
    for n, (x, y) in enumerate(SEARCH_POINTS, start=1):
        for h in range(HEADINGS):
            yaw = 2 * math.pi * h / HEADINGS
            go(x, y, yaw)
            time.sleep(0.8)                              # стабилизация перед кадром
            frame, boxes = look_for_target()
            if boxes:
                finds += 1
                for x1, y1, x2, y2 in boxes:
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
                name = os.path.join(OUT_DIR, f"p{n}_h{h}_{len(boxes)}.jpg")
                cv2.imwrite(name, frame)
                print(f"Точка {n}, направление {h}: найдено {len(boxes)} -> {name}")
                beacon()
    go(*SEARCH_POINTS[0], 0)
    drone.land()
    print(f"Миссия завершена, находок: {finds}")
finally:
    if drone.get_fly_state().name == "IN_SKY":
        drone.land()
    servo.set_angle(0)
    drone.led_control()
    viewer.close()
    camera.stop()
    model.release()
    drone.close_connection()
