import { escapeHtml, getLocalizedRoleLabel, localizeSourceGroup, localizeSourceLabel, renderOptions } from '../rendering-helpers.js';
import type { ChannelMapping, RcRuntimeSnapshot, WizardStepId } from '../types.js';
import { getSourceOptions, getWizardStepDescription, getWizardStepTitle } from './panel-core.js';

export function renderStepper(snapshot: RcRuntimeSnapshot): string {
    return `
        <div class="rc-stepper" aria-label="Wizard progress">
            ${snapshot.activeProfile.wizardSteps.map((step, index) => `
                <button type="button" class="rc-stepper__step rc-stepper__step--${step.status}" data-action="wizard-step" data-step-id="${step.id}" aria-current="${step.status === 'active' ? 'step' : 'false'}">
                    <span class="rc-stepper__dot">${index + 1}</span>
                    <span class="rc-stepper__content">
                        <span class="rc-stepper__title">${escapeHtml(getWizardStepTitle(step.id))}</span>
                        <span class="rc-stepper__description">${escapeHtml(getWizardStepDescription(step.id))}</span>
                    </span>
                </button>
            `).join('')}
        </div>
    `;
}

export function renderStepInstruction(stepId: WizardStepId): string {
    const instructions: Record<WizardStepId, string> = {
        device: 'Подключите нужный пульт и выберите профиль, с которым будет работать мастер.',
        sticks: 'Отклоните левый и правый стики по осям Крен (Roll), Тангаж (Pitch), Рыскание (Yaw) и Газ (Throttle), чтобы быстро назначить четыре главных канала.',
        switches: 'Переключайте тумблеры и кнопки на пульте, чтобы назначить AUX-команды без лишнего шума.',
        calibration: 'Отклоните стики до упора по всем направлениям, затем завершите калибровку и при необходимости подправьте deadzone и trim.',
        bindings: 'Привяжите команды Arm, Flight Mode и другие функции только к тем AUX, которые реально используются.',
        review: 'Проверьте конфликты, реакцию каналов и при необходимости откройте продвинутую таблицу для ручной донастройки.'
    };
    return `<div class="rc-step-hint" role="status"><span class="rc-step-hint__pulse"></span><span>${escapeHtml(instructions[stepId])}</span></div>`;
}

export function renderChannelPulse(mapping: ChannelMapping, snapshot: RcRuntimeSnapshot, options: { compact?: boolean; includeStats?: boolean } = {}): string {
    const { compact = false, includeStats = true } = options;
    const sample = mapping.sourceId ? snapshot.samples[mapping.sourceId] : null;
    const pwmValue = snapshot.channelValues[mapping.channel - 1] ?? (mapping.role === 'throttle' ? 1000 : 1500);
    const barPercent = Math.round(((pwmValue - 1000) / 1000) * 100);
    return `
        <div class="rc-channel-meter ${compact ? 'rc-channel-meter--tight' : ''}"><div class="rc-channel-meter__bar" data-rc-channel-bar="${mapping.channel}" style="width:${barPercent}%"></div></div>
        ${includeStats ? `<div class="rc-channel-stats"><span data-rc-channel-raw="${mapping.channel}">raw ${sample ? sample.rawValue.toFixed(2) : '0.00'}</span><span data-rc-channel-norm="${mapping.channel}">norm ${sample ? sample.normalizedValue.toFixed(2) : '0.00'}</span><strong data-rc-channel-pwm="${mapping.channel}">${pwmValue}</strong></div>` : ''}
    `;
}

export function getResolvedStickMode(snapshot: RcRuntimeSnapshot): 1 | 2 {
    return snapshot.activeProfile.stickMode === 1 ? 1 : 2;
}

export function getSourceSummary(snapshot: RcRuntimeSnapshot, mapping: ChannelMapping): string {
    if (!mapping.sourceId) return 'Не назначено';
    const source = snapshot.activeProfile.inputSources.find((item) => item.id === mapping.sourceId);
    return source ? `${localizeSourceLabel(source.label)}${source.group ? ` · ${localizeSourceGroup(source.group)}` : ''}` : mapping.sourceId;
}

function isCenterCaptured(snapshot: RcRuntimeSnapshot, mapping: ChannelMapping): boolean {
    if (!mapping.sourceId || mapping.role === 'throttle') return false;
    const sample = snapshot.samples[mapping.sourceId];
    if (!sample) return false;
    const calibration = snapshot.activeProfile.calibration[mapping.sourceId];
    const deadzone = Math.max(0.03, calibration?.deadzone ?? 0.04);
    const pwmWindow = Math.max(12, Math.round(deadzone * 500));
    return Math.abs(sample.pwmValue - 1500) <= pwmWindow && Math.abs(sample.normalizedValue) <= deadzone;
}

export function renderSourceSelect(snapshot: RcRuntimeSnapshot, mapping: ChannelMapping): string {
    const centerCaptured = isCenterCaptured(snapshot, mapping);
    return `
        <label class="scene-field settings-field ${centerCaptured ? 'settings-field--centered' : ''}">
            <div class="rc-field-heading">
                <span>Источник</span>
                ${centerCaptured ? '<span class="rc-center-badge">Центр пойман</span>' : ''}
            </div>
            <select class="${mapping.sourceId ? '' : 'rc-select--placeholder'}" data-channel-source="${mapping.channel}" aria-label="Источник канала ${mapping.channel}">
                ${renderOptions(getSourceOptions(snapshot), mapping.sourceId, true)}
            </select>
            <span class="rc-source-caption ${mapping.sourceId ? '' : 'rc-source-caption--muted'}">${escapeHtml(getSourceSummary(snapshot, mapping))}</span>
        </label>
    `;
}

export function renderStickModeToggle(snapshot: RcRuntimeSnapshot, compact = false): string {
    const activeMode = getResolvedStickMode(snapshot);
    return `
        <div class="rc-stick-mode-toggle ${compact ? 'rc-stick-mode-toggle--compact' : ''}">
            <div class="rc-stick-mode-toggle__header">
                <span class="settings-label">Раскладка стиков</span>
                <span class="rc-stick-mode-toggle__hint">Mode 2: газ слева. Mode 1: газ справа.</span>
            </div>
            <div class="rc-stick-mode-toggle__control" role="group" aria-label="Режим стиков">
                <button type="button" class="rc-stick-mode-toggle__option ${activeMode === 2 ? 'rc-stick-mode-toggle__option--active' : ''}" data-action="stick-mode-toggle" data-mode="2" aria-pressed="${activeMode === 2 ? 'true' : 'false'}">Mode 2<span>Газ слева</span></button>
                <button type="button" class="rc-stick-mode-toggle__option ${activeMode === 1 ? 'rc-stick-mode-toggle__option--active' : ''}" data-action="stick-mode-toggle" data-mode="1" aria-pressed="${activeMode === 1 ? 'true' : 'false'}">Mode 1<span>Газ справа</span></button>
            </div>
        </div>
    `;
}
