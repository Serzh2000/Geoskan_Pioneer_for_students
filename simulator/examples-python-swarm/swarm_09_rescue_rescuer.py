# Поиск и спасение, часть 2 из 2: СПАСАТЕЛЬ - запускают на ВТОРОМ дроне, раньше разведчика (swarm_09_rescue_searcher.py).
# Стоит на земле и ждёт сообщение «НАЙДЕН x y»; получив, взлетает, летит к точке, зажигает зелёный свет и снижается.
from pioneer_sdk2 import Pioneer
from pioneer_swarm import PioneerSwarmUnit
import time

pioneer = Pioneer()
swarm = PioneerSwarmUnit()
print('Спасатель', swarm.id, 'ждёт сигнал')

target = None
waited = 0.0
while target is None and waited < 60.0:
    message = swarm.get_next_message()
    if message is None:
        time.sleep(0.1)
        waited += 0.1
    else:
        sender, text = message
        parts = text.split()
        if parts[0] == 'НАЙДЕН' and len(parts) == 3:
            target = (float(parts[1]), float(parts[2]))
            print('Сигнал от', sender, ': лечу в точку', target)

if target is not None:
    pioneer.arm()
    pioneer.takeoff()
    pioneer.go_to_local_point(x=target[0], y=target[1], z=1.0)
    while not pioneer.point_reached():
        time.sleep(0.1)
    pioneer.led_control(255, 0, 1, 0)
    print('Спасатель на месте')
    time.sleep(2)
    pioneer.land()
else:
    print('Сигнала не было')
swarm.close()
