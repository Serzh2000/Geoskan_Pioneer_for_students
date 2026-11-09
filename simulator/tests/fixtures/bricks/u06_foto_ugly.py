img = None
from pioneer_sdk2 import ServoCamera
servo = ServoCamera()
from time import sleep
import cv2
import numpy as np
from pioneer_sdk2 import Camera, ImageViewer, CameraType

cam_main, cam_opt = Camera(camera_type=CameraType.MAIN), Camera(camera_type=CameraType.OPT)
iv = ImageViewer()
cams_dict = {}
cams_dict["img"] = "cam_main"

print("Начало программы")
try:
    servo.set_angle(angle=15)
    sleep(2)
    img = cam_main.get_cv_frame()

    cv2.imwrite("/mnt/media/photos/" + 'ugol_plus15' + ".jpg", img.copy())
    servo.set_angle(angle=-45)
    sleep(2)
    img = cam_main.get_cv_frame()

    cv2.imwrite("/mnt/media/photos/" + 'ugol_minus45' + ".jpg", img.copy())
    servo.set_angle(angle=0)
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