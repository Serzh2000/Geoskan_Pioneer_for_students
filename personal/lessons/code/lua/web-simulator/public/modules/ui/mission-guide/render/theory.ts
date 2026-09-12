import type { ScriptLanguage } from '../../api-docs/sections.js';
import { getActiveChapter, getFirstUnlockedLesson, getLessonProgressState, getLessonsForChapter } from '../state.js';
import type { GuideLessonState, GuideTheorySpoiler } from '../types.js';
import { escapeHtml, renderInline } from './shared.js';

function renderTheoryList(items: string[], variant: 'bullets' | 'ordered'): string {
    if (!items.length) {
        return '';
    }
    const tag = variant === 'ordered' ? 'ol' : 'ul';
    const modifier = variant === 'ordered' ? ' guide-theory-card__list--ordered' : '';
    return `
        <${tag} class="guide-theory-card__list${modifier}">
            ${items.map((item) => `<li>${renderInline(item)}</li>`).join('')}
        </${tag}>
    `;
}

function renderTheorySpoiler(spoiler: GuideTheorySpoiler): string {
    const body = [
        spoiler.paragraphs?.length ? spoiler.paragraphs.map((paragraph) => `<p>${renderInline(paragraph)}</p>`).join('') : '',
        renderTheoryList(spoiler.ordered || [], 'ordered'),
        renderTheoryList(spoiler.bullets || [], 'bullets')
    ].filter(Boolean).join('');

    return `
        <details class="guide-theory-card__spoiler">
            <summary>${renderInline(spoiler.label)}</summary>
            <div class="guide-theory-card__spoiler-body">${body}</div>
        </details>
    `;
}

function renderTheorySection(section: { title: string; paragraphs: string[]; bullets?: string[]; ordered?: string[]; spoilers?: GuideTheorySpoiler[]; takeaway?: string }, index: number): string {
    return `
        <article class="guide-theory-card">
            <div class="guide-theory-card__head">
                <div class="guide-theory-card__index">${index + 1}</div>
                <div class="guide-panel-card__title">${renderInline(section.title)}</div>
            </div>
            <div class="guide-theory-card__content">
                ${section.paragraphs.map((paragraph) => `<p>${renderInline(paragraph)}</p>`).join('')}
                ${renderTheoryList(section.ordered || [], 'ordered')}
                ${renderTheoryList(section.bullets || [], 'bullets')}
                ${section.spoilers?.length ? section.spoilers.map(renderTheorySpoiler).join('') : ''}
                ${section.takeaway ? `
                    <div class="guide-theory-card__takeaway">
                        <div class="guide-theory-card__takeaway-label">Ключевой вывод</div>
                        <div class="guide-theory-card__takeaway-text">${renderInline(section.takeaway)}</div>
                    </div>
                ` : ''}
            </div>
        </article>
    `;
}

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
                    <div class="guide-lesson-page__goal">${renderInline(activeChapter.theoryIntro)}</div>
                </div>
                <div class="guide-lesson-page__meta-item">
                    <div class="guide-lesson-page__meta-label">Практика главы</div>
                    <div class="guide-lesson-page__goal">Доступно заданий: ${chapterLessons.length}. Уже завершено: ${completedCount}.</div>
                </div>
            </div>

            <div class="guide-theory-sections">
                ${activeChapter.theorySections.map(renderTheorySection).join('')}
            </div>

            <section class="guide-panel-card">
                <div class="guide-panel-card__top">
                    <div>
                        <div class="guide-panel-card__title">${escapeHtml(activeChapter.practiceHeading)}</div>
                        <div class="guide-panel-card__text">${renderInline(activeChapter.practiceIntro)}</div>
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
                            <div class="guide-practice-card__title">${renderInline(lesson.title)}</div>
                            <div class="guide-panel-card__text">${renderInline(lesson.summary)}</div>
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
