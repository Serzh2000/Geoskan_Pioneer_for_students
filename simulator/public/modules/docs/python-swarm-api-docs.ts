import type { ApiDoc } from './api-docs-types.js';

/*
 * Справочник Swarm Kit (pioneer_swarm) для Пионера Мини 2 и Базового с Radxa (язык «Python · SDK2»).
 * Источник - docs/swarm/swarm-kit.md (docs.geoscan.ru); допущения там, где справочник Геоскана молчит, - в
 * docs/swarm/emulation-notes.md. Каталог потоков совпадает с _STREAMS в python/swarm/prelude.ts.
 */

type Entry = [desc: string, syntax: string, params: string, returns: string, example: string, insertText: string, aliases?: string[]];

function entry([desc, syntax, params, returns, example, insertText, aliases]: Entry, kind: string): ApiDoc {
    return { desc, syntax, params, returns, example, insertText, kind, ...(aliases ? { aliases } : {}) };
}

const HEAD = 'from pioneer_swarm import PioneerSwarmUnit, SwarmUnitType\nswarm = PioneerSwarmUnit()\n';

const CLASS_DOCS: Record<string, Entry> = {
    'PioneerSwarmUnit': ['Участник роя (Swarm Kit): находит соседей, пишет им, читает свой почтовый ящик и их телеметрию. Рой одноранговый: центрального сервера нет, у каждого дрона есть имя - machine_id (в симуляторе pioneer1, pioneer2 ... по номеру из имени дрона; он виден в панели «Рой»). На каждом дроне с pioneer_sdk2 работает swarm-server: он сам шлёт Heartbeat раз в секунду и отдаёт данные подписавшимся, даже если на этом дроне не запущена программа. Без определённого machine_id объект не создаётся (RuntimeError). Работает на Мини 2 и на Базовом с Radxa (язык «Python · SDK2»).', 'PioneerSwarmUnit(domain_id=0, machine_id=None, sync_wait_timeout_sec=None)', 'domain_id - домен роя (0..232): у всех участников должен совпадать; machine_id - свой идентификатор, обычно не нужен (определяется с борта; латинские буквы, цифры, _); sync_wait_timeout_sec - сколько ждать появления id (в симуляторе id известен сразу, параметр принимается для совместимости)', 'объект PioneerSwarmUnit', HEAD + 'print(swarm.id, swarm.unit_type)\nswarm.close()', 'PioneerSwarmUnit()', ['рой', 'swarm', 'swarm kit', 'юнит', 'pioneer_swarm']],
    'PioneerSwarmUnit.id': ['Свой machine_id (строка), по нему к дрону обращаются остальные. Остаётся доступным и после close().', 'swarm.id -> str', 'нет', 'str', HEAD + 'print("Я:", swarm.id)', 'id', ['имя', 'идентификатор', 'machine_id']],
    'PioneerSwarmUnit.unit_type': ['Свой тип юнита (SwarmUnitType) или None: он появляется после первого собственного Heartbeat (в симуляторе - через полсекунды после создания объекта). У Мини 2 и Базового с Radxa - SwarmUnitType.AERO.', 'swarm.unit_type -> SwarmUnitType | None', 'нет', 'SwarmUnitType или None', 'import time\n' + HEAD + 'while swarm.unit_type is None:\n    time.sleep(0.1)\nprint(swarm.unit_type)', 'unit_type', ['тип']],
    'PioneerSwarmUnit.get_unit_list': ['Идентификаторы соседей, которых сейчас слышно в сети (себя не включает), по возрастанию номеров. Юнит, чей Heartbeat не слышен 3 секунды, пропадает из списка; новый появляется после своего первого Heartbeat. Видны только юниты того же домена.', 'swarm.get_unit_list() -> list[str]', 'нет', 'список строк machine_id', HEAD + 'for unit_id in swarm.get_unit_list():\n    print(unit_id)', 'get_unit_list()', ['соседи', 'список']],
    'PioneerSwarmUnit.send_message_to_unit': ['Отправляет текст в почтовый ящик юнита. True - адресат есть в сети и сообщение ушло; False - юнита в списке нет (в том числе при адресе самому себе или в другой домен). Сообщения доходят в порядке отправки; в ящике хранится не больше 100 (старые вытесняются). Сообщение должно быть строкой (TypeError).', 'swarm.send_message_to_unit(unit_id: str, message: str) -> bool', 'unit_id - machine_id адресата; message - текст (протоколом не регламентируется: команда, статус, любой текст)', 'bool', HEAD + 'if swarm.send_message_to_unit("pioneer2", "взлёт"):\n    print("отправлено")', 'send_message_to_unit(unit_id, message)', ['сообщение', 'написать', 'письмо']],
    'PioneerSwarmUnit.get_next_message': ['Следующее входящее сообщение из своего ящика, без ожидания; очередь пуста - None. Сообщение извлекается из ящика. Если программы на дроне нет, сообщения ждут в ящике до её старта; ящик очищается, когда программа закрывает соединение.', 'swarm.get_next_message() -> tuple[str, str] | None', 'нет', '(sender_id, text) или None', HEAD + 'message = swarm.get_next_message()\nif message is not None:\n    sender, text = message', 'get_next_message()', ['входящие', 'ящик', 'почта']],
    'PioneerSwarmUnit.get_telemetry_from_unit': ['Подписывается на потоки соседа и ждёт телеметрию (или возвращает то, что накопилось к концу таймаута). Первый запрос включает потоки: пока подписчиков нет, они на сеть не льются. Ждёт, пока придёт по сэмплу каждого периодического потока (около полсекунды), время - симулируемое; другие дроны работают, пока программа ждёт. None - юнит не найден (нет в списке соседей); иначе (тип юнита, словарь потоков). Ключи словаря - имена потоков без идентификатора юнита, значения - сообщения ROS 2 (то же, что у топиков /geoscan/...); поток flight/callback_event появляется только после события. timeout_sec=None - ждать без ограничения; timeout_sec=0 - не ждать, только подписаться.', 'swarm.get_telemetry_from_unit(unit_id: str, timeout_sec: float | None = 60.0) -> tuple[SwarmUnitType, dict] | None', 'unit_id - machine_id соседа; timeout_sec - сколько ждать, секунд симуляции', '(SwarmUnitType, dict) или None', HEAD + 'result = swarm.get_telemetry_from_unit("pioneer2", timeout_sec=5.0)\nif result is not None:\n    unit_type, telemetry = result\n    position = telemetry["navigation/local/position"]\n    print(position.x, position.y, position.z)', 'get_telemetry_from_unit(unit_id, timeout_sec=5.0)', ['телеметрия', 'позиция соседа', 'данные соседа']],
    'PioneerSwarmUnit.close': ['Останавливает слежение и отключается от роя: подписки снимаются, почтовый ящик очищается. Безопасно вызывать повторно; после close() остальные методы бросают RuntimeError. Объект, который программа не закрыла, закрывается при её остановке; swarm-server дрона остаётся в сети.', 'swarm.close() -> None', 'нет', 'None', HEAD + 'swarm.close()', 'close()', ['закрыть', 'отключиться']],
    'SwarmUnitType': ['Тип юнита из его Heartbeat: AERO - воздушный, ROVER - наземный, MARINE - водный, ROBOT - робот, OTHER - иное или неизвестное. Дроны симулятора - AERO.', 'class SwarmUnitType(Enum): AERO, ROVER, MARINE, ROBOT, OTHER', 'нет', 'перечисление', 'from pioneer_swarm import SwarmUnitType\nif unit_type == SwarmUnitType.AERO:\n    print("воздушный")', 'SwarmUnitType.AERO', ['тип юнита', 'aero', 'rover', 'marine', 'robot']]
};

