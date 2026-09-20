import { openApiDocsCatalog } from '../../api-docs/index.js';
import { setCurrentScriptLanguage } from '../../../core/state.js';
import { logGuideEvent } from '../support/logging.js';
import { buildGuideEventContext, resetGuideRuntimeView, type GuideInteractionContext } from './context.js';
import type { GuideLessonStepId } from '../types.js';
import {
    getNextLesson,
    getPreviousLesson,
    isLessonCompleted,
    isLessonUnlocked,
    setActivePortalPage,
    setActiveChapterId,
    setActiveLessonId,
    setActiveGuideStep
} from '../state.js';

export function attachGuideNavigationBindings(context: GuideInteractionContext): void {
    const { container, language, state, lesson, rerender } = context;

    const activateGuideStep = (step: GuideLessonStepId): void => {
        logGuideEvent('lesson_step_change', {
            ...buildGuideEventContext(context),
            step
        });
        setActiveGuideStep(language, lesson.id, step);
        rerender(language);
    };

    container.querySelectorAll<HTMLElement>('[data-guide-step]').forEach((element) => {
        element.addEventListener('click', () => {
            const step = element.dataset.guideStep;
            if (step !== 'theory' && step !== 'build' && step !== 'check') return;
            activateGuideStep(step);
        });
    });

    const lessonStepTablist = container.querySelector<HTMLElement>('[role="tablist"][aria-label="Шаги урока"]');
    if (lessonStepTablist) {
        lessonStepTablist.addEventListener('keydown', (event) => {
            const tabs = Array.from(lessonStepTablist.querySelectorAll<HTMLButtonElement>('[data-guide-step]'));
            if (tabs.length === 0) return;

            if (event.key === ' ') {
                event.preventDefault();
                return;
            }

            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') {
                return;
            }

            event.preventDefault();

            const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
            let nextIndex: number;
            if (event.key === 'Home') {
                nextIndex = 0;
            } else if (event.key === 'End') {
                nextIndex = tabs.length - 1;
            } else {
                const baseIndex = currentIndex === -1 ? 0 : currentIndex;
                const delta = event.key === 'ArrowRight' ? 1 : -1;
                nextIndex = (baseIndex + delta + tabs.length) % tabs.length;
            }

            const nextTab = tabs[nextIndex];
            const step = nextTab.dataset.guideStep;
            if (step !== 'theory' && step !== 'build' && step !== 'check') return;

            tabs.forEach((tab) => {
                tab.tabIndex = tab === nextTab ? 0 : -1;
            });
            nextTab.focus();
            activateGuideStep(step);
        });
    }

    container.querySelectorAll<HTMLButtonElement>('button[data-guide-portal-page]').forEach((element) => {
        element.addEventListener('click', () => {
            const nextPage = element.dataset.guidePortalPage;
            if (nextPage !== 'intro' && nextPage !== 'lesson') return;
            setActivePortalPage(language, nextPage);
            rerender(language);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-open-lesson]').forEach((element) => {
        element.addEventListener('click', () => {
            const nextLessonId = element.dataset.guideOpenLesson;
            if (!nextLessonId) return;
            const selectedLesson = state.lessons.find((item) => item.id === nextLessonId);
            if (!selectedLesson || !isLessonUnlocked(state, language, nextLessonId)) return;
            setActivePortalPage(language, 'lesson');
            setActiveChapterId(language, selectedLesson.chapterId);
            setActiveLessonId(language, nextLessonId);
            rerender(language);
        });
    });

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
            const firstUnlockedLesson = chapterLessons.find((item) => isLessonUnlocked(state, language, item.id));
            if (firstUnlockedLesson) {
                setActiveLessonId(language, firstUnlockedLesson.id);
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
            if (!isLessonUnlocked(state, language, nextLessonId)) {
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
            setActivePortalPage(language, 'lesson');
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
            const chapterLessons = state.lessons.filter((item) => item.chapterId === chapterId);
            const firstUnlockedLesson = chapterLessons.find((item) => isLessonUnlocked(state, language, item.id));
            if (firstUnlockedLesson) {
                setActiveLessonId(language, firstUnlockedLesson.id);
            }
            setActivePortalPage(language, 'lesson');
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
            if (!isLessonUnlocked(state, language, nextLessonId)) {
                return;
            }
            resetGuideRuntimeView();
            setActiveChapterId(language, chapterId);
            setActiveLessonId(language, nextLessonId);
            setActivePortalPage(language, 'lesson');
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
                if (!isLessonUnlocked(state, language, nextLessonId)) {
                    return;
                }
                resetGuideRuntimeView();
                setActiveChapterId(language, selectedLesson.chapterId);
            }
            setActiveLessonId(language, nextLessonId);
            setActivePortalPage(language, 'lesson');
            rerender(language);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-nav]').forEach((element) => {
        element.addEventListener('click', () => {
            const direction = element.dataset.guideNav;
            const nextLesson = direction === 'next'
                ? getNextLesson(state, lesson.id)
                : getPreviousLesson(state, lesson.id);
            if (!nextLesson) {
                return;
            }
            if (direction === 'next' && !isLessonCompleted(language, lesson.id)) {
                return;
            }
            if (!isLessonUnlocked(state, language, nextLesson.id)) {
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
            setActivePortalPage(language, 'lesson');
            rerender(language);
        });
    });
}
