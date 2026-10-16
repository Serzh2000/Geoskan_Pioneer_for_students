/*
 * Adapter between the Lua error dictionary (../../shared/notice-messages/lua-errors.ts)
 * and the HumanizedScriptFailure shape used by the notice layer.
 * All wording lives in the dictionary, not here.
 */
import { explainLuaRuntimeError, explainLuaSyntaxError } from '../../shared/notice-messages/lua-errors.js';
import type { ErrorExplanation } from '../../shared/notice-messages/types.js';
import type { HumanizedScriptFailure } from './types.js';

export function toHumanized(explained: ErrorExplanation, raw: string): HumanizedScriptFailure {
    return {
        title: explained.title,
        summary: explained.message,
        details: explained.hint ?? null,
        example: explained.example ?? null,
        line: explained.line ?? null,
        rawDetails: raw,
        // Simulator-own mission messages are already fully explained; their raw text adds nothing.
        suppressTechnicalDetails: explained.id === 'lua.runtime.simultaneous'
    };
}

export function humanizeLuaSyntaxMessage(message: string, line?: number | null): HumanizedScriptFailure | null {
    const explained = explainLuaSyntaxError(message, { line });
    return explained ? toHumanized(explained, message) : null;
}

export function humanizeLuaRuntimeMessage(message: string, line?: number | null): HumanizedScriptFailure | null {
    const explained = explainLuaRuntimeError(message, { line });
    return explained ? toHumanized(explained, message) : null;
}
