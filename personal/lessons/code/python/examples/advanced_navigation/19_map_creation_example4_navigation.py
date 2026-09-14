import yaml
import time
import math
from pioneer_sdk import Pioneer

# Функция загрузки карты
def load_map(filename):
    with open(filename, 'r') as f:
        map_data = yaml.safe_load(f)
    
    # Преобразуем список в словарь для быстрого поиска по ID
    # markers[id] = {x, y, z}
    markers = {}
    for m in map_data['markers']:
        markers[m['id']] = m['pose']['position']
    return markers

# Функция для навигации
def fly_mission(drone, markers_map):
    print("Начинаем полет по карте...")
    drone.arm()
    time.sleep(1) # Даем автопилоту перейти в режим готовности
    drone.takeoff()
    
    # Пример: летим к маркеру с ID 0, затем к ID 24 (если они есть)
    target_ids = [0, 4, 24, 20, 0] # Углы сетки 5x5
    
    for target_id in target_ids:
        if target_id in markers_map:
            pos = markers_map[target_id]
            print(f"Летим к маркеру {target_id}: x={pos['x']}, y={pos['y']}")
            
            # Летим на высоту 1.5 метра над маркером
            drone.go_to_local_point(x=pos['x'], y=pos['y'], z=1.5, yaw=0)
            
            # Ждем пока долетит
            while not drone.point_reached():
                time.sleep(0.1)
                
            print("Точка достигнута!")
            time.sleep(1) # Висим 1 секунду
        else:
            print(f"Маркер {target_id} не найден на карте!")

    print("Миссия завершена, посадка.")
    drone.land()

if __name__ == "__main__":
    # Загружаем карту
    try:
        markers_map = load_map("../../data/maps/clever_map.yaml")
        print(f"Загружено {len(markers_map)} маркеров.")
        
        # Подключаемся к дрону
        drone = Pioneer()
        
        # Запускаем миссию
        fly_mission(drone, markers_map)
        
        drone.close_connection()
    except Exception as e:
        print(f"Ошибка: {e}")
