import type { LearningEvent } from '../../../../core/learning-journal.js';
import type { GuideDiagnostic, GuideEvaluation } from '../../types.js';
import type { DroneSample } from '../../evaluation/text/trace.js';
import type { DroneAcademyActivity } from './drone.js';

type RGB = [number, number, number];
const red: RGB = [255, 0, 0], green: RGB = [0, 255, 0], blue: RGB = [0, 0, 255], off: RGB = [0, 0, 0];
function close(color: { r: number; g: number; b: number } | undefined, rgb: RGB): boolean {
    return Boolean(color && [color.r, color.g, color.b].every((value, i) => Number.isFinite(value) && Math.abs(value - rgb[i]) < 3));
}

export function gradeSignalsCode(number: number, samples: DroneSample[], events: LearningEvent[], activity: DroneAcademyActivity): GuideEvaluation {
    const last = samples[samples.length - 1]?.snapshot;
    const diagnostics: GuideDiagnostic[] = [];
    const fail = (title: string, reason: string, fix: string) => diagnostics.push({ kind: 'error', title, reason, fix });
    if (!last) return { solved: false, complete: false, diagnostics: [{ kind: 'error', title: 'Нет измерений', reason: 'Состояние аппарата недоступно.', fix: 'Дождитесь загрузки сцены и повторите.' }] };
    if (samples.some(sample => /CRASHED|DISARMED_FALL|ОШИБКА/.test(sample.snapshot.status || ''))) fail('Есть ошибка запуска', 'Сценарий завершился с ошибкой.', 'Исправьте первую ошибку в журнале. Заполнители ___ нужно заменить.');
    if (samples.some(sample => Math.abs(sample.snapshot.pos.z) > .15 || Math.hypot(sample.snapshot.pos.x, sample.snapshot.pos.y) > .15 || sample.snapshot.fsmTransitions.some(item => /TAKEOFF|FLYING|LANDING/.test(item.to)))) fail('Опыт выполняется на земле', 'В этом разделе пока не нужен полёт.', 'Уберите команды взлёта и движения.');
    const arms = events.filter(event => event.kind === 'arm');
    if (number !== 18 && (arms.length || last.fsmState !== 'IDLE')) fail('Подготовка здесь не требуется', 'Упражнение посвящено свету и программе.', 'Оставьте только команды текущего задания.');
    const led = events.filter(event => event.kind === 'led');
    const zero = led.filter(event => event.ledId === 0);
    const messages = events.filter(event => event.kind === 'print').map(event => event.text?.trim().toLowerCase() || '');
    const checkFinal = (index: number, rgb: RGB) => {
        if (!close(last.leds[index], rgb) || !led.some(event => event.ledId === index && close(event.color, rgb))) fail('Проверьте реальный RGB и индекс', `LED ${index} должен иметь RGB (${rgb.join(', ')}). Текст сообщения не устанавливает цвет.`, 'Сопоставьте номер элемента, диапазон языка и три канала.');
    };
    const checkMessages = (expected: string[]) => {
        if (JSON.stringify(messages) !== JSON.stringify(expected)) fail('Проверьте записи программы', `Нужны отдельные сообщения в порядке: ${expected.join(' → ')}.`, 'Исправьте данные или порядок вызовов print. Одна строка с перечислением не заменяет несколько вызовов.');
    };
    const checkSequence = (expected: RGB[]) => {
        if (zero.length !== expected.length || zero.some((event, i) => !close(event.color, expected[i]))) fail('Порядок изменений не совпал', 'Журнал реальных LED-команд отличается от ожидаемой последовательности.', 'Оставьте нужные действия в заданном порядке.');
    };
    let trial: string | undefined;
    let needs: string[] = [];
    if (number === 10 || number === 11) {
        const index = number === 10 ? 0 : 1;
        checkFinal(index, red);
        if (last.leds.some((color, i) => i !== index && !close(color, off))) fail('Должен светиться только один элемент', 'На других LED осталось свечение.', 'Изменяйте указанный индекс, остальные оставьте выключенными.');
    }
    if (number === 12) {
        trial = close(last.leds[0], green) ? 'green' : close(last.leds[0], blue) ? 'blue' : undefined;
        if (!trial) fail('Нужен чистый зелёный или синий', 'Цвет текущего опыта отличается от задания.', 'Сначала включите только G, затем в другом запуске только B.');
        else checkFinal(0, trial === 'green' ? green : blue);
        needs = ['green', 'blue'];
        if (trial === 'blue' && !activity.trials?.includes('green')) fail('Сначала проверьте зелёный', 'Первый опыт ещё не подтверждён.', 'Вернитесь к коду: получите зелёный, проверьте, затем замените его синим.');
    }
    if (number === 13) {
        trial = close(last.leds[0], [255, 255, 255]) ? 'white' : close(last.leds[0], [128, 128, 128]) ? 'dim-white' : undefined;
        if (!trial) fail('Проверьте баланс белого', 'Нужны равные каналы при максимуме или половине диапазона.', 'Меняйте все три составляющие одинаково.');
        else checkFinal(0, trial === 'white' ? [255, 255, 255] : [128, 128, 128]);
        needs = ['white', 'dim-white'];
        if (trial === 'dim-white' && !activity.trials?.includes('white')) fail('Сначала сравним с максимумом', 'Яркий белый ещё не записан.', 'Выполните первый опыт со всеми каналами на максимуме.');
    }
    if (number === 14) { checkSequence([red, off]); checkFinal(0, off); }
    if (number === 15 || number === 25) {
        checkFinal(0, green);
        checkMessages([number === 15 ? 'зелёный включён' : 'зелёный']);
        const light = events.findIndex(event => event.kind === 'led' && event.ledId === 0 && close(event.color, green));
        const message = events.findIndex(event => event.kind === 'print');
        if (message < light) fail('Сообщение опередило действие', 'Подтверждение напечатано до зелёного.', 'Перенесите print после LED-команды.');
    }
    if ([16, 21].includes(number)) checkFinal(0, [128, 0, 0]);
    if (number === 19) checkFinal(0, [64, 0, 0]);
    if (number === 17) {
        checkFinal(0, red); checkFinal(1, green); checkFinal(2, blue);
        checkMessages(['ожидание', 'готовность', 'завершение']);
    }
    if (number === 18) {
        checkSequence([red, green]); checkFinal(0, green);
        const before = events.findIndex(event => event === zero[0]);
        const arm = events.findIndex(event => event.kind === 'arm' && event.accepted);
        const after = events.findIndex(event => event === zero[1]);
        if (arms.length !== 1 || before < 0 || arm <= before || after <= arm || last.fsmState !== 'PREFLIGHT') fail('Сигнал ещё не связан с подготовкой', 'Нужен порядок красный → принятый arm → зелёный.', 'В Lua зелёный оставьте в обработчике подтверждения, в Python — после arm.');
    }
    if (number === 20) checkMessages(['высота, м: 2']);
    if (number === 22) {
        trial = close(last.leds[0], red) ? 'false' : close(last.leds[0], green) ? 'true' : undefined;
        needs = ['false', 'true'];
        if (!trial) fail('Проверьте обе ветки', 'Ожидается красный при false или зелёный при true.', 'Запустите оба значения флага, меняя только ready.');
        else checkFinal(0, trial === 'false' ? red : green);
        if (trial === 'true' && !activity.trials?.includes('false')) fail('Начните с ложного флага', 'Ветка false ещё не проверена.', 'Сначала задайте ready=false/False, затем true/True.');
    }
    if (number === 23) {
        const match = messages.length === 1 ? /^h:([123])$/.exec(messages[0]) : null;
        trial = match ? `height-${match[1]}` : undefined;
        if (!match) fail('Укажите проверяемое значение', 'В журнале нужна одна запись h:1, h:2 или h:3.', 'Печатайте переменную height и меняйте её между опытами.');
        else checkFinal(0, match[1] === '3' ? green : red);
        needs = ['height-1', 'height-2', 'height-3'];
    }
    if (number === 24) checkMessages(['0', '1', '2']);
    if (number === 26) {
        checkSequence([[64, 0, 0], [128, 0, 0]]); checkFinal(0, [128, 0, 0]);
        const values = messages.map(message => Number(message)).map(value => value > 0 && value <= 1 ? value * 255 : value);
        if (values.length !== 2 || Math.abs(values[0] - 64) > 3 || Math.abs(values[1] - 128) > 3) fail('Покажите оба параметра', 'Нужны две записи с четвертью и половиной диапазона выбранного языка.', 'Печатайте brightness внутри функции, используя значение каждого вызова.');
    }
    if (number === 27) checkMessages(['ожидание', 'готовность', 'завершение']);
    if (diagnostics.length) return { solved: false, complete: true, diagnostics };
    const collected = new Set([...(activity.trials || []), ...(trial ? [trial] : [])]);
    const missing = needs.filter(value => !collected.has(value));
    if (missing.length) return { solved: false, complete: true, academyTrial: trial, diagnostics: [{ kind: 'info', title: 'Опыт записан — проверьте следующий случай', reason: `Подтверждено ${needs.length - missing.length} из ${needs.length} случаев.`, fix: 'Вернитесь к коду и измените только параметр по условию задания. Предыдущие верные наблюдения сохранены в этой сессии.' }] };
    return { solved: true, complete: true, academyTrial: trial, diagnostics: [{ kind: 'success', title: 'Все случаи подтверждены', reason: 'Реальные LED-команды, сообщения и итоговое состояние совпали с заданием.', fix: 'Сравните результат с прогнозом и объясните изученную идею.' }] };
}
