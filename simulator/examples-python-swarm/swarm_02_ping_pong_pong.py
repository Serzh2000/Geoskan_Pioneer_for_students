# Ping-pong, часть 2 из 2: этот файл запускают на ВТОРОМ дроне (раньше, чем swarm_02_ping_pong_ping.py на первом).
# Дрон ждёт сообщения в своём почтовом ящике и на каждое отвечает «pong» тому, кто написал.
from pioneer_swarm import PioneerSwarmUnit
import time

swarm = PioneerSwarmUnit()
print('Я', swarm.id, '- жду сообщения...')
silence = 0.0
while silence < 10.0:
    message = swarm.get_next_message()
    if message is None:
        time.sleep(0.1)
        silence += 0.1
    else:
        silence = 0.0
        sender, text = message
        print('Получил от', sender, ':', text)
        swarm.send_message_to_unit(sender, 'pong' + text[4:])
print('Десять секунд тишины, закрываю соединение')
swarm.close()
