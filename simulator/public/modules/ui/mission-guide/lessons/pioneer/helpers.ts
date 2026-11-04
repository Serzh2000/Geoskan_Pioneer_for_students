import type { PioneerExpectation, PioneerLessonSpec } from './types.js';

export const R = (n: number) => Math.round(n * 100) / 100;
export const OFF = '0,0,0';
export const cycle = (times: number, ...colours: string[]) => Array.from({ length: times }, () => colours).flat();
export const twice = (points: number[][]) => [...points, ...points];

/**
 * Предельное время наблюдения: взлёт и посадка (~10 с), по ~3.4 с на точку и запас в треть на медленную машину.
 * Проверка заканчивается раньше, как только дрон сел (см. runTextLessonCheck).
 */
export const flightMs = (points: number, extraSeconds = 0) => Math.round((10 + points * 3.4 + extraSeconds) * 1.3 * 1000);
export const groundMs = (seconds: number) => Math.round((seconds * 1.3 + 2) * 1000);

export const expect = (points: number[][], waitMs: number, options: { led?: string[]; lands?: boolean } = {}): PioneerExpectation => ({
    points, waitMs, led: options.led, lands: options.lands ?? true
});

type Draft = Omit<PioneerLessonSpec, 'topic'> & { name: string };

/** Собирает уроки группы: имя темы получает приставку bk-, остальное берётся из черновика как есть. */
export function lessonsOf(list: PioneerLessonSpec[]): (draft: Draft) => void {
    return (draft) => {
        const { name, ...rest } = draft;
        list.push({ topic: `bk-${name}`, ...rest });
    };
}
