from pioneer_sdk2 import Pioneer
import csv
import threading
import time


class TelemetryLogger(threading.Thread):
    """Фоновый поток: раз в period секунд пишет строку телеметрии в CSV-файл."""

    def __init__(self, drone, filename, period=0.2):
        super().__init__(daemon=True)           # daemon — поток не помешает завершению программы
        self.drone = drone
        self.filename = filename
        self.period = period
        self._stop_event = threading.Event()

    def run(self):
        with open(self.filename, "w", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            writer.writerow(["t", "state", "x", "y", "z", "range", "roll", "pitch", "yaw"])
            t0 = time.monotonic()
            while not self._stop_event.is_set():
                position = self.drone.get_local_position_lps() or [None] * 3
                orientation = self.drone.get_orientation() or [None] * 3
                writer.writerow([
                    round(time.monotonic() - t0, 2),
                    self.drone.get_fly_state().name,
                    *position,
                    self.drone.get_dist_sensor_data(),
                    *orientation,
                ])
                self._stop_event.wait(self.period)       # пауза, которую можно прервать stop()

    def stop(self):
        self._stop_event.set()
        self.join()


drone = Pioneer()
drone.set_logger(False)
logger = TelemetryLogger(drone, f"flight_{time.strftime('%Y%m%d_%H%M%S')}.csv")
logger.start()

try:
    drone.arm()
    drone.takeoff()
    for x, y in [(0, 0), (1, 0), (1, 1), (0, 0)]:
        drone.go_to_local_point(x=x, y=y, z=1.0, yaw=0, time=0)
        while not drone.point_reached():
            time.sleep(0.1)
    drone.land()
    time.sleep(3)                                  # записываем и момент посадки
finally:
    logger.stop()
    if drone.get_fly_state().name == "IN_SKY":
        drone.land()
    drone.close_connection()
    print("Лог сохранён:", logger.filename)
