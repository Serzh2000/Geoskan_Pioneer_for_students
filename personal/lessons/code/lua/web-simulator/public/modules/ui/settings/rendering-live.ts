import { RC_CHANNEL_COUNT, RC_VISIBLE_CHANNELS_DEFAULT } from './constants.js';
import { getSwitchLabel } from './rendering-helpers.js';
import type { ChannelRole, RcRuntimeSnapshot } from './types.js';
import { getRcPreviewValues, getRcSignalStatus, syncRcSettingsViewport } from './viewport-bridge.js';

export function buildRenderKey(snapshot: RcRuntimeSnapshot): string {
    return JSON.stringify({
        profileId: snapshot.activeProfile.id,
        profileName: snapshot.activeProfile.name,
        profileUpdatedAt: snapshot.activeProfile.updatedAt,
        profiles: snapshot.profiles,
        activeDeviceId: snapshot.activeDeviceId,
        connectionStatus: snapshot.connectionStatus,
        warnings: snapshot.warnings,
        conflicts: snapshot.conflicts,
        wizardModal: snapshot.wizardModal,
        expandedChannels: snapshot.expandedChannels,
        workspaceView: snapshot.workspaceView,
        wizard: snapshot.wizard,
        channelMappings: snapshot.activeProfile.channelMappings,
        bindings: snapshot.activeProfile.controlBindings,
        calibration: snapshot.activeProfile.calibration,
        stickMode: snapshot.activeProfile.stickMode,
        autoStickMode: snapshot.activeProfile.autoStickMode
    });
}

function setTextContent(selector: string, value: string): void {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        element.textContent = value;
    });
}

function setElementWidth(selector: string, width: string): void {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        element.style.width = width;
    });
}

function setStyleProperty(selector: string, property: string, value: string): void {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        element.style.setProperty(property, value);
    });
}

function toggleClass(selector: string, className: string, enabled: boolean): void {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        element.classList.toggle(className, enabled);
    });
}

function setStatusKind(selector: string, kind: 'live' | 'caution' | 'offline'): void {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        element.classList.remove(
            'rc-drone-viewport__status--live',
            'rc-drone-viewport__status--caution',
            'rc-drone-viewport__status--offline'
        );
        element.classList.add(`rc-drone-viewport__status--${kind}`);
        element.dataset.statusKind = kind;
    });
}

function getRoleNormalizedValue(snapshot: RcRuntimeSnapshot, role: ChannelRole): number {
    const mapping = snapshot.activeProfile.channelMappings.find((item) => item.role === role);
    if (!mapping?.sourceId) return 0;
    const sample = snapshot.samples[mapping.sourceId];
    if (!sample) return 0;
    if (role === 'throttle') {
        return (Math.max(0, Math.min(1, sample.normalizedValue)) * 2) - 1;
    }
    return Math.max(-1, Math.min(1, sample.normalizedValue));
}

