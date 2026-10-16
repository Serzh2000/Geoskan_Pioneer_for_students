import {
    getActiveChapter,
    getActiveLesson,
    getActivePracticeTrack
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
    const track = getActivePracticeTrack();
    if (track !== 'blockly') {
        void import('./interactions/text-actions.js')
            .then(({ attachTextGuideBindings }) => {
                attachTextGuideBindings(container, track, rerender);
            })
            .catch((error) => {
                console.error('Failed to load text-track interactions', error);
            });
        return;
    }

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
            '[data-guide-reset], [data-guide-fill], [data-guide-check], [data-guide-launch], [data-guide-open-editor]'
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
}
