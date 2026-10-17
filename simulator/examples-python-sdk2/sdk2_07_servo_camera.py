import cv2
import time
from pioneer_sdk2 import Pioneer, Camera, CameraType, ImageViewer
from pioneer_sdk2 import ServoCamera

pioneer = Pioneer()
camera = Camera(camera_type=CameraType.MAIN)
servo = ServoCamera()             # сервопривод наклона камеры
viewer = ImageViewer()
in_air = False


def show(seconds, angle):
    """Показывать кадры seconds секунд с подписью угла камеры."""
    start = time.time()
    while time.time() - start < seconds:
        frame = camera.get_cv_frame()
        cv2.putText(frame, f"angle {angle}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        viewer.imshow(name="stream", frame=frame)


try:
    if not pioneer.arm():
        raise SystemExit("Моторы не запустились")
    in_air = True
    pioneer.takeoff()

    # 0 - камера смотрит вперёд, -80 - почти вниз, 30 - вверх.
    for angle in (0, -45, -80, 0):
        print("Наклон камеры:", angle)
        servo.set_angle(angle)
        show(2, angle)

    pioneer.land()
    in_air = False
finally:
    if in_air:
        pioneer.land()
    pioneer.disarm()
    camera.stop()
    viewer.close()
    pioneer.close_connection()
