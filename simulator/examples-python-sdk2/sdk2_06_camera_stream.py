import cv2
from pioneer_sdk2 import Camera, CameraType, ImageViewer

camera = Camera(camera_type=CameraType.MAIN)   # передняя камера
viewer = ImageViewer()  # видеопоток для браузера
print("Смотрите в браузере: http://10.42.0.1:8889/stream")

count = 0
try:
    while True:
        frame = camera.get_cv_frame()  # numpy-массив, цвета BGR
        count += 1
        h, w = frame.shape[:2]
        cv2.putText(frame, f"{w}x{h} #{count}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        viewer.imshow(name="stream", frame=frame)
except KeyboardInterrupt:  # Ctrl+C в терминале
    print("Остановлено")
finally:
    camera.stop()
    viewer.close()
