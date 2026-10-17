import type { ApiDoc } from '../../../docs/api-docs-types.js';
import { LUA_DOC_TABLE, LUA_EV_ENTRIES, activePythonDocTable } from './catalog.js';
import type { CallContext, ScriptLanguage } from './call-context.js';
import { resolveLuaOwnerName, resolvePythonOwnerName } from './context.js';
import type { CompletionDocEntry } from './types.js';

/*
 * From a call being typed to what the editor shows for it: the signature with the current argument highlighted, and
 * for a few calls the values that fit the argument (inside `ap.push(` the event constants).
 */

export interface ResolvedSignature {
    /** The key in the docs table, e.g. `ap.goToLocalPoint`. */
    key: string;
    label: string;
    doc: ApiDoc;
    /** [start, end) of each parameter inside `label`, for the highlight. */
    parameters: Array<[number, number]>;
}

function docTable(language: ScriptLanguage): Record<string, ApiDoc> {
    return language === 'lua' ? LUA_DOC_TABLE : activePythonDocTable();
}

/** Finds the documentation key of a callee: `leds:set` becomes `Ledbar:set` once `leds` is known to be a Ledbar. */
export function resolveDocKey(language: ScriptLanguage, documentText: string, callee: string): string | null {
    const table = docTable(language);
    const member = callee.match(/^(.*?)([.:])([A-Za-z_]\w*)$/);
    if (!member) return callee in table ? callee : null;
    const [, ownerName, separator, name] = member;
    const owner = language === 'lua' ? resolveLuaOwnerName(documentText, ownerName) : resolvePythonOwnerName(documentText, ownerName);
    if (!owner) return null;
    const other = separator === '.' ? ':' : '.';
    for (const candidate of [`${owner}${separator}${name}`, `${owner}${other}${name}`]) {
        if (candidate in table) return candidate;
    }
    return null;
}

/** The parameter names inside the brackets of a call form like `name(a, [b], c)`, with where each one sits in the text. */
export function parseParameterRanges(syntax: string): Array<[number, number]> {
    const open = syntax.indexOf('(');
    const close = syntax.lastIndexOf(')');
    if (open < 0 || close <= open) return [];
    const ranges: Array<[number, number]> = [];
    let depth = 0;
    let start = open + 1;
    const push = (from: number, to: number) => {
        let a = from;
        let b = to;
        while (a < b && /\s/.test(syntax[a])) a += 1;
        while (b > a && /\s/.test(syntax[b - 1])) b -= 1;
        if (b > a) ranges.push([a, b]);
    };
    for (let i = open + 1; i < close; i += 1) {
        const ch = syntax[i];
        if (ch === '(' || ch === '[' || ch === '{') depth += 1;
        else if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
        else if (ch === ',' && depth === 0) {
            push(start, i);
            start = i + 1;
        }
    }
    push(start, close);
    return ranges;
}

/** A call form for docs that only carry a snippet: `push(${1:event})` becomes `push(event)`. */
function syntaxFromInsertText(callee: string, insertText: string | undefined): string | null {
    if (!insertText) return null;
    const names = [...insertText.matchAll(/\$\{\d+:([^}]+)\}/g)].map((match) => match[1]);
    if (!names.length) return null;
    return `${callee}(${names.join(', ')})`;
}

export function resolveSignature(language: ScriptLanguage, documentText: string, callee: string): ResolvedSignature | null {
    const key = resolveDocKey(language, documentText, callee);
    if (!key) return null;
    const doc = docTable(language)[key];
    const label = doc.syntax || syntaxFromInsertText(callee, doc.insertText);
    if (!label || !label.includes('(')) return null;
    return { key, label, doc, parameters: parseParameterRanges(label) };
}

/**
 * The event constants as they are written in a program: `Ev.MCE_TAKEOFF`. A program pushes commands to the autopilot
 * (`ap.push(Ev.MCE_TAKEOFF)`) and compares incoming events in `callback` (`event == Ev.POINT_REACHED`), so each place
 * is offered only the constants that belong there; they keep the order of the documentation, commonest first.
 */
export function eventConstantEntries(use: 'push' | 'incoming' = 'push'): CompletionDocEntry[] {
    const wanted = use === 'push'
        ? (entry: CompletionDocEntry) => entry.direction === 'to-autopilot'
        : (entry: CompletionDocEntry) => entry.direction !== 'to-autopilot';
    return LUA_EV_ENTRIES.filter(wanted).map((entry, index) => ({
        ...entry,
        label: `Ev.${entry.label}`,
        insertText: `Ev.${entry.label}`,
        kind: 'EnumMember',
        filterText: `Ev.${entry.label} ${entry.filterText ?? entry.label}`,
        sortText: `0_${String(index).padStart(3, '0')}`
    }));
}

/** Values worth offering at the cursor inside a call: the event constants for the first argument of `ap.push`. */
export function getArgumentEntries(language: ScriptLanguage, documentText: string, context: CallContext | null): CompletionDocEntry[] {
    if (!context || language !== 'lua' || context.argIndex !== 0) return [];
    if (resolveDocKey(language, documentText, context.callee) !== 'ap.push') return [];
    return eventConstantEntries('push');
}
