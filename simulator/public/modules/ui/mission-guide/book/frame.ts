import { escapeHtml } from '../render/shared.js';
import { renderBookmarks, renderVolumes } from './bookmarks.js';
import type { BookContext } from './context.js';
import { renderCurl, type Curls } from './curls.js';
import { BOOK_STEPS, STEP_LABELS, panelStep } from './steps.js';

/** The way back to the book from the plain lesson page. */
export function renderBookSwitch(): string {
    return '<div class="book-switch"><button type="button" class="btn-secondary btn--sm" data-book-view="on">Книжный вид</button></div>';
}

/** The three parts of the lesson as folder tabs on the sheet's edge: the student may read, watch or practise in any order. */
function renderParts(ctx: BookContext): string {
    return `<div class="book__parts" role="tablist" aria-label="Части урока">${BOOK_STEPS.map(step => `<button type="button" class="book-part${step === ctx.step ? ' is-active' : ''}" role="tab" aria-selected="${step === ctx.step}" data-book-step="${step}">${STEP_LABELS[step]}</button>`).join('')}</div>`;
}

/** The book around a spread: bookmarks on the edges, the close button, the sheet with its two pages. */
export function renderBookFrame(ctx: BookContext, left: string, right: string, curls: Curls, busy: boolean): string {
    const { source, step } = ctx;
    // How much of the volume lies on the left: the block of read pages is thicker the further the reader has gone.
    const read = Math.min(1, Math.max(0, ctx.pages[0] / Math.max(1, ctx.totalPages))).toFixed(3);
    const marks = renderBookmarks(source.volume, source.language, source.lesson.id);
    return `
        <div class="guide-modal-layout book-layout" data-guide-language="${source.language}" data-guide-portal-page="lesson">
            <section class="book" data-walkthrough-step="${panelStep(step)}" data-book-step-name="${step}" data-book-volume="${source.volume}" aria-labelledby="guide-lesson-title">
                <div class="book__top">
                    <div class="book__lessons-wrap">
                        <p class="book-margin-label" id="book-lessons-label">${escapeHtml(marks.lessonsLabel)}</p>
                        <nav class="book__lessons" aria-labelledby="book-lessons-label">${marks.lessons}</nav>
                    </div>
                    <nav class="pk-seg book__volumes" role="tablist" aria-label="Язык курса">${renderVolumes(source.volume, busy)}</nav>
                    <button type="button" class="panel-close-btn book-close" data-book-close aria-label="Закрыть учебник"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                </div>
                <div class="book__body">
                    <div class="book__stage">
                    ${renderParts(ctx)}
                    <div class="book__sheet" id="guide-walkthrough-content" tabindex="-1" role="region" data-book-page="${ctx.pages[0]}" data-book-lesson="${escapeHtml(source.lesson.id)}" style="--bk-read: ${read}" aria-label="${STEP_LABELS[step]}">${left}${right}${renderCurl('back', curls.back)}${renderCurl('next', curls.next)}</div>
                    </div>
                    <div class="book__edge">
                        <p class="book-margin-label book-margin-label--edge" id="book-chapters-label">Главы</p>
                        <nav class="book__chapters" aria-labelledby="book-chapters-label">${marks.chapters}</nav>
                    </div>
                </div>
                <p class="book__foot"><button type="button" class="book-link" data-book-view="off">Показать обычный вид урока</button></p>
            </section>
        </div>`;
}
