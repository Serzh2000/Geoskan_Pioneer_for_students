"""Итоговый проект: патрулирование периметра с фотофиксацией и защитой по батарее.

Что объединено: миссия по точкам, события автопилота, камера, сервопривод,
светодиоды, журнал полёта и корректное аварийное завершение.
"""
from pioneer_sdk2 import Pioneer, Camera, ServoCamera, Event
import cv2
import os
import threading
import time

PERIMETER = [(0, 0), (2, 0), (2, 2), (0, 2)]   # вершины патрулируемого периметра, м
HEIGHT = 1.5
LAPS = 2
CAMERA_ANGLE = -30                             # смотрим немного вниз
PHOTO_DIR = time.strftime("patrol_%Y%m%d_%H%M%S")


class Patrol:
    def __init__(self):
        self.drone = Pioneer()
        self.drone.set_logger(False)
        self.camera = Camera()
        self.servo = ServoCamera()
        self.abort = threading.Event()         # выставляется из обработчика событий
        self.point = threading.Event()
        self.reason = None                     # событие, из-за которого прервана миссия
        for event in (Event.POINT_REACHED, Event.LOW_VOLTAGE1, Event.LOW_VOLTAGE2, Event.SHOCK):
            self.drone.subscribe(self.on_event, event)

    # ---------- события ----------
    def on_event(self, event):
        if event == Event.POINT_REACHED:
            self.point.set()
        elif event in (Event.LOW_VOLTAGE1, Event.LOW_VOLTAGE2, Event.SHOCK):
            self.reason = event
            self.abort.set()                   # основной поток увидит флаг и прекратит миссию
            self.point.set()                   # и проснётся, если ждал точку

    # ---------- действия ----------
    def fly_to(self, x, y, timeout=20):
        self.point.clear()
        self.drone.go_to_local_point(x=x, y=y, z=HEIGHT, yaw=0, time=0)
        if not self.point.wait(timeout):
            raise TimeoutError(f"Точка ({x}, {y}) не достигнута")
        if self.abort.is_set():
            raise RuntimeError(f"Миссия прервана: {self.reason}")

    def snapshot(self, tag):
        try:
            frame = self.camera.get_cv_frame(timeout=3.0)
        except TimeoutError:
            frame = None
        if frame is None:
            print("Нет кадра для", tag)
            return
        stamp = time.strftime("%H:%M:%S")
        cv2.putText(frame, f"{tag} {stamp}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        path = os.path.join(PHOTO_DIR, f"{tag}.jpg")
        cv2.imwrite(path, frame)
        print("Снимок:", path)

    # ---------- сценарий ----------
    def run(self):
        os.makedirs(PHOTO_DIR, exist_ok=True)
        self.servo.set_angle(CAMERA_ANGLE)
        self.drone.arm()
        self.drone.takeoff()
        for lap in range(1, LAPS + 1):
            for n, (x, y) in enumerate(PERIMETER, start=1):
                self.drone.led_control(b=1)
                self.fly_to(x, y)
                self.drone.led_control(g=1)
                time.sleep(1)
                self.snapshot(f"lap{lap}_p{n}")
        self.fly_to(*PERIMETER[0])
        self.drone.land()

    def shutdown(self):
        if self.abort.is_set():
            print("АВАРИЙНОЕ ЗАВЕРШЕНИЕ:", self.reason)
            self.drone.led_control(r=1)
        if self.drone.get_fly_state().name == "IN_SKY":
            if self.reason == Event.LOW_VOLTAGE1:
                self.drone.rtl()               # заряда хватит — возвращаемся к точке взлёта
                time.sleep(8)
            self.drone.land()
        self.servo.set_angle(0)
        self.camera.stop()
        self.drone.close_connection()


patrol = Patrol()
try:
    patrol.run()
except Exception as error:
    print("Ошибка:", error)
finally:
    patrol.shutdown()
