import {
    findFirstBlockByType,
    hasNumericFieldValue,
    parseWorkspaceXml
} from './xml.js';
import {
    validateLuaLedSingleWorkspace
} from './lua-led-single.js';
import {
    getStructureDiagnostics,
    matchesLuaLedSequenceWorkspace,
    validateLuaLedSequenceWorkspace
} from './lua-led-sequence.js';
import type { GuideDiagnostic, GuideEvaluation, GuideLesson } from '../types.js';

function uniqueDiagnostics(diagnostics: GuideDiagnostic[]): GuideDiagnostic[] {
    const seen = new Set<string>();
    return diagnostics.filter((diagnostic) => {
        const key = `${diagnostic.kind}:${diagnostic.title}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function solvedDiagnostic(outcome: string): GuideDiagnostic {
    return {
        kind: 'success',
        title: 'Решение собрано верно',
        reason: outcome,
        fix: 'Можно запускать сценарий: код уже собирается в настоящий пример Pioneer API.'
    };
}

function hasRequiredBlockOccurrences(sequenceIds: string[], targetBlockIds: string[]): boolean {
    const available = new Map<string, number>();
    for (const blockId of sequenceIds) {
        available.set(blockId, (available.get(blockId) || 0) + 1);
    }

    return targetBlockIds.every((blockId) => {
        const count = available.get(blockId) || 0;
        if (count === 0) return false;
        available.set(blockId, count - 1);
        return true;
    });
}

function getCallbackDiagnostics(sequenceIds: string[], lesson: GuideLesson): GuideDiagnostic[] {
    if (!lesson.targetBlockIds.includes('lua_callback_open') && !lesson.targetBlockIds.includes('lua_callback_end')) {
        return [];
    }

    const diagnostics: GuideDiagnostic[] = [];
    const callbackOpenCount = sequenceIds.filter((blockId) => blockId === 'lua_callback_open').length;
    const callbackEndCount = sequenceIds.filter((blockId) => blockId === 'lua_callback_end').length;

    if (callbackOpenCount > 1) {
        diagnostics.push({
            kind: 'error',
            title: 'Callback открыт несколько раз',
            reason: 'В одном учебном Lua-сценарии нужен один контейнер `function callback(event)`, а не несколько независимых открывающих блоков.',
            fix: 'Оставьте один блок `function callback(event)` и удалите лишние открытия.'
        });
    }

    if (callbackEndCount > 1) {
        diagnostics.push({
            kind: 'error',
            title: 'Callback закрыт несколько раз',
            reason: 'Отдельный блок `end` должен завершать ровно один контейнер `function callback(event)`.',
            fix: 'Оставьте одно закрытие `end`, относящееся к callback.'
        });
    }

    let callbackDepth = 0;
    let hasEventOutsideCallback = false;
    let hasCloseWithoutOpen = false;

    sequenceIds.forEach((blockId) => {
        if (blockId === 'lua_callback_open') {
            callbackDepth += 1;
            return;
        }

        if (blockId === 'lua_callback_end') {
            if (callbackDepth === 0) {
                hasCloseWithoutOpen = true;
                return;
            }
            callbackDepth -= 1;
            return;
        }

        if (blockId === 'lua_event_callback' && callbackDepth === 0) {
            hasEventOutsideCallback = true;
        }
    });

    if (hasCloseWithoutOpen) {
        diagnostics.push({
            kind: 'error',
            title: 'Закрывающий `end` стоит без открытия callback',
            reason: 'Блок `end` для callback не может существовать сам по себе: перед ним должен быть явный блок `function callback(event)`.',
            fix: 'Поставьте `function callback(event)` раньше этого `end` или удалите лишнее закрытие.'
        });
    }

    if (hasEventOutsideCallback) {
        diagnostics.push({
            kind: 'error',
            title: 'Событийная ветка вынесена из callback',
            reason: 'Ветви `if event == ... then` должны находиться между отдельными блоками `function callback(event)` и `end`.',
            fix: 'Поместите все событийные блоки внутрь области callback.'
        });
    }

    return diagnostics;
}

export function evaluateLesson(lesson: GuideLesson, sequenceIds: string[], workspaceXml?: string | null): GuideEvaluation {
    if (!sequenceIds.length) {
        return {
            solved: false,
            complete: false,
            diagnostics: [{
                kind: 'info',
                title: 'Рабочая область пока пустая',
                reason: 'Перетащите паззл-блоки в центральную цепочку. Проверка обновляется сразу после каждого шага.',
                fix: `Начните с блока "${lesson.blocks.find((block) => block.id === lesson.targetBlockIds[0])?.label || 'первого шага'}".`
            }]
        };
    }

    const hasExactTargetSequence = sequenceIds.length === lesson.targetBlockIds.length
        && sequenceIds.every((blockId, index) => blockId === lesson.targetBlockIds[index]);
    const hasAllTargetBlocks = hasRequiredBlockOccurrences(sequenceIds, lesson.targetBlockIds);

    if (lesson.id === 'lua-led-single') {
        const diagnostics = workspaceXml
            ? validateLuaLedSingleWorkspace(workspaceXml)
            : [{
                kind: 'error' as const,
                title: 'Рабочая область не сохранена',
                reason: 'Для проверки параметров `Ledbar` и `leds:set(...)` нужен XML фактической рабочей области.',
                fix: 'Откройте задание в редакторе Blockly и соберите последовательность блоков.'
            }];
        const solved = hasExactTargetSequence && diagnostics.length === 0;
        return {
            solved,
            complete: hasExactTargetSequence,
            diagnostics: uniqueDiagnostics(solved ? [solvedDiagnostic(lesson.expectedOutcome)] : diagnostics)
        };
    }

    if (lesson.id === 'lua-led-sequence') {
        const diagnostics = workspaceXml
            ? validateLuaLedSequenceWorkspace(workspaceXml)
            : [{
                kind: 'error' as const,
                title: 'Рабочая область не сохранена',
                reason: 'Для проверки структуры таймеров и их параметров нужен XML фактической рабочей области.',
                fix: 'Откройте задание в редакторе Blockly и соберите последовательность блоков.'
            }];
        const solved = hasExactTargetSequence && diagnostics.length === 0;
        return {
            solved,
            complete: hasExactTargetSequence,
            diagnostics: uniqueDiagnostics(solved ? [solvedDiagnostic(lesson.expectedOutcome)] : diagnostics)
        };
    }

    const diagnostics: GuideDiagnostic[] = [];
    const targetSet = new Set(lesson.targetBlockIds);
    const positions = new Map(sequenceIds.map((blockId, index) => [blockId, index] as const));
    const callbackOpenIndex = positions.get('lua_callback_open');
    const callbackEndIndex = positions.get('lua_callback_end');

    for (const blockId of lesson.targetBlockIds) {
        if (sequenceIds.includes(blockId)) continue;
        const diagnostic = lesson.missingBlockDiagnostics[blockId];
        if (diagnostic) diagnostics.push(diagnostic);
    }

    if (lesson.targetBlockIds.includes('lua_ledbar_new')) {
        const xmlRoot = parseWorkspaceXml(workspaceXml);
        const ledbarBlock = findFirstBlockByType(xmlRoot, 'lua_ledbar_new');
        if (ledbarBlock && hasNumericFieldValue(ledbarBlock, 'COUNT', 29)) {
            diagnostics.push({
                kind: 'error',
                title: 'Указано неверное количество светодиодов',
                reason: 'Для Lua-уроков с `Ledbar` нужно использовать `Ledbar.new(29)`, иначе поведение светодиодов может отличаться от реального Pioneer.',
                fix: 'Откройте блок создания ленты и установите значение `29`.'
            });
        }
    }

    for (const check of lesson.fieldChecks || []) {
        const xmlRoot = parseWorkspaceXml(workspaceXml);
        const block = findFirstBlockByType(xmlRoot, check.blockType);
        if (block && !hasNumericFieldValue(block, check.field, check.expected)) {
            diagnostics.push(check.diagnostic);
        }
    }

    for (const blockId of sequenceIds) {
        if (targetSet.has(blockId)) continue;
        const diagnostic = lesson.extraBlockDiagnostics?.[blockId];
        if (diagnostic) {
            diagnostics.push(diagnostic);
            continue;
        }

        const block = lesson.blocks.find((item) => item.id === blockId);
        diagnostics.push({
            kind: 'warning',
            title: 'Добавлен лишний блок',
            reason: `Блок "${block?.label || blockId}" использует рабочую команду, но не относится к цели текущего задания.`,
            fix: 'Уберите его из цепочки или перенесите в задание, где этот шаг действительно нужен.'
        });
    }

    for (const rule of lesson.orderRules || []) {
        const beforeOccurrences = lesson.targetBlockIds.filter((blockId) => blockId === rule.before).length;
        const afterOccurrences = lesson.targetBlockIds.filter((blockId) => blockId === rule.after).length;
        if (beforeOccurrences > 1 || afterOccurrences > 1) continue;

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

    const complete = hasAllTargetBlocks;
    const solved = hasExactTargetSequence
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
