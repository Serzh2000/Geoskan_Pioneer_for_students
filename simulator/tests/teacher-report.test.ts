/** Кабинет учителя: статусы учеников, фильтры, сортировка и CSV. */
import type { OverviewStudent } from '../public/modules/learning/account.js';
import { countByStatus, csvCell, filterStudents, matrixReport, sortStudents, studentStatus, summaryReport, toCsv, troubleScore } from '../public/modules/learning/teacher-report.js';

const NOW = new Date('2026-03-10T12:00:00').getTime();
const HOUR = 3600_000;
const DAY = 24 * HOUR;

function student(patch: Partial<OverviewStudent> & { fullName: string }): OverviewStudent {
    return {
        id: patch.fullName, role: 'student', login: patch.fullName.toLowerCase().replace(/\s/g, '.'), createdAt: NOW - 30 * DAY, counts: { blocks: 0, lua: 0, python: 0, sdk2: 0, bricks: 0 },
        classId: null, lastActiveAt: null, note: '', done: { blocks: [], lua: [], python: [], sdk2: [], bricks: [] }, attemptsTotal: 0, attempts7d: 0, lastAttemptAt: null, stuck: null, ...patch
    } as OverviewStudent;
}

describe('статус ученика', () => {
    test('застрял важнее всего, потом сегодня, давно не заходил, не начинал', () => {
        const stuck = student({ fullName: 'А', lastActiveAt: NOW - HOUR, stuck: { track: 'lua', questId: 'academy-004', fails: 3, lastAt: NOW } });
        expect(studentStatus(stuck, NOW)).toBe('stuck');
        expect(studentStatus(student({ fullName: 'Б', lastActiveAt: NOW - HOUR, counts: { blocks: 1, lua: 0, python: 0, sdk2: 0, bricks: 0 } }), NOW)).toBe('today');
        expect(studentStatus(student({ fullName: 'В', lastActiveAt: NOW - 2 * DAY, counts: { blocks: 0, lua: 3, python: 0, sdk2: 0, bricks: 0 } }), NOW)).toBe('active');
        expect(studentStatus(student({ fullName: 'Г', lastActiveAt: NOW - 9 * DAY, counts: { blocks: 0, lua: 3, python: 0, sdk2: 0, bricks: 0 } }), NOW)).toBe('away');
        expect(studentStatus(student({ fullName: 'Д' }), NOW)).toBe('new');
        expect(studentStatus(student({ fullName: 'Е', lastActiveAt: NOW - 20 * DAY, attemptsTotal: 2 }), NOW)).toBe('away');
    });

    test('счётчики по статусам', () => {
        const list = [student({ fullName: 'А' }), student({ fullName: 'Б' }), student({ fullName: 'В', lastActiveAt: NOW - HOUR })];
        expect(countByStatus(list, NOW)).toEqual({ stuck: 0, today: 1, active: 0, away: 0, new: 2 });
    });
});

describe('фильтры и сортировка', () => {
    const list = [
        student({ fullName: 'Иванов Иван', login: 'ivanov.ivan', classId: 'a', counts: { blocks: 0, lua: 10, python: 0, sdk2: 0, bricks: 0 } }),
        student({ fullName: 'Петрова Мария', classId: 'b', counts: { blocks: 0, lua: 2, python: 0, sdk2: 0, bricks: 0 } }),
        student({ fullName: 'Ёжиков Ёж', classId: null, counts: { blocks: 0, lua: 7, python: 0, sdk2: 0, bricks: 0 } })
    ];
    const classes = [{ id: 'a', name: '8А', createdAt: 0 }, { id: 'b', name: '9Б', createdAt: 0 }];

    test('поиск по ФИО и логину, класс, «без класса»', () => {
        expect(filterStudents(list, { search: 'мария', classId: '', status: 'all' }, NOW)).toHaveLength(1);
        expect(filterStudents(list, { search: 'ivanov', classId: '', status: 'all' }, NOW)).toHaveLength(1);
        expect(filterStudents(list, { search: '', classId: 'a', status: 'all' }, NOW)).toHaveLength(1);
        expect(filterStudents(list, { search: '', classId: 'none', status: 'all' }, NOW).map((item) => item.fullName)).toEqual(['Ёжиков Ёж']);
    });

    test('сортировка по-русски (ё после е) и по числам, в обе стороны', () => {
        expect(sortStudents(list, 'name', false, classes).map((item) => item.fullName[0])).toEqual(['Ё', 'И', 'П']);
        expect(sortStudents(list, 'lua', true, classes).map((item) => item.counts.lua)).toEqual([10, 7, 2]);
        expect(sortStudents(list, 'class', false, classes)[0].classId).toBeNull();
    });
});

describe('CSV', () => {
    test('ячейки: кавычки, разделитель, формулы не исполняются', () => {
        expect(csvCell('простой')).toBe('простой');
        expect(csvCell('a;b')).toBe('"a;b"');
        expect(csvCell('он сказал "да"')).toBe('"он сказал ""да"""');
        expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
        expect(csvCell(null)).toBe('');
        expect(toCsv([['а', 1], ['б', 2]])).toBe('а;1\r\nб;2');
    });

    test('итоги и журнал миссий', () => {
        const list = [student({ fullName: 'Иванов Иван', login: 'ivanov.ivan', classId: 'a', counts: { blocks: 1, lua: 2, python: 0, sdk2: 0, bricks: 0 }, done: { blocks: ['x'], lua: ['q1', 'q3'], python: [], sdk2: [], bricks: [] }, stuck: { track: 'lua', questId: 'q2', fails: 3, lastAt: NOW } })];
        const classes = [{ id: 'a', name: '8А', createdAt: 0 }];
        const summary = summaryReport(list, classes, { blocks: 16, lua: 72, python: 108, sdk2: 37, bricks: 16 }, (track, id) => `${track}:${id}`).split('\r\n');
        expect(summary[0]).toContain('Lua (из 72)');
        expect(summary[0]).toContain('Мини 2 · SDK2 (из 37)');
        expect(summary[0]).toContain('Мини 2 · Bricks (из 16)');
        expect(summary[1]).toBe('Иванов Иван;ivanov.ivan;8А;1;2;0;0;0;;lua:q2');
        const matrix = matrixReport(list, classes, 'lua', [{ id: 'q1', number: 1, title: 'Один' }, { id: 'q2', number: 2, title: 'Два' }, { id: 'q3', number: 3, title: 'Три' }]).split('\r\n');
        expect(matrix[0]).toBe('ФИО;Класс;1. Один;2. Два;3. Три;Всего');
        expect(matrix[1]).toBe('Иванов Иван;8А;1;;1;2');
    });
});

describe('где миссию стоит переписать', () => {
    const row = (patch: object) => ({ track: 'lua' as const, questId: 'q', opens: 10, sessions: 5, hints: 0, done: 0, leaves: 0, medianDoneSeconds: null, medianLeaveSeconds: null, ...patch });
    test('оценка растёт с долей ушедших и просивших подсказку; на малых данных не считается', () => {
        expect(troubleScore(row({ leaves: 8, hints: 6 }))).toBeGreaterThan(troubleScore(row({ leaves: 1, hints: 1 }))!);
        expect(troubleScore(row({}))).toBe(0);
        expect(troubleScore(row({ opens: 2, leaves: 2 }))).toBeNull();
    });
});
