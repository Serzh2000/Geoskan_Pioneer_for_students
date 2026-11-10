# Рассылка всем соседям, часть 1 из 2: отправитель - запускают на ПЕРВОМ дроне. Получатели - swarm_03_broadcast_receiver.py
# на втором и третьем дронах (запустите их раньше). В рое нет «сообщения всем»: письмо уходит каждому юниту отдельно.
from pioneer_swarm import PioneerSwarmUnit
import time

swarm = PioneerSwarmUnit()
time.sleep(2)  # получатели успели запуститься
neighbours = swarm.get_unit_list()
delivered = 0
for unit_id in neighbours:
    if swarm.send_message_to_unit(unit_id, 'Всем привет от ' + swarm.id):
        delivered += 1
print('Соседей:', len(neighbours), ', доставлено:', delivered)

# Юниту, которого нет в сети, письмо не уходит: метод возвращает False.
print('Юниту pioneer99:', swarm.send_message_to_unit('pioneer99', 'эй'))
swarm.close()
