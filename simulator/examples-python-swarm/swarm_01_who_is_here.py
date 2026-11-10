# Рой: кто в сети? Запустите на любом дроне (Мини 2 или Базовый с Radxa, язык «Python · SDK2»).
# Остальные дроны сцены (панель «Рой») отвечать не обязаны: на каждом борту с pioneer_sdk2 работает swarm-server,
# он сам раз в секунду рассылает Heartbeat («я жив, мой тип и мои данные»). Добавьте 1-2 дрона и запустите программу.
from pioneer_swarm import PioneerSwarmUnit, SwarmUnitType
import time

swarm = PioneerSwarmUnit()
print('Я:', swarm.id)

# Свой тип известен после первого собственного Heartbeat - до него unit_type равен None.
while swarm.unit_type is None:
    time.sleep(0.1)
print('Мой тип:', swarm.unit_type, '(воздушный)' if swarm.unit_type == SwarmUnitType.AERO else '')

for second in range(5):
    neighbours = swarm.get_unit_list()  # соседи, себя в списке нет
    print(second, 'соседей:', len(neighbours), neighbours)
    time.sleep(1)

swarm.close()
