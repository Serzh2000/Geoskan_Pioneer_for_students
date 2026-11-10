import { ConsoleError } from './errors.js';

/*
 * Подмножество YAML, которое ros2 принимает в аргументах (yaml.safe_load): поточный стиль
 * {x: 0.0, frame_id: 'map', leds: [{r: 1.0}]}, строки в '...' и "...", числа, true/false, null,
 * а также блочные словари с вложенностью и списками "- ". Числа - всегда number (тип поля выбирает реестр).
 */
export type YamlValue = null | boolean | number | string | YamlValue[] | { [key: string]: YamlValue };

const INT = /^[-+]?\d+$/u;
const FLOAT = /^[-+]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?$/u;
const HEX = /^0x[0-9a-fA-F]+$/u;

export function resolveScalar(raw: string): YamlValue {
    const text = raw.trim();
    if (text === '' || text === '~' || /^(?:null|Null|NULL)$/u.test(text)) return null;
    if (/^(?:true|True|TRUE|yes|Yes|YES|on|On|ON)$/u.test(text)) return true;
    if (/^(?:false|False|FALSE|no|No|NO|off|Off|OFF)$/u.test(text)) return false;
    if (INT.test(text)) return Number.parseInt(text, 10);
    if (HEX.test(text)) return Number.parseInt(text, 16);
    if (FLOAT.test(text)) return Number.parseFloat(text);
    if (/^[-+]?\.(?:inf|Inf|INF)$/u.test(text)) return text.startsWith('-') ? -Infinity : Infinity;
    if (/^\.(?:nan|NaN|NAN)$/u.test(text)) return Number.NaN;
    return text;
}

class FlowParser {
    private pos = 0;

    constructor(private readonly src: string) {}

    parseDocument(): YamlValue {
        this.skipSpace();
        const value = this.parseValue(false);
        this.skipSpace();
        if (this.pos < this.src.length) this.fail(`лишний текст после значения: «${this.src.slice(this.pos, this.pos + 12)}»`);
        return value;
    }

    private fail(message: string): never {
        throw new ConsoleError(`Ошибка YAML: ${message}`, 'Пример: "{x: 0.0, y: 0.0, z: 1.0, frame_id: \'map\'}"');
    }

    private skipSpace(): void {
        while (this.pos < this.src.length && /\s/u.test(this.src[this.pos])) this.pos += 1;
    }

    private parseValue(inFlow: boolean): YamlValue {
        this.skipSpace();
        const ch = this.src[this.pos];
        if (ch === '{') return this.parseMap();
        if (ch === '[') return this.parseList();
        if (ch === "'" || ch === '"') return this.parseQuoted();
        return this.parsePlain(inFlow);
    }

    private parseQuoted(): string {
        const quote = this.src[this.pos];
        this.pos += 1;
        let out = '';
        for (;;) {
            if (this.pos >= this.src.length) this.fail('не закрыта кавычка');
            const ch = this.src[this.pos];
            if (quote === "'") {
                if (ch === "'") {
                    if (this.src[this.pos + 1] === "'") { out += "'"; this.pos += 2; continue; }
                    this.pos += 1;
                    return out;
                }
                out += ch;
                this.pos += 1;
                continue;
            }
            if (ch === '"') { this.pos += 1; return out; }
            if (ch === '\\') {
                const next = this.src[this.pos + 1];
                const map: Record<string, string> = { n: '\n', t: '\t', r: '\r', '0': '\0', '"': '"', '\\': '\\', '/': '/', ' ': ' ' };
                if (next === undefined) this.fail('не закрыта кавычка');
                out += map[next] ?? `\\${next}`;
                this.pos += 2;
                continue;
            }
            out += ch;
            this.pos += 1;
        }
    }

