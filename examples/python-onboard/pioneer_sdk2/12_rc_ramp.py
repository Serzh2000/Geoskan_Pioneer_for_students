from pioneer_sdk2 import Pioneer
import time

RC_PARAMETERS = {                     # без этих значений автопилот проигнорирует «виртуальный пульт»
    "Copter_man_rcMode0": 6.0,
    "Copter_man_rcMode1": 3.0,
    "Copter_man_rcMode2": 3.0,
    "Copter_flyWithoutRc": 1.0,
    "SensorMux_rc": 2.0,
}
PERIOD = 0.05                         # каналы шлём 20 раз в секунду — автопилоту нужен непрерывный сигнал


def send_sticks(drone, roll=0.0, pitch=0.0, throttle=0.0, yaw=0.0):
    """Стики в диапазоне -1..1; тумблеры в «полётном» положении."""
    drone.send_rc_channels(channel_1=roll, channel_2=pitch, channel_3=throttle, channel_4=yaw,
                           channel_5=1, channel_6=0, channel_7=1, channel_8=0)


def ramp(drone, axis, target, duration):
    """Плавно двигает один стик от 0 до target, держит и плавно возвращает в 0.

    Резкий рывок стика = резкий манёвр. Линейное нарастание делает полёт мягким.
    """
    steps = max(1, int(duration / 3 / PERIOD))
    profile = ([target * i / steps for i in range(steps)] +       # разгон
               [target] * steps +                                 # удержание
               [target * (steps - i) / steps for i in range(steps + 1)])  # торможение
    for value in profile:
        send_sticks(drone, **{axis: value})
        time.sleep(PERIOD)


drone = Pioneer()
old = {name: drone.get_param(name, update=True) for name in RC_PARAMETERS}

try:
    for name, value in RC_PARAMETERS.items():
        drone.set_param(name, value)

    drone.arm()
    drone.takeoff()
    ramp(drone, "pitch", -0.3, duration=3)    # вперёд (pitch: -1 — вперёд)
    ramp(drone, "yaw", 0.4, duration=3)       # поворот налево
    ramp(drone, "roll", 0.3, duration=3)      # вправо
    for _ in range(20):                       # секунда нейтрали перед посадкой
        send_sticks(drone)
        time.sleep(PERIOD)
    drone.land()
finally:
    send_sticks(drone)
    if drone.get_fly_state().name == "IN_SKY":
        drone.land()
    for name, value in old.items():           # возвращаем параметры автопилота
        if value is not None:
            drone.set_param(name, value)
    drone.close_connection()
