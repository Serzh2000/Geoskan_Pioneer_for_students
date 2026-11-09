from pioneer_sdk2 import Pioneer
import time

drone = Pioneer()

try:
    state = drone.get_fly_state().name                 # .name — строка: "ON_LAND", "ARMED", "IN_SKY"
    print("Текущее состояние:", state)

    if state != "ON_LAND":
        raise RuntimeError("Двигатели можно запускать только на земле")

    # Обратный отсчёт: три красные вспышки, затем зелёный
    for _ in range(3):
        drone.led_control(r=1)
        time.sleep(0.5)
        drone.led_control()
        time.sleep(0.5)

    if not drone.arm(timeout=5, retries=1):            # ждём событие ENGINES_STARTED
        raise RuntimeError("Двигатели не запустились")

    drone.led_control(g=1)
    print("Состояние после arm():", drone.get_fly_state().name)   # ожидаем ARMED
    time.sleep(3)

finally:
    if drone.get_fly_state().name == "ARMED":          # выключаем, только если включены
        drone.disarm()
    drone.led_control()
    drone.close_connection()
