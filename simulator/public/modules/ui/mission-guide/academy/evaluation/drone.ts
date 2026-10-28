import type { LearningEvent } from '../../../../core/learning-journal.js';
import type { GuideDiagnostic, GuideEvaluation } from '../../types.js';
import type { DroneSample } from '../../evaluation/text/trace.js';
import type { AcademySceneEvidence } from '../scene.js';

export type DroneAcademyActivity = { lift?: string; vision?: string; code: string; previousRun?: boolean; trials?: string[]; scene?: AcademySceneEvidence };
function error(title: string, reason: string, fix: string): GuideDiagnostic { return { kind: 'error', title, reason, fix }; }

export function gradeDroneAcademy(number: number, samples: DroneSample[], events: LearningEvent[], activity: DroneAcademyActivity): GuideEvaluation {
    const diagnostics: GuideDiagnostic[] = [];
    const last = samples[samples.length - 1]?.snapshot;
    if (!last) return { solved: false, complete: false, diagnostics: [error('Нет состояния аппарата', 'Опыт не получил ни одного измерения.', 'Дождитесь загрузки сцены и повторите.')] };
    const requests = events.filter(event => event.kind === 'arm');
    const accepted = requests.filter(event => event.accepted);
    const rejected = requests.filter(event => !event.accepted && event.state === 'PREFLIGHT');
    const ground = samples.every(sample => Math.abs(sample.snapshot.pos.z) < .15 && Math.hypot(sample.snapshot.pos.x, sample.snapshot.pos.y) < .15);
    const flight = samples.some(sample => sample.snapshot.fsmTransitions.some(item => /TAKEOFF|FLYING|LANDING/.test(item.to)));
    if (!ground || flight) diagnostics.push(error('В опыте не нужен полёт', 'Аппарат двигался или начал этап полёта.', 'Оставьте только действия из текущего урока; взлёт изучаем позже.'));
    if (number !== 4 && samples.some(sample => /CRASHED|DISARMED_FALL|ОШИБКА/.test(sample.snapshot.status || ''))) {
        diagnostics.push(error('Программа завершилась с ошибкой', 'В запуске есть ошибка выполнения или столкновение.', 'Исправьте первую ошибку в журнале и повторите.'));
    }
    if (number < 3) {
        if (requests.length || last.fsmState !== 'IDLE') diagnostics.push(error('Пока только наблюдаем', 'Подготовка двигателей ещё не входит в этот опыт.', 'Уберите команды аппарату.'));
        if (number === 1 && (activity.lift !== 'rotors' || activity.vision !== 'camera')) diagnostics.push(error('Различите части аппарата', 'Для зачёта нужны оба назначения: тяга и изображение.', 'Найдите винты и камеру, затем ответьте на два вопроса под сценой.'));
        if (number === 2 && !activity.code.split('\n').some(line => /^\s*(--|#)\s*Мой первый опыт\s*$/i.test(line))) diagnostics.push(error('Добавьте свой комментарий', 'В программе пока нет комментария «Мой первый опыт».', 'Строка должна выглядеть ровно так: `# Мой первый опыт` в Python или `-- Мой первый опыт` в Lua. Без слова TODO и без кавычек.'));
    } else if (number === 4) {
        if (requests.length !== 2 || accepted.length !== 1 || rejected.length !== 1 || requests[0] !== accepted[0]) {
            diagnostics.push(error('Повторная команда пока не исследована', 'Нужно увидеть принятую подготовку из IDLE, затем отклонение подготовки из PREFLIGHT.', 'Вызовите подготовку дважды по заготовке. Не заменяйте повтор взлётом и не сбрасывайте состояние между командами.'));
        }
    } else if (requests.length !== 1 || accepted.length !== 1 || last.fsmState !== 'PREFLIGHT') {
        diagnostics.push(error('Одна подготовка пока не подтверждена', `Принято подготовок: ${accepted.length}; запросов: ${requests.length}; состояние: ${last.fsmState}.`, 'Отправьте одну правильную команду подготовки, без взлёта или повторного arm.'));
    }
    if (number === 6 || number === 9) {
        const before = number === 6 ? 'До arm' : 'Начинаю подготовку';
        const after = number === 6 ? 'После arm' : 'Команда отправлена';
        const first = events.findIndex(event => event.kind === 'print' && event.text?.trim().toLowerCase() === before.toLowerCase());
        const arm = events.findIndex(event => event.kind === 'arm' && event.accepted);
        const final = events.findIndex(event => event.kind === 'print' && event.text?.trim().toLowerCase() === after.toLowerCase());
        // In Lua ap.push only queues the command: the autopilot accepts it on its next tick, after the program has already printed
        // the second message. The lesson is about the order the program sends things in, so the order of the lines in the program
        // counts as much as the order of the log; a student must not have to discover sleep() to pass.
        const inLog = first >= 0 && arm > first && final > arm;
        const lines = activity.code.split('\n');
        const at = (test: (line: string) => boolean) => lines.findIndex(test);
        const sentBetween = (() => {
            const a = at(line => line.toLowerCase().includes(before.toLowerCase()) && /print/.test(line));
            const b = at(line => /ap\.push\s*\(\s*Ev\.MCE_PREFLIGHT|\.arm\s*\(/.test(line));
            const d = at(line => line.toLowerCase().includes(after.toLowerCase()) && /print/.test(line));
            return a >= 0 && b > a && d > b;
        })();
        const inProgram = first >= 0 && arm > first && final > first && sentBetween;
        if (!inLog && !inProgram) diagnostics.push(error('Сопоставьте сообщения с командой', `Нужен порядок «${before}» → принятая подготовка → «${after}».`, 'Переставьте print относительно команды. Одно последнее сообщение не подтверждает весь порядок.'));
    }
    if (!diagnostics.length && number === 5 && !activity.previousRun) {
        return { solved: false, complete: true, diagnostics: [{ kind: 'info', title: 'Первый опыт записан — повторите', reason: 'Подготовка прошла из исходной точки. Теперь нужен второй запуск этой же программы после сброса.', fix: 'Нажмите «Проверить и запустить» ещё раз. Код между запусками не меняйте.' }] };
    }
    const solved = !diagnostics.some(item => item.kind === 'error');
    if (solved) diagnostics.push({ kind: 'success', title: number === 4 ? 'Ожидаемое отклонение подтверждено' : number === 5 ? 'Два опыта совпали' : 'Опыт подтверждён',
        reason: number === 4 ? 'Журнал фиксирует принятую первую подготовку и отклонённый повтор из PREFLIGHT. Высота осталась нулевой.' : 'Проверены фактические команды, сообщения и состояние аппарата.', fix: 'Сопоставьте наблюдение с прогнозом и перейдите к разбору.' });
    return { solved, complete: true, diagnostics };
}
