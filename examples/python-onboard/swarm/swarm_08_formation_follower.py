# Строй по относительной позиции. Запускают на втором и третьем дронах; ведущий - дрон 1 с программой
# swarm_05_follow_leader.py (запустите ведомых раньше). У каждого дрона своё место в строю, оно выбирается
# по номеру в machine_id: pioneer2 - первое место, pioneer3 - второе. Место - смещение от ведущего в осях сцены, метры.
from pioneer_sdk2 import Pioneer
from pioneer_swarm import PioneerSwarmUnit
import time

LEADER = 'pioneer1'
SLOTS = [(-1.0, 1.0), (-1.0, -1.0), (-2.0, 0.0)]

pioneer = Pioneer()
swarm = PioneerSwarmUnit()
number = int(swarm.id.replace('pioneer', ''))
dx, dy = SLOTS[(number - 2) % len(SLOTS)]
print(swarm.id, ': моё место в строю', dx, dy)

pioneer.arm()
pioneer.takeoff()
for step in range(60):
    result = swarm.get_telemetry_from_unit(LEADER, timeout_sec=2.0)
    if result is None:
        print('Ведущий', LEADER, 'не найден в сети')
        break
    leader = result[1]['navigation/local/position']
    pioneer.go_to_local_point(x=leader.x + dx, y=leader.y + dy, z=1.0)
    time.sleep(0.5)
pioneer.land()
swarm.close()
