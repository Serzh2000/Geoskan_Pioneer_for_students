import { resetSimulationState } from '../../app/simulation-controls.js';
import { restoreMissionGuideScenePreview } from './scene-preview.js';
import type { GuideChapter, GuideLesson, GuideLessonState, RenderMissionGuidePanel } from './types.js';
import type { ScriptLanguage } from '../api-docs/sections.js';

export type GuideInteractionContext = {
    container: HTMLElement;
    language: ScriptLanguage;
    state: GuideLessonState;
    lesson: GuideLesson;
    activeChapter: GuideChapter;
    rerender: RenderMissionGuidePanel;
};

export function buildGuideEventContext(context: GuideInteractionContext): Record<string, unknown> {
    return {
        language: context.language,
        lessonId: context.lesson.id,
        chapterId: context.activeChapter.id
    };
}

export function resetGuideRuntimeView(): void {
    restoreMissionGuideScenePreview();
    resetSimulationState();
}
