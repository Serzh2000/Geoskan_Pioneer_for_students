import type { ScriptLanguage } from '../../api-docs/sections.js';
import { getLessonBanner } from '../state.js';
import type { GuideLessonStepId } from '../types.js';
import { escapeHtml } from './shared.js';

const LESSON_STEPS: Array<{ id: GuideLessonStepId; label: string }> = [
    { id: 'theory', label: 'Теория' },
    { id: 'build', label: 'Собрать' },
    { id: 'check', label: 'Проверка' }
];

export function renderLessonSteps(activeStep: GuideLessonStepId, hasChecked: boolean, solved: boolean, buildLabel = 'Собрать'): string {
    return `
        <div class="pk-seg guide-page-tabs" role="tablist" aria-label="Шаги урока">
            ${LESSON_STEPS.map((step) => {
        const isActive = activeStep === step.id;
        const isSolvedStep = step.id === 'check' && hasChecked && solved;
        const suffix = step.id === 'check' && hasChecked
            ? (solved ? ' · принято' : ' · есть замечания')
            : '';
        return `
                    <button
                        type="button"
                        id="guide-tab-${step.id}"
                        class="pk-seg__btn ${isActive ? 'is-active' : ''} ${isSolvedStep ? 'is-solved' : ''}"
                        data-guide-step="${step.id}"
                        role="tab"
                        aria-selected="${isActive}"
                        aria-controls="guide-panel-${step.id}"
                        tabindex="${isActive ? '0' : '-1'}"
                    >${escapeHtml(step.id === 'build' ? buildLabel : step.label)}${suffix}</button>
                `;
    }).join('')}
        </div>
    `;
}

export function renderRunBanner(language: ScriptLanguage, lessonId: string): string {
    const banner = getLessonBanner(language, lessonId);
    if (!banner) return '';

    return `
        <div class="guide-run-banner guide-run-banner--${banner.kind}" role="status">
            ${escapeHtml(banner.message)}
        </div>
    `;
}
