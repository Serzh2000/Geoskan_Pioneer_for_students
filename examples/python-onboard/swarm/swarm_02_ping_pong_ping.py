# Ping-pong, часть 1 из 2: этот файл запускают на ПЕРВОМ дроне, на втором - swarm_02_ping_pong_pong.py.
# Порядок: на панели «Рой» выберите дрон 2, загрузите pong, нажмите «Запуск»; затем выберите дрон 1,
# загрузите ping и тоже нажмите «Запуск». Дрон отправляет «ping N» соседу и ждёт «pong N».
from pioneer_swarm import PioneerSwarmUnit
import time

swarm = PioneerSwarmUnit()
neighbours = swarm.get_unit_list()
if not neighbours:
    print('Соседей нет: добавьте второй дрон на панели «Рой» (язык Python · SDK2)')
else:
    partner = neighbours[0]
    for number in range(1, 6):
        delivered = swarm.send_message_to_unit(partner, 'ping ' + str(number))
        print('Отправил', partner, ': ping', number, '- доставлено' if delivered else '- юнита нет в сети')
        answer = None
        waited = 0.0
        while answer is None and waited < 3.0:
            answer = swarm.get_next_message()  # без ожидания: пустой ящик - None
            time.sleep(0.1)
            waited += 0.1
        if answer is None:
            print('Ответа нет')
        else:
            sender, text = answer
            print('Ответ от', sender, ':', text)
swarm.close()
