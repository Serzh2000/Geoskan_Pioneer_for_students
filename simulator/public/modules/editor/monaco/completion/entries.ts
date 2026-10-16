import { LUA_CATALOG, LUA_EV_ENTRIES, PYTHON_CATALOG, getOwnerMembers } from './catalog.js';
import { findCallContext } from './call-context.js';
import { extractMemberAccessContext, resolveLuaOwnerName, resolvePythonOwnerName } from './context.js';
import { eventConstantEntries, getArgumentEntries } from './signature.js';
import { LUA_KEYWORDS, LUA_SNIPPETS, PYTHON_KEYWORDS, PYTHON_SNIPPETS } from './snippets.js';
import { dedupeDocEntries, type CompletionCatalog, type CompletionDocEntry } from './types.js';
import { extractLuaUserSymbols, extractPythonUserSymbols } from './user-symbols.js';

/** Names the student must not see twice: the API's own, which the user's declarations would otherwise shadow in the list. */
function reservedNames(catalog: CompletionCatalog): Set<string> {
    return new Set([...catalog.ownerNames, ...catalog.globalEntries.map((entry) => entry.label)]);
}

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

    // `if event == |` can only be followed by an event constant.
    if (/\bevent\s*(?:==|~=)\s*$/.test(textBeforeCursor)) {
        return eventConstantEntries('incoming');
    }

    return dedupeDocEntries([
        ...getArgumentEntries('lua', documentText, findCallContext(documentText, 'lua')),
        ...extractLuaUserSymbols(documentText, reservedNames(LUA_CATALOG)),
        ...LUA_CATALOG.globalEntries,
        ...LUA_CATALOG.ownerEntries,
        ...LUA_CATALOG.qualifiedEntries,
        ...LUA_SNIPPETS,
        ...LUA_KEYWORDS
    ]);
}

/** What to offer right after "(": only values that fit the argument (the event constants in ap.push), never the whole list. */
export function getLuaArgumentTriggerEntries(documentText: string): CompletionDocEntry[] {
    return getArgumentEntries('lua', documentText, findCallContext(documentText, 'lua'));
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
        ...extractPythonUserSymbols(documentText, new Set([...reservedNames(PYTHON_CATALOG), 'pioneer'])),
        ...PYTHON_CATALOG.globalEntries,
        ...PYTHON_CATALOG.ownerEntries,
        // time.sleep and math.sin can be typed whole; the SDK's classes need the student's variable, so only the library is listed.
        ...PYTHON_CATALOG.qualifiedEntries.filter((entry) => /^(time|math)\./.test(entry.label)),
        {
            label: 'pioneer',
            kind: 'Variable',
            insertText: 'pioneer',
            documentation: 'Дрон: объект класса Pioneer. Создаётся строкой pioneer = Pioneer().',
            sortText: '1_pioneer'
        },
        ...PYTHON_SNIPPETS,
        ...PYTHON_KEYWORDS
    ]);
}
