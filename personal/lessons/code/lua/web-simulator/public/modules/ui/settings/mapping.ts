import { BINDING_ACTIONS, INPUT_ACTIVITY_THRESHOLD, PRIMARY_ROLE_LABELS, RC_CHANNEL_COUNT, VIRTUAL_DEVICE_ID, createDefaultCalibration, createDefaultProfile } from './constants.js';
import type {
    ChannelMapping,
    DeviceProfile,
    DeviceSummary,
    InputControlType,
    InputSource,
    RcDeviceKind,
    StickMode,
    WizardSessionState
} from './types.js';

function slugify(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'device';
}

export function inferDeviceKind(deviceName: string): RcDeviceKind {
    const value = deviceName.toLowerCase();
    if (value.includes('virtual')) return 'virtual';
    if (value.includes('radio') || value.includes('tx') || value.includes('elrs') || value.includes('opentx') || value.includes('edgetx')) {
        return 'rc-transmitter';
    }
    return 'gamepad';
}

export function isLikelyRadioSummary(summary: DeviceSummary): boolean {
    return summary.kind === 'rc-transmitter' || summary.name.toLowerCase().includes('radio') || summary.name.toLowerCase().includes('tx');
}

export function createVirtualInputSources(): InputSource[] {
    const base = [
        { id: 'va0', signalType: 'axis', controlType: 'stick', label: 'Virtual Left X', group: 'Left Stick', index: 0 },
        { id: 'va1', signalType: 'axis', controlType: 'throttle', label: 'Virtual Left Y', group: 'Left Stick', index: 1 },
        { id: 'va2', signalType: 'axis', controlType: 'stick', label: 'Virtual Right X', group: 'Right Stick', index: 2 },
        { id: 'va3', signalType: 'axis', controlType: 'stick', label: 'Virtual Right Y', group: 'Right Stick', index: 3 },
        { id: 'va4', signalType: 'axis', controlType: 'knob', label: 'Virtual Knob 1', group: 'Knobs', index: 4 },
        { id: 'va5', signalType: 'axis', controlType: 'knob', label: 'Virtual Knob 2', group: 'Knobs', index: 5 },
        { id: 'va6', signalType: 'axis', controlType: 'selector-6pos', label: 'Virtual 6-Pos', group: 'Switches', index: 6 },
        { id: 'vb0', signalType: 'button', controlType: 'switch-2pos', label: 'Virtual SA', group: 'Switches', index: 0 },
        { id: 'vb1', signalType: 'button', controlType: 'switch-2pos', label: 'Virtual SB', group: 'Switches', index: 1 },
        { id: 'vb2', signalType: 'button', controlType: 'switch-3pos', label: 'Virtual SC', group: 'Switches', index: 2 },
        { id: 'vb3', signalType: 'button', controlType: 'momentary', label: 'Virtual SH', group: 'Buttons', index: 3 },
        { id: 'vb4', signalType: 'button', controlType: 'button', label: 'Virtual Button 1', group: 'Buttons', index: 4 },
        { id: 'vb5', signalType: 'button', controlType: 'button', label: 'Virtual Button 2', group: 'Buttons', index: 5 }
    ] as const;

    return base.map((item) => ({
        id: item.id,
        deviceId: VIRTUAL_DEVICE_ID,
        deviceKind: 'virtual',
        transport: 'virtual',
        signalType: item.signalType,
        controlType: item.controlType,
        label: item.label,
        group: item.group,
        index: item.index
    }));
}

export function createInputSourcesFromGamepad(deviceId: string, deviceName: string, axes: number, buttons: number): InputSource[] {
    const deviceKind = inferDeviceKind(deviceName);
    const sources: InputSource[] = [];
    for (let index = 0; index < axes; index += 1) {
        sources.push({
            id: `a${index}`,
            deviceId,
            deviceKind,
            transport: 'gamepad-api',
            signalType: 'axis',
            controlType: index >= 4 ? 'knob' : 'stick',
            index,
            label: `Axis ${index}`,
            group: 'Axes'
        });
    }
    for (let index = 0; index < buttons; index += 1) {
        sources.push({
            id: `b${index}`,
            deviceId,
            deviceKind,
            transport: 'gamepad-api',
            signalType: 'button',
            controlType: index < 2 ? 'switch-2pos' : 'button',
            index,
            label: `Button ${index}`,
            group: index < 8 ? 'Switches' : 'Buttons'
        });
    }
    return sources;
}

export function createProfileForDevice(summary: DeviceSummary): DeviceProfile {
    return createDefaultProfile({
        id: `${slugify(summary.name)}-${Date.now()}`,
        name: summary.kind === 'rc-transmitter' ? `${summary.name} Profile` : `${summary.name || 'Controller'} Profile`,
        deviceId: summary.id,
        deviceKind: summary.kind,
        transport: summary.transport,
        detectedModel: summary.name,
        inputSources: summary.id === VIRTUAL_DEVICE_ID
            ? createVirtualInputSources()
            : createInputSourcesFromGamepad(summary.id, summary.name, summary.axes, summary.buttons)
    });
}

export function ensureProfileShape(profile: DeviceProfile): DeviceProfile {
    const base = createDefaultProfile(profile);
    const mergedMappings: ChannelMapping[] = Array.from({ length: RC_CHANNEL_COUNT }, (_, index) => {
        const existing = profile.channelMappings.find((mapping) => mapping.channel === index + 1);
        return existing ?? base.channelMappings[index];
    });
    const calibration = { ...profile.calibration };
    for (const source of profile.inputSources) {
        calibration[source.id] = calibration[source.id] ?? createDefaultCalibration();
    }
    return {
        ...base,
        ...profile,
        channelMappings: mergedMappings,
        controlBindings: BINDING_ACTIONS.map((action) => profile.controlBindings.find((binding) => binding.action === action) ?? {
            action,
            channel: null,
            sourceId: null,
            label: action
        }),
        calibration
    };
}

