import type { GuideDiagnostic, GuideEvaluation, GuideLesson } from './types.js';
import { getCallbackDiagnostics } from './evaluation/callbacks.js';
import {
    getExtraBlockDiagnostics,
    getMissingBlockDiagnostics,
    solvedDiagnostic,
    uniqueDiagnostics
} from './evaluation/diagnostics.js';
import {
    getStructureDiagnostics,
    matchesLuaLedSequenceWorkspace,
    validateLuaLedSequenceWorkspace
} from './evaluation/lua-led-sequence.js';
import { findFirstBlockByType, hasNumericFieldValue, parseWorkspaceXml } from './evaluation/xml.js';

export function evaluateLesson(lesson: GuideLesson, sequenceIds: string[], workspaceXml?: string | null): GuideEvaluation {
    if (lesson.id === 'lua-led-sequence') {
        const diagnostics = validateLuaLedSequenceWorkspace(workspaceXml);
        const solved = diagnostics.length === 0;
        return {
            solved,
            complete: solved,
            diagnostics: uniqueDiagnostics(solved ? [solvedDiagnostic(lesson.expectedOutcome)] : diagnostics)
        };
    }

    const diagnostics: GuideDiagnostic[] = [];
    const targetSet = new Set(lesson.targetBlockIds);
    const positions = new Map(sequenceIds.map((blockId, index) => [blockId, index] as const));
    const hasAcceptedLedSequenceStructure = lesson.id === 'lua-led-sequence' && matchesLuaLedSequenceWorkspace(workspaceXml);
    const callbackOpenIndex = positions.get('lua_callback_open');
    const callbackEndIndex = positions.get('lua_callback_end');

    if (!sequenceIds.length) {
        diagnostics.push({
            kind: 'info',
            title: 'Рабочая область пока пустая',
            reason: 'Перетащите паззл-блоки в центральную цепочку. Проверка обновляется сразу после каждого шага.',
            fix: `Начните с блока "${lesson.blocks.find((block) => block.id === lesson.targetBlockIds[0])?.label || 'первого шага'}".`
        });
        return {
            solved: false,
            complete: false,
            diagnostics
        };
    }

    diagnostics.push(...getMissingBlockDiagnostics(lesson, positions));

    if (lesson.targetBlockIds.includes('lua_ledbar_new')) {
        const xmlRoot = parseWorkspaceXml(workspaceXml);
        const ledbarBlock = findFirstBlockByType(xmlRoot, 'lua_ledbar_new');
        if (ledbarBlock && !hasNumericFieldValue(ledbarBlock, 'COUNT', 29)) {
            diagnostics.push({
                kind: 'error',
                title: 'Указано неверное количество светодиодов',
                reason: 'Для Lua-уроков с `Ledbar` нужно использовать `Ledbar.new(29)`, иначе поведение светодиодов может отличаться от реального Pioneer.',
                fix: 'Откройте блок создания ленты и установите значение `29`.'
            });
        }
    }

    diagnostics.push(...getExtraBlockDiagnostics(lesson, sequenceIds, targetSet));

    for (const rule of lesson.orderRules || []) {
        const beforeIndex = positions.get(rule.before);
        const afterIndex = positions.get(rule.after);
        if (beforeIndex == null || afterIndex == null) continue;
        if (beforeIndex < afterIndex) continue;
        diagnostics.push({
            kind: 'error',
            title: rule.title,
            reason: rule.reason,
            fix: rule.fix
        });
    }

    if (callbackOpenIndex != null && callbackEndIndex != null && callbackOpenIndex >= callbackEndIndex) {
        diagnostics.push({
            kind: 'error',
            title: 'Нарушены границы callback',
            reason: 'Открывающий блок `function callback(event)` должен стоять раньше закрывающего блока `end`.',
            fix: 'Переместите `function callback(event)` выше и завершите область отдельным блоком `end`.'
        });
    }

    diagnostics.push(...getCallbackDiagnostics(sequenceIds, lesson));

    diagnostics.push(...getStructureDiagnostics(lesson, workspaceXml));

    const complete = hasAcceptedLedSequenceStructure || lesson.targetBlockIds.every((blockId) => positions.has(blockId));
    const solved = complete
        && (hasAcceptedLedSequenceStructure || sequenceIds.length === lesson.targetBlockIds.length)
        && !diagnostics.some((diagnostic) => diagnostic.kind === 'error' || diagnostic.kind === 'warning');

    const finalDiagnostics = uniqueDiagnostics(
        solved ? [solvedDiagnostic(lesson.expectedOutcome)] : diagnostics
    );

    return {
        solved,
        complete,
        diagnostics: finalDiagnostics
    };
}

export function getLessonCode(lesson: GuideLesson, sequenceIds: string[]): string {
    const code = lesson.compile(sequenceIds, lesson.blocks);
    return code || lesson.solutionCode;
}
