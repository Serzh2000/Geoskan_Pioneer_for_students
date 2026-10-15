/**
 * Преобразует сырые ошибки Lua/Python в понятные для ученика объяснения.
 * Модуль изолирован от UI и возвращает только структурированное описание;
 * сами формулировки лежат в shared/notice-messages/.
 */
import type { ScriptLanguage } from '../../core/state.js';
import { genericFailureMessage, genericFailureTitle } from '../../shared/notice-messages/catalog.js';
import {
    humanizeLuaRuntimeMessage,
    humanizeLuaSyntaxMessage
} from './humanize-lua.js';
import {
    humanizePythonRuntimeMessage,
    humanizePythonSyntaxMessage
} from './humanize-python.js';
import type { HumanizedScriptFailure, ScriptFailureKind } from './types.js';

export function humanizeScriptFailure(
    language: ScriptLanguage,
    kind: ScriptFailureKind,
    message: string,
    line?: number | null
): HumanizedScriptFailure {
    const normalizedMessage = String(message || '').trim();
    const humanized = language === 'python'
        ? (kind === 'syntax' ? humanizePythonSyntaxMessage(normalizedMessage, line) : humanizePythonRuntimeMessage(normalizedMessage, line))
        : (kind === 'syntax' ? humanizeLuaSyntaxMessage(normalizedMessage, line) : humanizeLuaRuntimeMessage(normalizedMessage, line));

    if (humanized) {
        return humanized;
    }

    return {
        title: genericFailureTitle(kind),
        summary: genericFailureMessage(kind, normalizedMessage),
        rawDetails: normalizedMessage
    };
}
