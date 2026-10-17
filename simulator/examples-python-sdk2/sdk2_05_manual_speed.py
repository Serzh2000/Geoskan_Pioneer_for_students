from pioneer_sdk2 import Pioneer
import time

pioneer = Pioneer()
in_air = False


def move(vx, vy, vz, seconds):
    """Лететь с заданной скоростью (м/с) seconds секунд.

    В SDK 2 одна команда держит скорость interval секунд,
    после этого дрон сам останавливается и зависает.
    """
    pioneer.set_manual_speed(vx=vx, vy=vy, vz=vz, yaw_rate=0,
                             interval=seconds)
    time.sleep(seconds)


try:
    if not pioneer.arm():
        raise SystemExit("Моторы не запустились")
    in_air = True
    pioneer.takeoff()

    move(0.5, 0, 0, 2)       # 2 с по оси X со скоростью 0.5 м/с
    move(0, 0.5, 0, 2)       # 2 с по оси Y
    move(0, 0, 0.3, 1)       # 1 с вверх
    # Поворот на месте: yaw_rate в рад/с (не больше 1.82).
    pioneer.set_manual_speed(vx=0, vy=0, vz=0, yaw_rate=0.5,
                             interval=2)
    time.sleep(3)

    pioneer.land()
    in_air = False
finally:
    if in_air:
        pioneer.land()
    pioneer.disarm()
    pioneer.close_connection()
