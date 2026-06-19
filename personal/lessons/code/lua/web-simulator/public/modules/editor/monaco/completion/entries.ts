import { LUA_CATALOG, LUA_EV_ENTRIES, PYTHON_CATALOG, getOwnerMembers } from './catalog.js';
import { extractMemberAccessContext, resolveLuaOwnerName, resolvePythonOwnerName } from './context.js';
import { dedupeDocEntries, type CompletionDocEntry } from './types.js';

export function getLuaCompletionEntries(documentText: string, textBeforeCursor: string): CompletionDocEntry[] {
    const memberAccess = extractMemberAccessContext(textBeforeCursor);
    if (memberAccess) {
        const owner = resolveLuaOwnerName(documentText, memberAccess.symbolName);
        if (!owner) {
            return [];
        }

        if (owner === 'Ev' && memberAccess.separator === '.') {
            return LUA_EV_ENTRIES;
        }

        return getOwnerMembers(LUA_CATALOG, owner, memberAccess.separator);
    }

    return dedupeDocEntries([
        ...LUA_CATALOG.globalEntries,
        ...LUA_CATALOG.ownerEntries
    ]);
}

export function getPythonCompletionEntries(documentText: string, textBeforeCursor: string): CompletionDocEntry[] {
    const memberAccess = extractMemberAccessContext(textBeforeCursor);
    if (memberAccess?.separator === '.') {
        const owner = resolvePythonOwnerName(documentText, memberAccess.symbolName);
        if (!owner) {
            return [];
        }
        return getOwnerMembers(PYTHON_CATALOG, owner, '.');
    }

    return dedupeDocEntries([
        ...PYTHON_CATALOG.ownerEntries,
        {
            label: 'pioneer',
            kind: 'Variable',
            insertText: 'pioneer',
            documentation: 'Instance of Pioneer'
        }
    ]);
}
