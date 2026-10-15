from pioneer_sdk import Pioneer
import time

drone = Pioneer()


def fly_to(x, y, z):
    """Летим в точку и ждём, пока автопилот сообщит, что она достигнута."""
    drone.go_to_local_point(x=x, y=y, z=z, yaw=0)
    while not drone.point_reached():
        time.sleep(0.1)


try:
    print("Арминг и взлет...")
    drone.arm()
    time.sleep(1)            # даём автопилоту перейти в режим готовности
    drone.takeoff()

    h = 1.0                  # высота полёта
    fly_to(0.0, 0.0, h)      # сначала занимаем точку над стартом

    print("Вперед!")
    fly_to(1.0, 0.0, h)      # 1 метр вперёд по оси X

    print("Домой!")
    fly_to(0.0, 0.0, h)      # обратно в точку старта

    print("Посадка...")
    drone.land()
    time.sleep(5)            # ждём, пока дрон сядет
finally:
    drone.disarm()
    drone.close_connection()
