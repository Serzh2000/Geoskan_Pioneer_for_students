import { summarizeGuideDiagnostics, logGuideEvent } from '../support/logging.js';
import { buildGuideEventContext, resetGuideRuntimeView, type GuideInteractionContext } from './context.js';
import { canLaunchLesson, launchLesson } from './launch.js';
import {
    buildTargetWorkspaceXml,
    clearGuideWorkspace,
    fillGuideWorkspace,
    getGuideWorkspace
} from './workspace.js';
import { evaluateLesson } from '../evaluation/index.js';
import {
    getLessonSequence,
    getLessonWorkspaceState,
    isLessonGeneratedCodeVisible,
    isLessonSolutionVisible,
    setLessonBanner,
    setLessonChecked,
    setLessonCompleted,
    setLessonGeneratedCodeVisible,
    setLessonSolutionVisible,
    setLessonWorkspaceState
} from '../state.js';

function executeLessonLaunch(
    context: GuideInteractionContext,
    evaluation: ReturnType<typeof evaluateLesson>,
    checkedBeforeLaunch: boolean,
    emptyWorkspaceMessage = 'Сначала соберите хотя бы минимальную рабочую цепочку.'
): boolean {
    const { language, lesson, rerender } = context;
    const sequenceIds = getLessonSequence(language, lesson.id);

    logGuideEvent('launch_button_clicked', {
        ...buildGuideEventContext(context),
        sequenceLength: sequenceIds.length,
        checkedBeforeLaunch
    });

    if (!canLaunchLesson(sequenceIds, evaluation.diagnostics)) {
        resetGuideRuntimeView();
        setLessonBanner(language, lesson.id, {
            kind: 'warning',
            message: emptyWorkspaceMessage
        });
        rerender(language);
        return false;
    }

    launchLesson(language, lesson, rerender, getGuideWorkspace(), evaluation.solved
        ? {
            kind: 'info',
            message: 'Проверка выполнена, сценарий сразу запущен. Сравните сцену с целью урока.'
        }
        : {
            kind: 'warning',
            message: 'Проверка выполнена, сценарий запущен с замечаниями. Ошибки рантайма покажет стандартный обработчик.'
        });
    return true;
}

export function attachGuideActionBindings(context: GuideInteractionContext): void {
    const { container, language, lesson, rerender } = context;

    container.querySelectorAll<HTMLElement>('[data-guide-reset]').forEach((element) => {
        element.addEventListener('click', () => {
            logGuideEvent('workspace_reset', buildGuideEventContext(context), 'warn');
            resetGuideRuntimeView();
            clearGuideWorkspace();
            setLessonWorkspaceState(language, lesson.id, null);
            setLessonChecked(language, lesson.id, false);
            setLessonBanner(language, lesson.id, null);
            rerender(language);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-fill]').forEach((element) => {
        element.addEventListener('click', () => {
            logGuideEvent('solution_fill_requested', buildGuideEventContext(context));
            fillGuideWorkspace(buildTargetWorkspaceXml(lesson.id, lesson.targetBlockIds));
            setLessonChecked(language, lesson.id, true);
            setLessonBanner(language, lesson.id, {
                kind: 'info',
                message: 'В рабочую область подставлена эталонная последовательность.'
            });
            logGuideEvent('solution_fill_applied', {
                ...buildGuideEventContext(context),
                targetSequence: lesson.targetBlockIds
            }, 'success');
            rerender(language);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-check]').forEach((element) => {
        element.addEventListener('click', () => {
            const sequenceIds = getLessonSequence(language, lesson.id);
            const workspaceXml = getLessonWorkspaceState(language, lesson.id);
            logGuideEvent('check_clicked', {
                ...buildGuideEventContext(context),
                sequenceLength: sequenceIds.length,
                sequence: sequenceIds,
                workspaceXmlLength: workspaceXml?.length || 0
            });

            const evaluation = evaluateLesson(lesson, sequenceIds, workspaceXml);
            logGuideEvent('check_evaluated', {
                ...buildGuideEventContext(context),
                solved: evaluation.solved,
                complete: evaluation.complete,
                diagnosticsCount: evaluation.diagnostics.length,
                diagnostics: summarizeGuideDiagnostics(evaluation.diagnostics)
            }, evaluation.solved ? 'success' : evaluation.diagnostics.some((diagnostic) => diagnostic.kind === 'error') ? 'warn' : 'info');
            setLessonChecked(language, lesson.id, true);

            if (evaluation.solved) {
                setLessonCompleted(language, lesson.id, true);
                logGuideEvent('check_passed_autolaunch', buildGuideEventContext(context), 'success');
                executeLessonLaunch(context, evaluation, true);
                return;
            }

            logGuideEvent('check_decision_keep_editing', {
                ...buildGuideEventContext(context),
                diagnostics: summarizeGuideDiagnostics(evaluation.diagnostics)
            }, 'warn');
            executeLessonLaunch(
                context,
                evaluation,
                true,
                'Проверка завершена, но рабочая область пока пуста. Добавьте хотя бы одну команду.'
            );
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-launch]').forEach((element) => {
        element.addEventListener('click', () => {
            const workspaceXml = getLessonWorkspaceState(language, lesson.id);
            const evaluation = evaluateLesson(lesson, getLessonSequence(language, lesson.id), workspaceXml);
            const hasChecked = element.dataset.guideLaunch === 'checked';
            executeLessonLaunch(context, evaluation, hasChecked);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-toggle-code]').forEach((element) => {
        element.addEventListener('click', () => {
            logGuideEvent('toggle_generated_code', {
                ...buildGuideEventContext(context),
                nextVisible: !isLessonGeneratedCodeVisible(language, lesson.id)
            });
            setLessonGeneratedCodeVisible(language, lesson.id, !isLessonGeneratedCodeVisible(language, lesson.id));
            rerender(language);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-toggle-solution]').forEach((element) => {
        element.addEventListener('click', () => {
            logGuideEvent('toggle_solution', {
                ...buildGuideEventContext(context),
                nextVisible: !isLessonSolutionVisible(language, lesson.id)
            });
            setLessonSolutionVisible(language, lesson.id, !isLessonSolutionVisible(language, lesson.id));
            rerender(language);
        });
    });
}
