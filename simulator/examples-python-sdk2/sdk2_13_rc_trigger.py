from pioneer_sdk2 import Pioneer
import time

pioneer = Pioneer()
changes = []


def on_rc(value):
    """Вызывается, когда меняется значение RC-канала (проверка раз в 0.1 с)."""
    changes.append(value)
    print("RC-канал:", value)


try:
    pioneer.set_rc_trigger(on_rc)
    time.sleep(0.5)                      # первый раз колбэк вызовется с текущим значением

    # Значения от -1 до 1; get_rc_channel вернёт положение тумблера 0, 1 или 2.
    pioneer.send_rc_channels(channel_8=2)
    time.sleep(0.5)
    pioneer.send_rc_channels(channel_8=0)
    time.sleep(0.5)

    print("Текущее значение:", pioneer.get_rc_channel())
    print("Изменений:", len(changes))
finally:
    pioneer.close_connection()
