from pioneer_sdk2 import Pioneer
import time


def wait_point(drone, timeout=10):
    started = time.monotonic()
    while not drone.point_reached() and time.monotonic() - started < timeout:
        time.sleep(0.1)


def step(drone, forward=0.0, right=0.0, up=0.0, turn_deg=0.0):
    """Смещение относительно корпуса дрона.

    В связанной системе координат ось Y смотрит вперёд (по камере),
    ось X — вправо, ось Z — вверх. Поворот yaw задаётся в градусах.
    """
    drone.go_to_local_point_body_fixed(x=right, y=forward, z=up,
                                       yaw=turn_deg, time=0)
    wait_point(drone)


drone = Pioneer()

try:
    drone.arm()
    drone.takeoff()
    step(drone, up=0.5)                  # +0.5 м к текущей высоте

    # «Лесенка»: шаг вперёд — поворот на 90° — снова шаг вперёд...
    # Так как смещения считаются от корпуса, дрон обходит квадрат,
    # не зная ни одной абсолютной координаты.
    for _ in range(4):
        step(drone, forward=0.8)
        step(drone, turn_deg=90)

    drone.land()
finally:
    if drone.get_fly_state().name == "IN_SKY":
        drone.land()
    drone.close_connection()
