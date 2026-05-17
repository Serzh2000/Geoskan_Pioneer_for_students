import { BINDING_ACTIONS, DEFAULT_WIZARD_SESSION, RC_CHANNEL_COUNT, RC_VISIBLE_CHANNELS_DEFAULT, createDefaultCalibration } from '../../constants.js';
import { applyAutoAssignments, createProfileForDevice, detectStickMode, getChannelTitle } from '../../mapping.js';
import { buildDeviceSummaries } from '../../runtime-devices.js';
import { persistedState } from '../../runtime-store.js';
import { getActiveDeviceSummary } from '../../runtime-profile.js';
import type { BindingAction, ChannelMapping, InputControlType, WizardStepId, WorkspaceView } from '../../types.js';
import { updateRcInputRuntime } from '../../runtime-core.js';
import { cloneProfile, commitProfile, getActiveProfile, mutateActiveProfile } from './shared.js';

export function setPreferredDevice(deviceId: string): void {
    persistedState.preferredDeviceId = deviceId;
    commitProfile(cloneProfile(getActiveProfile(), { deviceId }));
}

export function setActiveProfile(profileId: string): void {
    persistedState.activeProfileId = profileId;
    updateRcInputRuntime();
}

export function createProfileFromCurrentDevice(): void {
    const device = getActiveDeviceSummary(buildDeviceSummaries(), getActiveProfile());
    if (!device) return;
    const profile = createProfileForDevice(device);
    persistedState.profiles = [...persistedState.profiles, profile];
    persistedState.activeProfileId = profile.id;
    persistedState.preferredDeviceId = device.id;
    updateRcInputRuntime();
}

export function duplicateActiveProfile(): void {
    const profile = getActiveProfile();
    const duplicated = cloneProfile(profile, {
        id: `${profile.id}-copy-${Date.now()}`,
        name: `${profile.name} Copy`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
    persistedState.profiles = [...persistedState.profiles, duplicated];
    persistedState.activeProfileId = duplicated.id;
    updateRcInputRuntime();
}

export function deleteActiveProfile(): void {
    if (persistedState.profiles.length <= 1) return;
    const currentId = persistedState.activeProfileId;
    persistedState.profiles = persistedState.profiles.filter((profile) => profile.id !== currentId);
    persistedState.activeProfileId = persistedState.profiles[0]?.id ?? null;
    updateRcInputRuntime();
}

export function renameActiveProfile(name: string): void {
    commitProfile(cloneProfile(getActiveProfile(), {
        name: name.trim() || 'RC Profile',
        updatedAt: new Date().toISOString()
    }));
}

export function setExpandedChannels(expanded: boolean): void {
    persistedState.expandedChannels = expanded;
    updateRcInputRuntime();
}

export function setWorkspaceView(view: WorkspaceView): void {
    persistedState.workspaceView = view;
    updateRcInputRuntime();
}

export function setWizardStep(stepId: WizardStepId): void {
    persistedState.wizard.currentStepId = stepId;
    updateRcInputRuntime();
}

export function skipWizardStep(stepId: WizardStepId): void {
    if (!persistedState.wizard.skippedSteps.includes(stepId)) {
        persistedState.wizard.skippedSteps = [...persistedState.wizard.skippedSteps, stepId];
    }
    persistedState.wizard.currentStepId = stepId === 'bindings' ? 'review' : persistedState.wizard.currentStepId;
    updateRcInputRuntime();
}

export function resetWizardSession(): void {
    persistedState.wizard = { ...DEFAULT_WIZARD_SESSION };
    updateRcInputRuntime();
}

export function setStickMode(mode: number | 'auto'): void {
    mutateActiveProfile((profile) => {
        if (mode === 'auto') {
            profile.autoStickMode = true;
            const detected = detectStickMode(profile);
            if (detected) {
                profile.stickMode = detected;
            }
            return;
        }
        if (mode >= 1 && mode <= 4) {
            profile.autoStickMode = false;
            profile.stickMode = mode as 1 | 2 | 3 | 4;
        }
    });
}

export function startAutoDetect(channel: number): void {
    persistedState.wizard.autoDetectChannel = persistedState.wizard.autoDetectChannel === channel ? null : channel;
    updateRcInputRuntime();
}

export function autoAssignPrimaryChannels(): void {
    const profile = applyAutoAssignments(cloneProfile(getActiveProfile()));
    const detected = detectStickMode(profile);
    if (detected && profile.autoStickMode) {
        profile.stickMode = detected;
    }
    commitProfile(profile);
}

export function setChannelSource(channel: number, sourceId: string | null): void {
    mutateActiveProfile((profile) => {
        const mapping = profile.channelMappings.find((item) => item.channel === channel);
        const source = profile.inputSources.find((item) => item.id === sourceId);
        if (!mapping) return;
        mapping.sourceId = sourceId;
        if (source && channel > 4) {
            mapping.controlType = source.controlType;
        }
        if (sourceId) {
            profile.calibration[sourceId] = profile.calibration[sourceId] ?? createDefaultCalibration();
        }
    });
}

export function setChannelControlType(channel: number, controlType: InputControlType): void {
    mutateActiveProfile((profile) => {
        const mapping = profile.channelMappings.find((item) => item.channel === channel);
        if (!mapping) return;
        mapping.controlType = controlType;
        mapping.discretePositions = controlType === 'switch-3pos' ? 3 : controlType === 'selector-6pos' ? 6 : controlType === 'switch-2pos' ? 2 : undefined;
    });
}

export function setChannelInvert(channel: number, invert: boolean): void {
    mutateActiveProfile((profile) => {
        const mapping = profile.channelMappings.find((item) => item.channel === channel);
        if (!mapping) return;
        mapping.invert = invert;
    });
}

export function setChannelRole(channel: number, role: ChannelMapping['role']): void {
    mutateActiveProfile((profile) => {
        const mapping = profile.channelMappings.find((item) => item.channel === channel);
        if (!mapping) return;
        mapping.role = role;
        mapping.label = getChannelTitle(mapping);
    });
}

export function setBinding(action: BindingAction, channel: number | null): void {
    mutateActiveProfile((profile) => {
        const binding = profile.controlBindings.find((item) => item.action === action);
        const mapping = channel ? profile.channelMappings.find((item) => item.channel === channel) : null;
        if (!binding) return;
        binding.channel = channel;
        binding.sourceId = mapping?.sourceId ?? null;
    });
}

export function getBindingActions(): BindingAction[] {
    return [...BINDING_ACTIONS];
}

export function getChannelOptions(): Array<{ value: number; label: string }> {
    return Array.from({ length: RC_CHANNEL_COUNT }, (_, index) => ({
        value: index + 1,
        label: `CH${index + 1}`
    }));
}

export function getExpandedVisibilityLabel(expanded: boolean): string {
    return expanded
        ? `Скрыть CH${RC_VISIBLE_CHANNELS_DEFAULT + 1}-CH${RC_CHANNEL_COUNT}`
        : `Показать CH${RC_VISIBLE_CHANNELS_DEFAULT + 1}-CH${RC_CHANNEL_COUNT}`;
}
