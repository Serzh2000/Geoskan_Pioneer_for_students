import { attachLearningInteractions } from './interactions/learning.js';
import { attachWalkthroughBindings } from './interactions/walkthrough.js';
import { attachBookBindings } from './interactions/book.js';
import { isWalkthroughBusy, syncWalkthroughSession, walkthroughKey } from './walkthrough/state.js';
import { renderCourseOutline } from './render/course-outline.js';
import { attachAcademyBindings } from './interactions/academy.js';
import type { ScriptLanguage } from '../api-docs/sections.js';
import { logGuideEvent } from './support/logging.js';
import { getGuideLessonState } from './lessons.js';
import { getLuaTextLessonState } from './lessons/catalog/lua-text.js';
import { getPythonTextLessonState } from './lessons/catalog/python-text.js';
import { renderGuide } from './render.js';
import { renderTextGuide } from './render/text-guide.js';
import { mountMissionGuideScenePreview, restoreMissionGuideScenePreview, setMissionGuideScenePreviewActive } from './support/scene-preview.js';
import { mountMissionGuideMonacoPreview, saveMissionGuideDraft } from './support/monaco-preview.js';
import {
    ensureActiveChapterId,
    ensureActiveLessonId,
    getActiveLesson,
    getActivePracticeTrack,
    getActiveTextLesson,
    isTextLessonUnlocked,
    isLessonUnlocked,
    setActiveLessonId,
    setActivePortalPage
} from './state.js';

