import { CHANNEL_ROLE_OPTIONS, CONTROL_TYPE_OPTIONS, escapeHtml, getLocalizedRoleLabel, getSwitchLabel, renderOptions, renderWarnings } from '../rendering-helpers.js';
import type { ChannelMapping, RcRuntimeSnapshot, WizardStepId } from '../types.js';
import { renderBindings } from './live-monitor.js';
import { renderConflictResolution } from './panel-core.js';
import { renderChannelPulse, renderSourceSelect, renderStickModeToggle } from './wizard-display.js';
import { renderGuidedStickStep } from './wizard-guided-sticks.js';

function renderFocusChannels(snapshot: RcRuntimeSnapshot, channels: number[], options: { allowRoleChange?: boolean; minimal?: boolean } = {}): string {
    const { allowRoleChange = false, minimal = false } = options;
    return `
        <div class="rc-focus-grid">
            ${snapshot.activeProfile.channelMappings.filter((mapping) => channels.includes(mapping.channel)).map((mapping) => `
                <article class="rc-focus-card ${snapshot.wizard.autoDetectChannel === mapping.channel ? 'rc-focus-card--listening' : ''} ${minimal ? 'rc-focus-card--primary' : ''}">
                    <div class="rc-focus-card__header">
                        <div>
                            <strong>${escapeHtml(minimal ? getLocalizedRoleLabel(mapping.role, true) : mapping.label)}</strong>
                            <span>${minimal ? `CH${mapping.channel}` : `${mapping.sourceId ? escapeHtml(mapping.sourceId) : 'Не назначено'}`}</span>
                        </div>
                        ${minimal ? '' : `<div class="rc-channel-badge">${escapeHtml(getSwitchLabel(mapping.controlType, snapshot.channelValues[mapping.channel - 1] ?? 1500))}</div>`}
                    </div>
                    ${minimal ? '' : renderChannelPulse(mapping, snapshot, { includeStats: false })}
                    <div class="rc-setup-grid rc-setup-grid--two ${minimal ? 'rc-setup-grid--wizard-focus' : ''}">
                        ${allowRoleChange && !minimal
                            ? `<label class="scene-field settings-field"><span>Роль</span><select data-channel-role="${mapping.channel}" aria-label="Channel role ${mapping.channel}">${renderOptions(CHANNEL_ROLE_OPTIONS, mapping.role)}</select></label>`
                            : minimal ? '' : `<label class="scene-field settings-field"><span>Роль</span><input type="text" value="${escapeHtml(getLocalizedRoleLabel(mapping.role, true))}" disabled aria-label="Подпись канала ${mapping.channel}"></label>`}
                        ${snapshot.wizard.autoDetectChannel === mapping.channel
                            ? `<div class="rc-listening-state" role="status"><span class="rc-listening-state__pulse"></span><span>Слушаем любую ось Axis 0-7 и автоматически привяжем её к каналу.</span></div>`
                            : renderSourceSelect(snapshot, mapping)}
                    </div>
                    <div class="rc-setup-grid rc-setup-grid--two ${minimal ? 'rc-setup-grid--wizard-focus' : ''}">
                        ${minimal ? '' : `<label class="scene-field settings-field"><span>Тип входа</span><select data-channel-type="${mapping.channel}" aria-label="Channel type ${mapping.channel}">${renderOptions(CONTROL_TYPE_OPTIONS, mapping.controlType)}</select></label>`}
                        <label class="checkbox-container rc-checkbox-inline ${minimal ? 'rc-checkbox-inline--compact' : ''}"><input type="checkbox" data-channel-invert="${mapping.channel}" ${mapping.invert ? 'checked' : ''}>Инверсия</label>
                    </div>
                    <div class="rc-focus-card__footer">
                        <button type="button" class="rc-action-btn ${snapshot.wizard.autoDetectChannel === mapping.channel ? 'rc-action-btn--active' : ''}" data-action="channel-autodetect" data-channel="${mapping.channel}">${snapshot.wizard.autoDetectChannel === mapping.channel ? 'Слушаем вход...' : 'Слушать вход'}</button>
                        <span class="rc-focus-card__meta ${mapping.sourceId ? '' : 'rc-focus-card__meta--muted'}">${mapping.sourceId ? `Источник: ${escapeHtml(mapping.sourceId)}` : 'Не назначено'}</span>
                    </div>
                </article>
            `).join('')}
        </div>
    `;
}

