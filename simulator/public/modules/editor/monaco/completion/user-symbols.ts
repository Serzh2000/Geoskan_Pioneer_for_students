import type { CompletionDocEntry } from './types.js';

/*
 * The student's own names: variables, functions and parameters declared above the cursor. Monaco's word-based
 * suggestions are switched off (they filled the list with every word of the file), so the names that matter are
 * collected here from the declarations themselves and offered first in the list.
 */

const IDENTIFIER = '[A-Za-z_\\u0400-\\u04FF][\\w\\u0400-\\u04FF]*';
const IDENTIFIER_LIST = `${IDENTIFIER}(?:\\s*,\\s*${IDENTIFIER})*`;

const LUA_RESERVED = new Set([
    'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function', 'goto', 'if', 'in', 'local', 'nil', 'not',
    'or', 'repeat', 'return', 'then', 'true', 'until', 'while'
]);
const PYTHON_RESERVED = new Set([
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif',
    'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or',
    'pass', 'raise', 'return', 'try', 'while', 'with', 'yield'
]);

type Declared = { name: string; isFunction: boolean; params: string[] };

function splitNames(list: string): string[] {
    return list.split(',').map((name) => name.trim()).filter(Boolean);
}

function stripLuaComment(line: string): string {
    const index = line.indexOf('--');
    return index >= 0 ? line.slice(0, index) : line;
}

function stripPythonComment(line: string): string {
    const index = line.indexOf('#');
    return index >= 0 ? line.slice(0, index) : line;
}

function toEntries(declared: Declared[], reserved: Set<string>, excluded: Set<string>): CompletionDocEntry[] {
    const seen = new Map<string, Declared>();
    for (const item of declared) {
        if (reserved.has(item.name) || excluded.has(item.name)) continue;
        const earlier = seen.get(item.name);
        // A function declaration says more about a name than a plain assignment does.
        if (!earlier || (item.isFunction && !earlier.isFunction)) seen.set(item.name, item);
    }
    return [...seen.values()].map((item) => {
        if (!item.isFunction) {
            return {
                label: item.name,
                kind: 'Variable',
                insertText: item.name,
                documentation: 'Ваша переменная из этой программы.',
                sortText: `0_${item.name}`
            };
        }
        const placeholders = item.params.map((param, index) => `\${${index + 1}:${param}}`).join(', ');
        return {
            label: item.name,
            kind: 'Function',
            insertText: `${item.name}(${placeholders})`,
            documentation: 'Ваша функция из этой программы.',
            detail: `${item.name}(${item.params.join(', ')})`,
            sortText: `0_${item.name}`
        };
    });
}

export function extractLuaUserSymbols(documentText: string, excluded: Set<string> = new Set()): CompletionDocEntry[] {
    const declared: Declared[] = [];
    const functionPattern = new RegExp(`\\bfunction\\s+(${IDENTIFIER})\\s*\\(([^)]*)\\)`);
    const localPattern = new RegExp(`\\blocal\\s+(${IDENTIFIER_LIST})`);
    const forPattern = new RegExp(`\\bfor\\s+(${IDENTIFIER_LIST})\\s*(?:=|\\bin\\b)`);
    const assignPattern = new RegExp(`^\\s*(${IDENTIFIER})\\s*=(?!=)`);
    const anonymousParams = new RegExp(`\\bfunction\\s*\\(([^)]*)\\)`, 'g');

    for (const rawLine of documentText.split(/\r?\n/)) {
        const line = stripLuaComment(rawLine);
        const fn = line.match(functionPattern);
        if (fn) {
            const params = splitNames(fn[2]);
            declared.push({ name: fn[1], isFunction: true, params });
            for (const param of params) declared.push({ name: param, isFunction: false, params: [] });
        }
        for (const match of line.matchAll(anonymousParams)) {
            for (const param of splitNames(match[1])) declared.push({ name: param, isFunction: false, params: [] });
        }
        const local = line.match(localPattern);
        if (local && !/^\s*local\s+function\b/.test(line)) {
            for (const name of splitNames(local[1])) declared.push({ name, isFunction: false, params: [] });
        }
        const loop = line.match(forPattern);
        if (loop) for (const name of splitNames(loop[1])) declared.push({ name, isFunction: false, params: [] });
        const assignment = line.match(assignPattern);
        if (assignment) declared.push({ name: assignment[1], isFunction: false, params: [] });
    }
    return toEntries(declared, LUA_RESERVED, excluded);
}

export function extractPythonUserSymbols(documentText: string, excluded: Set<string> = new Set()): CompletionDocEntry[] {
    const declared: Declared[] = [];
    const defPattern = new RegExp(`^\\s*(?:async\\s+)?def\\s+(${IDENTIFIER})\\s*\\(([^)]*)\\)`);
    const classPattern = new RegExp(`^\\s*class\\s+(${IDENTIFIER})`);
    const forPattern = new RegExp(`^\\s*for\\s+(${IDENTIFIER_LIST})\\s+in\\b`);
    const assignPattern = new RegExp(`^\\s*(${IDENTIFIER_LIST})\\s*(?:[-+*/%]|//|\\*\\*)?=(?!=)`);
    const importPattern = new RegExp(`^\\s*import\\s+(${IDENTIFIER_LIST})`);
    const fromPattern = new RegExp(`^\\s*from\\s+[\\w.]+\\s+import\\s+(${IDENTIFIER_LIST})`);

    for (const rawLine of documentText.split(/\r?\n/)) {
        const line = stripPythonComment(rawLine);
        const def = line.match(defPattern);
        if (def) {
            const params = splitNames(def[2]).map((param) => param.split(/[:=]/)[0].trim()).filter((param) => param && param !== 'self');
            declared.push({ name: def[1], isFunction: true, params });
            for (const param of params) declared.push({ name: param, isFunction: false, params: [] });
            continue;
        }
        const cls = line.match(classPattern);
        if (cls) {
            declared.push({ name: cls[1], isFunction: true, params: [] });
            continue;
        }
        const loop = line.match(forPattern);
        if (loop) for (const name of splitNames(loop[1])) declared.push({ name, isFunction: false, params: [] });
        const imported = line.match(importPattern) || line.match(fromPattern);
        if (imported) for (const name of splitNames(imported[1])) declared.push({ name, isFunction: false, params: [] });
        const assignment = line.match(assignPattern);
        if (assignment) for (const name of splitNames(assignment[1])) declared.push({ name, isFunction: false, params: [] });
    }
    return toEntries(declared, PYTHON_RESERVED, excluded);
}
