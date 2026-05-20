import type { ScriptLanguage } from '../../api-docs/sections.js';
import { getActiveChapter, getFirstUnlockedLesson, getLessonProgressState, getLessonsForChapter } from '../state.js';
import type { GuideLessonState } from '../types.js';
import { escapeHtml } from './shared.js';

export function renderTheoryView(state: GuideLessonState, language: ScriptLanguage): string {
    const activeChapter = getActiveChapter(state, language);
    const chapterLessons = getLessonsForChapter(state, activeChapter.id);
    const completedCount = chapterLessons.filter((lesson) => getLessonProgressState(state, language, lesson.id) === 'completed').length;
    const practiceLesson = chapterLessons.find((lesson) => getLessonProgressState(state, language, lesson.id) !== 'locked')
        || getFirstUnlockedLesson(state, language);
    const practiceAvailableInChapter = chapterLessons.some((lesson) => getLessonProgressState(state, language, lesson.id) !== 'locked');

    return `
        <section class="guide-theory-page">
            <div class="guide-theory-page__hero">
                <div class="guide-lesson-page__badge">${escapeHtml(activeChapter.badge)}</div>
                <div class="guide-theory-page__title">${escapeHtml(activeChapter.title)}</div>
            </div>

            <div class="guide-theory-page__meta">
                <div class="guide-lesson-page__meta-item">
                    <div class="guide-lesson-page__meta-label">О чем глава</div>
                    <div class="guide-lesson-page__goal">${escapeHtml(activeChapter.theoryIntro)}</div>
                </div>
                <div class="guide-lesson-page__meta-item">
                    <div class="guide-lesson-page__meta-label">Практика главы</div>
                    <div class="guide-lesson-page__goal">Доступно заданий: ${chapterLessons.length}. Уже завершено: ${completedCount}.</div>
                </div>
            </div>

            <div class="guide-theory-sections">
                ${activeChapter.theorySections.map((section) => `
                    <article class="guide-theory-card">
                        <div class="guide-panel-card__title">${escapeHtml(section.title)}</div>
                        <div class="guide-theory-card__content">
                            ${section.paragraphs.slice(0, 1).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
                            ${section.bullets?.length ? `
                                <ul class="guide-theory-card__list">
                                    ${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                                </ul>
                            ` : ''}
                            ${section.takeaway ? `<div class="guide-panel-note"><strong>Вывод:</strong> ${escapeHtml(section.takeaway)}</div>` : ''}
                        </div>
                    </article>
                `).join('')}
            </div>

            <section class="guide-panel-card">
                <div class="guide-panel-card__top">
                    <div>
                        <div class="guide-panel-card__title">${escapeHtml(activeChapter.practiceHeading)}</div>
                        <div class="guide-panel-card__text">${escapeHtml(activeChapter.practiceIntro)}</div>
                    </div>
                </div>
                <div class="guide-practice-grid">
                    ${chapterLessons.map((lesson) => {
        const progressState = getLessonProgressState(state, language, lesson.id);
        const statusLabel = progressState === 'completed'
            ? 'Выполнен'
            : progressState === 'locked'
                ? 'Закрыт'
                : progressState === 'in_progress'
                    ? 'Текущий'
                    : 'Доступен';
        return `
                        <article class="guide-practice-card ${progressState === 'locked' ? 'is-locked' : ''}">
                            <div class="guide-practice-card__difficulty">${escapeHtml(lesson.badge)}</div>
                            <div class="guide-practice-card__title">${escapeHtml(lesson.title)}</div>
                            <div class="guide-panel-card__text">${escapeHtml(lesson.summary)}</div>
                            <div class="guide-panel-note">${statusLabel}</div>
                        </article>
                    `;
    }).join('')}
                </div>
                <div class="guide-actions">
                    <button
                        type="button"
                        class="guide-primary-action"
                        data-guide-go-practice="${escapeHtml(activeChapter.id)}"
                        data-guide-lesson="${escapeHtml(practiceLesson.id)}"
                        ${practiceAvailableInChapter ? '' : 'disabled'}
                    >
                        ${practiceAvailableInChapter ? 'Перейти к практике' : 'Практика пока закрыта'}
                    </button>
                </div>
            </section>
        </section>
    `;
}

export function renderTrainerIntro(_state: GuideLessonState, _language: ScriptLanguage): string {
    return '';
}
