import { escapeHtml } from '../render/shared.js';
import type { BookContext } from './context.js';
import { STEP_LABELS, neighbourStep } from './steps.js';

/** A lifted corner of a page: pressing it turns the page. */
export type Curl = { attr: string; label: string };
export type Curls = { back: Curl | null; next: Curl | null };

/** What the corners need to know of the lesson's progress. */
export type CurlState = { completed: boolean };

/** Which pages may be turned from this spread, and what each corner opens. */
export function spreadCurls(ctx: BookContext, state: CurlState): Curls {
    const { nav, step } = ctx;
    const before = neighbourStep(step, -1);
    const after = neighbourStep(step, 1);
    const stepCurl = (target: typeof before): Curl | null => (target ? { attr: `data-book-step="${target}"`, label: STEP_LABELS[target] } : null);
    return {
        back: stepCurl(before) ?? (nav.hasPrevious ? { attr: 'data-guide-nav="prev"', label: 'Предыдущий урок' } : null),
        // The practice is the last part: its corner leads on only once the lesson is passed.
        next: after ? stepCurl(after) : state.completed && nav.nextAttr ? { attr: nav.nextAttr, label: 'Следующий урок' } : null
    };
}

export function renderCurl(side: 'back' | 'next', curl: Curl | null): string {
    if (!curl) return '';
    const label = `${side === 'next' ? 'Перевернуть вперёд' : 'Перевернуть назад'}: ${curl.label}`;
    return `<button type="button" class="book-curl book-curl--${side}" ${curl.attr} aria-label="${escapeHtml(label)}" title="${escapeHtml(curl.label)}"></button>`;
}
