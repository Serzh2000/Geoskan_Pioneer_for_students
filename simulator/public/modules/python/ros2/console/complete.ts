import { ROS2_LAUNCH_FILES } from '../interfaces.js';
import { COMMANDS, GS_PACKAGES, PACKAGE_LIST, VERBS, findCommand, subcommandsOf, type CommandSpec } from './specs.js';

/* Дополнение по Tab: чистая функция над снимком имён из реестра (топики, сервисы, узлы, параметры, типы). */
export interface CompletionData {
    topics: string[];
    services: string[];
    nodes: string[];
    params: Record<string, string[]>;
    msgs: string[];
    srvs: string[];
}

export const EMPTY_COMPLETION_DATA: CompletionData = { topics: [], services: [], nodes: [], params: {}, msgs: [], srvs: [] };

export interface CompletionResult {
    /** Новый текст строки целиком. */
    line: string;
    /** Новая позиция курсора. */
    caret: number;
    /** Варианты, если их несколько. */
    candidates: string[];
}

const BUILTIN_WORDS = ['ros2', 'help', 'clear', 'history', 'source'];

function commonPrefix(values: readonly string[]): string {
    if (!values.length) return '';
    let prefix = values[0];
    for (const value of values) while (!value.startsWith(prefix)) prefix = prefix.slice(0, -1);
    return prefix;
}

function slotCandidates(spec: CommandSpec, words: string[], data: CompletionData, current: string): string[] {
    // words - слова после пути команды, без текущего. Опции и значения опций в слоты не считаются.
    const slots: string[] = [];
    for (let i = 0; i < words.length; i += 1) {
        const word = words[i];
        const option = spec.options.find((candidate) => candidate.flags.includes(word));
        if (option) { if (option.value) i += 1; continue; }
        if (word.startsWith('-') && !/^-\d/u.test(word)) continue;
        slots.push(word);
    }
    if (spec.id === 'run' && slots.length >= 2 && current.startsWith('-')) return ['--ros-args', '--params-file', '-p', '--log-level'].filter((flag) => flag.startsWith(current));
    if (current.startsWith('-')) {
        return [...spec.options.flatMap((option) => option.flags.filter((flag) => flag.startsWith('--') || current === '-')), '--help']
            .filter((flag) => flag.startsWith(current));
    }
    const slot = spec.positionals[Math.min(slots.length, spec.positionals.length - 1)];
    if (!slot || slots.length >= spec.positionals.length && !slot.rest) return [];
    switch (slot.complete) {
        case 'topic': return data.topics;
        case 'service': return data.services;
        case 'node': return data.nodes;
        case 'msg': return data.msgs;
        case 'srv': return data.srvs;
        case 'interface': return [...data.msgs, ...data.srvs];
        case 'param': return data.params[slots[slots.length - 1] ?? ''] ?? data.params[`/${slots[slots.length - 1] ?? ''}`] ?? [];
        case 'package': return Object.keys(GS_PACKAGES).concat(PACKAGE_LIST.filter((name) => !(name in GS_PACKAGES)));
        case 'launchfile': return slots[0] === 'gs_core' || !slots[0] ? Object.values(ROS2_LAUNCH_FILES) : [];
        case 'executable': return GS_PACKAGES[slots[0] ?? '']?.slice() ?? [];
        default:
            if (spec.id === 'run' && slot.rest) return ['--ros-args', '--params-file', '-p', 'mini2.yaml', 'razero.yaml'];
            return [];
    }
}

export function complete(line: string, caret: number, data: CompletionData): CompletionResult {
    const before = line.slice(0, caret);
    const after = line.slice(caret);
    // Внутри кавычек (значение YAML) не дополняем.
    if ((before.match(/'/gu)?.length ?? 0) % 2 === 1 || (before.match(/"/gu)?.length ?? 0) % 2 === 1) return { line, caret, candidates: [] };
    const match = /(\S*)$/u.exec(before);
    const current = match ? match[1] : '';
    const head = before.slice(0, before.length - current.length);
    const words = head.trim() === '' ? [] : head.trim().split(/\s+/u);

    let candidates: string[] = [];
    if (words.length === 0) candidates = BUILTIN_WORDS;
    else if (words[0] === 'ros2') {
        if (words.length === 1) candidates = [...VERBS, '--help'];
        else {
            const verb = words[1];
            const direct = findCommand([verb]);
            const subs = subcommandsOf(verb);
            if (direct) candidates = slotCandidates(direct, words.slice(2), data, current);
            else if (subs.length) {
                if (words.length === 2) candidates = subs.map((spec) => spec.path[1]);
                else {
                    const spec = COMMANDS.find((candidate) => candidate.path[0] === verb && candidate.path[1] === words[2]);
                    if (spec) candidates = slotCandidates(spec, words.slice(3), data, current);
                }
            }
        }
    }
    const matches = [...new Set(candidates.filter((candidate) => candidate.startsWith(current)))].sort();
    if (!matches.length) return { line, caret, candidates: [] };
    const prefix = commonPrefix(matches);
    const single = matches.length === 1;
    const text = `${head}${prefix}${single && !prefix.endsWith('/') ? ' ' : ''}`;
    return { line: text + after, caret: text.length, candidates: single ? [] : matches };
}
