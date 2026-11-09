img = None
markers = None
import cv2
import numpy as np
from pioneer_sdk2 import Camera, ImageViewer, CameraType

cam_main, cam_opt = Camera(camera_type=CameraType.MAIN), Camera(camera_type=CameraType.OPT)
iv = ImageViewer()
cams_dict = {}
cams_dict["img"] = "cam_main"
import cv2.aruco

def aruco_find_on_image(img_name, img, family):
    dict_ = cv2.aruco.getPredefinedDictionary(family)
    detector = cv2.aruco.ArucoDetector(dict_, cv2.aruco.DetectorParameters())
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    corners, ids, _ = detector.detectMarkers(gray)
    return {
        "img_name": img_name,
        "family": family,
        "corners": corners,
        "ids": ids
    }


def draw_aruco_on_image(img, aruco_obj, id_filter=None, color=(0,255,0)):
    corners, ids = aruco_obj["corners"], aruco_obj["ids"]
    if ids is None or len(ids) == 0:
        return

    # Универсальная обработка фильтра: int или list/tuple/set
    if id_filter is not None:
        if isinstance(id_filter, int):
            id_set = {id_filter}
        else:
            id_set = set(id_filter)
        mask = [i for i, id_ in enumerate(ids.flatten()) if id_ in id_set]
        if not mask:
            return
        corners = [corners[i] for i in mask]
        ids = ids[mask]
    cv2.aruco.drawDetectedMarkers(img, corners, ids, borderColor=color)


print("Начало программы")
try:
    while True:
      img = cam_main.get_cv_frame()

      markers = aruco_find_on_image('img', img, cv2.aruco.DICT_4X4_50)
      draw_aruco_on_image(img, markers, None, color=(0,255,0))
      iv.imshow(name='aruco', frame=img)
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