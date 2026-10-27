import { escapeHtml, renderInline } from '../render/shared.js';
import { isWalkthroughBusy, getWalkthroughProgress, walkthroughKey } from '../walkthrough/state.js';
import { getWalkthroughContent } from '../walkthrough/content.js';
import type { BookContext } from './context.js';
import { renderLedbarFigure } from './ledbar.js';

/** A printed page: running head, body, page number. */
export function page(side: 'left' | 'right', head: string, number: number, body: string): string {
    return `<article class="book-page book-page--${side}">
        <header class="book-head"><span>${escapeHtml(head)}</span></header>
        <div class="book-page__body">${body}</div>
        <footer class="book-foot">${number}</footer>
    </article>`;
}

function renderDroneSketch(): string {
    return `<svg class="book-drone" viewBox="0 0 320 190" role="img" aria-label="Схема дрона сверху">
        <g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <rect x="130" y="72" width="60" height="46" rx="11"/>
            <path d="M139 80 92 38M181 80l47-42M139 110l-47 42M181 110l47 42"/>
            <circle cx="80" cy="30" r="27" stroke-dasharray="5 5"/><circle cx="240" cy="30" r="27" stroke-dasharray="5 5"/>
            <circle cx="80" cy="160" r="27" stroke-dasharray="5 5"/><circle cx="240" cy="160" r="27" stroke-dasharray="5 5"/>
            <circle cx="160" cy="95" r="9"/><path d="M152 118h16"/>
        </g>
    </svg>`;
}

/** Page 1 of the idea spread: what the lesson is about, the construction in a frame, the prediction. */
export function renderIdeaPage(ctx: BookContext): string {
    const { source, book } = ctx;
    const { lesson } = source;
    const content = getWalkthroughContent(lesson);
    const progress = getWalkthroughProgress(walkthroughKey(source.language, lesson.id), content.correct);
    const right = progress.answer === content.correct;
    const choice = progress.answer === null ? undefined : content.choices[progress.answer];
    const choices = content.choices.map((option, index) => {
        const picked = progress.answer === index;
        return `<li><button type="button" class="book-choice${picked ? ' is-picked' : ''}${picked && right ? ' is-right' : ''}" data-book-answer="${index}" aria-pressed="${picked}"><span class="book-choice__box" aria-hidden="true">${picked ? '✓' : ''}</span><span>${escapeHtml(option.text)}</span></button></li>`;
    }).join('');
    return page('left', ctx.head, ctx.pages[0], `
        <p class="book-kicker">${escapeHtml(book.kicker)}</p>
        <h1 class="book-title" id="guide-lesson-title">${escapeHtml(lesson.title)}</h1>
        <span class="book-rule" aria-hidden="true"></span>
        ${book.paragraphs.map(text => `<p class="book-text">${renderInline(text)}</p>`).join('')}
        ${book.key.code ? `<figure class="book-key${/[А-Яа-яЁё]/.test(book.key.code) ? ' book-key--words' : ''}"><code>${escapeHtml(book.key.code)}</code>${book.key.caption ? `<figcaption>${renderInline(book.key.caption)}</figcaption>` : ''}</figure>` : ''}
        <section class="book-words" aria-label="Ключевые слова"><h2 class="book-label">Ключевые слова</h2>
            <dl>${book.words.map(word => `<div><dt>${escapeHtml(word.term)}</dt><dd>${renderInline(word.meaning)}</dd></div>`).join('')}</dl></section>
        <section class="book-predict" aria-labelledby="book-predict-q">
            <h2 class="book-question" id="book-predict-q"><span class="book-label">Предскажите</span> ${escapeHtml(content.question)}</h2>
            <div class="book-predict__row">
                <ul class="book-choices">${choices}</ul>
                ${book.margin ? `<aside class="book-margin"><p class="book-hand">${escapeHtml(book.margin)}</p></aside>` : ''}
            </div>
            ${choice
                ? `<div class="book-answer ${right ? 'is-right' : 'is-retry'}" role="status"><p>${escapeHtml(choice.feedback)}</p>${right ? '' : '<p class="book-hand">Выберите другой вариант — ошибка здесь ничего не стоит.</p>'}</div>`
                : '<p class="book-hand book-hand--hint">Отметьте ответ карандашом, прежде чем идти дальше.</p>'}
        </section>`);
}

