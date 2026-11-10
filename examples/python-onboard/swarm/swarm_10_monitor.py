# Монитор роя: кто появился, кто пропал, как дела у остальных. Запустите на любом дроне и, не останавливая программу,
# добавьте или удалите дрон на панели «Рой»: новый юнит появится через секунду, удалённый - примерно через три
# (Heartbeat раз в секунду; юнит, чей Heartbeat не слышен три периода, считается пропавшим).
from pioneer_swarm import PioneerSwarmUnit
import time

swarm = PioneerSwarmUnit()
print('Монитор на', swarm.id)
known = set()
for tick in range(20):
    present = set(swarm.get_unit_list())
    for unit_id in sorted(present - known):
        print('+ в сети:', unit_id)
    for unit_id in sorted(known - present):
        print('- пропал:', unit_id)
    known = present
    for unit_id in sorted(present):
        result = swarm.get_telemetry_from_unit(unit_id, timeout_sec=2.0)
        if result is not None:
            telemetry = result[1]
            print('   %s: высота %.2f м, батарея %.2f В' % (unit_id, telemetry['sensors/altitude'].data, telemetry['sensors/battery_state'].voltage))
    time.sleep(1)
swarm.close()
