import type { GuideDiagnostic } from '../../types.js';
import type { DroneSample } from '../../evaluation/text/trace.js';
import type { PioneerExpectation } from './types.js';

/** Насколько близко (в метрах) дрон должен подойти к точке, чтобы считать её пройденной. */
const POINT_TOLERANCE = 0.4;
/** Допуск по каждой составляющей цвета (0–255). */
const COLOUR_TOLERANCE = 24;
/** На такой высоте над стартом дрон считается стоящим на земле. */
const GROUND_EPSILON = 0.3;
/** Выше этого над стартом дрон считается взлетевшим. */
const AIRBORNE = 0.5;
const CRASH_STATES = ['CRASHED', 'DISARMED_FALL', 'ОШИБКА'];

const error = (title: string, reason: string, fix: string): GuideDiagnostic => ({ kind: 'error', title, reason, fix });
const fmt = (n: number) => String(Math.round(n * 100) / 100);

type Position = { x: number; y: number; z: number };

/** Позиции считаются от места старта: локальные координаты точек отсчитываются от него, а не от начала сцены. */
function relativePositions(samples: DroneSample[]): Position[] {
    const start = samples[0]?.snapshot.pos;
    return samples.map(({ snapshot }) => ({
        x: snapshot.pos.x - (start?.x ?? 0), y: snapshot.pos.y - (start?.y ?? 0), z: snapshot.pos.z - (start?.z ?? 0)
    }));
}

function near(position: Position, target: number[]): boolean {
    return Math.hypot(position.x - target[0], position.y - target[1], position.z - target[2]) <= POINT_TOLERANCE;
}

function colourKey(sample: DroneSample): string {
    const led = sample.snapshot.leds[0];
    return led ? `${Math.round(led.r)},${Math.round(led.g)},${Math.round(led.b)}` : '0,0,0';
}

function sameColour(seen: string, wanted: string): boolean {
    const a = seen.split(',').map(Number);
    const b = wanted.split(',').map(Number);
    return a.every((value, i) => Math.abs(value - b[i]) <= COLOUR_TOLERANCE);
}

function describeColour(key: string): string {
    const [r, g, b] = key.split(',');
    return `R ${r}, G ${g}, B ${b}`;
}

/** Дрон закончил программу: сел после взлёта. Раньше этого момента ждать результат дальше нет смысла. */
export function isFlightFinished(expectation: PioneerExpectation, samples: DroneSample[]): boolean {
    if (!expectation.lands || samples.length < 2) return false;
    const positions = relativePositions(samples);
    const took = positions.some((position) => position.z > AIRBORNE);
    const last = samples[samples.length - 1].snapshot;
    return took && positions[positions.length - 1].z <= GROUND_EPSILON && last.fsmState === 'IDLE';
}

function pointsWord(count: number): string {
    return count === 1 ? 'точку' : count < 5 ? 'точки' : 'точек';
}

/**
 * Проверка урока по записи полёта: слетал ли дрон в нужные точки по порядку, сменилась ли подсветка в
 * нужной последовательности, сел ли он. Записи берутся каждые ~100 мс, пока идёт запуск.
 */
export function gradePioneerLesson(expectation: PioneerExpectation, samples: DroneSample[]): GuideDiagnostic[] {
    const diagnostics: GuideDiagnostic[] = [];
    if (!samples.length) {
        return [error('Нет записи полёта', 'За время проверки не удалось прочитать состояние дрона.', 'Запустите проверку ещё раз.')];
    }
    if (samples.some((sample) => CRASH_STATES.includes(sample.snapshot.status || ''))) {
        diagnostics.push(error('Запуск завершился ошибкой или аварией', 'Полезное действие до ошибки не засчитывается.', 'Найдите в журнале первую ошибку или проверьте траекторию и запустите снова.'));
    }

    const positions = relativePositions(samples);
    let cursor = 0;
    expectation.points.forEach((target, index) => {
        const found = positions.findIndex((position, i) => i >= cursor && near(position, target));
        if (found < 0) {
            diagnostics.push(error(
                `Дрон не побывал в точке ${index + 1}`,
                `Ожидалась точка (${fmt(target[0])}; ${fmt(target[1])}; ${fmt(target[2])}) — по порядку она ${index + 1}-я.`,
                index === 0
                    ? 'Проверьте числа в блоке «Лететь в точку»: X вперёд, Y влево, Z вверх, в метрах.'
                    : 'Проверьте порядок и числа в блоках «Лететь в точку»: каждая точка должна идти после предыдущей.'
            ));
            return;
        }
        cursor = found;
    });

    if (expectation.led?.length) {
        const seen = samples.map(colourKey).filter((key, i, all) => i === 0 || key !== all[i - 1]);
        let next = 0;
        for (const key of seen) if (next < expectation.led.length && sameColour(key, expectation.led[next])) next += 1;
        if (next < expectation.led.length) {
            diagnostics.push(error(
                next === 0 ? 'Нужный цвет подсветки не появился' : 'Цвета подсветки идут не в том порядке',
                `Ожидался цвет ${describeColour(expectation.led[next])}${next ? ` после ${describeColour(expectation.led[next - 1])}` : ''}.`,
                'Проверьте цвета в блоках подсветки, их порядок и паузы между ними.'
            ));
        }
    }

    if (expectation.lands) {
        const last = positions[positions.length - 1];
        const took = positions.some((position) => position.z > AIRBORNE);
        if (!took) {
            diagnostics.push(error('Дрон не взлетел', 'За время проверки дрон остался на земле.', 'Поставьте в начало цепочки «Запустить моторы» и «Взлететь».'));
        } else if (last.z > GROUND_EPSILON || samples[samples.length - 1].snapshot.fsmState !== 'IDLE') {
            diagnostics.push(error('Посадка не завершена', 'К концу проверки дрон ещё в воздухе или снижается.', 'Добавьте в конец цепочки блок «Приземлиться» и не вставляйте перед ним лишних пауз.'));
        }
    }

    if (!diagnostics.length) {
        const count = expectation.points.length;
        diagnostics.push({
            kind: 'success',
            title: 'Полёт совпал с заданием',
            reason: count
                ? `Дрон прошёл ${count} ${pointsWord(count)} маршрута по порядку${expectation.led ? ', показал нужные цвета' : ''}${expectation.lands ? ' и сел' : ''}.`
                : expectation.led ? 'Подсветка показала нужные цвета по порядку.' : 'Дрон взлетел, повисел и сел.',
            fix: 'Ничего делать не нужно, проверка пройдена.'
        });
    }
    return diagnostics;
}
