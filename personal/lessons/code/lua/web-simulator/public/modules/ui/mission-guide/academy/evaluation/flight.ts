import type { LearningEvent } from '../../../../core/learning-journal.js';
import type { GuideDiagnostic, GuideEvaluation } from '../../types.js';
import type { DroneSample } from '../../evaluation/text/trace.js';
import { FLIGHT_EXERCISES } from '../practices/flight.js';
import { TELEMETRY_FLIGHTS } from '../practices/telemetry.js';
import type { DroneAcademyActivity } from './drone.js';

function near(pos: LearningEvent['pos'], target: number[]): boolean {
    return Boolean(pos && Math.hypot(pos.x - target[0], pos.y - target[1], pos.z - target[2]) < .18);
}
export function gradeFlightAcademy(number: number, samples: DroneSample[], events: LearningEvent[], activity: DroneAcademyActivity): GuideEvaluation {
    const diagnostics: GuideDiagnostic[] = [];
    const fail = (title: string, reason: string, fix: string) => diagnostics.push({ kind: 'error', title, reason, fix });
    const spec = FLIGHT_EXERCISES.find(item => item.number === number) || TELEMETRY_FLIGHTS.find(item => item.number === number);
    const last = samples[samples.length - 1]?.snapshot;
    if (!spec || !last) return { solved: false, complete: false, diagnostics: [{ kind: 'error', title: 'Нет наблюдений урока', reason: 'Не найдены задание или аппарат.', fix: 'Повторите после загрузки сцены.' }] };
    const scene = activity.scene;
    if (!scene || !scene.intact || scene.number !== number) fail('Подготовьте учебный полигон', 'В сцене нет полигона текущего урока в исходном положении.', 'Вернитесь к практике и нажмите «Подготовить полигон».');
    if (samples.some(sample => /ОШИБКА|CRASHED|DISARMED_FALL/.test(sample.snapshot.status || ''))) fail('Есть ошибка или столкновение', 'Миссия не завершилась штатно.', 'Исправьте первую ошибку или участок пути с недостаточным запасом.');
    if (events.some(event => event.kind === 'print' && /тайм-аут/.test(event.text || ''))) fail('Истекло время ожидания', 'Не пришло подтверждение очередного этапа.', 'Проверьте команду, её параметры и условие перехода.');
    const arms = events.filter(event => event.kind === 'arm');
    const transitions = events.filter(event => event.kind === 'state');
    const prints = events.filter(event => event.kind === 'print');
    if (number === 55) {
        if (arms.length || last.fsmState !== 'IDLE') fail('Сейчас исследуем карту', 'Для сравнения seed полёт не требуется.', 'Оставьте сообщение без arm.');
        if (!scene || scene.sameSeedRepeats < 2 || !prints.some(event => event.text === 'Карта повторяется')) fail('Сравнение двух карт не выполнено', 'Нужны две подготовки одного seed и результат наблюдения.', 'Подготовьте тот же seed ещё раз, осмотрите карту и запустите сообщение.');
    } else {
        if (arms.length !== 1 || !arms[0].accepted) fail('Нужна одна подготовка', 'Запуск должен начинаться одним принятым arm.', 'Сохраните arm перед ожиданием и взлётом.');
        const takeoff = transitions.find(event => event.state === 'TAKEOFF_PROCESS');
        const hover = transitions.find(event => event.from === 'TAKEOFF_PROCESS' && event.state === 'FLYING_HOVER');
        if (!takeoff || !hover || events.indexOf(hover) <= events.indexOf(takeoff) || !hover.pos || hover.pos.z < .15) fail('Завершение взлёта не подтверждено', 'Нужно реально подняться и перейти к зависанию.', 'Дождитесь TAKEOFF_COMPLETE / состояния MISSION до маршрута.');
        const arrivals = transitions.filter(event => event.from === 'FLYING_MOVING' && event.state === 'FLYING_HOVER');
        let cursor = 0;
        const reached: LearningEvent[] = [];
        for (const point of spec.points) {
            const index = arrivals.findIndex((event, i) => i >= cursor && near(event.pos, point) && near(event.target, point));
            if (index < 0) { fail('Пропущена точка маршрута', `Не подтверждено прибытие к (${point.join(', ')}) в нужном порядке.`, 'После каждой команды ждите POINT_REACHED / point_reached(); проверьте XYZ.'); break; }
            reached.push(arrivals[index]); cursor = index + 1;
        }
        if (spec.land) {
            const landing = transitions.find(event => event.state === 'LANDING_PROCESS');
            const landed = transitions.find(event => event.from === 'LANDING_PROCESS' && event.state === 'IDLE');
            if (!landing || !landed || events.indexOf(landing) <= events.indexOf(reached[reached.length - 1]) || last.fsmState !== 'IDLE' || last.pos.z > .15) fail('Посадка не завершила маршрут', 'Нужны прибытие, затем снижение и остановка.', 'Запускайте посадку после последней точки и дождитесь её подтверждения.');
        } else if (last.fsmState !== 'FLYING_HOVER') fail('Ожидается зависание', 'В конце этого опыта аппарат должен оставаться в воздухе.', 'Дождитесь цели; посадку изучаем в отдельном уроке.');
        if ([40, 51].includes(number)) {
            const read = events.find(event => event.kind === 'position');
            if (!read || events.indexOf(read) > events.indexOf(arms[0]) || !prints.some(event => event.text?.startsWith('Старт:'))) fail('Старт ещё не измерен', 'Положение дома нужно прочитать до arm и записать.', 'Верните чтение Sensors.lpsPosition() / get_local_position_lps() перед подготовкой.');
        }
        if (number === 42) {
            const ranges = events.filter(event => event.kind === 'range');
            const flat = ranges.find(event => near(event.pos, [0, 0, 3]));
            const hill = ranges.find(event => near(event.pos, [6, 0, 3]));
            if (!flat || !hill || flat.value === undefined || hill.value === undefined || flat.value - hill.value < .5) fail('Сравните два просвета', 'Нужны реальные измерения дальномера над землёй и над холмом.', 'Читайте Z и дальномер после прибытия в обе точки.');
        }
        if (number === 43) {
            const readings = events.filter(event => event.kind === 'position' && event.pos && event.pos.z > .3);
            const errors = prints.filter(event => event.text?.startsWith('Ошибка X:')).map(event => Number(event.text!.slice(9).trim()));
            if (readings.length < 3 || !readings[0].pos || !readings[readings.length - 1].pos || readings[readings.length - 1].pos!.x - readings[0].pos.x < .5 || errors.length < 3 || errors.some(value => !Number.isFinite(value)) || errors[0] - errors[errors.length - 1] < .5) fail('Ошибка должна обновляться по измерениям', 'Не подтверждено уменьшение ошибки во время подхода.', 'Получайте новое положение внутри ограниченного опроса, затем печатайте 2-X.');
        }
        if (number === 44 && !prints.some(event => event.text === 'В допуске' && events.indexOf(event) > events.indexOf(reached[0]))) fail('Решение по допуску не подтверждено', 'Сообщение нужно после прибытия и проверки ошибки.', 'Сравните модуль измеренной ошибки с 0.15.');
        if (number === 45) {
            const read = events.filter(event => event.kind === 'position').pop();
            if (!read || !near(read.pos, [0, 0, 1]) || Math.abs((read.yaw || 0) - Math.PI / 2) > .15) fail('Курс ещё не достигнут', 'Нужно повернуться на π/2, сохранив положение.', 'Задайте yaw в радианах и дайте корпусу повернуться перед измерением.');
        }
        if (number === 46 && !prints.some(event => event.text === 'Прибыл' && events.indexOf(event) > events.indexOf(reached[0]))) fail('Сообщение не подтвердило прибытие', '«Прибыл» должно следовать за настоящим достижением точки.', 'Перенесите сообщение в ветку завершения маршрута.');
        if (number === 62 && (!scene || scene.differentSeeds < 2)) fail('Новая карта ещё не проверена', 'Нужны две подготовки с разными seed.', 'Измените seed, подготовьте снова и осмотрите новый полигон.');
    }
    if (!prints.some(event => event.text === 'Опыт завершён')) fail('Опыт ещё не завершён', 'Не выполнена заключительная ветка программы.', 'Дождитесь всех этапов и проверьте конечное условие.');
    if (diagnostics.length) return { solved: false, complete: true, diagnostics };
    if (number === 54) {
        const count = (activity.trials || []).filter(trial => /^repeat-/.test(trial)).length + 1;
        return { solved: count >= 3, complete: true, academyTrial: `repeat-${count}`, diagnostics: [{ kind: count >= 3 ? 'success' : 'info', title: `Подтверждён запуск ${count} из 3`, reason: 'Порядок этапов и посадка совпали с заданием.', fix: count < 3 ? 'Повторите проверку без изменения кода.' : 'Сравните результаты трёх посадок.' }] };
    }
    return { solved: true, complete: true, diagnostics: [{ kind: 'success', title: 'Маршрут и результат подтверждены', reason: 'Проверены реальные переходы, посещённые точки и условия урока.', fix: 'Объясните связь между программой, траекторией и наблюдением.' }] };
}
