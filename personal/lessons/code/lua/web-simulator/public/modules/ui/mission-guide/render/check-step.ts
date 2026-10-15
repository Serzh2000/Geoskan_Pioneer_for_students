import type { ScriptLanguage } from '../../api-docs/sections.js';
import type { GuideDiagnostic } from '../types.js';
import { escapeHtml, renderDiagnosticCard } from './shared.js';
import { renderCheckVerdict, renderScenePlaceholder } from './results.js';

const DIAGNOSTIC_KIND_RANK: Record<GuideDiagnostic['kind'], number> = {
    error: 0,
    warning: 1,
    info: 2,
    success: 3
};

export function sortDiagnostics(diagnostics: GuideDiagnostic[]): GuideDiagnostic[] {
    return [...diagnostics].sort((a, b) => DIAGNOSTIC_KIND_RANK[a.kind] - DIAGNOSTIC_KIND_RANK[b.kind]);
}

/** A solved run says "accepted" once: success cards fold into the verdict as its next-step line. */
export function foldSuccess(diagnostics: GuideDiagnostic[], solved: boolean): { rest: GuideDiagnostic[]; next: string } {
    if (!solved) return { rest: diagnostics, next: '' };
    const good = diagnostics.filter(item => item.kind === 'success');
    return { rest: diagnostics.filter(item => item.kind !== 'success'), next: good[0]?.fix ? `Дальше: ${good[0].fix}` : '' };
}

/** The scene sits beside the result without a card title: it is a device, not a topic. */
export function renderResultScene(previewActive: boolean): string {
    return `<div class="guide-result__scene"><div id="mission-guide-scene-preview-host" class="guide-scene-preview-host pk-device ${previewActive ? 'is-active' : ''}">${previewActive ? '' : renderScenePlaceholder()}</div></div>`;
}

export function renderCheckStep(params: {
    language: ScriptLanguage;
    lessonId: string;
    hasChecked: boolean;
    solved: boolean;
    diagnostics: GuideDiagnostic[];
    launchedWithWarnings: boolean;
    previewActive: boolean;
    hasWorkspaceContent: boolean;
    expectedOutcome?: string;
    pending?: boolean;
}): string {
    const {
        lessonId,
        hasChecked,
        solved,
        diagnostics,
        launchedWithWarnings,
        previewActive,
        hasWorkspaceContent,
        expectedOutcome,
        pending = false
    } = params;

    const folded = foldSuccess(diagnostics, solved);
    const sortedDiagnostics = sortDiagnostics(folded.rest);

    return `
        <div class="guide-result">
            <div class="guide-result__main">
                ${pending
            ? '<div class="guide-verdict guide-verdict--idle" role="status"><h2 class="guide-verdict__title">Программа выполняется</h2><p>Наблюдайте сцену — результат появится после проверки.</p></div>'
            : renderCheckVerdict(hasChecked, solved, diagnostics.length, launchedWithWarnings, { expected: expectedOutcome, next: folded.next, hasErrors: diagnostics.some(item => item.kind === 'error') })}
                <div class="guide-actions">
                    ${pending
            ? '<button type="button" class="btn-secondary" data-walkthrough-cancel>Остановить проверку</button>'
            : `<button type="button" class="${hasChecked ? 'btn-secondary' : 'btn-primary'}" data-guide-step="build">${hasChecked ? 'Вернуться к сборке' : 'Перейти к практике'}</button>`}
                    ${hasChecked
            ? `<button type="button" class="btn-secondary" data-guide-check="${escapeHtml(lessonId)}">Перепроверить</button>
                    <button type="button" class="btn-secondary" data-guide-launch="checked" ${hasWorkspaceContent ? '' : 'disabled'}>Перезапустить сцену</button>`
            : ''}
                </div>
                <div class="guide-diagnostics" id="diagnostics-container">${hasChecked && !pending ? sortedDiagnostics.map(renderDiagnosticCard).join('') : ''}</div>
            </div>
            ${renderResultScene(previewActive)}
        </div>
    `;
}
