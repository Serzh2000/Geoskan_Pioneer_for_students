from pioneer_sdk import Pioneer
import time

drone = Pioneer()

try:
    print("Взлет...")
    drone.arm()
    time.sleep(1) # Даем автопилоту перейти в режим готовности
    drone.takeoff()
    h = 1.0 # Высота
    
    # Квадрат 1x1 метр
    # Точка 1: (1, 0)
    drone.go_to_local_point(1.0, 0.0, h, 0)
    time.sleep(4)
    
    # Точка 2: (1, 1)
    drone.go_to_local_point(1.0, 1.0, h, 0)
    time.sleep(4)
    
    # Точка 3: (0, 1)
    drone.go_to_local_point(0.0, 1.0, h, 0)
    time.sleep(4)
    
    # Точка 4: (0, 0) - Домой
    drone.go_to_local_point(0.0, 0.0, h, 0)
    time.sleep(4)
    
    drone.land()
finally:
    drone.disarm()
