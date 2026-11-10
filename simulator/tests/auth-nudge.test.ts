/** Напоминание об аккаунте: показывается гостю не чаще раза в день по местному календарю. */
import { dayKey, markAuthNudgeShown, shouldShowAuthNudge } from '../public/modules/learning/auth-nudge.js';

const memory = () => {
    const data = new Map<string, string>();
    return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
};

describe('напоминание об аккаунте', () => {
    test('день записывается как год-месяц-день с нулями', () => {
        expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
        expect(dayKey(new Date(2026, 10, 10, 0, 1))).toBe('2026-11-10');
    });

    test('первый раз показываем, в тот же день не повторяем, на следующий день снова', () => {
        const store = memory();
        const morning = new Date(2026, 10, 10, 9, 0);
        expect(shouldShowAuthNudge(store, morning)).toBe(true);
        markAuthNudgeShown(store, morning);
        expect(shouldShowAuthNudge(store, new Date(2026, 10, 10, 23, 30))).toBe(false);
        expect(shouldShowAuthNudge(store, new Date(2026, 10, 11, 0, 5))).toBe(true);
    });

    test('без хранилища напоминание показывается, а ошибки хранилища не ломают обучение', () => {
        expect(shouldShowAuthNudge(null)).toBe(true);
        const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
        expect(shouldShowAuthNudge(broken)).toBe(true);
        expect(() => markAuthNudgeShown(broken)).not.toThrow();
    });
});
