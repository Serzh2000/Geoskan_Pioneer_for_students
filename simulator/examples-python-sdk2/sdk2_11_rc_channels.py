from pioneer_sdk2 import Pioneer
import time

pioneer = Pioneer()
in_air = False

# Чтобы автопилот слушал RC-каналы, нужны эти параметры (README pioneer_sdk2).
RC_PARAMS = {
    "Copter_man_rcMode0": 6,
    "Copter_man_rcMode1": 3,
    "Copter_man_rcMode2": 3,
    "Copter_flyWithoutRc": 1,
    "SensorMux_rc": 2,
}


def hold_sticks(seconds, **channels):
    """RC нужно отправлять постоянно: одна посылка действует недолго."""
    end = time.time() + seconds
    while time.time() < end:
        pioneer.send_rc_channels(**channels)
        time.sleep(0.1)


try:
    for name, value in RC_PARAMS.items():
        if not pioneer.set_param(name, value):
            raise SystemExit(f"Параметр {name} не записан")

    if not pioneer.arm():
        raise SystemExit("Моторы не запустились")
    in_air = True
    pioneer.takeoff()

    hold_sticks(2, channel_2=-0.5)      # правый стик вперёд
    hold_sticks(1, channel_3=0.5)       # левый стик вверх
    hold_sticks(1, channel_4=0.5)       # левый стик влево: поворот
    hold_sticks(1)                      # стики по центру: висим

    pioneer.land()
    in_air = False
finally:
    if in_air:
        pioneer.land()
    pioneer.disarm()
    pioneer.close_connection()
