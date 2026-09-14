from pioneer_sdk import Pioneer
from grader import FlightGrader
import time

"""
Упражнение 1 – «Полёт вперёд»: модуль должен обеспечить ровный прямолинейный проход заданной дистанции без возврата.
"""

def exercise_01():
    drone = Pioneer()
    grader = FlightGrader(drone)
    
    try:
        print("[System] Упражнение 1: Полет вперед")
        print("Ожидание LPS...")
        # Проверка готовности LPS (упрощенно)
        
        grader.start_mission()
        
        # 1. Взлет
        print("Взлет...")
        drone.arm()
        time.sleep(1) # Даем автопилоту перейти в режим готовности
        drone.takeoff()
        time.sleep(5)
        
        # 2. Установка цели (x=1.0, y=0, z=1.0)
        target_x = 1.0
        grader.set_target(target_x, 0.0, 1.0, 0.0)
        
        # 3. Полет вперед
        print(f"Полет к точке x={target_x}...")
        drone.go_to_local_point(x=target_x, y=0.0, z=1.0, yaw=0.0)
        
        # Ожидание прибытия (около 5 с)
        time.sleep(5)
        
        # 4. Проверка позиции
        grader.check_checkpoint("Точка Вперед")
        
        # 5. Посадка (Конец упражнения, без возврата)
        print("Посадка...")
        drone.land()
        
    finally:
        grader.finish_mission()
        drone.disarm()
        drone.close_connection()

if __name__ == '__main__':
    exercise_01()
