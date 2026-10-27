import type { ScriptLanguage } from '../../api-docs/sections.js';
import { extractMissionGuideSequence, getMainBlocklyWorkspace, serializeWorkspaceXml } from '../../../editor/index.js';
import { evaluateLesson } from '../evaluation/index.js';
import { getLessonBanner, getActiveLesson, getNextLesson, isLessonChecked, isLessonCompleted } from '../state.js';
import { isMissionGuideBlocklyPreviewActive } from '../support/blockly-preview.js';
import { isMissionGuideScenePreviewActive } from '../support/scene-preview.js';
import { getWalkthroughResult, isWalkthroughBusy, walkthroughKey } from '../walkthrough/state.js';
import type { GuideEvaluation, GuideLesson, GuideLessonState, RuntimeBanner } from '../types.js';
import { blocklyLessonCopy } from './blockly-copy.js';

/** Everything the Blockly lesson page and the Blockly book spread both read from the editor and the check. */
export type BlocklyView = {
    language: ScriptLanguage;
    state: GuideLessonState;
    lesson: GuideLesson;
    evaluation: GuideEvaluation;
    /** The workspace as saved XML: a result belongs to one version of it. */
    source: string;
    runtimeResult: GuideEvaluation | null;
    hasChecked: boolean;
    previewActive: boolean;
    blocklyPreviewActive: boolean;
    banner: RuntimeBanner | null;
    launchedWithWarnings: boolean;
    nextLesson: GuideLesson | null;
    isCompleted: boolean;
    hasWorkspaceContent: boolean;
    lessonIndex: number;
    checking: boolean;
    /** One sentence for the whole state, not three labels to decode. */
    statusLine: string;
};

export function getBlocklyView(rawState: GuideLessonState, language: ScriptLanguage): BlocklyView {
    const state = { ...rawState, lessons: rawState.lessons.map(blocklyLessonCopy) };
    const lesson = getActiveLesson(state, language);
    const mainWorkspace = getMainBlocklyWorkspace();
    const sequenceIds = mainWorkspace ? extractMissionGuideSequence(mainWorkspace) : [];
    const source = mainWorkspace ? serializeWorkspaceXml(mainWorkspace) : '';
    const evaluation = evaluateLesson(lesson, sequenceIds, mainWorkspace ? source : null);
    const key = walkthroughKey(language, lesson.id);
    const runtimeResult = getWalkthroughResult(key, source);
    const hasChecked = isLessonChecked(language, lesson.id);
    const previewActive = isMissionGuideScenePreviewActive();
    const banner = getLessonBanner(language, lesson.id);
    const hasWorkspaceContent = sequenceIds.length > 0;
    const checking = isWalkthroughBusy(key);
    const statusLine = checking
        ? 'Проверка идёт…'
        : !hasWorkspaceContent
            ? 'Соберите цепочку блоков и нажмите «Проверить и запустить»'
            : !hasChecked
                ? 'Цепочка собрана, проверка ещё не запускалась'
                : runtimeResult?.solved
                    ? 'Проверка пройдена — результат на шаге «Результат»'
                    : runtimeResult
                        ? 'Проверка нашла замечания — они на шаге «Результат»'
                        : 'Цепочка изменилась после проверки — запустите её снова';
    return {
        language, state, lesson, evaluation, source, runtimeResult, hasChecked, previewActive,
        blocklyPreviewActive: isMissionGuideBlocklyPreviewActive(), banner,
        launchedWithWarnings: hasChecked && !evaluation.solved && banner?.kind === 'warning' && previewActive,
        nextLesson: getNextLesson(state, lesson.id), isCompleted: isLessonCompleted(language, lesson.id),
        hasWorkspaceContent, lessonIndex: state.lessons.findIndex(item => item.id === lesson.id), checking, statusLine
    };
}
