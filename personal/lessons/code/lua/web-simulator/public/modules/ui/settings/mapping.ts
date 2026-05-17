import { simSettings, type GamepadInputRef } from '../../core/state.js';
import { AUXILIARY_CHANNELS, PRIMARY_CHANNELS, axisRef, buttonRef, clampRc, clamp } from './constants.js';
import type { ChannelKey, PrimaryChannelKey, StickMode } from './types.js';

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

export function getDefaultRawChannelValues(count = 16): number[] {
    const defaults = [1500, 1500, 1000, 1500];
    while (defaults.length < count) {
        defaults.push(1000);
    }
    return defaults.slice(0, count);
}

export function getRawPwmChannels(gp: Gamepad, count = 16): number[] {
    const channels = getDefaultRawChannelValues(count);
    let nextChannelIndex = 0;

    for (let index = 0; index < gp.axes.length && nextChannelIndex < count; index += 1) {
        channels[nextChannelIndex] = clampRc(1500 + (gp.axes[index] ?? 0) * 500);
        nextChannelIndex += 1;
    }

    for (let index = 0; index < gp.buttons.length && nextChannelIndex < count; index += 1) {
        channels[nextChannelIndex] = clampRc(1000 + (gp.buttons[index]?.value ?? 0) * 1000);
        nextChannelIndex += 1;
    }

    return channels;
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
