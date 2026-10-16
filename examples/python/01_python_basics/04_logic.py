# Логические операции
voltage = 3.8
is_connected = True

# Проверка условий
is_low_battery = voltage < 3.5
ready_to_fly = is_connected and not is_low_battery

print("Низкий заряд?", is_low_battery)
print("Готов к полету?", ready_to_fly)
