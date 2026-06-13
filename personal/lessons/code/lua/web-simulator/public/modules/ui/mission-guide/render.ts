import type { ScriptLanguage } from '../api-docs/sections.js';
import { evaluateLesson } from './evaluation/index.js';
import { isMissionGuideScenePreviewActive } from './support/scene-preview.js';
import {
    getActivePortalPage,
    getActiveLesson,
    getLessonBanner,
    getLessonSequence,
    getLessonWorkspaceState,
    isLessonCompleted,
    isLessonChecked,
    getNextLesson
} from './state.js';
import type { GuideLessonState } from './types.js';
import {
    escapeHtml,
    renderCheckSummary,
    renderResultHero,
    renderRunBanner,
    renderDiagnosticCard
} from './render/support.js';
import { renderLessonTheory, renderPortalIntro } from './render/sections.js';

export function renderGuide(state: GuideLessonState, language: ScriptLanguage): string {
    const activePage = getActivePortalPage(language);
    const lesson = getActiveLesson(state, language);
    const sequenceIds = getLessonSequence(language, lesson.id);
    const evaluation = evaluateLesson(lesson, sequenceIds, getLessonWorkspaceState(language, lesson.id));
    const hasChecked = isLessonChecked(language, lesson.id);
    const previewActive = isMissionGuideScenePreviewActive();
    const banner = getLessonBanner(language, lesson.id);
    const launchedWithWarnings = hasChecked && !evaluation.solved && banner?.kind === 'warning' && previewActive;
    const nextLesson = getNextLesson(state, lesson.id);
    const hasNext = Boolean(nextLesson);
    const canOpenNext = Boolean(nextLesson) && isLessonCompleted(language, lesson.id);
    const isCompleted = isLessonCompleted(language, lesson.id);
    const hasWorkspaceContent = sequenceIds.length > 0;
    const lessonIndex = state.lessons.findIndex((item) => item.id === lesson.id);
    const buildStatusLabel = hasWorkspaceContent ? `${sequenceIds.length} блоков` : 'Пусто';
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

    return `
        <div class="guide-modal-layout" data-guide-language="${language}" data-guide-portal-page="${activePage}">
            ${activePage === 'intro'
            ? renderPortalIntro(state, language)
            : `
            <section class="guide-lesson-page">
                <div class="guide-lesson-page__header">
                    <div class="guide-lesson-page__header-copy">
                        <div class="guide-lesson-page__badge">${escapeHtml(lesson.badge)}</div>
                        <div class="guide-lesson-page__title">${escapeHtml(lesson.title)}</div>
                        <div class="guide-lesson-page__summary">${escapeHtml(lesson.summary)}</div>
                    </div>
                    <div class="guide-lesson-page__header-actions">
                        <div class="guide-lesson-page__header-pill">Урок ${lessonIndex + 1} из ${state.lessons.length}</div>
                        <button type="button" class="guide-lesson__action" data-guide-portal-page="intro">На основную страницу</button>
                    </div>
                </div>

                ${renderLessonTheory(lesson)}

                <div class="guide-workbench-layout">
                    <div class="guide-workbench-layout__main">
                        <section class="guide-panel-card guide-panel-card--workspace">
                            <div class="guide-panel-card__top">
                                <div>
                                    <div class="guide-panel-card__title">Практика урока</div>
                                    <div class="guide-panel-card__text">Соберите цепочку в Blockly. Проверка сразу запускает сцену.</div>
                                </div>
                                <div class="guide-panel-card__badge">Сборка</div>
                            </div>
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
                            <div class="guide-blockly-shell">
                                <div id="blocklyDiv" class="guide-blockly-stage"></div>
                            </div>
                            <div class="guide-actions guide-actions--primary">
                                <button type="button" class="guide-primary-action" data-guide-check="${escapeHtml(lesson.id)}">Проверить и запустить</button>
                                <button type="button" class="guide-lesson__action" data-guide-launch="${hasChecked ? 'checked' : 'unchecked'}" ${hasWorkspaceContent ? '' : 'disabled'}>Перезапустить сцену</button>
                                <button type="button" class="guide-lesson__action" data-guide-reset="${escapeHtml(lesson.id)}">Очистить страницу</button>
                            </div>
                            ${renderRunBanner(language, lesson.id)}
                        </section>

                        <section class="guide-panel-card guide-panel-card--result">
                            <div class="guide-panel-card__top">
                                <div>
                                    <div class="guide-panel-card__title">Проверка и разбор</div>
                                    <div class="guide-panel-card__text">Короткий вердикт и список того, что исправить.</div>
                                </div>
                                <div class="guide-panel-card__badge">Фидбек</div>
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
                                    <div class="guide-panel-card__text">Показывает поведение текущего скрипта и ошибки рантайма.</div>
                                </div>
                                <div class="guide-panel-card__badge">3D</div>
                            </div>
                            <div id="mission-guide-scene-preview-host" class="guide-scene-preview-host ${previewActive ? 'is-active' : ''}">
                                ${previewActive ? '' : '<div class="guide-scene-preview__placeholder">Нажмите "Проверить и запустить", чтобы сразу увидеть сцену.</div>'}
                            </div>
                        </section>
                    </div>
                </div>

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
