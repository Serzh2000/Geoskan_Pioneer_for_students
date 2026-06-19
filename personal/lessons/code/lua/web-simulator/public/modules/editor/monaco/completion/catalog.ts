import type { ApiDoc } from '../../../docs/api-docs-types.js';
import { apiDocs, evConstants, pythonApiDocs } from '../../../docs/api-docs.js';
import {
    createDocEntry,
    dedupeDocEntries,
    parseApiMemberKey,
    type CompletionCatalog,
    type CompletionDocEntry,
    type MemberSeparator,
    type ParsedApiMemberKey
} from './types.js';

function inferLuaMemberSeparator(parsed: ParsedApiMemberKey, doc: ApiDoc): MemberSeparator {
    const syntaxMatch = doc.syntax?.match(/\b[A-Za-z_]\w*\s*([.:])\s*[A-Za-z_]\w*(?:\s*\(|\s*$)/);
    if (syntaxMatch?.[1] === '.' || syntaxMatch?.[1] === ':') {
        return syntaxMatch[1];
    }
    return parsed.separator;
}

function buildCompletionCatalog(
    docs: Record<string, ApiDoc>,
    options?: {
        inferSeparator?: (parsed: ParsedApiMemberKey, doc: ApiDoc) => MemberSeparator;
        ownerEntryDescription?: string;
    }
): CompletionCatalog {
    const globalEntries: CompletionDocEntry[] = [];
    const ownerEntries: CompletionDocEntry[] = [];
    const ownerNames = new Set<string>();
    const membersByOwner = new Map<string, Map<MemberSeparator, CompletionDocEntry[]>>();

    for (const [key, doc] of Object.entries(docs)) {
        const parsed = parseApiMemberKey(key);
        if (!parsed) {
            globalEntries.push(createDocEntry(key, doc, 'Function'));
            continue;
        }

        const separator = options?.inferSeparator ? options.inferSeparator(parsed, doc) : parsed.separator;
        const entry = createDocEntry(parsed.member, doc, 'Method');
        const ownerMembers = membersByOwner.get(parsed.owner) || new Map<MemberSeparator, CompletionDocEntry[]>();
        const separatorMembers = ownerMembers.get(separator) || [];
        separatorMembers.push(entry);
        ownerMembers.set(separator, separatorMembers);
        membersByOwner.set(parsed.owner, ownerMembers);

        if (!ownerNames.has(parsed.owner)) {
            ownerNames.add(parsed.owner);
            ownerEntries.push({
                label: parsed.owner,
                kind: 'Module',
                insertText: parsed.owner,
                documentation: options?.ownerEntryDescription || 'Documented API object'
            });
        }
    }

    return {
        globalEntries: dedupeDocEntries(globalEntries),
        ownerEntries: dedupeDocEntries(ownerEntries),
        ownerNames,
        membersByOwner
    };
}

export function getOwnerMembers(catalog: CompletionCatalog, owner: string, separator: MemberSeparator): CompletionDocEntry[] {
    return catalog.membersByOwner.get(owner)?.get(separator) || [];
}

export const LUA_CATALOG = buildCompletionCatalog(apiDocs, {
    inferSeparator: inferLuaMemberSeparator,
    ownerEntryDescription: 'Pioneer Lua module'
});

export const LUA_EV_ENTRIES = (() => {
    const documentedEntries = getOwnerMembers(LUA_CATALOG, 'Ev', '.');
    const documentedLabels = new Set(documentedEntries.map((entry) => entry.label));
    const undocumentedConstants = evConstants
        .filter((entry) => !documentedLabels.has(entry))
        .map((entry) => ({
            label: entry,
            kind: 'EnumMember',
            insertText: entry,
            documentation: 'Event constant'
        }));

    return dedupeDocEntries([...documentedEntries, ...undocumentedConstants]);
})();

export const PYTHON_CATALOG = buildCompletionCatalog(pythonApiDocs, {
    ownerEntryDescription: 'Pioneer Python class'
});
