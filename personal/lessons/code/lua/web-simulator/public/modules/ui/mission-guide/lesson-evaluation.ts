import type { GuideDiagnostic, GuideEvaluation, GuideLesson } from './types.js';

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
        title: 'Последовательность собрана верно',
        reason: outcome,
        fix: 'Можно запускать сценарий: код уже собирается в настоящий пример Pioneer API.'
    };
}

export function evaluateLesson(lesson: GuideLesson, sequenceIds: string[]): GuideEvaluation {
    const diagnostics: GuideDiagnostic[] = [];
    const targetSet = new Set(lesson.targetBlockIds);
    const positions = new Map(sequenceIds.map((blockId, index) => [blockId, index] as const));

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

    for (const blockId of lesson.targetBlockIds) {
        if (positions.has(blockId)) continue;
        const diagnostic = lesson.missingBlockDiagnostics[blockId];
        if (diagnostic) diagnostics.push(diagnostic);
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

    const complete = lesson.targetBlockIds.every((blockId) => positions.has(blockId));
    const solved = complete
        && sequenceIds.length === lesson.targetBlockIds.length
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
