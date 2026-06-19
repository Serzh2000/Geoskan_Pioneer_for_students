import {
    BINDING_ACTIONS,
    createDefaultCalibration,
    createDefaultProfile,
    RC_CHANNEL_COUNT,
    RC_VISIBLE_CHANNELS_DEFAULT
} from '../../constants.js';
import type {
    BindingAction,
    DeviceProfile,
    InputSource,
    RcWizardState
} from '../../types.js';
import {
    buildPrimaryAutoAssignments,
    getDefaultControlTypeForRole,
    getDefaultControlTypeForSourceId,
    getDefaultRoleForChannel,
    getInputGroup,
    getInputLabel,
    getSignalTypeFromSourceId
} from './shared.js';
import { getChannelTitle } from './device.js';

export function getDuplicateSourceConflicts(profile: Pick<DeviceProfile, 'channelMappings'>): Array<{ sourceId: string; channels: number[] }> {
    const bySource = new Map<string, number[]>();
    for (const mapping of profile.channelMappings) {
        if (!mapping.sourceId) continue;
        const existing = bySource.get(mapping.sourceId) ?? [];
        existing.push(mapping.channel);
        bySource.set(mapping.sourceId, existing);
    }
    return Array.from(bySource.entries())
        .filter(([, channels]) => channels.length > 1)
        .map(([sourceId, channels]) => ({ sourceId, channels }));
}

export function detectMappingConflicts(profile: Pick<DeviceProfile, 'channelMappings' | 'controlBindings'>): string[] {
    const conflicts: string[] = [];
    for (const duplicate of getDuplicateSourceConflicts(profile)) {
        conflicts.push(`Источник ${duplicate.sourceId} назначен одновременно на ${duplicate.channels.map((channel) => `CH${channel}`).join(', ')}.`);
    }
    for (const binding of profile.controlBindings) {
        if (binding.channel === null) continue;
        const mapping = profile.channelMappings.find((item) => item.channel === binding.channel) ?? null;
        if (!mapping?.sourceId) {
            conflicts.push(`Команда ${binding.action} назначена на CH${binding.channel}, но источник для канала не выбран.`);
        }
    }
    return conflicts;
}

export function findMostActiveSource(activity: Record<string, number>, profile: Pick<DeviceProfile, 'inputSources'>): InputSource | null {
    let bestSource: InputSource | null = null;
    let bestScore = 0;
    for (const source of profile.inputSources) {
        const score = activity[source.id] ?? 0;
        if (score > bestScore) {
            bestScore = score;
            bestSource = source;
        }
    }
    return bestSource;
}

export function applyAutoAssignments(profile: DeviceProfile): DeviceProfile {
    const next: DeviceProfile = {
        ...profile,
        channelMappings: profile.channelMappings.map((mapping) => ({ ...mapping })),
        calibration: { ...profile.calibration }
    };

    const primaryAssignments = buildPrimaryAutoAssignments(next.stickMode);
    for (const mapping of next.channelMappings) {
        const sourceId = mapping.role === 'roll' ? primaryAssignments.roll
            : mapping.role === 'pitch' ? primaryAssignments.pitch
                : mapping.role === 'throttle' ? primaryAssignments.throttle
                    : mapping.role === 'yaw' ? primaryAssignments.yaw
                        : null;
        if (sourceId) {
            mapping.sourceId = sourceId;
            mapping.controlType = getDefaultControlTypeForRole(mapping.role, sourceId);
            next.calibration[sourceId] = next.calibration[sourceId] ?? createDefaultCalibration();
        }
    }

    const auxSources = next.inputSources
        .filter((source) => source.signalType === 'button' || source.controlType.startsWith('switch'))
        .map((source) => source.id);
    const flightModeMapping = next.channelMappings.find((mapping) => mapping.role === 'flightMode');
    const armMapping = next.channelMappings.find((mapping) => mapping.role === 'arm');
    const magnetMapping = next.channelMappings.find((mapping) => mapping.role === 'magnet');

    if (flightModeMapping && auxSources[0]) {
        flightModeMapping.sourceId = auxSources[0];
        flightModeMapping.controlType = 'switch-3pos';
    }
    if (armMapping && auxSources[1]) {
        armMapping.sourceId = auxSources[1];
        armMapping.controlType = 'switch-2pos';
    }
    if (magnetMapping && auxSources[2]) {
        magnetMapping.sourceId = auxSources[2];
        magnetMapping.controlType = 'button';
    }

    next.controlBindings = next.controlBindings.map((binding) => {
        const defaultChannel = binding.action === 'Flight Mode' ? 5
            : binding.action === 'Arm' ? 6
                : binding.action === 'Magnet' ? 7
                    : binding.channel;
        const mapping = defaultChannel ? next.channelMappings.find((item) => item.channel === defaultChannel) ?? null : null;
        return { ...binding, channel: defaultChannel ?? null, sourceId: mapping?.sourceId ?? null };
    });

    next.updatedAt = new Date().toISOString();
    return next;
}

