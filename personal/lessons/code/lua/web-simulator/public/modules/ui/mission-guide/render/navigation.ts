import type { ScriptLanguage } from '../../api-docs/sections.js';
import {
    getActiveChapter,
    getActiveLesson,
    getActiveTab,
    getLessonBanner,
    getLessonsForChapter,
    getLessonSequence,
    getLessonWorkspaceState
} from '../state.js';
import { evaluateLesson } from '../lesson-evaluation.js';
import type { GuideLessonState } from '../types.js';
import { escapeHtml } from './shared.js';

export function renderGuideTopTabs(language: ScriptLanguage): string {
    const activeTab = getActiveTab(language);
    return `
        <div class="guide-top-tabs" role="tablist" aria-label="Режим работы">
            <button
                type="button"
                class="guide-top-tab ${activeTab === 'tutorial' ? 'is-active' : ''}"
                data-guide-mode="tutorial"
            >
                Учебник
            </button>
            <button
                type="button"
                class="guide-top-tab ${activeTab === 'trainer' ? 'is-active' : ''}"
                data-guide-mode="trainer"
            >
                Тренажер
            </button>
        </div>
    `;
}

export function renderGuideSelectors(state: GuideLessonState, language: ScriptLanguage): string {
    const activeChapter = getActiveChapter(state, language);
    const activeLesson = getActiveLesson(state, language);
    const chapterLessons = getLessonsForChapter(state, activeChapter.id);

    return `
        <section class="guide-selector-bar">
            <label class="guide-selector-field">
                <span class="guide-selector-field__label">Язык</span>
                <select class="guide-selector" data-guide-language-select aria-label="Выбор языка практикума">
                    <option value="lua" ${language === 'lua' ? 'selected' : ''}>Lua</option>
                    <option value="python" ${language === 'python' ? 'selected' : ''}>Python</option>
                </select>
            </label>
            <label class="guide-selector-field">
                <span class="guide-selector-field__label">Тема</span>
                <select class="guide-selector" data-guide-chapter-select aria-label="Выбор темы">
                    ${state.chapters.map((chapter, index) => `
                        <option value="${escapeHtml(chapter.id)}" ${chapter.id === activeChapter.id ? 'selected' : ''}>
                            ${index + 1}. ${escapeHtml(chapter.title)}
                        </option>
                    `).join('')}
                </select>
            </label>
            <label class="guide-selector-field">
                <span class="guide-selector-field__label">Задание</span>
                <select class="guide-selector" data-guide-lesson-select aria-label="Выбор задания">
                    ${chapterLessons.map((lesson, index) => `
                        <option value="${escapeHtml(lesson.id)}" ${lesson.id === activeLesson.id ? 'selected' : ''}>
                            ${index + 1}. ${escapeHtml(lesson.title)}
                        </option>
                    `).join('')}
                </select>
            </label>
        </section>
    `;
}

export function renderPageTabs(state: GuideLessonState, language: ScriptLanguage): string {
    const activeChapter = getActiveChapter(state, language);
    const chapterLessons = getLessonsForChapter(state, activeChapter.id);
    const activeLesson = getActiveLesson(state, language);

    return `
        <div class="guide-page-tabs">
            ${chapterLessons.map((lesson, index) => {
                const evaluation = evaluateLesson(
                    lesson,
                    getLessonSequence(language, lesson.id),
                    getLessonWorkspaceState(language, lesson.id)
                );
                const isActive = activeLesson.id === lesson.id;
                return `
                    <button
                        type="button"
                        class="guide-page-tab ${isActive ? 'is-active' : ''} ${evaluation.solved ? 'is-solved' : ''}"
                        data-guide-lesson="${escapeHtml(lesson.id)}"
                    >
                        <span class="guide-page-tab__step">${index + 1}</span>
                        <span class="guide-page-tab__text">${escapeHtml(lesson.title)}</span>
                    </button>
                `;
            }).join('')}
        </div>
    `;
}

export function renderRunBanner(language: ScriptLanguage, lessonId: string): string {
    const banner = getLessonBanner(language, lessonId);
    if (!banner) return '';

    return `
        <div class="guide-run-banner guide-run-banner--${banner.kind}">
            ${escapeHtml(banner.message)}
        </div>
    `;
}
