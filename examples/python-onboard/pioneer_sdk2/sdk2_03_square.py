from pioneer_sdk2 import Pioneer
import time

pioneer = Pioneer()
in_air = False


def fly_to(x, y, z, yaw):
    """Лететь в точку (метры, курс в градусах) и ждать."""
    pioneer.go_to_local_point(x=x, y=y, z=z, yaw=yaw)
    while not pioneer.point_reached():
        time.sleep(0.1)


try:
    if not pioneer.arm():
        raise SystemExit("Моторы не запустились")
    in_air = True
    pioneer.takeoff()

    h = 1.0
    # Вершины и курс: нос смотрит туда, куда летит дрон.
    square = [(1, 0, 0), (1, 1, 90), (0, 1, 180), (0, 0, -90)]
    for x, y, yaw in square:
        print(f"Летим в ({x}, {y}), курс {yaw}°")
        fly_to(x, y, h, yaw)

    fly_to(0, 0, h, 0)       # развернуться носом вперёд
    pioneer.land()
    in_air = False
finally:
    if in_air:
        pioneer.land()
    pioneer.disarm()
    pioneer.close_connection()
