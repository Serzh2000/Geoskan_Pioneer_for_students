# Синхронный взлёт по сообщению, часть 2 из 2: ВЕДОМЫЙ - запускают на втором (и третьем) дроне, раньше командира
# (swarm_06_sync_takeoff_commander.py). Ждёт команды в почтовом ящике: «готовность», «взлёт», «посадка».
from pioneer_sdk2 import Pioneer
from pioneer_swarm import PioneerSwarmUnit
import time

pioneer = Pioneer()
swarm = PioneerSwarmUnit()


def wait_for(command, limit=60.0):
    """Ждёт сообщение с текстом command; возвращает, кто его прислал, или None, если время вышло."""
    waited = 0.0
    while waited < limit:
        message = swarm.get_next_message()
        if message is not None:
            if message[1] == command:
                return message[0]
            if message[1] == 'отбой':
                return None
        time.sleep(0.1)
        waited += 0.1
    return None


print(swarm.id, 'ждёт команду')
commander = wait_for('готовность')
if commander is not None:
    pioneer.arm()
    swarm.send_message_to_unit(commander, 'готов')
    print(swarm.id, 'готов, моторы запущены')
    if wait_for('взлёт') is not None:
        pioneer.takeoff()
        print(swarm.id, 'в воздухе')
        wait_for('посадка')
        pioneer.land()
    else:
        pioneer.disarm()
else:
    print('Команды не было')
swarm.close()
