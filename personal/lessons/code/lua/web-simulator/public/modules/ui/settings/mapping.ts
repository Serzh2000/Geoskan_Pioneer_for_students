import { simSettings, type GamepadInputRef } from '../../core/state.js';
import {
    AUXILIARY_CHANNELS,
    BINDING_ACTIONS,
    DEFAULT_PWM_CENTER,
    DEFAULT_PWM_MIN,
    PRIMARY_CHANNELS,
    RC_CHANNEL_COUNT,
    RC_VISIBLE_CHANNELS_DEFAULT,
    VIRTUAL_DEVICE_ID,
    axisRef,
    buttonRef,
    clampRc,
    clamp,
    createDefaultCalibration,
    createDefaultProfile
} from './constants.js';
import type {
    BindingAction,
    ChannelKey,
    ChannelMapping,
    ChannelRole,
    DeviceKind,
    DeviceProfile,
    DeviceSummary,
    InputControlType,
    InputSource,
    PrimaryChannelKey,
    RcWizardState,
    StickMode
} from './types.js';

const RC_TRANSMITTER_KEYWORDS = [
    'radiomaster',
    'jumper',
    'frsky',
    'futaba',
    'spektrum',
    'flysky',
    'taranis',
    'transmitter',
    'edgetx',
    'opentx',
    'elrs',
    'crossfire',
    'radio'
];

export function getDefaultChannelValue(key: ChannelKey): number {
    return key === 'throttle' || AUXILIARY_CHANNELS.includes(key as any) ? 1000 : 1500;
}

export function getMappingRef(key: ChannelKey): GamepadInputRef {
    switch (key) {
        case 'roll':
            return simSettings.gamepadMapping.roll;
        case 'pitch':
            return simSettings.gamepadMapping.pitch;
        case 'throttle':
            return simSettings.gamepadMapping.throttle;
        case 'yaw':
            return simSettings.gamepadMapping.yaw;
        case 'mode':
            return simSettings.gamepadMapping.modeSwitch;
        case 'arm':
            return simSettings.gamepadMapping.armSwitch;
        case 'magnet':
            return simSettings.gamepadMapping.magnetBtn;
    }
}

export function setMappingRef(key: ChannelKey, ref: GamepadInputRef): void {
    switch (key) {
        case 'roll':
            simSettings.gamepadMapping.roll = ref;
            break;
        case 'pitch':
            simSettings.gamepadMapping.pitch = ref;
            break;
        case 'throttle':
            simSettings.gamepadMapping.throttle = ref;
            break;
        case 'yaw':
            simSettings.gamepadMapping.yaw = ref;
            break;
        case 'mode':
            simSettings.gamepadMapping.modeSwitch = ref;
            break;
        case 'arm':
            simSettings.gamepadMapping.armSwitch = ref;
            break;
        case 'magnet':
            simSettings.gamepadMapping.magnetBtn = ref;
            break;
    }
}

export function hasInputRef(gp: Gamepad, ref: GamepadInputRef): boolean {
    const inputIndex = Number(ref.slice(1));
    return ref.startsWith('a') ? inputIndex < gp.axes.length : inputIndex < gp.buttons.length;
}

export function isAllowedForChannel(key: ChannelKey, ref: GamepadInputRef): boolean {
    if (PRIMARY_CHANNELS.includes(key as PrimaryChannelKey)) return ref.startsWith('a');
    return true;
}

function isLikelyRcTransmitter(gp: Gamepad): boolean {
    const id = gp.id.toLowerCase();
    return RC_TRANSMITTER_KEYWORDS.some((keyword) => id.includes(keyword));
}

function hasLegacyPrimaryMapping(): boolean {
    return simSettings.gamepadMapping.roll === 'a0'
        && simSettings.gamepadMapping.pitch === 'a1'
        && simSettings.gamepadMapping.throttle === 'a2'
        && simSettings.gamepadMapping.yaw === 'a3';
}

function getModePrimaryAxisIndexes(mode: StickMode): Record<PrimaryChannelKey, number> {
    switch (mode) {
        case 1:
            return { roll: 2, pitch: 1, throttle: 3, yaw: 0 };
        case 2:
            return { roll: 2, pitch: 3, throttle: 1, yaw: 0 };
        case 3:
            return { roll: 0, pitch: 1, throttle: 3, yaw: 2 };
        case 4:
            return { roll: 0, pitch: 3, throttle: 1, yaw: 2 };
    }
}