type StreamRow = { name: string; type: string; hz: string; desc: string; fields: string; alias: string[] };

// Потоки воздушного юнита: объявляются в Heartbeat, отдаются подписавшимся. Те же имена и типы, что у топиков ros_pioneer_node.
const STREAMS: StreamRow[] = [
    { name: 'navigation/local/position', type: 'geometry_msgs/msg/Point', hz: '20 Гц', desc: 'Локальная позиция LPS, м (оси сцены).', fields: 'x, y, z', alias: ['позиция', 'координаты'] },
    { name: 'navigation/local/velocity', type: 'geometry_msgs/msg/Vector3', hz: '20 Гц', desc: 'Скорость, м/с.', fields: 'x, y, z', alias: ['скорость'] },
    { name: 'navigation/local/yaw', type: 'std_msgs/msg/Float32', hz: '20 Гц', desc: 'Курс (рыскание), радианы - как у топика /geoscan/navigation/local/yaw.', fields: 'data', alias: ['курс', 'yaw'] },
    { name: 'navigation/local/status', type: 'gs_interfaces/msg/NavStatus', hz: '20 Гц', desc: 'Состояние навигации: 0 NO_DATA, 1 CANNOT, 2 LOW, 3 OK (в симуляторе всегда 3).', fields: 'status', alias: ['навигация'] },
    { name: 'sensors/imu', type: 'sensor_msgs/msg/Imu', hz: '30 Гц', desc: 'Ориентация (кватернион), угловая скорость, линейное ускорение.', fields: 'orientation, angular_velocity, linear_acceleration', alias: ['imu', 'гироскоп'] },
    { name: 'sensors/altitude', type: 'std_msgs/msg/Float32', hz: '10 Гц', desc: 'Высота, м.', fields: 'data', alias: ['высота'] },
    { name: 'sensors/battery_state', type: 'sensor_msgs/msg/BatteryState', hz: '2 Гц', desc: 'Напряжение и температура батареи.', fields: 'voltage, temperature, present', alias: ['батарея', 'акб'] },
    { name: 'flight/fly_state', type: 'std_msgs/msg/Int8', hz: '10 Гц', desc: 'Состояние полёта: 0 - на земле, 1 - моторы запущены, 2 - в воздухе.', fields: 'data', alias: ['состояние полёта'] },
    { name: 'flight/callback_event', type: 'std_msgs/msg/Int8', hz: 'по событию', desc: 'Последнее событие автопилота с момента подписки: 1 DISARM, 2 COPTER_LANDED, 3 LOW_VOLTAGE1, 4 LOW_VOLTAGE2, 7 TAKEOFF_COMPLETE, 8 ENGINES_STARTED, 9 SHOCK (коды Event из pioneer_sdk2). Событий точки (POINT_REACHED) в потоке нет. Ключа нет в словаре, пока событий не было.', fields: 'data', alias: ['событие', 'event'] }
];

function build(): Record<string, ApiDoc> {
    const docs: Record<string, ApiDoc> = {};
    for (const [key, value] of Object.entries(CLASS_DOCS)) docs[key] = entry(value, key === 'PioneerSwarmUnit' || key === 'SwarmUnitType' ? 'Class' : key === 'PioneerSwarmUnit.id' || key === 'PioneerSwarmUnit.unit_type' ? 'Property' : 'Method');
    for (const row of STREAMS) {
        docs[`pioneer1/${row.name}`] = entry([
            `Поток телеметрии юнита: ${row.desc} Частота - ${row.hz}; полное имя потока в сети начинается с machine_id юнита (pioneer1/${row.name}), а ключ в словаре get_telemetry_from_unit - без него. Тип: ${row.type}.`,
            `telemetry["${row.name}"]`,
            `поля: ${row.fields}`,
            row.type.split('/')[2],
            `${HEAD}result = swarm.get_telemetry_from_unit("pioneer2", timeout_sec=5.0)\ntelemetry = result[1]\nvalue = telemetry["${row.name}"]`,
            `"${row.name}"`,
            row.alias
        ], 'Topic');
    }
    return docs;
}

export const pythonSwarmApiDocs: Record<string, ApiDoc> = build();
