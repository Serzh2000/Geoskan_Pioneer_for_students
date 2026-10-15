import type { LearningEvent } from '../../../../core/learning-journal.js';
import type { GuideDiagnostic, GuideEvaluation } from '../../types.js';
import type { DroneSample } from '../../evaluation/text/trace.js';
import type { DroneAcademyActivity } from './drone.js';
import { gradeFlightAcademy } from './flight.js';
import { TELEMETRY_FLIGHTS } from '../practices/telemetry.js';

export function gradeTelemetryAcademy(number: number, samples: DroneSample[], events: LearningEvent[], activity: DroneAcademyActivity): GuideEvaluation {
    const flight = TELEMETRY_FLIGHTS.some(item => item.number === number);
    const diagnostics: GuideDiagnostic[] = flight ? gradeFlightAcademy(number, samples, events, activity).diagnostics.filter(item => item.kind === 'error') : [];
    const fail = (title: string, reason: string, fix: string) => diagnostics.push({ kind: 'error', title, reason, fix });
    const last = samples[samples.length - 1]?.snapshot;
    const reads = events.filter(event => event.kind === 'position');
    const messages = events.filter(event => event.kind === 'print');
    const arms = events.filter(event => event.kind === 'arm');
    if (!last || samples.some(sample => /ОШИБКА|CRASHED|DISARMED_FALL/.test(sample.snapshot.status || ''))) fail('Нет штатного результата', 'Состояние отсутствует или запуск завершился ошибкой.', 'Исправьте первую ошибку и повторите.');
    if (!flight && (arms.length || last?.fsmState !== 'IDLE' || samples.some(sample => Math.abs(sample.snapshot.pos.z) > .15))) fail('Сейчас отлаживаем решение без полёта', 'В этом опыте аппарат должен оставаться IDLE.', 'Уберите arm и полётные команды.');
    const printNumbers = (prefix: string) => messages.filter(event => event.text?.startsWith(prefix)).map(event => ({ event, values: (event.text!.slice(prefix.length).match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number) }));
    if ([64, 72].includes(number)) {
        const reports = printNumbers('Положение:');
        if (reads.length < 3 || reports.length !== 3) fail('Не хватает измеренных этапов', 'Нужны три чтения и три отчёта положения.', 'Читайте положение заново на каждом этапе.');
        reports.forEach(({ event, values }) => {
            const read = events.slice(0, events.indexOf(event)).filter(item => item.kind === 'position').pop();
            if (!read?.pos || values.length !== 3 || [read.pos.x, read.pos.y, read.pos.z].some((value, i) => Math.abs(value - values[i]) > .001)) fail('Отчёт не совпал с измерением', 'В строке положения должны быть три только что прочитанные компоненты.', 'Печатайте переменные чтения, а не заранее известную цель.');
        });
        if (number === 72 && !messages.some(event => event.text === 'Цель: 1,1,1' && events.indexOf(event) < events.findIndex(item => item.kind === 'state' && item.state === 'FLYING_MOVING'))) fail('План не отделён от результата', 'Подпишите целевую точку до движения.', 'Сохраните отдельное сообщение «Цель: 1,1,1».');
    }
    let trial: string | undefined;
    if (number === 65) {
        const deltas = reads.slice(1).map((event, i) => event.time - reads[i].time);
        const period = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
        trial = Math.abs(period - .2) < .09 ? 'fast' : Math.abs(period - .8) < .15 ? 'slow' : undefined;
        if (!trial || reads.length < 3 || !reads[0].pos || !reads[reads.length - 1].pos || reads[reads.length - 1].pos!.z - reads[0].pos.z < .5) fail('Период опроса не подтверждён', 'Нужны несколько новых чтений с интервалом 0.2 или 0.8 секунды во время подъёма.', 'Меняйте период внутри ограниченного опроса, сохраняя маршрут.');
        if (trial === 'slow' && !activity.trials?.includes('fast')) fail('Начните с частого опроса', 'Опыт с 0.2 секунды ещё не записан.', 'Сначала проверьте 0.2, затем измените только период на 0.8.');
    }
    if (number === 66 && JSON.stringify(messages.map(event => event.text)) !== JSON.stringify(['Нет данных'])) fail('Отсутствие не обработано', 'Ожидается одна строка «Нет данных».', 'Проверьте nil/None прежде сравнения высоты.');
    if (number === 67) {
        const green = events.find(event => event.kind === 'led' && event.ledId === 0 && (event.color?.g || 0) > 250 && (event.color?.r || 0) < 3 && (event.color?.b || 0) < 3);
        const read = green ? events.slice(0, events.indexOf(green)).filter(event => event.kind === 'position').pop() : undefined;
        if (!green || !read?.pos || read.pos.z < 1.8 || green.time - read.time > .3) fail('Сигнал не связан с измеренным порогом', 'Первый зелёный должен следовать за новым измерением Z≥1.8.', 'Сравнивайте измеренное z, затем задавайте цвет в успешной ветке.');
    }
    if (number === 68) {
        const errors = printNumbers('Ошибка X:');
        if (errors.length < 3 || errors[0].values[0] - errors[errors.length - 1].values[0] < .5) fail('Нет уменьшающейся ошибки', 'Нужны несколько подписанных измерений подхода.', 'Получайте новое X внутри опроса.');
        errors.forEach(({ event, values }) => {
            const read = events.slice(0, events.indexOf(event)).filter(item => item.kind === 'position').pop();
            if (!read?.pos || values.length !== 1 || Math.abs(values[0] - (2 - read.pos.x)) > .001) fail('Знак или величина ошибки неверны', 'Ошибка равна 2 минус измеренное X.', 'Уберите модуль и не меняйте порядок вычитания.');
        });
    }
    if ([69, 70].includes(number)) {
        const expected = number === 69 ? [0, 0, 0, 1, -1] : [-.4, 0, .4];
        const actual = messages.map(event => Number(event.text));
        if (actual.length !== expected.length || actual.some((value, i) => !Number.isFinite(value) || Math.abs(value - expected[i]) > .0001)) fail('Учебные случаи дали другие решения', `Ожидаются отдельные результаты ${expected.join(', ')}.`, 'Проверьте допуск, знак и обе границы ограничения.');
    }
    if (number === 71) {
        const success = messages.find(event => event.text === 'Цель достигнута');
        const timeout = messages.find(event => event.text === 'тайм-аут');
        if (!success || !timeout || timeout.time < .8 || events.indexOf(success) > events.indexOf(timeout) || reads.length < 2 || !reads.some(event => event.time >= .8) || !messages.some(event => event.text === 'Опыт завершён')) fail('Два исхода не подтверждены', 'Нужны новое положение, успех у старта и тайм-аут недостижимой цели после секунды.', 'Разделите условия результата и истечения срока.');
    }
    if (number < 64 || number > 72) fail('Неизвестный урок', 'Номер не относится к телеметрии.', 'Выберите урок текущего раздела.');
    if (diagnostics.length) return { solved: false, complete: Boolean(last), diagnostics };
    if (number === 65 && !new Set([...(activity.trials || []), trial]).has('slow')) return { solved: false, complete: true, academyTrial: trial, diagnostics: [{ kind: 'info', title: 'Частый опрос подтверждён', reason: 'Остался сравнительный опыт с периодом 0.8 секунды.', fix: 'Измените только интервал и повторите проверку.' }] };
    return { solved: true, complete: true, academyTrial: trial, diagnostics: [{ kind: 'success', title: 'Измерение и решение подтверждены', reason: 'Проверены реальные чтения и условия текущего опыта.', fix: 'Объясните, чем заданная цель отличается от измеренного положения.' }] };
}
