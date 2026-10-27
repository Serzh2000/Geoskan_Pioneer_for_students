import { escapeHtml, renderInline } from '../render/shared.js';
import type { BookContext } from './context.js';
import { renderLedbarFigure } from './ledbar.js';
import { renderListing } from './listing.js';

/** A printed page: running head, body, page number. */
export function page(side: 'left' | 'right', head: string, number: number, body: string): string {
    return `<article class="book-page book-page--${side}">
        <header class="book-head"><span>${escapeHtml(head)}</span></header>
        <div class="book-page__body">${body}</div>
        <footer class="book-foot">${number}</footer>
    </article>`;
}

function renderHeading(ctx: BookContext): string {
    return `<h1 class="book-title" id="guide-lesson-title">${escapeHtml(ctx.source.lesson.title)}</h1>
        <span class="book-rule" aria-hidden="true"></span>`;
}

function renderSteps(ctx: BookContext): string {
    return ctx.book.steps.length
        ? `<ol class="book-steps" aria-label="Пример по частям">${ctx.book.steps.map(step => `<li><code>${escapeHtml(step.snippet)}</code><span>${renderInline(step.text)}</span></li>`).join('')}</ol>`
        : '';
}

function renderTurn(ctx: BookContext, target: 'demo' | 'practice', label: string): string {
    return `<div class="book-turn"><span></span><button type="button" class="btn-primary" data-book-step="${target}">${escapeHtml(label)} <span aria-hidden="true">→</span></button></div>`;
}

/** Theory: the fragment the lesson is built for, explained, and the example it is explained with. */
export function renderTheoryPages(ctx: BookContext): [string, string] {
    const { book, source } = ctx;
    const left = page('left', ctx.head, ctx.pages[0], `
        ${renderHeading(ctx)}
        ${book.theory.map(text => `<p class="book-text">${renderInline(text)}</p>`).join('')}`);
    const right = page('right', book.chapter, ctx.pages[1], `
        <h2 class="book-label">Пример</h2>
        ${renderListing(book.code)}
        ${renderSteps(ctx)}
        ${book.figure === 'ledbar' ? `<figure class="book-figure">${renderLedbarFigure(source.language, source.lesson.id)}<figcaption class="book-caption"><b>Рис. ${source.number}.</b> ${escapeHtml(book.figureCaption)}</figcaption></figure>` : ''}
        ${renderTurn(ctx, 'demo', 'Смотреть пример')}`);
    return [left, right];
}

/** Demonstration: the example runs in the simulator while the student watches. */
export function renderDemoPages(ctx: BookContext): [string, string] {
    const { book, source } = ctx;
    const left = page('left', ctx.head, ctx.pages[0], `
        ${renderHeading(ctx)}
        ${renderListing(book.code)}
        <div class="book-watch"><h2 class="book-label">Что смотреть</h2><p class="book-text">${renderInline(book.watch)}</p></div>
        <div class="book-actions">
            <button type="button" class="btn-primary" data-book-demo>Запустить пример</button>
            <button type="button" class="btn-secondary" data-book-demo-stop>Остановить и сбросить</button>
        </div>
        <p class="book-status" role="status" data-book-demo-status>Пример выполнится в сцене справа. Ваш черновик решения не изменится.</p>`);
    const right = page('right', book.chapter, ctx.pages[1], `
        <figure class="book-figure">
            <div id="mission-guide-scene-preview-host" class="guide-scene-preview-host book-scene is-active"></div>
            <figcaption class="book-caption"><b>Рис. ${source.number}б.</b> Пример в симуляторе</figcaption>
        </figure>
        ${renderTurn(ctx, 'practice', 'К практике')}`);
    return [left, right];
}
