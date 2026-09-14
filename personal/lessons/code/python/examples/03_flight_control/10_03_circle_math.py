from pioneer_sdk import Pioneer
import time
import math

drone = Pioneer()

try:
    print("Взлет...")
    drone.arm()
    time.sleep(1) # Даем автопилоту перейти в режим готовности
    drone.takeoff()
    
    h = 1.0          # Высота
    radius = 0.5     # Радиус круга (0.5 метра)
    points_count = 12 # Количество точек (чем больше, тем плавнее круг)
    
    # Цикл по точкам
    for i in range(points_count + 1):
        # Вычисляем угол в градусах (от 0 до 360)
        angle_deg = (360 / points_count) * i
        
        # Переводим в радианы (для sin/cos)
        angle_rad = math.radians(angle_deg)
        
        # Считаем координаты X и Y
        # x = R * cos(a)
        # y = R * sin(a)
        x = radius * math.cos(angle_rad)
        y = radius * math.sin(angle_rad)
        
        # В начале координат (0,0) дрон стоит в центре круга?
        # Нет, если мы хотим летать ВОКРУГ точки старта, то координаты правильные.
        # Если хотим летать так, чтобы старт был НА окружности, нужно смещение.
        # Для простоты летим вокруг точки старта (радиус 0.5м от старта).
        
        print(f"Точка {i}: x={x:.2f}, y={y:.2f}")
        drone.go_to_local_point(x, y, h, 0)
        time.sleep(2) # Пауза между точками
        
    drone.land()
finally:
    drone.disarm()
