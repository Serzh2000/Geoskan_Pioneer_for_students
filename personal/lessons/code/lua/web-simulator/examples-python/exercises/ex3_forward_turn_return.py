from pioneer_sdk import Pioneer
from grader import FlightGrader
import time
import math

"""
Упражнение 3 – «Полёт вперёд, разворот 180°, возврат»: модуль должен совершить проход вперёд, строгий разворот на 180° вокруг вертикальной оси и точный возврат к стартовой координате с тем же курсом.
"""

def exercise_03():
    drone = Pioneer()
    grader = FlightGrader(drone)
    
    try:
        print("[System] Упражнение 3: Вперед, Разворот 180, Возврат (Строгий Yaw)")
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
        
        # 3. Строгий разворот на 180
        print("Этап 2: Строгий разворот на 180...")
        yaw_180 = math.radians(180)
        grader.set_target(dist, 0.0, 1.0, 180.0) # Ожидаем 180 градусов
        drone.go_to_local_point(x=dist, y=0.0, z=1.0, yaw=yaw_180)
        time.sleep(3)
        grader.check_checkpoint("Разворот Завершен")
        
        # 4. Возврат на старт (x=0) с ТЕМ ЖЕ КУРСОМ (Heading)
        # "Возврат к стартовой координате с тем же курсом".
        # Это означает сохранение ориентации yaw=180.
        print("Этап 3: Возврат на старт (Удержание курса)...")
        grader.set_target(0.0, 0.0, 1.0, 180.0)
        drone.go_to_local_point(x=0.0, y=0.0, z=1.0, yaw=yaw_180)
        time.sleep(5)
        grader.check_checkpoint("Точка Дома")
        
        drone.land()
        
    finally:
        grader.finish_mission()
        drone.disarm()
        drone.close_connection()

if __name__ == '__main__':
    exercise_03()
