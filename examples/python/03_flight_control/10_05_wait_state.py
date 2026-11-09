from pioneer_sdk import Pioneer
import time

drone = Pioneer()


def wait_state(state, limit):
    """Ждать состояния автопилота не дольше limit секунд.

    Возвращает True, если состояние наступило, и False по тайм-ауту.
    """
    deadline = time.monotonic() + limit
    while time.monotonic() < deadline:
        if drone.get_autopilot_state() == state:
            return True
        time.sleep(0.05)
    return False


try:
    drone.led_control(led_id=255, r=255, g=0, b=0)       # красный: ещё не готов
    drone.arm()
    if not wait_state("ARMED", 3):
        print("тайм-аут: подготовка не подтверждена")
    else:
        drone.led_control(led_id=255, r=0, g=255, b=0)   # зелёный: моторы запущены
        drone.takeoff()
        if wait_state("MISSION", 15):
            print("Взлёт завершён")
            time.sleep(2)                                # немного повисим
        else:
            print("тайм-аут: взлёт не завершился")
        drone.land()
        if wait_state("DISARMED", 15):                   # сел и сам выключил моторы
            print("Посадка подтверждена")
finally:
    drone.led_control(led_id=255, r=0, g=0, b=0)
    drone.disarm()
    drone.close_connection()
