import { RC_CHANNEL_COUNT, RC_VISIBLE_CHANNELS_DEFAULT } from '../constants.js';
import { getExpandedVisibilityLabel } from '../runtime.js';
import { CHANNEL_ROLE_OPTIONS, CONTROL_TYPE_OPTIONS, escapeHtml, getLocalizedRoleLabel, renderOptions } from '../rendering-helpers.js';
import type { RcRuntimeSnapshot } from '../types.js';
import { renderDroneViewport } from './drone-viewport.js';
import { renderBindings, renderLiveMonitor } from './live-monitor.js';
import { WIZARD_ORDER, getCurrentStep, getSourceOptions, getWizardStepDescription, getWizardStepTitle, isStepComplete, renderNavigationHint, renderWorkspaceTabs } from './panel-core.js';
import { renderWizardModal } from './wizard-modal.js';
import { renderChannelPulse, renderStepInstruction, renderStepper } from './wizard-display.js';
import { getMonitorFocus } from './wizard-guided-sticks.js';
import { renderDeviceSection, renderStepContent } from './wizard-step-sections.js';

function renderWizardWorkspace(snapshot: RcRuntimeSnapshot): string {
    const currentStep = getCurrentStep(snapshot);
    const currentIndex = WIZARD_ORDER.indexOf(currentStep.id);
    const previousStep = currentIndex > 0 ? WIZARD_ORDER[currentIndex - 1] : null;
    const nextStep = currentIndex < WIZARD_ORDER.length - 1 ? WIZARD_ORDER[currentIndex + 1] : null;
    const focus = getMonitorFocus(snapshot);
    const canProceed = nextStep ? isStepComplete(snapshot, currentStep.id) : snapshot.conflicts.length === 0;
    return `
        <section class="rc-wizard-shell">
            <div class="rc-wizard-shell__header">${renderStepper(snapshot)}</div>
            <div class="rc-wizard-shell__body">
                <div class="rc-master-layout rc-master-layout--focus">
                    <div class="rc-master-layout__panel rc-master-layout__panel--left">
                        <div class="settings-group rc-step-intro">
                            <div class="settings-label">Мастер настройки</div>
                            <div class="rc-step-intro__title">${escapeHtml(getWizardStepTitle(currentStep.id))}</div>
                            <div class="rc-step-intro__description">${escapeHtml(getWizardStepDescription(currentStep.id))}</div>
                            ${renderStepInstruction(currentStep.id)}
                            <div class="rc-setup-toolbar rc-setup-toolbar--stack">
                                <button type="button" class="rc-nav-btn rc-nav-btn--primary rc-nav-btn--block" data-action="open-wizard-modal">Запустить Мастер настройки пульта</button>
                                <button type="button" class="rc-action-btn" data-action="workspace-view" data-view="monitor">Открыть live-монитор</button>
                            </div>
                            ${currentStep.optional ? `<div class="rc-setup-toolbar"><button type="button" class="rc-action-btn" data-action="wizard-skip" data-step-id="${currentStep.id}">Пропустить шаг</button></div>` : ''}
                        </div>
                        ${renderStepContent(snapshot, currentStep.id)}
                    </div>
                    <div class="rc-master-layout__panel rc-master-layout__panel--center">${renderDroneViewport(snapshot, focus)}</div>
                </div>
            </div>
            <div class="rc-wizard-shell__footer">
                <button type="button" class="rc-nav-btn" data-action="wizard-step" ${previousStep ? `data-step-id="${previousStep}"` : 'disabled'}>Назад</button>
                ${renderNavigationHint(snapshot, currentStep.id)}
                <button type="button" class="rc-nav-btn rc-nav-btn--primary" data-action="${nextStep ? 'wizard-step' : 'complete-setup'}" ${nextStep ? `data-step-id="${nextStep}"` : ''} ${canProceed ? '' : 'disabled'}>${nextStep ? 'Далее' : 'Готово'}</button>
            </div>
        </section>
    `;
}

