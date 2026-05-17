import type { ScriptLanguage } from '../api-docs/sections.js';
import { logGuideEvent } from './guide-logging.js';
import { type GuideInteractionContext, buildGuideEventContext } from './interaction-context.js';
import { attachGuideActionBindings } from './interactions-actions.js';
import { attachGuideNavigationBindings } from './interactions-navigation.js';
import { attachGuideWorkspace } from './interactions-workspace.js';
import { getGuideLessonState } from './lessons.js';
import {
    getActiveChapter,
    getActiveLesson
} from './state.js';
import type { RenderMissionGuidePanel } from './types.js';
function createGuideInteractionContext(
    container: HTMLElement,
    language: ScriptLanguage,
    rerender: RenderMissionGuidePanel
): GuideInteractionContext {
    const state = getGuideLessonState(language);
    const lesson = getActiveLesson(state, language);
    const activeChapter = getActiveChapter(state, language);

    return {
        container,
        language,
        state,
        lesson,
        activeChapter,
        rerender
    };
}

export function attachGuideInteractions(
    container: HTMLElement,
    language: ScriptLanguage,
    rerender: RenderMissionGuidePanel
): void {
    const context = createGuideInteractionContext(container, language, rerender);
    logGuideEvent('interactions_attached', buildGuideEventContext(context));
    attachGuideWorkspace(context);
    attachGuideNavigationBindings(context);
    attachGuideActionBindings(context);
}
