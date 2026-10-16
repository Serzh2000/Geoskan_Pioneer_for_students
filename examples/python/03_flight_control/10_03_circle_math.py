from pioneer_sdk import Pioneer
import time
import math

drone = Pioneer()


def fly_to(x, y, z):
    """Летим в точку и ждём события 'точка достигнута'."""
    drone.go_to_local_point(x=x, y=y, z=z, yaw=0)
    while not drone.point_reached():
        time.sleep(0.1)


try:
    print("Взлет...")
    drone.arm()
    time.sleep(1)
    drone.takeoff()

    h = 1.0             # высота полёта
    radius = 0.5        # радиус окружности, м
    points_count = 12   # чем больше точек, тем ровнее круг

    # окружность с центром в точке старта: угол от 0 град. до 360 град. с шагом 30 град.
    for i in range(points_count + 1):
        angle_deg = 360 / points_count * i
        angle_rad = math.radians(angle_deg)   # sin и cos принимают радианы
        x = radius * math.cos(angle_rad)
        y = radius * math.sin(angle_rad)
        print(f"Точка {i}: x={x:.2f}, y={y:.2f}")
        fly_to(x, y, h)

    drone.land()
    time.sleep(5)
finally:
    drone.disarm()
    drone.close_connection()
