import type { ScriptLanguage } from '../api-docs/sections.js';
import { logGuideEvent } from './support/logging.js';
import { getGuideLessonState } from './lessons.js';
import { getLuaTextLessonState } from './lessons/catalog/lua-text.js';
import { getPythonTextLessonState } from './lessons/catalog/python-text.js';
import { renderGuide } from './render.js';
import { renderTextGuide } from './render/text-guide.js';
import { mountMissionGuideScenePreview } from './support/scene-preview.js';
import { mountMissionGuideMonacoPreview } from './support/monaco-preview.js';
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

    container.innerHTML = bodyHtml;
    if (!isVisible) return;

    mountMissionGuideScenePreview();
    if (track !== 'blockly') {
        const textState = track === 'python' ? getPythonTextLessonState() : getLuaTextLessonState();
        const activeLesson = getActiveTextLesson(textState, track);
        void mountMissionGuideMonacoPreview(track, activeLesson.starterCode);
    }

    void import('./interactions.js')
        .then(({ attachGuideInteractions }) => {
            attachGuideInteractions(container, language, renderMissionGuidePanel);
        })
        .catch((error) => {
            console.error('Failed to load Blockly interactions', error);
        });
}
