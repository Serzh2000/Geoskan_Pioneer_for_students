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
    renderDocLink,
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
                    <div class="guide-panel-card__text">Минимум декоративных слоев: сверху только ключевая информация, ниже сразу теория и практика.</div>
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
                <span>Следующий шаг открывается только после статуса «выполнен»</span>
            </div>
        </section>
    `;
}

export function renderLessonTheory(lesson: GuideLessonState['lessons'][number]): string {
    return `
        <section class="guide-lesson-section">
            <div class="guide-lesson-section__header">
                <div class="guide-panel-card__title">Теория урока</div>
                <div class="guide-panel-card__text">Короткий смысловой блок перед практикой, чтобы урок читался как единая страница.</div>
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
                        <div class="guide-panel-card__title">API-фокус урока</div>
                        <div class="guide-panel-card__text">Сначала поймите опорные методы и события, затем собирайте сценарий в Blockly.</div>
                    </div>
                </div>
                <div class="guide-api-grid">
                    ${lesson.apiFocus.map(renderApiFocusItem).join('')}
                </div>
            </article>

            <article class="guide-panel-card">
                <div class="guide-panel-card__top">
                    <div>
                        <div class="guide-panel-card__title">Опорная логика урока</div>
                        <div class="guide-panel-card__text">Эти шаги должны читаться в итоговом решении и проверяются автоматически.</div>
                    </div>
                </div>
                ${renderTargetRoute(lesson)}
                <div class="guide-link-chips">
                    ${lesson.links.map(renderDocLink).join('')}
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

    return `
        <section class="guide-portal-intro">
            <div class="guide-portal-intro__hero">
                <div class="guide-portal-intro__eyebrow">Вводная страница</div>
                <div class="guide-portal-intro__title">Образовательный практикум Pioneer</div>
                <div class="guide-portal-intro__text">
                    Практикум объединяет краткую теорию, демонстрации API и проверяемые задания. Каждый следующий урок открывается
                    только после корректного завершения текущего, поэтому движение по курсу остается линейным и прозрачным.
                </div>
                <div class="guide-portal-intro__actions">
                    <button type="button" class="guide-primary-action" data-guide-open-lesson="${escapeHtml(firstLesson.id)}">Начать обучение</button>
                    <button type="button" class="guide-lesson__action" data-guide-portal-page="lesson">Открыть маршрут курса</button>
                </div>
            </div>

            <div class="guide-portal-grid">
                <article class="guide-portal-card">
                    <div class="guide-portal-card__title">Цели практикума</div>
                    <div class="guide-portal-card__text">
                        Пользователь пошагово осваивает логику миссий, событийную модель, безопасный запуск маршрутов
                        и базовые сценарии работы с Pioneer API в симуляторе.
                    </div>
                </article>
                <article class="guide-portal-card">
                    <div class="guide-portal-card__title">Структура курса</div>
                    <div class="guide-portal-card__text">
                        Курс делится на тематические уроки: вводные основы, управление полетом, событийная логика,
                        навигация и итоговые практические сценарии.
                    </div>
                </article>
                <article class="guide-portal-card">
                    <div class="guide-portal-card__title">Правила прохождения</div>
                    <div class="guide-portal-card__text">
                        Для перехода дальше нужно собрать рабочую логику, пройти автоматическую проверку и получить статус выполнения
                        по текущему уроку.
                    </div>
                </article>
                <article class="guide-portal-card">
                    <div class="guide-portal-card__title">Ваш прогресс</div>
                    <div class="guide-portal-card__text">
                        Завершено уроков: ${completedCount} из ${state.lessons.length}. Текущий прогресс по курсу: ${courseProgress}%.
                    </div>
                </article>
            </div>

            <section class="guide-portal-roadmap">
                <div class="guide-portal-roadmap__header">
                    <div class="guide-panel-card__title">Дорожная карта практикума</div>
                    <div class="guide-panel-card__text">Каждый урок является отдельной страницей с теорией и практикой.</div>
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
                                    <span class="guide-roadmap-item__summary">${escapeHtml(item.summary)}</span>
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
