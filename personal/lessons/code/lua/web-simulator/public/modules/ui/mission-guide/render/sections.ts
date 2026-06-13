import type { ScriptLanguage } from '../../api-docs/sections.js';
import {
    getActiveLesson,
    getCompletedLessonsCount,
    getFirstUnlockedLesson,
    getLessonProgressState,
    isLessonCompleted
} from '../state.js';
import type { GuideLessonState } from '../types.js';
import {
    escapeHtml,
    renderApiFocusItem,
    renderTargetRoute
} from './support.js';

export function renderLessonOverview(
    lessonNumber: number,
    totalLessons: number,
    statusLabel: string,
    goal: string,
    builderHint: string,
    percent: number,
    completedCount: number
): string {
    return `
        <section class="guide-lesson-overview">
            <div class="guide-lesson-overview__head">
                <div>
                    <div class="guide-panel-card__title">Краткий обзор урока</div>
                    <div class="guide-panel-card__text">Только ключевая информация по текущему шагу.</div>
                </div>
                <div class="guide-lesson-overview__percent">${percent}%</div>
            </div>
            <div class="guide-lesson-overview__stats">
                <article class="guide-overview-item">
                    <div class="guide-lesson-page__meta-label">Позиция</div>
                    <div class="guide-lesson-page__goal">Урок ${lessonNumber} из ${totalLessons}</div>
                </article>
                <article class="guide-overview-item">
                    <div class="guide-lesson-page__meta-label">Статус</div>
                    <div class="guide-lesson-page__goal">${statusLabel}</div>
                </article>
                <article class="guide-overview-item">
                    <div class="guide-lesson-page__meta-label">Цель</div>
                    <div class="guide-lesson-page__goal">${escapeHtml(goal)}</div>
                </article>
                <article class="guide-overview-item">
                    <div class="guide-lesson-page__meta-label">Подсказка</div>
                    <div class="guide-lesson-page__goal">${escapeHtml(builderHint)}</div>
                </article>
            </div>
            <div class="guide-lesson-overview__bar" aria-hidden="true">
                <div class="guide-lesson-overview__fill" style="width: ${percent}%"></div>
            </div>
            <div class="guide-lesson-overview__meta">
                <span>Завершено: ${completedCount} из ${totalLessons}</span>
                <span>Следующий шаг откроется после выполнения</span>
            </div>
        </section>
    `;
}

export function renderLessonTheory(lesson: GuideLessonState['lessons'][number]): string {
    return `
        <section class="guide-lesson-section">
            <div class="guide-lesson-section__header">
                <div class="guide-panel-card__title">Теория урока</div>
                <div class="guide-panel-card__text">Короткая база перед практикой.</div>
            </div>

            <div class="guide-lesson-section__grid">
                <article class="guide-lesson-page__meta-item">
                    <div class="guide-lesson-page__meta-label">Что изучаем</div>
                    <div class="guide-lesson-page__goal">${escapeHtml(lesson.lessonIntro)}</div>
                </article>
                <article class="guide-lesson-page__meta-item">
                    <div class="guide-lesson-page__meta-label">Ожидаемый результат</div>
                    <div class="guide-lesson-page__goal">${escapeHtml(lesson.expectedOutcome)}</div>
                </article>
            </div>

            <article class="guide-panel-card">
                <div class="guide-panel-card__top">
                    <div>
                        <div class="guide-panel-card__title">Что собрать</div>
                        <div class="guide-panel-card__text">Минимальный набор блоков для текущего шага.</div>
                    </div>
                </div>
                ${renderTargetRoute(lesson)}
            </article>

            <article class="guide-panel-card">
                <div class="guide-panel-card__top">
                    <div>
                        <div class="guide-panel-card__title">Что понадобится</div>
                    </div>
                </div>
                <div class="guide-api-grid">
                    ${lesson.apiFocus.map(renderApiFocusItem).join('')}
                </div>
            </article>
        </section>
    `;
}

