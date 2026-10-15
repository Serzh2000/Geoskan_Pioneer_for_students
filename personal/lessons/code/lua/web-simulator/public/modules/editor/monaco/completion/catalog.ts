import type { ApiDoc } from '../../../docs/api-docs-types.js';
import { apiDocs, evConstants, pythonApiDocs } from '../../../docs/api-docs.js';
import { luaStdlibDocs } from '../../../docs/lua-stdlib-docs.js';
import { pythonStdlibDocs } from '../../../docs/python-stdlib-docs.js';
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

/** What a student reaches for first: these come before the rest of the API in every list. */
const LUA_CORE_KEYS = new Set(['ap.push', 'ap.goToLocalPoint', 'ap.updateYaw', 'Timer.callLater', 'Ledbar.new', 'Ledbar:set', 'Sensors.altitude', 'Sensors.lpsPosition', 'sleep', 'camera.requestMakeShot']);
const LUA_CORE_OWNERS = new Set(['ap', 'Timer', 'Ev', 'Ledbar', 'Sensors', 'camera']);
const PYTHON_CORE_KEYS = new Set(['Pioneer.arm', 'Pioneer.disarm', 'Pioneer.takeoff', 'Pioneer.land', 'Pioneer.go_to_local_point', 'Pioneer.point_reached', 'Pioneer.get_battery_status']);
const PYTHON_CORE_OWNERS = new Set(['Pioneer', 'Camera']);

/** The Lua and Python tables the catalogs are built from, standard library included (the Pioneer-only tables feed the API drawer). */
export const LUA_DOC_TABLE: Record<string, ApiDoc> = { ...apiDocs, ...luaStdlibDocs };
export const PYTHON_DOC_TABLE: Record<string, ApiDoc> = { ...pythonApiDocs, ...pythonStdlibDocs };

function buildCompletionCatalog(
    docs: Record<string, ApiDoc>,
    options?: {
        inferSeparator?: (parsed: ParsedApiMemberKey, doc: ApiDoc) => MemberSeparator;
        ownerEntryDescription?: string;
        coreKeys: Set<string>;
        coreOwners: Set<string>;
        stdlib: Record<string, ApiDoc>;
    }
): CompletionCatalog {
    const globalEntries: CompletionDocEntry[] = [];
    const ownerEntries: CompletionDocEntry[] = [];
    const ownerNames = new Set<string>();
    const qualifiedEntries: CompletionDocEntry[] = [];
    const membersByOwner = new Map<string, Map<MemberSeparator, CompletionDocEntry[]>>();

    // '1' the core API, '2' the rest of the Pioneer API, '4' the standard library.
    const groupOf = (key: string, owner: string) => {
        if (options?.stdlib && (key in options.stdlib)) return '4';
        return options?.coreKeys.has(key) || options?.coreOwners.has(owner) ? '1' : '2';
    };

    for (const [key, doc] of Object.entries(docs)) {
        const parsed = parseApiMemberKey(key);
        if (!parsed) {
            globalEntries.push(createDocEntry(key, doc, 'Function', groupOf(key, key)));
            continue;
        }

        const separator = options?.inferSeparator ? options.inferSeparator(parsed, doc) : parsed.separator;
        const entry = createDocEntry(parsed.member, doc, 'Method', groupOf(key, parsed.owner));
        // Calls on a module (ap.push, math.floor, Ledbar.new) can be typed whole; calls on an object (leds:set) need the object.
        if (separator === '.') {
            const memberText = doc.insertText || parsed.member;
            qualifiedEntries.push({
                ...entry,
                label: `${parsed.owner}.${parsed.member}`,
                insertText: `${parsed.owner}.${memberText}`,
                filterText: `${parsed.owner}.${parsed.member} ${entry.filterText ?? parsed.member}`,
                sortText: `${groupOf(key, parsed.owner)}_${parsed.owner}.${parsed.member}`
            });
        }
        const ownerMembers = membersByOwner.get(parsed.owner) || new Map<MemberSeparator, CompletionDocEntry[]>();
        const separatorMembers = ownerMembers.get(separator) || [];
        separatorMembers.push(entry);
        ownerMembers.set(separator, separatorMembers);
        membersByOwner.set(parsed.owner, ownerMembers);

        if (!ownerNames.has(parsed.owner)) {
            ownerNames.add(parsed.owner);
            const stdlibOwner = Boolean(options?.stdlib && Object.keys(options.stdlib).some((stdKey) => stdKey.startsWith(`${parsed.owner}.`) || stdKey.startsWith(`${parsed.owner}:`)))
                && !options?.coreOwners.has(parsed.owner);
            ownerEntries.push({
                label: parsed.owner,
                kind: 'Module',
                insertText: parsed.owner,
                documentation: options?.ownerEntryDescription || 'Documented API object',
                sortText: `${stdlibOwner ? '4' : options?.coreOwners.has(parsed.owner) ? '1' : '2'}_${parsed.owner}`
            });
        }
    }

    return {
        globalEntries: dedupeDocEntries(globalEntries),
        ownerEntries: dedupeDocEntries(ownerEntries),
        ownerNames,
        qualifiedEntries: dedupeDocEntries(qualifiedEntries),
        membersByOwner
    };
}

export function getOwnerMembers(catalog: CompletionCatalog, owner: string, separator: MemberSeparator): CompletionDocEntry[] {
    return catalog.membersByOwner.get(owner)?.get(separator) || [];
}

export const LUA_CATALOG = buildCompletionCatalog(LUA_DOC_TABLE, {
    inferSeparator: inferLuaMemberSeparator,
    ownerEntryDescription: 'Модуль Pioneer Lua',
    coreKeys: LUA_CORE_KEYS,
    coreOwners: LUA_CORE_OWNERS,
    stdlib: luaStdlibDocs
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
            documentation: 'Константа события автопилота',
            sortText: `2_${entry}`
        }));

    return dedupeDocEntries([...documentedEntries, ...undocumentedConstants]);
})();

export const PYTHON_CATALOG = buildCompletionCatalog(PYTHON_DOC_TABLE, {
    ownerEntryDescription: 'Класс Pioneer Python',
    coreKeys: PYTHON_CORE_KEYS,
    coreOwners: PYTHON_CORE_OWNERS,
    stdlib: pythonStdlibDocs
});
