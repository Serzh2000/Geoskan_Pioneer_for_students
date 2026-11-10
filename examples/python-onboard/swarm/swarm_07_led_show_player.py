# Световое шоу роя, часть 2 из 2: ИГРОК - запускают на втором (и третьем) дроне, раньше дирижёра
# (swarm_07_led_show_conductor.py). Включает светодиоды в цвет, который назвал дирижёр; «off» - конец шоу.
from pioneer_sdk2 import Pioneer
from pioneer_swarm import PioneerSwarmUnit
import time

COLOURS = {'red': (1, 0, 0), 'green': (0, 1, 0), 'blue': (0, 0, 1), 'white': (1, 1, 1), 'off': (0, 0, 0)}

pioneer = Pioneer()
swarm = PioneerSwarmUnit()
print(swarm.id, 'ждёт сигнал дирижёра')
silence = 0.0
finished = False
while silence < 15.0 and not finished:
    message = swarm.get_next_message()
    if message is None:
        time.sleep(0.05)
        silence += 0.05
    else:
        silence = 0.0
        text = message[1]
        if text in COLOURS:
            r, g, b = COLOURS[text]
            pioneer.led_control(255, r, g, b)
            print(swarm.id, ':', text)
        if text == 'off':
            finished = True
swarm.close()
