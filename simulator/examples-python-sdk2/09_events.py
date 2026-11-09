from pioneer_sdk2 import Pioneer, Event
import threading
import time

# Цвет светодиодов (r, g, b) для каждого события автопилота
EVENT_COLORS = {
    Event.ENGINES_STARTED:    (1, 0.4, 0),   # жёлтый — двигатели запущены
    Event.TAKEOFF_COMPLETE:   (0, 1, 0),     # зелёный — взлёт выполнен
    Event.POINT_DECELERATION: (0, 0, 1),     # синий — торможение перед точкой
    Event.POINT_REACHED:      (0, 1, 1),     # голубой — точка достигнута
    Event.COPTER_LANDED:      (1, 0, 1),     # фиолетовый — посадка
    Event.LOW_VOLTAGE1:       (1, 0, 0),     # красный — пора возвращаться
}

point_reached = threading.Event()            # «флажок», которого можно дождаться из основного потока


def on_event(event):
    """Вызывается библиотекой в отдельном потоке при каждом событии."""
    print(f"[{time.strftime('%H:%M:%S')}] событие: {event}")
    r, g, b = EVENT_COLORS.get(event, (1, 1, 1))
    drone.led_control(r=r, g=g, b=b)
    if event == Event.POINT_REACHED:
        point_reached.set()                  # будим основной поток


def go(x, y, z):
    point_reached.clear()                    # сбрасываем флажок ДО отправки команды
    drone.go_to_local_point(x=x, y=y, z=z, yaw=0, time=0)
    if not point_reached.wait(timeout=15):   # ждём без опроса в цикле
        print("Не дождались POINT_REACHED")


drone = Pioneer()
for event in EVENT_COLORS:
    drone.subscribe(on_event, event)

try:
    drone.arm()
    drone.takeoff()
    go(0, 0, 1.0)
    go(1, 0, 1.0)
    go(0, 0, 1.0)
    drone.land()
    time.sleep(2)                            # успеваем увидеть событие COPTER_LANDED
finally:
    for event in EVENT_COLORS:
        drone.unsubscribe(on_event, event)
    if drone.get_fly_state().name == "IN_SKY":
        drone.land()
    drone.led_control()
    drone.close_connection()
