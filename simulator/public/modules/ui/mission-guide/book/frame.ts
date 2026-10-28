import { escapeHtml } from '../render/shared.js';
import { renderBookmarks, renderVolumes, type LessonStep } from './bookmarks.js';
import type { BookContext } from './context.js';
import { renderCurl, type Curls } from './curls.js';
import { WOBBLE_FILTER } from './glyphs.js';
import { BOOK_STEPS, STEP_LABELS, panelStep } from './steps.js';
import { renderRibbon } from './volume-marks.js';

/** The way back to the book from the plain lesson page. */
export function renderBookSwitch(): string {
    return '<div class="book-switch"><button type="button" class="btn-secondary btn--sm" data-book-view="on">Книжный вид</button></div>';
}

/** The three parts of the lesson as folder tabs on the sheet's edge: the student may read, watch or practise in any order. */
function renderParts(ctx: BookContext): string {
    return `<div class="book__parts" role="tablist" aria-label="Части урока">${BOOK_STEPS.map(step => `<button type="button" class="book-part${step === ctx.step ? ' is-active' : ''}" role="tab" aria-selected="${step === ctx.step}" data-book-step="${step}">${STEP_LABELS[step]}</button>`).join('')}</div>`;
}

/** The arrows of the bar: the lesson before and after, in the order of the volume. */
function renderStep(side: 'prev' | 'next', step: LessonStep): string {
    const path = side === 'prev' ? 'M14.5 6l-6 6 6 6' : 'M9.5 6l6 6-6 6';
    return `<button type="button" class="book-step" ${step.open ? step.attr : 'disabled'} aria-label="${escapeHtml(step.label)}" title="${escapeHtml(step.label)}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg></button>`;
}

/** The book around a spread: the bar with the contents, the close button, the sheet with its two pages. */
export function renderBookFrame(ctx: BookContext, left: string, right: string, curls: Curls, busy: boolean): string {
    const { source, step } = ctx;
    // How much of the volume lies on the left: the block of read pages is thicker the further the reader has gone.
    const read = Math.min(1, Math.max(0, ctx.pages[0] / Math.max(1, ctx.totalPages))).toFixed(3);
    const marks = renderBookmarks(source.volume, source.language, source.lesson.id);
    return `
        <div class="guide-modal-layout book-layout" data-guide-language="${source.language}" data-guide-portal-page="lesson">
            ${WOBBLE_FILTER}
            <section class="book" data-walkthrough-step="${panelStep(step)}" data-book-step-name="${step}" data-book-volume="${source.volume}" aria-labelledby="guide-lesson-title">
                <div class="book__top">
                    <button type="button" class="book-toc-btn" data-book-toc-toggle aria-expanded="false" aria-controls="book-toc"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r=".8"/><circle cx="4" cy="12" r=".8"/><circle cx="4" cy="18" r=".8"/></svg>Оглавление</button>
                    <div class="book__place">
                        <p class="book__chapter">${escapeHtml(marks.chapter)}</p>
                        <p class="book__where">${escapeHtml(marks.place)}</p>
                    </div>
                    <div class="book__steps">${renderStep('prev', marks.previous)}${renderStep('next', marks.next)}</div>
                    <nav class="pk-seg book__volumes" role="tablist" aria-label="Язык курса">${renderVolumes(source.volume, busy)}</nav>
                    <button type="button" class="panel-close-btn book-close" data-book-close aria-label="Закрыть учебник"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                </div>
                <div class="book__body">
                    <div class="book__stage">
                    ${renderParts(ctx)}
                    <div class="book__sheet" id="guide-walkthrough-content" tabindex="-1" role="region" data-book-page="${ctx.pages[0]}" data-book-lesson="${escapeHtml(source.lesson.id)}" style="--bk-read: ${read}" aria-label="${STEP_LABELS[step]}">${left}${right}${renderRibbon(source.volume)}${renderCurl('back', curls.back)}${renderCurl('next', curls.next)}</div>
                    </div>
                    ${marks.contents}
                </div>
                <p class="book__foot"><button type="button" class="book-link" data-book-view="off">Показать обычный вид урока</button></p>
            </section>
        </div>`;
}
