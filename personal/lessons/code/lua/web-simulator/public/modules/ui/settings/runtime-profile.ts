import { normalizeInputValue, sampleCalibration, sanitizeCalibration } from './calibration.js';
import { DEFAULT_PWM_CENTER, DEFAULT_PWM_MIN, createDefaultCalibration, createDefaultProfile } from './constants.js';
import { computeActivity } from './runtime-devices.js';
import { persistedState } from './runtime-store.js';
import {
    createInputSourcesFromGamepad,
    createProfileForDevice,
    createVirtualInputSources,
    detectStickMode,
    findMostActiveSource,
    updateWizardProgress
} from './mapping.js';
import type {
    CalibrationData,
    DeviceProfile,
    DeviceSummary,
    InputSample,
    ChannelRole,
    WizardStepId
} from './types.js';

const GUIDED_PRIMARY_ROLE_ORDER: ChannelRole[] = ['throttle', 'pitch', 'roll', 'yaw'];

function getNextGuidedChannel(profile: DeviceProfile): number | null {
    for (const role of GUIDED_PRIMARY_ROLE_ORDER) {
        const mapping = profile.channelMappings.find((item) => item.role === role);
        if (mapping && !mapping.sourceId) {
            return mapping.channel;
        }
    }
    return null;
}

export function cloneProfile(profile: DeviceProfile, overrides: Partial<DeviceProfile> = {}): DeviceProfile {
    return {
        ...profile,
        ...overrides,
        inputSources: (overrides.inputSources ?? profile.inputSources).map((source) => ({ ...source })),
        channelMappings: (overrides.channelMappings ?? profile.channelMappings).map((mapping) => ({ ...mapping })),
        calibration: Object.fromEntries(Object.entries(overrides.calibration ?? profile.calibration).map(([key, value]) => [key, { ...value }])),
        controlBindings: (overrides.controlBindings ?? profile.controlBindings).map((binding) => ({ ...binding })),
        wizardSteps: (overrides.wizardSteps ?? profile.wizardSteps).map((step) => ({ ...step })),
        notes: [...(overrides.notes ?? profile.notes)]
    };
}

export function ensureProfilesHaveSources(devices: DeviceSummary[]): void {
    persistedState.profiles = persistedState.profiles.map((profile) => {
        const summary = devices.find((item) => item.id === profile.deviceId);
        const next = cloneProfile(profile);
        if (summary) {
            next.inputSources = createInputSourcesFromGamepad(summary.id, summary.name, summary.axes, summary.buttons);
        } else if (!next.deviceId) {
            next.inputSources = [];
        }
        for (const source of next.inputSources) {
            next.calibration[source.id] = sanitizeCalibration(next.calibration[source.id] ?? createDefaultCalibration());
        }
        return next;
    });
}

export function getActiveProfile(): DeviceProfile {
    let active = persistedState.profiles.find((profile) => profile.id === persistedState.activeProfileId) ?? persistedState.profiles[0];
    if (!active) {
        active = createDefaultProfile({
            name: 'Radiomaster USB Profile',
            detectedModel: 'Radiomaster USB HID',
            notes: ['Подключите пульт Radiomaster по USB, чтобы начать настройку.']
        });
        persistedState.profiles = [active];
        persistedState.activeProfileId = active.id;
    }
    return active;
}

export function replaceActiveProfile(nextProfile: DeviceProfile): void {
    persistedState.profiles = persistedState.profiles.map((profile) => profile.id === nextProfile.id ? nextProfile : profile);
    persistedState.activeProfileId = nextProfile.id;
}

export function getActiveDeviceSummary(devices: DeviceSummary[], profile: DeviceProfile): DeviceSummary | null {
    return devices.find((device) => device.id === profile.deviceId)
        ?? devices.find((device) => device.id === persistedState.preferredDeviceId)
        ?? devices.find((device) => device.likelyRadio)
        ?? devices[0]
        ?? null;
}

export function getCalibration(profile: DeviceProfile, sourceId: string): CalibrationData {
    return sanitizeCalibration(profile.calibration[sourceId] ?? createDefaultCalibration());
}

export function createSamples(profile: DeviceProfile, rawInputs: Record<string, number>): Record<string, InputSample> {
    return Object.fromEntries(profile.inputSources.map((source) => {
        const rawValue = rawInputs[source.id] ?? 0;
        const calibration = getCalibration(profile, source.id);
        const normalized = normalizeInputValue(rawValue, calibration, source.controlType, source.signalType);
        return [source.id, {
            source,
            rawValue,
            normalizedValue: normalized.normalizedValue,
            pwmValue: normalized.pwmValue,
            active: Math.abs(rawValue) > 0.05,
            discreteLevel: normalized.discreteLevel
        }];
    }));
}

