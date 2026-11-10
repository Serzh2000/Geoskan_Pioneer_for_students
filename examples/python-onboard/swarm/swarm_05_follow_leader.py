# Ведущий и ведомый, часть 1 из 2: ВЕДУЩИЙ - запускают на ПЕРВОМ дроне (pioneer1). Он просто летит по квадрату;
# говорить ведомому ничего не нужно: позицию ведущего ведомый читает из его телеметрии.
# Ведомый - swarm_05_follow_follower.py на втором дроне; запустите его раньше, затем ведущего.
from pioneer_sdk2 import Pioneer
from pioneer_swarm import PioneerSwarmUnit
import time

pioneer = Pioneer()
swarm = PioneerSwarmUnit()
print('Ведущий', swarm.id, 'взлетает')
pioneer.arm()
pioneer.takeoff()

route = [(2, 0, 1), (2, 2, 1), (0, 2, 1), (0, 0, 1)]
for x, y, z in route:
    pioneer.go_to_local_point(x=x, y=y, z=z)
    while not pioneer.point_reached():
        time.sleep(0.1)
    print('Ведущий в точке', x, y, z)
    time.sleep(1)

pioneer.land()
swarm.close()