    private parsePlain(inFlow: boolean): YamlValue {
        const start = this.pos;
        while (this.pos < this.src.length) {
            const ch = this.src[this.pos];
            if (inFlow && (ch === ',' || ch === '}' || ch === ']')) break;
            if (ch === ':' && (this.pos + 1 >= this.src.length || /[\s,}\]]/u.test(this.src[this.pos + 1]))) break;
            this.pos += 1;
        }
        const text = this.src.slice(start, this.pos);
        if (!inFlow && this.pos < this.src.length && this.src[this.pos] === ':') this.fail('ожидалось значение, а не пара «ключ: значение» без фигурных скобок');
        return resolveScalar(text);
    }

    private parseKey(): string {
        this.skipSpace();
        const ch = this.src[this.pos];
        if (ch === "'" || ch === '"') return this.parseQuoted();
        const start = this.pos;
        while (this.pos < this.src.length) {
            const c = this.src[this.pos];
            if (c === ':' && (this.pos + 1 >= this.src.length || /[\s,}\]]/u.test(this.src[this.pos + 1]))) break;
            if (c === ',' || c === '}' || c === '{' || c === '[' || c === ']') break;
            this.pos += 1;
        }
        const key = this.src.slice(start, this.pos).trim();
        if (/^[^\s:]+:[^\s]/u.test(key)) this.fail(`после двоеточия нужен пробел: «${key.replace(':', ': ')}»`);
        return key;
    }

    private parseMap(): YamlValue {
        this.pos += 1;
        const out: { [key: string]: YamlValue } = {};
        for (;;) {
            this.skipSpace();
            if (this.pos >= this.src.length) this.fail('не закрыта фигурная скобка «{»');
            if (this.src[this.pos] === '}') { this.pos += 1; return out; }
            const key = this.parseKey();
            if (key === '' && this.src[this.pos] !== ':') this.fail('пустой ключ');
            this.skipSpace();
            let value: YamlValue = null;
            if (this.src[this.pos] === ':') {
                this.pos += 1;
                this.skipSpace();
                if (this.src[this.pos] !== ',' && this.src[this.pos] !== '}') value = this.parseValue(true);
            }
            out[key] = value;
            this.skipSpace();
            if (this.src[this.pos] === ',') { this.pos += 1; continue; }
            if (this.src[this.pos] === '}') { this.pos += 1; return out; }
            this.fail(this.pos >= this.src.length ? 'не закрыта фигурная скобка «{»' : `ожидалась запятая или «}», найдено «${this.src[this.pos]}»`);
        }
    }

    private parseList(): YamlValue {
        this.pos += 1;
        const out: YamlValue[] = [];
        for (;;) {
            this.skipSpace();
            if (this.pos >= this.src.length) this.fail('не закрыта квадратная скобка «[»');
            if (this.src[this.pos] === ']') { this.pos += 1; return out; }
            out.push(this.parseValue(true));
            this.skipSpace();
            if (this.src[this.pos] === ',') { this.pos += 1; continue; }
            if (this.src[this.pos] === ']') { this.pos += 1; return out; }
            this.fail(this.pos >= this.src.length ? 'не закрыта квадратная скобка «[»' : `ожидалась запятая или «]», найдено «${this.src[this.pos]}»`);
        }
    }
}

export function parseFlow(text: string): YamlValue {
    return new FlowParser(text).parseDocument();
}

interface BlockLine { indent: number; text: string }

const isItem = (text: string) => text.startsWith('- ') || text === '-';

