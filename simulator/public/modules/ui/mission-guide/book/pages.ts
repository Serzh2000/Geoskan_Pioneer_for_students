import { escapeHtml, renderInline } from '../render/shared.js';
import type { BookContext } from './context.js';
import { renderStamp } from './glyphs.js';
import { renderLedbarFigure } from './ledbar.js';
import { renderListing } from './listing.js';
import { renderScenePlate } from './scene-plate.js';
import { renderBlockFigure, renderBlockListingSlot } from './block-figure.js';
import type { GuideLesson } from '../types.js';

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

/** The example of a Blockly lesson on pioneer blocks: the blocks themselves, laid on the page. */
function blocksOf(ctx: BookContext): GuideLesson['pioneer'] {
    return ctx.source.kind === 'blockly' ? (ctx.source.lesson as GuideLesson).pioneer : undefined;
}

function renderBlockNotes(notes: string[]): string {
    return `<ol class="book-steps book-steps--notes" aria-label="Пример по частям">${notes.map(note => `<li><span>${renderInline(note)}</span></li>`).join('')}</ol>`;
}

/** Theory: the fragment the lesson is built for, explained, and the example it is explained with. */
export function renderTheoryPages(ctx: BookContext): [string, string] {
    const { book, source } = ctx;
    const pioneer = blocksOf(ctx);
    if (pioneer) {
        const key = `${source.lesson.id}:example`;
        return [page('left', ctx.head, ctx.pages[0], `
            ${renderHeading(ctx)}
            ${book.theory.map(text => `<p class="book-text">${renderInline(text)}</p>`).join('')}`),
        page('right', book.chapter, ctx.pages[1], `
            <h2 class="book-label">Пример</h2>
            ${renderBlockFigure(key, pioneer.example, `<b>Рис. ${source.number}.</b> ${escapeHtml(source.lesson.title)}: так выглядят блоки`)}
            ${renderBlockNotes(pioneer.notes)}
            ${renderTurn(ctx, 'demo', 'Смотреть пример')}`)];
    }
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
    const pioneer = blocksOf(ctx);
    const example = pioneer ? `${renderBlockFigure(`${source.lesson.id}:demo`, pioneer.example, `<b>Рис. ${source.number}а.</b> Пример: блоки и код, в который они собираются`)}${renderBlockListingSlot(`${source.lesson.id}:demo`)}` : renderListing(book.code);
    const left = page('left', ctx.head, ctx.pages[0], `
        ${renderHeading(ctx)}
        ${example}
        <div class="book-watch"><h2 class="book-label">Что смотреть</h2><p class="book-text">${renderInline(book.watch)}</p></div>
        <div class="book-actions">
            ${renderStamp('run', 'Запустить пример', 'data-book-demo', true)}
            ${renderStamp('stop', 'Остановить и сбросить', 'data-book-demo-stop')}
        </div>
        <p class="book-status" role="status" data-book-demo-status>Пример выполнится в сцене справа. Ваш черновик решения не изменится.</p>`);
    const right = page('right', book.chapter, ctx.pages[1], `
        ${renderScenePlate(source.number)}
        ${renderTurn(ctx, 'practice', 'К практике')}`);
    return [left, right];
}
