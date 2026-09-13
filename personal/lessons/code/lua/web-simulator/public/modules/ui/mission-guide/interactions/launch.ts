import { setCurrentScriptLanguage } from '../../../core/state.js';
import { getEditorValue, setEditorLanguage } from '../../../editor/index.js';
import { restartAndRunSimulation } from '../../../app/simulation-controls.js';
import { renderApiDocs } from '../../api-docs/index.js';
import type { ScriptLanguage } from '../../api-docs/sections.js';
import { logGuideEvent } from '../support/logging.js';
import { setMissionGuideScenePreviewActive } from '../support/scene-preview.js';
import { setLessonBanner } from '../state.js';
import type { GuideLesson, RenderMissionGuidePanel } from '../types.js';

export function canLaunchLesson(sequenceIds: string[], diagnostics: Array<{ kind: string }>): boolean {
    const launchAllowed = sequenceIds.length > 0;
    logGuideEvent('launch_gate_evaluated', {
        sequenceLength: sequenceIds.length,
        diagnostics: diagnostics.map((diagnostic) => diagnostic.kind),
        launchAllowed,
        reason: launchAllowed ? 'workspace_has_blocks' : 'workspace_is_empty'
    }, launchAllowed ? 'info' : 'warn');
    return launchAllowed;
}

export async function launchLesson(
    language: ScriptLanguage,
    lesson: GuideLesson,
    rerender: RenderMissionGuidePanel,
    banner: { kind: 'info' | 'warning'; message: string }
): Promise<void> {
    const languageSelect = document.getElementById('script-language-select') as HTMLSelectElement | null;

    setCurrentScriptLanguage(language);
    if (languageSelect) languageSelect.value = language;
    await setEditorLanguage(language);

    const code = getEditorValue();
    logGuideEvent('launch_requested', {
        language,
        lessonId: lesson.id,
        bannerKind: banner.kind,
        codeLength: code.length,
        code
    }, banner.kind === 'warning' ? 'warn' : 'info');

    renderApiDocs(language);
    setLessonBanner(language, lesson.id, banner);

    setMissionGuideScenePreviewActive(true);
    rerender(language);
    restartAndRunSimulation();
    logGuideEvent('launch_started', {
        language,
        lessonId: lesson.id,
        bannerKind: banner.kind
    }, banner.kind === 'warning' ? 'warn' : 'success');
}