import { renderPracticeBrief, renderObservation } from './render/learning.js';
import type { ScriptLanguage } from '../api-docs/sections.js';
import { evaluateLesson } from './evaluation/index.js';
import { isMissionGuideScenePreviewActive } from './support/scene-preview.js';
import { isMissionGuideBlocklyPreviewActive } from './support/blockly-preview.js';
import { extractMissionGuideSequence, serializeWorkspaceXml, getMainBlocklyWorkspace } from '../../editor/index.js';
import {
    getActiveChapter,
    getActivePortalPage,
    getActiveGuideStep,
    getActiveLesson,
    getLessonBanner,
    isLessonCompleted,
    isLessonChecked,
    getNextLesson
} from './state.js';
import type { GuideLessonState } from './types.js';
import {
    escapeHtml,
    renderRunBanner,
    renderInline,
    renderLessonSteps,
    renderTargetRoute
} from './render/support.js';
import { renderLessonTheory } from './render/sections.js';
import { renderCheckStep } from './render/check-step.js';
import { renderPortalIntro } from './render/portal.js';

export function renderGuide(state: GuideLessonState, language: ScriptLanguage): string {
    const activePage = getActivePortalPage(language);
    const lesson = getActiveLesson(state, language);
    const activeChapter = getActiveChapter(state, language);
    const mainWorkspace = getMainBlocklyWorkspace();
    const sequenceIds = mainWorkspace ? extractMissionGuideSequence(mainWorkspace) : [];
    const evaluation = evaluateLesson(
        lesson,
        sequenceIds,
        mainWorkspace ? serializeWorkspaceXml(mainWorkspace) : null
    );
    const hasChecked = isLessonChecked(language, lesson.id);
    const previewActive = isMissionGuideScenePreviewActive();
    const blocklyPreviewActive = isMissionGuideBlocklyPreviewActive();
    const banner = getLessonBanner(language, lesson.id);
    const launchedWithWarnings = hasChecked && !evaluation.solved && banner?.kind === 'warning' && previewActive;
    const nextLesson = getNextLesson(state, lesson.id);
    const hasNext = Boolean(nextLesson);
    const canOpenNext = Boolean(nextLesson) && isLessonCompleted(language, lesson.id);
    const isCompleted = isLessonCompleted(language, lesson.id);
    const hasWorkspaceContent = sequenceIds.length > 0;
    const lessonIndex = state.lessons.findIndex((item) => item.id === lesson.id);
    const buildStatusLabel = hasWorkspaceContent ? `${sequenceIds.length} шт.` : 'Пусто';
    const validationStatusLabel = !hasChecked
        ? 'Еще не запускалась'
        : evaluation.solved
            ? 'Проверка пройдена'
            : `Найдено замечаний: ${evaluation.diagnostics.length}`;
    const launchStatusLabel = previewActive
        ? 'Сцена открыта'
        : hasWorkspaceContent
            ? 'Запустится после проверки'
            : 'Нужна цепочка';
    const activeStep = getActiveGuideStep(language, lesson.id);

    const theoryStep = `
        ${renderLessonTheory(lesson, activeChapter)}
        <div class="guide-actions guide-actions--primary">
            <button type="button" class="guide-primary-action" data-guide-step="build">Дальше: собрать цепочку</button>
        </div>
    `;

    const buildStep = `
        <section class="guide-panel-card guide-panel-card--workspace">
            <div class="guide-panel-card__top">
                <div>
                    <div class="guide-panel-card__title">Практика урока</div>
                    <div class="guide-panel-card__text">Соберите цепочку в редакторе Blockly ниже. Проверка сразу запускает сцену.</div>
                </div>
                <div class="guide-panel-card__badge">Сборка</div>
            </div>
            ${renderPracticeBrief(lesson)}
            <div class="guide-workspace-health">
                <div class="guide-workspace-health__item">
                    <div class="guide-workspace-health__label">Сборка</div>
                    <div class="guide-workspace-health__value">${escapeHtml(buildStatusLabel)}</div>
                </div>
                <div class="guide-workspace-health__item">
                    <div class="guide-workspace-health__label">Проверка</div>
                    <div class="guide-workspace-health__value">${escapeHtml(validationStatusLabel)}</div>
                </div>
                <div class="guide-workspace-health__item">
                    <div class="guide-workspace-health__label">Запуск</div>
                    <div class="guide-workspace-health__value">${escapeHtml(launchStatusLabel)}</div>
                </div>
            </div>

            <div class="guide-build-target">
                <div class="guide-lesson-page__meta-label">Что собрать</div>
                ${renderTargetRoute(lesson)}
            </div>

            <div id="mission-guide-blockly-preview-host" class="guide-blockly-preview-host ${blocklyPreviewActive ? 'is-active' : ''}">
                ${blocklyPreviewActive ? '' : '<div class="guide-blockly-preview__placeholder"><p>Откройте редактор и соедините блоки сверху вниз. Текущая программа останется в рабочей области.</p><button type="button" class="guide-primary-action" data-guide-open-editor>Открыть редактор Blockly</button></div>'}
            </div>

            <div class="guide-actions guide-actions--primary">
                <button type="button" class="guide-primary-action" data-guide-check="${escapeHtml(lesson.id)}">Проверить и запустить</button>
                <button type="button" class="guide-lesson__action" data-guide-launch="${hasChecked ? 'checked' : 'unchecked'}" ${hasWorkspaceContent ? '' : 'disabled'}>Перезапустить сцену</button>
                <button type="button" class="guide-lesson__action" data-guide-reset="${escapeHtml(lesson.id)}">Сбросить проверку</button>
            </div>
            <details class="guide-learning-disclosure guide-solution-help"><summary>Посмотреть готовое решение</summary><p>Сначала попробуйте собрать программу самостоятельно. Загрузка решения заменит текущие блоки в редакторе.</p><button type="button" class="guide-lesson__action" data-guide-fill="${escapeHtml(lesson.id)}">Заменить блоки готовым решением</button></details>
            <div class="guide-panel-note">
                <a href="#" data-guide-open-editor-fallback>Открыть в полноэкранном редакторе вместо этого</a>
            </div>
            ${renderRunBanner(language, lesson.id)}
        </section>
    `;

    const checkStep = renderObservation(lesson, hasChecked && evaluation.solved) + renderCheckStep({
        language,
        lessonId: lesson.id,
        hasChecked,
        solved: evaluation.solved,
        diagnostics: evaluation.diagnostics,
        launchedWithWarnings,
        previewActive,
        hasWorkspaceContent
    });

    const stepInner = activeStep === 'theory' ? theoryStep : activeStep === 'build' ? buildStep : checkStep;
    const stepContent = `
        <div id="guide-panel-${activeStep}" role="tabpanel" aria-labelledby="guide-tab-${activeStep}" tabindex="0">
            ${stepInner}
        </div>
    `;

    return `
        <div class="guide-modal-layout" data-guide-language="${language}" data-guide-portal-page="${activePage}">
            ${activePage === 'intro'
            ? renderPortalIntro(state, language)
            : `
            <section class="guide-lesson-page academy-detail">
                <div class="guide-lesson-page__header">
                    <div class="guide-lesson-page__header-copy">
                        <div class="guide-lesson-page__badge">${escapeHtml(lesson.badge)}</div>
                        <h1 class="guide-lesson-page__title">${escapeHtml(lesson.title)}</h1>
                        <div class="guide-lesson-page__summary">${renderInline(lesson.summary)}</div>
                    </div>
                    <div class="guide-lesson-page__header-actions">
                        <div class="guide-lesson-page__header-pill">Урок ${lessonIndex + 1} из ${state.lessons.length}</div>
                        <button type="button" class="guide-lesson__action" data-guide-portal-page="intro">← Все уроки</button>
                    </div>
                </div>

                ${renderLessonSteps(activeStep, hasChecked, evaluation.solved)}

                ${stepContent}

                ${isCompleted
                ? `<section class="guide-lesson-footer">
                    <div class="guide-panel-note">
                        ${hasNext
                    ? 'Урок принят. Можно перейти к следующему шагу или вернуться на главную страницу курса.'
                    : 'Урок принят. Это последний шаг текущего маршрута, можно вернуться на главную страницу курса.'}
                    </div>
                    <div class="guide-lesson-footer__actions">
                        <button type="button" class="guide-lesson__action" data-guide-portal-page="intro">На главную</button>
                        ${hasNext && canOpenNext
                    ? '<button type="button" class="guide-primary-action" data-guide-nav="next">Следующий урок</button>'
                    : ''}
                    </div>
                </section>`
                : ''}
            </section>
            `}
        </div>
    `;
}
