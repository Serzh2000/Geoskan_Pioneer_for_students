import type { BookLesson } from './data.js';
import type { BookSource } from './source.js';
import { BOOK_STEPS, STEP_LABELS, type BookStep } from './steps.js';
import { VOLUME_TITLES } from './volume-marks.js';

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
    step: BookStep;
    /** Printed numbers of the left and the right page. */
    pages: [number, number];
    /** Pages in the whole volume, to tell how thick the read and the unread parts are. */
    totalPages: number;
    /** The running head of the left page. */
    head: string;
    nav: BookNav;
};

/** The running head of the left page: which lesson and which of its three parts. */
export function bookHead(source: BookSource, step: BookStep): string {
    return `Том ${VOLUME_TITLES[source.volume]} · ${source.label} · ${STEP_LABELS[step]}`;
}

export const PAGES_PER_LESSON = BOOK_STEPS.length * 2;

export function spreadPages(source: BookSource, step: BookStep): [number, number] {
    const base = source.pageOffset + (source.number - 1) * PAGES_PER_LESSON + BOOK_STEPS.indexOf(step) * 2;
    return [base + 1, base + 2];
}
