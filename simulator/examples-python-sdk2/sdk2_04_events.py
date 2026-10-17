from pioneer_sdk2 import Pioneer, Event
import time

pioneer = Pioneer()
in_air = False
low_battery = False


def on_event(event):
    """Вызывается SDK при каждом событии автопилота."""
    global low_battery
    print("Событие:", event.name)
    if event == Event.LOW_VOLTAGE1:
        # только запомнить: решает основной цикл
        low_battery = True


# без второго аргумента - все события
pioneer.subscribe(on_event)


def fly_to(x, y, z, can_abort=True):
    """Лететь в точку; False - если прервано из-за батареи."""
    pioneer.go_to_local_point(x=x, y=y, z=z, yaw=0)
    while not pioneer.point_reached():
        if can_abort and low_battery:
            return False
        time.sleep(0.1)
    return True


try:
    if not pioneer.arm():
        raise SystemExit("Моторы не запустились")
    in_air = True
    pioneer.takeoff()

    patrol = [(1, 0), (1, 1), (0, 1), (0, 0)]
    state = "PATROL"
    laps = 0
    while state == "PATROL":
        for x, y in patrol:
            if not fly_to(x, y, 1.0):
                state = "RETURN"
                break
        laps += 1
        if laps == 3:
            state = "RETURN"

    if low_battery:
        print("Батарея садится - возвращаемся")
        pioneer.led_control(r=1, g=0, b=0)
    fly_to(0, 0, 1.0, can_abort=False)   # домой, не прерываясь
    pioneer.land()
    in_air = False
finally:
    if in_air:
        pioneer.land()
    pioneer.disarm()
    pioneer.close_connection()
