"""Жесты руками -> цвет светодиодов. Жест принимается, только если держится STABLE кадров подряд.

Безопасная «репетиция» жестового управления: дрон стоит на земле, двигатели не запускаются.
"""
from collections import Counter, deque
import math
import cv2
import numpy as np
from pioneer_rknn import YoloPose
from pioneer_sdk2 import Pioneer, Camera, ImageViewer

L_SH, R_SH, L_EL, R_EL, L_WR, R_WR, L_HIP, R_HIP = 5, 6, 7, 8, 9, 10, 11, 12
MIN_CONF = 0.3
SIZE = 640
STABLE = 8                                          # сколько кадров подряд должен держаться жест

GESTURE_COLORS = {                                  # жест -> (r, g, b)
    "both_up":    (0, 1, 0),
    "left_up":    (0, 0, 1),
    "right_up":   (1, 0, 1),
    "t_pose":     (1, 0.4, 0),
    "none":       (0, 0, 0),
}


def angle_from_down(shoulder, wrist):
    """Угол руки от вертикали «вниз», градусы: 0 — рука опущена, 90 — в сторону, 180 — вверх."""
    dx, dy = wrist[0] - shoulder[0], wrist[1] - shoulder[1]       # ось y изображения смотрит вниз
    return math.degrees(math.atan2(abs(dx), dy)) % 360


def classify(k):
    needed = [L_SH, R_SH, L_WR, R_WR]
    if any(k[i, 2] < MIN_CONF for i in needed):
        return "none"
    left = angle_from_down(k[L_SH], k[L_WR])
    right = angle_from_down(k[R_SH], k[R_WR])
    if left > 140 and right > 140:
        return "both_up"
    if 65 < left < 115 and 65 < right < 115:
        return "t_pose"                             # обе руки в стороны — буква «Т»
    if left > 140:
        return "left_up"
    if right > 140:
        return "right_up"
    return "none"


def main_person(detections):
    """Человек с самой большой рамкой — обычно ближайший к камере."""
    return max(detections, key=lambda d: (d.xmax - d.xmin) * (d.ymax - d.ymin), default=None)


drone = Pioneer()
drone.set_logger(False)
camera = Camera()
viewer = ImageViewer()
print("Окно просмотра: http://10.42.0.1:8889/gesture/")
model = YoloPose(model_name="yolov8n-pose")
history = deque(maxlen=STABLE)
current = "none"

try:
    while True:
        try:
            frame = camera.get_cv_frame(timeout=1.0)
        except TimeoutError:
            continue
        if frame is None:
            continue

        person = main_person(model.run([np.expand_dims(cv2.resize(frame, (SIZE, SIZE)), 0)]) or [])
        gesture = "none"
        if person is not None:
            k = np.asarray(person.keypoint, dtype=float).reshape(-1, 3)[:17].copy()
            k[:, 0] *= frame.shape[1] / SIZE
            k[:, 1] *= frame.shape[0] / SIZE
            gesture = classify(k)
        history.append(gesture)

        # Голосование: жест побеждает, только если занимает всю историю
        winner, votes = Counter(history).most_common(1)[0]
        if votes == STABLE and winner != current:
            current = winner
            r, g, b = GESTURE_COLORS[current]
            drone.led_control(r=r, g=g, b=b)
            print("Жест:", current)

        cv2.putText(frame, f"raw={gesture}  confirmed={current}", (10, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 255), 2)
        viewer.imshow("gesture", frame)   # трансляция: 10.42.0.1:8889/gesture
except KeyboardInterrupt:
    pass
finally:
    drone.led_control()
    viewer.close()
    camera.stop()
    model.release()
    drone.close_connection()
