img = None
ocr = None
text = None
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

from pioneer_rknn import PaddleOCR
from pioneer_sdk2 import Camera, ImageViewer, CameraType

cam_main, cam_opt = Camera(camera_type=CameraType.MAIN), Camera(camera_type=CameraType.OPT)
iv = ImageViewer()
cams_dict = {}
cams_dict["img"] = "cam_main"

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

from time import sleep

print("Начало программы")
try:
    print("Выбрана модель:PaddleOCR")
    model_ppocr = PaddleOCR(det_model_name=model_name_picker("PaddleOCR")[0],
                      rec_model_name=model_name_picker("PaddleOCR")[1])
    while True:
      img = cam_main.get_cv_frame()

      ocr = [results_ppocr_img := infer_cache_per_frame("results_ppocr_img", img, lambda fr: model_ppocr.run(fr))]
      text = "\n".join([text for group in ocr[0][1] for (text, _) in group])
      print(text)
      iv.imshow(name='ocr', frame=img)
      sleep(1)
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