"""Оценка позы (YoloPose): 17 ключевых точек, скелет и простой признак — поднята ли рука.

Номера точек описаны в документации класса: help(YoloPose) -> NOSE=0, LEFT_SHOULDER=5, LEFT_WRIST=9 ...
"""
import cv2
import numpy as np
from pioneer_rknn import YoloPose
from pioneer_sdk2 import Camera, ImageViewer

SIZE = 640
LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_WRIST, RIGHT_WRIST = 5, 6, 9, 10
SKELETON = [(15, 13), (13, 11), (16, 14), (14, 12), (11, 12), (5, 11), (6, 12), (5, 6),
            (5, 7), (7, 9), (6, 8), (8, 10), (1, 2), (0, 1), (0, 2), (1, 3), (2, 4)]
MIN_CONF = 0.3                   # точки с меньшей уверенностью не рисуем и не используем

camera = Camera()
viewer = ImageViewer()
print("Окно просмотра: http://10.42.0.1:8889/pose/")
model = YoloPose(model_name="yolov8n-pose")


def keypoints_of(person, frame_shape):
    """Массив (17, 3): x, y в пикселях кадра и уверенность точки."""
    k = np.asarray(person.keypoint, dtype=float).reshape(-1, 3)[:17].copy()
    k[:, 0] *= frame_shape[1] / SIZE
    k[:, 1] *= frame_shape[0] / SIZE
    return k


def describe_pose(k):
    """Рука поднята, если запястье выше плеча (ось Y изображения направлена вниз).

    Метки английские: cv2.putText не умеет рисовать кириллицу.
    """
    notes = []
    for side, wrist, shoulder in (("left", LEFT_WRIST, LEFT_SHOULDER), ("right", RIGHT_WRIST, RIGHT_SHOULDER)):
        if min(k[wrist, 2], k[shoulder, 2]) > MIN_CONF and k[wrist, 1] < k[shoulder, 1]:
            notes.append(f"{side} hand up")
    return ", ".join(notes) or "hands down"


def draw_person(frame, person, k, text):
    sx, sy = frame.shape[1] / SIZE, frame.shape[0] / SIZE
    p1 = (int(person.xmin * sx), int(person.ymin * sy))
    cv2.rectangle(frame, p1, (int(person.xmax * sx), int(person.ymax * sy)), (0, 200, 0), 2)
    cv2.putText(frame, f"{person.score:.2f} {text}", (p1[0], max(p1[1] - 6, 15)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 200, 0), 2)
    for a, b in SKELETON:
        if k[a, 2] > MIN_CONF and k[b, 2] > MIN_CONF:
            cv2.line(frame, (int(k[a, 0]), int(k[a, 1])), (int(k[b, 0]), int(k[b, 1])),
                     (255, 160, 0), 2, cv2.LINE_AA)
    for i, (x, y, c) in enumerate(k):
        if c > MIN_CONF:
            color = (0, 255, 0) if i in (LEFT_WRIST, RIGHT_WRIST) else (0, 200, 255)
            cv2.circle(frame, (int(x), int(y)), 4, color, -1, cv2.LINE_AA)


try:
    while True:
        try:
            frame = camera.get_cv_frame(timeout=1.0)
        except TimeoutError:
            continue
        if frame is None:
            continue

        people = model.run([np.expand_dims(cv2.resize(frame, (SIZE, SIZE)), 0)])   # список DetectBox
        for n, person in enumerate(people):
            k = keypoints_of(person, frame.shape)
            text = describe_pose(k)
            draw_person(frame, person, k, text)
            print(f"человек {n}: уверенность {person.score:.2f}, {text}")
        viewer.imshow("pose", frame)   # трансляция: 10.42.0.1:8889/pose
except KeyboardInterrupt:
    pass
finally:
    viewer.close()
    camera.stop()
    model.release()
