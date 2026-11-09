from pioneer_sdk2 import Pioneer
import time

SEND_PERIOD = 0.2       # команду скорости нужно повторять, пока движение должно продолжаться
COMMAND_INTERVAL = 0.3  # сколько секунд действует одна команда (чуть больше периода отправки)


def move(drone, vx=0.0, vy=0.0, vz=0.0, yaw_rate=0.0, duration=1.0):
    """Держит заданную скорость (в осях корпуса) в течение duration секунд."""
    end = time.monotonic() + duration
    while time.monotonic() < end:
        drone.set_manual_speed_body_fixed(vx, vy, vz, yaw_rate, COMMAND_INTERVAL)
        time.sleep(SEND_PERIOD)
    drone.set_manual_speed_body_fixed(0, 0, 0, 0, COMMAND_INTERVAL)   # явная остановка
    time.sleep(0.5)


drone = Pioneer()

try:
    drone.arm()
    drone.takeoff()

    move(drone, vz=0.3, duration=2)            # подъём со скоростью 0.3 м/с
    move(drone, vy=0.3, duration=2)            # вперёд (ось Y корпуса)
    move(drone, yaw_rate=0.8, duration=4)      # разворот на месте, рад/с
    move(drone, vy=0.3, yaw_rate=0.5, duration=6)   # дуга: вперёд + поворот одновременно
    move(drone, vz=-0.3, duration=2)           # снижение

    drone.land()
finally:
    if drone.get_fly_state().name == "IN_SKY":
        drone.land()
    drone.close_connection()
