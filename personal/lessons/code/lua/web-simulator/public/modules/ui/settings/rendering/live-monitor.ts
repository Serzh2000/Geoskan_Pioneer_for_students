import { getBindingActions, getChannelOptions } from '../runtime.js';
import { getDuplicateSourceConflicts } from '../mapping.js';
import { escapeHtml, getLocalizedRoleLabel, getSwitchLabel, localizeSourceGroup, localizeSourceLabel, renderOptions } from '../rendering-helpers.js';
import type { ChannelRole, RcRuntimeSnapshot, StickMode } from '../types.js';
import { getRcPreviewValues, getRcSignalStatus } from '../viewport-bridge.js';
import type { MonitorFocus } from './drone-viewport.js';

type StickDescriptor = {
    id: 'left' | 'right';
    title: string;
    summaryLabel: string;
    xRole: ChannelRole;
    yRole: ChannelRole;
    xLabel: string;
    yLabel: string;
};

function getRoleMapping(snapshot: RcRuntimeSnapshot, role: ChannelRole) {
    return snapshot.activeProfile.channelMappings.find((mapping) => mapping.role === role) ?? null;
}

function getRoleSample(snapshot: RcRuntimeSnapshot, role: ChannelRole) {
    const mapping = getRoleMapping(snapshot, role);
    return mapping?.sourceId ? snapshot.samples[mapping.sourceId] ?? null : null;
}

function toSignedAxis(value: number, unsigned = false): number {
    return unsigned ? (Math.max(0, Math.min(1, value)) * 2) - 1 : Math.max(-1, Math.min(1, value));
}

function getStickDescriptors(mode: StickMode): StickDescriptor[] {
    const layouts: Record<StickMode, StickDescriptor[]> = {
        1: [
            { id: 'left', title: 'Левый стик', summaryLabel: 'Тангаж / Рыскание', xRole: 'yaw', yRole: 'pitch', xLabel: getLocalizedRoleLabel('yaw', true), yLabel: getLocalizedRoleLabel('pitch', true) },
            { id: 'right', title: 'Правый стик', summaryLabel: 'Газ / Крен', xRole: 'roll', yRole: 'throttle', xLabel: getLocalizedRoleLabel('roll', true), yLabel: getLocalizedRoleLabel('throttle', true) }
        ],
        2: [
            { id: 'left', title: 'Левый стик', summaryLabel: 'Газ / Рыскание', xRole: 'yaw', yRole: 'throttle', xLabel: getLocalizedRoleLabel('yaw', true), yLabel: getLocalizedRoleLabel('throttle', true) },
            { id: 'right', title: 'Правый стик', summaryLabel: 'Крен / Тангаж', xRole: 'roll', yRole: 'pitch', xLabel: getLocalizedRoleLabel('roll', true), yLabel: getLocalizedRoleLabel('pitch', true) }
        ],
        3: [
            { id: 'left', title: 'Левый стик', summaryLabel: 'Тангаж / Крен', xRole: 'roll', yRole: 'pitch', xLabel: getLocalizedRoleLabel('roll', true), yLabel: getLocalizedRoleLabel('pitch', true) },
            { id: 'right', title: 'Правый стик', summaryLabel: 'Газ / Рыскание', xRole: 'yaw', yRole: 'throttle', xLabel: getLocalizedRoleLabel('yaw', true), yLabel: getLocalizedRoleLabel('throttle', true) }
        ],
        4: [
            { id: 'left', title: 'Левый стик', summaryLabel: 'Газ / Крен', xRole: 'roll', yRole: 'throttle', xLabel: getLocalizedRoleLabel('roll', true), yLabel: getLocalizedRoleLabel('throttle', true) },
            { id: 'right', title: 'Правый стик', summaryLabel: 'Тангаж / Рыскание', xRole: 'yaw', yRole: 'pitch', xLabel: getLocalizedRoleLabel('yaw', true), yLabel: getLocalizedRoleLabel('pitch', true) }
        ]
    };
    return layouts[mode];
}

