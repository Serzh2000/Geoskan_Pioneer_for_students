from pioneer_sdk import Pioneer
import time

drone = Pioneer()
try:
    drone.arm()
    time.sleep(1) # Даем автопилоту перейти в режим готовности
    print("Взлет!")
    drone.takeoff()
    time.sleep(5) # Висение в воздухе
    print("Посадка...")
    drone.land()
finally:
    drone.disarm() # Гарантированная остановка
