import type { LearningEvent } from '../../../../core/learning-journal.js';
import type { GuideDiagnostic, GuideEvaluation } from '../../types.js';
import type { DroneSample } from '../../evaluation/text/trace.js';

/** Check actual simulation timestamps, never elapsed UI time or claimed print times. */
export function gradeTimeAcademy(number: number, samples: DroneSample[], events: LearningEvent[]): GuideEvaluation {
    const diagnostics: GuideDiagnostic[] = [];
    const fail = (title: string, reason: string, fix: string) => diagnostics.push({ kind: 'error', title, reason, fix });
    const last = samples[samples.length - 1]?.snapshot;
    const arms = events.filter(event => event.kind === 'arm');
    const lights = events.filter(event => event.kind === 'led' && event.ledId === 0);
    const prints = events.filter(event => event.kind === 'print');
    const matches = (event: LearningEvent, rgb: number[]) => Boolean(event.color && [event.color.r, event.color.g, event.color.b].every((value, i) => Math.abs(value - rgb[i]) < 3));
    const blue = [0, 0, 255], green = [0, 255, 0], red = [255, 0, 0], off = [0, 0, 0];
    if (!last) fail('Нет наблюдений', 'Состояние аппарата недоступно.', 'Дождитесь загрузки сцены.');
    if (samples.some(sample => /ОШИБКА|CRASHED|DISARMED_FALL/.test(sample.snapshot.status || ''))) fail('Есть ошибка запуска', 'Программа завершилась с ошибкой.', 'Исправьте первую ошибку, затем повторите опыт.');
    if (samples.some(sample => Math.abs(sample.snapshot.pos.z) > .15 || Math.hypot(sample.snapshot.pos.x, sample.snapshot.pos.y) > .15)) fail('Пока остаёмся на земле', 'В этом опыте не нужен полёт.', 'Уберите команды взлёта и перемещения.');
    const prepared = [32, 33, 34, 36].includes(number);
    if (prepared ? arms.length !== 1 || !arms[0].accepted || last?.fsmState !== 'PREFLIGHT' : arms.length > 0 || last?.fsmState !== 'IDLE') fail('Проверьте подготовку', prepared ? 'Нужен один принятый arm без взлёта.' : 'В этом опыте подготовка не требуется.', 'Сопоставьте команды с условием текущего урока.');
    const sequence = (colors: number[][]) => {
        if (lights.length !== colors.length || lights.some((event, i) => !matches(event, colors[i]))) fail('Последовательность света отличается', 'Нужен полный порядок реальных LED-команд.', 'Проверьте включения, выключения и номер LED 0.');
    };
    const messages = (expected: string[]) => {
        if (JSON.stringify(prints.map(event => event.text?.trim())) !== JSON.stringify(expected)) fail('Проверьте сообщения', `Ожидаются отдельные записи: ${expected.join(' → ')}.`, 'Печатайте подтверждение в соответствующей ветке программы.');
    };
    const afterArm = (event: LearningEvent | undefined) => {
        if (!event || events.indexOf(event) <= events.indexOf(arms[0])) fail('Подтверждение опередило подготовку', 'Действие должно следовать за принятым arm.', 'Поместите действие в обработчик готовности или после проверки состояния.');
    };
    if (number === 28) {
        sequence([blue, green, red]);
        if (lights.length === 3 && lights.slice(1).some((event, i) => event.time - lights[i].time < .8)) fail('Цвета меняются слишком быстро', 'Интервал между соседними действиями меньше 0.8 секунды симуляции.', 'Добавьте секундные интервалы между изменениями.');
    }
    if (number === 29) {
        sequence([blue]); messages(['Сигнал']);
        if (!lights[0] || lights[0].time < .8 || events.indexOf(prints[0]) <= events.indexOf(lights[0])) fail('Отложенное действие не подтверждено', 'Нужен свет после ожидания и сообщение после света.', 'Оба действия разместите после секундной задержки.');
    }
    if (number === 30) {
        sequence([blue, green]);
        if (!lights[0] || lights[0].time < .8 || lights[0].time > 1.6 || !lights[1] || lights[1].time < 1.8 || lights[1].time > 2.7) fail('Проверьте начало отсчёта', 'Первый сигнал нужен около t=1, второй около t=2.', 'Lua: независимые интервалы 1 и 2. Python: две последовательные паузы по 1.');
    }
    if (number === 31) {
        sequence([blue, off, blue, off, blue, off]);
        if (lights.length === 6 && lights.slice(1).some((event, i) => event.time - lights[i].time < .35 || event.time - lights[i].time > .8)) fail('Ритм не совпал', 'Каждая светлая и промежуточная тёмная фаза должна длиться примерно полсекунды.', 'Проверьте обе половины периода, а не только количество включений.');
    }
    if ([32, 33, 36].includes(number)) { messages(['готовность']); afterArm(prints[0]); }
    if ([33, 36].includes(number)) { sequence([green]); afterArm(lights[0]); }
    if (number === 34) {
        messages(['этап:ожидание', 'этап:готовность']); afterArm(prints[1]);
        if (events.indexOf(prints[0]) >= events.indexOf(arms[0])) fail('Исходный этап потерян', 'Ожидание нужно записать до подготовки.', 'Напечатайте phase перед arm.');
    }
    if (number === 35) {
        messages(['тайм-аут']);
        if (!prints[0] || prints[0].time < .8 || prints[0].time > 1.7) fail('Нет ограниченного ожидания', 'Тайм-аут нужен примерно через секунду, а не сразу.', 'Проверьте deadline или интервал таймера.');
        if (lights.some(event => matches(event, green))) fail('Нет подтверждения — нет зелёного', 'В опыте отсутствия готовности зелёный недостоверен.', 'Отделите успешную ветку от тайм-аута.');
    }
    if (number < 28 || number > 36) fail('Неизвестный урок', 'Нет проверки этого номера.', 'Выберите урок раздела времени.');
    return { solved: diagnostics.length === 0, complete: Boolean(last), diagnostics: diagnostics.length ? diagnostics : [{ kind: 'success', title: 'Время и порядок подтверждены', reason: 'Проверены реальные действия, их моменты и состояние аппарата.', fix: 'Объясните, что изменится при другом интервале или отсутствии события.' }] };
}
