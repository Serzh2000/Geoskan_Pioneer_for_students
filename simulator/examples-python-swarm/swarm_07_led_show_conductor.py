# Световое шоу роя, часть 1 из 2: ДИРИЖЁР - запускают на ПЕРВОМ дроне. Игроки - swarm_07_led_show_player.py
# на остальных дронах (запустите их раньше). Дирижёр рассылает название цвета и сам включает такой же цвет.
from pioneer_sdk2 import Pioneer
from pioneer_swarm import PioneerSwarmUnit
import time

COLOURS = {'red': (1, 0, 0), 'green': (0, 1, 0), 'blue': (0, 0, 1), 'white': (1, 1, 1)}

pioneer = Pioneer()
swarm = PioneerSwarmUnit()
time.sleep(1)
print('Дирижёр', swarm.id, ', в шоу:', swarm.get_unit_list())

for lap in range(2):
    for name in ('red', 'green', 'blue', 'white'):
        for unit_id in swarm.get_unit_list():
            swarm.send_message_to_unit(unit_id, name)
        r, g, b = COLOURS[name]
        pioneer.led_control(255, r, g, b)  # 255 - все светодиоды
        print('Цвет:', name)
        time.sleep(1)

for unit_id in swarm.get_unit_list():
    swarm.send_message_to_unit(unit_id, 'off')
pioneer.led_control(255, 0, 0, 0)
swarm.close()
