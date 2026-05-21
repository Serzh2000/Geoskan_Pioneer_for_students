import type { ScriptLanguage } from '../api-docs/sections.js';
import { evaluateLesson } from './evaluation/index.js';
import { isMissionGuideScenePreviewActive } from './support/scene-preview.js';
import {
    getActivePortalPage,
    getActiveLesson,
    getCompletedLessonsCount,
    getFirstUnlockedLesson,
    getLessonBanner,
    getLessonProgressState,
    getLessonSequence,
    getLessonWorkspaceState,
    isLessonCompleted,
    isLessonChecked,
    getNextLesson,
    getPreviousLesson
} from './state.js';
import type { GuideLessonState } from './types.js';
import {
    escapeHtml,
    renderCheckSummary,
    renderGuideSelectors,
    renderPageTabs,
    renderResultHero,
    renderRunBanner,
    renderDiagnosticCard
} from './render/support.js';
import { renderLessonOverview, renderLessonTheory, renderPortalIntro } from './render/sections.js';

export function renderGuide(state: GuideLessonState, language: ScriptLanguage): string {
    const activePage = getActivePortalPage(language);
    const lesson = getActiveLesson(state, language);
    const sequenceIds = getLessonSequence(language, lesson.id);
    const evaluation = evaluateLesson(lesson, sequenceIds, getLessonWorkspaceState(language, lesson.id));
    const hasChecked = isLessonChecked(language, lesson.id);
    const previewActive = isMissionGuideScenePreviewActive();
    const banner = getLessonBanner(language, lesson.id);
    const launchedWithWarnings = hasChecked && !evaluation.solved && banner?.kind === 'warning' && previewActive;
    const completedCount = getCompletedLessonsCount(state, language);
    const previousLesson = getPreviousLesson(state, lesson.id);
    const nextLesson = getNextLesson(state, lesson.id);
    const hasPrev = Boolean(previousLesson);
    const hasNext = Boolean(nextLesson);
    const canOpenNext = Boolean(nextLesson) && isLessonCompleted(language, lesson.id);
    const portalProgress = `${completedCount} / ${state.lessons.length}`;
    const progressPercent = Math.round((completedCount / Math.max(state.lessons.length, 1)) * 100);
    const lessonIndex = state.lessons.findIndex((item) => item.id === lesson.id);
    const lessonProgressState = getLessonProgressState(state, language, lesson.id);
    const lessonStatusLabel = lessonProgressState === 'completed'
        ? 'Выполнен'
        : lessonProgressState === 'in_progress'
            ? 'В процессе'
            : lessonProgressState === 'available'
                ? 'Доступен'
                : 'Закрыт';

    return `
        <div class="guide-modal-layout" data-guide-language="${language}">
            <section class="guide-hero">
                <div class="guide-hero__eyebrow">${escapeHtml(state.heroEyebrow)}</div>
                <div class="guide-hero__title">${escapeHtml(state.heroTitle)}</div>
                <div class="guide-hero__text">Портал ведет по линейному сценарию: вводная, цель урока, теория, практика, проверка и только потом переход дальше.</div>
                <div class="guide-hero__flow">Маршрут: вводная -> страница урока -> проверка -> кнопка «Далее»</div>
                <div class="guide-hero__progress">Пройдено уроков: ${portalProgress}</div>
            </section>

            <section class="guide-portal-switcher">
                <button type="button" class="guide-lesson__action ${activePage === 'intro' ? 'is-active' : ''}" data-guide-portal-page="intro">Вводная</button>
                <button type="button" class="guide-lesson__action ${activePage === 'lesson' ? 'is-active' : ''}" data-guide-portal-page="lesson">Уроки</button>
            </section>

            ${activePage === 'intro'
            ? renderPortalIntro(state, language)
            : `
            ${renderGuideSelectors(state, language)}
            ${renderPageTabs(state, language)}
            <section class="guide-lesson-page">
                <div class="guide-lesson-page__header">
                    <div>
                        <div class="guide-lesson-page__badge">${escapeHtml(lesson.badge)}</div>
                        <div class="guide-lesson-page__title">${escapeHtml(lesson.title)}</div>
                        <div class="guide-lesson-page__summary">${escapeHtml(lesson.summary)}</div>
                    </div>
                </div>

                ${renderLessonOverview(
                    lessonIndex + 1,
                    state.lessons.length,
                    lessonStatusLabel,
                    lesson.goal,
                    lesson.builderHint,
                    progressPercent,
                    completedCount
                )}

                ${renderLessonTheory(lesson)}

                <div class="guide-workbench-layout">
                    <div class="guide-workbench-layout__main">
                        <section class="guide-panel-card guide-panel-card--workspace">
                            <div class="guide-panel-card__top">
                                <div>
                                    <div class="guide-panel-card__title">Практика урока</div>
                                    <div class="guide-panel-card__text">Соберите решение в Blockly, затем запустите его и сразу сравните с ожидаемым результатом.</div>
                                </div>
                                <div class="guide-panel-card__badge">Шаг 1</div>
                            </div>
                            <div class="guide-blockly-shell">
                                <div id="blocklyDiv" class="guide-blockly-stage"></div>
                            </div>
                            <div class="guide-actions guide-actions--primary">
                                <button type="button" class="guide-primary-action" data-guide-check="${escapeHtml(lesson.id)}">Проверить и запустить</button>
                                <button type="button" class="guide-lesson__action" data-guide-reset="${escapeHtml(lesson.id)}">Очистить страницу</button>
                            </div>
                            ${renderRunBanner(language, lesson.id)}
                        </section>

                        <section class="guide-panel-card guide-panel-card--result">
                            <div class="guide-panel-card__top">
                                <div>
                                    <div class="guide-panel-card__title">Проверка и разбор</div>
                                    <div class="guide-panel-card__text">После запуска здесь остается понятный статус и список замечаний, если урок еще не завершен.</div>
                                </div>
                                <div class="guide-panel-card__badge">Шаг 2</div>
                            </div>
                            ${renderResultHero(hasChecked, evaluation.solved, evaluation.diagnostics.length, launchedWithWarnings)}
                            <div id="guide-check-summary">
                                ${renderCheckSummary(hasChecked, evaluation.solved, evaluation.diagnostics.length, launchedWithWarnings)}
                            </div>
                            <div class="guide-diagnostics" id="diagnostics-container">
                                ${hasChecked
                ? evaluation.diagnostics.map(renderDiagnosticCard).join('')
                : '<div class="guide-empty-state">Пока ничего не показываем, чтобы не подсказывать решение заранее.</div>'}
                            </div>
                        </section>
                    </div>

                    <div class="guide-workbench-layout__scene">
                        <section class="guide-panel-card guide-panel-card--scene">
                            <div class="guide-panel-card__top">
                                <div>
                                    <div class="guide-panel-card__title">Живая сцена</div>
                                    <div class="guide-panel-card__text">Симуляция остается на странице урока и подтверждает, что теория и практика действительно связаны.</div>
                                </div>
                                <div class="guide-panel-card__badge">3D</div>
                            </div>
                            <div id="mission-guide-scene-preview-host" class="guide-scene-preview-host ${previewActive ? 'is-active' : ''}">
                                ${previewActive ? '' : '<div class="guide-scene-preview__placeholder">Нажмите "Проверить и запустить", чтобы открыть live-просмотр симуляции в этом окне.</div>'}
                            </div>
                        </section>
                    </div>
                </div>

                <section class="guide-lesson-footer">
                    <div class="guide-panel-note">
                        ${hasNext
                ? canOpenNext
                    ? 'Урок завершен. Можно переходить дальше по маршруту.'
                    : 'Сначала завершите этот урок успешно. После статуса «выполнен» кнопка «Далее» станет активной.'
                : 'Это финальный урок текущего маршрута.'}
                    </div>
                    <div class="guide-lesson-footer__actions">
                        <button type="button" class="guide-lesson__action" data-guide-nav="prev" ${hasPrev ? '' : 'disabled'}>Назад</button>
                        <button type="button" class="guide-primary-action" data-guide-nav="next" ${hasNext && canOpenNext ? '' : 'disabled'}>Далее</button>
                    </div>
                </section>
            </section>
            `}
        </div>
    `;
}