function getRcPrimaryAxisMapping(gp: Gamepad): Record<PrimaryChannelKey, GamepadInputRef> | null {
    if (gp.axes.length === 0) return null;

    const hasFourAxes = gp.axes.length >= 4;
    if (hasFourAxes) {
        const indexes = getModePrimaryAxisIndexes(simSettings.gamepadStickMode);
        return {
            roll: axisRef(indexes.roll),
            pitch: axisRef(indexes.pitch),
            throttle: axisRef(indexes.throttle),
            yaw: axisRef(indexes.yaw)
        };
    }

    return {
        roll: gp.axes.length > 0 ? axisRef(0) : axisRef(0),
        pitch: gp.axes.length > 1 ? axisRef(1) : axisRef(0),
        throttle: gp.axes.length > 2 ? axisRef(2) : gp.axes.length > 0 ? axisRef(gp.axes.length - 1) : axisRef(0),
        yaw: gp.axes.length > 3 ? axisRef(3) : gp.axes.length > 0 ? axisRef(Math.min(1, gp.axes.length - 1)) : axisRef(0)
    };
}

function getPreferredAuxRefs(gp: Gamepad): GamepadInputRef[] {
    const primaryMapping = getRcPrimaryAxisMapping(gp);
    const usedPrimaryRefs = new Set<GamepadInputRef>(primaryMapping ? Object.values(primaryMapping) : []);
    const refs: GamepadInputRef[] = [];

    const pushIfUnused = (ref: GamepadInputRef) => {
        if (usedPrimaryRefs.has(ref) || refs.includes(ref) || !hasInputRef(gp, ref)) return;
        refs.push(ref);
    };

    if (isLikelyRcTransmitter(gp)) {
        for (let axisIndex = 4; axisIndex < gp.axes.length; axisIndex += 1) {
            pushIfUnused(axisRef(axisIndex));
        }
    }

    for (let buttonIndex = 0; buttonIndex < gp.buttons.length; buttonIndex += 1) {
        pushIfUnused(buttonRef(buttonIndex));
    }

    for (let axisIndex = 0; axisIndex < gp.axes.length; axisIndex += 1) {
        pushIfUnused(axisRef(axisIndex));
    }

    return refs;
}

export function applyPrimaryAxisMappingForCurrentMode(gp: Gamepad): void {
    const primaryMapping = getRcPrimaryAxisMapping(gp);
    if (!primaryMapping) return;
    simSettings.gamepadMapping.roll = primaryMapping.roll;
    simSettings.gamepadMapping.pitch = primaryMapping.pitch;
    simSettings.gamepadMapping.throttle = primaryMapping.throttle;
    simSettings.gamepadMapping.yaw = primaryMapping.yaw;
}

export function getFallbackMapping(gp: Gamepad, key: ChannelKey): GamepadInputRef | null {
    const primaryMapping = getRcPrimaryAxisMapping(gp);
    const auxRefs = getPreferredAuxRefs(gp);
    switch (key) {
        case 'roll':
            return primaryMapping?.roll ?? null;
        case 'pitch':
            return primaryMapping?.pitch ?? null;
        case 'throttle':
            return primaryMapping?.throttle ?? null;
        case 'yaw':
            return primaryMapping?.yaw ?? null;
        case 'mode':
            return auxRefs[0] ?? null;
        case 'arm':
            return auxRefs[1] ?? auxRefs[0] ?? null;
        case 'magnet':
            return auxRefs[2] ?? auxRefs[1] ?? auxRefs[0] ?? null;
    }
}

export function ensureMappingsForGamepad(gp: Gamepad, channels: ChannelKey[]): void {
    if (hasLegacyPrimaryMapping()) {
        applyPrimaryAxisMappingForCurrentMode(gp);
    }

    for (const key of channels) {
        const currentRef = getMappingRef(key);
        if (isAllowedForChannel(key, currentRef) && hasInputRef(gp, currentRef)) continue;
        const fallback = getFallbackMapping(gp, key);
        if (fallback) setMappingRef(key, fallback);
    }
}

export function readInputRcValue(
    gp: Gamepad,
    ref: GamepadInputRef,
    normalizeCenteredAxis: (rawValue: number, axisIndex: number) => number
): number {
    const inputIndex = Number(ref.slice(1));
    if (ref.startsWith('a')) {
        const rawValue = gp.axes[inputIndex] ?? 0;
        const normalized = normalizeCenteredAxis(rawValue, inputIndex);
        return clampRc(1500 + normalized * 500);
    }

    const buttonValue = clamp(gp.buttons[inputIndex]?.value ?? 0, 0, 1);
    return clampRc(1000 + buttonValue * 1000);
}

