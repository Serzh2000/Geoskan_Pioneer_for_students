import { openGuideReference } from './reference.js';
import { beginWalkthroughCheck, finishWalkthroughCheck, isWalkthroughCheckCurrent, resetWalkthroughResult, walkthroughKey } from '../walkthrough/state.js';
import { getWalkthroughContent } from '../walkthrough/content.js';
import { getAcademySceneEvidence } from '../academy/scene.js';
import { WALKTHROUGH_WAIT_MS } from '../walkthrough/runtime.js';
import { resetSimulationState, restartAndRunSimulation } from '../../../app/simulation-controls.js';
import { currentDroneId, setCurrentScriptLanguage } from '../../../core/state.js';
import { beginLearningCapture, finishLearningCapture } from '../../../core/learning-journal.js';
import { getEditorValue, setEditorLanguage, setEditorValue } from '../../../editor/index.js';
import { getTemporaryDocumentToken } from '../../../editor/index/temporary-document.js';
import { runTextLessonCheck } from '../evaluation/text/index.js';
import { getLuaTextLessonState } from '../lessons/catalog/lua-text.js';
import { getPythonTextLessonState } from '../lessons/catalog/python-text.js';
import { setMissionGuideScenePreviewActive } from '../support/scene-preview.js';
import { logGuideEvent } from '../support/logging.js';
import { resetGuideRuntimeView } from './context.js';
import { getMissionGuideDraft } from '../support/monaco-preview.js';
import {
    getActiveTextLesson,
    getNextTextLesson,
    getPreviousTextLesson,
    isLessonCompleted,
    isTextLessonUnlocked,
    setActiveGuideStep,
    setActiveLessonId,
    setLessonBanner,
    setLessonChecked,
    setLessonCompleted,
} from '../state.js';
import { isBookView } from '../book/view.js';
import type { GuideEvaluation, RenderMissionGuidePanel } from '../types.js';

const repeatedExperiments = new Map<string, string>();
const experimentTrials = new Map<string, Set<string>>();
const replacedDrafts = new Map<string, string>();

