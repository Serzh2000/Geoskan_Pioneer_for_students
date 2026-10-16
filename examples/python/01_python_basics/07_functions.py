# Функции
def calculate_area(length):
    """Вычисляет площадь квадрата."""
    return length * length

side = 5
area = calculate_area(side)
print(f"Площадь квадрата со стороной {side} равна {area}")

def check_battery(voltage):
    if voltage < 3.5:
        return "Critical"
    elif voltage < 3.8:
        return "Low"
    else:
        return "Normal"

print("Статус батареи 3.6В:", check_battery(3.6))
