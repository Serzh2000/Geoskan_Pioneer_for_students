# Синхронный взлёт по сообщению, часть 1 из 2: КОМАНДИР - запускают на ПЕРВОМ дроне. Ведомые -
# swarm_06_sync_takeoff_wingman.py на остальных дронах (запустите их раньше). Команды рою - обычные текстовые сообщения:
# «готовность» -> ведомые запускают моторы и отвечают «готов»; после обратного отсчёта «взлёт»; в конце «посадка».
from pioneer_sdk2 import Pioneer
from pioneer_swarm import PioneerSwarmUnit
import time

pioneer = Pioneer()
swarm = PioneerSwarmUnit()
time.sleep(1)
wingmen = swarm.get_unit_list()
print('Командир', swarm.id, ', в строю:', wingmen)


def tell_all(text):
    for unit_id in wingmen:
        swarm.send_message_to_unit(unit_id, text)


tell_all('готовность')
ready = set()
waited = 0.0
while len(ready) < len(wingmen) and waited < 20.0:
    message = swarm.get_next_message()
    if message is None:
        time.sleep(0.1)
        waited += 0.1
    elif message[1] == 'готов':
        ready.add(message[0])
        print(message[0], 'готов')

if len(ready) == len(wingmen):
    for count in (3, 2, 1):
        print('Взлёт через', count)
        time.sleep(1)
    tell_all('взлёт')
    pioneer.arm()
    pioneer.takeoff()
    print('Все в воздухе')
    time.sleep(3)
    tell_all('посадка')
    pioneer.land()
else:
    print('Не все готовы, взлёт отменён')
    tell_all('отбой')
swarm.close()
