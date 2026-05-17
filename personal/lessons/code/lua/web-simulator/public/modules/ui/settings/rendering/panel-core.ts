import { getDuplicateSourceConflicts } from '../mapping.js';
import { escapeHtml, localizeSourceGroup, localizeSourceLabel } from '../rendering-helpers.js';
import type { RcRuntimeSnapshot, WizardStepId } from '../types.js';

export const WIZARD_ORDER: WizardStepId[] = ['device', 'sticks', 'switches', 'calibration', 'bindings', 'review'];
export const PRIMARY_CHANNELS = [1, 2, 3, 4];

export function getCurrentStep(snapshot: RcRuntimeSnapshot) {
    return snapshot.activeProfile.wizardSteps.find((step) => step.id === snapshot.wizard.currentStepId) ?? snapshot.activeProfile.wizardSteps[0];
}

export function getWizardStepTitle(stepId: WizardStepId): string {
    const titles: Record<WizardStepId, string> = {
        device: 'Выбор устройства',
        sticks: 'Стики',
        switches: 'Тумблеры',
        calibration: 'Калибровка максимумов',
        bindings: 'Назначение команд',
        review: 'Финал'
    };
    return titles[stepId];
}

export function getWizardStepDescription(stepId: WizardStepId): string {
    const descriptions: Record<WizardStepId, string> = {
        device: 'Подключите пульт, выберите профиль и проверьте режим стиков.',
        sticks: 'Назначьте Roll, Pitch, Throttle и Yaw для четырех главных осей.',
        switches: 'Назначьте тумблеры, кнопки и вспомогательные каналы AUX.',
        calibration: 'Снимите минимумы, максимумы и подстройте чувствительность осей.',
        bindings: 'Свяжите AUX-каналы с командами симулятора.',
        review: 'Проверьте конфликты, монитор и завершите настройку.'
    };
    return descriptions[stepId];
}

export function getSourceOptions(snapshot: RcRuntimeSnapshot): Array<{ value: string; label: string }> {
    return snapshot.activeProfile.inputSources.map((source) => ({
        value: source.id,
        label: `${localizeSourceLabel(source.label)} · ${localizeSourceGroup(source.group)}`
    }));
}

export function isStepComplete(snapshot: RcRuntimeSnapshot, stepId: WizardStepId): boolean {
    const switchChannels = [5, 6, 7, 8];
    if (stepId === 'device') return Boolean(snapshot.activeDeviceId);
    if (stepId === 'sticks') {
        return PRIMARY_CHANNELS.every((channel) => Boolean(snapshot.activeProfile.channelMappings.find((item) => item.channel === channel)?.sourceId));
    }
    if (stepId === 'switches') {
        return switchChannels.some((channel) => Boolean(snapshot.activeProfile.channelMappings.find((item) => item.channel === channel)?.sourceId));
    }
    if (stepId === 'calibration') {
        return !snapshot.wizard.calibrationActive && PRIMARY_CHANNELS.every((channel) => {
            const sourceId = snapshot.activeProfile.channelMappings.find((item) => item.channel === channel)?.sourceId;
            return !sourceId || Boolean(snapshot.activeProfile.calibration[sourceId]);
        });
    }
    if (stepId === 'bindings') {
        return snapshot.activeProfile.controlBindings.some((binding) => binding.channel !== null);
    }
    return true;
}

function getRemainingPrimaryAssignments(snapshot: RcRuntimeSnapshot): number {
    return PRIMARY_CHANNELS.filter((channel) => !snapshot.activeProfile.channelMappings.find((item) => item.channel === channel)?.sourceId).length;
}

export function renderNavigationHint(snapshot: RcRuntimeSnapshot, stepId: WizardStepId): string {
    if (stepId === 'review' && snapshot.conflicts.length) {
        return `<div class="rc-nav-hint rc-nav-hint--error" role="status">Исправьте конфликты назначений, чтобы завершить настройку пульта.</div>`;
    }
    if (stepId !== 'sticks') return '';
    const remaining = getRemainingPrimaryAssignments(snapshot);
    if (!remaining) return '';
    return `<div class="rc-nav-hint" role="status">Для перехода к следующему шагу настройте Источник для всех 4 осей.</div>`;
}

export function renderConflictResolution(snapshot: RcRuntimeSnapshot): string {
    if (!snapshot.conflicts.length) return '';
    const duplicateConflicts = getDuplicateSourceConflicts(snapshot.activeProfile);
    return `
        <div class="rc-conflict-panel">
            <div class="rc-conflict-panel__header">
                <div>
                    <strong>Конфликты блокируют кнопку "Готово"</strong>
                    <span>Сначала уберите дубли осей и сломанные привязки, затем завершайте мастер.</span>
                </div>
                <button type="button" class="rc-action-btn" data-action="resolve-conflicts-auto" ${duplicateConflicts.length ? '' : 'disabled'}>
                    Исправить автоматически
                </button>
            </div>
            <div class="rc-conflict-panel__list">
                ${duplicateConflicts.map((conflict) => {
                    const source = snapshot.activeProfile.inputSources.find((item) => item.id === conflict.sourceId);
                    const sourceLabel = source ? localizeSourceLabel(source.label) : conflict.sourceId;
                    return `
                        <div class="rc-conflict-item">
                            <div class="rc-conflict-item__text">
                                <strong>${escapeHtml(sourceLabel)}</strong>
                                <span>${escapeHtml(`назначен сразу на ${conflict.channels.map((channel) => `CH${channel}`).join(', ')}`)}</span>
                            </div>
                            <div class="rc-conflict-item__actions">
                                ${conflict.channels.map((channel) => `<button type="button" class="rc-inline-link" data-action="goto-conflict-channel" data-channel="${channel}">CH${channel}</button>`).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
                ${snapshot.conflicts.filter((item) => !item.startsWith('Источник ')).map((item) => `<div class="rc-conflict-item rc-conflict-item--plain">${escapeHtml(item)}</div>`).join('')}
            </div>
        </div>
    `;
}

export function renderWorkspaceTabs(snapshot: RcRuntimeSnapshot): string {
    return `
        <div class="rc-workspace-tabs" role="tablist" aria-label="RC setup workspace">
            <button type="button" class="rc-workspace-tab ${snapshot.workspaceView === 'wizard' ? 'rc-workspace-tab--active' : ''}" data-action="workspace-view" data-view="wizard" aria-selected="${snapshot.workspaceView === 'wizard' ? 'true' : 'false'}">Мастер</button>
            <button type="button" class="rc-workspace-tab ${snapshot.workspaceView === 'monitor' ? 'rc-workspace-tab--active' : ''}" data-action="workspace-view" data-view="monitor" aria-selected="${snapshot.workspaceView === 'monitor' ? 'true' : 'false'}">Монитор</button>
            <button type="button" class="rc-workspace-tab ${snapshot.workspaceView === 'advanced' ? 'rc-workspace-tab--active' : ''}" data-action="workspace-view" data-view="advanced" aria-selected="${snapshot.workspaceView === 'advanced' ? 'true' : 'false'}">Расширенные каналы</button>
        </div>
    `;
}
