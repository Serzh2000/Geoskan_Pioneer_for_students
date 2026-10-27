import { escapeHtml, renderInline } from '../render/shared.js';
import { renderRunBanner } from '../render/navigation.js';
import { renderTextCheckParts } from '../render/text-check.js';
import { practiceNote } from '../render/practice-note.js';
import { renderTerrainPrep } from '../render/terrain-prep.js';
import { renderInspectionQuestions } from '../render/inspection-questions.js';
import { blocklyPracticeSteps } from '../render/blockly-copy.js';
import { renderTargetRoute } from '../render/support.js';
import { renderCheckParts } from '../render/check-step.js';
import type { BlocklyView } from '../render/blockly-view.js';
import type { GuideTextLesson } from '../types.js';
import type { BookContext } from './context.js';
import { page } from './pages.js';

/** What the right page of the practice spread shows of a check, whichever editor the lesson uses. */
type TrialParts = {
    verdict: string;
    diagnostics: string;
    flightRecord?: string;
    pending: boolean;
    completed: boolean;
};

const IDLE_TEXT = 'Выполните задание на рабочем листе и нажмите «Проверить и запустить».';
const DRAFT_NOTE = 'Черновик этого урока сохраняется при переходах между вкладками.';

function renderHeading(ctx: BookContext): string {
    return `<h1 class="book-title book-title--sm" id="guide-lesson-title">${escapeHtml(ctx.source.lesson.title)}</h1>
        <span class="book-rule" aria-hidden="true"></span>`;
}

/** The sheet the student works on: the editor or the workspace, with the actions that belong to it right under it. */
function renderBench(options: { label: string; body: string; actions: string; status: string; plain?: boolean }): string {
    return `<section class="book-bench" aria-label="Рабочий лист">
        <header class="book-bench__bar"><h2>Рабочий лист</h2><span>${escapeHtml(options.label)}</span></header>
        <div class="book-bench__body${options.plain ? ' book-bench__body--form' : ''}">${options.body}</div>
        <footer class="book-bench__actions">${options.actions}${options.status}</footer>
    </section>`;
}

/** Hint, ready solution and references: quiet rows under the bench, closed until the student asks. */
function renderHelp(items: string[]): string {
    return items.length ? `<div class="book-help">${items.join('')}</div>` : '';
}

function helpFold(title: string, body: string): string {
    return `<details><summary>${escapeHtml(title)}</summary>${body}</details>`;
}

function helpLinks(links: GuideTextLesson['links']): string[] {
    return links.map(link => `<button type="button" class="book-help__row" data-guide-query="${escapeHtml(link.query)}">${escapeHtml(link.label)}</button>`);
}

/** Page 1 of the practice spread for a text lesson: the task and the sheet to work on (code, or answers for an inspection). */
export function renderCodeTaskPage(ctx: BookContext): string {
    const { source } = ctx;
    const lesson = source.lesson as GuideTextLesson;
    const inspect = source.mode === 'inspect';
    const bench = renderBench({
        label: inspect ? 'Осмотр' : source.language === 'python' ? 'Python' : 'Lua',
        plain: inspect,
        body: inspect
            ? renderInspectionQuestions()
            : '<div id="mission-guide-monaco-preview-host" class="guide-monaco-preview-host"><div class="guide-monaco-preview__placeholder">Загружаю редактор…</div></div>',
        actions: `<button type="button" class="btn-primary" data-guide-text-check>${inspect ? 'Проверить наблюдение' : 'Проверить и запустить'}</button>
            ${inspect ? '' : '<button type="button" class="btn-secondary" data-guide-text-starter>Вернуть заготовку</button><button type="button" class="btn-secondary" data-guide-text-undo hidden>Отменить замену</button>'}
            <button type="button" class="btn-secondary book-ghost" data-guide-text-reset>Сбросить проверку</button>`,
        status: `<p class="book-bench__status" role="status" data-guide-draft-status>${DRAFT_NOTE}</p>`
    });
    return page('left', ctx.head, ctx.pages[0], `
        ${renderHeading(ctx)}
        <p class="book-text book-task">${renderInline(lesson.goal)}</p>
        <p class="book-note">${escapeHtml(practiceNote(source.language, lesson))}</p>
        ${renderTerrainPrep(lesson)}
        ${bench}
        ${renderHelp([
            source.hint ? helpFold('Подсказка', `<p>${renderInline(source.hint)}</p>`) : '',
            ...helpLinks(lesson.links)
        ].filter(Boolean))}
        ${renderRunBanner(source.language, lesson.id)}`);
}

/** What to build, in order. A lesson without written steps shows the chain of blocks it needs. */
function renderRecipe(lesson: BlocklyView['lesson']): string {
    const steps = blocklyPracticeSteps(lesson);
    return `<section class="book-recipe" aria-labelledby="book-recipe-title"><h2 class="book-label" id="book-recipe-title">Что собрать</h2>
        ${steps.length ? `<ol>${steps.map(step => `<li>${renderInline(step)}</li>`).join('')}</ol>` : renderTargetRoute(lesson)}</section>`;
}

