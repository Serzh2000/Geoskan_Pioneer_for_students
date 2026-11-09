"""Доставка груза захватом «Пионер Мини 2»: забрать в точке A и отпустить в точке B."""
from pioneer_sdk2 import Pioneer
import time

POINT_A = (0.0, 0.0)     # где лежит груз (дрон стартует рядом)
POINT_B = (1.5, 0.5)     # куда доставить
CRUISE_Z = 1.0           # высота перелёта, м
DROP_Z = 0.4             # высота сброса, м


def go(drone, x, y, z):
    drone.go_to_local_point(x=x, y=y, z=z, yaw=0, time=0)
    while not drone.point_reached():
        time.sleep(0.1)


drone = Pioneer()

try:
    # 1. На земле: открываем захват, ждём, пока груз вложат, и закрываем
    drone.grab_open()                        # movement_time=0 — до упора
    drone.led_control(r=1, g=0.4)            # жёлтый: «вложите груз»
    print("Вложите груз, через 5 секунд захват закроется")
    time.sleep(5)
    drone.grab_close(movement_time=0, velocity=60)
    time.sleep(2)
    drone.led_control(g=1)

    # 2. Перелёт
    drone.arm()
    drone.takeoff()
    go(drone, *POINT_A, CRUISE_Z)
    go(drone, *POINT_B, CRUISE_Z)
    go(drone, *POINT_B, DROP_Z)              # снижаемся над точкой B

    # 3. Сброс
    drone.led_control(b=1)
    drone.grab_open(movement_time=2, velocity=100)
    time.sleep(2.5)
    print("Груз доставлен")

    # 4. Возврат
    go(drone, *POINT_B, CRUISE_Z)
    go(drone, *POINT_A, CRUISE_Z)
    drone.land()
finally:
    drone.grab_stop()
    if drone.get_fly_state().name == "IN_SKY":
        drone.land()
    drone.led_control()
    drone.close_connection()
