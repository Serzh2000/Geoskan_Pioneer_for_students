import { openGuideReference } from './reference.js';
import { restartAndRunSimulation } from '../../../app/simulation-controls.js';
import { setCurrentScriptLanguage } from '../../../core/state.js';
import { getEditorValue, setEditorLanguage } from '../../../editor/index.js';
import { runTextLessonCheck } from '../evaluation/text/index.js';
import { getLuaTextLessonState } from '../lessons/catalog/lua-text.js';
import { getPythonTextLessonState } from '../lessons/catalog/python-text.js';
import { setMissionGuideScenePreviewActive } from '../support/scene-preview.js';
import { logGuideEvent } from '../support/logging.js';
import { resetGuideRuntimeView } from './context.js';
import {
    getActiveTextLesson,
    getNextTextLesson,
    getPreviousTextLesson,
    isLessonCompleted,
    isTextLessonUnlocked,
    setActiveGuideStep,
    setActiveLessonId,
    setLastTextEvaluation,
    setLessonBanner,
    setLessonChecked,
    setLessonCompleted
} from '../state.js';
import type { RenderMissionGuidePanel } from '../types.js';

// Rough per-topic wait budget before snapshotting simulator state (see
// evaluation/text/index.ts — there is no "script finished" signal in the
// codebase, so this is a deliberate, per-lesson-shape guess: a single LED
// call resolves almost instantly, while a full takeoff-route-landing mission
// needs real simulated flight time). Expect to retune these against the real
// simulator's flight speed once this is used for real.
const WAIT_MS_BY_TOPIC: Record<string, number> = {
    'led-single': 1200,
    'led-sequence': 4200,
    'led-confirm': 1200,
    'led-delayed': 2500,
    'preflight': 2000,
    'takeoff': 4500,
    'route': 6000,
    'point-confirm': 7000,
    'mission': 11000,
    'landing': 9000
};

export function attachTextGuideBindings(
    container: HTMLElement,
    track: 'lua' | 'python',
    rerender: RenderMissionGuidePanel
): void {
    const state = track === 'python' ? getPythonTextLessonState() : getLuaTextLessonState();
    const lesson = getActiveTextLesson(state, track);

    container.querySelectorAll<HTMLElement>('[data-guide-step]').forEach((element) => {
        element.addEventListener('click', () => {
            const step = element.dataset.guideStep;
            if (step !== 'theory' && step !== 'build' && step !== 'check') return;
            setActiveGuideStep(track, lesson.id, step);
            rerender(track);
        });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-guide-text-lesson]').forEach((button) => {
        button.addEventListener('click', () => {
            const lessonId = button.dataset.guideTextLesson;
            if (!lessonId || !isTextLessonUnlocked(state, track, lessonId)) return;
            resetGuideRuntimeView();
            setActiveLessonId(track, lessonId);
            rerender(track);
        });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-guide-query]').forEach((button) => {
        button.addEventListener('click', () => {
            openGuideReference({ language: track, query: button.dataset.guideQuery || '', previewKey: button.dataset.guidePreview || null });
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-nav]').forEach((element) => {
        element.addEventListener('click', () => {
            const direction = element.dataset.guideNav;
            const targetLesson = direction === 'next'
                ? getNextTextLesson(state, lesson.id)
                : getPreviousTextLesson(state, lesson.id);
            if (!targetLesson) return;
            if (direction === 'next' && !isLessonCompleted(track, lesson.id)) return;
            setActiveLessonId(track, targetLesson.id);
            rerender(track);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-text-reset]').forEach((element) => {
        element.addEventListener('click', () => {
            logGuideEvent('text_lesson_state_reset', { track, lessonId: lesson.id }, 'warn');
            resetGuideRuntimeView();
            setLessonChecked(track, lesson.id, false);
            setLessonBanner(track, lesson.id, null);
            rerender(track);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-text-check]').forEach((element) => {
        element.addEventListener('click', () => {
            void runTextCheck(element as HTMLButtonElement);
        });
    });

    async function runTextCheck(button: HTMLButtonElement): Promise<void> {
        const waitMs = WAIT_MS_BY_TOPIC[lesson.topicId] ?? 3000;
        const originalLabel = button.textContent;
        button.disabled = true;
        button.textContent = `Проверяю… (~${Math.round(waitMs / 1000)} с)`;

        setCurrentScriptLanguage(track);
        await setEditorLanguage(track);
        const code = getEditorValue();

        if (!code || !code.trim()) {
            setLessonChecked(track, lesson.id, false);
            setLessonBanner(track, lesson.id, {
                kind: 'warning',
                message: 'Редактор пуст — напишите код перед проверкой.'
            });
            button.disabled = false;
            if (originalLabel) button.textContent = originalLabel;
            rerender(track);
            return;
        }

        logGuideEvent('text_check_clicked', { track, lessonId: lesson.id, topicId: lesson.topicId, codeLength: code.length });

        setMissionGuideScenePreviewActive(true);
        restartAndRunSimulation();

        const evaluation = await runTextLessonCheck(lesson.topicId, { waitMs });

        logGuideEvent('text_check_evaluated', {
            track,
            lessonId: lesson.id,
            topicId: lesson.topicId,
            solved: evaluation.solved,
            diagnosticsCount: evaluation.diagnostics.length
        }, evaluation.solved ? 'success' : 'info');

        setLastTextEvaluation(track, lesson.id, evaluation);
        setLessonChecked(track, lesson.id, true);
        setActiveGuideStep(track, lesson.id, 'check');
        setLessonBanner(track, lesson.id, evaluation.solved
            ? { kind: 'info', message: 'Проверка выполнена, сценарий запущен. Сравните сцену с целью урока.' }
            : { kind: 'warning', message: 'Проверка выполнена, есть замечания — посмотрите разбор ниже.' });
        if (evaluation.solved) {
            setLessonCompleted(track, lesson.id, true);
        }

        rerender(track);
    }
}
