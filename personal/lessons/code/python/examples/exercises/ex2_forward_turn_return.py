from pioneer_sdk import Pioneer
from grader import FlightGrader
import time
import math

"""
Упражнение 2 – «Полёт вперёд и назад»: модуль должен выполнить точный проход вперёд на заданное расстояние, немедленный разворот на 180° и возвращение на исходную точку без смещения по бокам.
"""

def exercise_02():
    drone = Pioneer()
    grader = FlightGrader(drone)
    
    try:
        print("[System] Упражнение 2: Вперед и Назад (с разворотом)")
        grader.start_mission()
        
        # 1. Взлет
        drone.arm()
        time.sleep(1) # Даем автопилоту перейти в режим готовности
        drone.takeoff()
        time.sleep(5)
        
        # 2. Полет вперед (x=1.0)
        dist = 1.0
        print(f"Этап 1: Вперед к x={dist}...")
        grader.set_target(dist, 0.0, 1.0, 0.0)
        drone.go_to_local_point(x=dist, y=0.0, z=1.0, yaw=0.0)
        time.sleep(5)
        grader.check_checkpoint("Точка Вперед")
        
        # 3. Разворот на 180 (Немедленный)
        print("Этап 2: Немедленный разворот на 180...")
        # Примечание: go_to_local_point с новым yaw. Позиция остается прежней.
        # Используем радианы для yaw, так как это стандарт.
        yaw_180 = math.radians(180)
        
        grader.set_target(dist, 0.0, 1.0, 180.0) # Ожидаем yaw=180 в точке x=1
        drone.go_to_local_point(x=dist, y=0.0, z=1.0, yaw=yaw_180) 
        time.sleep(3)
        grader.check_checkpoint("Разворот 180")
        
        # 4. Возврат на старт (x=0)
        # Мы сохраняем yaw=180, то есть летим "носом" к точке старта.
        print("Этап 3: Возврат на старт...")
        grader.set_target(0.0, 0.0, 1.0, 180.0)
        drone.go_to_local_point(x=0.0, y=0.0, z=1.0, yaw=yaw_180)
        time.sleep(5)
        grader.check_checkpoint("Точка Дома (Задом)")
        
        drone.land()
        
    finally:
        grader.finish_mission()
        drone.disarm()
        drone.close_connection()

if __name__ == '__main__':
    exercise_02()
