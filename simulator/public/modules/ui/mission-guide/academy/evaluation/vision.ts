import type { LearningEvent } from '../../../../core/learning-journal.js';
import type { GuideDiagnostic, GuideEvaluation } from '../../types.js';
import type { DroneSample } from '../../evaluation/text/trace.js';
import type { DroneAcademyActivity } from './drone.js';

function center(event: LearningEvent | undefined, id = 12): [number, number] | undefined {
    const points = event?.markers?.find(marker => marker.id === id)?.corners;
    if (!points || points.length !== 4) return undefined;
    return [points.reduce((sum, p) => sum + p[0], 0) / 4, points.reduce((sum, p) => sum + p[1], 0) / 4];
}
function error(event: LearningEvent): [number, number] | undefined {
    const c = center(event);
    return c ? [c[0] - (event.width || 640) / 2, c[1] - (event.height || 360) / 2] : undefined;
}
const visible = (event: LearningEvent | undefined, id = 12) => Boolean(center(event, id));
const near = (event: LearningEvent, x: number, y: number, z: number, tolerance = .2) => Boolean(event.pos && Math.hypot(event.pos.x - x, event.pos.y - y, event.pos.z - z) < tolerance);
const centered = (event: LearningEvent, tolerance = 8) => { const e = error(event); return Boolean(e && e.every(value => Math.abs(value) <= tolerance)); };
const zero = (event: LearningEvent) => Boolean(event.velocity && Math.hypot(event.velocity.x, event.velocity.y, event.velocity.z) < .0001);

