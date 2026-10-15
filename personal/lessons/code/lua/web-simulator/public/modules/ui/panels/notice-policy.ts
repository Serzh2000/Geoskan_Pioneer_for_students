/*
 * Pure rules of the notification system (no DOM): how long a toast stays, which
 * toast makes room for a new one, how identical repeats are grouped, and how
 * `inline code` in a message is split for rendering. simulation-notice.ts uses
 * these; tests/notice-policy.test.ts covers them.
 */
import type { NoticeAction, NoticeLevel } from '../../shared/notice-messages/types.js';

export type NoticeEntry = {
    title: string;
    message: string;
    detailsHtml: string;
    level: NoticeLevel;
    actions: NoticeAction[];
    time: string;
    /** How many times this exact notice has fired in a row (1 = once). */
    count: number;
};

const BASE_LIFETIME_MS: Record<Exclude<NoticeLevel, 'error'>, number> = {
    success: 3500,
    info: 5500,
    warn: 9000
};

const MAX_LIFETIME_MS: Record<Exclude<NoticeLevel, 'error'>, number> = {
    success: 8000,
    info: 15000,
    warn: 20000
};

const FREE_CHARACTERS = 60;
const MS_PER_EXTRA_CHARACTER = 50;

/**
 * How long a toast stays on screen. Errors never expire by themselves: the
 * student closes them. Others stay longer when the text is longer.
 */
export function noticeLifetimeMs(level: NoticeLevel, textLength: number): number | null {
    if (level === 'error') return null;
    const extra = Math.max(0, textLength - FREE_CHARACTERS) * MS_PER_EXTRA_CHARACTER;
    return Math.min(BASE_LIFETIME_MS[level] + extra, MAX_LIFETIME_MS[level]);
}

/** Two notices are "the same" when level, title and message match. */
export function noticeSignature(notice: { level: NoticeLevel; title: string; message: string }): string {
    return `${notice.level}\u0001${notice.title}\u0001${notice.message}`;
}

/** Index of the toast to dismiss when the stack is full: the oldest non-error, else the oldest. -1 when there is room. */
export function pickToastToEvict(levels: NoticeLevel[], maxVisible: number): number {
    if (levels.length < maxVisible) return -1;
    const firstQuiet = levels.findIndex((level) => level !== 'error');
    return firstQuiet >= 0 ? firstQuiet : 0;
}

const GROUP_LOOKBACK = 5;

/**
 * Adds a notice to the history. If the same notice is among the last few
 * entries it is not duplicated: its counter grows and it moves to the end.
 */
export function recordNotice(history: NoticeEntry[], incoming: NoticeEntry, maxHistory: number): { history: NoticeEntry[]; merged: NoticeEntry | null } {
    const signature = noticeSignature(incoming);
    const start = Math.max(0, history.length - GROUP_LOOKBACK);
    for (let index = history.length - 1; index >= start; index -= 1) {
        const existing = history[index];
        if (noticeSignature(existing) !== signature) continue;
        const merged: NoticeEntry = {
            ...incoming,
            count: existing.count + 1
        };
        const next = [...history.slice(0, index), ...history.slice(index + 1), merged];
        return { history: next, merged };
    }
    const next = [...history, incoming];
    if (next.length > maxHistory) next.splice(0, next.length - maxHistory);
    return { history: next, merged: null };
}

export type TextPart = { text: string; code: boolean };

/** Splits "use `sleep(1)` here" into plain and code parts. An unpaired backtick stays as text. */
export function splitInlineCode(text: string): TextPart[] {
    const parts: TextPart[] = [];
    const pieces = String(text ?? '').split('`');
    if (pieces.length % 2 === 0) return [{ text: String(text ?? ''), code: false }];
    pieces.forEach((piece, index) => {
        if (!piece) return;
        parts.push({ text: piece, code: index % 2 === 1 });
    });
    return parts;
}

export const LEVEL_LABELS: Record<NoticeLevel, string> = {
    error: 'Ошибка',
    warn: 'Внимание',
    info: 'Подсказка',
    success: 'Готово'
};

/** Titles for notices that arrive as a bare string. */
export const FALLBACK_TITLES: Record<NoticeLevel, string> = {
    error: 'Что-то пошло не так',
    warn: 'Обратите внимание',
    info: 'Подсказка',
    success: 'Готово'
};

/** role for a toast: only errors interrupt a screen reader. */
export function noticeRole(level: NoticeLevel): 'alert' | 'status' {
    return level === 'error' ? 'alert' : 'status';
}