function renderCalibrationStep(snapshot: RcRuntimeSnapshot): string {
    return `
        <div class="settings-group">
            <div class="rc-section-header">
                <div><div class="settings-label">Калибровка</div><div class="rc-section-subtitle">Максимумы, мертвая зона и трим для главных осей</div></div>
                <div class="rc-setup-toolbar">
                    <button type="button" class="rc-action-btn" data-action="${snapshot.wizard.calibrationActive ? 'stop-calibration' : 'start-calibration'}">${snapshot.wizard.calibrationActive ? 'Завершить калибровку' : 'Начать калибровку'}</button>
                    <button type="button" class="rc-action-btn" data-action="reset-calibration">Сбросить</button>
                </div>
            </div>
            <div class="rc-calibration-list">
                ${snapshot.activeProfile.channelMappings.filter((mapping) => mapping.channel <= 4).map((mapping) => {
                    const calibration = mapping.sourceId ? snapshot.activeProfile.calibration[mapping.sourceId] : null;
                    return `<div class="rc-calibration-card"><div class="rc-calibration-card__header"><div><strong>${escapeHtml(getLocalizedRoleLabel(mapping.role, true))}</strong><span>CH${mapping.channel} · ${mapping.sourceId ? escapeHtml(mapping.sourceId) : 'не назначено'}</span></div><div class="rc-channel-badge">${snapshot.wizard.calibrationActive ? 'ИДЕТ' : 'ГОТОВО'}</div></div>${renderChannelPulse(mapping, snapshot, { compact: true })}${calibration ? `<div class="rc-setup-grid rc-setup-grid--two"><label class="scene-field settings-field"><span>Мертвая зона</span><input type="range" min="0" max="0.25" step="0.01" value="${calibration.deadzone}" data-calibration="${mapping.sourceId}" data-field="deadzone"></label><label class="scene-field settings-field"><span>Trim</span><input type="range" min="-0.2" max="0.2" step="0.01" value="${calibration.trim}" data-calibration="${mapping.sourceId}" data-field="trim"></label></div><div class="rc-calibration-meta rc-calibration-meta--row"><span>мин ${calibration.min.toFixed(2)}</span><span>центр ${calibration.center.toFixed(2)}</span><span>макс ${calibration.max.toFixed(2)}</span></div>` : `<div class="rc-setup-note">Сначала назначьте источник для этого канала, затем возвращайтесь к калибровке.</div>`}</div>`;
                }).join('')}
            </div>
        </div>
    `;
}

