# Поиск и спасение, часть 1 из 2: РАЗВЕДЧИК - запускают на ПЕРВОМ дроне. Он летит «змейкой» над площадкой 3 x 3 м;
# когда проходит рядом с пострадавшим (точка VICTIM), рассылает рою координаты. Спасатель - swarm_09_rescue_rescuer.py
# на втором дроне (запустите его раньше). Камеры в примере нет: «видит» разведчик по расстоянию до известной точки.
import math
from pioneer_sdk2 import Pioneer
from pioneer_swarm import PioneerSwarmUnit
import time

VICTIM = (2.0, 2.0)   # где лежит пострадавший (разведчик этого не знает заранее - так проще проверить)
SEEN_RADIUS = 0.8     # с какого расстояния разведчик замечает его, м

pioneer = Pioneer()
swarm = PioneerSwarmUnit()
pioneer.arm()
pioneer.takeoff()

points = [(0, 0), (3, 0), (3, 1), (0, 1), (0, 2), (3, 2), (3, 3), (0, 3)]
found = None
for x, y in points:
    pioneer.go_to_local_point(x=x, y=y, z=1.5)
    while not pioneer.point_reached():
        px, py, pz = pioneer.get_local_position_lps()
        if math.hypot(px - VICTIM[0], py - VICTIM[1]) < SEEN_RADIUS:
            found = (px, py)
            break
        time.sleep(0.1)
    if found is not None:
        break

if found is not None:
    print('Пострадавший найден около', round(found[0], 1), round(found[1], 1))
    for unit_id in swarm.get_unit_list():
        swarm.send_message_to_unit(unit_id, 'НАЙДЕН %.2f %.2f' % found)
    time.sleep(8)
else:
    print('Площадка осмотрена, пострадавшего нет')
pioneer.land()
swarm.close()