export function applyAutoAssignments(profile: DeviceProfile): DeviceProfile {
    const next = ensureProfileShape(profile);
    const axisSources = next.inputSources.filter((source) => source.signalType === 'axis');
    const buttonSources = next.inputSources.filter((source) => source.signalType === 'button');
    const assign = (channel: number, sourceId: string | null, controlType: InputControlType) => {
        const mapping = next.channelMappings.find((item) => item.channel === channel);
        if (!mapping || mapping.sourceId) return;
        mapping.sourceId = sourceId;
        mapping.controlType = controlType;
    };

    assign(1, axisSources[0]?.id ?? null, 'stick');
    assign(2, axisSources[1]?.id ?? null, 'stick');
    assign(3, axisSources[1]?.id ?? axisSources[2]?.id ?? null, 'throttle');
    assign(4, axisSources[2]?.id ?? axisSources[3]?.id ?? null, 'stick');
    assign(5, buttonSources[0]?.id ?? axisSources[4]?.id ?? null, 'switch-3pos');
    assign(6, buttonSources[1]?.id ?? buttonSources[0]?.id ?? null, 'switch-2pos');
    assign(7, buttonSources[2]?.id ?? null, 'button');
    assign(8, buttonSources[3]?.id ?? null, 'switch-2pos');

    next.updatedAt = new Date().toISOString();
    return next;
}

export function updateWizardProgress(wizard: WizardSessionState, profile: DeviceProfile): WizardSessionState {
    const requiredChannels = [1, 2, 3, 4];
    const switchChannels = [5, 6, 7, 8];
    const completed = {
        device: Boolean(profile.deviceId),
        sticks: requiredChannels.every((channel) => Boolean(profile.channelMappings.find((item) => item.channel === channel)?.sourceId)),
        switches: switchChannels.some((channel) => Boolean(profile.channelMappings.find((item) => item.channel === channel)?.sourceId)),
        calibration: requiredChannels.every((channel) => {
            const sourceId = profile.channelMappings.find((item) => item.channel === channel)?.sourceId;
            return !sourceId || Boolean(profile.calibration[sourceId]);
        }),
        bindings: profile.controlBindings.some((binding) => binding.channel !== null),
        review: false
    };

    const orderedIds = ['device', 'sticks', 'switches', 'calibration', 'bindings', 'review'] as const;
    let nextStep = orderedIds.find((stepId) => !completed[stepId] && !wizard.skippedSteps.includes(stepId)) ?? 'review';
    if (wizard.currentStepId === 'review') {
        nextStep = 'review';
    }
    return {
        ...wizard,
        currentStepId: nextStep
    };
}

export function detectStickMode(profile: DeviceProfile): StickMode | null {
    const mappingByRole = new Map(profile.channelMappings.map((mapping) => [mapping.role, mapping]));
    const roll = mappingByRole.get('roll')?.sourceId;
    const pitch = mappingByRole.get('pitch')?.sourceId;
    const throttle = mappingByRole.get('throttle')?.sourceId;
    const yaw = mappingByRole.get('yaw')?.sourceId;
    const signature = [roll, pitch, throttle, yaw].join('|');
    const modes = new Map<string, StickMode>([
        ['a2|a3|a1|a0', 2],
        ['a2|a1|a3|a0', 1],
        ['a0|a3|a1|a2', 3],
        ['a0|a1|a3|a2', 4],
        ['va2|va3|va1|va0', 2],
        ['va2|va1|va3|va0', 1],
        ['va0|va3|va1|va2', 3],
        ['va0|va1|va3|va2', 4]
    ]);
    return modes.get(signature) ?? null;
}

export type DuplicateSourceConflict = {
    sourceId: string;
    channels: number[];
};

export function getDuplicateSourceConflicts(profile: DeviceProfile): DuplicateSourceConflict[] {
    const used = new Map<string, number[]>();
    for (const mapping of profile.channelMappings) {
        if (!mapping.sourceId) continue;
        const channels = used.get(mapping.sourceId) ?? [];
        channels.push(mapping.channel);
        used.set(mapping.sourceId, channels);
    }

    return Array.from(used.entries())
        .filter(([, channels]) => channels.length > 1)
        .map(([sourceId, channels]) => ({
            sourceId,
            channels: [...channels].sort((left, right) => left - right)
        }));
}

export function detectMappingConflicts(profile: DeviceProfile): string[] {
    const warnings: string[] = [];
    for (const conflict of getDuplicateSourceConflicts(profile)) {
        warnings.push(`Источник ${conflict.sourceId} назначен сразу на каналы ${conflict.channels.map((value) => `CH${value}`).join(', ')}.`);
    }
    for (const binding of profile.controlBindings) {
        if (binding.channel === null) continue;
        const mapping = profile.channelMappings.find((item) => item.channel === binding.channel);
        if (!mapping?.sourceId) {
            warnings.push(`Привязка ${binding.action} указывает на CH${binding.channel}, но у канала нет источника.`);
        }
    }
    return warnings;
}

export function getChannelTitle(mapping: ChannelMapping): string {
    return mapping.label || PRIMARY_ROLE_LABELS[mapping.role] || `CH${mapping.channel}`;
}

export function findMostActiveSource(activity: Record<string, number>, profile: DeviceProfile): InputSource | null {
    let bestSource: InputSource | null = null;
    let bestScore = INPUT_ACTIVITY_THRESHOLD;
    for (const source of profile.inputSources) {
        const score = activity[source.id] ?? 0;
        if (score > bestScore) {
            bestScore = score;
            bestSource = source;
        }
    }
    return bestSource;
}