function renderStickMonitorWithFocus(snapshot: RcRuntimeSnapshot, stick: StickDescriptor, focus: MonitorFocus): string {
    const xSample = getRoleSample(snapshot, stick.xRole);
    const ySample = getRoleSample(snapshot, stick.yRole);
    const xValue = toSignedAxis(xSample?.normalizedValue ?? 0, stick.xRole === 'throttle');
    const yValue = toSignedAxis(ySample?.normalizedValue ?? 0, stick.yRole === 'throttle');
    const isFocusStick = Boolean(focus?.stickId) && focus?.stickId === stick.id;
    const shouldDim = Boolean(focus?.stickId) && focus?.stickId !== stick.id;
    return `
        <section class="rc-stick-monitor ${isFocusStick ? 'rc-stick-monitor--focus' : ''} ${shouldDim ? 'rc-stick-monitor--dim' : ''}">
            <div class="rc-stick-monitor__header">
                <strong>${escapeHtml(stick.title)}</strong>
                <span>${escapeHtml(stick.summaryLabel)}</span>
            </div>
            <div class="rc-stick-scope">
                <div class="rc-stick-scope__axis rc-stick-scope__axis--x ${isFocusStick && focus?.axis === 'x' ? 'rc-stick-scope__axis--active' : ''}"></div>
                <div class="rc-stick-scope__axis rc-stick-scope__axis--y ${isFocusStick && focus?.axis === 'y' ? 'rc-stick-scope__axis--active' : ''}"></div>
                <div class="rc-stick-scope__grid"></div>
                <div class="rc-stick-scope__marker" data-stick-marker="${stick.id}" data-stick-role-x="${stick.xRole}" data-stick-role-y="${stick.yRole}" style="--stick-x:${xValue.toFixed(3)}; --stick-y:${yValue.toFixed(3)};"></div>
            </div>
            <div class="rc-stick-monitor__readout">
                <span>${escapeHtml(stick.xLabel)}: <strong data-stick-value="${stick.id}-x">${xSample?.normalizedValue.toFixed(2) ?? '0.00'}</strong></span>
                <span>${escapeHtml(stick.yLabel)}: <strong data-stick-value="${stick.id}-y">${ySample?.normalizedValue.toFixed(2) ?? '0.00'}</strong></span>
            </div>
        </section>
    `;
}