/** Page 2 of the idea spread: the live figure of the lesson and the turn of the page. */
export function renderFigurePage(ctx: BookContext): string {
    const { source, book } = ctx;
    const { lesson } = source;
    const content = getWalkthroughContent(lesson);
    const ready = getWalkthroughProgress(walkthroughKey(source.language, lesson.id), content.correct).answer === content.correct;
    return page('right', book.chapter, ctx.pages[1], `
        <figure class="book-figure">
            ${book.figure === 'ledbar' ? renderLedbarFigure(source.language, lesson.id) : `<div class="book-figure__frame">${renderDroneSketch()}</div>`}
            <figcaption class="book-caption"><b>Рис. ${source.number}.</b> ${escapeHtml(book.figureCaption)}</figcaption>
        </figure>
        <p class="book-hint">${escapeHtml(book.figureHint)}</p>
        <div class="book-turn">
            <p class="book-hand">${ready ? 'Верный прогноз — теперь проверим его на дроне.' : 'Сначала предскажите, потом переворачивайте страницу.'}</p>
            <button type="button" class="btn-primary" data-walkthrough-step="build" ${ready ? '' : 'disabled'}>К практике <span aria-hidden="true">→</span></button>
        </div>`);
}

/** Page 1 of the review spread: what was learned, the prediction against the result. */
export function renderReviewPage(ctx: BookContext): string {
    const { source } = ctx;
    const { lesson } = source;
    const content = getWalkthroughContent(lesson);
    return page('left', ctx.head, ctx.pages[0], `
        <p class="book-kicker">${escapeHtml(source.label)} · Разбор</p>
        <h2 class="book-title book-title--sm">Главное из урока</h2>
        <span class="book-rule" aria-hidden="true"></span>
        <p class="book-text book-lead">${renderInline(content.takeaway)}</p>
        <dl class="book-compare">
            <div><dt>Вы предсказали</dt><dd>${escapeHtml(content.choices[content.correct]?.text ?? '')}</dd></div>
            <div><dt>Опыт показал</dt><dd>${renderInline(lesson.expectedOutcome)}</dd></div>
        </dl>
        <div class="book-answer is-right" role="status"><p><span aria-hidden="true">✓</span> Прогноз совпал с результатом</p></div>
        <section class="book-try"><h2 class="book-label">Попробуйте сами</h2>
            ${source.experiment ? `<p class="book-text">${renderInline(source.experiment)}</p>` : ''}
            <p class="book-note">Изменённая программа потребует новой проверки исходного задания.</p>
            <button type="button" class="btn-secondary" data-walkthrough-step="build" ${isWalkthroughBusy(walkthroughKey(source.language, lesson.id)) ? 'disabled' : ''}>Вернуться к практике</button>
        </section>`);
}

/** Page 2 of the review spread: the stamp and the way on. */
export function renderStampPage(ctx: BookContext, state: { completed: boolean; solved: boolean }): string {
    const { nav } = ctx;
    return page('right', ctx.book.chapter, ctx.pages[1], `
        <div class="book-stamp-wrap">
            <div class="book-stamp${state.completed ? ' is-set' : ''}" aria-hidden="true"><span>${state.completed ? 'Пройдено' : 'штамп'}</span></div>
            <p class="book-hand">${state.completed ? escapeHtml(nav.note) : 'Завершите урок, и штамп останется на странице.'}</p>
        </div>
        <div class="book-turn book-turn--stack">
            ${state.completed ? nav.next : `<button type="button" class="btn-primary" data-walkthrough-finish ${state.solved ? '' : 'disabled'}>Завершить урок</button>`}
            <button type="button" class="btn-secondary book-ghost" data-walkthrough-step="check">К результату опыта</button>
            ${nav.hasPrevious ? '<button type="button" class="btn-secondary book-ghost" data-guide-nav="prev"><span aria-hidden="true">←</span> Предыдущий урок</button>' : ''}
        </div>`);
}
