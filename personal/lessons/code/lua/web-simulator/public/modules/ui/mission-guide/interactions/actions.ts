import { summarizeGuideDiagnostics, logGuideEvent } from '../support/logging.js';
import { buildGuideEventContext, resetGuideRuntimeView, type GuideInteractionContext } from './context.js';
import { canLaunchLesson, launchLesson } from './launch.js';
import { evaluateLesson } from '../evaluation/index.js';
import {
    buildTargetWorkspaceXml,
    extractMissionGuideSequence,
    serializeWorkspaceXml,
    getMainBlocklyWorkspace,
    loadMainBlocklyXml,
    setBlocklyEditorEnabled
} from '../../../editor/index.js';
import {
    setLessonBanner,
    setLessonChecked,
    setLessonCompleted,
    setActiveGuideStep
} from '../state.js';

function getMainWorkspaceSnapshot(): {
    sequenceIds: string[];
    workspaceXml: string;
} | null {
    const workspace = getMainBlocklyWorkspace();
    if (!workspace) return null;

    return {
        sequenceIds: extractMissionGuideSequence(workspace),
        workspaceXml: serializeWorkspaceXml(workspace)
    };
}

function executeLessonLaunch(
    context: GuideInteractionContext,
    evaluation: ReturnType<typeof evaluateLesson>,
    checkedBeforeLaunch: boolean,
    emptyWorkspaceMessage = 'Сначала соберите хотя бы минимальную рабочую цепочку в редакторе Blockly.'
): boolean {
    const { language, lesson, rerender } = context;
    const snapshot = getMainWorkspaceSnapshot();
    const sequenceIds = snapshot ? snapshot.sequenceIds : [];

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

    launchLesson(language, lesson, rerender, evaluation.solved
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
            logGuideEvent('lesson_state_reset', buildGuideEventContext(context), 'warn');
            resetGuideRuntimeView();
            setLessonChecked(language, lesson.id, false);
            setLessonBanner(language, lesson.id, null);
            rerender(language);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-fill]').forEach((element) => {
        element.addEventListener('click', () => {
            logGuideEvent('solution_fill_requested', buildGuideEventContext(context));
            loadMainBlocklyXml(buildTargetWorkspaceXml(lesson.id, lesson.targetBlockIds)).then(() => {
                setLessonChecked(language, lesson.id, true);
                setLessonBanner(language, lesson.id, {
                    kind: 'info',
                    message: 'Эталонная последовательность загружена в редактор Blockly.'
                });
                logGuideEvent('solution_fill_applied', {
                    ...buildGuideEventContext(context),
                    targetSequence: lesson.targetBlockIds
                }, 'success');
                rerender(language);
            });
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-open-editor]').forEach((element) => {
        element.addEventListener('click', () => {
            logGuideEvent('open_main_editor_requested', buildGuideEventContext(context));
            (window as any).closeMissionGuideModal?.();
            setBlocklyEditorEnabled(true);
            logGuideEvent('open_main_editor_applied', buildGuideEventContext(context), 'success');
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-check]').forEach((element) => {
        element.addEventListener('click', () => {
            const snapshot = getMainWorkspaceSnapshot();
            const sequenceIds = snapshot ? snapshot.sequenceIds : [];
            const workspaceXml = snapshot ? snapshot.workspaceXml : null;
            logGuideEvent('check_clicked', {
                ...buildGuideEventContext(context),
                sequenceLength: sequenceIds.length,
                sequence: sequenceIds,
                workspaceXmlLength: workspaceXml?.length || 0
            });

            if (!snapshot) {
                setLessonChecked(language, lesson.id, false);
                setLessonBanner(language, lesson.id, {
                    kind: 'warning',
                    message: 'Включите редактор Blockly (кнопка «Blockly» над редактором) и соберите цепочку команд.'
                });
                rerender(language);
                return;
            }

            const evaluation = evaluateLesson(lesson, sequenceIds, workspaceXml);
            logGuideEvent('check_evaluated', {
                ...buildGuideEventContext(context),
                solved: evaluation.solved,
                complete: evaluation.complete,
                diagnosticsCount: evaluation.diagnostics.length,
                diagnostics: summarizeGuideDiagnostics(evaluation.diagnostics)
            }, evaluation.solved ? 'success' : evaluation.diagnostics.some((diagnostic) => diagnostic.kind === 'error') ? 'warn' : 'info');
            setLessonChecked(language, lesson.id, true);
            setActiveGuideStep(language, lesson.id, 'check');

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
            const snapshot = getMainWorkspaceSnapshot();
            const evaluation = evaluateLesson(
                lesson,
                snapshot ? snapshot.sequenceIds : [],
                snapshot ? snapshot.workspaceXml : null
            );
            const hasChecked = element.dataset.guideLaunch === 'checked';
            executeLessonLaunch(context, evaluation, hasChecked);
        });
    });
}