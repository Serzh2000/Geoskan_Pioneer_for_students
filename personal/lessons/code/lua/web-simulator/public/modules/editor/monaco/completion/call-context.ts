/*
 * Where is the cursor in a call? "ap.goToLocalPoint(1, 2, |" is inside the call of `ap.goToLocalPoint`, at its third
 * argument. The scan reads the text forward, so nested calls, brackets of tables and strings with commas in them do not
 * confuse the count.
 */

export type ScriptLanguage = 'lua' | 'python';

export interface CallContext {
    /** The called name as written, without spaces: `ap.push`, `leds:set`, `math.max`. */
    callee: string;
    /** Zero-based number of the argument the cursor is in. */
    argIndex: number;
}

type Frame = { open: string; callee: string | null; commas: number };

// Words that put a bracket after them without making a call: `if (a)`, `while (x)`, `function (a, b)`.
const NOT_CALLS = new Set(['if', 'elseif', 'while', 'for', 'function', 'return', 'and', 'or', 'not', 'in', 'until', 'def', 'class', 'elif']);
const CALLEE_AT_END = /([A-Za-z_]\w*(?:\s*[.:]\s*[A-Za-z_]\w*)*)\s*$/;
const MAX_SCANNED = 8000;

function calleeBefore(text: string, openIndex: number, language: ScriptLanguage): string | null {
    const before = text.slice(Math.max(0, openIndex - 120), openIndex);
    const match = before.match(CALLEE_AT_END);
    if (!match) return null;
    const callee = match[1].replace(/\s+/g, '');
    const first = callee.split(/[.:]/)[0];
    if (NOT_CALLS.has(first) && !callee.includes('.') && !callee.includes(':')) return null;
    // `function name(` and `def name(` declare, they do not call.
    const head = before.slice(0, before.length - match[0].length);
    if (language === 'lua' && /\bfunction\s*$/.test(head)) return null;
    if (language === 'python' && /\b(def|class)\s*$/.test(head)) return null;
    return callee;
}

export function findCallContext(textBeforeCursor: string, language: ScriptLanguage): CallContext | null {
    const text = textBeforeCursor.length > MAX_SCANNED ? textBeforeCursor.slice(-MAX_SCANNED) : textBeforeCursor;
    const stack: Frame[] = [];
    const commentStart = language === 'lua' ? '--' : '#';
    let i = 0;
    while (i < text.length) {
        const ch = text[i];
        if (text.startsWith(commentStart, i)) {
            // Lua long comments and strings ([[ ... ]]) are rare in a student's script; a line comment ends at the line break.
            const lineEnd = text.indexOf('\n', i);
            if (lineEnd < 0) return null; // the cursor is inside a comment
            i = lineEnd + 1;
            continue;
        }
        if (ch === '"' || ch === "'") {
            let j = i + 1;
            while (j < text.length && text[j] !== ch && text[j] !== '\n') {
                if (text[j] === '\\') j += 1;
                j += 1;
            }
            if (j >= text.length) return null; // the cursor is inside a string
            i = j + 1;
            continue;
        }
        if (ch === '(') stack.push({ open: '(', callee: calleeBefore(text, i, language), commas: 0 });
        else if (ch === '[' || ch === '{') stack.push({ open: ch, callee: null, commas: 0 });
        else if (ch === ')' || ch === ']' || ch === '}') stack.pop();
        else if (ch === ',') {
            const top = stack[stack.length - 1];
            if (top) top.commas += 1;
        }
        i += 1;
    }
    const top = stack[stack.length - 1];
    if (!top || top.open !== '(' || !top.callee) return null;
    return { callee: top.callee, argIndex: top.commas };
}
