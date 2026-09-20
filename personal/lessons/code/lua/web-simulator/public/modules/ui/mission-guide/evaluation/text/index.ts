/**
 * Оркестрация проверки текстовых (Lua/Python) уроков практикума.
 *
 * Эта проверка НЕ запускает скрипт сама — вызывающая сторона (интегратор в
 * `interactions/`) должна была уже дёрнуть `restartAndRunSimulation()` (или
 * эквивалент кнопки «ЗАПУСТИТЬ») ДО вызова `runTextLessonCheck`. Здесь мы только
 * ждём фиксированную паузу, чтобы дать таймерам/ожиданиям скрипта отработать, затем
 * снимаем состояние симулятора и прогоняем его через грейдер нужной темы.
 *
 * В кодовой базе нет события «скрипт завершил выполнение» (проверено), поэтому
 * задержка — намеренно прагматичное решение: `waitMs` задаётся отдельно на каждый
 * вызов, а не хардкодится одним значением на все уроки (урок с `Timer.callLater(3, ...)`
 * требует заметно больше времени ожидания, чем урок с мгновенным включением светодиода).
 */
import type { GuideEvaluation } from '../../types.js';
import { captureDroneSnapshot } from './snapshot.js';
import { TEXT_LESSON_GRADERS } from './graders.js';

const DEFAULT_WAIT_MS = 2500;

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runTextLessonCheck(
    topicId: string,
    options?: { waitMs?: number }
): Promise<GuideEvaluation> {
    const waitMs = options?.waitMs ?? DEFAULT_WAIT_MS;
    await wait(waitMs);

    const snapshot = captureDroneSnapshot();

    const grader = TEXT_LESSON_GRADERS[topicId];
    if (!grader) {
        return {
            solved: false,
            complete: snapshot !== null,
            diagnostics: [{
                kind: 'error',
                title: 'Проверка для этой темы ещё не реализована',
                reason: `Не найден грейдер для topic-id "${topicId}".`,
                fix: 'Сообщите об этом разработчикам урока — нужен грейдер в TEXT_LESSON_GRADERS.'
            }]
        };
    }

    if (!snapshot) {
        return {
            solved: false,
            complete: false,
            diagnostics: [{
                kind: 'error',
                title: 'Не удалось прочитать состояние дрона',
                reason: 'В симуляторе нет дрона с текущим currentDroneId — возможно, симуляция ещё не инициализирована.',
                fix: 'Убедитесь, что симуляция запущена, и повторите проверку.'
            }]
        };
    }

    const diagnostics = grader(snapshot);
    const solved = !diagnostics.some((diagnostic) => diagnostic.kind === 'error');

    return {
        solved,
        complete: true,
        diagnostics
    };
}