function renderAdvancedWorkspace(snapshot: RcRuntimeSnapshot): string {
    const visibleCount = snapshot.expandedChannels ? RC_CHANNEL_COUNT : RC_VISIBLE_CHANNELS_DEFAULT;
    const sourceOptions = getSourceOptions(snapshot);
    return `
        <section class="rc-advanced-shell">
            <div class="settings-group">
                <div class="rc-section-header">
                    <div><div class="settings-label">Расширенные каналы</div><div class="rc-section-subtitle">Компактная табличная настройка всех каналов без громоздких карточек</div></div>
                    <div class="rc-setup-toolbar"><button type="button" class="rc-action-btn" data-action="workspace-view" data-view="wizard">Вернуться в мастер</button><button type="button" class="rc-action-btn" data-action="workspace-view" data-view="monitor">Открыть монитор</button><button type="button" class="rc-action-btn" data-action="toggle-channels">${escapeHtml(getExpandedVisibilityLabel(snapshot.expandedChannels))}</button></div>
                </div>
                <div class="rc-advanced-table-wrap">
                    <table class="rc-advanced-table">
                        <thead><tr><th>Канал</th><th>Роль</th><th>Источник</th><th>Инверсия</th><th>Сигнал</th><th>Дополнительно</th></tr></thead>
                        <tbody>
                            ${snapshot.activeProfile.channelMappings.slice(0, visibleCount).map((mapping) => {
                                const calibration = mapping.sourceId ? snapshot.activeProfile.calibration[mapping.sourceId] : null;
                                return `
                                    <tr>
                                        <td class="rc-advanced-table__channel"><strong>CH${mapping.channel}</strong><span>${escapeHtml(getLocalizedRoleLabel(mapping.role, true))}</span></td>
                                        <td><select data-channel-role="${mapping.channel}" aria-label="Channel role ${mapping.channel}">${renderOptions(CHANNEL_ROLE_OPTIONS, mapping.role)}</select></td>
                                        <td><select class="${mapping.sourceId ? '' : 'rc-select--placeholder'}" data-channel-source="${mapping.channel}" aria-label="Channel source ${mapping.channel}">${renderOptions(sourceOptions, mapping.sourceId, true)}</select></td>
                                        <td><label class="checkbox-container"><input type="checkbox" data-channel-invert="${mapping.channel}" ${mapping.invert ? 'checked' : ''}><span>Инверсия</span></label></td>
                                        <td><div class="rc-table-progress">${renderChannelPulse(mapping, snapshot, { compact: true })}</div></td>
                                        <td class="rc-advanced-table__details"><details class="rc-advanced-details"><summary>Дополнительно</summary><div class="rc-advanced-details__content"><label class="scene-field settings-field"><span>Тип входа</span><select data-channel-type="${mapping.channel}" aria-label="Channel type ${mapping.channel}">${renderOptions(CONTROL_TYPE_OPTIONS, mapping.controlType)}</select></label><div class="rc-setup-toolbar"><button type="button" class="rc-action-btn" data-action="channel-autodetect" data-channel="${mapping.channel}">Слушать вход</button></div>${mapping.sourceId && calibration ? `<div class="rc-setup-grid rc-setup-grid--two"><label class="scene-field settings-field"><span>Deadzone</span><input type="range" min="0" max="0.25" step="0.01" value="${calibration.deadzone}" data-calibration="${mapping.sourceId}" data-field="deadzone"></label><label class="scene-field settings-field"><span>Trim</span><input type="range" min="-0.2" max="0.2" step="0.01" value="${calibration.trim}" data-calibration="${mapping.sourceId}" data-field="trim"></label></div><div class="rc-calibration-meta rc-calibration-meta--row"><span>min ${calibration.min.toFixed(2)}</span><span>center ${calibration.center.toFixed(2)}</span><span>max ${calibration.max.toFixed(2)}</span></div>` : '<div class="rc-setup-note">Назначьте источник, чтобы открыть калибровку.</div>'}</div></details></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            ${renderDeviceSection(snapshot)}
            ${renderBindings(snapshot)}
        </section>
    `;
}

function renderMonitorWorkspace(snapshot: RcRuntimeSnapshot): string {
    const focus = getMonitorFocus(snapshot);
    return `
        <section class="rc-monitor-shell">
            <div class="rc-workspace__main">
                <div class="rc-workspace__left">${renderDroneViewport(snapshot, focus)}</div>
                <div class="rc-workspace__right">${renderLiveMonitor(snapshot, focus)}</div>
            </div>
        </section>
    `;
}

export function renderRcSetupPanel(snapshot: RcRuntimeSnapshot): string {
    if (snapshot.workspaceView === 'wizard') {
        return `<div class="rc-workspace">${renderWorkspaceTabs(snapshot)}${renderWizardWorkspace(snapshot)}${renderWizardModal(snapshot)}</div>`;
    }
    if (snapshot.workspaceView === 'monitor') {
        return `<div class="rc-workspace">${renderWorkspaceTabs(snapshot)}${renderMonitorWorkspace(snapshot)}${renderWizardModal(snapshot)}</div>`;
    }
    return `<div class="rc-workspace">${renderWorkspaceTabs(snapshot)}${renderAdvancedWorkspace(snapshot)}${renderWizardModal(snapshot)}</div>`;
}
