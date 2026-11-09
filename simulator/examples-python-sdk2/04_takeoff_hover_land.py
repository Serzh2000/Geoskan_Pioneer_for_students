"""Шаблон безопасной полётной программы.

Скопируйте этот файл и вписывайте своё полётное задание в функцию mission().
"""
from pioneer_sdk2 import Pioneer
import time


def mission(drone):
    """Полётное задание: здесь дрон уже в воздухе."""
    drone.go_to_local_point(x=0, y=0, z=1.0, yaw=0, time=3)   # зависаем на высоте 1 м
    while not drone.point_reached():
        time.sleep(0.1)
    print("Зависли на высоте:", drone.get_dist_sensor_data())
    time.sleep(5)


def safe_shutdown(drone):
    """Приводит дрон в безопасное состояние из любого положения."""
    state = drone.get_fly_state().name
    if state == "IN_SKY":
        print("Посадка...")
        drone.land()
    elif state == "ARMED":
        drone.disarm()


drone = Pioneer()

try:
    if not drone.arm():
        raise RuntimeError("arm() не выполнен")
    if not drone.takeoff():                  # блокирует программу до события TAKEOFF_COMPLETE
        raise RuntimeError("takeoff() не выполнен")
    mission(drone)
    drone.land()                             # после посадки двигатели выключатся сами

except KeyboardInterrupt:                    # Ctrl+C в терминале
    print("Прервано пользователем")
except Exception as error:                   # любая другая ошибка в задании
    print("Ошибка:", error)
finally:
    safe_shutdown(drone)
    drone.close_connection()
