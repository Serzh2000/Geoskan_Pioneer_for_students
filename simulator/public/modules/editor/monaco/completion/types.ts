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
    /** The call form shown beside the name, e.g. `ap.goToLocalPoint(x, y, z, [time])`. */
    detail?: string;
    /** What the typed letters are matched against: the name plus the Russian words a student may type instead. */
    filterText?: string;
    /** Order in the list: '0' the student's own names, '1' the core API, '2' the rest of the API, '3' templates, '4' the standard library. */
    sortText?: string;
    params?: string;
    returns?: string;
    example?: string;
    /** Event constants: a command the program sends to the autopilot, or an event the autopilot reports back. */
    direction?: 'to-autopilot' | 'from-autopilot';
};

export type CompletionCatalog = {
    globalEntries: CompletionDocEntry[];
    ownerEntries: CompletionDocEntry[];
    ownerNames: Set<string>;
    /** Whole calls written with their owner (`ap.push`, `math.floor`), so a student can find one by its name or a Russian word without knowing the owner. */
    qualifiedEntries: CompletionDocEntry[];
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

export function createDocEntry(label: string, doc: ApiDoc, defaultKind: string, group = '2'): CompletionDocEntry {
    return {
        label,
        kind: doc.kind || defaultKind,
        insertText: doc.insertText || label,
        documentation: doc.desc || '',
        detail: doc.syntax,
        filterText: [label, ...(doc.aliases ?? [])].join(' '),
        sortText: `${group}_${label}`,
        params: doc.params,
        returns: doc.returns,
        example: doc.example,
        direction: doc.direction
    };
}

/** The documentation card of a suggestion: what it does, then parameters, result and a working example. */
export function formatEntryDocumentation(entry: CompletionDocEntry, codeFence: string): string {
    const fence = '```';
    const parts = [entry.documentation];
    if (entry.params) parts.push('**Параметры:** ' + entry.params);
    if (entry.returns) parts.push('**Результат:** ' + entry.returns);
    if (entry.example) parts.push(`**Пример:**\n${fence}${codeFence}\n${entry.example}\n${fence}`);
    return parts.filter(Boolean).join('\n\n');
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
