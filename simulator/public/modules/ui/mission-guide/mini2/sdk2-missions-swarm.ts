import { DONE_LINE, flightProgram, FLY_TO, type Sdk2Mission } from './sdk2-mission-kit.js';

/**
 * Главы 18–19: рой (`pioneer_swarm`, Swarm Kit) внутри режима «Python · SDK2». Рядом с дроном ученика на сцене
 * стоят дроны-соседи (поле `swarm.neighbours`); у некоторых работает своя программа (боты ниже). Боты молчат:
 * `print` идёт на дрон, запущенный последним, то есть в журнал ученика. Примеры: examples-python-swarm.
 */
const R = { group: 'swarm-talk', groupTitle: '18. Рой: общение' };
const S = { group: 'swarm-formation', groupTitle: '19. Рой: телеметрия и строй' };

const SWARM_HEAD = 'from pioneer_swarm import PioneerSwarmUnit\nimport time\n\nswarm = PioneerSwarmUnit()\n';
const FLEET_HEAD = 'from pioneer_sdk2 import Pioneer\nfrom pioneer_swarm import PioneerSwarmUnit\nimport time\n\npioneer = Pioneer()\nswarm = PioneerSwarmUnit()\n';
const indent = (text: string) => text.split('\n').map((line) => (line ? `    ${line}` : line)).join('\n');

/** Программа на земле: соединение с роем закрывается в finally. */
function swarmProgram(body: string, before = ''): string {
    return `${SWARM_HEAD}${before}
try:
${indent(body.trimEnd())}
finally:
    swarm.close()
${DONE_LINE}`;
}

/** Сосед отвечает «pong N» на каждое «ping N» и замолкает через 15 с тишины. */
export const PONG_BOT = `from pioneer_swarm import PioneerSwarmUnit
import time

swarm = PioneerSwarmUnit()
silence = 0.0
while silence < 15.0:
    message = swarm.get_next_message()
    if message is None:
        time.sleep(0.1)
        silence += 0.1
    else:
        silence = 0.0
        sender, text = message
        swarm.send_message_to_unit(sender, 'pong' + text[4:])
swarm.close()
`;

/** Сосед отвечает «здесь <свой id>» на первое сообщение. */
export const ECHO_BOT = `from pioneer_swarm import PioneerSwarmUnit
import time

swarm = PioneerSwarmUnit()
waited = 0.0
while waited < 20.0:
    message = swarm.get_next_message()
    if message is None:
        time.sleep(0.1)
        waited += 0.1
    else:
        swarm.send_message_to_unit(message[0], 'здесь ' + swarm.id)
        break
time.sleep(1)
swarm.close()
`;

/** Сосед взлетает, летит в точку (1.5, 0.5, 1), висит 12 секунд и садится. */
export const HOVER_BOT = `from pioneer_sdk2 import Pioneer
from pioneer_swarm import PioneerSwarmUnit
import time

pioneer = Pioneer()
swarm = PioneerSwarmUnit()
pioneer.arm()
pioneer.takeoff()
pioneer.go_to_local_point(x=1.5, y=0.5, z=1.0)
while not pioneer.point_reached():
    time.sleep(0.1)
time.sleep(12)
pioneer.land()
pioneer.disarm()
swarm.close()
`;

/** Ведущий: взлетает, летит в (2, 0, 1), потом в (2, 2, 1), на каждой точке висит 3 секунды и садится. */
export const LEADER_BOT = `from pioneer_sdk2 import Pioneer
from pioneer_swarm import PioneerSwarmUnit
import time

pioneer = Pioneer()
swarm = PioneerSwarmUnit()
pioneer.arm()
pioneer.takeoff()
for x, y in [(2, 0), (2, 2)]:
    pioneer.go_to_local_point(x=x, y=y, z=1)
    while not pioneer.point_reached():
        time.sleep(0.1)
    time.sleep(3)
pioneer.land()
pioneer.disarm()
swarm.close()
`;

