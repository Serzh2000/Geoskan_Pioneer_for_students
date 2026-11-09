from pioneer_sdk2 import Pioneer
import time

# Тумблер SWA (8-й канал) переключает «режим» программы:
#   0 — дежурный (мигаем синим), 2 — активный (горим зелёным, печатаем телеметрию)
mode = "standby"


def on_switch(channel_8):
    """Вызывается в отдельном потоке только при ИЗМЕНЕНИИ положения тумблера."""
    global mode
    mode = "active" if channel_8 == 2 else "standby"
    print("Тумблер SWA =", channel_8, "-> режим", mode)


drone = Pioneer()
drone.set_logger(False)
drone.set_rc_trigger(on_switch)               # регистрируем обработчик тумблера
print("Начальное значение 8 канала:", drone.get_rc_channel())

try:
    blink = False
    while True:                               # основной цикл не блокируется обработчиком
        if mode == "active":
            drone.led_control(g=1)
            print("высота:", drone.get_dist_sensor_data())
        else:
            blink = not blink
            drone.led_control(b=1 if blink else 0)
        time.sleep(0.5)
except KeyboardInterrupt:
    pass
finally:
    drone.led_control()
    drone.close_connection()