export function getConnectedGamepads(): Gamepad[] {
    if (typeof navigator.getGamepads !== 'function') return [];
    return Array.from(navigator.getGamepads()).filter((gp): gp is Gamepad => gp !== null);
}

export function findActiveGamepad(activeGamepadIndex: number | null, activeGamepadId: string | null): Gamepad | null {
    const connected = getConnectedGamepads();
    if (connected.length === 0) return null;
    if (activeGamepadIndex !== null) {
        const byIndex = connected.find((gp) => gp.index === activeGamepadIndex);
        if (byIndex) return byIndex;
    }
    if (activeGamepadId) {
        const byId = connected.find((gp) => gp.id === activeGamepadId);
        if (byId) return byId;
    }
    return connected[0];
}

export function getGamepadName(gp: Gamepad): string {
    const trimmed = gp.id.split('(')[0].trim();
    return trimmed || `Gamepad ${gp.index + 1}`;
}

export function createAxisOptions(gp: Gamepad): string {
    return gp.axes
        .map((_, index) => `<option value="${axisRef(index)}">A${index}: Axis ${index}</option>`)
        .join('');
}

export function createAuxOptions(gp: Gamepad): string {
    const options: string[] = [];
    gp.axes.forEach((_, index) => {
        const channelLabel = isLikelyRcTransmitter(gp) ? ` / CH${index + 1}` : '';
        options.push(`<option value="${axisRef(index)}">A${index}: Axis ${index}${channelLabel}</option>`);
    });
    gp.buttons.forEach((_, index) => {
        options.push(`<option value="${buttonRef(index)}">B${index}: Button ${index + 1}</option>`);
    });
    return options.join('');
}

const RADIO_KEYWORDS = [
    'radiomaster',
    'boxer',
    'tx16',
    'zorro',
    'jumper',
    'frsky',
    'futaba',
    'spektrum',
    'flysky',
    'edgetx',
    'opentx',
    'radio'
];

const STICK_MODE_AXIS_PATTERNS: Record<StickMode, Record<'roll' | 'pitch' | 'throttle' | 'yaw', string>> = {
    1: { roll: 'a2', pitch: 'a1', throttle: 'a3', yaw: 'a0' },
    2: { roll: 'a2', pitch: 'a3', throttle: 'a1', yaw: 'a0' },
    3: { roll: 'a0', pitch: 'a1', throttle: 'a3', yaw: 'a2' },
    4: { roll: 'a0', pitch: 'a3', throttle: 'a1', yaw: 'a2' }
};

function getRoleLabel(role: ChannelRole): string {
    const labels: Record<ChannelRole, string> = {
        roll: 'Крен (Roll)',
        pitch: 'Тангаж (Pitch)',
        throttle: 'Газ (Throttle)',
        yaw: 'Рыскание (Yaw)',
        flightMode: 'Режим полета',
        arm: 'Arm',
        camera: 'Камера',
        magnet: 'Magnet',
        gear: 'Шасси',
        returnHome: 'Return Home',
        pitMode: 'Pit Mode',
        aux: 'AUX'
    };
    return labels[role];
}

function getDefaultRoleForChannel(channel: number): ChannelRole {
    const roles: ChannelRole[] = [
        'roll',
        'pitch',
        'throttle',
        'yaw',
        'flightMode',
        'arm',
        'magnet',
        'camera',
        'gear',
        'returnHome',
        'pitMode',
        'aux'
    ];
    return roles[channel - 1] ?? 'aux';
}

function getSignalTypeFromSourceId(sourceId: string): InputSource['signalType'] {
    return sourceId.startsWith('b') || sourceId.startsWith('vb') ? 'button' : 'axis';
}

function getInputLabel(sourceId: string): string {
    if (/^va\d+$/.test(sourceId)) return `Virtual Axis ${sourceId.slice(2)}`;
    if (/^vb\d+$/.test(sourceId)) return `Virtual Button ${sourceId.slice(2)}`;
    if (/^a\d+$/.test(sourceId)) return `Axis ${sourceId.slice(1)}`;
    if (/^b\d+$/.test(sourceId)) return `Button ${sourceId.slice(1)}`;
    return sourceId;
}

