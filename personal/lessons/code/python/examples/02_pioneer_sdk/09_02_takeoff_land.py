from pioneer_sdk import Pioneer
import time

drone = Pioneer()
try:
    drone.arm()
    time.sleep(1)          # даём автопилоту перейти в режим готовности
    print("Взлет!")
    drone.takeoff()
    time.sleep(5)          # взлёт занимает пару секунд, остальное — висим
    print("Посадка...")
    drone.land()
    time.sleep(5)          # ждём, пока дрон действительно сядет
finally:
    drone.disarm()         # гарантированная остановка моторов
    drone.close_connection()
