/** Выбор «дрон + язык» в обучении: шесть вариантов, пять линий миссий, два варианта SDK 2 делят одну линию. */
import { CHOICES, CHOICE_BY_ID, choiceForTrack, defaultChoiceFor, isChoiceId, loadStoredChoice, saveStoredChoice } from '../public/modules/learning/track-choice.js';
import { ACCOUNT_TRACKS } from '../public/modules/learning/account.js';

describe('выбор в обучении', () => {
    test('шесть вариантов: четыре на Базовом и два на Мини 2, id уникальны', () => {
        expect(CHOICES).toHaveLength(6);
        expect(new Set(CHOICES.map((choice) => choice.id)).size).toBe(6);
        expect(CHOICES.filter((choice) => choice.model === 'pioneer-basic')).toHaveLength(4);
        expect(CHOICES.filter((choice) => choice.model === 'pioneer-mini2')).toHaveLength(2);
    });

    test('каждая линия миссий достижима, а SDK 2 есть и на Базовом, и на Мини 2', () => {
        for (const track of ACCOUNT_TRACKS) expect(CHOICES.some((choice) => choice.track === track)).toBe(true);
        const sdk2 = CHOICES.filter((choice) => choice.track === 'sdk2').map((choice) => choice.model).sort();
        expect(sdk2).toEqual(['pioneer-basic', 'pioneer-mini2']);
    });

    test('Мини 2 всегда на pioneer_sdk2, Базовый Lua, блоки и SDK 1 на pioneer_sdk', () => {
        for (const choice of CHOICES) {
            if (choice.model === 'pioneer-mini2') expect(choice.sdk).toBe('pioneer_sdk2');
        }
        expect(CHOICE_BY_ID['basic-lua'].sdk).toBe('pioneer_sdk');
        expect(CHOICE_BY_ID['basic-blocks'].sdk).toBe('pioneer_sdk');
        expect(CHOICE_BY_ID['basic-sdk1'].sdk).toBe('pioneer_sdk');
        expect(CHOICE_BY_ID['basic-sdk2'].sdk).toBe('pioneer_sdk2');
    });

    test('сохранённый выбор берётся, только если он той же линии; иначе вариант по умолчанию', () => {
        expect(choiceForTrack('sdk2', 'basic-sdk2').id).toBe('basic-sdk2');
        expect(choiceForTrack('sdk2', 'mini2-python').id).toBe('mini2-python');
        expect(choiceForTrack('sdk2', 'basic-lua').id).toBe(defaultChoiceFor('sdk2').id);
        expect(choiceForTrack('bricks', 'мусор').id).toBe('mini2-bricks');
        expect(choiceForTrack('lua', null).id).toBe('basic-lua');
        expect(isChoiceId('basic-sdk1')).toBe(true);
        expect(isChoiceId('x')).toBe(false);
    });

    test('выбор хранится в localStorage и не ломается без него', () => {
        const data = new Map<string, string>();
        const store = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
        expect(loadStoredChoice(store)).toBeNull();
        saveStoredChoice(store, 'mini2-bricks');
        expect(loadStoredChoice(store)).toBe('mini2-bricks');
        data.set('pioneer:learning:choice:v1', 'чушь');
        expect(loadStoredChoice(store)).toBeNull();
        expect(loadStoredChoice(null)).toBeNull();
        expect(() => saveStoredChoice({ setItem: () => { throw new Error('denied'); } }, 'basic-lua')).not.toThrow();
    });
});