function getInputGroup(sourceId: string): string {
    if (/^v[ab]\d+$/.test(sourceId)) return 'AUX';
    return sourceId.startsWith('b') ? 'Buttons' : 'Axes';
}

function getDefaultControlTypeForSourceId(sourceId: string): InputControlType {
    if (sourceId.startsWith('b') || sourceId.startsWith('vb')) return 'button';
    return 'stick';
}

function getDefaultControlTypeForRole(role: ChannelRole, sourceId: string | null): InputControlType {
    if (role === 'throttle') return 'throttle';
    if (role === 'flightMode') return 'switch-3pos';
    if (role === 'arm') return 'switch-2pos';
    if (role === 'magnet') return 'button';
    if (sourceId?.startsWith('b') || sourceId?.startsWith('vb')) return 'button';
    return 'stick';
}

function buildPrimaryAutoAssignments(mode: StickMode): Record<'roll' | 'pitch' | 'throttle' | 'yaw', string> {
    return { ...STICK_MODE_AXIS_PATTERNS[mode] };
}

export function inferDeviceKind(deviceName: string | null | undefined): DeviceKind {
    const normalized = String(deviceName || '').toLowerCase();
    if (normalized.includes('virtual')) return 'virtual';
    return RADIO_KEYWORDS.some((keyword) => normalized.includes(keyword)) ? 'rc-transmitter' : 'gamepad';
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
    if (isLikelyRadioSummary(deviceName) && sources.length) {
        return sources;
    }
    return sources;
}

export function createVirtualInputSources(): InputSource[] {
    const axisCount = 7;
    const buttonCount = 6;
    const sources: InputSource[] = [];
    for (let index = 0; index < axisCount; index += 1) {
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
    for (let index = 0; index < buttonCount; index += 1) {
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
        const pattern = STICK_MODE_AXIS_PATTERNS[candidate];
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
        calibration: {
            ...profile.calibration
        }
    };

    const primaryAssignments = buildPrimaryAutoAssignments(next.stickMode);
    for (const mapping of next.channelMappings) {
        const sourceId = mapping.role === 'roll'
            ? primaryAssignments.roll
            : mapping.role === 'pitch'
                ? primaryAssignments.pitch
                : mapping.role === 'throttle'
                    ? primaryAssignments.throttle
                    : mapping.role === 'yaw'
                        ? primaryAssignments.yaw
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
        const defaultChannel = binding.action === 'Flight Mode'
            ? 5
            : binding.action === 'Arm'
                ? 6
                : binding.action === 'Magnet'
                    ? 7
                    : binding.channel;
        const mapping = defaultChannel ? next.channelMappings.find((item) => item.channel === defaultChannel) ?? null : null;
        return {
            ...binding,
            channel: defaultChannel ?? null,
            sourceId: mapping?.sourceId ?? null
        };
    });

    next.updatedAt = new Date().toISOString();
    return next;
}

export function updateWizardProgress(wizard: RcWizardState, profile: Pick<DeviceProfile, 'deviceId' | 'channelMappings' | 'controlBindings'>): RcWizardState {
    const primaryReady = ['roll', 'pitch', 'throttle', 'yaw'].every((role) => Boolean(profile.channelMappings.find((mapping) => mapping.role === role)?.sourceId));
    const switchesReady = profile.channelMappings.some((mapping) => mapping.channel > 4 && Boolean(mapping.sourceId));
    const bindingsReady = profile.controlBindings.some((binding) => binding.channel !== null);

    const currentStepId = !profile.deviceId
        ? 'device'
        : !primaryReady
            ? 'sticks'
            : !wizard.skippedSteps.includes('switches') && !switchesReady
                ? 'switches'
                : wizard.calibrationActive
                    ? 'calibration'
                    : !wizard.skippedSteps.includes('bindings') && !bindingsReady
                        ? 'bindings'
                        : 'review';

    return {
        ...wizard,
        currentStepId
    };
}

export function ensureProfileShape(profile: DeviceProfile): DeviceProfile {
    const base = createDefaultProfile({
        ...profile,
        channelMappings: profile.channelMappings?.map((mapping) => ({
            channel: mapping.channel ?? 1,
            role: mapping.role ?? getDefaultRoleForChannel(mapping.channel ?? 1),
            label: mapping.label ?? getChannelTitle({
                channel: mapping.channel ?? 1,
                role: mapping.role ?? getDefaultRoleForChannel(mapping.channel ?? 1)
            }),
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
