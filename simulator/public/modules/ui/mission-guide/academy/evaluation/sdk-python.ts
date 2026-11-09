import type { LearningEvent } from '../../../../core/learning-journal.js';
import type { GuideDiagnostic, GuideEvaluation } from '../../types.js';
import type { DroneSample } from '../../evaluation/text/trace.js';

/**
 * Главы 14–16 (методы pioneer_sdk): проверяем строки журнала и реальные переходы автопилота, а не текст программы.
 * Каждая строка, которую печатает опыт, сверяется со значением, которое мог дать только верный метод.
 */
export function gradeSdkPythonAcademy(number: number, samples: DroneSample[], events: LearningEvent[]): GuideEvaluation {
    const diagnostics: GuideDiagnostic[] = [];
    const fail = (title: string, reason: string, fix: string) => diagnostics.push({ kind: 'error', title, reason, fix });
    const last = samples[samples.length - 1]?.snapshot;
    const arms = events.filter(event => event.kind === 'arm');
    const transitions = events.filter(event => event.kind === 'state');
    const prints = events.filter(event => event.kind === 'print').map(event => (event.text ?? '').trim());
    /** Числа из первой строки журнала с этой подписью; null, если строки нет. */
    const readNumbers = (label: string): number[] | null => {
        const line = prints.find(item => item.startsWith(label));
        return line === undefined ? null : line.slice(label.length).trim().split(/\s+/).map(Number);
    };
    const text = (label: string): string | null => {
        const line = prints.find(item => item.startsWith(label));
        return line === undefined ? null : line.slice(label.length).trim();
    };
    const flights = [112, 113, 116, 117].includes(number);

    if (!last) fail('Нет наблюдений', 'Состояние аппарата недоступно.', 'Дождитесь загрузки сцены.');
    if (samples.some(sample => /ОШИБКА|CRASHED|DISARMED_FALL/.test(sample.snapshot.status || ''))) fail('Есть ошибка запуска', 'Программа завершилась с ошибкой.', 'Исправьте первую ошибку (чаще всего это опечатка в имени метода, ключа или аргумента) и повторите запуск.');
    if (!prints.includes('Опыт завершён')) fail('Программа не дошла до конца', 'В журнале нет строки «Опыт завершён».', 'Оставьте в конце программы print("Опыт завершён") и устраните ошибку выше, если она есть.');
    if (!flights && last && (Math.abs(last.pos.z) > .15 || Math.hypot(last.pos.x, last.pos.y) > .15)) fail('Пока остаёмся на земле', 'В этом уроке полёт не нужен.', 'Уберите команды взлёта и перемещения.');
    let hoverPos: LearningEvent['pos'];
    if (flights) {
        const takeoff = transitions.find(event => event.state === 'TAKEOFF_PROCESS');
        const hover = transitions.find(event => event.from === 'TAKEOFF_PROCESS' && event.state === 'FLYING_HOVER');
        hoverPos = hover?.pos;
        if (arms.length !== 1 || !arms[0].accepted) fail('Нужна одна подготовка', 'Запуск должен начинаться одним принятым arm().', 'Оставьте в заготовке одну команду pioneer.arm().');
        if (!takeoff || !hover || !hoverPos || hoverPos.z < .15) fail('Взлёт не подтверждён', 'Опыт выполняется в воздухе, а зависание после взлёта не зафиксировано.', 'Оставьте готовые строки подготовки и взлёта без изменений.');
    }
    const shift = (): number[] | null => (hoverPos && last ? [last.pos.x - hoverPos.x, last.pos.y - hoverPos.y, last.pos.z - hoverPos.z] : null);

    if (number === 111) {
        const yaw = readNumbers('Курс:')?.[0];
        const degrees = readNumbers('Градусы:')?.[0];
        if (yaw === undefined || !Number.isFinite(yaw)) fail('Нет строки «Курс:»', 'В журнале нет курса числом.', 'Выведите курс командой print("Курс:", yaw).');
        else if (Math.abs(yaw) > Math.PI + .01) fail('Курс вне диапазона радиан', `Напечатано ${yaw}: курс в радианах лежит между -π и π.`, 'Прочитайте курс методом get_yaw(); он отдаёт радианы.');
        if (degrees === undefined || !Number.isFinite(degrees)) fail('Нет строки «Градусы:»', 'В журнале нет курса в градусах.', 'Оставьте строку print("Градусы:", math.degrees(yaw)).');
        else if (yaw !== undefined && Math.abs(degrees - yaw * 180 / Math.PI) > .5) fail('Градусы не совпадают с радианами', 'Перевод радиан в градусы считается как радианы × 180 / π.', 'Используйте math.degrees(yaw), не меняя yaw.');
    } else if (number === 112) {
        const moved = shift();
        const printed = readNumbers('Сдвиг:')?.[0];
        const arrival = transitions.find(event => event.from === 'FLYING_MOVING' && event.state === 'FLYING_HOVER');
        if (!arrival) fail('Смещение не выполнено', 'Нет подтверждённого прилёта в новую точку.', 'Вызовите go_to_local_point_body_fixed и дождитесь point_reached().');
        else if (hoverPos && arrival.pos) {
            const dx = arrival.pos.x - hoverPos.x, dy = arrival.pos.y - hoverPos.y, dz = arrival.pos.z - hoverPos.z;
            if (Math.abs(dz) > .25) fail('Высота изменилась', `Высота сместилась на ${dz.toFixed(2)} м, а смещение должно быть только по горизонтали.`, 'Третий аргумент (вверх) оставьте нулём.');
            else if (Math.hypot(dx, dy) < .75 || Math.hypot(dx, dy) > 1.25) fail('Смещение не 1 метр', `Дрон сместился на ${Math.hypot(dx, dy).toFixed(2)} м.`, 'Впишите вместо ___ смещение на 1 метр.');
            else if (Math.abs(dx) < .75 || Math.abs(dy) > .3) fail('Смещение не вправо', `Сдвиг по X ${dx.toFixed(2)} м, по Y ${dy.toFixed(2)} м: дрон ушёл не вправо.`, 'Вправо — первый аргумент go_to_local_point_body_fixed(x, y, z, yaw); второй — вперёд.');
        }
        if (printed === undefined || !Number.isFinite(printed)) fail('Нет строки «Сдвиг:»', 'Расстояние не выведено.', 'Оставьте строку с print("Сдвиг:", …).');
        else if (moved && Math.abs(printed - Math.hypot(moved[0], moved[1])) > .3) fail('Сдвиг в журнале не совпал с полётом', `Напечатано ${printed}, а дрон сместился на ${Math.hypot(moved[0], moved[1]).toFixed(2)} м.`, 'Читайте положение после point_reached().');
    } else if (number === 113) {
        const moved = shift();
        const printed = readNumbers('Сдвиг:')?.[0];
        if (moved) {
            const horizontal = Math.hypot(moved[0], moved[1]);
            if (horizontal < .45) fail('Дрон почти не сдвинулся', `Сдвиг ${horizontal.toFixed(2)} м: скорость слишком мала или цикл не повторял команду.`, 'Скорость вправо — первый аргумент, 0.5 м/с; команда стоит в цикле.');
            else if (horizontal > 1.7) fail('Дрон улетел слишком далеко', `Сдвиг ${horizontal.toFixed(2)} м при задуманном метре.`, 'За две секунды при 0.5 м/с дрон пролетает около метра.');
            else if (moved[0] < .35 || Math.abs(moved[1]) > .4) fail('Дрон летел не вправо', `Сдвиг по X ${moved[0].toFixed(2)} м, по Y ${moved[1].toFixed(2)} м.`, 'Вправо — первый аргумент set_manual_speed_body_fixed, положительный.');
            if (Math.abs(moved[2]) > .3) fail('Высота изменилась', 'Скорость по вертикали должна быть нулевой.', 'Третий аргумент оставьте нулём.');
        }
        if (last && last.fsmState !== 'FLYING_HOVER') fail('Дрон не завис', 'В конце программы дрон должен висеть на месте.', 'Оставьте нулевую скорость после цикла.');
        if (printed === undefined || !Number.isFinite(printed)) fail('Нет строки «Сдвиг:»', 'Расстояние не выведено.', 'Оставьте строку с print("Сдвиг:", …).');
    } else if (number === 114) {
        if (arms.length !== 1 || !arms[0].accepted) fail('Нужна одна подготовка', 'Выключать нечего без принятого arm().', 'Оставьте в заготовке одну команду pioneer.arm().');
        if (text('После arm:') !== 'ARMED') fail('Не видно подготовки', `После arm() ожидается состояние ARMED, получено «${text('После arm:') ?? 'ничего'}».`, 'Оставьте ожидание ARMED и вывод состояния после arm().');
        if (text('После disarm:') !== 'DISARMED') fail('Двигатели не выключены', `После disarm() ожидается состояние DISARMED, получено «${text('После disarm:') ?? 'ничего'}».`, 'Впишите вместо ___ имя команды выключения: disarm.');
        if (last && last.fsmState !== 'IDLE') fail('Автопилот не вернулся в покой', `Состояние автопилота «${last.fsmState}», а ожидается IDLE.`, 'Вызовите disarm() до взлёта, на земле.');
    } else if (number === 115) {
        if (arms.length) fail('Подготовка не нужна', 'Магнит включается без запуска двигателей.', 'Уберите arm().');
        if (text('Захват:') !== 'True') fail('Захват не включён', `Ожидается «Захват: True», получено «${text('Захват:') ?? 'ничего'}».`, 'Впишите вместо ___ имя метода захвата: cargo_grab.');
        if (text('Отпускание:') !== 'True') fail('Груз не отпущен', `Ожидается «Отпускание: True», получено «${text('Отпускание:') ?? 'ничего'}».`, 'Оставьте cargo_release() после захвата.');
        if (prints.findIndex(item => item.startsWith('Захват:')) > prints.findIndex(item => item.startsWith('Отпускание:'))) fail('Порядок команд перепутан', 'Сначала захват, потом отпускание.', 'Не меняйте порядок строк.');
    } else if (number === 116) {
        const flow = readNumbers('Поток:');
        const quality = readNumbers('Качество:')?.[0];
        if (!flow || flow.length !== 2 || flow.some(value => !Number.isFinite(value))) fail('Нет строки «Поток:»', 'В журнале нет двух чисел потока.', 'Выведите поток командой print("Поток:", round(flow_x, 2), round(flow_y, 2)).');
        else if (flow.some(value => Math.abs(value) > .6)) fail('Поток слишком большой для зависания', `Напечатано ${flow.join(' ')}: у висящего дрона поток около нуля.`, 'Читайте поток в зависании, после wait_for(... "MISSION").');
        if (quality === undefined || !Number.isFinite(quality)) fail('Нет строки «Качество:»', 'В журнале нет качества потока.', 'Оставьте print("Качество:", quality).');
        else if (quality < 200) fail('Датчик не видит поверхность', `Качество ${quality}: на высоте зависания должно быть близко к 255.`, 'Читайте поток после взлёта, в воздухе: на земле датчик не работает.');
    } else if (number === 117) {
        const distance = readNumbers('Расстояние:')?.[0];
        const quality = readNumbers('Качество:')?.[0];
        if (distance === undefined || !Number.isFinite(distance)) fail('Нет строки «Расстояние:»', 'В журнале нет расстояния.', 'Оставьте print("Расстояние:", round(data["distance"], 1)).');
        else if (hoverPos && Math.abs(distance - hoverPos.z) > .35) fail('Расстояние не совпадает с высотой', `Напечатано ${distance} м, высота зависания ${hoverPos.z.toFixed(2)} м.`, 'Датчик смотрит вниз: расстояние до поверхности равно высоте над полем.');
        if (quality === undefined || !Number.isFinite(quality)) fail('Нет строки «Качество:»', 'В журнале нет качества.', 'Оставьте print("Качество:", data["quality"]).');
        else if (quality < 200) fail('Датчик не видит поверхность', `Качество ${quality}: на высоте зависания должно быть близко к 255.`, 'Читайте данные после взлёта.');
    } else if (number === 118 || number === 119) {
        const size = readNumbers('Размер кадра:')?.[0];
        if (size === undefined || !Number.isFinite(size)) fail('Нет строки «Размер кадра:»', 'Кадр не получен или его размер не выведен.', 'Получите кадр методом get_frame() и выведите len(frame).');
        else if (size < 100) fail('Кадр пустой', `Размер кадра ${size} байт: настоящий JPEG намного больше.`, 'Подождите полсекунды после подключения камеры и повторите запуск.');
        if (number === 118 && text('Это JPEG:') !== 'True') fail('Это не JPEG', `Ожидается «Это JPEG: True», получено «${text('Это JPEG:') ?? 'ничего'}».`, 'Кадр JPEG начинается с байтов FF D8; оставьте проверку начала кадра.');
        if (number === 119) {
            if (text('Поток запущен:') !== 'True') fail('Поток не запущен', `Ожидается «Поток запущен: True», получено «${text('Поток запущен:') ?? 'ничего'}».`, 'Вызовите stream.start() до чтения кадра.');
            if (text('Поток остановлен:') !== 'True') fail('Поток не остановлен', `Ожидается «Поток остановлен: True», получено «${text('Поток остановлен:') ?? 'ничего'}».`, 'Впишите вместо ___ stop: поток нужно остановить.');
        }
    } else if (number === 120) {
        if (arms.length) fail('Подготовка не нужна', 'Пульт читают без запуска двигателей.', 'Уберите arm().');
        if (text('Каналы приняты:') !== 'True') fail('Каналы не приняты', `Ожидается «Каналы приняты: True», получено «${text('Каналы приняты:') ?? 'ничего'}».`, 'Значения каналов — числа от 1000 до 2000; впишите вместо ___ газ 1000.');
    } else if (number === 121) {
        if (!prints.some(item => item.includes('Lua-скрипт загружен'))) fail('Загрузка не подтверждена', 'Библиотека не сообщила о загрузке скрипта.', 'Вызовите pioneer.lua_script_upload(script).');
        if (prints.includes('Привет с борта')) fail('Скрипт уже выполнился', 'В этом уроке скрипт только загружается, его запуск — в следующем.', 'Уберите lua_script_control.');
    } else if (number === 122) {
        if (!prints.includes('Привет с борта')) fail('Скрипт не выполнился', 'Нет строки «Привет с борта»: её печатает Lua-скрипт после запуска.', 'Запускайте командой lua_script_control("Start") после загрузки.');
        if (text('Старт:') !== 'True') fail('Запуск не принят', `Ожидается «Старт: True», получено «${text('Старт:') ?? 'ничего'}».`, 'Впишите вместо ___ слово Start.');
        if (text('Стоп:') !== 'True') fail('Остановка не принята', `Ожидается «Стоп: True», получено «${text('Стоп:') ?? 'ничего'}».`, 'Оставьте lua_script_control("Stop") в конце.');
    } else if (number === 123) {
        if (text('Сеть:') !== 'Pioneer_Lab') fail('Имя сети не совпало', `Ожидается «Сеть: Pioneer_Lab», получено «${text('Сеть:') ?? 'ничего'}».`, 'Прочитайте имя методом try_get_ap_status() после ap_set_ssid.');
        if (text('Длина хеша:') !== '32') fail('Хеш пароля не получен', `Ожидается «Длина хеша: 32», получено «${text('Длина хеша:') ?? 'ничего'}».`, 'Состояние точки доступа — пара (имя, хеш); задайте пароль методом ap_set_password.');
    } else if (number === 124) {
        if (text('Подключён к:') !== 'LabWiFi') fail('Подключение не видно', `Ожидается «Подключён к: LabWiFi», получено «${text('Подключён к:') ?? 'ничего'}».`, 'Подключитесь методом sta_connect("LabWiFi", …) и прочитайте состояние.');
        if (text('После отключения:') !== 'None') fail('Сеть не отключена', `После отключения ожидается None, получено «${text('После отключения:') ?? 'ничего'}».`, 'Впишите вместо ___ sta_disconnect.');
    } else {
        fail('Неизвестный урок', 'Номер не относится к главам 14–16.', 'Выберите урок главы про команды SDK.');
    }
    return {
        solved: diagnostics.length === 0, complete: Boolean(last),
        diagnostics: diagnostics.length ? diagnostics : [{ kind: 'success', title: 'Команда SDK подтверждена', reason: 'Значения в журнале получены от реального симулятора.', fix: 'Сравните результат с прогнозом и объясните, откуда берётся каждое значение.' }]
    };
}
