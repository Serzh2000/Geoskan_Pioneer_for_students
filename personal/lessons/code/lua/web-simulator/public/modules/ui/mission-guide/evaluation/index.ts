import {
    findFirstBlockByType,
    hasNumericFieldValue,
    parseWorkspaceXml
} from './xml.js';
import { buildTargetWorkspaceXml } from '../support/workspace-xml.js';
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

    if (lesson.id === 'lua-led-single') {
        const diagnostics = validateLuaLedSingleWorkspace(workspaceXml || buildTargetWorkspaceXml(lesson.id, sequenceIds));
        const solved = diagnostics.length === 0;
        return {
            solved,
            complete: solved,
            diagnostics: uniqueDiagnostics(solved ? [solvedDiagnostic(lesson.expectedOutcome)] : diagnostics)
        };
    }

    if (lesson.id === 'lua-led-sequence') {
        const diagnostics = validateLuaLedSequenceWorkspace(workspaceXml || buildTargetWorkspaceXml(lesson.id, sequenceIds));
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

    for (const blockId of lesson.targetBlockIds) {
        if (positions.has(blockId)) continue;
        const diagnostic = lesson.missingBlockDiagnostics[blockId];
        if (diagnostic) diagnostics.push(diagnostic);
    }

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
