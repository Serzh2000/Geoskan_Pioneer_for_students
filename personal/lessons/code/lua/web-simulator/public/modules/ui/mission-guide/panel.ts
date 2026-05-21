import type { ScriptLanguage } from '../api-docs/sections.js';
import { logGuideEvent } from './support/logging.js';
import { getGuideLessonState } from './lessons.js';
import { renderGuide } from './render.js';
import { mountMissionGuideScenePreview } from './support/scene-preview.js';
import { ensureActiveChapterId, ensureActiveLessonId, getActiveLesson } from './state.js';

export function renderMissionGuidePanel(language: ScriptLanguage = 'lua'): void {
    const container = document.getElementById('mission-guide-modal-body');
    if (!container) return;
    const overlay = document.getElementById('mission-guide-overlay');
    const isVisible = overlay instanceof HTMLElement && overlay.style.display !== 'none';

    const state = getGuideLessonState(language);
    ensureActiveLessonId(language, state.activeLessonId);
    ensureActiveChapterId(language, getActiveLesson(state, language).chapterId);
    const activeLesson = getActiveLesson(state, language);

    logGuideEvent('panel_render', {
        language,
        visible: isVisible,
        lessonId: activeLesson.id,
        chapterId: activeLesson.chapterId,
        totalLessons: state.lessons.length
    });

    container.innerHTML = renderGuide(state, language);
    if (!isVisible) return;

    mountMissionGuideScenePreview();
    void import('./interactions.js')
        .then(({ attachGuideInteractions }) => {
            attachGuideInteractions(container, language, renderMissionGuidePanel);
        })
        .catch((error) => {
            console.error('Failed to load Blockly interactions', error);
        });
}
