import { getEditorValue, getMainBlocklyWorkspace, serializeWorkspaceXml } from '../../../editor/index.js';
import { setActiveGuideStep, setLessonBanner, setLessonCompleted } from '../state.js';
import type { RenderMissionGuidePanel } from '../types.js';
import { getWalkthroughContent, type WalkthroughLesson } from '../walkthrough/content.js';
import { getMissionGuideDraft } from '../support/monaco-preview.js';
import { resetWalkthroughResult } from '../walkthrough/state.js';
import { resetSimulationState } from '../../../app/simulation-controls.js';
import { answerWalkthrough, canCompleteWalkthrough, moveWalkthrough, WALKTHROUGH_STEPS, walkthroughKey, type WalkthroughStep } from '../walkthrough/state.js';

export function getWalkthroughSource(blockly: boolean): string {
    const workspace = blockly ? getMainBlocklyWorkspace() : null;
    return blockly ? (workspace ? serializeWorkspaceXml(workspace) : '') : getEditorValue();
}

export function attachWalkthroughBindings(container: HTMLElement, language: 'lua' | 'python', lesson: WalkthroughLesson, rerender: RenderMissionGuidePanel): void {
    const key = walkthroughKey(language, lesson.id);
    const content = getWalkthroughContent(lesson);
    const blockly = 'blocks' in lesson;
    const source = () => blockly ? getWalkthroughSource(true) : getMissionGuideDraft(language, lesson.id, lesson.starterCode);
    const move = (step: WalkthroughStep) => {
        if (!moveWalkthrough(key, step, content.correct, source())) return;
        setActiveGuideStep(language, lesson.id, step === 'build' ? 'build' : step === 'check' ? 'check' : 'theory');
        rerender(language);
        container.querySelector<HTMLElement>('#guide-walkthrough-content')?.focus({ preventScroll: true });
    };
    container.querySelectorAll<HTMLButtonElement>('button[data-walkthrough-step]').forEach(button => {
        button.addEventListener('click', () => {
            const step = button.dataset.walkthroughStep as WalkthroughStep;
            if (WALKTHROUGH_STEPS.includes(step)) move(step);
        });
    });
    container.querySelectorAll<HTMLButtonElement>('[data-walkthrough-answer]').forEach(button => {
        button.addEventListener('click', () => {
            answerWalkthrough(key, Number(button.dataset.walkthroughAnswer), content.correct);
            rerender(language);
        });
    });
    // Existing practice/result views use these controls to return to their editor.
    container.querySelectorAll<HTMLButtonElement>('[data-guide-step="build"]').forEach(button => {
        button.addEventListener('click', () => move('build'));
    });
    container.querySelector<HTMLButtonElement>('[data-walkthrough-cancel]')?.addEventListener('click', () => {
        resetWalkthroughResult(key);
        resetSimulationState();
        setLessonBanner(language, lesson.id, { kind: 'info', message: 'Проверка остановлена. Черновик сохранён — можно изменить код и запустить снова.' });
        move('build');
    });
    container.querySelector<HTMLButtonElement>('[data-walkthrough-finish]')?.addEventListener('click', () => {
        if (!canCompleteWalkthrough(key, content.correct, source())) return;
        setLessonCompleted(language, lesson.id, true);
        rerender(language);
    });
}
