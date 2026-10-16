from pioneer_sdk import Pioneer
import time

drone = Pioneer()


def move(vx, vy, vz, seconds):
    """Лететь с заданной скоростью (м/с) seconds секунд, затем зависнуть.

    Команда скорости действует коротко, поэтому её повторяют в цикле
    каждые 0.05 с — так же устроен официальный пример set_manual_speed.py.
    """
    start = time.time()
    while time.time() - start < seconds:
        drone.set_manual_speed(vx=vx, vy=vy, vz=vz, yaw_rate=0)
        time.sleep(0.05)
    drone.set_manual_speed(vx=0, vy=0, vz=0, yaw_rate=0)   # остановиться


try:
    drone.arm()
    time.sleep(1)               # даём автопилоту перейти в режим готовности
    drone.takeoff()
    time.sleep(5)               # взлёт и зависание

    move(0.5, 0, 0, 2)          # 2 с по оси X со скоростью 0.5 м/с
    move(0, 0.5, 0, 2)          # 2 с по оси Y
    move(0, 0, 0.3, 1)          # 1 с вверх
    time.sleep(1)

    drone.land()
    time.sleep(5)               # ждём, пока дрон сядет
finally:
    drone.disarm()
    drone.close_connection()
