import { isMissionGuideScenePreviewActive } from '../support/scene-preview.js';
import {
    getActiveGuideStep,
    getActiveTextLesson,
    getLastTextEvaluation,
    getNextTextLesson,
    getPreviousTextLesson,
    isLessonChecked,
    isLessonCompleted
} from '../state.js';
import type { GuideDiagnostic, GuideTextLessonState } from '../types.js';
import {
    escapeHtml,
    renderApiFocusItem,
    renderDiagnosticCard,
    renderDocLink,
    renderInline,
    renderLessonSteps,
    renderRunBanner
} from './support.js';
import { renderCheckVerdict } from './results.js';

const DIAGNOSTIC_KIND_RANK: Record<GuideDiagnostic['kind'], number> = {
    error: 0,
    warning: 1,
    info: 2,
    success: 3
};

function renderTextTheoryStep(lesson: GuideTextLessonState['lessons'][number]): string {
    return `
        <section class="guide-lesson-section">
            <div class="guide-lesson-section__header">
                <div class="guide-panel-card__title">Теория урока</div>
                <div class="guide-panel-card__text">Короткая база перед практикой.</div>
            </div>

            <div class="guide-lesson-page__meta">
                <article class="guide-lesson-page__meta-item">
                    <div class="guide-lesson-page__meta-label">Что изучаем</div>
                    <div class="guide-lesson-page__goal">${renderInline(lesson.lessonIntro)}</div>
                </article>
                <article class="guide-lesson-page__meta-item">
                    <div class="guide-lesson-page__meta-label">Ожидаемый результат</div>
                    <div class="guide-lesson-page__goal">${renderInline(lesson.expectedOutcome)}</div>
                </article>
                <article class="guide-lesson-page__meta-item guide-lesson-page__meta-item--wide">
                    <div class="guide-lesson-page__meta-label">Цель</div>
                    <div class="guide-lesson-page__goal">${renderInline(lesson.goal)}</div>
                </article>
                <article class="guide-lesson-page__meta-item guide-lesson-page__meta-item--wide">
                    <div class="guide-lesson-page__meta-label">Что понадобится</div>
                    <div class="guide-api-grid">
                        ${lesson.apiFocus.map(renderApiFocusItem).join('')}
                    </div>
                </article>
                ${lesson.links.length > 0 ? `
                <article class="guide-lesson-page__meta-item guide-lesson-page__meta-item--wide">
                    <div class="guide-lesson-page__meta-label">Где почитать в справочнике</div>
                    <div class="guide-target-route">
                        ${lesson.links.map(renderDocLink).join('')}
                    </div>
                </article>
                ` : ''}
            </div>
        </section>
        <div class="guide-actions guide-actions--primary">
            <button type="button" class="guide-primary-action" data-guide-step="build">Дальше: написать код</button>
        </div>
    `;
}

function renderTextBuildStep(track: 'lua' | 'python', lesson: GuideTextLessonState['lessons'][number]): string {
    return `
        <section class="guide-panel-card guide-panel-card--workspace">
            <div class="guide-panel-card__top">
                <div>
                    <div class="guide-panel-card__title">Практика урока</div>
                    <div class="guide-panel-card__text">Напишите код в редакторе ниже — своими руками, без блоков. Проверка запускает симуляцию и оценивает результат.</div>
                </div>
                <div class="guide-panel-card__badge">${track === 'python' ? 'Python' : 'Lua'}</div>
            </div>
            <div class="guide-panel-note">${renderInline(lesson.builderHint)}</div>
            <div id="mission-guide-monaco-preview-host" class="guide-monaco-preview-host">
                <div class="guide-monaco-preview__placeholder">Загружаю редактор…</div>
            </div>
            <div class="guide-actions guide-actions--primary">
                <button type="button" class="guide-primary-action" data-guide-text-check>Проверить и запустить</button>
                <button type="button" class="guide-lesson__action" data-guide-text-reset>Сбросить проверку</button>
            </div>
            ${renderRunBanner(track, lesson.id)}
        </section>
    `;
}

