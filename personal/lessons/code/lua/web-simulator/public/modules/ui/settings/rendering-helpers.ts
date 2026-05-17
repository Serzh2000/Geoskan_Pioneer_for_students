import type { ChannelRole, InputControlType } from './types.js';

export const CHANNEL_ROLE_OPTIONS: Array<{ value: ChannelRole; label: string }> = [
    { value: 'roll', label: 'Крен (Roll)' },
    { value: 'pitch', label: 'Тангаж (Pitch)' },
    { value: 'throttle', label: 'Газ (Throttle)' },
    { value: 'yaw', label: 'Рыскание (Yaw)' },
    { value: 'flightMode', label: 'Режим полета' },
    { value: 'arm', label: 'Арм' },
    { value: 'camera', label: 'Камера' },
    { value: 'magnet', label: 'Магнит' },
    { value: 'gear', label: 'Шасси' },
    { value: 'returnHome', label: 'Возврат домой' },
    { value: 'pitMode', label: 'Pit Mode' },
    { value: 'aux', label: 'AUX' }
];

export const CONTROL_TYPE_OPTIONS: Array<{ value: InputControlType; label: string }> = [
    { value: 'stick', label: 'Стик' },
    { value: 'throttle', label: 'Газ' },
    { value: 'switch-2pos', label: 'Тумблер 2-поз.' },
    { value: 'switch-3pos', label: 'Тумблер 3-поз.' },
    { value: 'momentary', label: 'Моментальная кнопка' },
    { value: 'knob', label: 'Энкодер' },
    { value: 'selector-6pos', label: 'Селектор 6-поз.' },
    { value: 'button', label: 'Кнопка' },
    { value: 'unknown', label: 'Не определено' }
];

const ROLE_LABELS: Record<ChannelRole, string> = {
    roll: 'Крен',
    pitch: 'Тангаж',
    throttle: 'Газ',
    yaw: 'Рыскание',
    flightMode: 'Режим полета',
    arm: 'Арм',
    camera: 'Камера',
    magnet: 'Магнит',
    gear: 'Шасси',
    returnHome: 'Возврат домой',
    pitMode: 'Pit Mode',
    aux: 'AUX'
};

const ROLE_LABELS_EN: Partial<Record<ChannelRole, string>> = {
    roll: 'Roll',
    pitch: 'Pitch',
    throttle: 'Throttle',
    yaw: 'Yaw'
};

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function renderOptions(options: Array<{ value: string | number; label: string }>, selected: string | number | null, includeEmpty = false): string {
    const items = includeEmpty ? [{ value: '', label: 'Не назначено' }, ...options] : options;
    return items.map((option) => {
        const isSelected = String(option.value) === String(selected ?? '');
        return `<option value="${escapeHtml(String(option.value))}"${isSelected ? ' selected' : ''}>${escapeHtml(option.label)}</option>`;
    }).join('');
}

export function getLocalizedRoleLabel(role: ChannelRole, includeEnglish = false): string {
    const base = ROLE_LABELS[role] ?? role;
    const english = ROLE_LABELS_EN[role];
    if (includeEnglish && english) {
        return `${base} (${english})`;
    }
    return base;
}

export function localizeSourceLabel(label: string): string {
    return label
        .replace(/^Virtual /, 'Виртуальный ')
        .replace(/^Button /, 'Кнопка ')
        .replace(/Left Stick/g, 'Левый стик')
        .replace(/Right Stick/g, 'Правый стик')
        .replace(/Knob/g, 'Энкодер')
        .replace(/Left X/g, 'Левый X')
        .replace(/Left Y/g, 'Левый Y')
        .replace(/Right X/g, 'Правый X')
        .replace(/Right Y/g, 'Правый Y')
        .replace(/6-Pos/g, '6-поз.');
}

export function localizeSourceGroup(group: string): string {
    const groups: Record<string, string> = {
        Axes: 'Оси HID',
        'Left Stick': 'Левый стик',
        'Right Stick': 'Правый стик',
        Switches: 'Тумблеры',
        Buttons: 'Кнопки',
        Knobs: 'Энкодеры',
        AUX: 'AUX'
    };
    return groups[group] ?? group;
}

export function getSwitchLabel(controlType: InputControlType, pwmValue: number): string {
    if (controlType === 'switch-3pos') {
        if (pwmValue <= 1250) return 'НИЗ';
        if (pwmValue >= 1750) return 'ВЕРХ';
        return 'СРЕД';
    }
    if (controlType === 'selector-6pos') {
        const level = Math.round(((pwmValue - 1000) / 1000) * 5) + 1;
        return `ПОЗ ${Math.max(1, Math.min(6, level))}`;
    }
    if (controlType === 'switch-2pos' || controlType === 'button' || controlType === 'momentary') {
        return pwmValue >= 1500 ? 'ВКЛ' : 'ВЫКЛ';
    }
    return `${pwmValue}`;
}

export function renderWarnings(title: string, items: string[], variant: 'warning' | 'error' = 'warning'): string {
    if (!items.length) return '';
    return `
        <div class="rc-setup-note rc-setup-note--${variant}" role="status">
            <strong>${escapeHtml(title)}</strong>
            <ul class="rc-setup-inline-list">
                ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
        </div>
    `;
}