/** Page 1 of the practice spread for a Blockly assignment: the task, the recipe and the workspace. */
export function renderBlocksTaskPage(ctx: BookContext, view: BlocklyView): string {
    const { lesson, hasChecked, hasWorkspaceContent, blocklyPreviewActive, statusLine } = view;
    const bench = renderBench({
        label: 'Blockly',
        body: `<div id="mission-guide-blockly-preview-host" class="guide-blockly-preview-host ${blocklyPreviewActive ? 'is-active' : ''}">
            ${blocklyPreviewActive ? '' : '<div class="guide-blockly-preview__placeholder"><p>Откройте редактор и соедините блоки сверху вниз. Текущая программа останется в рабочей области.</p><button type="button" class="btn-primary" data-guide-open-editor>Открыть редактор Blockly</button></div>'}
        </div>`,
        actions: `<button type="button" class="btn-primary" data-guide-check="${escapeHtml(lesson.id)}">Проверить и запустить</button>
            <button type="button" class="btn-secondary" data-guide-launch="${hasChecked ? 'checked' : 'unchecked'}" ${hasWorkspaceContent ? '' : 'disabled'}>Перезапустить сцену</button>
            <button type="button" class="btn-secondary book-ghost" data-guide-reset="${escapeHtml(lesson.id)}">Сбросить проверку</button>`,
        status: `<p class="book-bench__status" role="status">${escapeHtml(statusLine)}</p>`
    });
    return page('left', ctx.head, ctx.pages[0], `
        ${renderHeading(ctx)}
        <p class="book-text book-task">${renderInline(lesson.goal)}</p>
        ${renderRecipe(lesson)}
        ${bench}
        ${renderHelp([
            lesson.builderHint ? helpFold('Подсказка', `<p>${renderInline(lesson.builderHint)}</p>`) : '',
            helpFold('Готовое решение', `<p>Сначала попробуйте собрать сами. Загрузка решения заменит текущие блоки в редакторе.</p><button type="button" class="btn-secondary btn--sm" data-guide-fill="${escapeHtml(lesson.id)}">Заменить блоки решением</button>`),
            '<button type="button" class="book-help__row" data-guide-open-editor-fallback>Открыть во весь экран</button>'
        ].filter(Boolean))}
        ${renderRunBanner(view.language, lesson.id)}`);
}

/** Page 2 of the practice spread: the scene and the result of the check. */
function renderTrialPage(ctx: BookContext, parts: TrialParts): string {
    const { source } = ctx;
    const { verdict, diagnostics, flightRecord, pending, completed } = parts;
    return page('right', ctx.book.chapter, ctx.pages[1], `
        <figure class="book-figure">
            <div id="mission-guide-scene-preview-host" class="guide-scene-preview-host book-scene is-active"></div>
            <figcaption class="book-caption"><b>Рис. ${source.number}б.</b> Дрон в симуляторе</figcaption>
        </figure>
        <section class="book-trial" aria-label="Результат проверки">
            ${verdict}
            ${flightRecord ? `<details class="book-fold"><summary>Запись полёта</summary>${flightRecord}</details>` : ''}
            <div class="guide-diagnostics" id="diagnostics-container">${diagnostics}</div>
        </section>
        ${completed ? `<div class="book-done"><div class="book-stamp is-set" aria-hidden="true"><span>Пройдено</span></div><div class="book-done__next"><p class="book-text">${escapeHtml(ctx.nav.note)}</p>${ctx.nav.next}</div></div>` : ''}
        <div class="book-turn">
            <button type="button" class="btn-secondary book-ghost" data-book-step="demo" ${pending ? 'disabled' : ''}><span aria-hidden="true">←</span> К демонстрации</button>
            ${pending ? '<button type="button" class="btn-primary" data-walkthrough-cancel>Остановить проверку</button>' : ''}
        </div>`);
}

export function renderCodeTrialPage(ctx: BookContext, completed: boolean): string {
    return renderTrialPage(ctx, { ...renderTextCheckParts(ctx.source.language, ctx.source.lesson as GuideTextLesson, IDLE_TEXT), completed });
}

export function renderBlocksTrialPage(ctx: BookContext, view: BlocklyView): string {
    const { lesson, runtimeResult, hasChecked, evaluation, launchedWithWarnings, previewActive, hasWorkspaceContent, checking, language, isCompleted } = view;
    const { verdict, diagnostics } = renderCheckParts({
        language, lessonId: lesson.id, hasChecked, solved: Boolean(runtimeResult?.solved),
        diagnostics: runtimeResult?.diagnostics || evaluation.diagnostics, launchedWithWarnings, previewActive,
        hasWorkspaceContent, expectedOutcome: lesson.expectedOutcome, pending: checking, idleText: IDLE_TEXT
    });
    return renderTrialPage(ctx, { verdict, diagnostics, pending: checking, completed: isCompleted });
}
