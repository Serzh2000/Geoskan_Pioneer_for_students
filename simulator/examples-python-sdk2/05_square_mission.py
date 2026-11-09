from pioneer_sdk2 import Pioneer
import time

SIDE = 1.0          # сторона квадрата, м
HEIGHT = 1.0        # высота полёта, м
POINT_TIMEOUT = 15  # сколько секунд ждать прибытия в точку, прежде чем сдаться

# Маршрут: список точек (x, y, z). Последняя точка возвращает дрон к старту.
WAYPOINTS = [
    (0.0,  0.0,  HEIGHT),
    (SIDE, 0.0,  HEIGHT),
    (SIDE, SIDE, HEIGHT),
    (0.0,  SIDE, HEIGHT),
    (0.0,  0.0,  HEIGHT),
]


def fly_to(drone, x, y, z, yaw=0.0, timeout=POINT_TIMEOUT):
    """Летит в точку и ждёт point_reached(). Возвращает True при успехе."""
    drone.go_to_local_point(x=x, y=y, z=z, yaw=yaw, time=0)
    started = time.monotonic()
    while not drone.point_reached():
        if time.monotonic() - started > timeout:
            print(f"Точка ({x}, {y}, {z}) не достигнута за {timeout} с")
            return False
        time.sleep(0.1)
    return True


drone = Pioneer()

try:
    drone.arm()
    drone.takeoff()

    for number, (x, y, z) in enumerate(WAYPOINTS, start=1):
        print(f"Точка {number}/{len(WAYPOINTS)}: x={x}, y={y}, z={z}")
        drone.led_control(b=1)                       # синий — в пути
        if not fly_to(drone, x, y, z):
            break                                    # не долетели — прекращаем миссию
        drone.led_control(g=1)                       # зелёный — точка достигнута
        time.sleep(1)

    drone.land()

except KeyboardInterrupt:
    print("Прервано, посадка")
finally:
    if drone.get_fly_state().name == "IN_SKY":
        drone.land()
    drone.led_control()
    drone.close_connection()
