/**
 * Чистые функции кабинета учителя: статус ученика, фильтры, сортировка и отчёт CSV. Без DOM и запросов,
 * поэтому проверяются обычными тестами.
 */
import { ACCOUNT_TRACKS, TRACK_NAMES, type AccountTrack, type ClassInfo, type OverviewStudent } from './account.js';

export type StudentStatus = 'stuck' | 'today' | 'active' | 'away' | 'new';
export type StatusFilter = 'all' | StudentStatus;
export type SortKey = 'name' | 'class' | AccountTrack | 'seen';

const DAY = 24 * 60 * 60 * 1000;
/** Не заходил столько дней — «давно не заходил». */
export const AWAY_DAYS = 7;

export const STATUS_LABELS: Record<StudentStatus, string> = {
    stuck: 'Застряли',
    today: 'Сегодня занимались',
    active: 'Занимаются',
    away: 'Давно не заходили',
    new: 'Ещё не начинали'
};

/** Начало местного дня: «сегодня» считается по часам учителя, а не по UTC. */
export function startOfToday(now: number): number {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

/**
 * Один статус на ученика, по важности: застрял > занимался сегодня > давно не заходил > ещё не начинал > занимается.
 * «Ещё не начинал» — нет ни зачётов, ни проверок.
 */
export function studentStatus(student: OverviewStudent, now = Date.now()): StudentStatus {
    if (student.stuck) return 'stuck';
    const lastSeen = Math.max(student.lastActiveAt ?? 0, student.lastAttemptAt ?? 0);
    if (lastSeen >= startOfToday(now)) return 'today';
    const total = ACCOUNT_TRACKS.reduce((sum, key) => sum + (student.counts[key] ?? 0), 0);
    if (total === 0 && student.attemptsTotal === 0) return 'new';
    if (!lastSeen || now - lastSeen > AWAY_DAYS * DAY) return 'away';
    return 'active';
}

export function countByStatus(students: OverviewStudent[], now = Date.now()): Record<StudentStatus, number> {
    const out: Record<StudentStatus, number> = { stuck: 0, today: 0, active: 0, away: 0, new: 0 };
    students.forEach((student) => { out[studentStatus(student, now)]++; });
    return out;
}

export type StudentFilter = { search: string; classId: string; status: StatusFilter };

/** classId: пусто — все классы, «none» — ученики без класса. */
export function filterStudents(students: OverviewStudent[], filter: StudentFilter, now = Date.now()): OverviewStudent[] {
    const needle = filter.search.trim().toLowerCase();
    return students.filter((student) => {
        if (needle && !student.fullName.toLowerCase().includes(needle) && !student.login.toLowerCase().includes(needle)) return false;
        if (filter.classId === 'none' ? student.classId : filter.classId && student.classId !== filter.classId) return false;
        return filter.status === 'all' || studentStatus(student, now) === filter.status;
    });
}

export function sortStudents(students: OverviewStudent[], key: SortKey, descending: boolean, classes: ClassInfo[]): OverviewStudent[] {
    const className = (student: OverviewStudent) => classes.find((item) => item.id === student.classId)?.name ?? '';
    const value = (student: OverviewStudent): string | number => {
        if (key === 'name') return student.fullName;
        if (key === 'class') return className(student);
        if (key === 'seen') return Math.max(student.lastActiveAt ?? 0, student.lastAttemptAt ?? 0);
        return student.counts[key] ?? 0;
    };
    const sign = descending ? -1 : 1;
    return [...students].sort((a, b) => {
        const x = value(a);
        const y = value(b);
        const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ru');
        return order * sign || a.fullName.localeCompare(b.fullName, 'ru');
    });
}

/* ---------- CSV ---------- */

/** Ячейка CSV для Excel с русскими настройками: разделитель «;», кавычки удваиваются, формулы не исполняются. */
export function csvCell(value: unknown): string {
    let text = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const toCsv = (rows: unknown[][]): string => rows.map((row) => row.map(csvCell).join(';')).join('\r\n');

export type ReportQuest = { id: string; number: number; title: string };

const dateText = (at: number | null | undefined) => (at ? new Date(at).toLocaleDateString('ru-RU') : '');

/** Итоговая таблица по классу: имя, класс, пройдено по языкам, последний вход, где застрял. */
export function summaryReport(students: OverviewStudent[], classes: ClassInfo[], totals: Record<AccountTrack, number>, titleOf: (track: AccountTrack, id: string) => string): string {
    const header = ['Имя', 'Логин', 'Класс', ...ACCOUNT_TRACKS.map((key) => `${TRACK_NAMES[key]} (из ${totals[key]})`), 'Последний вход', 'Застрял на'];
    const rows = students.map((student) => [
        student.fullName, student.login, classes.find((item) => item.id === student.classId)?.name ?? '',
        ...ACCOUNT_TRACKS.map((key) => student.counts[key] ?? 0),
        dateText(Math.max(student.lastActiveAt ?? 0, student.lastAttemptAt ?? 0) || null),
        student.stuck ? titleOf(student.stuck.track, student.stuck.questId) : ''
    ]);
    return toCsv([header, ...rows]);
}

/** Журнал по одному языку: строка — ученик, столбец — миссия, 1 — пройдена. */
export function matrixReport(students: OverviewStudent[], classes: ClassInfo[], track: AccountTrack, quests: ReportQuest[]): string {
    const header = ['Имя', 'Класс', ...quests.map((quest) => `${quest.number}. ${quest.title}`), 'Всего'];
    const rows = students.map((student) => {
        const done = new Set(student.done[track]);
        return [student.fullName, classes.find((item) => item.id === student.classId)?.name ?? '', ...quests.map((quest) => (done.has(quest.id) ? 1 : '')), done.size];
    });
    return toCsv([header, ...rows]);
}

/** Выданные логины и пароли: для печати листков и таблицы. */
export function credentialsReport(rows: { fullName: string; login: string; password: string }[]): string {
    return toCsv([['Имя', 'Логин', 'Временный пароль'], ...rows.map((row) => [row.fullName, row.login, row.password])]);
}

/* ---------- Метрика: чему уделить внимание ---------- */

export type QuestMetricRow = {
    track: AccountTrack; questId: string; opens: number; sessions: number; hints: number; done: number; leaves: number;
    medianDoneSeconds: number | null; medianLeaveSeconds: number | null;
};

/**
 * Оценка «где миссия трудна или непонятна»: доля тех, кто ушёл, не пройдя, плюс доля открывших подсказку.
 * Для редких миссий (меньше трёх открытий) оценка не считается, чтобы случайность не выглядела закономерностью.
 */
export function troubleScore(row: QuestMetricRow): number | null {
    if (row.opens < 3) return null;
    return Math.round(((row.leaves / row.opens) * 0.65 + (Math.min(row.hints, row.opens) / row.opens) * 0.35) * 100);
}
