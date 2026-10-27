import type { BookLesson } from './data.js';
import type { BookSource } from './source.js';

export type Spread = 1 | 2 | 3;

/** Where a finished lesson leads, already turned into the markup of its button. */
export type BookNav = {
    note: string;
    hasPrevious: boolean;
    next: string;
};

/** Everything the pages of one spread are drawn from. */
export type BookContext = {
    source: BookSource;
    book: BookLesson;
    spread: Spread;
    /** Printed numbers of the left and the right page. */
    pages: [number, number];
    /** The running head of the left page. */
    head: string;
    nav: BookNav;
};

export const SPREAD_NAMES = ['Идея', 'Практика', 'Разбор'];
const PAGES_PER_LESSON = 6;

export function spreadPages(source: BookSource, spread: Spread): [number, number] {
    const base = source.pageOffset + (source.number - 1) * PAGES_PER_LESSON + (spread - 1) * 2;
    return [base + 1, base + 2];
}

export function spreadOfStep(step: string): Spread {
    return step === 'reflect' ? 3 : step === 'build' || step === 'check' ? 2 : 1;
}
