import { setCurrentScriptLanguage } from '../../../core/state.js';
import { setEditorLanguage, setEditorValue } from '../../../editor/index.js';
import { restartAndRunSimulation } from '../../../app/simulation-controls.js';
import { openApiDocsCatalog, renderApiDocs } from '../../api-docs/index.js';
import type { ScriptLanguage } from '../../api-docs/sections.js';
import { logGuideEvent } from '../support/logging.js';
import { getGuideLessonState } from '../lessons.js';
import { setMissionGuideScenePreviewActive } from '../support/scene-preview.js';
import {
    getActiveLesson,
    setActiveLessonId,
    setLessonBanner,
    setLessonSequence,
    getLessonSequence,
    getLessonWorkspaceState,
    setLessonChecked,
    isLessonGeneratedCodeVisible,
    isLessonSolutionVisible,
    setLessonGeneratedCodeVisible,
    setLessonSolutionVisible,
    setLessonWorkspaceState
} from '../state.js';
import type { GuideLesson, RenderMissionGuidePanel } from '../types.js';
import { Blockly, compileMissionGuideWorkspace, extractMissionGuideSequence, initBlocklyDefinitions } from '../blockly.js';
import { evaluateLesson } from '../evaluation/index.js';

let workspace: Blockly.WorkspaceSvg | null = null;
let blocklyInitialized = false;
const blocklyTheme = Blockly.Theme.defineTheme('pioneer-light-blockly', {
    name: 'pioneer-light-blockly',
    base: Blockly.Themes.Classic,
    componentStyles: {
        workspaceBackgroundColour: 'transparent',
        toolboxBackgroundColour: '#ffffff',
        toolboxForegroundColour: '#1a1a1a',
        flyoutBackgroundColour: '#f8f9fa',
        flyoutForegroundColour: '#1a1a1a',
        scrollbarColour: '#cbd5df',
        insertionMarkerColour: '#ff6b00',
        insertionMarkerOpacity: 0.28,
        markerColour: '#ff6b00',
        cursorColour: '#ff6b00'
    }
});

export function updateGeneratedCodePreview(language: ScriptLanguage, activeWorkspace: Blockly.WorkspaceSvg): void {
    const codePreview = document.getElementById('blockly-generated-code');
    if (!codePreview) return;

    const code = compileMissionGuideWorkspace(language, activeWorkspace);
    codePreview.textContent = code || '-- Пусто --';
}

export function renderUncheckedSummary(): string {
    return `
        <div class="guide-check-status guide-check-status--info">
            Цепочка изменилась. Нажмите «Проверить и запустить», чтобы заново проверить решение.
        </div>
    `;
}

export function renderUncheckedDiagnostics(): string {
    return '<div class="guide-empty-state">После изменений старая проверка скрыта. Запустите новую проверку, когда закончите правки.</div>';
}

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

export function launchLesson(
    language: ScriptLanguage,
    lesson: GuideLesson,
    rerender: RenderMissionGuidePanel,
    activeWorkspace: Blockly.WorkspaceSvg | null,
    banner: { kind: 'info' | 'warning'; message: string }
): void {
    if (!activeWorkspace) return;
    const code = compileMissionGuideWorkspace(language, activeWorkspace);
    logGuideEvent('launch_requested', {
        language,
        lessonId: lesson.id,
        bannerKind: banner.kind,
        codeLength: code.length,
        code
    }, banner.kind === 'warning' ? 'warn' : 'info');

    const languageSelect = document.getElementById('script-language-select') as HTMLSelectElement | null;

    setCurrentScriptLanguage(language);
    if (languageSelect) languageSelect.value = language;
    setEditorLanguage(language);
    setEditorValue(code);
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

