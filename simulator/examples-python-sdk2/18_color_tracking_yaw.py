from pioneer_sdk2 import Pioneer, Camera, ImageViewer
import cv2
import numpy as np
import time

# Диапазон цвета в HSV (здесь — насыщенный красный; у красного два диапазона оттенка: 0..10 и 170..180)
RED_RANGES = [((0, 120, 80), (10, 255, 255)), ((170, 120, 80), (180, 255, 255))]
MIN_AREA = 800          # меньшие пятна считаем шумом, пикс²
YAW_KP = 0.004          # коэффициент П-регулятора: рад/с на пиксель ошибки
MAX_YAW_RATE = 0.6      # ограничение скорости поворота, рад/с
DEAD_ZONE = 20          # пикселей: внутри этой зоны цель считаем «по центру»


def find_color_blob(frame):
    """Возвращает (cx, cy, area) самого крупного пятна заданного цвета или None."""
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
    for low, high in RED_RANGES:
        mask |= cv2.inRange(hsv, np.array(low), np.array(high))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))   # убираем «соль»
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    biggest = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(biggest)
    if area < MIN_AREA:
        return None
    m = cv2.moments(biggest)
    return int(m["m10"] / m["m00"]), int(m["m01"] / m["m00"]), area


def yaw_command(cx, frame_width):
    """П-регулятор: чем дальше цель от центра, тем быстрее поворот."""
    error = frame_width / 2 - cx               # >0 — цель слева от центра
    if abs(error) < DEAD_ZONE:
        return 0.0
    return float(np.clip(YAW_KP * error, -MAX_YAW_RATE, MAX_YAW_RATE))


drone = Pioneer()
camera = Camera()
viewer = ImageViewer()
print("Окно просмотра: http://10.42.0.1:8889/color/")
drone.set_logger(False)

try:
    drone.arm()
    drone.takeoff()
    drone.go_to_local_point(x=0, y=0, z=1.2, yaw=0, time=0)
    while not drone.point_reached():
        time.sleep(0.1)

    while True:
        try:
            frame = camera.get_cv_frame(timeout=0.5)
        except TimeoutError:
            frame = None
        if frame is None:
            drone.set_manual_speed_body_fixed(0, 0, 0, 0, 0.3)   # нет кадра — зависаем
            continue

        blob = find_color_blob(frame)
        yaw_rate = 0.0
        if blob is not None:
            cx, cy, area = blob
            yaw_rate = yaw_command(cx, frame.shape[1])
            cv2.circle(frame, (cx, cy), 10, (0, 255, 0), 2)
            cv2.putText(frame, f"yaw_rate={yaw_rate:+.2f}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        drone.set_manual_speed_body_fixed(0, 0, 0, yaw_rate, 0.3)
        viewer.imshow("color", frame)   # трансляция: 10.42.0.1:8889/color
except KeyboardInterrupt:
    pass
finally:
    if drone.get_fly_state().name == "IN_SKY":
        drone.set_manual_speed_body_fixed(0, 0, 0, 0, 0.3)
        drone.land()
    viewer.close()
    camera.stop()
    drone.close_connection()
