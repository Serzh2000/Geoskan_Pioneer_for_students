import { escapeHtml } from '../render/shared.js';
import { renderBookmarks, renderVolumes } from './bookmarks.js';
import { SPREAD_NAMES, type BookContext } from './context.js';

/** The way back to the book from the plain lesson page. */
export function renderBookSwitch(): string {
    return '<div class="book-switch"><button type="button" class="btn-secondary btn--sm" data-book-view="on">Книжный вид</button></div>';
}

/** The book around a spread: bookmarks on three edges, the close button, the sheet with its two pages. */
export function renderBookFrame(ctx: BookContext, step: string, left: string, right: string, busy: boolean): string {
    const { source, spread } = ctx;
    const marks = renderBookmarks(source.volume, source.language, source.lesson.id);
    return `
        <div class="guide-modal-layout book-layout" data-guide-language="${source.language}" data-guide-portal-page="lesson">
            <section class="book" data-walkthrough-step="${step}" data-book-spread="${spread}" data-book-volume="${source.volume}" aria-labelledby="guide-lesson-title">
                <div class="book__top">
                    <div class="book__lessons-wrap">
                        <p class="book-margin-label" id="book-lessons-label">${escapeHtml(marks.lessonsLabel)}</p>
                        <nav class="book__lessons" aria-labelledby="book-lessons-label">${marks.lessons}</nav>
                    </div>
                    <ol class="book__spreads" aria-label="Разворот урока">${SPREAD_NAMES.map((name, index) => `<li${index + 1 === spread ? ' aria-current="step"' : ''}>${name}</li>`).join('')}</ol>
                    <button type="button" class="btn-secondary btn--sm book-view" data-book-view="off">Обычный вид</button>
                    <button type="button" class="panel-close-btn book-close" data-book-close aria-label="Закрыть учебник"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                </div>
                <div class="book__body">
                    <div class="book__edge book__edge--volumes">
                        <p class="book-margin-label book-margin-label--edge" id="book-volumes-label">Язык курса</p>
                        <nav class="book__chapters book__volumes" role="tablist" aria-labelledby="book-volumes-label">${renderVolumes(source.volume, busy)}</nav>
                    </div>
                    <div class="book__sheet" id="guide-walkthrough-content" tabindex="-1" role="region" aria-label="Разворот ${spread} из 3: ${SPREAD_NAMES[spread - 1]}">${left}${right}</div>
                    <div class="book__edge">
                        <p class="book-margin-label book-margin-label--edge" id="book-chapters-label">Главы курса</p>
                        <nav class="book__chapters" aria-labelledby="book-chapters-label">${marks.chapters}</nav>
                    </div>
                </div>
            </section>
        </div>`;
}
