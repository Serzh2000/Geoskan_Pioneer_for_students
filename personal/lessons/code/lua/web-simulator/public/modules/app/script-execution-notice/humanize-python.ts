/*
 * Adapter between the Python error dictionary (../../shared/notice-messages/python-errors.ts)
 * and the HumanizedScriptFailure shape used by the notice layer.
 */
import { explainPythonRuntimeError, explainPythonSyntaxError } from '../../shared/notice-messages/python-errors.js';
import { getLastNonEmptyLine } from './error.js';
import { toHumanized } from './humanize-lua.js';
import type { HumanizedScriptFailure } from './types.js';

export function humanizePythonSyntaxMessage(message: string, line?: number | null): HumanizedScriptFailure | null {
    const explained = explainPythonSyntaxError(message, { line });
    return explained ? toHumanized(explained, message) : null;
}

export function humanizePythonRuntimeMessage(message: string, line?: number | null): HumanizedScriptFailure | null {
    const explained = explainPythonRuntimeError(message, { line });
    // A traceback is long; its last line is the one that names the error.
    return explained ? toHumanized(explained, getLastNonEmptyLine(message)) : null;
}
