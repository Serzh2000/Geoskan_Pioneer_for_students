import time
from pioneer_sdk import Pioneer


def wait_point(drone, timeout=30):
    """Ждать прибытия в точку не дольше timeout секунд."""
    deadline = time.time() + timeout
    while not drone.point_reached():
        if time.time() > deadline:
            raise RuntimeError("Точка не достигнута за отведённое время")
        time.sleep(0.1)


def main():
    drone = Pioneer()
    in_air = False
    try:
        drone.arm()
        time.sleep(1)       # даём автопилоту перейти в режим готовности
        drone.takeoff()
        in_air = True
        time.sleep(3)       # взлёт занимает пару секунд

        # ... Ваш код: например, одна точка маршрута
        drone.go_to_local_point(x=0, y=0, z=1, yaw=0)
        wait_point(drone)

    except Exception as e:
        print(f"Ошибка: {e}")
    finally:
        if in_air:
            drone.land()
            time.sleep(5)   # disarm до касания земли выключил бы моторы в воздухе
        drone.disarm()
        drone.close_connection()


if __name__ == "__main__":
    main()
