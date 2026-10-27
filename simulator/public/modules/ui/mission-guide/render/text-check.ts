import { getMissionGuideDraft } from '../support/monaco-preview.js';
import { getWalkthroughResult, isWalkthroughBusy, walkthroughKey } from '../walkthrough/state.js';
import { isLessonChecked } from '../state.js';
import type { GuideTextLesson } from '../types.js';
import { renderDiagnosticCard, renderInline } from './support.js';
import { renderCheckVerdict, renderFlightRecord } from './results.js';
import { foldSuccess, sortDiagnostics } from './check-step.js';

export type TextCheckParts = {
    hasChecked: boolean;
    solved: boolean;
    pending: boolean;
    verdict: string;
    flightRecord: string;
    diagnostics: string;
};

/** What a finished (or running) check says, shared by the plain lesson page and the book spread. */
export function renderTextCheckParts(track: 'lua' | 'python', lesson: GuideTextLesson): TextCheckParts {
    const hasChecked = isLessonChecked(track, lesson.id);
    const key = walkthroughKey(track, lesson.id);
    const evaluation = getWalkthroughResult(key, getMissionGuideDraft(track, lesson.id, lesson.starterCode));
    const solved = evaluation?.solved ?? false;
    const folded = foldSuccess(evaluation?.diagnostics ?? [], solved);
    const diagnostics = folded.rest;
    const pending = isWalkthroughBusy(key);
    const anotherTrial = hasChecked && !solved && diagnostics.length > 0 && diagnostics.every(item => item.kind === 'info');
    const expected = `<p class="guide-verdict__expected"><span>Ожидалось:</span> ${renderInline(lesson.expectedOutcome)}</p>`;
    const verdict = pending
        ? '<div class="guide-verdict guide-verdict--idle" role="status"><h2 class="guide-verdict__title">Программа выполняется</h2><p>Наблюдайте сцену — результат появится после проверки.</p></div>'
        : anotherTrial
            ? `<div class="guide-verdict guide-verdict--success" role="status"><h2 class="guide-verdict__title">Опыт выполнен правильно</h2><p>Для сравнения нужен следующий запуск по условию урока.</p>${expected}</div>`
            : renderCheckVerdict(hasChecked, solved, diagnostics.length, false, { expected: lesson.expectedOutcome, next: folded.next, hasErrors: diagnostics.some(item => item.kind === 'error') });
    return {
        hasChecked, solved, pending, verdict,
        flightRecord: hasChecked && !pending && evaluation?.timeline ? renderFlightRecord(evaluation.timeline) : '',
        diagnostics: hasChecked && !pending ? sortDiagnostics(diagnostics).map(renderDiagnosticCard).join('') : ''
    };
}
