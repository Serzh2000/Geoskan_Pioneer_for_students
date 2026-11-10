import type { Ros2NodeInfo, Ros2ServiceCallResult, Ros2ServiceRow, Ros2TopicInfo, Ros2TopicRow } from '../registry.js';

/* Форматы вывода ros2 (Jazzy). Чистые функции: принимают данные реестра, возвращают текст. */

export function formatTopicList(rows: readonly Ros2TopicRow[], withTypes: boolean): string {
    return rows.map((row) => (withTypes ? `${row.name} [${row.types.join(', ')}]` : row.name)).join('\n');
}

export function formatServiceList(rows: readonly Ros2ServiceRow[], withTypes: boolean): string {
    return rows.map((row) => (withTypes ? `${row.name} [${row.types.join(', ')}]` : row.name)).join('\n');
}

export function formatTopicInfo(info: Ros2TopicInfo, verbose: boolean): string {
    const lines = [`Type: ${info.type}`];
    if (!verbose) return [...lines, `Publisher count: ${info.publishers.length}`, `Subscription count: ${info.subscribers.length}`].join('\n');
    const endpoint = (list: Ros2TopicInfo['publishers'], kind: string) => list.flatMap((item) => {
        const name = item.node.replace(/^\//u, '');
        return ['', `Node name: ${name}`, 'Node namespace: /', `Topic type: ${item.type}`, `Endpoint type: ${kind}`];
    });
    return [...lines, '', `Publisher count: ${info.publishers.length}`, ...endpoint(info.publishers, 'PUBLISHER'),
        '', `Subscription count: ${info.subscribers.length}`, ...endpoint(info.subscribers, 'SUBSCRIPTION')].join('\n');
}

export function formatNodeInfo(info: Ros2NodeInfo): string {
    const section = (title: string, rows: Array<{ name: string; type: string }>) => [`  ${title}:`, ...rows.map((row) => `    ${row.name}: ${row.type}`)];
    return [
        info.name,
        ...section('Subscribers', info.subscribers.map((s) => ({ name: s.topic, type: s.type }))),
        ...section('Publishers', info.publishers.map((p) => ({ name: p.topic, type: p.type }))),
        ...section('Service Servers', info.service_servers),
        ...section('Service Clients', info.service_clients),
        '  Action Servers:',
        '  Action Clients:'
    ].join('\n');
}

export function formatParamList(params: Record<string, string[]>): string {
    return Object.entries(params).flatMap(([node, names]) => [`${node}:`, ...names.map((name) => `  ${name}`)]).join('\n');
}

const PARAM_TYPE_TITLES: Record<string, string> = {
    bool: 'Boolean', integer: 'Integer', double: 'Double', string: 'String',
    byte_array: 'Byte values', bool_array: 'Boolean values', integer_array: 'Integer values', double_array: 'Double values', string_array: 'String values'
};

export function pythonRepr(value: unknown): string {
    if (typeof value === 'boolean') return value ? 'True' : 'False';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return `[${value.map((item) => (typeof item === 'string' ? `'${item}'` : pythonRepr(item))).join(', ')}]`;
    return String(value);
}

export function formatParamGet(type: string, value: unknown): string {
    const title = PARAM_TYPE_TITLES[type] ?? type;
    if (type === 'double' && typeof value === 'number' && Number.isInteger(value)) return `${title} value is: ${value.toFixed(1)}`;
    return `${title} value is: ${pythonRepr(value)}`;
}

function yamlScalar(value: unknown): string {
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return /^[\w][\w .-]*$/u.test(value) && !/^(?:true|false|null|yes|no|on|off|[-+]?[\d.]+)$/iu.test(value) ? value : `'${value.replace(/'/gu, "''")}'`;
    return JSON.stringify(value);
}

/** `ros2 param dump`: параметры с точкой в имени (topics.imu) раскладываются во вложенный YAML. */
export function formatParamDump(node: string, values: Record<string, unknown>): string {
    const tree: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(values)) {
        const parts = name.split('.');
        let at = tree;
        parts.slice(0, -1).forEach((part) => {
            if (typeof at[part] !== 'object' || at[part] === null) at[part] = {};
            at = at[part] as Record<string, unknown>;
        });
        at[parts[parts.length - 1]] = value;
    }
    const render = (obj: Record<string, unknown>, indent: number): string[] => Object.entries(obj).flatMap(([key, value]) => (
        value !== null && typeof value === 'object' && !Array.isArray(value)
            ? [`${' '.repeat(indent)}${key}:`, ...render(value as Record<string, unknown>, indent + 2)]
            : [`${' '.repeat(indent)}${key}: ${yamlScalar(value)}`]
    ));
    return [`${node}:`, '  ros__parameters:', ...render(tree, 4)].join('\n');
}

export function formatServiceCall(result: Pick<Ros2ServiceCallResult, 'request' | 'response_repr'>): string {
    return `requester: making request: ${result.request}\n\nresponse:\n${result.response_repr}\n`;
}

export function formatInterfaceList(list: { msgs: string[]; srvs: string[] }, only: { msgs?: boolean; srvs?: boolean }): string {
    const all = !only.msgs && !only.srvs;
    const lines: string[] = [];
    if (all || only.msgs) lines.push('Messages:', ...list.msgs.map((name) => `    ${name}`));
    if (all || only.srvs) lines.push('Services:', ...list.srvs.map((name) => `    ${name}`));
    return lines.join('\n');
}

export function formatPubLine(index: number, repr: string): string {
    return `publishing #${index}: ${repr}\n`;
}

/** Значение поля по пути a.b.c (ros2 topic echo --field). */
export function pickField(message: Record<string, unknown>, path: string): unknown {
    let at: unknown = message;
    for (const part of path.split('.')) {
        if (at === null || typeof at !== 'object' || !(part in (at as Record<string, unknown>))) throw new Error(`В сообщении нет поля ${path}`);
        at = (at as Record<string, unknown>)[part];
    }
    return at;
}

export function formatFieldValue(value: unknown): string {
    if (value !== null && typeof value === 'object') return JSON.stringify(value);
    return typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
}

export type LogItem = [level: string, name: string, text: string];

/** Новые записи журнала: tail «до» и «после» (оба - последние N записей, журнал мог обрезаться с начала). */
export function diffLog(before: readonly LogItem[], after: readonly LogItem[]): LogItem[] {
    const same = (a: LogItem, b: LogItem) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
    for (let shift = 0; shift <= before.length; shift += 1) {
        const overlap = before.length - shift;
        if (overlap > after.length) continue;
        let match = true;
        for (let i = 0; i < overlap && match; i += 1) match = same(before[shift + i], after[i]);
        if (match) return after.slice(overlap);
    }
    return after.slice();
}

export function formatLogLine(item: LogItem, stamp: number): string {
    return `[${item[0]}] [${stamp.toFixed(9)}] [${item[1]}]: ${item[2]}`;
}
