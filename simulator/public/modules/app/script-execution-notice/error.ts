/**
 * Базовые фабрики и утилиты для ошибок сценариев.
 * Используется и UI-нотисами, и диагностикой Lua/Python.
 */
import type { ScriptFailureError, ScriptFailureKind } from './types.js';

export function createScriptFailureError(
    kind: ScriptFailureKind,
    message: string,
    options?: {
        line?: number | null;
        column?: number | null;
        details?: string | null;
        phase?: string | null;
        stack?: string | null;
        contextLines?: string[] | null;
        fsmHistory?: string[] | null;
    }
): ScriptFailureError {
    const error = new Error(message) as ScriptFailureError;
    error.name = kind === 'syntax' ? 'ScriptSyntaxError' : 'ScriptRuntimeError';
    error.scriptFailureKind = kind;
    error.scriptFailureLine = options?.line ?? null;
    error.scriptFailureColumn = options?.column ?? null;
    error.scriptFailureDetails = options?.details ?? null;
    error.scriptFailurePhase = options?.phase ?? null;
    error.scriptFailureStack = options?.stack ?? null;
    error.scriptFailureContextLines = options?.contextLines ?? null;
    error.scriptFailureFsmHistory = options?.fsmHistory ?? null;
    return error;
}

export function normalizeScriptFailureError(error: unknown, fallbackKind: ScriptFailureKind): ScriptFailureError {
    if (error instanceof Error) {
        const typed = error as ScriptFailureError;
        typed.scriptFailureKind = typed.scriptFailureKind || fallbackKind;
        return typed;
    }

    return createScriptFailureError(fallbackKind, String(error));
}

export function getLastNonEmptyLine(value: string): string {
    const lines = value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    return lines[lines.length - 1] || value.trim();
}
