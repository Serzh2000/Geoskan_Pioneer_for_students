import type { LearningEvent } from '../../../../core/learning-journal.js';
import type { GuideDiagnostic, GuideEvaluation } from '../../types.js';
import type { DroneSample } from '../../evaluation/text/trace.js';

/** Глава 13 (команды SDK): проверяем реальные записи журнала и состояние дрона, а не текст программы. */
export function gradeSdkExtrasAcademy(number: number, samples: DroneSample[], events: LearningEvent[]): GuideEvaluation {
    const diagnostics: GuideDiagnostic[] = [];
    const fail = (title: string, reason: string, fix: string) => diagnostics.push({ kind: 'error', title, reason, fix });
    const last = samples[samples.length - 1]?.snapshot;
    const arms = events.filter(event => event.kind === 'arm');
    const prints = events.filter(event => event.kind === 'print').map(event => (event.text ?? '').trim());
    if (!last) fail('Нет наблюдений', 'Состояние аппарата недоступно.', 'Дождитесь загрузки сцены.');
    if (samples.some(sample => /ОШИБКА|CRASHED|DISARMED_FALL/.test(sample.snapshot.status || ''))) fail('Есть ошибка запуска', 'Программа завершилась с ошибкой.', 'Исправьте первую ошибку (чаще всего это опечатка в имени метода или ключа) и повторите запуск.');
    if (samples.some(sample => Math.abs(sample.snapshot.pos.z) > .15 || Math.hypot(sample.snapshot.pos.x, sample.snapshot.pos.y) > .15)) fail('Пока остаёмся на земле', 'В этом уроке полёт не нужен.', 'Уберите команды взлёта и перемещения.');

    if (number === 109) {
        if (arms.length) fail('Подготовка не нужна', 'Напряжение читается без запуска двигателей.', 'Уберите arm().');
        const line = prints.find(text => text.startsWith('Напряжение:'));
        const value = line ? Number(line.slice('Напряжение:'.length).trim()) : NaN;
        if (!line) fail('Нет строки «Напряжение:»', 'В журнале нет сообщения с напряжением.', 'Выведите напряжение командой print("Напряжение:", voltage).');
        else if (!Number.isFinite(value) || value < 6 || value > 9) fail('Это не напряжение батареи', `Напечатано «${line}», а ожидается число вольт: у заряженной батареи около 8.4.`, 'Прочитайте значение методом get_battery_status().');
    } else if (number === 110) {
        if (arms.length !== 1 || !arms[0].accepted) fail('Нужен один принятый arm', 'Подготовка должна быть отправлена ровно один раз.', 'Оставьте в заготовке одну команду pioneer.arm().');
        const expected = ['До arm: 128', 'После arm: 0'];
        if (JSON.stringify(prints) !== JSON.stringify(expected)) fail('Проверьте сообщения', `Ожидаются строки: ${expected.join(' → ')}. Получено: ${prints.join(' → ') || 'ничего'}.`, 'Впишите ключ UavStartAllowed в обоих местах и не меняйте порядок строк.');
    } else {
        fail('Неизвестный урок', 'Номер не относится к главе про команды SDK.', 'Выберите урок главы 13.');
    }
    return {
        solved: diagnostics.length === 0, complete: Boolean(last),
        diagnostics: diagnostics.length ? diagnostics : [{ kind: 'success', title: 'Команда SDK подтверждена', reason: 'Значение прочитано из реального состояния дрона.', fix: 'Сравните результат с прогнозом и объясните, откуда берётся значение.' }]
    };
}