function renderTextCheckStep(
    track: 'lua' | 'python',
    lesson: GuideTextLessonState['lessons'][number],
    hasChecked: boolean
): string {
    const evaluation = hasChecked ? getLastTextEvaluation(track, lesson.id) : null;
    const solved = evaluation?.solved ?? false;
    const diagnostics = evaluation?.diagnostics ?? [];
    const sortedDiagnostics = [...diagnostics].sort(
        (a, b) => DIAGNOSTIC_KIND_RANK[a.kind] - DIAGNOSTIC_KIND_RANK[b.kind]
    );
    const previewActive = isMissionGuideScenePreviewActive();

    return `
        <div class="guide-workbench-layout">
            <div class="guide-workbench-layout__main">
                <section class="guide-panel-card guide-panel-card--result">
                    <div class="guide-panel-card__top">
                        <div>
                            <div class="guide-panel-card__title">Проверка и разбор</div>
                            <div class="guide-panel-card__text">Короткий вердикт и список того, что исправить.</div>
                        </div>
                        <div class="guide-panel-card__badge">Фидбек</div>
                    </div>
                    ${renderCheckVerdict(hasChecked, solved, diagnostics.length, false)}
                    ${hasChecked ? `
                    <div class="guide-actions guide-actions--primary">
                        <button type="button" class="guide-primary-action" data-guide-step="build">Вернуться к коду</button>
                    </div>
                    ` : ''}
                    <div class="guide-diagnostics" id="diagnostics-container">
                        ${hasChecked ? sortedDiagnostics.map(renderDiagnosticCard).join('') : ''}
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
                        ${previewActive ? '' : '<div class="guide-scene-preview__placeholder">Нажмите "Проверить и запустить" на шаге кода, чтобы увидеть сцену.</div>'}
                    </div>
                </section>
            </div>
        </div>
    `;
}

export function renderTextGuide(state: GuideTextLessonState, track: 'lua' | 'python'): string {
    const lesson = getActiveTextLesson(state, track);
    const activeStep = getActiveGuideStep(track, lesson.id);
    const hasChecked = isLessonChecked(track, lesson.id);
    const isCompleted = isLessonCompleted(track, lesson.id);
    const evaluation = hasChecked ? getLastTextEvaluation(track, lesson.id) : null;
    const solved = evaluation?.solved ?? false;
    const nextLesson = getNextTextLesson(state, lesson.id);
    const previousLesson = getPreviousTextLesson(state, lesson.id);
    const lessonIndex = state.lessons.findIndex((item) => item.id === lesson.id);

    const stepInner = activeStep === 'theory'
        ? renderTextTheoryStep(lesson)
        : activeStep === 'build'
            ? renderTextBuildStep(track, lesson)
            : renderTextCheckStep(track, lesson, hasChecked);

    const stepContent = `
        <div id="guide-panel-${activeStep}" role="tabpanel" aria-labelledby="guide-tab-${activeStep}" tabindex="0">
            ${stepInner}
        </div>
    `;

    return `
        <div class="guide-modal-layout" data-guide-language="${track}" data-guide-portal-page="lesson">
            <section class="guide-lesson-page academy-detail">
                <div class="guide-lesson-page__header">
                    <div class="guide-lesson-page__header-copy">
                        <div class="guide-lesson-page__badge">${escapeHtml(lesson.badge)}</div>
                        <div class="guide-lesson-page__title">${escapeHtml(lesson.title)}</div>
                        <div class="guide-lesson-page__summary">${renderInline(lesson.summary)}</div>
                    </div>
                    <div class="guide-lesson-page__header-actions">
                        <div class="guide-lesson-page__header-pill">Урок ${lessonIndex + 1} из ${state.lessons.length}</div>
                        <div class="guide-actions">
                            <button type="button" class="guide-lesson__action" data-guide-nav="prev" ${previousLesson ? '' : 'disabled'}>Назад</button>
                            <button type="button" class="guide-lesson__action" data-guide-nav="next" ${nextLesson && isCompleted ? '' : 'disabled'}>Далее</button>
                        </div>
                    </div>
                </div>

                ${renderLessonSteps(activeStep, hasChecked, solved)}

                ${stepContent}

                ${isCompleted ? `<section class="guide-lesson-footer">
                    <div class="guide-panel-note">
                        ${nextLesson
                ? 'Урок принят. Можно перейти к следующему заданию кнопкой «Далее».'
                : 'Урок принят. Это последнее задание текущего трека.'}
                    </div>
                </section>` : ''}
            </section>
        </div>
    `;
}