export function updateWizardProgress(wizard: RcWizardState, profile: Pick<DeviceProfile, 'deviceId' | 'channelMappings' | 'controlBindings'>): RcWizardState {
    const primaryReady = ['roll', 'pitch', 'throttle', 'yaw'].every((role) => Boolean(profile.channelMappings.find((mapping) => mapping.role === role)?.sourceId));
    const switchesReady = profile.channelMappings.some((mapping) => mapping.channel > 4 && Boolean(mapping.sourceId));
    const bindingsReady = profile.controlBindings.some((binding) => binding.channel !== null);

    const currentStepId = !profile.deviceId ? 'device'
        : !primaryReady ? 'sticks'
            : !wizard.skippedSteps.includes('switches') && !switchesReady ? 'switches'
                : wizard.calibrationActive ? 'calibration'
                    : !wizard.skippedSteps.includes('bindings') && !bindingsReady ? 'bindings'
                        : 'review';

    return { ...wizard, currentStepId };
}

export function ensureProfileShape(profile: DeviceProfile): DeviceProfile {
    const base = createDefaultProfile({
        ...profile,
        channelMappings: profile.channelMappings?.map((mapping) => ({
            channel: mapping.channel ?? 1,
            role: mapping.role ?? getDefaultRoleForChannel(mapping.channel ?? 1),
            label: mapping.label ?? getChannelTitle({ channel: mapping.channel ?? 1, role: mapping.role ?? getDefaultRoleForChannel(mapping.channel ?? 1) }),
            sourceId: mapping.sourceId ?? null,
            controlType: mapping.controlType ?? getDefaultControlTypeForRole(mapping.role ?? getDefaultRoleForChannel(mapping.channel ?? 1), mapping.sourceId ?? null),
            invert: Boolean(mapping.invert),
            discretePositions: mapping.discretePositions
        })),
        controlBindings: profile.controlBindings?.map((binding) => ({
            action: binding.action as BindingAction,
            channel: binding.channel ?? null,
            sourceId: binding.sourceId ?? null
        }))
    });

    base.inputSources = (profile.inputSources ?? []).map((source) => ({
        id: source.id,
        label: source.label ?? getInputLabel(source.id),
        group: source.group ?? getInputGroup(source.id),
        signalType: source.signalType ?? getSignalTypeFromSourceId(source.id),
        controlType: source.controlType ?? getDefaultControlTypeForSourceId(source.id),
        channelHint: source.channelHint ?? null,
        ref: source.ref ?? null
    }));
    base.calibration = Object.fromEntries(
        Object.entries(profile.calibration ?? {}).map(([sourceId, calibration]) => [sourceId, {
            ...createDefaultCalibration(),
            ...calibration
        }])
    );
    base.visibleChannelCount = profile.visibleChannelCount || RC_VISIBLE_CHANNELS_DEFAULT;
    base.channelMappings = base.channelMappings.slice(0, RC_CHANNEL_COUNT).map((mapping) => ({
        ...mapping,
        label: getChannelTitle(mapping)
    }));
    base.controlBindings = base.controlBindings.filter((binding) => BINDING_ACTIONS.includes(binding.action));
    return base;
}
