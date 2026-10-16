from pioneer_sdk import Pioneer
import time

drone = Pioneer()
try:
    print("Запуск моторов...")
    drone.arm()
    time.sleep(3) # Моторы вращаются 3 секунды
finally:
    print("Остановка моторов")
    drone.disarm()
