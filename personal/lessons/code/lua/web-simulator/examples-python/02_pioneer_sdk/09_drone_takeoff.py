from pioneer_sdk import Pioneer
import time

drone = Pioneer()

try:
    print("Арминг (запуск моторов)...")
    drone.arm()
    time.sleep(2)
    
    print("Взлет!")
    drone.takeoff()
    time.sleep(5) # Висение 5 секунд
    
    print("Посадка...")
    drone.land()
    time.sleep(5) # Ждем завершения посадки
    
finally:
    print("Остановка моторов...")
    drone.disarm() # Блокировка моторов
    drone.close_connection()
