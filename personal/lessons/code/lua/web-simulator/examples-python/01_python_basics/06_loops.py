# Циклы
import time

# Цикл for: мигаем светодиодом 5 раз (имитация)
print("Начинаю мигать...")
for i in range(5):
    print(f"Мигание №{i+1}: ВКЛ")
    time.sleep(0.5)
    print(f"Мигание №{i+1}: ВЫКЛ")
    time.sleep(0.5)

# Цикл while: летим пока есть заряд
battery = 10
while battery > 0:
    print(f"Летим... Заряд: {battery}%")
    battery -= 2
print("Посадка!")