/** Ведомый по команде: «готовность» → arm и «готов», «взлёт» → takeoff, «посадка» → land; «отбой» — отмена. */
export const WINGMAN_BOT = `from pioneer_sdk2 import Pioneer
from pioneer_swarm import PioneerSwarmUnit
import time

pioneer = Pioneer()
swarm = PioneerSwarmUnit()


def wait_for(command, limit=60.0):
    waited = 0.0
    while waited < limit:
        message = swarm.get_next_message()
        if message is not None:
            if message[1] == command:
                return message[0]
            if message[1] == 'отбой':
                return None
        time.sleep(0.1)
        waited += 0.1
    return None


commander = wait_for('готовность')
if commander is not None:
    pioneer.arm()
    swarm.send_message_to_unit(commander, 'готов')
    if wait_for('взлёт') is not None:
        pioneer.takeoff()
        wait_for('посадка')
        pioneer.land()
    pioneer.disarm()
swarm.close()
`;

/** Ведомый строя: по команде взлетает и держится на метр позади командира (по оси x), по «посадка» садится. */
export const FORMATION_BOT = `from pioneer_sdk2 import Pioneer
from pioneer_swarm import PioneerSwarmUnit
import time

pioneer = Pioneer()
swarm = PioneerSwarmUnit()


def wait_for(command, limit=60.0):
    waited = 0.0
    while waited < limit:
        message = swarm.get_next_message()
        if message is not None and message[1] == command:
            return message[0]
        time.sleep(0.1)
        waited += 0.1
    return None


commander = wait_for('готовность')
if commander is not None:
    pioneer.arm()
    swarm.send_message_to_unit(commander, 'готов')
    if wait_for('взлёт') is not None:
        pioneer.takeoff()
        landing = False
        while not landing:
            result = swarm.get_telemetry_from_unit(commander, timeout_sec=1.0)
            if result is not None:
                position = result[1]['navigation/local/position']
                pioneer.go_to_local_point(x=position.x - 1.0, y=position.y, z=1.0)
            message = swarm.get_next_message()
            landing = message is not None and message[1] == 'посадка'
            time.sleep(0.3)
        pioneer.land()
    pioneer.disarm()
swarm.close()
`;

