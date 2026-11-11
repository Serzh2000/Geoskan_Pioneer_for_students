import { FLY_TO, flightProgram, groundProgram, type Sdk2Mission } from './sdk2-mission-kit.js';

/** Блоки 4–9: события, скорости, датчики, подсветка, груз и захват, пульт RC. */
const D = { group: 'events', groupTitle: '04. События автопилота' };
const E = { group: 'speed', groupTitle: '05. Скорости и полёт в осях корпуса' };
const F = { group: 'sensors', groupTitle: '06. Датчики и телеметрия' };
const G = { group: 'leds', groupTitle: '07. Подсветка' };
const H = { group: 'cargo', groupTitle: '08. Груз и захват' };
const I = { group: 'rc', groupTitle: '09. Виртуальный пульт RC' };

const EVENTS_HEAD = 'from pioneer_sdk2 import Pioneer, Event\nimport time\n\npioneer = Pioneer()\n';

export const SYSTEM_MISSIONS: Sdk2Mission[] = [
    {
        ...D, id: 'sdk2-events-log', title: 'Подписка на события',
        goal: 'Подписаться на события автопилота и печатать каждое: запуск моторов, взлёт, прилёт, посадка.',
        steps: [
            'Автопилот сам сообщает о важном: `ENGINES_STARTED`, `TAKEOFF_COMPLETE`, `POINT_REACHED`, `COPTER_LANDED`, `LOW_VOLTAGE1`… Чтобы их получать, на событие подписывают функцию-обработчик.',
            'Обработчик получает событие аргументом; у него есть `.name` — название. Подписка без второго аргумента ловит все события.',
            'Вместо `___` впишите метод подписки: `subscribe`.',
            'Нажмите «Проверить полёт»: в журнале по порядку запуск моторов, взлёт, прилёт и посадка.'
        ],
        hint: 'Название метода — «подписаться» по-английски. Передаётся имя функции без скобок: on_event, а не on_event().',
        outcome: 'Программа получает сообщения автопилота. Обработчик должен быть коротким: напечатать, поставить флаг, включить цвет.',
        starter: flightProgram({ head: EVENTS_HEAD, before: `

def on_event(event):
    """Вызывается библиотекой при каждом событии автопилота."""
    print("Событие:", event.name)


pioneer.___(on_event)
${FLY_TO}`, body: 'fly_to(1, 0, 1)', land: 'pioneer.land()\ntime.sleep(1)    # успеть получить событие о посадке' }),
        answers: ['subscribe'], waitMs: 120000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            g.order(['Событие: ENGINES_STARTED', 'Событие: TAKEOFF_COMPLETE', 'Событие: POINT_REACHED', 'Событие: COPTER_LANDED'], 'Подпишите on_event через pioneer.subscribe(on_event) до arm() и выведите event.name.');
        }
    },
    {
        ...D, id: 'sdk2-event-flag', title: 'Флаг из обработчика',
        goal: 'Считать прилёты в точки по событию POINT_REACHED: обработчик только считает, а ждёт основная программа.',
        steps: [
            'Обработчик вызывается «со стороны», поэтому в нём делают минимум: запоминают факт. Решения принимает основной цикл. Запоминать удобно в словаре: изменить его элемент можно из любой функции без `global`.',
            'Здесь обработчик увеличивает счётчик `counter["reached"]` при каждом POINT_REACHED. Основной цикл отправляет точку и ждёт, пока счётчик не вырастет.',
            'Вместо `___` впишите значение счётчика до отправки точки: переменную `before`.',
            'Нажмите «Проверить полёт»: три точки, в конце строка «Точек: 3».'
        ],
        hint: 'Ждём, пока счётчик перестанет быть равным значению ДО отправки точки: while counter["reached"] == before.',
        outcome: 'Подписка вместо опроса: программа реагирует на факт события и не гоняет point_reached() вручную.',
        starter: flightProgram({ head: EVENTS_HEAD, before: `
counter = {"reached": 0}


def on_event(event):
    if event == Event.POINT_REACHED:
        counter["reached"] += 1


pioneer.subscribe(on_event)

`, body: 'for x, y in [(1, 0), (1, 1), (0, 1)]:\n    before = counter["reached"]\n    pioneer.go_to_local_point(x=x, y=y, z=1, yaw=0)\n    while counter["reached"] == ___:\n        time.sleep(0.1)\nprint("Точек:", counter["reached"])' }),
        answers: ['before'], waitMs: 150000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing().route([[1, 0, 1], [1, 1, 1], [0, 1, 1]]);
            g.expectText('Точек:', '3', 'Обработчик должен прибавлять 1 при каждом Event.POINT_REACHED.');
        }
    },
    {
        ...D, id: 'sdk2-event-led', title: 'Событие — цвет',
        goal: 'Зажигать светодиоды разным цветом на разные события: оранжевый — моторы запущены, зелёный — взлёт, синий — посадка.',
        steps: [
            'Цвет в SDK 2 — три доли от 0 до 1: (красный, зелёный, синий). Оранжевый — (1, 0.4, 0), зелёный — (0, 1, 0), синий — (0, 0, 1).',
            'Словарь `COLORS` связывает событие с цветом, а обработчик берёт цвет из словаря и включает светодиоды. Подписка идёт на все события, лишние обработчик игнорирует.',
            'В словаре не хватает цвета для `TAKEOFF_COMPLETE`. Впишите вместо трёх `___` числа зелёного: 0, 1, 0.',
            'Нажмите «Проверить полёт»: светодиоды загораются оранжевым, зелёным, синим.'
        ],
        hint: 'Зелёный: красной и синей составляющей нет, зелёная на максимуме (1). Порядок в кортеже: красный, зелёный, синий.',
        outcome: 'Событие стало сигналом на борту: дрон сам показывает свои этапы цветом, без наблюдения за консолью.',
        starter: flightProgram({ head: EVENTS_HEAD, before: `
COLORS = {
    Event.ENGINES_STARTED: (1, 0.4, 0),     # оранжевый
    Event.TAKEOFF_COMPLETE: (___, ___, ___),  # зелёный
    Event.COPTER_LANDED: (0, 0, 1),         # синий
}


def on_event(event):
    if event in COLORS:
        r, g, b = COLORS[event]
        pioneer.led_control(r=r, g=g, b=b)


pioneer.subscribe(on_event)

`, body: 'time.sleep(2)', land: 'pioneer.land()\ntime.sleep(1)' }),
        answers: ['0', '1', '0'], waitMs: 90000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            const sequence = g.ledSequence(0).filter((color) => color !== 'off');
            const wanted = ['orange', 'green', 'blue'];
            let at = 0;
            for (const color of sequence) if (color === wanted[at]) at += 1;
            if (at < 3) g.fail('Цвета не по порядку событий', `Светодиод показал: ${sequence.join(', ') || 'ничего'}. Ожидалось: оранжевый, зелёный, синий.`, 'Проверьте цвета в словаре COLORS: зелёный — (0, 1, 0).');
        }
    },
    {
        ...E, id: 'sdk2-speed', title: 'Скорость на заданное время',
        goal: 'Лететь с заданной скоростью: одна команда держит скорость `interval` секунд, потом дрон останавливается сам.',
        steps: [
            '`set_manual_speed(vx, vy, vz, yaw_rate, interval)` задаёт скорость в метрах в секунду по осям сцены. Команда действует `interval` секунд.',
            'После команды программа ждёт столько же секунд (`time.sleep`), иначе она пойдёт дальше раньше, чем дрон проедет.',
            'Вместо `___` впишите скорость по X: 0.5 м/с. За 2 секунды это около метра.',
            'Нажмите «Проверить полёт»: в журнале «Сдвиг:» около метра, дрон повисает и садится.'
        ],
        hint: 'Путь = скорость × время: 0.5 м/с × 2 с = 1 м. Скорость пишется числом без единиц.',
        outcome: 'Вы управляете дроном скоростью, а не координатой. Так летят «по ощущению»: следят за линией, за меткой, за пультом.',
        starter: flightProgram({ body: 'x0, y0, z0 = pioneer.get_local_position_lps()\npioneer.set_manual_speed(vx=___, vy=0, vz=0, yaw_rate=0, interval=2)\ntime.sleep(2)\nx1, y1, z1 = pioneer.get_local_position_lps()\nprint("Сдвиг:", round(((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5, 1))' }),
        answers: ['0.5'], waitMs: 90000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            const commands = g.velocities().filter((event) => Math.hypot(event.velocity!.x, event.velocity!.y) > 0.1);
            if (!commands.length) g.fail('Скорость не задана', 'В журнале нет команды set_manual_speed со скоростью по X.', 'Вызовите set_manual_speed(vx=0.5, vy=0, vz=0, yaw_rate=0, interval=2).');
            const shift = g.expectNumber('Сдвиг:', 0.5, 1.6, 'Скорость 0.5 м/с за 2 секунды даёт около метра.');
            const first = commands[0];
            if (shift !== null && first && Math.abs(first.velocity!.x) < 0.3) g.fail('Скорость по X мала', `Скорость по X ${first.velocity!.x} м/с.`, 'Впишите 0.5.');
        }
    },
    {
        ...E, id: 'sdk2-speed-body', title: 'Скорость в осях корпуса и поворот',
        goal: 'Лететь вперёд скоростью относительно корпуса, а потом повернуться на месте.',
        steps: [
            '`set_manual_speed_body_fixed(vx, vy, vz, yaw_rate, interval)` задаёт скорость в осях корпуса: vx — вправо, vy — вперёд, vz — вверх.',
            '`yaw_rate` — скорость поворота в радианах в секунду. Положительное значение вращает в одну сторону. Предел — 1.82 рад/с: больше библиотека не принимает.',
            'Вместо двух `___` впишите: скорость вперёд 0.5 м/с и скорость поворота 0.5 рад/с.',
            'Нажмите «Проверить полёт»: дрон 2 секунды летит вперёд, затем 2 секунды поворачивается. В журнале курс до и после.'
        ],
        hint: 'Первый пропуск — vy (вперёд), второй — yaw_rate. Оба по 0.5.',
        outcome: 'Скорость в осях корпуса не зависит от курса: «вперёд» — всегда туда, куда смотрит нос.',
        starter: flightProgram({ body: 'print("Курс до:", round(pioneer.get_local_yaw_lps()))\npioneer.set_manual_speed_body_fixed(vx=0, vy=___, vz=0, yaw_rate=0, interval=2)\ntime.sleep(2)\npioneer.set_manual_speed_body_fixed(vx=0, vy=0, vz=0, yaw_rate=___, interval=2)\ntime.sleep(2.5)\nprint("Курс после:", round(pioneer.get_local_yaw_lps()))' }),
        answers: ['0.5', '0.5'], waitMs: 90000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            const move = g.velocities().find((event) => Math.hypot(event.velocity!.x, event.velocity!.y) > 0.2);
            const turn = g.numbers('Курс после:')?.[0];
            const before = g.numbers('Курс до:')?.[0];
            if (!move) g.fail('Нет движения вперёд', 'Команда скорости вперёд не найдена.', 'Задайте vy=0.5 в первой команде.');
            if (turn === undefined || before === undefined) g.fail('Нет строк курса', 'Курс до и после не напечатан.', 'Оставьте обе строки с get_local_yaw_lps().');
            else if (Math.abs(turn - before) < 20) g.fail('Дрон не повернулся', `Курс изменился на ${Math.abs(turn - before).toFixed(0)}°.`, 'Задайте yaw_rate=0.5 и подождите 2.5 секунды.');
        }
    },
    {
        ...E, id: 'sdk2-speed-ramp', title: 'Плавный разгон',
        goal: 'Разгонять дрон ступенями, а не рывком, и остановить его нулевой скоростью.',
        steps: [
            'Резкая скорость — резкий манёвр. Плавный старт — это серия команд с растущей скоростью: 0.1, 0.2, 0.3, 0.4, 0.5 м/с.',
            'Цикл `for i in range(1, 6)` считает скорость как `i` умножить на шаг. Каждая ступень держится 0.5 секунды (`interval`).',
            'Вместо `___` впишите шаг разгона: 0.1.',
            'В конце нулевая скорость останавливает дрон. Нажмите «Проверить полёт».'
        ],
        hint: 'Скорость на шаге i равна i × 0.1: 0.1, 0.2, … 0.5. Шаг — десятичная дробь.',
        outcome: 'Разгон ступенями — основа плавного управления: так работают и ручной пульт, и регуляторы.',
        starter: flightProgram({ body: 'for i in range(1, 6):\n    speed = i * ___\n    pioneer.set_manual_speed(vx=speed, vy=0, vz=0, yaw_rate=0, interval=0.5)\n    time.sleep(0.5)\npioneer.set_manual_speed(vx=0, vy=0, vz=0, yaw_rate=0, interval=1)\ntime.sleep(1.5)' }),
        answers: ['0.1'], waitMs: 90000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            const speeds = g.velocities().map((event) => Math.hypot(event.velocity!.x, event.velocity!.y));
            const ramp = speeds.filter((value) => value > 0.05);
            if (ramp.length < 5 || ramp.slice(1).some((value, i) => value <= ramp[i])) g.fail('Скорость не растёт ступенями', `Команды скорости: ${speeds.map((v) => v.toFixed(2)).join(', ')}.`, 'Умножайте номер шага на 0.1: скорость должна расти на каждом шаге.');
            if (speeds.length && speeds[speeds.length - 1] > 0.05) g.fail('Дрон не остановлен', 'Последняя команда скорости не нулевая.', 'После цикла отправьте скорость 0 по всем осям.');
        }
    },
    {
        ...F, id: 'sdk2-range-height', title: 'Высота: дальномер и позиция',
        goal: 'Сравнить высоту по дальномеру со вторым источником и убедиться, что они согласны.',
        steps: [
            '`get_dist_sensor_data()` — дальномер смотрит вниз и возвращает расстояние до поверхности под дроном в метрах. `get_altitude()` — высота по навигации.',
            'Над ровным полом обе величины почти совпадают. Над столом или холмом дальномер покажет меньше: он видит ближайшую поверхность под собой.',
            'Вместо `___` впишите метод дальномера: `get_dist_sensor_data`.',
            'Нажмите «Проверить полёт»: дрон поднимается на 1.5 м и печатает обе высоты.'
        ],
        hint: 'Название метода дальномера начинается с get_dist и заканчивается на _data. Результат — число метров или None.',
        outcome: 'У высоты два источника. Если они расходятся — под дроном препятствие или датчик не видит поверхность.',
        starter: flightProgram({ before: FLY_TO, body: 'fly_to(0, 0, 1.5)\ntime.sleep(1)\nrange_m = pioneer.___()\nprint("Дальномер:", round(range_m, 2))\nprint("Высота:", round(pioneer.get_altitude(), 2))' }),
        answers: ['get_dist_sensor_data'], waitMs: 90000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            const range = g.expectNumber('Дальномер:', 1.2, 1.8, 'Дальномер читает get_dist_sensor_data() на высоте 1.5 м.');
            const altitude = g.expectNumber('Высота:', 1.2, 1.8, 'Высота — get_altitude() после подъёма на 1.5 м.');
            if (range !== null && altitude !== null && Math.abs(range - altitude) > 0.35) g.fail('Источники высоты расходятся', `Дальномер ${range} м, высота ${altitude} м.`, 'Над ровным полом они должны совпадать.');
        }
    },
    {
        ...F, id: 'sdk2-nav', title: 'Навигация и отсутствие данных',
        goal: 'Читать то, чего может не быть: GPS в помещении отвечает None, и программа должна это пережить.',
        steps: [
            'Датчик, которого нет или данных ещё нет, возвращает `None`, а не ноль. Нельзя считать «нет данных» нулём: сначала проверяют `is None`.',
            'В симуляторе навигация — LPS. Поэтому `get_global_position_gps()` возвращает None.',
            'Вместо `___` впишите значение, которое означает отсутствие данных: `None`.',
            'Нажмите «Проверить полёт»: «Навигация: LPS», «LPS: OK», «GPS: нет данных».'
        ],
        hint: 'Сравнение с None пишется через is: gps is None. Не через ==.',
        outcome: 'Программа различает «ноль» и «нет данных». Это защищает от тихих ошибок в расчётах.',
        starter: groundProgram({ body: 'print("Навигация:", pioneer.get_nav_system().name)\nprint("LPS:", pioneer.get_nav_status_lps().name)\ngps = pioneer.get_global_position_gps()\nif gps is ___:\n    print("GPS: нет данных")\nelse:\n    print("GPS:", gps)' }),
        answers: ['None'], waitMs: 30000,
        check: (g) => {
            g.basics(false).noArm();
            g.expectText('Навигация:', 'LPS', 'Систему читает get_nav_system().name.');
            g.expectText('LPS:', 'OK', 'Статус читает get_nav_status_lps().name.');
            g.expectText('GPS:', 'нет данных', 'GPS в симуляторе отвечает None: сравните с None через is.');
        }
    },
    {
        ...F, id: 'sdk2-telemetry-log', title: 'Телеметрия в полёте',
        goal: 'Во время перелёта вести журнал: раз в полсекунды записывать положение и напряжение батареи.',
        steps: [
            'Пока дрон летит к точке, программа не спит, а в цикле читает датчики. Цикл «пока точка не достигнута» удобен для опроса.',
            '`get_local_position_lps()` возвращает (x, y, z), `get_battery_status()` — (напряжение, температура).',
            'Вместо `___` впишите метод положения: `get_local_position_lps`.',
            'Нажмите «Проверить полёт»: в журнале строки «Замер N …» и итог «Замеров: N»; дрон долетает до (2, 0, 1).'
        ],
        hint: 'Название метода положения: get_local_position_lps — «локальная позиция» по системе LPS.',
        outcome: 'Журнал даёт картину полёта: по нему видно, где дрон был и как садилась батарея.',
        starter: flightProgram({ body: 'pioneer.go_to_local_point(x=2, y=0, z=1, yaw=0)\nrow = 0\nwhile not pioneer.point_reached():\n    x, y, z = pioneer.___()\n    voltage, temperature = pioneer.get_battery_status()\n    row += 1\n    print("Замер", row, round(x, 2), round(y, 2), round(z, 2), round(voltage, 2))\n    time.sleep(0.5)\nprint("Замеров:", row)' }),
        answers: ['get_local_position_lps'], waitMs: 120000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing().route([[2, 0, 1]]);
            const rows = g.texts('Замер ').map((text) => text.split(/\s+/).map(Number)).filter((row) => row.length >= 5);
            if (rows.length < 3) g.fail('Мало замеров', `Строк «Замер» — ${rows.length}, нужно хотя бы 3.`, 'Читайте датчики в цикле, пока дрон не прилетит, с паузой 0.5 секунды.');
            else {
                if (Math.max(...rows.map((row) => row[3])) < 0.7) g.fail('Высота в замерах мала', 'В замерах нет высоты выше 0.7 м, а дрон летел на метр.', 'Читайте положение методом get_local_position_lps() в воздухе.');
                if (rows[rows.length - 1][1] < rows[0][1] - 0.05) g.fail('Положение не меняется', 'X в замерах не растёт, хотя дрон летит к (2, 0).', 'Печатайте свежие значения на каждом шаге цикла.');
            }
            g.expectNumber('Замеров:', rows.length, rows.length, 'Итог должен совпасть с числом строк «Замер».');
        }
    },
    {
        ...F, id: 'sdk2-params', title: 'Параметры автопилота',
        goal: 'Прочитать параметр, изменить и вернуть на место, а также узнать, что бывает с несуществующим параметром.',
        steps: [
            'Параметры автопилота читает `get_param(имя)` и пишет `set_param(имя, значение)`. Первое чтение печатает «Загрузка словаря» — это нормально.',
            'Хорошая привычка: запомнить старое значение и вернуть его в конце. Тогда программа не оставит дрон в изменённом состоянии.',
            'Вместо `___` впишите новую высоту взлёта: 0.8.',
            'Нажмите «Проверить полёт»: было 0.4, записано True, стало 0.8, вернули 0.4, а у несуществующего параметра — None.'
        ],
        hint: 'Новое значение — число 0.8. Старое значение сохраняется в переменной old, и в конце оно же записывается обратно.',
        outcome: 'Параметры правят осторожно: прочитал, записал, вернул. В симуляторе известны не все параметры, неизвестные возвращают None.',
        starter: groundProgram({ body: 'NAME = "Flight_com_takeoffAlt"\nold = pioneer.get_param(NAME)\nprint("Было:", old)\nok = pioneer.set_param(NAME, ___)\nprint("Записано:", ok)\nprint("Стало:", pioneer.get_param(NAME))\npioneer.set_param(NAME, old)\nprint("Вернули:", pioneer.get_param(NAME))\nprint("Нет такого:", pioneer.get_param("No_such_param"))' }),
        answers: ['0.8'], waitMs: 30000,
        check: (g) => {
            g.basics(false).noArm();
            g.expectText('Было:', '0.4', 'Читайте параметр Flight_com_takeoffAlt через get_param.');
            g.expectText('Записано:', 'True', 'set_param возвращает True, если параметр принят.');
            g.expectText('Стало:', '0.8', 'После set_param(..., 0.8) get_param вернёт 0.8.');
            g.expectText('Вернули:', '0.4', 'В конце запишите старое значение обратно.');
            g.expectText('Нет такого:', 'None', 'Неизвестный параметр get_param возвращает None.');
        }
    },
    {
        ...G, id: 'sdk2-led-colors', title: 'Цвет 0…1 и номер светодиода',
        goal: 'Включить левый светодиод красным, правый синим и погасить оба.',
        steps: [
            'У Мини 2 два передних светодиода: 0 — левый, 1 — правый. `led_control(led_id, r, g, b)` задаёт цвет одного светодиода; без `led_id` команда относится ко всем.',
            'Цвет — три числа от 0 до 1, а не от 0 до 255. Красный: r=1, g=0, b=0.',
            'Правый светодиод должен стать синим. Вместо трёх `___` впишите: 0, 0, 1.',
            'Нажмите «Проверить полёт»: красный слева, синий справа, потом оба гаснут.'
        ],
        hint: 'Синий — только третья составляющая на максимуме. Порядок: красный, зелёный, синий.',
        outcome: 'Подсветка управляется долями от 0 до 1 и номером светодиода. Погасить всё можно вызовом без аргументов.',
        starter: groundProgram({ body: 'pioneer.led_control(led_id=0, r=1, g=0, b=0)\ntime.sleep(1)\npioneer.led_control(led_id=1, r=___, g=___, b=___)\ntime.sleep(1)\npioneer.led_control()    # погасить все\ntime.sleep(0.5)' }),
        answers: ['0', '0', '1'], waitMs: 30000,
        check: (g) => {
            g.basics(false).noArm();
            const left = g.ledSequence(0);
            const right = g.ledSequence(1);
            if (left[0] !== 'red') g.fail('Левый светодиод не красный', `Левый показал: ${left.join(', ') || 'ничего'}.`, 'led_control(led_id=0, r=1, g=0, b=0).');
            if (right[0] !== 'blue') g.fail('Правый светодиод не синий', `Правый показал: ${right.join(', ') || 'ничего'}.`, 'Синий — (0, 0, 1).');
            if (left[left.length - 1] !== 'off' || right[right.length - 1] !== 'off') g.fail('Светодиоды не погашены', 'В конце оба светодиода должны быть выключены.', 'Вызовите led_control() без аргументов.');
        }
    },
    {
        ...G, id: 'sdk2-led-blink', title: 'Мигание',
        goal: 'Помигать жёлтым три раза: вспышка — пауза — вспышка.',
        steps: [
            'Мигание — это включить цвет, подождать, выключить, подождать. Если паузы не будет, глаз ничего не увидит.',
            'Жёлтый — красный и зелёный вместе: (1, 1, 0).',
            'Вместо `___` впишите число вспышек: 3.',
            'Нажмите «Проверить полёт»: три заметные вспышки по 0.4 секунды.'
        ],
        hint: 'Число повторений цикла — число вспышек. Паузы по 0.4 секунды уже в заготовке.',
        outcome: 'Паузы делают сигнал видимым. На них же строятся световые коды: SOS, «батарея», «готов».',
        starter: groundProgram({ body: 'for i in range(___):\n    pioneer.led_control(r=1, g=1, b=0)\n    time.sleep(0.4)\n    pioneer.led_control()\n    time.sleep(0.4)' }),
        answers: ['3'], waitMs: 30000,
        check: (g) => {
            g.basics(false).noArm();
            const changes = g.ledChanges(0);
            const flashes: number[] = [];
            changes.forEach((change, i) => {
                if (change.color === 'yellow') {
                    const off = changes[i + 1];
                    flashes.push(off ? off.time - change.time : 0);
                }
            });
            if (flashes.length !== 3) g.fail('Вспышек не три', `Жёлтых вспышек — ${flashes.length}.`, 'Цикл должен повторяться три раза.');
            else if (flashes.some((value) => value < 0.25)) g.fail('Вспышки слишком короткие', 'Вспышка короче 0.25 секунды, её не разглядеть.', 'Оставьте time.sleep(0.4) после включения цвета.');
        }
    },
    {
        ...G, id: 'sdk2-led-status', title: 'Светофор состояния',
        goal: 'Показывать этап полёта цветом: красный — на земле, жёлтый — моторы запущены, зелёный — в воздухе, погасить — после посадки.',
        steps: [
            'Подсветка — самый дешёвый «экран» дрона: по ней видно этап без консоли. Красный (1, 0, 0), жёлтый (1, 1, 0), зелёный (0, 1, 0).',
            'Допишите в заготовку четыре команды `led_control`: красный до `arm()`, жёлтый после `arm()`, зелёный после `takeoff()`, погасить после `land()`.',
            'Нажмите «Проверить полёт»: цвета меняются точно по этапам.'
        ],
        hint: 'Каждая команда ставится сразу после той команды полёта, о которой сигналит. Погасить — led_control() без аргументов.',
        outcome: 'Состояние дрона видно со стороны. Ту же схему используют в реальных проектах: зелёный — всё хорошо, красный — нужен человек.',
        starter: flightProgram({ before: '\n# TODO 1: красный до arm()\n', takeoff: 'pioneer.takeoff()\n# TODO 3: зелёный после takeoff()', land: 'pioneer.land()\n# TODO 4: погасить после land()', body: 'time.sleep(2)' }).replace('try:\n    if not pioneer.arm():', 'try:\n    if not pioneer.arm():').replace('    in_air = True\n', '    in_air = True\n    # TODO 2: жёлтый после arm()\n'),
        solution: flightProgram({ takeoff: 'pioneer.takeoff()\npioneer.led_control(r=0, g=1, b=0)', land: 'pioneer.land()\npioneer.led_control()', body: 'time.sleep(2)', before: '\npioneer.led_control(r=1, g=0, b=0)\n' }).replace('    in_air = True\n', '    in_air = True\n    pioneer.led_control(r=1, g=1, b=0)\n'),
        waitMs: 90000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            const changes = g.ledChanges(0);
            const arm = g.arms[0]?.time ?? 0;
            const takeoff = g.takeoffDone?.time ?? 0;
            const landed = g.landed?.time ?? 0;
            const colorAt = (from: number, to: number) => changes.filter((c) => c.time >= from && c.time < to).map((c) => c.color);
            if (!changes.some((c) => c.color === 'red' && c.time <= arm + 0.05)) g.fail('Нет красного до arm()', 'Перед запуском моторов светодиод должен гореть красным.', 'Поставьте led_control(r=1, g=0, b=0) выше arm().');
            if (!colorAt(arm, takeoff).includes('yellow')) g.fail('Нет жёлтого после arm()', 'Между запуском моторов и взлётом нужен жёлтый.', 'После arm() включите (1, 1, 0).');
            if (!colorAt(takeoff, g.landStart?.time ?? Infinity).includes('green')) g.fail('Нет зелёного в воздухе', 'После взлёта нужен зелёный.', 'После takeoff() включите (0, 1, 0).');
            if (!colorAt(landed - 0.5, Infinity).includes('off')) g.fail('После посадки светодиоды не погашены', 'После land() всё должно погаснуть.', 'После land() вызовите led_control() без аргументов.');
        }
    },
    {
        ...H, id: 'sdk2-grab', title: 'Механический захват',
        goal: 'Закрыть и открыть захват Мини 2, проверить скорость и узнать, что магнитного захвата у этой модели нет.',
        steps: [
            'У Мини 2 механический захват: `grab_close()` смыкает его, `grab_open()` размыкает. Скорость захвата — от 0 до 100; другое значение библиотека отвергает ошибкой ValueError.',
            'Магнитный захват `cargo_*` — это Базовый Пионер. На Мини 2 такая команда возвращает False.',
            'Вместо `___` впишите команду, которая смыкает захват: `grab_close`.',
            'Нажмите «Проверить полёт»: закрыть True, открыть True, магнит False, скорость 150 отклонена.'
        ],
        hint: 'Закрыть захват — close, открыть — open: grab_close и grab_open.',
        outcome: 'Вы различаете оборудование: захват Мини 2 и магнит Базового работают разными методами.',
        starter: groundProgram({ body: 'print("Закрыть:", pioneer.___(velocity=60))\ntime.sleep(1)\nprint("Открыть:", pioneer.grab_open(velocity=60))\nprint("Магнит Базового:", pioneer.cargo_grab())\ntry:\n    pioneer.grab_close(velocity=150)\nexcept ValueError:\n    print("Скорость 150 отклонена")' }),
        answers: ['grab_close'], waitMs: 30000,
        check: (g) => {
            g.basics(false).noArm();
            g.order(['Закрыть: True', 'Открыть: True', 'Магнит Базового: False', 'Скорость 150 отклонена'], 'Закройте и откройте захват (grab_close, grab_open), вызовите cargo_grab() и поймайте ValueError при скорости 150.');
        }
    },
    {
        ...H, id: 'sdk2-delivery', title: 'Доставка груза',
        goal: 'Взять груз в точке A, перевезти в точку B и сбросить там: захват + перелёт + порядок действий.',
        steps: [
            'Алгоритм: закрыть захват в точке A (дрон над грузом на высоте 1 м), перелететь в B, снизиться, открыть захват, вернуться.',
            'Точка A — (0, 0), точка B — (1.5, 0.5). Сбрасывать груз нужно на низкой высоте — 0.4 м: с высоты он упадёт неаккуратно.',
            'Вместо двух `___` впишите команды захвата по порядку: `grab_close` (взять) и `grab_open` (сбросить).',
            'Нажмите «Проверить полёт»: «Груз взят» печатается до перелёта в B, «Груз сброшен» — после снижения.'
        ],
        hint: 'Сначала груз берут (закрывают захват), потом сбрасывают (открывают). Скорость захвата в заготовке уже указана.',
        outcome: 'Простейшая логистика: действие на оборудовании привязано к этапу маршрута, а порядок проверяется по журналу.',
        starter: flightProgram({ before: FLY_TO, body: 'fly_to(0, 0, 1)\npioneer.___(velocity=60)\ntime.sleep(1)\nprint("Груз взят")\nfly_to(1.5, 0.5, 1)\nfly_to(1.5, 0.5, 0.4)\npioneer.___(velocity=100)\ntime.sleep(1)\nprint("Груз сброшен")\nfly_to(1.5, 0.5, 1)\nfly_to(0, 0, 1)' }),
        answers: ['grab_close', 'grab_open'], waitMs: 240000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing().route([[0, 0, 1], [1.5, 0.5, 1], [1.5, 0.5, 0.4]]);
            const taken = g.printEvents.find((event) => event.text === 'Груз взят');
            const dropped = g.printEvents.find((event) => event.text === 'Груз сброшен');
            const atB = g.arrivals.find((a) => Math.hypot(a.pos.x - 1.5, a.pos.y - 0.5) < 0.4);
            const low = g.arrivals.find((a) => Math.hypot(a.pos.x - 1.5, a.pos.y - 0.5) < 0.4 && a.pos.z < 0.7);
            if (!taken || !dropped) g.fail('Нет подтверждений груза', 'В журнале должны быть строки «Груз взят» и «Груз сброшен».', 'Печатайте их сразу после команд захвата.');
            else {
                if (atB && taken.time > atB.time) g.fail('Груз взят слишком поздно', 'Захват нужно закрыть до перелёта в точку B.', 'Закройте захват в точке A.');
                if (low && dropped.time < low.time) g.fail('Груз сброшен с высоты', 'Захват открыт до снижения до 0.4 м.', 'Откройте захват после fly_to(1.5, 0.5, 0.4).');
            }
        }
    },
    {
        ...I, id: 'sdk2-rc-flight', title: 'Виртуальный пульт',
        goal: 'Лететь командами «стиков» через `send_rc_channels`, как с настоящего пульта, и вернуть параметры автопилота на место.',
        steps: [
            'Автопилот слушает виртуальный пульт только при наборе параметров RC (`Copter_man_rcMode…`, `Copter_flyWithoutRc`, `SensorMux_rc`). Заготовка сохраняет старые значения, ставит новые, а в конце возвращает старые.',
            '`send_rc_channels(channel_1=крен, channel_2=тангаж, channel_3=газ, channel_4=рыскание)` — стики от -1 до 1. Тангаж -0.3 — вперёд. Команду нужно слать непрерывно: 20 раз в секунду.',
            'Вместо `___` впишите число отправок: 40 (2 секунды по 0.05 с).',
            'Нажмите «Проверить полёт»: дрон 2 секунды летит вперёд, нейтраль, посадка, параметры возвращены.'
        ],
        hint: '40 отправок с паузой 0.05 с — это 2 секунды. Нейтральные стики (все нули) нужны, чтобы остановить дрон.',
        outcome: 'Вы управляли дроном так же, как человек с пульта. Эту схему используют для своих джойстиков и клавиатуры.',
        starter: flightProgram({ before: `
RC_PARAMETERS = {
    "Copter_man_rcMode0": 6.0,
    "Copter_man_rcMode1": 3.0,
    "Copter_man_rcMode2": 3.0,
    "Copter_flyWithoutRc": 1.0,
    "SensorMux_rc": 2.0,
}
old = {name: pioneer.get_param(name) for name in RC_PARAMETERS}
for name, value in RC_PARAMETERS.items():
    pioneer.set_param(name, value)

`, body: 'for _ in range(___):\n    pioneer.send_rc_channels(channel_1=0, channel_2=-0.3, channel_3=0, channel_4=0)\n    time.sleep(0.05)\npioneer.send_rc_channels()    # нейтраль\ntime.sleep(1)' }).replace('    pioneer.disarm()\n', '    for name, value in old.items():\n        if value is not None:\n            pioneer.set_param(name, value)\n    print("Параметры возвращены")\n    pioneer.disarm()\n'),
        answers: ['40'], waitMs: 120000,
        check: (g) => {
            g.basics(true).armOnce().takeoff().landing();
            const moves = g.velocities().filter((event) => Math.hypot(event.velocity!.x, event.velocity!.y) > 0.1);
            if (moves.length < 20) g.fail('Пульт почти не использован', `Команд скорости от пульта — ${moves.length}, нужно хотя бы 20.`, 'Шлите send_rc_channels в цикле 40 раз с паузой 0.05 с.');
            const begin = g.takeoffDone?.pos;
            const end = [...g.states].reverse().find((event) => event.state === 'LANDING_PROCESS')?.pos;
            if (begin && end && Math.hypot(end.x - begin.x, end.y - begin.y) < 0.3) g.fail('Дрон не сдвинулся', 'Горизонтальный сдвиг меньше 0.3 м.', 'Тангаж -0.3 в течение двух секунд должен сдвинуть дрон вперёд.');
            if (!g.prints.includes('Параметры возвращены')) g.fail('Параметры не возвращены', 'Нет строки «Параметры возвращены».', 'Верните старые значения параметров в конце.');
        }
    },
    {
        ...I, id: 'sdk2-rc-switch', title: 'Тумблер как кнопка',
        goal: 'Читать тумблер пульта: канал 8 принимает положения 0, 1, 2, а триггер сообщает об изменении.',
        steps: [
            '`get_rc_channel()` возвращает положение тумблера (канал 8): 0, 1 или 2. `set_rc_trigger(функция)` вызывает функцию, когда значение меняется.',
            'В заготовке «пульт» нажимают программой: `send_rc_channels(channel_8=положение)` по очереди 0, 1, 2.',
            'Вместо `___` впишите метод, который назначает функцию-обработчик: `set_rc_trigger`.',
            'Нажмите «Проверить полёт»: триггер печатает «Тумблер: 0, 1, 2», программа — «Канал 8: …».'
        ],
        hint: 'Метод начинается с set_rc_ и заканчивается на _trigger. Функция передаётся без скобок.',
        outcome: 'Тумблер можно использовать как кнопку: «взлёт», «посадка», «включить подсветку».',
        starter: groundProgram({ before: '\ndef on_switch(value):\n    print("Тумблер:", value)\n\n\npioneer.___(on_switch)\n', body: 'time.sleep(0.5)\nfor position in (0, 1, 2):\n    pioneer.send_rc_channels(channel_8=position)\n    time.sleep(0.4)\n    print("Канал 8:", pioneer.get_rc_channel())' }),
        answers: ['set_rc_trigger'], waitMs: 30000,
        check: (g) => {
            g.basics(false).noArm();
            const channel = g.texts('Канал 8:').map(Number);
            const switches = g.texts('Тумблер:').map(Number);
            if (channel.join() !== '0,1,2') g.fail('Канал 8 прочитан неверно', `Прочитано: ${channel.join(', ') || 'ничего'}, ожидалось 0, 1, 2.`, 'Читайте get_rc_channel() после каждой отправки.');
            if (!switches.includes(1) || !switches.includes(2)) g.fail('Триггер не сработал', `Триггер получил: ${switches.join(', ') || 'ничего'}.`, 'Назначьте обработчик через set_rc_trigger(on_switch).');
        }
    }
];
