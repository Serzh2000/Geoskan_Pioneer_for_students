import { openApiDocsCatalog } from '../api-docs/index.js';
import { setCurrentScriptLanguage } from '../../core/state.js';
import { logGuideEvent } from './guide-logging.js';
import { buildGuideEventContext, resetGuideRuntimeView, type GuideInteractionContext } from './interaction-context.js';
import {
    setActiveChapterId,
    setActiveLessonId,
    setActiveTab
} from './state.js';

export function attachGuideNavigationBindings(context: GuideInteractionContext): void {
    const { container, language, state, lesson, rerender } = context;

    container.querySelectorAll<HTMLElement>('[data-guide-query]').forEach((element) => {
        element.addEventListener('click', () => {
            const query = element.dataset.guideQuery || '';
            const previewKey = element.dataset.guidePreview || null;
            logGuideEvent('docs_open', {
                ...buildGuideEventContext(context),
                query,
                previewKey
            });
            openApiDocsCatalog({ language, query, previewKey });
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-mode]').forEach((element) => {
        element.addEventListener('click', () => {
            const mode = element.dataset.guideMode;
            if (mode !== 'tutorial' && mode !== 'trainer') {
                return;
            }

            logGuideEvent('tab_change', {
                ...buildGuideEventContext(context),
                nextTab: mode
            });
            resetGuideRuntimeView();
            setActiveTab(language, mode);
            rerender(language);
        });
    });

    container.querySelectorAll<HTMLSelectElement>('[data-guide-language-select]').forEach((element) => {
        element.addEventListener('change', () => {
            const nextLanguage = element.value as typeof language;
            if (nextLanguage !== 'lua' && nextLanguage !== 'python') {
                return;
            }

            logGuideEvent('language_change', {
                ...buildGuideEventContext(context),
                nextLanguage
            });
            resetGuideRuntimeView();
            setCurrentScriptLanguage(nextLanguage);
            const appLanguageSelect = document.getElementById('script-language-select') as HTMLSelectElement | null;
            if (appLanguageSelect) {
                appLanguageSelect.value = nextLanguage;
            }
            rerender(nextLanguage);
        });
    });

    container.querySelectorAll<HTMLSelectElement>('[data-guide-chapter-select]').forEach((element) => {
        element.addEventListener('change', () => {
            const chapterId = element.value;
            if (!chapterId) {
                return;
            }

            logGuideEvent('chapter_change', {
                ...buildGuideEventContext(context),
                nextChapterId: chapterId
            });
            resetGuideRuntimeView();
            setActiveChapterId(language, chapterId);
            const chapterLessons = state.lessons.filter((item) => item.chapterId === chapterId);
            if (chapterLessons.length > 0) {
                setActiveLessonId(language, chapterLessons[0].id);
            }
            rerender(language);
        });
    });

    container.querySelectorAll<HTMLSelectElement>('[data-guide-lesson-select]').forEach((element) => {
        element.addEventListener('change', () => {
            const nextLessonId = element.value;
            if (!nextLessonId) {
                return;
            }

            const selectedLesson = state.lessons.find((item) => item.id === nextLessonId);
            if (!selectedLesson) {
                return;
            }

            logGuideEvent('lesson_change', {
                ...buildGuideEventContext(context),
                nextLessonId,
                nextChapterId: selectedLesson.chapterId
            });
            resetGuideRuntimeView();
            setActiveChapterId(language, selectedLesson.chapterId);
            setActiveLessonId(language, nextLessonId);
            setActiveTab(language, 'trainer');
            rerender(language);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-chapter]').forEach((element) => {
        element.addEventListener('click', () => {
            const chapterId = element.dataset.guideChapter;
            if (!chapterId) {
                return;
            }

            logGuideEvent('chapter_card_open', {
                ...buildGuideEventContext(context),
                nextChapterId: chapterId
            });
            resetGuideRuntimeView();
            setActiveChapterId(language, chapterId);
            const nextChapter = state.chapters.find((chapter) => chapter.id === chapterId);
            if (nextChapter) {
                setActiveLessonId(language, nextChapter.primaryLessonId);
            }
            rerender(language);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-go-practice]').forEach((element) => {
        element.addEventListener('click', () => {
            const chapterId = element.dataset.guideGoPractice;
            const nextLessonId = element.dataset.guideLesson;
            if (!chapterId || !nextLessonId) {
                return;
            }

            logGuideEvent('practice_open', {
                ...buildGuideEventContext(context),
                nextChapterId: chapterId,
                nextLessonId
            });
            resetGuideRuntimeView();
            setActiveChapterId(language, chapterId);
            setActiveLessonId(language, nextLessonId);
            setActiveTab(language, 'trainer');
            rerender(language);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-lesson]').forEach((element) => {
        element.addEventListener('click', () => {
            const nextLessonId = element.dataset.guideLesson;
            if (!nextLessonId) {
                return;
            }

            const selectedLesson = state.lessons.find((item) => item.id === nextLessonId);
            logGuideEvent('lesson_card_open', {
                ...buildGuideEventContext(context),
                nextLessonId,
                nextChapterId: selectedLesson?.chapterId
            });
            if (selectedLesson) {
                resetGuideRuntimeView();
                setActiveChapterId(language, selectedLesson.chapterId);
            }
            setActiveLessonId(language, nextLessonId);
            setActiveTab(language, 'trainer');
            rerender(language);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-nav]').forEach((element) => {
        element.addEventListener('click', () => {
            const currentIndex = state.lessons.findIndex((item) => item.id === lesson.id);
            if (currentIndex < 0) {
                return;
            }

            const direction = element.dataset.guideNav;
            const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
            const nextLesson = state.lessons[nextIndex];
            if (!nextLesson) {
                return;
            }

            logGuideEvent('lesson_nav', {
                ...buildGuideEventContext(context),
                direction,
                nextLessonId: nextLesson.id,
                nextChapterId: nextLesson.chapterId
            });
            resetGuideRuntimeView();
            setActiveChapterId(language, nextLesson.chapterId);
            setActiveLessonId(language, nextLesson.id);
            setActiveTab(language, 'trainer');
            rerender(language);
        });
    });
}
