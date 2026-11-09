from pioneer_sdk2 import Pioneer
import time

pioneer = Pioneer()


def show(name, value):
    """Напечатать показание; None - датчика нет или данных ещё нет."""
    if value is None:
        print(f"{name}: нет данных")
    else:
        print(f"{name}: {value}")


try:
    # Датчики читаются на земле, взлетать не нужно.
    for i in range(3):
        print(f"--- замер {i + 1} ---")
        show("ускорение (ax, ay, az)", pioneer.get_accel())
        show("гироскоп, рад/с", pioneer.get_gyro())
        show("магнитометр", pioneer.get_mag())
        show("крен, тангаж, курс, град", pioneer.get_orientation())
        show("высота, м", pioneer.get_altitude())
        show("дальномер вниз, м", pioneer.get_dist_sensor_data())
        show("оптический поток (fx, fy, дальность)", pioneer.get_optical_data())
        show("позиция LPS, м", pioneer.get_local_position_lps())
        show("скорость LPS, м/с", pioneer.get_local_velocity_lps())

        # Ranger возвращает пять None, если модуля нет.
        right, left, front, back, below = pioneer.get_ranger_data()
        show("Ranger: справа, слева, спереди, сзади, снизу",
             None if right is None else (right, left, front, back, below))

        # Обороты четырёх моторов; на земле с выключенными моторами - нули.
        show("обороты моторов", pioneer.get_motors_rpm())
        time.sleep(1)
finally:
    pioneer.close_connection()