export function gradeVisionAcademy(number: number, samples: DroneSample[], events: LearningEvent[], activity: DroneAcademyActivity): GuideEvaluation {
    const diagnostics: GuideDiagnostic[] = [];
    const fail = (title: string, reason: string, fix: string) => diagnostics.push({ kind: 'error', title, reason, fix });
    const last = samples[samples.length - 1]?.snapshot;
    const frames = events.filter(event => event.kind === 'camera');
    const detects = events.filter(event => event.kind === 'detect');
    const displays = events.filter(event => event.kind === 'display');
    const speeds = events.filter(event => event.kind === 'velocity');
    const states = events.filter(event => event.kind === 'state');
    const prints = events.filter(event => event.kind === 'print');
    const arms = events.filter(event => event.kind === 'arm');
    const hasMessage = (text: string) => prints.some(event => event.text === text);
    const numbers = (prefix: string) => prints.filter(event => event.text?.startsWith(prefix)).map(event => ({ event, values: (event.text!.slice(prefix.length).match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number) }));
    const fresh = (list: LearningEvent[], count: number) => new Set(list.map(event => event.frameId).filter(Boolean)).size >= count;
    const previousDetection = (event: LearningEvent) => events.slice(0, events.indexOf(event)).filter(item => item.kind === 'detect').pop();
    const scene = activity.scene;
    if (!scene || scene.number !== number || !scene.intact) fail('Подготовьте полигон урока', 'Нет подготовленной учебной сцены текущего урока.', 'Вернитесь к практике и нажмите «Подготовить полигон».');
    if (!last || samples.some(sample => /ОШИБКА|CRASHED|DISARMED_FALL/.test(sample.snapshot.status || ''))) fail('Опыт завершился нештатно', 'Нет состояния или произошла ошибка/авария.', 'Исправьте первую ошибку и повторите.');
    if (arms.length !== 1 || !arms[0].accepted || !states.some(event => event.from === 'TAKEOFF_PROCESS' && event.state === 'FLYING_HOVER')) fail('Подготовка и подъём не подтверждены', 'Нужна настоящая подготовка и завершённый взлёт.', 'Сохраните знакомую цепочку arm → takeoff → ожидание.');
    if (!frames.length || frames.some(frame => !frame.frameId || frame.view !== 'bottom' || frame.width !== 640 || frame.height !== 360)) fail('Нужен кадр нижней камеры', 'Не подтверждено чтение выбранного изображения 640×360.', 'Используйте Camera(view="bottom") и get_cv_frame().');
    if (detects.some(event => !event.frameId || !frames.some(frame => frame.frameId === event.frameId && events.indexOf(frame) < events.indexOf(event)))) fail('Детекция не связана с прочитанным кадром', 'Результат не относится к изображению этого опыта.', 'Передавайте новый frame прямо в detectMarkers.');
    if (!hasMessage('Опыт завершён')) fail('Не достигнут конец опыта', 'Не выполнена заключительная ветка.', 'Дождитесь ограниченного сценария и проверьте его исход.');
    const lands = number === 99 || number >= 100;
    const landing = states.find(event => event.state === 'LANDING_PROCESS');
    if (lands ? !landing || !states.some(event => event.from === 'LANDING_PROCESS' && event.state === 'IDLE') || last?.fsmState !== 'IDLE' || (last?.pos.z || 0) > .15 : last?.fsmState !== 'FLYING_HOVER') fail('Неверный конечный этап', lands ? 'Миссия должна завершиться снижением и остановкой.' : 'Этот опыт заканчивается зависанием.', 'Сопоставьте конечное действие с условием урока.');
    if ([73, 74, 75, 76, 77, 78, 79, 80, 82, 83, 84, 86, 87, 88, 89].includes(number) && !displays.length) fail('Покажите полученное изображение', 'Нет отображения реальных пикселей кадра.', 'Вызовите cv2.imshow с полученным или размеченным frame.');
    const expectPair = (prefix: string, expected: number[]) => {
        const pair = numbers(prefix)[0]?.values;
        if (!pair || pair.length !== expected.length || pair.some((value, i) => Math.abs(value - expected[i]) > .8)) fail('Расчёт не совпал с кадром', `Проверьте значения после «${prefix}».`, 'Используйте размеры или реальные углы текущего изображения.');
    };
    const checkPrintedGeometry = (prefix: string, kind: 'center' | 'error') => {
        const reports = numbers(prefix);
        if (!reports.length) { fail('Нет результата вычисления', `Нужна запись «${prefix}».`, 'Выведите вычисленные компоненты отдельно.'); return; }
        reports.forEach(({ event, values }) => {
            const detection = previousDetection(event);
            const expected = detection ? kind === 'center' ? center(detection) : error(detection) : undefined;
            if (!expected || values.length !== 2 || values.some((value, i) => Math.abs(value - expected[i]) > .8)) fail('Геометрия не совпала с обнаружением', 'Выведенные числа отличаются от результата текущего кадра.', 'Вычисляйте из выбранных четырёх углов и измеренных размеров.');
        });
    };
    if (number === 73 && !hasMessage('Кадр получен')) fail('Нет подтверждения чтения', 'Ожидается сообщение успешной ветки.', 'Проверьте frame перед показом и сообщением.');
    if (number === 74) { expectPair('Размер:', [640, 360]); expectPair('Середина:', [320, 180]); }
    if (number === 75) {
        const first = frames[0], final = frames[frames.length - 1];
        if (!fresh(frames, 2) || !near(first, 0, 0, 3) || !near(final, .3, 0, 3, .12) || !center(first) || !center(final) || center(first)![0] - center(final)![0] < 5) fail('Смещение кадра не подтверждено', 'Нужны два разных положения камеры и смещение неподвижной метки влево.', 'Сохраняйте высоту и курс, меняйте только X.');
    }
    if (number === 76 && !events.some(event => event.kind === 'annotation' && event.point && Math.hypot(event.point.x - 320, event.point.y - 180) < 1.5)) fail('Точка не в центре кадра', 'Нужно нарисовать в половинах ширины и высоты.', 'Передайте (w//2,h//2) в cv2.circle.');
    if (number === 77) {
        const first = frames[0], final = frames[frames.length - 1];
        if (!fresh(frames, 2) || !near(first, 0, 0, 3) || !near(final, 0, 0, 3) || Math.abs((final.yaw || 0) - (first.yaw || 0) - Math.PI / 2) > .2) fail('Поворот кадра не подтверждён', 'Нужен курс π/2 при прежнем положении.', 'Задайте радианы и дождитесь поворота перед новым чтением.');
    }
    if (number === 78) {
        const low = frames.find(event => near(event, 0, 0, 2.5));
        const high = frames.find(event => near(event, 0, 0, 4));
        const side = (frame: LearningEvent | undefined) => { const corners = frame?.markers?.find(marker => marker.id === 12)?.corners; return corners ? Math.hypot(corners[0][0] - corners[1][0], corners[0][1] - corners[1][1]) : 0; };
        if (!low || !high || side(low) <= side(high) * 1.25 || !side(high)) fail('Изменение масштаба не подтверждено', 'Нужна та же видимая метка на двух высотах.', 'Получите свежий кадр после каждого прибытия.');
    }
    if (number === 79 && (!fresh(frames, 3) || JSON.stringify(frames.map(frame => visible(frame))) !== '[true,false,true]')) fail('Поле зрения ещё не исследовано', 'Нужны кадры видна → вне кадра → снова видна.', 'Читайте изображение после каждого перемещения, включая возврат.');
    if (number === 80 && (!fresh(frames, 3) || JSON.stringify(numbers('Кадр:').map(item => item.values[0])) !== '[0,1,2]')) fail('Нет трёх новых кадров', 'Повтор показа старого frame не обновляет наблюдение.', 'Чтение и номер оставьте внутри ограниченного цикла.');
    if (number === 81 && (!hasMessage('Нет кадра') || detects.length || speeds.length)) fail('Сбой кадра обработан неверно', 'После учебного None нужны отказ от обработки и сообщение.', 'Проверьте отсутствие прежде детекции или управления.');
    let trial: string | undefined;
    if ([82, 84, 86, 87, 88, 89].includes(number) && !detects.some(event => visible(event))) fail('Целевая метка не прочитана', 'В детекции нет ID 12.', 'Проверьте свежий кадр, словарь и выбор по ID.');
    if (number === 82 && !hasMessage('ID: 12')) fail('ID не выведен', 'Нужно вывести прочитанный идентификатор.', 'Печатайте int(value[0]) внутри выбора 12.');
    if (number === 83) {
        trial = detects.length === 1 && detects[0].dictionary === 'DICT_4X4_50' && !detects[0].markers?.length ? 'wrong-dictionary' : detects.length === 1 && detects[0].dictionary === 'DICT_6X6_250' && visible(detects[0]) ? 'right-dictionary' : undefined;
        if (!trial) fail('Сравните заданные словари', 'Нужен пустой результат 4X4_50 или успешный 6X6_250.', 'Меняйте только имя словаря в текущем опыте.');
        if (trial === 'right-dictionary' && !activity.trials?.includes('wrong-dictionary')) fail('Сначала проверьте несовпадение', 'Опыт неверного словаря ещё не записан.', 'Начните с DICT_4X4_50, затем замените его на DICT_6X6_250.');
    }
    if ([83, 84].includes(number)) {
        const actual = numbers('Найдены:')[0]?.values;
        const expected = detects[0]?.markers?.map(marker => marker.id) || [];
        if (!actual || [...actual].sort().join(',') !== [...expected].sort().join(',')) fail('Список ID не совпал с детектором', 'Печатайте результат текущего распознавания.', 'Не подставляйте ожидаемые ID вручную.');
    }
    if (number === 85 && (!fresh(detects, 3) || detects.length !== 3 || detects.some(event => event.markers?.length) || prints.filter(event => event.text === 'меток нет').length !== 3)) fail('Пустой результат не подтверждён', 'Нужны три реальные детекции без меток и три сообщения.', 'Используйте кадры из места без видимых меток и проверяйте ids is None.');
    if (number === 86 && (!hasMessage('Выбрана: 12') || !detects.some(event => (event.markers?.length || 0) > 1))) fail('Выбор среди меток не подтверждён', 'Нужно выбрать 12 при нескольких найденных ID.', 'Сравните ID в цикле, сохраняя его индекс для corners.');
    if (number === 87) {
        const corners = detects[0]?.markers?.find(marker => marker.id === 12)?.corners;
        const printed = numbers('Угол:');
        if (!corners || printed.length !== 4 || printed.some((item, i) => item.values.length !== 2 || item.values.some((value, j) => Math.abs(value - corners[i][j]) > .8))) fail('Четыре угла не совпали', 'Нужны четыре отдельные пары из выбранного результата.', 'Используйте corners[index][0], сохраняя порядок углов.');
    }
    if (number === 88) {
        checkPrintedGeometry('Центр:', 'center');
        const c = detects[0] && center(detects[0]);
        if (!c || !events.some(event => event.kind === 'annotation' && event.point && Math.hypot(event.point.x - c[0], event.point.y - c[1]) < 1.5)) fail('Центр не отмечен', 'Нарисуйте вычисленное среднее на кадре.', 'Округляйте координаты только для рисования.');
    }
    if ([89, 91].includes(number)) checkPrintedGeometry('Ошибка:', 'error');
    if (number === 90) {
        let count = 0;
        const expected = detects.map(event => count = visible(event) ? count + 1 : 0);
        if (!fresh(detects, 6) || expected.join(',') !== '1,2,0,1,2,3' || numbers('Счётчик:').map(item => item.values[0]).join(',') !== expected.join(',') || prints.filter(event => event.text === 'Подтверждено').length !== 1) fail('Подтверждение не пережило проверку потери', 'Нужны последовательные кадры 1,2,0,1,2,3.', 'Обнуляйте count при отсутствии нужного ID.');
    }
    if (number === 91 && (!fresh(detects, 3) || detects.length !== 3 || speeds.length || detects.some(event => !near(event, 0, 0, 3)))) fail('Измерение выполняется без управления', 'Нужны три свежих кадра при зависании.', 'Уберите команды коррекции и обновляйте изображение в цикле.');
    if ([92, 93, 94].includes(number)) {
        const initial = error(detects[0]), final = error(detects[detects.length - 1]);
        if (!initial || !final || Math.abs(initial[0]) - Math.abs(final[0]) < 1 || !speeds.length || !zero(speeds[speeds.length - 1])) fail('Поправка и остановка не подтверждены', 'Ошибка X должна уменьшиться после ограниченного действия; последняя скорость — ноль.', 'Проверьте знак, длительность, новое чтение и явную остановку.');
        if (speeds.some(event => !event.velocity || Math.abs(event.velocity.x) > .301 || Math.abs(event.velocity.y) > .001 || Math.abs(event.velocity.z) > .001)) fail('Выход за предел опыта по X', 'Корректируем только X в диапазоне ±0.3.', 'Сохраните нули остальных осей и ограничитель.');
        if ([92, 93].includes(number) && (speeds.filter(event => !zero(event)).length !== (number === 92 ? 10 : 5) || speeds.some(event => !zero(event) && Math.abs(event.velocity!.x - .2) > .001))) fail('Импульс имеет другую длительность', 'Проверьте число обновлений скорости 0.2.', 'Период 0.1 секунды и заданное количество определяют длину действия.');
        if (number === 94) speeds.filter(event => !zero(event)).forEach(event => {
            const detection = previousDetection(event), e = detection && error(detection);
            if (!e || event.time - detection!.time > .35 || Math.abs(event.velocity!.x - Math.max(-.3, Math.min(.3, 2 * e[0] / 640))) > .005) fail('Команда не соответствует свежей ошибке', 'Пропорциональная поправка должна использовать текущий ex.', 'Вычисляйте 2*ex/640 внутри цикла, затем ограничивайте.');
        });
    }
    if (number === 95 && (!fresh(detects, 5) || detects.some(event => !centered(event, 5)) || speeds.some(event => !zero(event)) || speeds.length < 5)) fail('Мёртвая зона не удерживает аппарат', 'Внутри допуска должны оставаться нулевые команды.', 'Сравнивайте abs(ex) с 5 и не исправляйте малый шум.');
    const stableBefore = (event: LearningEvent | undefined) => {
        if (!event) return false;
        const before = detects.filter(detection => events.indexOf(detection) < events.indexOf(event));
        return fresh(before.slice(-3), 3) && before.slice(-3).length === 3 && before.slice(-3).every(detection => centered(detection));
    };
    const aligned = prints.find(event => event.text === 'По центру');
    if ([96, 98, 99, 107].includes(number) && (!stableBefore(aligned) || !speeds.length || !zero(speeds[speeds.length - 1]))) fail('Устойчивый центр не подтверждён', 'Нужны три свежих кадра в допуске и остановка коррекции.', 'Обнуляйте счётчик при потере/выходе из допуска и ограничьте число шагов.');
    if (speeds.some(event => !event.velocity || Math.abs(event.velocity.x) > .301 || Math.abs(event.velocity.y) > .301 || Math.abs(event.velocity.z) > .001)) fail('Нарушен предел коррекции', 'Горизонтальные поправки ограничены ±0.3, вертикальная скорость здесь нулевая.', 'Оставьте снижение отдельным подтверждённым этапом.');
    if (number === 97) {
        const lost = detects.filter(event => !visible(event));
        if (!visible(detects[0]) || lost.length !== 3 || !fresh(lost, 3) || !speeds.length || speeds.some(event => !zero(event)) || !hasMessage('Поиск завершён')) fail('Потеря не остановила управление', 'После видимой цели нужны три пустых наблюдения, нулевая скорость и ограниченный исход.', 'Остановитесь и не продолжайте по старой ошибке.');
    }
    if (number === 98) {
        const descent = states.find(event => event.state === 'FLYING_MOVING' && event.target && Math.abs(event.target.z - 1.5) < .01);
        if (!descent || !stableBefore(descent) || Math.abs((last?.pos.z || 0) - 1.5) > .18) fail('Снижение началось без подтверждения центра', 'Спуск к 1.5 разрешается после трёх кадров в допуске.', 'Разместите команду снижения после успешного align.');
    }
    if ([99, 107].includes(number) && !stableBefore(landing)) fail('Посадка не связана с наведением', 'Нужны свежие подтверждения центра до land.', 'Не начинайте посадку при большой ошибке или отсутствии цели.');
    if (number === 100 && (![10, 11, 12].every(id => detects.some(event => visible(event, id))) || !['10:северо-запад', '11:юго-восток', '12:цель'].every(hasMessage))) fail('Таблица меток не подтверждена', 'Ожидаются три реально прочитанных ID и правильные назначения.', 'Печатайте назначение только для ID из результата детектора.');
    if (number === 101 && (!detects.some(event => near(event, 0, 0, 3) && !visible(event)) || !detects.some(event => near(event, 0, 4, 3) && !visible(event)) || !detects.some(event => near(event, 0, 8, 3) && visible(event)) || numbers('Сектор:').map(item => item.values[0]).join(',') !== '0,1,2' || !hasMessage('Найдена: 12'))) fail('Секторный поиск не подтверждён', 'Нужны два пустых сектора и обнаружение в третьем.', 'Посещайте 0,4,8 по порядку и прекращайте поиск после находки.');
    if (number === 102 && (!detects.some(event => near(event, 0, 8, 3) && visible(event)) || !hasMessage('Прочитан: 12') || !landing || !near(landing, 0, 0, 3))) fail('Лесная экспедиция не завершена', 'Нужны чтение у Y=8, возвращение и посадка на старте.', 'Разделите прибытие, распознавание и обратный маршрут.');
    if (number === 103 && (!detects.some(event => near(event, 9, -7, 9) && visible(event, 102)) || !detects.some(event => near(event, -9, -7, 9) && visible(event, 101)) || ![101, 102].every(id => numbers('Прочитан:').some(item => item.values[0] === id)))) fail('Крышные метки не подтверждены', 'Нужны реальные ID 102 и 101 над двумя домами на высоте 9.', 'Выберите верхний маршрут и прочитайте новый кадр над каждой крышей.');
    if (number === 104 && (![-9, -8.5].every(x => detects.some(event => near(event, x, 10.5, 4) && visible(event, 10) && visible(event, 11))) || ![10, 11].every(id => numbers('Прочитан:').some(item => item.values[0] === id)))) fail('Контрольные наблюдения арены не подтверждены', 'Нужны две точки обзора и прочитанные ID 10,11.', 'Посещайте места и проверяйте карту новым кадром.');
    if (number === 105 && (!detects.some(event => near(event, 0, 8, 3) && visible(event, 12)) || !detects.some(event => near(event, 0, 16, 3) && visible(event, 13)) || numbers('Прочитан:').map(item => item.values[0]).join(',') !== '12,13')) fail('Отчёт участков не совпал', 'Участки должны подтверждаться ID 12 и 13 по порядку.', 'Проверяйте конкретную цель в кадре каждого места.');
    const recovered = () => {
        const sequence = detects.map(event => visible(event));
        const lost = sequence.indexOf(false);
        return lost > 0 && sequence.slice(lost + 1).some(Boolean) && hasMessage('Потеряна') && hasMessage('Восстановлена') && speeds.some(zero);
    };
    if (number === 106 && (!recovered() || detects.length > 4)) fail('Восстановление не подтверждено', 'Нужны обнаружение, потеря, остановка и новое обнаружение в пределах попыток.', 'Ограничьте поиск, обновляя кадр на каждой попытке.');
    if (number === 107 && scene) trial = `seed-${scene.seed}`;
    if (number === 108) {
        const target = numbers('Цель миссии:')[0]?.values[0];
        trial = target === 12 ? 'mission-success' : target === 249 ? 'mission-timeout' : undefined;
        if (!trial) fail('Укажите проверяемый исход', 'Проверяем ID 12 и отсутствующий ID 249 отдельными запусками.', 'Меняйте target_id и сохраняйте отчёт цели миссии.');
        if (trial === 'mission-success' && (!recovered() || !stableBefore(landing))) fail('Полная успешная ветка не подтверждена', 'Нужны потеря, восстановление, устойчивое наведение и посадка.', 'Не пропускайте этапы итоговой миссии.');
        if (trial === 'mission-timeout' && (!hasMessage('Поиск истёк') || detects.some(event => visible(event, 249)) || ![0, 1, -1].every(y => detects.some(event => near(event, 0, y, 3))) || !activity.trials?.includes('mission-success') || aligned)) fail('Неуспешный исход не подтверждён', 'После успешного опыта проверьте ограниченный поиск 249 без ложного наведения.', 'Проверьте все сектора, завершите поиск и вернитесь для посадки.');
    }
    if (number < 73 || number > 108) fail('Неизвестный урок', 'Нет проверки этого номера.', 'Выберите урок камеры, ArUco или миссий.');
    if (diagnostics.length) return { solved: false, complete: Boolean(last), diagnostics };
    const collected = new Set([...(activity.trials || []), ...(trial ? [trial] : [])]);
    const pending = number === 83 ? !collected.has('right-dictionary') : number === 107 ? [...collected].filter(value => value.startsWith('seed-')).length < 2 : number === 108 ? !collected.has('mission-timeout') : false;
    if (pending) return { solved: false, complete: true, academyTrial: trial, diagnostics: [{ kind: 'info', title: 'Опыт подтверждён — осталось сравнение', reason: number === 83 ? 'Теперь проверьте правильный словарь.' : number === 107 ? 'Повторите ту же миссию на другом seed.' : 'Теперь проверьте отсутствующий ID 249.', fix: 'Измените только указанный параметр и выполните ещё одну проверку.' }] };
    return { solved: true, complete: true, academyTrial: trial, diagnostics: [{ kind: 'success', title: 'Наблюдение и миссия подтверждены', reason: 'Проверены реальные кадры, детекции, вычисления и действия текущего урока.', fix: 'Объясните, какое новое наблюдение разрешало каждый следующий шаг.' }] };
}