export function attachTextGuideBindings(
    container: HTMLElement,
    track: 'lua' | 'python',
    rerender: RenderMissionGuidePanel
): void {
    const state = track === 'python' ? getPythonTextLessonState() : getLuaTextLessonState();
    const lesson = getActiveTextLesson(state, track);
    const draftKey = walkthroughKey(track, lesson.id);
    const undo = container.querySelector<HTMLButtonElement>('[data-guide-text-undo]');
    if (undo) undo.hidden = !replacedDrafts.has(draftKey);
    undo?.addEventListener('click', () => {
        const previous = replacedDrafts.get(draftKey);
        if (previous === undefined) return;
        void setEditorValue(previous).then(() => {
            replacedDrafts.delete(draftKey);
            resetWalkthroughResult(draftKey);
            rerender(track);
        });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-guide-text-starter]').forEach(button => {
        button.addEventListener('click', () => {
            replacedDrafts.set(draftKey, getEditorValue());
            void setEditorValue(lesson.starterCode).then(() => {
            resetWalkthroughResult(walkthroughKey(track, lesson.id));
            rerender(track);
            const status = container.querySelector<HTMLElement>('[data-guide-draft-status]');
            if (status) status.textContent = 'Заготовка восстановлена. Кнопка «Отменить замену» вернёт ваш код.';
            });
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-step]:not([data-guide-step="build"])').forEach((element) => {
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
            const experimentKey = `${currentDroneId}:${track}:${lesson.id}`;
            repeatedExperiments.delete(experimentKey);
            experimentTrials.delete(experimentKey);
            resetWalkthroughResult(walkthroughKey(track, lesson.id));
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
        const documentToken = getTemporaryDocumentToken();
        const waitMs = lesson.academy ? lesson.academy.waitMs ?? (lesson.academy.number === 4 ? 1800 : 1200) : WALKTHROUGH_WAIT_MS[lesson.topicId] ?? 3000;
        const originalLabel = button.textContent;
        button.disabled = true;
        button.textContent = lesson.academy?.doneMessage ? 'Проверяю выполнение опыта…' : `Проверяю… (~${Math.round(waitMs / 1000)} с)`;

        setCurrentScriptLanguage(track);
        const draft = getMissionGuideDraft(track, lesson.id, lesson.starterCode);
        await setEditorLanguage(track);
        if (getTemporaryDocumentToken() !== documentToken) return;
        await setEditorValue(lesson.academy?.mode === 'inspect' ? lesson.starterCode : draft);
        if (getTemporaryDocumentToken() !== documentToken) return;
        const code = getEditorValue();
        const experimentKey = `${currentDroneId}:${track}:${lesson.id}`;
        if ([54, 107].includes(lesson.academy?.number || 0) && repeatedExperiments.get(experimentKey) !== code) experimentTrials.delete(experimentKey);
        const activity = {
            code,
            lift: container.querySelector<HTMLInputElement>('[data-academy-part="lift"]:checked')?.value,
            vision: container.querySelector<HTMLInputElement>('[data-academy-part="vision"]:checked')?.value,
            previousRun: repeatedExperiments.get(experimentKey) === code,
            trials: [...(experimentTrials.get(experimentKey) || [])], scene: getAcademySceneEvidence()
        };

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
        const key = walkthroughKey(track, lesson.id);
        const token = beginWalkthroughCheck(key, getWalkthroughContent(lesson).correct);
        setLessonChecked(track, lesson.id, false);
        setActiveGuideStep(track, lesson.id, 'check');
        setLessonBanner(track, lesson.id, null);
        const capture = lesson.academy ? { droneId: currentDroneId, token: beginLearningCapture(currentDroneId) } : undefined;
        rerender(track);
        try {
            await restartAndRunSimulation();
            if (!isWalkthroughCheckCurrent(key, token)) {
                if (capture) finishLearningCapture(capture.droneId, capture.token);
                resetSimulationState();
                return;
            }
        } catch {
            if (capture) finishLearningCapture(capture.droneId, capture.token);
            if (finishWalkthroughCheck(key, token, code, { solved: false, complete: false, diagnostics: [{ kind: 'error', title: 'Запуск прервался', reason: 'Интерпретатор не смог начать опыт.', fix: 'Проверьте первую ошибку в журнале и повторите запуск.' }] })) rerender(track);
            return;
        }

        const evaluation: GuideEvaluation = await runTextLessonCheck(lesson.topicId, { waitMs, language: track, capture, activity, doneMessage: lesson.academy?.doneMessage, isCurrent: () => isWalkthroughCheckCurrent(key, token) }).catch(() => ({
            solved: false, complete: false, diagnostics: [{ kind: 'error' as const,
                title: 'Не удалось завершить проверку', reason: 'Чтение состояния прервалось.', fix: 'Вернитесь к практике и повторите запуск.' }]
        }));
        if (capture) finishLearningCapture(capture.droneId, capture.token);
        if (!finishWalkthroughCheck(key, token, code, evaluation)) return;
        // In the book a passed practice is the end of the lesson; the plain page asks for the review first.
        if (evaluation.solved && isBookView()) setLessonCompleted(track, lesson.id, true);

        if ([5, 54, 107].includes(lesson.academy?.number || 0) && !evaluation.diagnostics.some(item => item.kind === 'error')) {
            repeatedExperiments.set(experimentKey, code);
        }
        if (evaluation.academyTrial) {
            const trials = experimentTrials.get(experimentKey) || new Set<string>();
            trials.add(evaluation.academyTrial);
            experimentTrials.set(experimentKey, trials);
        }

        logGuideEvent('text_check_evaluated', {
            track,
            lessonId: lesson.id,
            topicId: lesson.topicId,
            solved: evaluation.solved,
            diagnosticsCount: evaluation.diagnostics.length
        }, evaluation.solved ? 'success' : 'info');

        setLessonChecked(track, lesson.id, true);
        setActiveGuideStep(track, lesson.id, 'check');
        setLessonBanner(track, lesson.id, evaluation.solved
            ? { kind: 'info', message: 'Проверка выполнена, сценарий запущен. Сравните сцену с целью урока.' }
            : { kind: 'warning', message: 'Проверка выполнена, есть замечания — посмотрите разбор ниже.' });
        rerender(track);
    }
}