function renderRawInputPanel(snapshot: RcRuntimeSnapshot): string {
    const axisSources = snapshot.activeProfile.inputSources.filter((source) => source.signalType === 'axis');
    const buttonSources = snapshot.activeProfile.inputSources.filter((source) => source.signalType === 'button');
    const duplicateSources = new Set(getDuplicateSourceConflicts(snapshot.activeProfile).map((item) => item.sourceId));
    const forceOpen = duplicateSources.size > 0;
    const toAxisPwm = (rawValue: number) => Math.round(((Math.max(-1, Math.min(1, rawValue)) + 1) / 2) * 1000 + 1000);
    return `
        <details class="rc-raw-panel" ${forceOpen ? 'open' : ''}>
            <summary>Сырой поток HID (Raw Input Data)</summary>
            <div class="rc-raw-panel__content">
                <div class="rc-raw-panel__section">
                    <strong>Axes</strong>
                    <div class="rc-raw-panel__grid">
                        ${axisSources.map((source) => {
                            const rawValue = snapshot.rawInputs[source.id] ?? 0;
                            const normalized = Math.max(-1, Math.min(1, rawValue));
                            return `
                                <div class="rc-raw-chip ${duplicateSources.has(source.id) ? 'rc-raw-chip--warning' : ''}" data-raw-source="${source.id}">
                                    <span>${escapeHtml(source.label)}</span>
                                    <strong data-raw-value="${source.id}">${toAxisPwm(rawValue)}</strong>
                                    <div class="rc-raw-chip__meter"><div class="rc-raw-chip__meter-fill" data-raw-meter="${source.id}" style="--raw-level:${(((normalized + 1) / 2) * 100).toFixed(1)}%;"></div></div>
                                    <small data-raw-meta="${source.id}">raw ${normalized.toFixed(2)}</small>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                <div class="rc-raw-panel__section">
                    <strong>Buttons</strong>
                    <div class="rc-raw-panel__grid">
                        ${buttonSources.map((source) => {
                            const rawValue = snapshot.rawInputs[source.id] ?? 0;
                            return `
                                <div class="rc-raw-chip ${duplicateSources.has(source.id) ? 'rc-raw-chip--warning' : ''}" data-raw-source="${source.id}">
                                    <span>${escapeHtml(source.label)}</span>
                                    <strong data-raw-value="${source.id}">${rawValue >= 0.5 ? 'ON' : 'OFF'}</strong>
                                    <div class="rc-raw-chip__flag" data-raw-flag="${source.id}">${rawValue >= 0.5 ? 'Активно' : 'Ожидание'}</div>
                                    <small data-raw-meta="${source.id}">raw ${rawValue.toFixed(2)}</small>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        </details>
    `;
}

export function renderBindings(snapshot: RcRuntimeSnapshot): string {
    const bindingLabels: Record<string, string> = {
        Arm: 'Арм',
        'Flight Mode': 'Режим полета',
        Camera: 'Камера',
        Magnet: 'Магнит',
        Gear: 'Шасси',
        'Return Home': 'Возврат домой',
        'Pit Mode': 'Pit Mode'
    };
    return `
        <div class="settings-group">
            <div class="settings-label">Команды и AUX</div>
            <div class="rc-binding-grid">
                ${getBindingActions().map((action) => {
                    const binding = snapshot.activeProfile.controlBindings.find((item) => item.action === action);
                    return `<label class="scene-field settings-field"><span>${escapeHtml(bindingLabels[action] ?? action)}</span><select data-binding-action="${action}" aria-label="${escapeHtml(action)} binding">${renderOptions(getChannelOptions(), binding?.channel ?? '', true)}</select></label>`;
                }).join('')}
            </div>
        </div>
    `;
}

export function renderLiveMonitor(snapshot: RcRuntimeSnapshot, focus: MonitorFocus = null): string {
    const stickDescriptors = getStickDescriptors(snapshot.activeProfile.stickMode);
    const switchSources = snapshot.activeProfile.inputSources.filter((source) => !['stick', 'throttle'].includes(source.controlType)).slice(0, 10);

    return `
        <aside class="settings-group rc-live-panel">
            <div class="rc-live-panel__heading">
                <div>
                    <div class="settings-label">Монитор</div>
                    <div class="rc-live-panel__title">Положение стиков и переключателей</div>
                </div>
                <div class="rc-live-panel__status">${escapeHtml(snapshot.connectionStatus)}</div>
            </div>
            ${focus?.title ? `<div class="rc-live-panel__focus">${escapeHtml(focus.title)}</div>` : ''}
            <div class="rc-stick-monitor-grid">
                ${stickDescriptors.map((stick) => renderStickMonitorWithFocus(snapshot, stick, focus)).join('')}
            </div>
            <div class="rc-live-switches">
                <div class="rc-live-switches__header">
                    <strong>Тумблеры и кнопки</strong>
                    <span>Активные элементы подсвечиваются мгновенно</span>
                </div>
                <div class="rc-live-switches__grid">
                    ${switchSources.map((source) => {
                        const sample = snapshot.samples[source.id];
                        const isActive = Boolean(sample?.active || sample?.normalizedValue >= 0.5);
                        return `
                            <div class="rc-live-switch ${isActive ? 'rc-live-switch--active' : ''}" data-live-source="${source.id}">
                                <span class="rc-live-switch__label">${escapeHtml(localizeSourceLabel(source.label))}</span>
                                <span class="rc-live-switch__group">${escapeHtml(localizeSourceGroup(source.group))}</span>
                                <strong class="rc-live-switch__state" data-live-source-state="${source.id}">${sample ? escapeHtml(getSwitchLabel(source.controlType, sample.pwmValue)) : 'ВЫКЛ'}</strong>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            ${renderRawInputPanel(snapshot)}
        </aside>
    `;
}
