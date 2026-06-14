/**
 * Преобразует сырые ошибки Lua/Python в понятные для ученика объяснения.
 * Модуль изолирован от UI и возвращает только структурированное описание.
 */
import type { ScriptLanguage } from '../../core/state.js';
import { getLastNonEmptyLine } from './error.js';
import {
    humanizeLuaRuntimeMessage,
    humanizeLuaSyntaxMessage
} from './humanize-lua.js';
import {
    humanizePythonRuntimeMessage,
    humanizePythonSyntaxMessage
} from './humanize-python.js';
import type { HumanizedScriptFailure, ScriptFailureKind } from './types.js';

export function humanizeScriptFailure(language: ScriptLanguage, kind: ScriptFailureKind, message: string): HumanizedScriptFailure {
    const normalizedMessage = String(message || '').trim();
    const humanized = language === 'python'
        ? (kind === 'syntax' ? humanizePythonSyntaxMessage(normalizedMessage) : humanizePythonRuntimeMessage(normalizedMessage))
        : (kind === 'syntax' ? humanizeLuaSyntaxMessage(normalizedMessage) : humanizeLuaRuntimeMessage(normalizedMessage));

    if (humanized) {
        return humanized;
    }

    return {
        summary: getLastNonEmptyLine(normalizedMessage) || 'Не удалось распознать тип ошибки.',
        rawDetails: normalizedMessage
    };
}
