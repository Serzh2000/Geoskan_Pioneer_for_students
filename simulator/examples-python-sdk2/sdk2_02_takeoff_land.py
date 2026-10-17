from pioneer_sdk2 import Pioneer
import time

pioneer = Pioneer()
in_air = False

try:
    # arm() ждёт запуска моторов; не дождался за 5 с - False.
    if not pioneer.arm():
        raise SystemExit("Моторы не запустились")

    in_air = True
    pioneer.takeoff()  # возвращается, когда взлёт завершён
    print("В воздухе")
    time.sleep(3)            # просто висим

    pioneer.land()           # возвращается, когда дрон на земле
    in_air = False
    print("Сели")
finally:
    if in_air:  # программу прервали в воздухе - сначала сесть
        pioneer.land()
    pioneer.disarm()
    pioneer.close_connection()
