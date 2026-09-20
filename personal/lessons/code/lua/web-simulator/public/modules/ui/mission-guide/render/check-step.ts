import type { ScriptLanguage } from '../../api-docs/sections.js';
import type { GuideDiagnostic } from '../types.js';
import { escapeHtml, renderDiagnosticCard } from './shared.js';
import { renderCheckVerdict } from './results.js';

const DIAGNOSTIC_KIND_RANK: Record<GuideDiagnostic['kind'], number> = {
    error: 0,
    warning: 1,
    info: 2,
    success: 3
};

function sortDiagnostics(diagnostics: GuideDiagnostic[]): GuideDiagnostic[] {
    return [...diagnostics].sort((a, b) => DIAGNOSTIC_KIND_RANK[a.kind] - DIAGNOSTIC_KIND_RANK[b.kind]);
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
}): string {
    const {
        lessonId,
        hasChecked,
        solved,
        diagnostics,
        launchedWithWarnings,
        previewActive,
        hasWorkspaceContent
    } = params;

    const sortedDiagnostics = sortDiagnostics(diagnostics);

    return `
        <div class="guide-workbench-layout">
            <div class="guide-workbench-layout__main">
                <section class="guide-panel-card guide-panel-card--result">
                    <div class="guide-panel-card__top">
                        <div>
                            <div class="guide-panel-card__title">Проверка и разбор</div>
                            <div class="guide-panel-card__text">Короткий вердикт и список того, что исправить.</div>
                        </div>
                        <div class="guide-panel-card__badge">Фидбек</div>
                    </div>
                    ${renderCheckVerdict(hasChecked, solved, diagnostics.length, launchedWithWarnings)}
                    ${hasChecked
            ? `
                    <div class="guide-actions guide-actions--primary">
                        <button type="button" class="guide-primary-action" data-guide-check="${escapeHtml(lessonId)}">Перепроверить</button>
                        <button type="button" class="guide-lesson__action" data-guide-launch="${hasChecked ? 'checked' : 'unchecked'}" ${hasWorkspaceContent ? '' : 'disabled'}>Перезапустить сцену</button>
                    </div>
                    `
            : ''}
                    <div class="guide-diagnostics" id="diagnostics-container">
                        ${hasChecked
            ? sortedDiagnostics.map(renderDiagnosticCard).join('')
            : ''}
                    </div>
                </section>
            </div>

            <div class="guide-workbench-layout__scene">
                <section class="guide-panel-card guide-panel-card--scene">
                    <div class="guide-panel-card__top">
                        <div>
                            <div class="guide-panel-card__title">Живая сцена</div>
                            <div class="guide-panel-card__text">Показывает поведение текущего скрипта и ошибки рантайма.</div>
                        </div>
                        <div class="guide-panel-card__badge">3D</div>
                    </div>
                    <div id="mission-guide-scene-preview-host" class="guide-scene-preview-host ${previewActive ? 'is-active' : ''}">
                        ${previewActive ? '' : '<div class="guide-scene-preview__placeholder">Нажмите "Проверить и запустить" на шаге сборки, чтобы увидеть сцену.</div>'}
                    </div>
                </section>
            </div>
        </div>
    `;
}
