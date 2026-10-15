/*
 * Shared shape of a student-facing explanation of a raw interpreter error.
 * Dictionaries (lua-errors.ts, python-errors.ts) turn "attempt to call a nil
 * value (global 'foo')" into a title, a short message and an optional example;
 * the notice layer renders them without knowing which interpreter spoke.
 */
export type ErrorExplanation = {
    /** Stable id of the dictionary entry (used by tests and for grouping). */
    id: string;
    /** Up to ~6 words, everyday language: what happened. */
    title: string;
    /** One or two sentences: why it happened and the one thing to do next. */
    message: string;
    /** Longer "how to fix" text shown in the details card. */
    hint?: string;
    /** A short working snippet shown in the details card. */
    example?: string;
    /** Line parsed from the message (or taken from the caller) when known. */
    line?: number | null;
};

export type ExplainContext = {
    /** Line reported by the runtime when the raw message does not contain it. */
    line?: number | null;
};

export type DictionaryEntry = {
    id: string;
    test: RegExp;
    build: (match: RegExpMatchArray, context: { line: number | null; raw: string }) => Omit<ErrorExplanation, 'id' | 'line'>;
};

/** "В строке 7" when the line is known, otherwise a neutral opener. */
export function atLine(line: number | null | undefined, fallback = 'В программе'): string {
    return typeof line === 'number' && line > 0 ? `В строке ${line}` : fallback;
}

/** Wraps a name in backticks so the renderer shows it as inline code. */
export function code(value: string): string {
    return `\`${value}\``;
}

export type NoticeLevel = 'error' | 'warn' | 'info' | 'success';

/** A button inside a notice. Only actions the app can really perform exist here. */
export type NoticeAction =
    | { kind: 'show-line'; label: string; line: number; column?: number | null; message?: string }
    /** Opens the textbook; `lesson` (an academy lesson number) opens it at the page that explains the matter. */
    | { kind: 'open-guide'; label: string; lesson?: number };

export type NoticeText = {
    /** Up to ~6 words. */
    title: string;
    /** One or two sentences: what happened, why, what to do. Backticks mark inline code. */
    message: string;
    level: NoticeLevel;
    actions?: NoticeAction[];
};