export function renderMissionGuidePanel(language: ScriptLanguage = 'lua'): void {
    const container = document.getElementById('mission-guide-modal-body');
    if (!container) return;
    const overlay = document.getElementById('mission-guide-overlay');
    const isVisible = overlay instanceof HTMLElement && overlay.style.display !== 'none';
    const track = getActivePracticeTrack();
    saveMissionGuideDraft();

    let bodyHtml: string;
    let activeLessonId: string;
    let activeChapterId: string;
    let totalLessons: number;

    if (track === 'blockly') {
        const state = getGuideLessonState(language);
        ensureActiveLessonId(language, state.activeLessonId);
        ensureActiveChapterId(language, getActiveLesson(state, language).chapterId);
        const activeLesson = getActiveLesson(state, language);
        activeLessonId = activeLesson.id;
        activeChapterId = activeLesson.chapterId;
        totalLessons = state.lessons.length;
        bodyHtml = renderGuide(state, language);
    } else {
        const textState = track === 'python' ? getPythonTextLessonState() : getLuaTextLessonState();
        ensureActiveLessonId(track, textState.activeLessonId);
        const activeLesson = getActiveTextLesson(textState, track);
        activeLessonId = activeLesson.id;
        activeChapterId = activeLesson.chapterId;
        totalLessons = textState.lessons.length;
        bodyHtml = renderTextGuide(textState, track);
    }

    logGuideEvent('panel_render', {
        language,
        track,
        visible: isVisible,
        lessonId: activeLessonId,
        chapterId: activeChapterId,
        totalLessons
    });

    const lessonLanguage = track === 'blockly' ? language : track;
    syncWalkthroughSession(walkthroughKey(lessonLanguage, activeLessonId));

    const previousView = container.dataset.learningView;
    const focusedElement = container.contains(document.activeElement) || document.getElementById('mission-guide-outline')?.contains(document.activeElement)
        ? document.activeElement as HTMLElement : null;
    const focusedAnswer = focusedElement?.dataset.walkthroughAnswer;
    const focusedFinish = focusedElement?.hasAttribute('data-walkthrough-finish');
    const outline = document.getElementById('mission-guide-outline');
    if (outline) {
        const scrollTop = outline.scrollTop;
        const opened = [...outline.querySelectorAll<HTMLDetailsElement>('details[open][data-outline-module]')].map(item => item.dataset.outlineModule);
        outline.innerHTML = renderCourseOutline(track, lessonLanguage, activeLessonId);
        outline.querySelectorAll<HTMLDetailsElement>('details[data-outline-module]').forEach(item => { if (opened.includes(item.dataset.outlineModule)) item.open = true; });
        outline.scrollTop = scrollTop;
        // Moving on must not leave the current lesson outside the visible list.
        outline.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest' });
    }
    // Authored renderers escape lesson copy; only trusted renderer markup enters this host.
    container.innerHTML = bodyHtml;
    if (outline) attachAcademyBindings(outline, lessonLanguage, activeLessonId, renderMissionGuidePanel);
    if (outline) {
        outline.querySelectorAll<HTMLButtonElement>('[data-guide-open-lesson]').forEach(button => button.addEventListener('click', () => {
            const id = button.dataset.guideOpenLesson;
            const state = getGuideLessonState(language);
            if (!id || !isLessonUnlocked(state, language, id)) return;
            setActiveLessonId(language, id);
            setActivePortalPage(language, 'lesson');
            renderMissionGuidePanel(language);
        }));
        outline.querySelectorAll<HTMLButtonElement>('[data-guide-text-lesson]').forEach(button => button.addEventListener('click', () => {
            const id = button.dataset.guideTextLesson;
            if (!id || track === 'blockly') return;
            const state = track === 'python' ? getPythonTextLessonState() : getLuaTextLessonState();
            if (!isTextLessonUnlocked(state, track, id)) return;
            setActiveLessonId(track, id);
            renderMissionGuidePanel(track);
        }));
    }
    const page = container.querySelector<HTMLElement>('[data-guide-portal-page]')?.dataset.guidePortalPage;
    const step = container.querySelector<HTMLElement>('.guide-walkthrough, .book')?.dataset.walkthroughStep;
    // The bookmarks replace the contents list while a book spread is open.
    overlay?.querySelector('.guide-modal')?.classList.toggle('is-book', Boolean(container.querySelector('.book')));
    const view = `${track}:${activeLessonId}:${page}:${step}`;
    if (previousView !== view) container.scrollTop = 0;
    container.dataset.learningView = view;
    attachLearningInteractions(container);
    const walkthroughLesson = track === 'blockly'
        ? getActiveLesson(getGuideLessonState(language), language)
        : getActiveTextLesson(track === 'python' ? getPythonTextLessonState() : getLuaTextLessonState(), track);
    attachWalkthroughBindings(container, lessonLanguage, walkthroughLesson, renderMissionGuidePanel);
    attachBookBindings(container, lessonLanguage, walkthroughLesson, renderMissionGuidePanel);
    attachAcademyBindings(container, lessonLanguage, activeLessonId, renderMissionGuidePanel);
    const busy = isWalkthroughBusy(walkthroughKey(lessonLanguage, activeLessonId));
    container.setAttribute('aria-busy', String(busy));
    const trackStatus = document.getElementById('mission-guide-track-status');
    if (trackStatus) {
        const scope = `${track}:${activeLessonId}`;
        if (trackStatus.dataset.noticeScope && trackStatus.dataset.noticeScope !== scope) delete trackStatus.dataset.notice;
        trackStatus.dataset.noticeScope = scope;
        trackStatus.textContent = busy ? 'Программа выполняется · смена языка доступна после проверки' : trackStatus.dataset.notice || '';
    }
    overlay?.querySelectorAll<HTMLButtonElement>('[data-guide-track]').forEach(button => {
        const active = button.dataset.guideTrack === track;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
        if (active) container.setAttribute('aria-labelledby', button.id);
    });
    overlay?.querySelectorAll<HTMLButtonElement>('[data-guide-track]').forEach(button => { button.disabled = busy; });
    if (busy) {
        outline?.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = true; });
        container.querySelectorAll<HTMLButtonElement>('[data-guide-nav], [data-guide-portal-page], [data-guide-check], [data-guide-launch], [data-guide-text-check], [data-guide-text-reset], [data-guide-reset], [data-academy-terrain], [data-academy-open], [data-academy-prepare], [data-academy-restore]').forEach(button => { button.disabled = true; });
    }
    if (!isVisible) return;

    if (focusedElement && !focusedElement.isConnected) {
        const focusTarget = focusedAnswer !== undefined && previousView === view
            ? container.querySelector<HTMLElement>(`[data-walkthrough-answer="${focusedAnswer}"]`)
            : focusedFinish && previousView === view
                // A finished lesson hands focus to the way forward, so Enter continues the course.
                ? container.querySelector<HTMLElement>('.guide-complete .btn-primary:not([disabled])')
                    ?? container.querySelector<HTMLElement>('[data-walkthrough-finish]')
            : container.querySelector<HTMLElement>('#guide-walkthrough-content');
        focusTarget?.focus({ preventScroll: true });
    }

    if (!container.querySelector('#mission-guide-scene-preview-host')) restoreMissionGuideScenePreview();
    if ('academy' in walkthroughLesson && walkthroughLesson.academy && step === 'build') setMissionGuideScenePreviewActive(true);
    mountMissionGuideScenePreview();
    if (track !== 'blockly') {
        const textState = track === 'python' ? getPythonTextLessonState() : getLuaTextLessonState();
        const activeLesson = getActiveTextLesson(textState, track);
        void mountMissionGuideMonacoPreview(track, activeLesson.starterCode, activeLesson.id);
    }

    void import('./interactions.js')
        .then(({ attachGuideInteractions }) => {
            attachGuideInteractions(container, language, renderMissionGuidePanel);
        })
        .catch((error) => {
            console.error('Failed to load Blockly interactions', error);
        });
}
