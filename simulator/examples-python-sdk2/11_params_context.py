from pioneer_sdk2 import Pioneer
from contextlib import contextmanager


@contextmanager
def temporary_params(drone, **new_values):
    """Временно меняет параметры автопилота и гарантированно возвращает старые.

    with temporary_params(drone, Copter_flyWithoutRc=1.0):
        ...  # здесь параметр изменён
    # здесь параметр снова исходный
    """
    old_values = {}
    try:
        for name, value in new_values.items():
            old_values[name] = drone.get_param(name, update=True)   # читаем из автопилота, не из кэша
            if not drone.set_param(name, value):
                raise RuntimeError(f"Не удалось установить {name}={value}")
            print(f"{name}: {old_values[name]} -> {value}")
        yield old_values
    finally:
        for name, value in old_values.items():                     # откат в любом случае
            if value is not None:
                drone.set_param(name, value)
                print(f"{name}: восстановлено {value}")


drone = Pioneer()

try:
    print("Высота взлёта сейчас:", drone.get_param("Flight_com_takeoffAlt"))

    with temporary_params(drone, Flight_com_takeoffAlt=0.7):
        print("Внутри блока:", drone.get_param("Flight_com_takeoffAlt", update=True))
        # здесь можно, например, выполнить arm()/takeoff() с изменённой высотой взлёта

    print("После блока :", drone.get_param("Flight_com_takeoffAlt", update=True))
finally:
    drone.close_connection()
