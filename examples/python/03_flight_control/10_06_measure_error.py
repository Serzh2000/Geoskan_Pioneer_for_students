from pioneer_sdk import Pioneer
import time

drone = Pioneer()

TARGET_X = 1.0      # цель по оси X, м
TOLERANCE = 0.15    # допуск прибытия, м


def wait_state(state, limit):
    deadline = time.monotonic() + limit
    while time.monotonic() < deadline:
        if drone.get_autopilot_state() == state:
            return True
        time.sleep(0.05)
    return False


def read_x():
    """Измеренная координата X или None, если данных нет."""
    position = drone.get_local_position_lps()
    if position is None:        # нет измерения - это не ноль
        return None
    return position[0]


try:
    drone.arm()
    wait_state("ARMED", 3)
    drone.takeoff()
    wait_state("MISSION", 15)

    drone.go_to_local_point(x=TARGET_X, y=0, z=1, yaw=0)
    reason = "тайм-аут"
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        x = read_x()
        if x is None:
            print("Нет данных")
        else:
            error = TARGET_X - x            # цель минус измерение
            print(f"x = {x:.2f} м, осталось {error:.2f} м")
            if abs(error) < TOLERANCE:      # сравниваем с допуском, а не на равенство
                reason = "цель в допуске"
                break
        time.sleep(0.5)
    print("Причина остановки:", reason)

    drone.land()
    wait_state("DISARMED", 15)
finally:
    drone.disarm()
    drone.close_connection()
