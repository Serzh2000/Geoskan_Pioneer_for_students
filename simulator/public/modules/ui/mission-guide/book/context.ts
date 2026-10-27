import type { BookLesson } from './data.js';
import type { BookSource } from './source.js';

export type Spread = 1 | 2 | 3;

/** Where a finished lesson leads, already turned into the markup of its button. */
export type BookNav = {
    note: string;
    hasPrevious: boolean;
    next: string;
    /** The attribute that makes an element open the next lesson, or empty at the end of a list. */
    nextAttr: string;
};

/** Everything the pages of one spread are drawn from. */
export type BookContext = {
    source: BookSource;
    book: BookLesson;
    spread: Spread;
    /** Printed numbers of the left and the right page. */
    pages: [number, number];
    /** Pages in the whole volume, to tell how thick the read and the unread parts are. */
    totalPages: number;
    /** The running head of the left page. */
    head: string;
    nav: BookNav;
};

export const SPREAD_NAMES = ['Идея', 'Практика', 'Разбор'];
export const PAGES_PER_LESSON = 6;

export function spreadPages(source: BookSource, spread: Spread): [number, number] {
    const base = source.pageOffset + (source.number - 1) * PAGES_PER_LESSON + (spread - 1) * 2;
    return [base + 1, base + 2];
}

export function spreadOfStep(step: string): Spread {
    return step === 'reflect' ? 3 : step === 'build' || step === 'check' ? 2 : 1;
}
