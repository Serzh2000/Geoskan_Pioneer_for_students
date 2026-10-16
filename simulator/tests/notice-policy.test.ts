import { describe, expect, test } from '@jest/globals';
import {
    noticeLifetimeMs,
    noticeRole,
    noticeSignature,
    pickToastToEvict,
    recordNotice,
    splitInlineCode,
    type NoticeEntry
} from '../public/modules/ui/panels/notice-policy.js';

function entry(partial: Partial<NoticeEntry> = {}): NoticeEntry {
    return {
        title: 'Нет функции goTo',
        message: 'В строке 3 вызывается goTo.',
        detailsHtml: '',
        level: 'error',
        actions: [],
        time: '12:00:00',
        count: 1,
        ...partial
    };
}

describe('noticeLifetimeMs', () => {
    test('errors stay until the student closes them', () => {
        expect(noticeLifetimeMs('error', 10)).toBeNull();
        expect(noticeLifetimeMs('error', 5000)).toBeNull();
    });

    test('success disappears quickly, warnings stay longer', () => {
        const success = noticeLifetimeMs('success', 30)!;
        const info = noticeLifetimeMs('info', 30)!;
        const warn = noticeLifetimeMs('warn', 30)!;
        expect(success).toBeLessThan(info);
        expect(info).toBeLessThan(warn);
        expect(success).toBeGreaterThanOrEqual(3000);
    });

    test('longer text stays longer, up to a cap', () => {
        expect(noticeLifetimeMs('warn', 200)!).toBeGreaterThan(noticeLifetimeMs('warn', 40)!);
        expect(noticeLifetimeMs('warn', 100000)!).toBe(20000);
        expect(noticeLifetimeMs('success', 100000)!).toBe(8000);
    });
});

describe('pickToastToEvict', () => {
    test('does nothing while there is room', () => {
        expect(pickToastToEvict(['error', 'warn'], 3)).toBe(-1);
    });

    test('drops the oldest quiet toast and keeps errors', () => {
        expect(pickToastToEvict(['error', 'warn', 'error'], 3)).toBe(1);
        expect(pickToastToEvict(['info', 'error', 'warn'], 3)).toBe(0);
    });

    test('drops the oldest error only when everything is an error', () => {
        expect(pickToastToEvict(['error', 'error', 'error'], 3)).toBe(0);
    });
});

describe('recordNotice (grouping)', () => {
    test('identical repeats become one entry with a counter', () => {
        let history: NoticeEntry[] = [];
        for (let i = 0; i < 3; i += 1) {
            history = recordNotice(history, entry(), 50).history;
        }
        expect(history).toHaveLength(1);
        expect(history[0].count).toBe(3);
    });

    test('reports whether the notice was merged', () => {
        const first = recordNotice([], entry(), 50);
        expect(first.merged).toBeNull();
        const second = recordNotice(first.history, entry({ time: '12:00:05' }), 50);
        expect(second.merged?.count).toBe(2);
        expect(second.merged?.time).toBe('12:00:05');
    });

    test('a different message or level is a different notice', () => {
        let history = recordNotice([], entry(), 50).history;
        history = recordNotice(history, entry({ message: 'В строке 9 вызывается goTo.' }), 50).history;
        history = recordNotice(history, entry({ level: 'warn' }), 50).history;
        expect(history).toHaveLength(3);
        expect(history.every((item) => item.count === 1)).toBe(true);
    });

    test('a repeat moves to the end of the history', () => {
        let history = recordNotice([], entry(), 50).history;
        history = recordNotice(history, entry({ title: 'Другое' }), 50).history;
        history = recordNotice(history, entry(), 50).history;
        expect(history.map((item) => item.title)).toEqual(['Другое', 'Нет функции goTo']);
        expect(history[1].count).toBe(2);
    });

    test('only recent entries are grouped, so old identical errors start a new card', () => {
        let history = recordNotice([], entry(), 50).history;
        for (let i = 0; i < 6; i += 1) {
            history = recordNotice(history, entry({ title: `Заполнитель ${i}` }), 50).history;
        }
        history = recordNotice(history, entry(), 50).history;
        expect(history.filter((item) => item.title === 'Нет функции goTo')).toHaveLength(2);
    });

    test('history is capped', () => {
        let history: NoticeEntry[] = [];
        for (let i = 0; i < 60; i += 1) {
            history = recordNotice(history, entry({ title: `Заголовок ${i}` }), 50).history;
        }
        expect(history).toHaveLength(50);
        expect(history[0].title).toBe('Заголовок 10');
    });

    test('signature ignores time and count', () => {
        expect(noticeSignature(entry())).toBe(noticeSignature(entry({ time: '99:99:99', count: 7 })));
    });
});

describe('splitInlineCode', () => {
    test('splits backticks into code parts', () => {
        expect(splitInlineCode('Вызовите `sleep(1)` позже')).toEqual([
            { text: 'Вызовите ', code: false },
            { text: 'sleep(1)', code: true },
            { text: ' позже', code: false }
        ]);
    });

    test('an unpaired backtick stays as plain text', () => {
        expect(splitInlineCode('одна ` кавычка')).toEqual([{ text: 'одна ` кавычка', code: false }]);
    });

    test('plain text is one part', () => {
        expect(splitInlineCode('просто текст')).toEqual([{ text: 'просто текст', code: false }]);
    });
});

describe('noticeRole', () => {
    test('only errors interrupt a screen reader', () => {
        expect(noticeRole('error')).toBe('alert');
        expect(noticeRole('warn')).toBe('status');
        expect(noticeRole('info')).toBe('status');
        expect(noticeRole('success')).toBe('status');
    });
});
