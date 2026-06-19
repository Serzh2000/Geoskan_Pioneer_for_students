import type { ApiDoc } from '../../../docs/api-docs-types.js';

export type MemberSeparator = '.' | ':';

export type ParsedApiMemberKey = {
    owner: string;
    separator: MemberSeparator;
    member: string;
};

export type CompletionDocEntry = {
    label: string;
    kind: string;
    insertText: string;
    documentation: string;
};

export type CompletionCatalog = {
    globalEntries: CompletionDocEntry[];
    ownerEntries: CompletionDocEntry[];
    ownerNames: Set<string>;
    membersByOwner: Map<string, Map<MemberSeparator, CompletionDocEntry[]>>;
};

export type MemberAccessContext = {
    symbolName: string;
    separator: MemberSeparator;
};

export function parseApiMemberKey(key: string): ParsedApiMemberKey | null {
    const match = key.match(/^(.*?)([.:])([^.:]+)$/);
    if (!match) return null;
    const [, owner, separator, member] = match;
    if (separator !== '.' && separator !== ':') return null;
    return { owner, separator, member };
}

export function createDocEntry(label: string, doc: ApiDoc, defaultKind: string): CompletionDocEntry {
    return {
        label,
        kind: doc.kind || defaultKind,
        insertText: doc.insertText || label,
        documentation: doc.desc || ''
    };
}

export function dedupeDocEntries(entries: CompletionDocEntry[]): CompletionDocEntry[] {
    const seen = new Set<string>();
    return entries.filter((entry) => {
        const key = `${entry.label}|${entry.insertText}|${entry.kind}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

export function dedupeSuggestions(suggestions: any[]) {
    const seen = new Set<string>();
    return suggestions.filter((item) => {
        const key = `${String(item.label)}|${String(item.insertText ?? '')}|${String(item.kind ?? '')}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
