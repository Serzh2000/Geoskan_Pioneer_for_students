import { escapeHtml } from '../render/shared.js';
import type { BookContext } from './context.js';

/** A lifted corner of a page: pressing it turns the page the way the main button of the spread does. */
export type Curl = { attr: string; label: string };
export type Curls = { back: Curl | null; next: Curl | null };

/** What the spread knows about the lesson's progress. */
export type CurlState = { ready: boolean; hasChecked: boolean; solved: boolean; pending: boolean; completed: boolean };

/** Which pages may be turned from this spread, and what each corner opens. */
export function spreadCurls(ctx: BookContext, state: CurlState): Curls {
    const { nav } = ctx;
    if (ctx.spread === 1) {
        return {
            back: nav.hasPrevious ? { attr: 'data-guide-nav="prev"', label: 'Предыдущий урок' } : null,
            next: state.ready ? { attr: 'data-walkthrough-step="build"', label: 'К практике' } : null
        };
    }
    if (ctx.spread === 2) {
        return {
            back: state.pending ? null : { attr: 'data-walkthrough-step="predict"', label: 'К идее' },
            next: state.solved && state.hasChecked && !state.pending ? { attr: 'data-walkthrough-step="reflect"', label: 'К разбору' } : null
        };
    }
    const next = state.completed
        ? (nav.nextAttr ? { attr: nav.nextAttr, label: 'Следующий урок' } : null)
        : state.solved ? { attr: 'data-walkthrough-finish', label: 'Завершить урок' } : null;
    return { back: { attr: 'data-walkthrough-step="check"', label: 'К результату опыта' }, next };
}

export function renderCurl(side: 'back' | 'next', curl: Curl | null): string {
    if (!curl) return '';
    const label = `${side === 'next' ? 'Перевернуть вперёд' : 'Перевернуть назад'}: ${curl.label}`;
    return `<button type="button" class="book-curl book-curl--${side}" ${curl.attr} aria-label="${escapeHtml(label)}" title="${escapeHtml(curl.label)}"></button>`;
}
