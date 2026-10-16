from pioneer_sdk import Pioneer
import time

# Подключение к дрону
drone = Pioneer()
print("Дрон подключен!")

try:
    # Запрашиваем состояние батареи несколько раз
    for _ in range(3):
        voltage = drone.get_battery_status()
        print(f"Напряжение: {voltage} В")
        time.sleep(1)
finally:
    # Всегда закрываем соединение
    drone.close_connection()
    print("Соединение закрыто")