export function renderPortalIntro(state: GuideLessonState, language: ScriptLanguage): string {
    const firstLesson = getFirstUnlockedLesson(state, language);
    const activeLesson = getActiveLesson(state, language);
    const completedCount = getCompletedLessonsCount(state, language);
    const courseProgress = Math.round((completedCount / Math.max(state.lessons.length, 1)) * 100);
    const currentLessonId = isLessonCompleted(language, activeLesson.id) ? firstLesson.id : activeLesson.id;
    const remainingCount = Math.max(state.lessons.length - completedCount, 0);

    return `
        <section class="guide-portal-intro">
            <div class="guide-portal-intro__top">
                <div class="guide-portal-intro__hero">
                    <div class="guide-portal-intro__eyebrow">Быстрый старт</div>
                    <div class="guide-portal-intro__title">Практикум Pioneer</div>
                    <div class="guide-portal-intro__text">Открывайте первый доступный урок или переходите к нужному шагу в дорожной карте ниже.</div>
                </div>
                <div class="guide-portal-stats">
                    <article class="guide-portal-stat">
                        <div class="guide-portal-stat__label">Прогресс</div>
                        <div class="guide-portal-stat__value">${courseProgress}%</div>
                        <div class="guide-portal-stat__meta">${completedCount} из ${state.lessons.length} уроков</div>
                    </article>
                    <article class="guide-portal-stat">
                        <div class="guide-portal-stat__label">Следующий шаг</div>
                        <div class="guide-portal-stat__value">#${state.lessons.findIndex((item) => item.id === currentLessonId) + 1}</div>
                        <div class="guide-portal-stat__meta">${escapeHtml(state.lessons.find((item) => item.id === currentLessonId)?.title || firstLesson.title)}</div>
                    </article>
                    <article class="guide-portal-stat">
                        <div class="guide-portal-stat__label">Осталось</div>
                        <div class="guide-portal-stat__value">${remainingCount}</div>
                        <div class="guide-portal-stat__meta">до завершения текущего маршрута</div>
                    </article>
                </div>
                <div class="guide-portal-intro__actions">
                    <button type="button" class="guide-primary-action" data-guide-open-lesson="${escapeHtml(firstLesson.id)}">Начать обучение</button>
                    <button type="button" class="guide-lesson__action" data-guide-portal-page="lesson">Открыть маршрут курса</button>
                </div>
            </div>

            <section class="guide-portal-roadmap">
                <div class="guide-portal-roadmap__header">
                    <div>
                        <div class="guide-panel-card__title">Дорожная карта</div>
                        <div class="guide-panel-card__text">Только доступные уроки кликабельны. Закрытые откроются после завершения предыдущих.</div>
                    </div>
                    <div class="guide-portal-roadmap__meta">${completedCount}/${state.lessons.length}</div>
                </div>
                <div class="guide-portal-roadmap__list">
                    ${state.lessons.map((item, index) => {
        const progressState = getLessonProgressState(state, language, item.id);
        const stateClass = progressState === 'completed'
            ? 'is-completed'
            : progressState === 'locked'
                ? 'is-locked'
                : item.id === currentLessonId
                    ? 'is-current'
                    : '';
        const stateLabel = progressState === 'completed'
            ? 'Выполнен'
            : progressState === 'locked'
                ? 'Закрыт'
                : progressState === 'in_progress'
                    ? 'Текущий'
                    : 'Доступен';
        return `
                            <button
                                type="button"
                                class="guide-roadmap-item ${stateClass}"
                                data-guide-open-lesson="${escapeHtml(item.id)}"
                                ${progressState === 'locked' ? 'disabled' : ''}
                            >
                                <span class="guide-roadmap-item__index">${index + 1}</span>
                                <span class="guide-roadmap-item__body">
                                    <span class="guide-roadmap-item__title">${escapeHtml(item.title)}</span>
                                    <span class="guide-roadmap-item__status">${stateLabel}</span>
                                </span>
                            </button>
                        `;
    }).join('')}
                </div>
            </section>
        </section>
    `;
}