function parseBlock(lines: BlockLine[], start: number, indent: number): { value: YamlValue; next: number } {
    if (isItem(lines[start].text)) {
        const list: YamlValue[] = [];
        let i = start;
        while (i < lines.length && lines[i].indent === indent && isItem(lines[i].text)) {
            const rest = lines[i].text.slice(1).trim();
            if (rest === '') {
                if (i + 1 < lines.length && lines[i + 1].indent > indent) {
                    const nested = parseBlock(lines, i + 1, lines[i + 1].indent);
                    list.push(nested.value);
                    i = nested.next;
                } else { list.push(null); i += 1; }
            } else if (/^[^\s'"{[][^:]*:(\s|$)/u.test(rest)) {
                // "- r: 1.0" открывает словарь, продолжение которого стоит глубже на 2 символа.
                const inner: BlockLine[] = [{ indent: indent + 2, text: rest }];
                let j = i + 1;
                while (j < lines.length && lines[j].indent > indent) { inner.push(lines[j]); j += 1; }
                list.push(parseBlock(inner, 0, indent + 2).value);
                i = j;
            } else { list.push(/^[{["']/u.test(rest) ? parseFlow(rest) : resolveScalar(rest)); i += 1; }
        }
        return { value: list, next: i };
    }
    const map: { [key: string]: YamlValue } = {};
    let i = start;
    while (i < lines.length && lines[i].indent === indent) {
        const match = /^("[^"]*"|'[^']*'|[^\s:][^:]*?)\s*:(?:\s+(.*))?$/u.exec(lines[i].text);
        if (!match) throw new ConsoleError(`Ошибка YAML: не разобрана строка «${lines[i].text}»`, 'Ожидалось «ключ: значение»');
        const key = /^["']/u.test(match[1]) ? match[1].slice(1, -1) : match[1];
        const rest = (match[2] ?? '').trim();
        if (rest === '') {
            if (i + 1 < lines.length && lines[i + 1].indent > indent) {
                const nested = parseBlock(lines, i + 1, lines[i + 1].indent);
                map[key] = nested.value;
                i = nested.next;
            } else if (i + 1 < lines.length && lines[i + 1].indent === indent && isItem(lines[i + 1].text)) {
                const nested = parseBlock(lines, i + 1, indent);
                map[key] = nested.value;
                i = nested.next;
            } else { map[key] = null; i += 1; }
        } else { map[key] = /^[{["']/u.test(rest) ? parseFlow(rest) : resolveScalar(rest); i += 1; }
    }
    if (i < lines.length && lines[i].indent > indent) throw new ConsoleError(`Ошибка YAML: неровный отступ в строке «${lines[i].text}»`);
    return { value: map, next: i };
}

/** Разбирает аргумент вроде "{x: 1.0}" или многострочный блочный YAML. Пустая строка - null. */
export function parseYaml(text: string): YamlValue {
    const trimmed = text.trim();
    if (trimmed === '') return null;
    if (/^[{["']/u.test(trimmed)) return parseFlow(trimmed);
    const looksBlock = trimmed.includes('\n') || /^(?:-\s|(?:"[^"]*"|'[^']*'|[^\s:'"][^:]*?)\s*:(?:\s|$))/u.test(trimmed);
    if (!looksBlock) return resolveScalar(trimmed);
    const lines: BlockLine[] = text.split(/\r?\n/u)
        .filter((line) => line.trim() !== '' && !line.trim().startsWith('#'))
        .map((line) => ({ indent: line.length - line.trimStart().length, text: line.trim() }));
    const parsed = parseBlock(lines, 0, lines[0].indent);
    if (parsed.next < lines.length) throw new ConsoleError(`Ошибка YAML: не разобрана строка «${lines[parsed.next].text}»`);
    return parsed.value;
}

/** Значение для JSON-вызова реестра: inf и nan - строки (JSON их не знает). */
export function toJsonSafe(value: YamlValue): YamlValue {
    if (typeof value === 'number' && !Number.isFinite(value)) return Number.isNaN(value) ? 'nan' : value > 0 ? 'inf' : '-inf';
    if (Array.isArray(value)) return value.map(toJsonSafe);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toJsonSafe(v)]));
    return value;
}

/** Аргумент `values`: должен быть словарём (как у ros2 service call / topic pub). */
export function parseMessageArgument(text: string | undefined, what = 'запрос'): Record<string, unknown> {
    if (text === undefined || text.trim() === '') return {};
    const value = parseYaml(text);
    if (value === null) return {};
    if (typeof value !== 'object' || Array.isArray(value)) {
        throw new ConsoleError(`Ошибка YAML: ${what} должен быть словарём «{поле: значение}», получено: ${JSON.stringify(value)}`,
            'Пример: "{timeout: 5, retries: 0}" или "{}"');
    }
    return toJsonSafe(value) as Record<string, unknown>;
}
