import type { ChannelRole, InputControlType, StickMode } from '../../types.js';

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

export function getDefaultControlTypeForRole(role: ChannelRole, sourceId: string | null): InputControlType {
    if (role === 'throttle') return 'throttle';
    if (role === 'flightMode') return 'switch-3pos';
    if (role === 'arm') return 'switch-2pos';
    if (role === 'magnet') return 'button';
    if (sourceId?.startsWith('b') || sourceId?.startsWith('vb')) return 'button';
    return 'stick';
}