export const SWARM_MISSIONS: Sdk2Mission[] = [
    {
        ...R, id: 'sdk2-swarm-units', title: 'Кто в рое',
        goal: 'Подключиться к рою, узнать свой `machine_id` и список соседей. Дрон остаётся на земле.',
        steps: [
            'Рой — это дроны в одной сети: у каждого свой идентификатор `machine_id` (`pioneer1`, `pioneer2`…). `PioneerSwarmUnit()` подключает вашу программу к рою. В симуляторе рядом с вашим дроном стоят два дрона-соседа (Пионер Мини 2 · 2 и 3): их `swarm-server` отвечает без программ.',
            '`swarm.id` — ваш идентификатор. `swarm.unit_type` становится известен после вашего первого Heartbeat («я жив»): пока он `None`, программа ждёт. Свой список = `get_unit_list()`: соседи без вас.',
            'Вместо `___` впишите метод, который возвращает список соседей: `get_unit_list`.',
            'Закрыть соединение — `swarm.close()` (в заготовке оно в `finally`). Нажмите «Проверить полёт»: ваш id, тип AERO, число соседей и их идентификаторы.'
        ],
        hint: 'Метод начинается с get_, потом unit (юнит), потом list (список): get_unit_list().',
        outcome: 'Вы видите рой: себя и соседей. Дальше соседей можно звать по идентификаторам: писать им и читать их телеметрию.',
        starter: swarmProgram('print("Я:", swarm.id)\nwhile swarm.unit_type is None:\n    time.sleep(0.1)\nprint("Тип:", swarm.unit_type.name)\ntime.sleep(1)\nneighbours = swarm.___()\nprint("Соседей:", len(neighbours))\nfor unit_id in neighbours:\n    print("Сосед:", unit_id)'),
        answers: ['get_unit_list'], waitMs: 30000,
        swarm: { neighbours: [{}, {}] },
        check: (g) => {
            g.basics(false).noArm();
            const me = g.text('Я:');
            if (!me || !/^pioneer\d+$/.test(me)) g.fail('Нет вашего идентификатора', `Напечатано: «${me ?? 'ничего'}», ожидался pioneerN.`, 'Напечатайте swarm.id.');
            g.expectText('Тип:', 'AERO', 'Тип юнита читается из swarm.unit_type после первого Heartbeat; напечатайте его .name.');
            const count = g.numbers('Соседей:')?.[0];
            const listed = g.texts('Сосед:');
            if (count === undefined || count < 2) g.fail('Соседей меньше двух', `Напечатано соседей: ${count ?? 'нет строки'}.`, 'Подождите секунду после создания объекта и прочитайте get_unit_list().');
            else if (listed.length !== count) g.fail('Список не совпал с числом', `Строк «Сосед:» — ${listed.length}, а число соседей ${count}.`, 'Напечатайте по строке на каждого соседа из списка.');
            if (me && listed.includes(me)) g.fail('Себя в списке соседей быть не должно', 'get_unit_list() не включает ваш id.', 'Не добавляйте swarm.id в список соседей.');
        }
    },
    {
        ...R, id: 'sdk2-swarm-send', title: 'Сообщение соседу',
        goal: 'Отправить текстовое сообщение соседу и понять, что значит результат отправки.',
        steps: [
            'У каждого юнита есть почтовый ящик. `send_message_to_unit(unit_id, текст)` кладёт строку в ящик адресата и возвращает `True`, если адресат в сети, и `False`, если такого юнита нет (себе писать тоже нельзя).',
            'Программа берёт первого соседа из списка и пишет ему «привет», потом пробует написать несуществующему `pioneer99` и самой себе.',
            'Вместо `___` впишите метод отправки сообщения: `send_message_to_unit`.',
            'Нажмите «Проверить полёт»: «Доставлено: True», «Несуществующему: False», «Самому себе: False».'
        ],
        hint: 'Метод называется как действие: send message to unit — send_message_to_unit.',
        outcome: 'Вы отправили сообщение и поняли, что `True` — это «адресат найден и сообщение ушло», но не «прочитано».',
        starter: swarmProgram('time.sleep(1)\nneighbours = swarm.get_unit_list()\nif not neighbours:\n    print("Соседей нет")\nelse:\n    partner = neighbours[0]\n    print("Доставлено:", swarm.___(partner, "привет"))\n    print("Несуществующему:", swarm.send_message_to_unit("pioneer99", "привет"))\n    print("Самому себе:", swarm.send_message_to_unit(swarm.id, "эхо"))'),
        answers: ['send_message_to_unit'], waitMs: 30000,
        swarm: { neighbours: [{}] },
        check: (g) => {
            g.basics(false).noArm();
            g.order(['Доставлено: True', 'Несуществующему: False', 'Самому себе: False'], 'Отправьте соседу и прочитайте результат send_message_to_unit: True для существующего, False для остальных.');
        }
    },
    {
        ...R, id: 'sdk2-swarm-pingpong', title: 'Ping-pong с соседом',
        goal: 'Получать ответы: послать «ping N» и прочитать «pong N» из своего почтового ящика.',
        steps: [
            'Сосед (Пионер Мини 2 · 2) запущен с программой-эхо: на каждое «ping N» он отвечает «pong N». Его программу видно, если выбрать его на панели «Рой».',
            '`get_next_message()` — без ожидания: возвращает пару `(отправитель, текст)` или `None`, если ящик пуст. Поэтому ответ опрашивают в цикле с короткой паузой и ограничивают ожидание: если ответа нет за 3 секунды, программа идёт дальше.',
            'Вместо `___` впишите метод чтения входящих сообщений: `get_next_message`.',
            'Нажмите «Проверить полёт»: «Ответ: pong 1», «Ответ: pong 2», «Ответ: pong 3».'
        ],
        hint: 'Метод читает следующее входящее сообщение: get next message.',
        outcome: 'Это основа любого обмена в рое: отправили — подождали — прочитали. Всегда ограничивайте ожидание: сосед может пропасть.',
        starter: swarmProgram(`time.sleep(1)
neighbours = swarm.get_unit_list()
if not neighbours:
    print("Соседей нет")
else:
    partner = neighbours[0]
    for number in range(1, 4):
        swarm.send_message_to_unit(partner, "ping " + str(number))
        answer = None
        waited = 0.0
        while answer is None and waited < 3.0:
            answer = swarm.___()
            time.sleep(0.1)
            waited += 0.1
        if answer is None:
            print("Ответа нет")
        else:
            sender, text = answer
            print("Ответ:", text)`),
        answers: ['get_next_message'], waitMs: 30000,
        swarm: { neighbours: [{ code: PONG_BOT }] },
        check: (g) => {
            g.basics(false).noArm();
            g.order(['Ответ: pong 1', 'Ответ: pong 2', 'Ответ: pong 3'], 'Отправляйте «ping N», читайте get_next_message() в цикле с паузой и печатайте text из пары (sender, text).');
        }
    },
    {
        ...R, id: 'sdk2-swarm-broadcast', title: 'Рассылка всем соседям',
        goal: 'Отправить сообщение всем и собрать ответы в словарь: кто откликнулся.',
        steps: [
            'Рассылки как отдельной команды нет: сообщение отправляют каждому юниту из `get_unit_list()` в цикле. Два соседа (Мини 2 · 2 и 3) запущены с программой: на первое полученное сообщение они отвечают «здесь <свой id>».',
            'Ответы приходят в любом порядке, поэтому программа складывает их в словарь `answers[отправитель] = текст` и ждёт, пока не откликнутся все или не пройдёт 5 секунд.',
            'Печать идёт по возрастанию идентификаторов: вместо `___` впишите функцию, которая сортирует: `sorted`.',
            'Нажмите «Проверить полёт»: «Ответили: 2 из 2» и по строке на каждого соседа.'
        ],
        hint: 'Функция сортировки списка в Python — sorted(). Она не меняет словарь, а возвращает отсортированный список ключей.',
        outcome: 'Вы собрали отклики всего роя. Так «командир» узнаёт, кто готов к взлёту — следующая тема.',
        starter: swarmProgram(`time.sleep(1)
units = swarm.get_unit_list()
for unit_id in units:
    swarm.send_message_to_unit(unit_id, "кто здесь?")
answers = {}
waited = 0.0
while len(answers) < len(units) and waited < 5.0:
    message = swarm.get_next_message()
    if message is None:
        time.sleep(0.1)
        waited += 0.1
    else:
        sender, text = message
        answers[sender] = text
print("Ответили:", len(answers), "из", len(units))
for sender in ___(answers):
    print(sender, "-", answers[sender])`),
        answers: ['sorted'], waitMs: 30000,
        swarm: { neighbours: [{ code: ECHO_BOT }, { code: ECHO_BOT }] },
        check: (g) => {
            g.basics(false).noArm();
            const counts = g.numbers('Ответили:');
            if (!counts || counts.length < 2) g.fail('Нет строки «Ответили:»', 'Строка с числом ответивших не напечатана.', 'Напечатайте print("Ответили:", len(answers), "из", len(units)).');
            else {
                if (counts[0] < 2) g.fail('Ответили меньше двух', `Ответивших — ${counts[0]}.`, 'Подождите ответы в цикле get_next_message() не меньше 5 секунд и складывайте их в словарь.');
                if (counts[0] !== counts[1]) g.fail('Откликнулись не все', `Ответили ${counts[0]} из ${counts[1]}.`, 'Дожидайтесь ответов всех соседей, пока не пройдёт отведённое время.');
            }
            const lines = g.prints.filter((line) => / - здесь pioneer\d+$/.test(line));
            if (counts && lines.length !== counts[0]) g.fail('Нет строк с ответами', `Строк с ответами — ${lines.length}.`, 'Напечатайте по строке «id - текст» на каждого, кто ответил.');
        }
    },
    {
        ...S, id: 'sdk2-swarm-telemetry', title: 'Телеметрия соседа',
        goal: 'Узнать, где сосед и в каком он состоянии, не говоря с ним: рой отдаёт телеметрию подписавшимся.',
        steps: [
            'Сосед (Мини 2 · 2) взлетает и зависает над точкой. `get_telemetry_from_unit(unit_id, timeout_sec)` подписывается на его потоки и ждёт данные не дольше `timeout_sec`. Результат — `(тип юнита, словарь)`: ключ — имя потока (`navigation/local/position`, `sensors/altitude`, `flight/fly_state`…), значение — сообщение ROS 2.',
            'Программа ждёт 6 секунд, пока сосед взлетит, и читает его телеметрию. У позиции есть поля `x, y, z`, а у `flight/fly_state` — `data`: 0 на земле, 1 моторы запущены, 2 в воздухе.',
            'Вместо `___` впишите имя потока состояния полёта: `flight/fly_state`.',
            'Ваш дрон остаётся на земле. Нажмите «Проверить полёт»: высота соседа около 1 м, состояние 2.'
        ],
        hint: 'Название потока — как в описании: сначала группа flight, затем имя fly_state.',
        outcome: 'Вы читаете чужие датчики: позицию и состояние. Это основа строя: ведомый узнаёт, где ведущий.',
        starter: swarmProgram(`time.sleep(1)
neighbours = swarm.get_unit_list()
if not neighbours:
    print("Соседей нет")
else:
    partner = neighbours[0]
    time.sleep(6)    # сосед взлетает
    result = swarm.get_telemetry_from_unit(partner, timeout_sec=3.0)
    if result is None:
        print("Сосед не найден")
    else:
        unit_type, telemetry = result
        position = telemetry['navigation/local/position']
        flight = telemetry['___']
        print("Высота соседа:", round(position.z, 1))
        print("Состояние соседа:", flight.data)`),
        answers: ['flight/fly_state'], waitMs: 60000,
        swarm: { neighbours: [{ code: HOVER_BOT }] },
        check: (g) => {
            g.basics(false).noArm();
            g.expectNumber('Высота соседа:', 0.7, 1.6, 'Высота соседа — position.z из потока navigation/local/position; читайте телеметрию через 6 секунд после старта.');
            g.expectText('Состояние соседа:', '2', 'flight/fly_state у соседа в воздухе равен 2.');
        }
    },
    {
        ...S, id: 'sdk2-swarm-follow', title: 'Лететь за ведущим',
        goal: 'Следовать за ведущим по его телеметрии: каждые полсекунды лететь в точку на метр позади него.',
        steps: [
            'Ведущий (Мини 2 · 2) взлетает и летит по точкам (2, 0, 1) и (2, 2, 1), зависая на каждой на 3 секунды. Ваша программа — ведомый: она взлетает, читает позицию ведущего и летит в точку на метр позади (по оси x).',
            'Телеметрию читают каждый оборот цикла: `get_telemetry_from_unit(ведущий, timeout_sec=1.0)`. Позиция лежит в потоке `navigation/local/position`, поля `x, y, z`. Команды `go_to_local_point` не ждут прилёта: цель обновляется каждые 0,5 секунды.',
            'Вместо `___` впишите имя потока с позицией после `navigation/local/`: `position`.',
            'Нажмите «Проверить полёт»: ведомый смещается к ведущему: по x — до метра, по y — не меньше метра; потом садится.'
        ],
        hint: 'Название потока координат: position (позиция). Поля x, y, z — как у любой точки.',
        outcome: 'Ведомый «привязан» к ведущему через телеметрию роя: меняется маршрут ведущего — меняется траектория ведомого. Вести строй можно без прямых сообщений.',
        starter: flightProgram({
            head: FLEET_HEAD, before: FLY_TO.replace('def fly_to', '\ndef fly_to') + '\n', after: 'swarm.close()', body: `time.sleep(1)
leader = swarm.get_unit_list()[0]
for _ in range(24):
    result = swarm.get_telemetry_from_unit(leader, timeout_sec=1.0)
    if result is None:
        break
    position = result[1]['navigation/local/___']
    pioneer.go_to_local_point(x=position.x - 1.0, y=position.y, z=1.0)    # на метр позади ведущего
    time.sleep(0.5)`
        }),
        answers: ['position'], waitMs: 120000,
        swarm: { neighbours: [{ code: LEADER_BOT }] },
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            const xs = g.samples.map((sample) => sample.snapshot.pos.x);
            const ys = g.samples.map((sample) => sample.snapshot.pos.y);
            const maxX = Math.max(...xs);
            const maxY = Math.max(...ys);
            if (maxX < 0.6 || maxX > 2.2) g.fail('Ведомый не дошёл до ведущего по x', `Наибольший x ведомого — ${maxX.toFixed(2)} м, ожидалось около 1.`, 'Летите в точку (position.x - 1.0, position.y): ведущий уходит в x = 2.');
            if (maxY < 0.8) g.fail('Ведомый не повторил поворот ведущего', `Наибольший y ведомого — ${maxY.toFixed(2)} м, ведущий уходит в y = 2.`, 'Обновляйте цель каждые полсекунды и берите новую позицию ведущего: он поворачивает на (2, 2).');
        }
    },
    {
        ...S, id: 'sdk2-swarm-sync', title: 'Взлёт по готовности',
        goal: 'Побыть командиром: дождаться «готов» от обоих ведомых и только после этого взлететь самому.',
        steps: [
            'Два ведомых (Мини 2 · 2 и 3) запущены с программой: на «готовность» они запускают моторы и отвечают «готов», на «взлёт» взлетают, на «посадка» садятся. Команды рою — обычные текстовые сообщения.',
            'Командир рассылает «готовность», собирает ответы в множество `ready` (оно не хранит повторы) и ждёт не больше 20 секунд. Если откликнулись все — рассылает «взлёт» и взлетает сам, через пару секунд «посадка». Если нет — «отбой».',
            'Вместо `___` впишите текст сообщения, которым ведомые отвечают на «готовность»: `готов`.',
            'Нажмите «Проверить полёт»: «Готовы: 2 из 2» печатается до запуска ваших моторов, потом взлёт и посадка.'
        ],
        hint: 'Ведомый отвечает одним словом: готов (мужской род, строчными буквами, без точки).',
        outcome: 'Командир сначала убеждается, что все готовы, и только потом действует. Это основа синхронных манёвров роя.',
        starter: `${FLEET_HEAD}

def tell_all(units, text):
    """Отправить одно сообщение всем юнитам из списка."""
    for unit_id in units:
        swarm.send_message_to_unit(unit_id, text)


in_air = False
try:
    time.sleep(1)
    wingmen = swarm.get_unit_list()
    tell_all(wingmen, "готовность")
    ready = set()
    waited = 0.0
    while len(ready) < len(wingmen) and waited < 20.0:
        message = swarm.get_next_message()
        if message is None:
            time.sleep(0.1)
            waited += 0.1
        elif message[1] == '___':
            ready.add(message[0])
    print("Готовы:", len(ready), "из", len(wingmen))
    if wingmen and len(ready) == len(wingmen):
        tell_all(wingmen, "взлёт")
        pioneer.arm()
        pioneer.takeoff()
        in_air = True
        time.sleep(2)
        tell_all(wingmen, "посадка")
        pioneer.land()
        in_air = False
    else:
        tell_all(wingmen, "отбой")
finally:
    if in_air:
        pioneer.land()
    pioneer.disarm()
    swarm.close()
    pioneer.close_connection()
${DONE_LINE}`,
        answers: ['готов'], waitMs: 120000,
        swarm: { neighbours: [{ code: WINGMAN_BOT }, { code: WINGMAN_BOT }] },
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            const counts = g.numbers('Готовы:');
            if (!counts || counts.length < 2 || counts[0] < 2 || counts[0] !== counts[1]) g.fail('Не все готовы', `В журнале: «${g.text('Готовы:') ?? 'нет строки'}».`, 'Соберите «готов» от каждого ведомого (message[1] == "готов") и напечатайте «Готовы: N из N».');
            const ready = g.printEvents.find((event) => (event.text ?? '').startsWith('Готовы:'));
            const arm = g.arms[0];
            if (ready && arm && arm.time < ready.time) g.fail('Взлёт раньше готовности', 'Моторы запущены раньше, чем отозвались все ведомые.', 'Запускайте arm() только после того, как собрали «готов» от всех.');
        }
    },
    {
        ...S, id: 'sdk2-swarm-project', title: 'Итог: звено командира и ведомого',
        goal: 'Собрать маленькое звено: командир взлетает по готовности ведомого, летит по маршруту, а ведомый держится позади; сигналит подсветка.',
        steps: [
            'Ведомый (Мини 2 · 2) работает по программе-строю: по «готовность» запускает моторы и отвечает «готов», по «взлёт» взлетает и держится на метр позади командира по его телеметрии, по «посадка» садится.',
            'Ваша программа — командир. Алгоритм: жёлтый свет → «готовность» и ожидание «готов» → «взлёт» → зелёный свет и маршрут по точкам (1, 0), (1, 1), (0, 1) на высоте 1 м → «посадка» и посадка → свет гаснет.',
            'Вместо `___` впишите цвет зелёного света: `r=0, g=1, b=0`.',
            'Нажмите «Проверить полёт»: «Звено готово: 1 из 1» печатается до моторов, цвета светодиода 0 — жёлтый, зелёный, выключен, маршрут пройден.'
        ],
        hint: 'Цвет задаётся долями красного, зелёного и синего от 0 до 1. Для зелёного красный и синий равны нулю.',
        outcome: 'Рой собирается из простых частей: сообщения для согласования, телеметрия для слежения, подсветка для сигналов. Этот шаблон растёт до любого числа ведомых.',
        starter: `${FLEET_HEAD}${FLY_TO}in_air = False
try:
    pioneer.led_control(r=1, g=1, b=0)           # жёлтый: ждём ведомого
    time.sleep(1)
    wingmen = swarm.get_unit_list()
    for unit_id in wingmen:
        swarm.send_message_to_unit(unit_id, "готовность")
    ready = set()
    waited = 0.0
    while len(ready) < len(wingmen) and waited < 20.0:
        message = swarm.get_next_message()
        if message is None:
            time.sleep(0.1)
            waited += 0.1
        elif message[1] == 'готов':
            ready.add(message[0])
    print("Звено готово:", len(ready), "из", len(wingmen))
    if wingmen and len(ready) == len(wingmen):
        for unit_id in wingmen:
            swarm.send_message_to_unit(unit_id, "взлёт")
        pioneer.arm()
        pioneer.takeoff()
        in_air = True
        pioneer.led_control(___)                     # зелёный: летим
        for x, y in [(1, 0), (1, 1), (0, 1)]:
            fly_to(x, y, 1)
            time.sleep(1)
        for unit_id in wingmen:
            swarm.send_message_to_unit(unit_id, "посадка")
        pioneer.land()
        in_air = False
    else:
        for unit_id in wingmen:
            swarm.send_message_to_unit(unit_id, "отбой")
finally:
    pioneer.led_control()                            # погасить
    if in_air:
        pioneer.land()
    pioneer.disarm()
    swarm.close()
    pioneer.close_connection()
${DONE_LINE}`,
        answers: ['r=0, g=1, b=0'], waitMs: 240000,
        swarm: { neighbours: [{ code: FORMATION_BOT }] },
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing().route([[1, 0, 1], [1, 1, 1], [0, 1, 1]]);
            const counts = g.numbers('Звено готово:');
            if (!counts || counts.length < 2 || counts[0] < 1 || counts[0] !== counts[1]) g.fail('Не все ведомые готовы', `В журнале: «${g.text('Звено готово:') ?? 'нет строки'}».`, 'Соберите «готов» от каждого ведомого и напечатайте «Звено готово: N из N».');
            const ready = g.printEvents.find((event) => (event.text ?? '').startsWith('Звено готово:'));
            if (ready && g.arms[0] && g.arms[0].time < ready.time) g.fail('Взлёт раньше готовности', 'Моторы запущены раньше, чем отозвался ведомый.', 'Запускайте arm() только после «готов».');
            const colors = g.ledSequence(0).join(',');
            if (colors !== 'yellow,green,off') g.fail('Подсветка не по этапам', `Цвета диода 0: ${colors || 'нет'}, ожидалось yellow,green,off.`, 'Жёлтый до взлёта, зелёный в полёте, выключить в конце.');
        }
    }
];
