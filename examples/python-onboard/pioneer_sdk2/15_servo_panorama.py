from pioneer_sdk2 import Camera, ServoCamera
import cv2
import time

ANGLES = [30, 10, -10, -30, -50, -80]    # допустимый диапазон сервопривода: -80..30 градусов
THUMB_WIDTH = 320                        # ширина миниатюры в итоговом «контактном листе»

camera = Camera()
servo = ServoCamera()


def fresh_frame(timeout=5.0, skip=5):
    """Возвращает свежий кадр: первые несколько кадров из очереди могут быть «старыми»."""
    frame = None
    for _ in range(skip):
        frame = camera.get_cv_frame(timeout=timeout)
    return frame


shots = []
try:
    for angle in ANGLES:
        if not servo.set_angle(angle):
            print("Сервопривод не принял угол", angle)
            continue
        time.sleep(1.5)                                   # ждём, пока камера повернётся и успокоится
        frame = fresh_frame()
        if frame is None:
            continue
        cv2.imwrite(f"tilt_{angle:+03d}.jpg", frame)
        h, w = frame.shape[:2]
        thumb = cv2.resize(frame, (THUMB_WIDTH, int(h * THUMB_WIDTH / w)))
        cv2.putText(thumb, f"{angle:+d} deg", (8, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        shots.append(thumb)
        print("Снимок под углом", angle)

    if shots:
        sheet = cv2.vconcat(shots)                        # все миниатюры одна под другой
        cv2.imwrite("tilt_sheet.jpg", sheet)
        print("Сохранён tilt_sheet.jpg")
finally:
    servo.set_angle(0)
    camera.stop()
