from pioneer_sdk2 import Pioneer
import time

# На борту дрона адрес по умолчанию верный: TCP 127.0.0.1:20556.
pioneer = Pioneer()

try:
    # (напряжение, температура)
    battery = pioneer.get_battery_status()
    if battery is not None:
        voltage, temperature = battery
        print(f"Батарея: {voltage:.2f} В, {temperature} °C")

    # (x, y, z), метры
    position = pioneer.get_local_position_lps()
    print("Позиция:", position)

    # Цвет в SDK 2 - доли от 0 до 1, а не числа 0..255.
    # все светодиоды - зелёные
    pioneer.led_control(r=0, g=1, b=0)
    time.sleep(2)
    # нулевой - оранжевый
    pioneer.led_control(led_id=0, r=1, g=0.5, b=0)
    time.sleep(2)
    pioneer.led_control()                    # все погасить
finally:
    pioneer.close_connection()
