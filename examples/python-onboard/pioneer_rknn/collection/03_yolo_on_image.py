"""Первый инференс: детекция объектов на изображении из файла.

python3 03_yolo_on_image.py bus.jpg   ->  bus_detected.jpg + окно просмотра http://10.42.0.1:8889/detect/
"""
import sys
import time
import cv2
import numpy as np
from pioneer_rknn import Yolo
from pioneer_sdk2 import ImageViewer

# Названия 80 классов набора COCO: номер класса в ответе Yolo — индекс в этом списке.
# В pioneer_rknn списка нет, поэтому (как и в официальных примерах Геоскана) держим его в программе.
CLASSES = ("person,bicycle,car,motorbike,aeroplane,bus,train,truck,boat,traffic light,fire hydrant,"
           "stop sign,parking meter,bench,bird,cat,dog,horse,sheep,cow,elephant,bear,zebra,giraffe,"
           "backpack,umbrella,handbag,tie,suitcase,frisbee,skis,snowboard,sports ball,kite,baseball bat,"
           "baseball glove,skateboard,surfboard,tennis racket,bottle,wine glass,cup,fork,knife,spoon,bowl,"
           "banana,apple,sandwich,orange,broccoli,carrot,hot dog,pizza,donut,cake,chair,sofa,pottedplant,"
           "bed,diningtable,toilet,tvmonitor,laptop,mouse,remote,keyboard,cell phone,microwave,oven,"
           "toaster,sink,refrigerator,book,clock,vase,scissors,teddy bear,hair drier,toothbrush").split(",")
SIZE = 640                                  # вход модели: 640x640
SHOW_SECONDS = 30                           # сколько секунд показывать результат в окне просмотра

path = sys.argv[1] if len(sys.argv) > 1 else "bus.jpg"
image = cv2.imread(path)                    # OpenCV читает в формате BGR
if image is None:
    raise SystemExit(f"Не удалось прочитать {path}")

model = Yolo(model_name="yolov8n", npu_core=[0], object_thresh=0.25, nms_thresh=0.45)
viewer = ImageViewer()                      # создаем экземпляр класса ImageViewer

try:
    tensor = np.expand_dims(cv2.resize(image, (SIZE, SIZE)), 0)   # (1, 640, 640, 3)
    started = time.perf_counter()
    result = model.run([tensor])            # (boxes, classes, scores) или None
    elapsed_ms = (time.perf_counter() - started) * 1000
    print(f"Инференс + постобработка: {elapsed_ms:.1f} мс")

    if result is None or result[0] is None:
        print("Объекты не найдены")
    else:
        boxes, classes, scores = result
        sx, sy = image.shape[1] / SIZE, image.shape[0] / SIZE   # рамки приходят в координатах 640x640
        print(f"Найдено объектов: {len(boxes)}")
        for (x1, y1, x2, y2), cls, score in zip(boxes, classes, scores):
            x1, y1, x2, y2 = int(x1 * sx), int(y1 * sy), int(x2 * sx), int(y2 * sy)
            name = CLASSES[int(cls)]
            print(f"  {name:<12} {score:.2f}  рамка=({x1}, {y1}, {x2}, {y2})")
            cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(image, f"{name} {score:.2f}", (x1, max(y1 - 6, 15)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    out_path = path.rsplit(".", 1)[0] + "_detected.jpg"
    cv2.imwrite(out_path, image)
    print("Результат сохранён в", out_path)

    print(f"Окно просмотра: http://10.42.0.1:8889/detect/  ({SHOW_SECONDS} с)")
    end = time.time() + SHOW_SECONDS
    while time.time() < end:                 # трансляции нужен поток кадров, поэтому повторяем картинку
        viewer.imshow("detect", image, fps=10)   # трансляция выполняется по адресу: 10.42.0.1:8889/detect
        time.sleep(0.1)
except KeyboardInterrupt:
    pass
finally:
    viewer.close()                          # останавливаем видеопоток
    model.release()                         # освобождаем NPU
