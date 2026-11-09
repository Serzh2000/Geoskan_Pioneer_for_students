from pioneer_sdk import Pioneer, Camera
import time
import cv2

drone = Pioneer()
# view="bottom" - расширение симулятора: нижняя камера, которая смотрит в пол.
# В pioneer_sdk для настоящего дрона такого аргумента нет: там пишут Camera().
camera = Camera(view="bottom")


def wait_state(state, limit):
    deadline = time.monotonic() + limit
    while time.monotonic() < deadline:
        if drone.get_autopilot_state() == state:
            return True
        time.sleep(0.05)
    return False


def go(x, y, z):
    """Лететь в точку, дождаться прибытия и дать корпусу успокоиться."""
    drone.go_to_local_point(x=x, y=y, z=z, yaw=0)
    deadline = time.monotonic() + 30
    while not drone.point_reached() and time.monotonic() < deadline:
        time.sleep(0.05)
    time.sleep(1.5)


try:
    drone.arm()
    wait_state("ARMED", 3)
    drone.takeoff()
    wait_state("MISSION", 15)
    go(0, 0, 3)                          # с высоты 3 м в кадре видны рисунки на полу

    for i in range(3):                   # три свежих кадра, а не один старый
        frame = camera.get_cv_frame()
        if frame is None:                # кадр не пришёл: дальше его не передаём
            print("Нет кадра")
        else:
            h, w = frame.shape[:2]       # сначала высота (строки), потом ширина
            center = (w // 2, h // 2)    # (x, y): x вправо, y вниз
            print(f"Кадр {i}: {w}x{h}, центр {center}")
            cv2.circle(frame, center, 4, (0, 0, 255), -1)   # красная точка, цвет BGR
            cv2.imshow("Нижняя камера", frame)
            cv2.waitKey(1)               # на компьютере без waitKey окно не обновится
        time.sleep(0.15)                 # пауза: следующий кадр будет новым

    drone.land()
    wait_state("DISARMED", 15)
finally:
    drone.disarm()
    drone.close_connection()
