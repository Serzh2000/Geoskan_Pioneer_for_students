import {
    getActiveChapter,
    getActiveLesson
} from './state.js';
import { getGuideLessonState } from './lessons.js';
import { logGuideEvent } from './guide-logging.js';
import { buildGuideEventContext, type GuideInteractionContext } from './interaction-context.js';
import { attachGuideActionBindings } from './interactions-actions.js';
import { attachGuideNavigationBindings } from './interactions-navigation.js';
import { attachGuideWorkspace } from './interactions-workspace.js';
import type { RenderMissionGuidePanel } from './types.js';
import type { ScriptLanguage } from '../api-docs/sections.js';

export function attachGuideInteractions(
    container: HTMLElement,
    language: ScriptLanguage,
    rerender: RenderMissionGuidePanel
): void {
    const state = getGuideLessonState(language);
    const lesson = getActiveLesson(state, language);
    const activeChapter = getActiveChapter(state, language);
    const context: GuideInteractionContext = {
        container,
        language,
        state,
        lesson,
        activeChapter,
        rerender
    };

    logGuideEvent('interactions_attached', buildGuideEventContext(context));
    attachGuideWorkspace(context);
    attachGuideNavigationBindings(context);
    attachGuideActionBindings(context);
}
