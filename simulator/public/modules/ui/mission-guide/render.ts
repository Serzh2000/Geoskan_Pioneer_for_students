import { blocklyPracticeSteps } from './render/blockly-copy.js';
import { renderPracticeBrief } from './render/learning.js';
import { renderWalkthrough } from './render/walkthrough.js';
import type { ScriptLanguage } from '../api-docs/sections.js';
import type { GuideLessonState } from './types.js';
import {
    escapeHtml,
    renderRunBanner,
    renderTargetRoute
} from './render/support.js';
import { renderCheckStep } from './render/check-step.js';
import { renderLessonHeader } from './render/shared.js';
import { getBlocklyView } from './render/blockly-view.js';
import { renderBlocklyBook } from './book/blockly.js';
import { renderBookSwitch } from './book/render.js';
import { isBookView } from './book/view.js';

export function renderGuide(rawState: GuideLessonState, language: ScriptLanguage): string {
    const view = getBlocklyView(rawState, language);
    if (isBookView()) return renderBlocklyBook(view);
    const { state, lesson, evaluation, source, runtimeResult, hasChecked, previewActive, blocklyPreviewActive, launchedWithWarnings, nextLesson, isCompleted, hasWorkspaceContent, lessonIndex, checking, statusLine } = view;
    const hasNext = Boolean(nextLesson);

    const buildStep = `
        <div class="guide-practice guide-practice--stacked">
            <div class="guide-practice__brief">
                ${renderPracticeBrief(lesson, blocklyPracticeSteps(lesson))}
                <p class="guide-practice__note">Соберите цепочку в редакторе Blockly. Проверка сразу запускает сцену.</p>
                ${blocklyPracticeSteps(lesson).length ? '' : `<div class="guide-build-target"><h2>Что собрать</h2>${renderTargetRoute(lesson)}</div>`}
                <div class="guide-actions">
                    <button type="button" class="btn-primary" data-guide-check="${escapeHtml(lesson.id)}">Проверить и запустить</button>
                    <button type="button" class="btn-secondary" data-guide-launch="${hasChecked ? 'checked' : 'unchecked'}" ${hasWorkspaceContent ? '' : 'disabled'}>Перезапустить сцену</button>
                    <button type="button" class="btn-secondary" data-guide-reset="${escapeHtml(lesson.id)}">Сбросить проверку</button>
                </div>
                <p class="guide-status-line" role="status">${escapeHtml(statusLine)}</p>
                <details class="pk-disclosure"><summary>Посмотреть готовое решение</summary><p>Сначала попробуйте собрать программу самостоятельно. Загрузка решения заменит текущие блоки в редакторе.</p><button type="button" class="btn-secondary btn--sm" data-guide-fill="${escapeHtml(lesson.id)}">Заменить блоки готовым решением</button></details>
                ${renderRunBanner(view.language, lesson.id)}
            </div>
            <div class="guide-practice__work">
                <div id="mission-guide-blockly-preview-host" class="guide-blockly-preview-host pk-device ${blocklyPreviewActive ? 'is-active' : ''}">
                    ${blocklyPreviewActive ? '' : '<div class="guide-blockly-preview__placeholder"><p>Откройте редактор и соедините блоки сверху вниз. Текущая программа останется в рабочей области.</p><button type="button" class="btn-primary" data-guide-open-editor>Открыть редактор Blockly</button></div>'}
                </div>
                <button type="button" class="btn-secondary btn--sm" data-guide-open-editor-fallback>Открыть в полноэкранном редакторе</button>
            </div>
        </div>
    `;

    const checkStep = renderCheckStep({
        language,
        lessonId: lesson.id,
        hasChecked,
        solved: Boolean(runtimeResult?.solved),
        diagnostics: runtimeResult?.diagnostics || evaluation.diagnostics,
        launchedWithWarnings,
        previewActive,
        hasWorkspaceContent,
        expectedOutcome: lesson.expectedOutcome,
        pending: checking
    });

    return `
        <div class="guide-modal-layout" data-guide-language="${language}" data-guide-portal-page="lesson">
            <section class="guide-lesson-page">
                ${renderBookSwitch()}
                ${renderLessonHeader(`${lesson.badge} · урок ${lessonIndex + 1} из ${state.lessons.length}`, lesson.title, isCompleted)}

                ${renderWalkthrough(lesson, language, source, { build: buildStep, check: checkStep, completed: isCompleted, hasPrevious: lessonIndex > 0, lessonNav: {
                    note: hasNext ? 'Можно переходить к следующему уроку.' : 'Все десять практикумов Blockly завершены.',
                    previous: lessonIndex > 0 ? '<button type="button" class="btn-secondary" data-guide-nav="prev">Предыдущий урок</button>' : '',
                    next: nextLesson ? `<button type="button" class="btn-primary" data-guide-nav="next">Дальше: ${escapeHtml(nextLesson.title)}</button>` : ''
                } })}

            </section>
        </div>
    `;
}