export function renderDeviceSection(snapshot: RcRuntimeSnapshot): string {
    const hasDevices = snapshot.devices.length > 0;
    return `
        <div class="settings-group">
            <div class="rc-section-header">
                <div><div class="settings-label">Устройство</div><div class="rc-section-subtitle">Подключение, профиль и режим стиков</div></div>
                <div class="rc-setup-toolbar" role="toolbar" aria-label="Profile actions">
                    <button type="button" class="rc-action-btn" data-action="create-profile">Новый профиль</button>
                    <button type="button" class="rc-action-btn" data-action="duplicate-profile">Дублировать</button>
                    <button type="button" class="rc-action-btn rc-action-btn--danger" data-action="delete-profile">Удалить</button>
                    <button type="button" class="rc-action-btn" data-action="reset-wizard">Сбросить мастер</button>
                </div>
            </div>
            <div class="rc-setup-grid rc-setup-grid--two">
                <label class="scene-field settings-field"><span>USB HID-устройство</span><select id="rc-device-select" aria-label="Active device" ${hasDevices ? '' : 'disabled'}>${hasDevices ? renderOptions(snapshot.devices.map((device) => ({ value: device.id, label: `${device.name}${device.connected ? '' : ' (не в сети)'}` })), snapshot.activeDeviceId) : '<option value="">Подключите Radiomaster по USB</option>'}</select></label>
                <label class="scene-field settings-field"><span>Профиль</span><select id="rc-profile-select" aria-label="Device profile">${renderOptions(snapshot.profiles.map((profile) => ({ value: profile.id, label: profile.name })), snapshot.activeProfile.id)}</select></label>
            </div>
            <div class="rc-setup-grid rc-setup-grid--two"><label class="scene-field settings-field"><span>Имя профиля</span><input id="rc-profile-name" type="text" value="${escapeHtml(snapshot.activeProfile.name)}" aria-label="Profile name"></label>${renderStickModeToggle(snapshot, true)}</div>
            <div class="rc-setup-status-row"><div class="status-indicator"><span class="status-indicator__icon">i</span><span>${escapeHtml(snapshot.connectionStatus)}</span></div><div class="status-indicator"><span class="status-indicator__icon">8</span><span>${escapeHtml(`${snapshot.activeProfile.inputSources.filter((source) => source.signalType === 'axis').length} осей, ${snapshot.activeProfile.inputSources.filter((source) => source.signalType === 'button').length} кнопок/HID-входов`)}</span></div></div>
            ${!hasDevices ? `<div class="rc-setup-note rc-setup-note--warning" role="status"><strong>Ожидаем реальный пульт</strong><span>Подключите Radiomaster TX16S, Boxer или Zorro по USB в режиме джойстика, затем вернитесь к шагу со стиками.</span></div>` : ''}
            ${renderWarnings('Предупреждения', snapshot.warnings)}
            ${renderWarnings('Конфликты', snapshot.conflicts, 'error')}
        </div>
    `;
}

function renderReviewSection(snapshot: RcRuntimeSnapshot): string {
    const mappedPrimary = snapshot.activeProfile.channelMappings.filter((mapping) => mapping.channel <= 4 && mapping.sourceId).length;
    const mappedAux = snapshot.activeProfile.channelMappings.filter((mapping) => mapping.channel > 4 && mapping.sourceId).length;
    const bindings = snapshot.activeProfile.controlBindings.filter((binding) => binding.channel !== null).length;
    return `
        <div class="settings-group">
            <div class="settings-label">Финальная проверка</div>
            <div class="rc-review-grid">
                <div class="status-indicator"><span class="status-indicator__icon">4</span><span>${escapeHtml(`${mappedPrimary}/4 главных канала назначено`)}</span></div>
                <div class="status-indicator"><span class="status-indicator__icon">A</span><span>${escapeHtml(`${mappedAux} AUX-каналов назначено`)}</span></div>
                <div class="status-indicator"><span class="status-indicator__icon">B</span><span>${escapeHtml(`${bindings} команд привязано`)}</span></div>
                <div class="status-indicator"><span class="status-indicator__icon">M</span><span>${escapeHtml(snapshot.activeProfile.autoStickMode ? `Авто / Режим ${snapshot.activeProfile.stickMode}` : `Режим ${snapshot.activeProfile.stickMode}`)}</span></div>
            </div>
            ${renderWarnings('Предупреждения', snapshot.warnings)}
            ${renderConflictResolution(snapshot)}
            <div class="rc-setup-toolbar"><button type="button" class="rc-action-btn" data-action="workspace-view" data-view="advanced">Открыть расширенные каналы</button></div>
        </div>
    `;
}

export function renderStepContent(snapshot: RcRuntimeSnapshot, stepId: WizardStepId): string {
    if (stepId === 'device') return renderDeviceSection(snapshot);
    if (stepId === 'sticks') return renderGuidedStickStep(snapshot);
    if (stepId === 'switches') return `<div class="settings-group"><div class="settings-label">Тумблеры</div><div class="rc-section-subtitle">AUX, тумблеры и кнопки вынесены в компактный набор</div>${renderFocusChannels(snapshot, [5, 6, 7, 8], { allowRoleChange: true })}</div>`;
    if (stepId === 'calibration') return renderCalibrationStep(snapshot);
    if (stepId === 'bindings') return renderBindings(snapshot);
    return renderReviewSection(snapshot);
}
