"""
Слежение за поездом: дрон держится над крышей едущего поезда по датчику
оптического потока.

Подготовка сцены (в симуляторе):
  1. «Объекты» → «Железнодорожные пути», проложите кольцо.
  2. «Объекты» → «Поезд», кликните по рельсам. Название — «Поезд 1»,
     на крыше локомотива маркер ArUco DICT_6X6_250 (ID смотрите в настройках
     поезда, ПКМ → «Настроить транспорт…»).

Идея:
  * Датчик оптического потока видит, как «уезжает» поверхность под дроном.
    Над крышей поезда он показывает скорость дрона ОТНОСИТЕЛЬНО крыши:
        v_отн ≈ flow * высота
    Если v_отн = 0 — дрон летит ровно вместе с поездом.
  * Поэтому регулятор простой: каждую итерацию подправляем свою скорость
    на -k * v_отн. Скорость дрона сама «подтянется» к скорости поезда.
  * Дальномер над крышей меряет расстояние до крыши, а не до земли —
    по нему держим высоту.

Фаза подлёта использует Vehicle.get_state() — это подсказка сценария
(«диспетчер сообщил, где поезд»), она есть только в симуляторе. Камера
в это время ищет маркер на крыше. В фазе удержания get_state() нужен
только чтобы напечатать настоящую ошибку и проверить, как вы справились.

Скорость: с настройками по умолчанию автопилот не разгоняет дрон быстрее
0,4 м/с (параметр Copter_pos_vMax, «Настройки» → «Параметры автопилота»).
Поэтому поезд едет 0,3 м/с — дрон должен успевать за ним. Увеличьте
Copter_pos_vMax, если хотите поезд побыстрее.

Дрон не поворачивается (yaw = 0): при этом его «вперёд» смотрит вдоль
мировой оси -Y, «вправо» — вдоль +X. Отсюда пересчёт потока в мир.
"""
import math
import time

import cv2
from pioneer_sdk import Camera, Pioneer, Vehicle

TRAIN = "Поезд 1"
ROOF_HEIGHT = 2.6          # м, высота крыши локомотива над рельсами
HOLD_ABOVE_ROOF = 1.6      # м, на какой высоте над крышей держаться
LOOP_DT = 0.05             # с, период регулятора (20 Гц)
K_FLOW = 0.6               # насколько сильно гасим относительную скорость
K_ALT = 1.2                # регулятор высоты
TRAIN_SPEED = 0.3          # м/с, медленнее Copter_pos_vMax (0,4 м/с)
MAX_SPEED = 5.0            # м/с (реальный предел задаёт Copter_pos_vMax)

drone = Pioneer()
camera = Camera()
train = Vehicle(TRAIN)
detector = cv2.aruco.ArucoDetector(
    cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250),
    cv2.aruco.DetectorParameters(),
)


def clamp(value, limit):
    return max(-limit, min(limit, value))


def train_velocity(state):
    # heading в тех же единицах, что yaw дрона: «вперёд» = (sin, -cos).
    return (state["speed"] * math.sin(state["heading"]),
            -state["speed"] * math.cos(state["heading"]))


# --- 1. Взлёт и подъём выше крыши ---------------------------------------
drone.arm()
time.sleep(1.5)
drone.takeoff()
time.sleep(4)
train.stop()                # поезд ждёт, пока дрон подлетит

# --- 2. Подлёт к стоящему поезду (подсказка сценария) + поиск маркера ----
print("Подлёт к поезду...")
marker_seen = False
close_since = None
while True:
    state = train.get_state()
    x, y, z = drone.get_local_position_lps()
    tvx, tvy = train_velocity(state)
    ex, ey = state["x"] - x, state["y"] - y
    target_z = ROOF_HEIGHT + HOLD_ABOVE_ROOF
    drone.set_manual_speed(
        clamp(tvx + 1.2 * ex, MAX_SPEED),
        clamp(tvy + 1.2 * ey, MAX_SPEED),
        clamp(K_ALT * (target_z - z), 1.5),
        0,
    )

    if not marker_seen:
        corners, ids, _ = detector.detectMarkers(camera.get_cv_frame())
        if ids is not None:
            marker_seen = True
            print("Маркер на крыше пойман камерой, ID:", [int(i[0]) for i in ids])

    if math.hypot(ex, ey) < 0.5:
        close_since = close_since or time.time()
        if time.time() - close_since > 1.0:
            break
    else:
        close_since = None
    time.sleep(LOOP_DT)

# --- 3. Поезд трогается; держимся над крышей только по оптическому потоку -
print("Над крышей. Поезд трогается, держимся по оптическому потоку.")
train.set_speed(TRAIN_SPEED)
train.start()
vx, vy = 0.0, 0.0                          # скорость подстроится сама
last_report = time.time()
while True:
    flow_x, flow_y, quality = drone.get_optical_flow()
    h = drone.get_dist_sensor_data()          # до крыши поезда

    if quality > 80 and h > 0.1:
        rel_forward = flow_x * h              # м/с относительно крыши
        rel_right = flow_y * h
        # yaw = 0: вправо = +X, вперёд = -Y
        vx -= K_FLOW * rel_right
        vy -= K_FLOW * -rel_forward
    vz = K_ALT * (HOLD_ABOVE_ROOF - h)

    drone.set_manual_speed(clamp(vx, MAX_SPEED), clamp(vy, MAX_SPEED), clamp(vz, 1.5), 0)

    if time.time() - last_report > 1.0:
        last_report = time.time()
        state = train.get_state()
        x, y, _ = drone.get_local_position_lps()
        error = math.hypot(state["x"] - x, state["y"] - y)
        print(f"ошибка {error:.2f} м, высота над крышей {h:.2f} м, качество {quality}")
    time.sleep(LOOP_DT)
