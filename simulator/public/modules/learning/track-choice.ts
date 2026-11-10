/**
 * Что изучает ученик: дрон + способ программирования. Шесть вариантов; два из них (Базовый и Мини 2 на Python SDK 2)
 * идут по одной линии миссий и одному прогрессу, а дрон под них ставится разный.
 * Выбор делается только в окне «Что будем изучать?» при входе в обучение или кнопкой в окне миссии.
 */
import type { DroneModelId, PythonSdkId } from '../core/drone-models.js';
import type { AccountTrack } from './account.js';

export type ChoiceId = 'basic-blocks' | 'basic-lua' | 'basic-sdk1' | 'basic-sdk2' | 'mini2-python' | 'mini2-bricks';
/** Язык редактора, который нужно выставить дрону (как в переключателе «Язык программы» панели «Рой»). */
export type ChoiceLanguage = 'lua' | 'python-sdk1' | 'python-sdk2' | 'blocks';

export type Choice = {
    id: ChoiceId;
    track: AccountTrack;
    model: DroneModelId;
    sdk: PythonSdkId;
    language: ChoiceLanguage;
    /** Название способа: «Блоки Blockly», «Python · SDK 2». */
    title: string;
    /** Одна строка о том, что это. */
    text: string;
};

export const CHOICES: readonly Choice[] = [
    { id: 'basic-blocks', track: 'blocks', model: 'pioneer-basic', sdk: 'pioneer_sdk', language: 'blocks', title: 'Блоки Blockly', text: 'Программа собирается из блоков, как конструктор' },
    { id: 'basic-lua', track: 'lua', model: 'pioneer-basic', sdk: 'pioneer_sdk', language: 'lua', title: 'Lua', text: 'Короткий язык: программа работает прямо в симуляторе' },
    { id: 'basic-sdk1', track: 'python', model: 'pioneer-basic', sdk: 'pioneer_sdk', language: 'python-sdk1', title: 'Python · SDK 1', text: 'Библиотека pioneer_sdk: программа управляет дроном по связи' },
    { id: 'basic-sdk2', track: 'sdk2', model: 'pioneer-basic', sdk: 'pioneer_sdk2', language: 'python-sdk2', title: 'Python · SDK 2', text: 'Библиотека pioneer_sdk2: программа работает на борту, на Radxa Zero 3W' },
    { id: 'mini2-python', track: 'sdk2', model: 'pioneer-mini2', sdk: 'pioneer_sdk2', language: 'python-sdk2', title: 'Python · SDK 2', text: 'Библиотека pioneer_sdk2: программа работает на борту дрона' },
    { id: 'mini2-bricks', track: 'bricks', model: 'pioneer-mini2', sdk: 'pioneer_sdk2', language: 'blocks', title: 'Bricks', text: 'Блоки Pioneer Bricks, как в программе Геоскан' }
];

export const CHOICE_BY_ID: Record<ChoiceId, Choice> = Object.fromEntries(CHOICES.map((choice) => [choice.id, choice])) as Record<ChoiceId, Choice>;

export const isChoiceId = (value: unknown): value is ChoiceId => typeof value === 'string' && value in CHOICE_BY_ID;

/** Вариант по умолчанию для линии миссий (когда ученика привели сюда ссылкой из кабинета или старой настройкой). */
export function defaultChoiceFor(track: AccountTrack): Choice {
    return CHOICES.find((choice) => choice.track === track) ?? CHOICES[0];
}

/**
 * Вариант, подходящий линии миссий: сохранённый выбор, если он той же линии (Базовый и Мини 2 на SDK 2 не путаются),
 * иначе вариант по умолчанию.
 */
export function choiceForTrack(track: AccountTrack, stored: unknown): Choice {
    return isChoiceId(stored) && CHOICE_BY_ID[stored].track === track ? CHOICE_BY_ID[stored] : defaultChoiceFor(track);
}

const STORAGE_KEY = 'pioneer:learning:choice:v1';

export function loadStoredChoice(storage: Pick<Storage, 'getItem'> | null): ChoiceId | null {
    try {
        const value = storage?.getItem(STORAGE_KEY);
        return isChoiceId(value) ? value : null;
    } catch { return null; }
}

export function saveStoredChoice(storage: Pick<Storage, 'setItem'> | null, id: ChoiceId): void {
    try { storage?.setItem(STORAGE_KEY, id); } catch { /* без хранилища выбор спросим снова */ }
}
