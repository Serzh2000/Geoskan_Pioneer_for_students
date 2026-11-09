from pioneer_sdk2 import Pioneer
import math
import time

CENTER_X, CENTER_Y = 0.0, 0.0   # центр окружности (локальные координаты), м
RADIUS = 0.8                    # радиус, м
HEIGHT = 1.2                    # высота, м
POINTS = 12                     # на сколько отрезков делим окружность


def circle_point(index):
    """Возвращает (x, y, yaw) для i-й точки; yaw (градусы) направлен в центр окружности."""
    angle = 2 * math.pi * index / POINTS             # положение на окружности, рад
    x = CENTER_X + RADIUS * math.cos(angle)
    y = CENTER_Y + RADIUS * math.sin(angle)
    yaw = math.degrees(math.atan2(CENTER_Y - y, CENTER_X - x))   # «из точки в центр», градусы
    return x, y, yaw


def wait_point(drone, timeout=10):
    started = time.monotonic()
    while not drone.point_reached() and time.monotonic() - started < timeout:
        time.sleep(0.05)


drone = Pioneer()

try:
    drone.arm()
    drone.takeoff()

    x, y, yaw = circle_point(0)
    drone.go_to_local_point(x=x, y=y, z=HEIGHT, yaw=yaw, time=0)   # выходим на окружность
    wait_point(drone)

    for i in range(1, POINTS + 1):                   # +1 — замыкаем круг
        x, y, yaw = circle_point(i)
        print(f"{i:2d}: x={x:+.2f} y={y:+.2f} yaw={yaw:+6.1f}°")
        drone.go_to_local_point(x=x, y=y, z=HEIGHT, yaw=yaw, time=0)
        wait_point(drone)

    drone.go_to_local_point(x=CENTER_X, y=CENTER_Y, z=HEIGHT, yaw=0, time=0)
    wait_point(drone)
    drone.land()
finally:
    if drone.get_fly_state().name == "IN_SKY":
        drone.land()
    drone.close_connection()
