import { attachLearningInteractions } from './interactions/learning.js';
import type { ScriptLanguage } from '../api-docs/sections.js';
import { logGuideEvent } from './support/logging.js';
import { getGuideLessonState } from './lessons.js';
import { getLuaTextLessonState } from './lessons/catalog/lua-text.js';
import { getPythonTextLessonState } from './lessons/catalog/python-text.js';
import { renderGuide } from './render.js';
import { renderTextGuide } from './render/text-guide.js';
import { mountMissionGuideScenePreview } from './support/scene-preview.js';
import { mountMissionGuideMonacoPreview, saveMissionGuideDraft } from './support/monaco-preview.js';
import {
    ensureActiveChapterId,
    ensureActiveLessonId,
    getActiveLesson,
    getActivePracticeTrack,
    getActiveTextLesson
} from './state.js';

export function renderMissionGuidePanel(language: ScriptLanguage = 'lua'): void {
    const container = document.getElementById('mission-guide-modal-body');
    if (!container) return;
    const overlay = document.getElementById('mission-guide-overlay');
    const isVisible = overlay instanceof HTMLElement && overlay.style.display !== 'none';
    const track = getActivePracticeTrack();

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

    saveMissionGuideDraft();
    const previousView = container.dataset.learningView;
    const restoreTabFocus = container.contains(document.activeElement)
        && document.activeElement?.getAttribute('role') === 'tab';
    container.innerHTML = bodyHtml;
    const selectedTab = container.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]');
    const page = container.querySelector<HTMLElement>('[data-guide-portal-page]')?.dataset.guidePortalPage;
    const view = `${track}:${activeLessonId}:${page}:${selectedTab?.id}`;
    if (previousView !== view) container.scrollTop = 0;
    container.dataset.learningView = view;
    if (restoreTabFocus) selectedTab?.focus({ preventScroll: true });
    container.querySelector<HTMLElement>('[role="tablist"]')?.addEventListener('keydown', (event) => {
        const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
        if (!keys.includes(event.key)) return;
        const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
        const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
        if (current < 0) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
            : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        tabs[next].click();
    });
    attachLearningInteractions(container);
    if (!isVisible) return;

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
