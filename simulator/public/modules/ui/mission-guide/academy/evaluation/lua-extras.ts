import type { LearningEvent } from '../../../../core/learning-journal.js';
import type { GuideDiagnostic, GuideEvaluation } from '../../types.js';
import type { DroneSample } from '../../evaluation/text/trace.js';

/**
 * Главы 17–20 (функции Lua API): проверяем строки журнала, реальные переходы автопилота и цвет светодиода.
 * Там, где симулятор не получает данных от устройства (Uart, Spi, mailbox без сети), сверяется то, что он реально
 * фиксирует: вызов выполнен без ошибки и вернул ожидаемое значение.
 */
export function gradeLuaExtrasAcademy(number: number, samples: DroneSample[], events: LearningEvent[]): GuideEvaluation {
    const diagnostics: GuideDiagnostic[] = [];
    const fail = (title: string, reason: string, fix: string) => diagnostics.push({ kind: 'error', title, reason, fix });
    const last = samples[samples.length - 1]?.snapshot;
    const arms = events.filter(event => event.kind === 'arm');
    const transitions = events.filter(event => event.kind === 'state');
    const prints = events.filter(event => event.kind === 'print');
    const lines = prints.map(event => (event.text ?? '').trim());
    const numbers = (label: string): number[] | null => {
        const line = lines.find(item => item.startsWith(label));
        return line === undefined ? null : line.slice(label.length).trim().split(/\s+/).map(Number);
    };
    const text = (label: string): string | null => {
        const line = lines.find(item => item.startsWith(label));
        return line === undefined ? null : line.slice(label.length).trim();
    };
    const finite = (values: number[] | null, count: number): values is number[] => Boolean(values && values.length === count && values.every(Number.isFinite));
    const flights = [127, 128, 129, 130, 138].includes(number);

    if (!last) fail('Нет наблюдений', 'Состояние аппарата недоступно.', 'Дождитесь загрузки сцены.');
    if (samples.some(sample => /ОШИБКА|CRASHED|DISARMED_FALL/.test(sample.snapshot.status || ''))) fail('Есть ошибка запуска', 'Программа завершилась с ошибкой.', 'Исправьте первую ошибку (чаще всего это опечатка в имени функции или метода) и повторите запуск.');
    if (!lines.includes('Опыт завершён')) fail('Программа не дошла до конца', 'В журнале нет строки «Опыт завершён».', 'Оставьте в конце print("Опыт завершён") и устраните ошибку выше, если она есть.');
    if (!flights && last && (Math.abs(last.pos.z) > .15 || Math.hypot(last.pos.x, last.pos.y) > .15)) fail('Пока остаёмся на земле', 'В этом уроке полёт не нужен.', 'Уберите команды взлёта и перемещения.');
    let hoverPos: LearningEvent['pos'];
    if (flights) {
        const takeoff = transitions.find(event => event.state === 'TAKEOFF_PROCESS');
        const hover = transitions.find(event => event.from === 'TAKEOFF_PROCESS' && event.state === 'FLYING_HOVER');
        hoverPos = hover?.pos;
        if (arms.length !== 1 || !arms[0].accepted) fail('Нужна одна подготовка', 'Запуск должен начинаться одним принятым ap.push(Ev.MCE_PREFLIGHT).', 'Оставьте подготовку и взлёт из заготовки без изменений.');
        if (!takeoff || !hover || !hoverPos || hoverPos.z < .15) fail('Взлёт не подтверждён', 'Опыт выполняется в воздухе, а зависание после взлёта не зафиксировано.', 'Оставьте готовые события ENGINES_STARTED и TAKEOFF_COMPLETE.');
    } else if (arms.length) {
        fail('Подготовка не нужна', 'В этом уроке двигатели запускать не нужно.', 'Уберите ap.push(Ev.MCE_PREFLIGHT).');
    }

    if (number === 125) {
        const a = numbers('Ускорение:');
        if (!finite(a, 3)) fail('Нет строки «Ускорение:»', 'В журнале нет трёх чисел.', 'Выведите ax, ay, az одной строкой.');
        else if (Math.hypot(a[0], a[1]) > 1 || a[2] < 8.8 || a[2] > 10.8) fail('Это не ускорение покоя', `Получено ${a.join(' ')}: у стоящего дрона X и Y около 0, а Z около 9.8 (сила тяжести).`, 'Прочитайте акселерометр: Sensors.accel().');
    } else if (number === 126) {
        const g = numbers('Вращение:');
        if (!finite(g, 3)) fail('Нет строки «Вращение:»', 'В журнале нет трёх чисел.', 'Выведите gx, gy, gz одной строкой.');
        else if (g.some(value => Math.abs(value) > .2)) fail('Дрон не должен вращаться', `Получено ${g.join(' ')}: у неподвижного дрона угловая скорость около 0.`, 'Прочитайте гироскоп: Sensors.gyro().');
    } else if (number === 127) {
        const roll = numbers('Крен:')?.[0], pitch = numbers('Тангаж:')?.[0], yaw = numbers('Курс:')?.[0];
        if ([roll, pitch, yaw].some(value => value === undefined || !Number.isFinite(value))) fail('Не хватает строк', 'Нужны строки «Крен:», «Тангаж:» и «Курс:».', 'Оставьте три print после чтения углов.');
        else {
            if (Math.abs(roll!) > .5 || Math.abs(pitch!) > .5) fail('Корпус наклонён', `Крен ${roll}, тангаж ${pitch}: при зависании они около нуля.`, 'Проверьте порядок: крен, тангаж, курс.');
            if (Math.abs(yaw! - Math.PI / 2) > .3) fail('Курс не 90°', `Курс ${yaw}, а после поворота на π/2 он около 1.57.`, 'Третье значение orientation() — курс; читайте его после поворота.');
        }
    } else if (number === 128) {
        const yaw = numbers('Курс:')?.[0], degrees = numbers('Градусы:')?.[0];
        if (yaw === undefined || !Number.isFinite(yaw)) fail('Нет строки «Курс:»', 'В журнале нет курса.', 'Выведите курс командой print("Курс: "..yaw).');
        else if (Math.abs(yaw - Math.PI / 2) > .3) fail('Курс не 90°', `Курс ${yaw}, а после поворота на π/2 он около 1.57.`, 'Читайте lpsYaw() после поворота, через 3 секунды.');
        if (degrees === undefined || !Number.isFinite(degrees) || (yaw !== undefined && Math.abs(degrees - yaw * 180 / Math.PI) > 1)) fail('Градусы не совпали с радианами', 'Градусы равны радианы × 180 / π.', 'Используйте math.deg(yaw).');
    } else if (number === 129) {
        const height = numbers('Высота:')?.[0];
        if (height === undefined || !Number.isFinite(height)) fail('Нет строки «Высота:»', 'В журнале нет высоты.', 'Выведите высоту командой print("Высота: "..height).');
        else if (hoverPos && Math.abs(height - hoverPos.z) > .35) fail('Высота не совпала', `Напечатано ${height}, высота зависания ${hoverPos.z.toFixed(2)} м.`, 'Читайте высоту после взлёта: Sensors.altitude().');
    } else if (number === 130) {
        const vx = numbers('Скорость X:')?.[0];
        if (vx === undefined || !Number.isFinite(vx)) fail('Нет строки «Скорость X:»', 'В журнале нет скорости.', 'Выведите vx командой print("Скорость X: "..vx).');
        else if (vx < .1 || vx > 5) fail('Дрон не летел вдоль X', `Скорость по X ${vx}: во время полёта к X = 2 она положительная.`, 'Прочитайте Sensors.lpsVelocity() через секунду после команды движения.');
    } else if (number === 131) {
        const channels = numbers('Каналы:');
        if (!finite(channels, 8)) fail('Нужно восемь каналов', 'В журнале нет восьми чисел после «Каналы:».', 'Sensors.rc() возвращает восемь значений; принимайте их восемью переменными.');
        else if (channels.some(value => value < -1 || value > 1)) fail('Значение вне диапазона', 'Каналы лежат между -1 и 1.', 'Прочитайте каналы функцией Sensors.rc().');
    } else if (number === 132) {
        const ticks = prints.filter(event => /^Тик \d+$/.test((event.text ?? '').trim()));
        if (ticks.map(event => event.text!.trim()).join(',') !== 'Тик 1,Тик 2,Тик 3') fail('Нужно ровно три тика', `Получено: ${ticks.map(event => event.text).join(', ') || 'ничего'}.`, 'Остановите таймер на третьем тике: timer:stop().');
        else if (ticks.slice(1).some((event, i) => event.time - ticks[i].time < .3 || event.time - ticks[i].time > .8)) fail('Интервал не полсекунды', 'Тики должны идти раз в 0.5 секунды.', 'Создайте таймер Timer.new(0.5, …) и запустите его timer:start().');
    } else if (number === 133 || number === 134) {
        const passed = numbers('Прошло:')?.[0];
        if (passed === undefined || !Number.isFinite(passed)) fail('Нет строки «Прошло:»', 'Функция не вызвалась.', `Задайте момент для ${number === 133 ? 'Timer.callAt(started + 2, …)' : 'Timer.callAtGlobal(globalNow + 2, …)'}.`);
        else if (passed < 1.8 || passed > 2.7) fail('Вызов в другой момент', `Прошло ${passed} с, а нужно около 2.`, 'Впишите вместо ___ число 2: оно прибавляется к моменту старта.');
        if (lines.filter(item => item.startsWith('Прошло:')).length > 1) fail('Вызвалось больше одного раза', 'callAt и callAtGlobal вызывают функцию один раз.', 'Не вызывайте их в цикле.');
    } else if (number === 135) {
        if (text('Время запуска:') !== '0') fail('Время запуска не 0', `Получено «${text('Время запуска:') ?? 'ничего'}»: в симуляторе launchTime() равно 0.`, 'Впишите вместо ___ launchTime (с большой T).');
        const clock = numbers('Часы дрона:')?.[0];
        if (clock === undefined || !Number.isFinite(clock) || clock < 0) fail('Нет строки «Часы дрона:»', 'Часы дрона не выведены.', 'Оставьте print("Часы дрона: "..time()).');
    } else if (number === 136) {
        if (text('Борт:') !== 'SIMULATOR') fail('Номер борта не выведен', `Получено «${text('Борт:') ?? 'ничего'}», а в симуляторе boardNumber равен SIMULATOR.`, 'Впишите вместо ___ boardNumber, без скобок.');
    } else if (number === 137) {
        const led = [...events].reverse().find(event => event.kind === 'led' && event.ledId === 0);
        if (!led?.color) fail('Светодиод не включён', 'Команда leds:set для светодиода 0 не выполнялась.', 'Оставьте leds:set(0, r, g, b).');
        else if (!(led.color.g > 230 && led.color.r < 24 && led.color.b < 24)) fail('Цвет не зелёный', `Получен цвет R=${Math.round(led.color.r)} G=${Math.round(led.color.g)} B=${Math.round(led.color.b)}.`, 'Зелёный на цветовом круге — 120°; красный 0°, синий 240°.');
    } else if (number === 138) {
        const arrival = transitions.find(event => event.from === 'FLYING_MOVING' && event.state === 'FLYING_HOVER');
        const near = (pos: LearningEvent['pos'], target: number[]) => Boolean(pos && Math.hypot(pos.x - target[0], pos.y - target[1], pos.z - target[2]) < .3);
        if (!arrival) fail('Полёт по GPS не выполнен', 'Нет подтверждённого прибытия в точку.', 'Вызовите ap.goToPoint(широта, долгота, высота) после TAKEOFF_COMPLETE.');
        else if (!near(arrival.pos, [1, 2, 1])) fail('Дрон прилетел не туда', `Прибытие в (${[arrival.pos?.x, arrival.pos?.y, arrival.pos?.z].map(value => value?.toFixed(2)).join(', ')}), а нужна точка (1, 2, 1).`, '100 единиц GPS — это 1 метр: 2 метра по широте — это 200.');
        const position = numbers('Положение:');
        if (!finite(position, 3) || !near({ x: position[0], y: position[1], z: position[2] }, [1, 2, 1])) fail('Положение в журнале не совпало', 'Напечатанное положение должно быть около (1, 2, 1).', 'Читайте Sensors.lpsPosition() после POINT_REACHED.');
    } else if (number === 139 || number === 140) {
        if (text('Результат:') !== '0') fail('Результат не 0', `Получено «${text('Результат:') ?? 'ничего'}»: 0 означает «готово», 1 — ошибка.`, `Впишите вместо ___ ${number === 139 ? 'checkRequestShot' : 'checkRequestRecord'}.`);
    } else if (number === 141) {
        if (text('Подключение:') !== 'ok') fail('Подключение не подтверждено', `Получено «${text('Подключение:') ?? 'ничего'}».`, 'Оставьте mailbox.connect(…) и выведите его второй результат.');
        if (text('Бортномер:') !== '7') fail('Бортномер не 7', `Получено «${text('Бортномер:') ?? 'ничего'}».`, 'Впишите вместо ___ число 7 в setHullNumber.');
    } else if (number === 142) {
        if (text('Есть сообщения:') !== 'true') fail('Сообщение не пришло', `hasMessages() вернул «${text('Есть сообщения:') ?? 'ничего'}».`, 'Сначала отправьте mailbox.send(me, "привет"), потом проверяйте hasMessages().');
        if (!lines.some(item => /^От \d+: привет$/.test(item))) fail('Сообщение не прочитано', 'Нужна строка вида «От 1: привет».', 'Впишите вместо ___ receive: он возвращает бортномер отправителя и текст.');
    } else if (number === 143) {
        if (text('После set:') !== 'true') fail('Вывод не включён', `После set() read() вернул «${text('После set:') ?? 'ничего'}».`, 'Оставьте pin:set() перед первым чтением.');
        if (text('После reset:') !== 'false') fail('Вывод не сброшен', `После reset() read() вернул «${text('После reset:') ?? 'ничего'}».`, 'Впишите вместо ___ reset.');
    } else if (number === 144) {
        if (text('Ждёт чтения байт:') !== '0') fail('Неожиданные входящие данные', `bytesToRead() вернул «${text('Ждёт чтения байт:') ?? 'ничего'}»: к порту ничего не подключено.`, 'Оставьте строку с bytesToRead().');
        if (text('Прочитано байт:') !== '0') fail('Чтение не выполнено', `Получено «${text('Прочитано байт:') ?? 'ничего'}».`, 'Впишите вместо ___ read: он возвращает строку, её длина — #data.');
    } else if (number === 145) {
        if (text('Получено байт:') !== '0') fail('Обмен не выполнен', `Получено «${text('Получено байт:') ?? 'ничего'}».`, 'Впишите вместо ___ exchange: он возвращает принятую строку.');
    } else {
        fail('Неизвестный урок', 'Номер не относится к главам 17–20.', 'Выберите урок главы про Lua API.');
    }
    return {
        solved: diagnostics.length === 0, complete: Boolean(last),
        diagnostics: diagnostics.length ? diagnostics : [{ kind: 'success', title: 'Функция подтверждена', reason: 'Результат получен от реального симулятора.', fix: 'Сравните результат с прогнозом и объясните, откуда берётся значение.' }]
    };
}
