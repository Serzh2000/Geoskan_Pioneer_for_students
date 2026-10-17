import cv2
import numpy as np
from pioneer_rknn import YoloPose
from pioneer_sdk2 import Pioneer, Camera, CameraType

SIZE = 640
# Номера точек скелета (порядок COCO): плечи и запястья.
L_SHOULDER, R_SHOULDER, L_WRIST, R_WRIST = 5, 6, 9, 10

pioneer = Pioneer()
# имя - как в списке регистра
model = YoloPose(model_name="yolov8n-pose")
camera = Camera(camera_type=CameraType.MAIN)


def prepare(frame):
    image = cv2.resize(frame, (SIZE, SIZE))
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    return np.expand_dims(image, 0)


def hands_up(person):
    """Обе кисти выше плеч? Ось y на картинке - вниз."""
    k = person.keypoint  # массив 17 x 3: x, y, уверенность
    left = k[L_WRIST][1] < k[L_SHOULDER][1]
    right = k[R_WRIST][1] < k[R_SHOULDER][1]
    return left and right


signal = None
try:
    while True:
        frame = camera.get_cv_frame()
        people = model.run([prepare(frame)]) or []
        now = any(hands_up(p) for p in people if p.score > 0.5)
        if now != signal:  # менять цвет только при смене жеста
            signal = now
            if signal:
                print("Руки подняты")
                pioneer.led_control(r=0, g=1, b=0)
            else:
                pioneer.led_control(r=1, g=0, b=0)
except KeyboardInterrupt:
    print("Остановлено")
finally:
    pioneer.led_control()
    model.release()
    camera.stop()
    pioneer.close_connection()
