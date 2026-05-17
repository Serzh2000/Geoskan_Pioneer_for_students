import type { GuideDiagnostic, GuideLesson } from '../types.js';

export function uniqueDiagnostics(diagnostics: GuideDiagnostic[]): GuideDiagnostic[] {
    const seen = new Set<string>();
    return diagnostics.filter((diagnostic) => {
        const key = `${diagnostic.kind}:${diagnostic.title}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function solvedDiagnostic(outcome: string): GuideDiagnostic {
    return {
        kind: 'success',
        title: 'Последовательность собрана верно',
        reason: outcome,
        fix: 'Можно запускать сценарий: код уже собирается в настоящий пример Pioneer API.'
    };
}

export function getMissingBlockDiagnostics(lesson: GuideLesson, positions: Map<string, number>): GuideDiagnostic[] {
    const diagnostics: GuideDiagnostic[] = [];
    for (const blockId of lesson.targetBlockIds) {
        if (positions.has(blockId)) continue;
        const diagnostic = lesson.missingBlockDiagnostics[blockId];
        if (diagnostic) diagnostics.push(diagnostic);
    }
    return diagnostics;
}

export function getExtraBlockDiagnostics(lesson: GuideLesson, sequenceIds: string[], targetSet: Set<string>): GuideDiagnostic[] {
    const diagnostics: GuideDiagnostic[] = [];
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
    return diagnostics;
}
