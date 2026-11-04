import type { BlocklyNS } from '../../../editor/blockly-mode/loader.js';
import { extractMissionGuideSequence } from '../../../editor/blockly-mode/workspace-xml.js';
import type { GuideLesson } from '../types.js';

/**
 * Blocks of the workspace as the check of a lesson sees them. Old assignments compare the chain of statement blocks
 * in order; a lesson on pioneer blocks asks which blocks the program uses, value blocks (colours, variables) included.
 */
export function lessonSequence(workspace: BlocklyNS.WorkspaceSvg, lesson: GuideLesson): string[] {
    if (!lesson.pioneer) return extractMissionGuideSequence(workspace);
    return workspace.getAllBlocks(false)
        .filter((block) => !block.isShadow() && !block.isInsertionMarker())
        .map((block) => block.type);
}
