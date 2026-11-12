import type { ChannelKey } from '../types.js';
import type { WizardStep } from './types.js';

export const SETTINGS_CHANGED_EVENT = 'gamepadsettingschanged';

export const STEPS: WizardStep[] = [
    { instruction: 'Отклоните стик газа вверх до упора, затем вниз', channel: 'throttle', type: 'primary', targetStick: 'L' },
    { instruction: 'Отклоните стик рыскания вправо до упора, затем влево', channel: 'yaw', type: 'primary', targetStick: 'L' },
    { instruction: 'Отклоните стик тангажа вперёд, от себя, до упора, затем назад', channel: 'pitch', type: 'primary', targetStick: 'R' },
    { instruction: 'Отклоните стик крена вправо до упора, затем влево', channel: 'roll', type: 'primary', targetStick: 'R' },
    { instruction: 'Пощелкайте тумблер режима по всем положениям', channel: 'mode', type: 'aux', targetStick: 'both', minPositions: 3, preferThreePositions: true },
    { instruction: 'Пощелкайте тумблер взвода по всем положениям', channel: 'arm', type: 'aux', targetStick: 'both', minPositions: 2 },
    { instruction: 'Нажмите или пощелкайте канал магнита', channel: 'magnet', type: 'aux', targetStick: 'both', minPositions: 2 }
];

export const CHANNEL_LABELS: Record<ChannelKey, string> = {
    roll: 'Крен',
    pitch: 'Тангаж',
    throttle: 'Газ',
    yaw: 'Рыскание',
    mode: 'Режим',
    arm: 'Взвод',
    magnet: 'Магнит'
};
