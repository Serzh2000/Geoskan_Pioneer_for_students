from pioneer_sdk import Pioneer
import time

drone = Pioneer()

try:
    print("Арминг и взлет...")
    drone.arm()
    time.sleep(1) # Даем автопилоту перейти в режим готовности
    drone.takeoff()
    
    # Высота полета
    h = 1.0
    
    # 1. Летим вперед на 1 метр
    print("Вперед!")
    drone.go_to_local_point(x=1.0, y=0.0, z=h, yaw=0)
    time.sleep(4) # Ждем, пока долетит
    
    # 2. Возвращаемся в точку старта (0, 0)
    print("Домой!")
    drone.go_to_local_point(x=0.0, y=0.0, z=h, yaw=0)
    time.sleep(4)
    
    print("Посадка...")
    drone.land()
    
finally:
    drone.disarm()
