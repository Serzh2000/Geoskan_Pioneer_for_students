from pioneer_sdk2 import Pioneer, Camera, ImageViewer
import cv2
import time

drone = Pioneer()
camera = Camera()                  # основная камера (CameraType.MAIN по умолчанию)
viewer = ImageViewer()             # поток будет доступен по адресу http://10.42.0.1:8889/osd/
print("Окно просмотра: http://10.42.0.1:8889/osd/")
drone.set_logger(False)

fps = 0.0
last = time.monotonic()


def draw_osd(frame, lines):
    """Рисует полупрозрачную подложку и строки телеметрии в левом верхнем углу."""
    overlay = frame.copy()
    cv2.rectangle(overlay, (5, 5), (330, 20 + 25 * len(lines)), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.5, frame, 0.5, 0, dst=frame)          # 50% прозрачности
    for i, text in enumerate(lines):
        cv2.putText(frame, text, (12, 30 + 25 * i), cv2.FONT_HERSHEY_SIMPLEX,
                    0.6, (255, 255, 255), 1, cv2.LINE_AA)
    # перекрестие в центре кадра
    h, w = frame.shape[:2]
    cv2.line(frame, (w // 2 - 15, h // 2), (w // 2 + 15, h // 2), (0, 255, 0), 1)
    cv2.line(frame, (w // 2, h // 2 - 15), (w // 2, h // 2 + 15), (0, 255, 0), 1)


try:
    while True:
        try:
            frame = camera.get_cv_frame(timeout=1.0)
        except TimeoutError:                         # кадр не пришёл вовремя — просто ждём следующий
            continue
        if frame is None:
            continue

        now = time.monotonic()
        fps = 0.9 * fps + 0.1 / max(now - last, 1e-3)   # сглаженный FPS
        last = now

        rng = drone.get_dist_sensor_data()
        draw_osd(frame, [
            f"STATE  {drone.get_fly_state().name}",
            f"RANGE  {rng:.2f} m" if rng is not None else "RANGE  --",
            f"BATT   {drone.get_battery_status()}",
            f"FPS    {fps:4.1f}",
        ])
        viewer.imshow("osd", frame, fps=30)   # трансляция: 10.42.0.1:8889/osd
except KeyboardInterrupt:
    pass
finally:
    viewer.close()
    camera.stop()
    drone.close_connection()
