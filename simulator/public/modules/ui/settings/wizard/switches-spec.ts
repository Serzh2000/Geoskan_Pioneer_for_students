import { simSettings, type AuxChannelRange } from '../../../core/state.js';

/** What the switches screen offers: the functions, and the ranges each one has (see switches-ui.ts). */

export interface RangeSpec {
    id: string;
    label: string;
    hint?: string;
    get(): AuxChannelRange;
    set(range: AuxChannelRange): void;
}

export interface FunctionSpec {
    id: 'arm' | 'mode' | 'magnet';
    title: string;
    about: string;
    /** The key of the input in `simSettings.gamepadMapping`. */
    mapKey: 'armSwitch' | 'modeSwitch' | 'magnetBtn';
    ranges: RangeSpec[];
    /** The label of the state badge for a range that is active, or when none is. */
    stateOn(range: RangeSpec | null): string;
}

export const FUNCTIONS: FunctionSpec[] = [
    {
        id: 'arm',
        title: 'Взвод',
        about: 'Включает моторы. Пока тумблер в этом положении, дрон взведён.',
        mapKey: 'armSwitch',
        ranges: [{ id: 'arm', label: 'Взведён', get: () => simSettings.gamepadAuxRanges.arm, set: (r) => { simSettings.gamepadAuxRanges.arm = r; } }],
        stateOn: (range) => (range ? 'Взведён' : 'Не взведён')
    },
    {
        id: 'mode',
        title: 'Режим полёта',
        about: 'Как дрон держится в воздухе. Одному тумблеру можно отдать все три режима.',
        mapKey: 'modeSwitch',
        ranges: [
            { id: 'stabilize', label: 'Стабилизация', hint: 'STABILIZE', get: () => simSettings.gamepadModeRanges.stabilize, set: (r) => { simSettings.gamepadModeRanges.stabilize = r; } },
            { id: 'althold', label: 'Удержание высоты', hint: 'ALTHOLD', get: () => simSettings.gamepadModeRanges.althold, set: (r) => { simSettings.gamepadModeRanges.althold = r; } },
            { id: 'loiter', label: 'Удержание позиции', hint: 'LOITER', get: () => simSettings.gamepadModeRanges.loiter, set: (r) => { simSettings.gamepadModeRanges.loiter = r; } }
        ],
        stateOn: (range) => range?.label ?? 'Ни один режим не выбран'
    },
    {
        id: 'magnet',
        title: 'Магнит',
        about: 'Захват груза: пока тумблер в этом положении, магнит включён.',
        mapKey: 'magnetBtn',
        ranges: [{ id: 'magnet', label: 'Включён', get: () => simSettings.gamepadAuxRanges.magnet, set: (r) => { simSettings.gamepadAuxRanges.magnet = r; } }],
        stateOn: (range) => (range ? 'Включён' : 'Выключен')
    }
];
