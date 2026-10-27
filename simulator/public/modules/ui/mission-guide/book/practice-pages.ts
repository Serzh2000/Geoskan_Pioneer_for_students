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

function renderHint(hint: string): string {
    return hint ? `<details class="book-fold"><summary>Подсказка</summary><p>${renderInline(hint)}</p></details>` : '';
}

function renderLinks(links: GuideTextLesson['links']): string {
    return links.length
        ? `<p class="book-links">${links.map(link => `<button type="button" class="book-link" data-guide-query="${escapeHtml(link.query)}">${escapeHtml(link.label)}</button>`).join('')}</p>`
        : '';
}

function renderHeading(ctx: BookContext): string {
    return `<p class="book-kicker">${escapeHtml(ctx.source.label)} · Практика</p>
        <h2 class="book-title book-title--sm">${escapeHtml(ctx.source.lesson.title)}</h2>
        <span class="book-rule" aria-hidden="true"></span>`;
}

/** Page 1 of the practice spread for a text lesson: the task and the sheet to work on (code, or answers for an inspection). */
export function renderCodeTaskPage(ctx: BookContext): string {
    const { source } = ctx;
    const lesson = source.lesson as GuideTextLesson;
    const inspect = source.mode === 'inspect';
    const sheet = inspect
        ? renderInspectionQuestions()
        : `<div class="book-code">
            <div class="book-code__bar"><b>Рабочий лист</b><span>${source.language === 'python' ? 'Python' : 'Lua'}</span></div>
            <div id="mission-guide-monaco-preview-host" class="guide-monaco-preview-host"><div class="guide-monaco-preview__placeholder">Загружаю редактор…</div></div>
        </div>`;
    return page('left', ctx.head, ctx.pages[0], `
        ${renderHeading(ctx)}
        <p class="book-text book-task">${renderInline(lesson.goal)}</p>
        <p class="book-note">${escapeHtml(practiceNote(source.language, lesson))}</p>
        ${renderTerrainPrep(lesson)}
        ${sheet}
        <div class="book-actions">
            <button type="button" class="btn-primary" data-guide-text-check>${inspect ? 'Проверить наблюдение' : 'Проверить и запустить'}</button>
            ${inspect ? '' : '<button type="button" class="btn-secondary" data-guide-text-starter>Вернуть заготовку</button><button type="button" class="btn-secondary" data-guide-text-undo hidden>Отменить замену</button>'}
            <button type="button" class="btn-secondary book-ghost" data-guide-text-reset>Сбросить проверку</button>
        </div>
        ${renderHint(source.hint)}
        ${renderLinks(lesson.links)}
        <p class="book-status" role="status" data-guide-draft-status>Черновик этого урока сохраняется при переходах между вкладками.</p>
        ${renderRunBanner(source.language, lesson.id)}`);
}

/** Page 1 of the practice spread for a Blockly assignment: the task, the steps and the workspace. */
export function renderBlocksTaskPage(ctx: BookContext, view: BlocklyView): string {
    const { lesson, hasChecked, hasWorkspaceContent, blocklyPreviewActive, statusLine } = view;
    const steps = blocklyPracticeSteps(lesson);
    return page('left', ctx.head, ctx.pages[0], `
        ${renderHeading(ctx)}
        <p class="book-text book-task">${renderInline(lesson.goal)}</p>
        ${steps.length ? `<ol class="book-steps" aria-label="Порядок сборки">${steps.map(step => `<li>${renderInline(step)}</li>`).join('')}</ol>` : `<div class="guide-build-target"><h2>Что собрать</h2>${renderTargetRoute(lesson)}</div>`}
        <p class="book-note">Соберите цепочку в редакторе Blockly. Проверка сразу запускает сцену.</p>
        <div class="book-code book-code--blocks">
            <div class="book-code__bar"><b>Рабочий лист</b><span>Blockly</span></div>
            <div id="mission-guide-blockly-preview-host" class="guide-blockly-preview-host ${blocklyPreviewActive ? 'is-active' : ''}">
                ${blocklyPreviewActive ? '' : '<div class="guide-blockly-preview__placeholder"><p>Откройте редактор и соедините блоки сверху вниз. Текущая программа останется в рабочей области.</p><button type="button" class="btn-primary" data-guide-open-editor>Открыть редактор Blockly</button></div>'}
            </div>
        </div>
        <div class="book-actions">
            <button type="button" class="btn-primary" data-guide-check="${escapeHtml(lesson.id)}">Проверить и запустить</button>
            <button type="button" class="btn-secondary" data-guide-launch="${hasChecked ? 'checked' : 'unchecked'}" ${hasWorkspaceContent ? '' : 'disabled'}>Перезапустить сцену</button>
            <button type="button" class="btn-secondary book-ghost" data-guide-reset="${escapeHtml(lesson.id)}">Сбросить проверку</button>
        </div>
        ${renderHint(lesson.builderHint)}
        <details class="book-fold"><summary>Посмотреть готовое решение</summary><p>Сначала попробуйте собрать программу самостоятельно. Загрузка решения заменит текущие блоки в редакторе.</p><button type="button" class="btn-secondary btn--sm" data-guide-fill="${escapeHtml(lesson.id)}">Заменить блоки готовым решением</button></details>
        <p class="book-links"><button type="button" class="book-link" data-guide-open-editor-fallback>Открыть в полноэкранном редакторе</button></p>
        <p class="book-status" role="status">${escapeHtml(statusLine)}</p>
        ${renderRunBanner(view.language, lesson.id)}`);
}

/** Page 2 of the practice spread: the scene, the trial and its result. */
function renderTrialPage(ctx: BookContext, parts: TrialParts): string {
    const { source } = ctx;
    const { verdict, diagnostics, flightRecord, pending, completed } = parts;
    return page('right', ctx.book.chapter, ctx.pages[1], `
        <figure class="book-figure">
            <div id="mission-guide-scene-preview-host" class="guide-scene-preview-host book-scene is-active"></div>
            <figcaption class="book-caption"><b>Рис. ${source.number}б.</b> Дрон в симуляторе</figcaption>
        </figure>
        <section class="book-trial" aria-label="Испытание"><h2 class="book-label">Испытание</h2>
            <p class="book-text">${renderInline(source.lesson.expectedOutcome)}</p>
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
    return renderTrialPage(ctx, { ...renderTextCheckParts(ctx.source.language, ctx.source.lesson as GuideTextLesson), completed });
}

export function renderBlocksTrialPage(ctx: BookContext, view: BlocklyView): string {
    const { lesson, runtimeResult, hasChecked, evaluation, launchedWithWarnings, previewActive, hasWorkspaceContent, checking, language, isCompleted } = view;
    const { verdict, diagnostics } = renderCheckParts({
        language, lessonId: lesson.id, hasChecked, solved: Boolean(runtimeResult?.solved),
        diagnostics: runtimeResult?.diagnostics || evaluation.diagnostics, launchedWithWarnings, previewActive,
        hasWorkspaceContent, expectedOutcome: lesson.expectedOutcome, pending: checking
    });
    return renderTrialPage(ctx, { verdict, diagnostics, pending: checking, completed: isCompleted });
}
