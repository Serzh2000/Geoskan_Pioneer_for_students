from pioneer_sdk import Pioneer
import time

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

    h = 1.0                                  # высота полёта
    fly_to(0.0, 0.0, h)                      # точка над стартом

    # квадрат 1 x 1 м: вперёд, влево, назад, домой
    square = [(1.0, 0.0), (1.0, 1.0), (0.0, 1.0), (0.0, 0.0)]
    for x, y in square:
        print(f"Летим в ({x}, {y})")
        fly_to(x, y, h)

    drone.land()
    time.sleep(5)
finally:
    drone.disarm()
    drone.close_connection()