export function computeChannelValues(profile: DeviceProfile, rawInputs: Record<string, number>): number[] {
    return profile.channelMappings.map((mapping) => {
        if (!mapping.sourceId) {
            return mapping.role === 'throttle' ? DEFAULT_PWM_MIN : DEFAULT_PWM_CENTER;
        }
        const source = profile.inputSources.find((item) => item.id === mapping.sourceId);
        if (!source) {
            return mapping.role === 'throttle' ? DEFAULT_PWM_MIN : DEFAULT_PWM_CENTER;
        }
        const baseCalibration = getCalibration(profile, mapping.sourceId);
        const calibration: CalibrationData = {
            ...baseCalibration,
            invert: mapping.invert ? !baseCalibration.invert : baseCalibration.invert
        };
        const rawValue = rawInputs[mapping.sourceId] ?? 0;
        return normalizeInputValue(rawValue, calibration, mapping.controlType, source.signalType).pwmValue;
    });
}

export function refreshWizardSteps(profile: DeviceProfile): DeviceProfile {
    const progress = updateWizardProgress(persistedState.wizard, profile);
    persistedState.wizard = progress;
    const completedIds = new Set<WizardStepId>();
    if (progress.currentStepId !== 'device') completedIds.add('device');
    if (progress.currentStepId === 'review') {
        completedIds.add('sticks');
        if (!progress.skippedSteps.includes('switches')) completedIds.add('switches');
        completedIds.add('calibration');
        if (!progress.skippedSteps.includes('bindings')) completedIds.add('bindings');
    }
    return {
        ...profile,
        wizardSteps: profile.wizardSteps.map((step) => ({
            ...step,
            status: step.id === progress.currentStepId
                ? 'active'
                : progress.skippedSteps.includes(step.id)
                    ? 'skipped'
                    : completedIds.has(step.id)
                        ? 'completed'
                        : 'pending'
        }))
    };
}

export function syncActiveProfileToDevice(profile: DeviceProfile, device: DeviceSummary | null): DeviceProfile {
    if (!device) return profile;
    const nextSources = createInputSourcesFromGamepad(device.id, device.name, device.axes, device.buttons);
    const sourcesChanged = JSON.stringify(profile.inputSources.map((source) => `${source.id}:${source.label}`))
        !== JSON.stringify(nextSources.map((source) => `${source.id}:${source.label}`));
    const deviceChanged = profile.deviceId !== device.id || profile.deviceKind !== device.kind || profile.transport !== device.transport || profile.detectedModel !== device.name;
    const next = cloneProfile(profile, {
        deviceId: device.id,
        deviceKind: device.kind,
        transport: device.transport,
        detectedModel: device.name,
        inputSources: nextSources,
        updatedAt: deviceChanged || sourcesChanged ? new Date().toISOString() : profile.updatedAt
    });
    for (const source of next.inputSources) {
        next.calibration[source.id] = sanitizeCalibration(next.calibration[source.id] ?? createDefaultCalibration());
    }
    return next;
}

export function autoDetectInput(rawInputs: Record<string, number>, profile: DeviceProfile): DeviceProfile {
    const channel = persistedState.wizard.autoDetectChannel;
    if (!channel) return profile;
    const activity = computeActivity(rawInputs);
    const source = findMostActiveSource(activity, profile);
    if (!source) return profile;

    const next = cloneProfile(profile);
    const mapping = next.channelMappings.find((item) => item.channel === channel);
    if (!mapping) return profile;

    mapping.sourceId = source.id;
    if (mapping.role === 'throttle') {
        mapping.controlType = 'throttle';
    } else if (mapping.channel <= 4) {
        mapping.controlType = 'stick';
    } else {
        mapping.controlType = source.controlType;
    }
    persistedState.wizard.autoDetectChannel = persistedState.wizard.currentStepId === 'sticks'
        ? getNextGuidedChannel(next)
        : null;

    const detectedMode = detectStickMode(next);
    if (detectedMode && next.autoStickMode) {
        next.stickMode = detectedMode;
    }

    return next;
}

export function sampleCalibrationStep(rawInputs: Record<string, number>, profile: DeviceProfile): DeviceProfile {
    if (!persistedState.wizard.calibrationActive) return profile;
    const next = cloneProfile(profile);
    const targetSourceIds = new Set(
        next.channelMappings
            .slice(0, 8)
            .map((mapping) => mapping.sourceId)
            .filter((sourceId): sourceId is string => Boolean(sourceId))
    );

    for (const sourceId of targetSourceIds) {
        const rawValue = rawInputs[sourceId] ?? 0;
        const current = getCalibration(next, sourceId);
        next.calibration[sourceId] = sampleCalibration(current, rawValue);
    }
    return next;
}
