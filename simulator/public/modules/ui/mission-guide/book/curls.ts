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
    // The button holds the drawing of a peeled corner (what the fold uncovers, the back of the paper) and the area that answers the pointer.
    return `<button type="button" class="book-curl book-curl--${side}" ${curl.attr} aria-label="${escapeHtml(label)}" title="${escapeHtml(curl.label)}"><span class="book-curl__art" aria-hidden="true"><span class="book-curl__under"></span><span class="book-curl__flapwrap"><span class="book-curl__flap"></span></span></span><span class="book-curl__hit" aria-hidden="true"></span></button>`;
}

const PEEL_RANGE_PX = 260;

/**
 * The corners rise toward the pointer: the nearer it comes to a corner of the sheet, the more the paper peels. The sheet is
 * redrawn on every step, so the listeners go on the sheet itself and are not bound twice.
 */
export function attachCurlPeel(container: HTMLElement): void {
    const sheet = container.querySelector<HTMLElement>('.book__sheet');
    const curls = sheet ? [...sheet.querySelectorAll<HTMLElement>('.book-curl')] : [];
    if (!sheet || !curls.length) return;
    let frame = 0;
    let at: { x: number; y: number } | null = null;
    const apply = (): void => {
        frame = 0;
        const rect = sheet.getBoundingClientRect();
        for (const curl of curls) {
            const cornerX = curl.classList.contains('book-curl--next') ? rect.right : rect.left;
            const near = at ? Math.max(0, 1 - Math.hypot(at.x - cornerX, at.y - rect.bottom) / PEEL_RANGE_PX) : 0;
            curl.style.setProperty('--near', (near * near).toFixed(3));
        }
    };
    const schedule = (): void => { if (!frame) frame = requestAnimationFrame(apply); };
    sheet.addEventListener('pointermove', event => {
        if (event.pointerType === 'touch') return;
        at = { x: event.clientX, y: event.clientY };
        schedule();
    });
    sheet.addEventListener('pointerleave', () => { at = null; schedule(); });
}
