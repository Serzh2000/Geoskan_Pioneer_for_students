import type { ScriptLanguage } from '../api-docs/sections.js';
import { attachGuideInteractions } from './interactions.js';
import { getGuideLessonState } from './lessons.js';
import { renderGuide } from './render.js';
import { mountMissionGuideScenePreview } from './scene-preview.js';
import { ensureActiveLessonId } from './state.js';

export function renderMissionGuidePanel(language: ScriptLanguage = 'lua'): void {
    const container = document.getElementById('mission-guide-modal-body');
    if (!container) return;

    const state = getGuideLessonState(language);
    ensureActiveLessonId(language, state.activeLessonId);

    container.innerHTML = renderGuide(state, language);
    attachGuideInteractions(container, language, renderMissionGuidePanel);
    mountMissionGuideScenePreview();
}
