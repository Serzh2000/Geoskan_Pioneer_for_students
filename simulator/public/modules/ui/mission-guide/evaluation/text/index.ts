/**
 * Оркестрация проверки текстовых (Lua/Python) уроков практикума.
 *
 * Эта проверка НЕ запускает скрипт сама — вызывающая сторона (интегратор в
 * `interactions/`) должна была уже дёрнуть `restartAndRunSimulation()` (или
 * эквивалент кнопки «ЗАПУСТИТЬ») ДО вызова `runTextLessonCheck`. Здесь мы только
 * наблюдаем состояние каждые ~100 мс в течение заданного интервала, затем
 * проверяем конечное состояние и последовательность видимых изменений.
 *
 * В кодовой базе нет события «скрипт завершил выполнение» (проверено), поэтому
 * задержка — намеренно прагматичное решение: `waitMs` задаётся отдельно на каждый
 * вызов, а не хардкодится одним значением на все уроки (урок с `Timer.callLater(3, ...)`
 * требует заметно больше времени ожидания, чем урок с мгновенным включением светодиода).
 */
import type { GuideEvaluation } from '../../types.js';
import { captureDroneSnapshot } from './snapshot.js';
import { TEXT_LESSON_GRADERS } from './graders.js';
import { currentDroneId } from '../../../../core/state.js';
import { gradeWalkthroughTrace, type DroneSample } from './trace.js';
import { finishLearningCapture, hasLearningMessage } from '../../../../core/learning-journal.js';
import { gradeDroneAcademy, type DroneAcademyActivity } from '../../academy/evaluation/drone.js';
import { gradeSignalsCode } from '../../academy/evaluation/signals-code.js';
import { gradeTimeAcademy } from '../../academy/evaluation/time.js';
import { gradeFlightAcademy } from '../../academy/evaluation/flight.js';
import { gradeTelemetryAcademy } from '../../academy/evaluation/telemetry.js';
import { gradeVisionAcademy } from '../../academy/evaluation/vision.js';
import { buildFlightTimeline } from './timeline.js';

const DEFAULT_WAIT_MS = 2500;

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runTextLessonCheck(
    topicId: string,
    options?: { waitMs?: number; language?: 'lua' | 'python'; capture?: { droneId: string; token: number }; activity?: DroneAcademyActivity; doneMessage?: string; isCurrent?: () => boolean }
): Promise<GuideEvaluation> {
    const timelineHolder: { samples: DroneSample[] } = { samples: [] };
    const evaluation = await evaluateTextLesson(topicId, options, timelineHolder);
    const timeline = buildFlightTimeline(timelineHolder.samples);
    return timeline ? { ...evaluation, timeline } : evaluation;
}

async function evaluateTextLesson(
    topicId: string,
    options: { waitMs?: number; language?: 'lua' | 'python'; capture?: { droneId: string; token: number }; activity?: DroneAcademyActivity; doneMessage?: string; isCurrent?: () => boolean } | undefined,
    timelineHolder: { samples: DroneSample[] }
): Promise<GuideEvaluation> {
    const waitMs = options?.waitMs ?? DEFAULT_WAIT_MS;
    const startedAt = performance.now();
    const droneId = currentDroneId;
    const samples: DroneSample[] = timelineHolder.samples;
    do {
        if (options?.isCurrent && !options.isCurrent()) break;
        const current = captureDroneSnapshot(droneId);
        if (current) samples.push({ elapsedMs: performance.now() - startedAt, snapshot: current });
        if (current && /ОШИБКА|CRASHED|DISARMED_FALL/.test(current.status || '')) break;
        if (options?.capture && options.doneMessage && hasLearningMessage(options.capture.droneId, options.capture.token, options.doneMessage)) break;
        const remaining = waitMs - (performance.now() - startedAt);
        if (remaining <= 0) break;
        await wait(Math.min(100, remaining));
    } while (true);
    const snapshot = samples[samples.length - 1]?.snapshot || null;

    if (/^academy-\d{3}$/.test(topicId)) {
        const events = options?.capture ? finishLearningCapture(options.capture.droneId, options.capture.token) : [];
        const number = Number(topicId.slice(-3));
        if (number <= 9) return gradeDroneAcademy(number, samples, events, options?.activity || { code: '' });
        if (number <= 27) return gradeSignalsCode(number, samples, events, options?.activity || { code: '' });
        if (number <= 36) return gradeTimeAcademy(number, samples, events);
        if (number <= 63) return gradeFlightAcademy(number, samples, events, options?.activity || { code: '' });
        if (number <= 72) return gradeTelemetryAcademy(number, samples, events, options?.activity || { code: '' });
        if (number <= 108) return gradeVisionAcademy(number, samples, events, options?.activity || { code: '' });
    }

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

    // Lua's delayed exercise intentionally controls the second LED.
    let gradingSnapshot = topicId === 'led-delayed' && options?.language === 'lua'
        ? { ...snapshot, leds: [snapshot.leds[1]] } : snapshot;
    if (topicId === 'route' && samples[0]) {
        gradingSnapshot = { ...snapshot, pos: { ...snapshot.pos,
            x: snapshot.pos.x - samples[0].snapshot.pos.x,
            y: snapshot.pos.y - samples[0].snapshot.pos.y } };
    }
    let diagnostics = grader(gradingSnapshot);
    if (options?.language) {
        diagnostics = diagnostics.filter(item => !(item.kind === 'info' && ['led-sequence', 'led-confirm', 'led-delayed'].includes(topicId)));
        if (topicId === 'route') diagnostics = diagnostics.filter(item => item.kind !== 'info');
        diagnostics.push(...gradeWalkthroughTrace(topicId, samples, options.language));
    }
    const solved = !diagnostics.some((diagnostic) => diagnostic.kind === 'error');

    return {
        solved,
        complete: true,
        diagnostics
    };
}