export function updateLiveValues(snapshot: RcRuntimeSnapshot): void {
    const previewValues = getRcPreviewValues(snapshot);
    const signalStatus = getRcSignalStatus(snapshot);

    snapshot.activeProfile.channelMappings.slice(0, snapshot.expandedChannels ? RC_CHANNEL_COUNT : RC_VISIBLE_CHANNELS_DEFAULT).forEach((mapping) => {
        const sample = mapping.sourceId ? snapshot.samples[mapping.sourceId] : null;
        const pwmValue = snapshot.channelValues[mapping.channel - 1] ?? (mapping.role === 'throttle' ? 1000 : 1500);
        const percent = Math.round(((pwmValue - 1000) / 1000) * 100);
        setTextContent(`[data-rc-channel-raw="${mapping.channel}"]`, `raw ${sample ? sample.rawValue.toFixed(2) : '0.00'}`);
        setTextContent(`[data-rc-channel-norm="${mapping.channel}"]`, `norm ${sample ? sample.normalizedValue.toFixed(2) : '0.00'}`);
        setTextContent(`[data-rc-channel-pwm="${mapping.channel}"]`, `${pwmValue}`);
        setElementWidth(`[data-rc-channel-bar="${mapping.channel}"]`, `${percent}%`);
    });

    document.querySelectorAll<HTMLElement>('[data-stick-marker]').forEach((element) => {
        const xRole = element.dataset.stickRoleX as ChannelRole | undefined;
        const yRole = element.dataset.stickRoleY as ChannelRole | undefined;
        if (!xRole || !yRole) return;
        element.style.setProperty('--stick-x', String(getRoleNormalizedValue(snapshot, xRole)));
        element.style.setProperty('--stick-y', String(getRoleNormalizedValue(snapshot, yRole)));
    });

    const roleReadouts: Array<{ key: string; role: ChannelRole }> = [
        { key: 'left-x', role: snapshot.activeProfile.stickMode === 3 || snapshot.activeProfile.stickMode === 4 ? 'roll' : 'yaw' },
        { key: 'left-y', role: snapshot.activeProfile.stickMode === 1 || snapshot.activeProfile.stickMode === 3 ? 'pitch' : 'throttle' },
        { key: 'right-x', role: snapshot.activeProfile.stickMode === 3 || snapshot.activeProfile.stickMode === 4 ? 'yaw' : 'roll' },
        { key: 'right-y', role: snapshot.activeProfile.stickMode === 1 || snapshot.activeProfile.stickMode === 4 ? 'throttle' : 'pitch' }
    ];
    roleReadouts.forEach(({ key, role }) => {
        const mapping = snapshot.activeProfile.channelMappings.find((item) => item.role === role);
        const sample = mapping?.sourceId ? snapshot.samples[mapping.sourceId] : null;
        setTextContent(`[data-stick-value="${key}"]`, sample ? sample.normalizedValue.toFixed(2) : '0.00');
    });

    Object.values(snapshot.samples).forEach((sample) => {
        const sourceEl = document.querySelector<HTMLElement>(`[data-live-source="${sample.source.id}"]`);
        if (!sourceEl) return;
        const isActive = Boolean(sample.active || sample.normalizedValue >= 0.5);
        sourceEl.classList.toggle('rc-live-switch--active', isActive);
        setTextContent(
            `[data-live-source-state="${sample.source.id}"]`,
            getSwitchLabel(sample.source.controlType, sample.pwmValue)
        );
    });

    setTextContent('[data-rc-signal-status]', signalStatus.label);
    setStatusKind('[data-rc-signal-status]', signalStatus.kind);

    setTextContent('[data-rc-drone-readout="roll"]', previewValues.roll.toFixed(2));
    setTextContent('[data-rc-drone-readout="pitch"]', previewValues.pitch.toFixed(2));
    setTextContent('[data-rc-drone-readout="yaw"]', previewValues.yaw.toFixed(2));
    setTextContent('[data-rc-drone-readout="throttle"]', previewValues.throttle.toFixed(2));
    setTextContent('[data-rc-drone-caption="roll"]', 'rotation.x');
    setTextContent('[data-rc-drone-caption="pitch"]', 'rotation.z');
    setTextContent('[data-rc-drone-caption="yaw"]', 'rotation.y');
    setTextContent('[data-rc-drone-caption="throttle"]', `${Math.round(previewValues.throttle * 100)}%`);

    const toAxisPwm = (rawValue: number) => Math.round(((Math.max(-1, Math.min(1, rawValue)) + 1) / 2) * 1000 + 1000);
    Object.entries(snapshot.rawInputs).forEach(([sourceId, rawValue]) => {
        const isAxisSource = sourceId.startsWith('a') || sourceId.startsWith('va');
        const normalized = Math.max(-1, Math.min(1, rawValue));
        const displayValue = isAxisSource
            ? String(toAxisPwm(rawValue))
            : (rawValue >= 0.5 ? 'ON' : 'OFF');
        setTextContent(`[data-raw-value="${sourceId}"]`, displayValue);
        setTextContent(`[data-raw-meta="${sourceId}"]`, `raw ${rawValue.toFixed(2)}`);
        if (isAxisSource) {
            setStyleProperty(`[data-raw-meter="${sourceId}"]`, '--raw-level', `${(((normalized + 1) / 2) * 100).toFixed(1)}%`);
        } else {
            setTextContent(`[data-raw-flag="${sourceId}"]`, rawValue >= 0.5 ? 'Активно' : 'Ожидание');
        }
        toggleClass(`[data-raw-source="${sourceId}"]`, 'rc-raw-chip--active', isAxisSource ? Math.abs(rawValue) > 0.05 : rawValue >= 0.5);
    });

    syncRcSettingsViewport(snapshot);
}
