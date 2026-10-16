import { LUA_CATALOG, PYTHON_CATALOG, getOwnerMembers } from './catalog.js';
import type { CompletionCatalog, MemberAccessContext, MemberSeparator } from './types.js';

export function getTextBeforeCursor(model: any, position: any): string {
    return model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
    });
}

export function getLineTextBeforeCursor(model: any, position: any): string {
    const lineContent = model.getLineContent(position.lineNumber);
    return lineContent.substring(0, position.column - 1);
}

export function extractMemberAccessContext(textBeforeCursor: string): MemberAccessContext | null {
    const match = textBeforeCursor.trimEnd().match(/([A-Za-z_]\w*)\s*([.:])$/);
    if (!match) {
        return null;
    }

    const [, symbolName, separator] = match;
    if (separator !== '.' && separator !== ':') {
        return null;
    }

    return {
        symbolName,
        separator
    };
}

function stripLuaComment(line: string): string {
    const commentIndex = line.indexOf('--');
    return commentIndex >= 0 ? line.slice(0, commentIndex) : line;
}

function stripPythonComment(line: string): string {
    const commentIndex = line.indexOf('#');
    return commentIndex >= 0 ? line.slice(0, commentIndex) : line;
}

function inferLuaSymbolTypes(documentText: string, catalog: CompletionCatalog): Map<string, string> {
    const symbolTypes = new Map<string, string>();

    for (const rawLine of documentText.split(/\r?\n/)) {
        const line = stripLuaComment(rawLine).trim();
        if (!line) continue;

        const constructorMatch = line.match(/^(?:local\s+)?([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)([.:])([A-Za-z_]\w*)\s*\(/);
        if (constructorMatch) {
            const [, symbolName, rawOwner, rawSeparator, member] = constructorMatch;
            const owner = symbolTypes.get(rawOwner) || rawOwner;
            const separator = rawSeparator as MemberSeparator;
            const canReturnSameOwner = separator === '.' && member === 'new' && getOwnerMembers(catalog, owner, ':').length > 0;
            if (canReturnSameOwner) {
                symbolTypes.set(symbolName, owner);
            }
            continue;
        }

        const aliasMatch = line.match(/^(?:local\s+)?([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)\s*$/);
        if (!aliasMatch) continue;

        const [, symbolName, sourceName] = aliasMatch;
        const resolvedType = symbolTypes.get(sourceName) || (catalog.ownerNames.has(sourceName) ? sourceName : null);
        if (resolvedType) {
            symbolTypes.set(symbolName, resolvedType);
        }
    }

    return symbolTypes;
}

function inferPythonSymbolTypes(documentText: string, catalog: CompletionCatalog): Map<string, string> {
    const symbolTypes = new Map<string, string>();

    for (const rawLine of documentText.split(/\r?\n/)) {
        const line = stripPythonComment(rawLine).trim();
        if (!line) continue;

        const constructorMatch = line.match(/^([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)\s*\(/);
        if (constructorMatch) {
            const [, symbolName, sourceName] = constructorMatch;
            const resolvedType = symbolTypes.get(sourceName) || (catalog.ownerNames.has(sourceName) ? sourceName : null);
            if (resolvedType) {
                symbolTypes.set(symbolName, resolvedType);
            }
            continue;
        }

        const aliasMatch = line.match(/^([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)\s*$/);
        if (!aliasMatch) continue;

        const [, symbolName, sourceName] = aliasMatch;
        const resolvedType = symbolTypes.get(sourceName) || (catalog.ownerNames.has(sourceName) ? sourceName : null);
        if (resolvedType) {
            symbolTypes.set(symbolName, resolvedType);
        }
    }

    return symbolTypes;
}

export function resolveLuaOwnerName(documentText: string, symbolName: string): string | null {
    if (LUA_CATALOG.ownerNames.has(symbolName)) {
        return symbolName;
    }

    const symbolTypes = inferLuaSymbolTypes(documentText, LUA_CATALOG);
    return symbolTypes.get(symbolName) || null;
}

export function resolvePythonOwnerName(documentText: string, symbolName: string): string | null {
    if (PYTHON_CATALOG.ownerNames.has(symbolName)) {
        return symbolName;
    }

    const symbolTypes = inferPythonSymbolTypes(documentText, PYTHON_CATALOG);
    return symbolTypes.get(symbolName) || null;
}
