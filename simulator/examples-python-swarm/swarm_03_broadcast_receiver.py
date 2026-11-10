# Рассылка всем соседям, часть 2 из 2: получатель. Запустите на втором и на третьем дроне
# (раньше, чем swarm_03_broadcast_sender.py на первом). Печатает всё, что пришло в почтовый ящик.
from pioneer_swarm import PioneerSwarmUnit
import time

swarm = PioneerSwarmUnit()
print(swarm.id, 'слушает рой')
received = 0
waited = 0.0
while waited < 8.0:
    message = swarm.get_next_message()
    if message is None:
        time.sleep(0.1)
        waited += 0.1
    else:
        sender, text = message
        received += 1
        print(swarm.id, 'получил от', sender, ':', text)
print(swarm.id, 'получил сообщений:', received)
swarm.close()
