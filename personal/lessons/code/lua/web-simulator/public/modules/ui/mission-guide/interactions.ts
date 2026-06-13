import {
    getActiveChapter,
    getActiveLesson
} from './state.js';
import { getGuideLessonState } from './lessons.js';
import { logGuideEvent } from './support/logging.js';
import { buildGuideEventContext, type GuideInteractionContext } from './interactions/context.js';
import { attachGuideNavigationBindings } from './interactions/navigation.js';
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
    attachGuideNavigationBindings(context);

    const hasLessonActions = Boolean(
        container.querySelector(
            '[data-guide-reset], [data-guide-fill], [data-guide-check], [data-guide-launch], [data-guide-toggle-code], [data-guide-toggle-solution]'
        )
    );

    if (hasLessonActions) {
        void import('./interactions/actions.js')
            .then(({ attachGuideActionBindings }) => {
                attachGuideActionBindings(context);
            })
            .catch((error) => {
                console.error('Failed to load guide actions', error);
            });
    }

    if (container.querySelector('#blocklyDiv')) {
        void import('./interactions/workspace.js')
            .then(({ attachGuideWorkspace }) => {
                attachGuideWorkspace(context);
            })
            .catch((error) => {
                console.error('Failed to load guide workspace', error);
            });
    }
}
