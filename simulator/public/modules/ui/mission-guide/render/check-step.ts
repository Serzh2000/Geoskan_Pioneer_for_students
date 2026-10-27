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

type CheckParams = {
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
    /** What the verdict says before the first check, when the page is not the plain lesson page. */
    idleText?: string;
};

/** The verdict and the diagnostics of a Blockly check, shared by the lesson page and the book spread. */
export function renderCheckParts(params: CheckParams): { verdict: string; diagnostics: string } {
    const { hasChecked, solved, diagnostics, launchedWithWarnings, expectedOutcome, pending = false, idleText } = params;
    const folded = foldSuccess(diagnostics, solved);
    return {
        verdict: pending
            ? '<div class="guide-verdict guide-verdict--idle" role="status"><h2 class="guide-verdict__title">Программа выполняется</h2><p>Наблюдайте сцену — результат появится после проверки.</p></div>'
            : renderCheckVerdict(hasChecked, solved, diagnostics.length, launchedWithWarnings, { expected: expectedOutcome, next: folded.next, hasErrors: diagnostics.some(item => item.kind === 'error'), idleText }),
        diagnostics: hasChecked && !pending ? sortDiagnostics(folded.rest).map(renderDiagnosticCard).join('') : ''
    };
}

export function renderCheckStep(params: CheckParams): string {
    const { lessonId, hasChecked, previewActive, hasWorkspaceContent, pending = false } = params;
    const { verdict, diagnostics } = renderCheckParts(params);

    return `
        <div class="guide-result">
            <div class="guide-result__main">
                ${verdict}
                <div class="guide-actions">
                    ${pending
            ? '<button type="button" class="btn-secondary" data-walkthrough-cancel>Остановить проверку</button>'
            : `<button type="button" class="${hasChecked ? 'btn-secondary' : 'btn-primary'}" data-guide-step="build">${hasChecked ? 'Вернуться к сборке' : 'Перейти к практике'}</button>`}
                    ${hasChecked
            ? `<button type="button" class="btn-secondary" data-guide-check="${escapeHtml(lessonId)}">Перепроверить</button>
                    <button type="button" class="btn-secondary" data-guide-launch="checked" ${hasWorkspaceContent ? '' : 'disabled'}>Перезапустить сцену</button>`
            : ''}
                </div>
                <div class="guide-diagnostics" id="diagnostics-container">${diagnostics}</div>
            </div>
            ${renderResultScene(previewActive)}
        </div>
    `;
}
