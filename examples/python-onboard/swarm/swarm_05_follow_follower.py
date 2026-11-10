# Ведущий и ведомый, часть 2 из 2: ВЕДОМЫЙ - запускают на ВТОРОМ дроне, раньше ведущего (swarm_05_follow_leader.py).
# Каждые полсекунды ведомый читает локальную позицию ведущего и летит в точку на метр позади него (по оси x).
from pioneer_sdk2 import Pioneer
from pioneer_swarm import PioneerSwarmUnit
import time

LEADER = 'pioneer1'  # machine_id ведущего (смотрите его в панели «Рой»)
OFFSET_X = -1.0      # на сколько метров позади (по оси x) держаться
OFFSET_Y = 0.0

pioneer = Pioneer()
swarm = PioneerSwarmUnit()
pioneer.arm()
pioneer.takeoff()
print('Ведомый', swarm.id, 'следует за', LEADER)

for step in range(60):
    result = swarm.get_telemetry_from_unit(LEADER, timeout_sec=2.0)
    if result is None:
        print('Ведущий', LEADER, 'не найден в сети')
        break
    position = result[1]['navigation/local/position']
    pioneer.go_to_local_point(x=position.x + OFFSET_X, y=position.y + OFFSET_Y, z=1.0)
    time.sleep(0.5)

pioneer.land()
swarm.close()
