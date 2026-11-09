img = None
people = None
import cv2
import os
import sys
from collections import defaultdict
import numpy as np
queries_dict: defaultdict = defaultdict(set)
images = {}

def model_name_picker(name: str):
    if name == "Yolo":
        return "yolov8n"
    elif name == "YoloPose":
        return "yolov8n-pose"
    elif name == "PaddleOCR":
        return "PP-OCRv5_mobile_det", "eslav_PP-OCRv5_mobile_rec"

from pioneer_rknn import Yolo
classNames_yolo = ["person", "bicycle", "car", "motorbike", "aeroplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
    "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella",
    "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball", "kite", "baseball bat",
    "baseball glove", "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
    "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange", "broccoli",
    "carrot", "hot dog", "pizza", "donut", "cake", "chair", "sofa", "pottedplant", "bed",
    "diningtable", "toilet", "tvmonitor", "laptop", "mouse", "remote", "keyboard", "cell phone",
    "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors",
    "teddy bear", "hair drier", "toothbrush"]

def resize_img_yolo(img):
    img_copy = cv2.resize(img, IMG_SIZE)
    img_copy = np.expand_dims(img_copy, 0)
    return img_copy


def yolo_find_on_image(img, results, classNames, class_filter=None, score_thr=None):
    boxes, classes, scores = results
    if boxes is None or classes is None or scores is None or len(boxes) == 0:
        return {
            "boxes": np.zeros((0, 4), dtype=np.float32),
            "classes": np.zeros((0,), dtype=np.int32),
            "scores": np.zeros((0,), dtype=np.float32),
            "orig_shape": img.shape[:2],
            "classNames": classNames
        }

    boxes = np.array(boxes)
    classes = np.array(classes)
    scores = np.array(scores)

    indices = np.arange(len(boxes))
    if class_filter is not None:
        allowed = [classNames.index(cls_name) for cls_name in class_filter if cls_name in classNames]
        indices = [i for i in indices if classes[i] in allowed]
    if score_thr is not None:
        indices = [i for i in indices if scores[i] >= score_thr]

    return {
        "boxes": boxes[indices],
        "classes": classes[indices],
        "scores": scores[indices],
        "orig_shape": img.shape[:2],
        "classNames": classNames
    }

def draw_yolo_on_image(img, yolo_obj, color=(0,255,0), thickness=2):
    boxes = yolo_obj["boxes"]
    classes = yolo_obj["classes"]
    # scores = yolo_obj["scores"]
    classNames = yolo_obj["classNames"]
    orig_h, orig_w = yolo_obj["orig_shape"]
    scale_x = orig_w / IMG_SIZE[0]
    scale_y = orig_h / IMG_SIZE[1]

    for box, cl in zip(boxes, classes): # for box, cl, score in zip(boxes, classes, scores):
        left, top, right, bottom = [int(coord) for coord in box]
        left   = int(left * scale_x)
        right  = int(right * scale_x)
        top    = int(top * scale_y)
        bottom = int(bottom * scale_y)
        cv2.rectangle(img, (left, top), (right, bottom), color, thickness)
        label = f"{classNames[cl]}" # {score:.2f}
        cv2.putText(img, label, (left, top-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)

from pioneer_sdk2 import Camera, ImageViewer, CameraType

cam_main, cam_opt = Camera(camera_type=CameraType.MAIN), Camera(camera_type=CameraType.OPT)
iv = ImageViewer()
cams_dict = {}
cams_dict["img"] = "cam_main"
queries_dict["img"].add("person")


_infer_cache_per_frame = {}

def infer_cache_per_frame(cache_key, frame, infer_fn):
    frame_id = id(frame)
    cached = _infer_cache_per_frame.get(cache_key)
    if cached is None or cached["frame_id"] != frame_id:
        cached = {
            "frame_id": frame_id,
            "result": infer_fn(frame),
        }
        _infer_cache_per_frame[cache_key] = cached
    return cached["result"]


def hex_to_bgr(hex_color: str) -> tuple[int, int, int]:
    if hex_color.startswith("#"):
        hex_color = hex_color[1:]
    if len(hex_color) != 6:
        raise ValueError("Hex color must be in format #RRGGBB")

    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)

    return (b, g, r)


print("Начало программы")
try:
    print("Выбрана модель:Yolo")
    IMG_SIZE = (640, 640)

    model_yolo = Yolo(model_name=model_name_picker("Yolo"))
    while True:
      img = cam_main.get_cv_frame()

      people = yolo_find_on_image(img, (results_img := infer_cache_per_frame("results_img", img, lambda fr: model_yolo.run([resize_img_yolo(fr)]))), classNames_yolo, class_filter=["person"])

      draw_yolo_on_image(img, people, hex_to_bgr("#00ff00"))
      iv.imshow(name='people', frame=img)
except Exception as e:
    print(e)
finally:
    pio = locals().get("pioneer")
    if pio is not None:
        try:
            pio.wait_callback = False
            pio.land()
            pio.close_connection()
        except Exception:
            pass

    for cam_name in ("cam_main", "cam_opt"):
        cam = locals().get(cam_name)
        if cam is not None:
            try:
                cam.stop()
            except Exception:
                pass

    viewer = locals().get("iv")
    if viewer is not None:
        try:
            viewer.close()
        except Exception:
            pass
        del viewer

    if pio is not None:
        del pio
    print("Конец программы")