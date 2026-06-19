import type { ChannelRole, InputControlType, InputSource, StickMode } from '../../types.js';

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

export function getRadioKeywords() {
    return RADIO_KEYWORDS;
}

export function getStickModeAxisPatterns() {
    return STICK_MODE_AXIS_PATTERNS;
}

export function getRoleLabel(role: ChannelRole): string {
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

export function getDefaultRoleForChannel(channel: number): ChannelRole {
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

export function getSignalTypeFromSourceId(sourceId: string): InputSource['signalType'] {
    return sourceId.startsWith('b') || sourceId.startsWith('vb') ? 'button' : 'axis';
}

export function getInputLabel(sourceId: string): string {
    if (/^va\d+$/.test(sourceId)) return `Virtual Axis ${sourceId.slice(2)}`;
    if (/^vb\d+$/.test(sourceId)) return `Virtual Button ${sourceId.slice(2)}`;
    if (/^a\d+$/.test(sourceId)) return `Axis ${sourceId.slice(1)}`;
    if (/^b\d+$/.test(sourceId)) return `Button ${sourceId.slice(1)}`;
    return sourceId;
}

export function getInputGroup(sourceId: string): string {
    if (/^v[ab]\d+$/.test(sourceId)) return 'AUX';
    return sourceId.startsWith('b') ? 'Buttons' : 'Axes';
}

export function getDefaultControlTypeForSourceId(sourceId: string): InputControlType {
    return sourceId.startsWith('b') || sourceId.startsWith('vb') ? 'button' : 'stick';
}

export function getDefaultControlTypeForRole(role: ChannelRole, sourceId: string | null): InputControlType {
    if (role === 'throttle') return 'throttle';
    if (role === 'flightMode') return 'switch-3pos';
    if (role === 'arm') return 'switch-2pos';
    if (role === 'magnet') return 'button';
    if (sourceId?.startsWith('b') || sourceId?.startsWith('vb')) return 'button';
    return 'stick';
}

export function buildPrimaryAutoAssignments(mode: StickMode): Record<'roll' | 'pitch' | 'throttle' | 'yaw', string> {
    return { ...STICK_MODE_AXIS_PATTERNS[mode] };
}
