# Телеметрия соседей. Запустите на любом дроне: остальные могут стоять на земле и не выполнять программ -
# swarm-server каждого борта отдаёт данные тем, кто на них подписался. Первый запрос подписывает на потоки соседа,
# get_telemetry_from_unit ждёт по одному сэмплу каждого потока (не дольше timeout_sec) и возвращает словарь потоков.
from pioneer_swarm import PioneerSwarmUnit, SwarmUnitType

swarm = PioneerSwarmUnit()
for unit_id in swarm.get_unit_list():
    result = swarm.get_telemetry_from_unit(unit_id, timeout_sec=5.0)
    if result is None:
        print(unit_id, ': не найден в сети')
        continue
    unit_type, telemetry = result
    if unit_type != SwarmUnitType.AERO:
        print(unit_id, ': не дрон, пропускаю')
        continue
    position = telemetry['navigation/local/position']
    altitude = telemetry['sensors/altitude']
    battery = telemetry['sensors/battery_state']
    flight = telemetry['flight/fly_state']
    print(unit_id, ': позиция (%.2f, %.2f, %.2f) м' % (position.x, position.y, position.z))
    print('   высота %.2f м, батарея %.2f В, состояние полёта %d (0 - на земле, 1 - моторы, 2 - в воздухе)' % (altitude.data, battery.voltage, flight.data))
    print('   потоков:', len(telemetry), '-', ', '.join(sorted(telemetry.keys())))
swarm.close()
