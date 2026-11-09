from pioneer_sdk2 import Pioneer
import time

pioneer = Pioneer()
in_air = False

try:
    # Какая навигация и насколько ей можно верить.
    print("Навигация:", pioneer.get_nav_system().name)
    status = pioneer.get_nav_status_lps()
    print("Статус LPS:", None if status is None else status.name)
    if status is None or status.name != "OK":
        raise SystemExit("Навигация не готова, взлёт отменён")

    print("Состояние:", pioneer.get_fly_state().name)      # ON_LAND
    if not pioneer.arm():
        raise SystemExit("Моторы не запустились")
    print("Состояние:", pioneer.get_fly_state().name)      # ARMED

    in_air = True
    pioneer.takeoff()
    print("Состояние:", pioneer.get_fly_state().name)      # IN_SKY

    pioneer.go_to_local_point(x=1, y=0, z=1, yaw=0)
    slowing = False
    while not pioneer.point_reached():
        if not slowing and pioneer.point_deceleration():
            slowing = True
            print("Начали тормозить перед точкой")
        time.sleep(0.1)
    print(f"Прилетели, полёт идёт {pioneer.flight_time()} с")

    pioneer.land()
    in_air = False
    print("Состояние:", pioneer.get_fly_state().name)      # ON_LAND
finally:
    if in_air:
        pioneer.land()
    pioneer.disarm()
    pioneer.close_connection()
