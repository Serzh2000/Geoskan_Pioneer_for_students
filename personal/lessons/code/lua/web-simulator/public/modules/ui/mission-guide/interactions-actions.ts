import { summarizeGuideDiagnostics, logGuideEvent } from './guide-logging.js';
import { buildGuideEventContext, resetGuideRuntimeView, type GuideInteractionContext } from './interaction-context.js';
import { canLaunchLesson, launchLesson } from './interactions-launch.js';
import {
    buildTargetWorkspaceXml,
    clearGuideWorkspace,
    fillGuideWorkspace,
    getGuideWorkspace
} from './interactions-workspace.js';
import { evaluateLesson } from './lesson-evaluation.js';
import {
    getLessonSequence,
    getLessonWorkspaceState,
    isLessonGeneratedCodeVisible,
    isLessonSolutionVisible,
    setLessonBanner,
    setLessonChecked,
    setLessonGeneratedCodeVisible,
    setLessonSolutionVisible,
    setLessonWorkspaceState
} from './state.js';

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
                logGuideEvent('check_decision_launch_solved', buildGuideEventContext(context), 'success');
                launchLesson(language, lesson, rerender, getGuideWorkspace(), {
                    kind: 'info',
                    message: 'Сценарий запущен. Сверьте живую сцену с ожидаемым результатом.'
                });
                return;
            }

            if (canLaunchLesson(sequenceIds, evaluation.diagnostics)) {
                logGuideEvent('check_decision_launch_with_warnings', {
                    ...buildGuideEventContext(context),
                    diagnostics: summarizeGuideDiagnostics(evaluation.diagnostics)
                }, 'warn');
                launchLesson(language, lesson, rerender, getGuideWorkspace(), {
                    kind: 'warning',
                    message: 'Сценарий запущен, но решение не прошло учебную проверку. Живая сцена открыта, замечания показаны справа.'
                });
                return;
            }

            logGuideEvent('check_decision_block_launch', {
                ...buildGuideEventContext(context),
                diagnostics: summarizeGuideDiagnostics(evaluation.diagnostics)
            }, 'warn');
            resetGuideRuntimeView();
            setLessonBanner(language, lesson.id, {
                kind: 'warning',
                message: 'Проверка завершена, но запуск отменен: рабочая область пока пуста. Добавьте хотя бы одну команду и нажмите «Проверить и запустить» еще раз.'
            });
            rerender(language);
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
