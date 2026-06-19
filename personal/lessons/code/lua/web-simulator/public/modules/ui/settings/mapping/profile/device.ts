import {
    createDefaultProfile,
    axisRef,
    buttonRef,
    VIRTUAL_DEVICE_ID
} from '../../constants.js';
import type {
    ChannelMapping,
    DeviceKind,
    DeviceProfile,
    DeviceSummary,
    InputSource,
    StickMode
} from '../../types.js';
import {
    getDefaultControlTypeForRole,
    getRadioKeywords,
    getRoleLabel,
    getStickModeAxisPatterns
} from './shared.js';

export function inferDeviceKind(deviceName: string | null | undefined): DeviceKind {
    const normalized = String(deviceName || '').toLowerCase();
    if (normalized.includes('virtual')) return 'virtual';
    return getRadioKeywords().some((keyword) => normalized.includes(keyword)) ? 'rc-transmitter' : 'gamepad';
}

export function isLikelyRadioSummary(summary: Pick<DeviceSummary, 'kind' | 'likelyRadio' | 'name'> | string): boolean {
    if (typeof summary === 'string') return inferDeviceKind(summary) === 'rc-transmitter';
    return summary.likelyRadio || summary.kind === 'rc-transmitter' || inferDeviceKind(summary.name) === 'rc-transmitter';
}

export function createInputSourcesFromGamepad(deviceId: string, deviceName: string, axes: number, buttons: number): InputSource[] {
    const sources: InputSource[] = [];
    for (let index = 0; index < axes; index += 1) {
        sources.push({
            id: `a${index}`,
            label: `Axis ${index}`,
            group: 'Axes',
            signalType: 'axis',
            controlType: 'stick',
            channelHint: index < 4 ? index + 1 : null,
            ref: axisRef(index)
        });
    }
    for (let index = 0; index < buttons; index += 1) {
        sources.push({
            id: `b${index}`,
            label: `Button ${index}`,
            group: 'Buttons',
            signalType: 'button',
            controlType: 'button',
            channelHint: null,
            ref: buttonRef(index)
        });
    }
    return isLikelyRadioSummary(deviceName) && deviceId ? sources : sources;
}

export function createVirtualInputSources(): InputSource[] {
    const sources: InputSource[] = [];
    for (let index = 0; index < 7; index += 1) {
        sources.push({
            id: `va${index}`,
            label: `Virtual Axis ${index}`,
            group: 'AUX',
            signalType: 'axis',
            controlType: 'stick',
            channelHint: index < 4 ? index + 1 : null,
            ref: null
        });
    }
    for (let index = 0; index < 6; index += 1) {
        sources.push({
            id: `vb${index}`,
            label: `Virtual Button ${index}`,
            group: 'AUX',
            signalType: 'button',
            controlType: 'button',
            channelHint: null,
            ref: null
        });
    }
    return sources;
}

export function getChannelTitle(mapping: Pick<ChannelMapping, 'channel' | 'role'>): string {
    return `CH${mapping.channel} · ${getRoleLabel(mapping.role)}`;
}

export function createProfileForDevice(device: DeviceSummary): DeviceProfile {
    const inputSources = device.id === VIRTUAL_DEVICE_ID || device.kind === 'virtual'
        ? createVirtualInputSources()
        : createInputSourcesFromGamepad(device.id, device.name, device.axes, device.buttons);

    const profile = createDefaultProfile({
        name: `${device.name} Profile`,
        deviceId: device.id,
        deviceKind: device.kind,
        transport: device.transport,
        detectedModel: device.name,
        inputSources,
        notes: [...device.warnings]
    });

    profile.channelMappings = profile.channelMappings.map((mapping) => ({
        ...mapping,
        label: getChannelTitle(mapping),
        sourceId: null,
        controlType: getDefaultControlTypeForRole(mapping.role, null)
    }));
    profile.controlBindings = profile.controlBindings.map((binding) => ({ ...binding, sourceId: null }));
    return profile;
}

export function detectStickMode(profile: Pick<DeviceProfile, 'channelMappings'>): StickMode | null {
    const roleToSource = {
        roll: profile.channelMappings.find((mapping) => mapping.role === 'roll')?.sourceId ?? null,
        pitch: profile.channelMappings.find((mapping) => mapping.role === 'pitch')?.sourceId ?? null,
        throttle: profile.channelMappings.find((mapping) => mapping.role === 'throttle')?.sourceId ?? null,
        yaw: profile.channelMappings.find((mapping) => mapping.role === 'yaw')?.sourceId ?? null
    };
    for (const candidate of [1, 2, 3, 4] as StickMode[]) {
        const pattern = getStickModeAxisPatterns()[candidate];
        if (
            roleToSource.roll === pattern.roll
            && roleToSource.pitch === pattern.pitch
            && roleToSource.throttle === pattern.throttle
            && roleToSource.yaw === pattern.yaw
        ) {
            return candidate;
        }
    }
    return null;
}
