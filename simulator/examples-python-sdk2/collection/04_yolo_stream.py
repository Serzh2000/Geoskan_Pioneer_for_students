"""Детекция объектов в видеопотоке с основной камеры; результат — RTSP-поток /detect/."""
import time
import cv2
import numpy as np
from pioneer_rknn import Yolo
from pioneer_sdk2 import Camera, CameraType, ImageViewer

CLASSES = ("person,bicycle,car,motorbike,aeroplane,bus,train,truck,boat,traffic light,fire hydrant,"
           "stop sign,parking meter,bench,bird,cat,dog,horse,sheep,cow,elephant,bear,zebra,giraffe,"
           "backpack,umbrella,handbag,tie,suitcase,frisbee,skis,snowboard,sports ball,kite,baseball bat,"
           "baseball glove,skateboard,surfboard,tennis racket,bottle,wine glass,cup,fork,knife,spoon,bowl,"
           "banana,apple,sandwich,orange,broccoli,carrot,hot dog,pizza,donut,cake,chair,sofa,pottedplant,"
           "bed,diningtable,toilet,tvmonitor,laptop,mouse,remote,keyboard,cell phone,microwave,oven,"
           "toaster,sink,refrigerator,book,clock,vase,scissors,teddy bear,hair drier,toothbrush").split(",")
SIZE = 640

camera = Camera(camera_type=CameraType.MAIN)
viewer = ImageViewer()                       # создаем экземпляр класса ImageViewer
print("Окно просмотра: http://10.42.0.1:8889/detect/")
model = Yolo(model_name="yolov8n")
fps, last = 0.0, time.monotonic()

try:
    while True:
        try:
            frame = camera.get_cv_frame(timeout=1.0)
        except TimeoutError:
            continue
        if frame is None:
            continue

        result = model.run([np.expand_dims(cv2.resize(frame, (SIZE, SIZE)), 0)])
        count = 0
        if result is not None and result[0] is not None:
            sx, sy = frame.shape[1] / SIZE, frame.shape[0] / SIZE
            for (x1, y1, x2, y2), cls, score in zip(*result):
                p1, p2 = (int(x1 * sx), int(y1 * sy)), (int(x2 * sx), int(y2 * sy))
                cv2.rectangle(frame, p1, p2, (0, 255, 0), 2)
                cv2.putText(frame, f"{CLASSES[int(cls)]} {score:.2f}", (p1[0], max(p1[1] - 6, 15)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                count += 1

        now = time.monotonic()
        fps = 0.9 * fps + 0.1 / max(now - last, 1e-3)   # сглаженный FPS
        last = now
        cv2.putText(frame, f"FPS {fps:4.1f}  objects {count}", (10, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        viewer.imshow("detect", frame)   # трансляция: 10.42.0.1:8889/detect
except KeyboardInterrupt:
    pass
finally:
    viewer.close()
    camera.stop()
    model.release()
