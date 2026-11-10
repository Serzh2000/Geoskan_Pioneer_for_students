import type { Ros2ParamValue } from '../interfaces.js';
import { ConsoleError } from './errors.js';
import { usageOf } from './help.js';
import { UNSUPPORTED_VERBS, VERBS, findCommand, subcommandsOf, type CommandSpec } from './specs.js';
import { tokenize } from './tokenize.js';
import { parseYaml } from './yaml.js';

export type BuiltinName = 'help' | 'clear' | 'history' | 'exit' | 'source';

export interface NodeArgs {
    /** --params-file: имя файла (только конфиги из gs_core: mini2.yaml, razero.yaml). */
    paramsFile?: string;
    /** -p имя:=значение и аргументы launch имя:=значение. */
    parameters: Record<string, Ros2ParamValue>;
}

export type ParsedLine =
    | { kind: 'empty' }
    | { kind: 'builtin'; name: BuiltinName; args: string[] }
    | { kind: 'help'; path: string[] }
    | {
        kind: 'command';
        spec: CommandSpec;
        /** Позиционные аргументы по именам из спецификации (rest - массив строк). */
        args: Record<string, string | string[] | undefined>;
        options: Record<string, string | number | boolean>;
        node?: NodeArgs;
    };

const TYPE_LIKE = /^[A-Za-z_][\w]*\/(?:(?:msg|srv)\/)?[A-Za-z_]\w*$/u;

function distance(a: string, b: string): number {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i += 1) {
        let prev = row[0];
        row[0] = i;
        for (let j = 1; j <= b.length; j += 1) {
            const keep = row[j];
            row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
            prev = keep;
        }
    }
    return row[b.length];
}

export function closest(word: string, options: readonly string[]): string | null {
    let best: string | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const option of options) {
        const score = distance(word.toLowerCase(), option.toLowerCase());
        if (score < bestScore) { best = option; bestScore = score; }
    }
    return best !== null && bestScore <= Math.max(2, Math.floor(word.length / 3)) ? best : null;
}

function usageError(spec: CommandSpec, message: string): ConsoleError {
    return new ConsoleError(`${usageOf(spec)}\nros2 ${spec.path.join(' ')}: ошибка: ${message}`, `ros2 ${spec.path.join(' ')} -h - подробная справка`);
}

/** Разбор `ros2 run ... --ros-args ...` и `ros2 launch ... имя:=значение` в параметры узла. */
export function parseNodeArgs(argv: readonly string[], spec: CommandSpec): NodeArgs {
    const out: NodeArgs = { parameters: {} };
    const setParam = (text: string) => {
        const at = text.indexOf(':=');
        if (at <= 0) throw usageError(spec, `ожидалось имя:=значение, получено «${text}»`);
        const name = text.slice(0, at);
        const value = parseYaml(text.slice(at + 2));
        if (value === null || typeof value === 'object') throw usageError(spec, `параметр ${name}: поддерживаются числа, true/false и строки`);
        out.parameters[name] = value as Ros2ParamValue;
    };
    if (spec.id === 'launch') {
        for (const token of argv) setParam(token);
        return out;
    }
    let inRos = false;
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token === '--ros-args') { inRos = true; continue; }
        if (token === '--') { inRos = false; continue; }
        if (!inRos) throw usageError(spec, `неизвестный аргумент «${token}»; аргументы ROS идут после --ros-args`);
        const next = () => {
            const value = argv[i + 1];
            if (value === undefined) throw usageError(spec, `у ${token} нет значения`);
            i += 1;
            return value;
        };
        if (token === '-p' || token === '--param') setParam(next());
        else if (token === '--params-file') out.paramsFile = next();
        else if (token.startsWith('--params-file=')) out.paramsFile = token.slice('--params-file='.length);
        else if (token === '--log-level' || token === '--enable-rosout-logs' || token === '--disable-rosout-logs' || token === '-e' || token === '--enclave') {
            if (token === '--log-level' || token === '--enclave') next();
        } else if (token === '-r' || token === '--remap') throw usageError(spec, 'переназначение имён (-r) в симуляторе не поддерживается');
        else throw usageError(spec, `неизвестный аргумент ROS «${token}»; поддерживаются -p, --params-file, --log-level`);
    }
    return out;
}

function parseArguments(spec: CommandSpec, argv: string[]): ParsedLine {
    const options: Record<string, string | number | boolean> = {};
    const positionals: string[] = [];
    const isRaw = spec.id === 'run' || spec.id === 'launch';
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (isRaw && positionals.length >= 2) { positionals.push(token); continue; }
        if (token === '-h' || token === '--help') return { kind: 'help', path: spec.path };
        if (token === '--') { positionals.push(...argv.slice(i + 1)); break; }
        const eq = token.startsWith('--') ? token.indexOf('=') : -1;
        const name = eq > 0 ? token.slice(0, eq) : token;
        const option = spec.options.find((candidate) => candidate.flags.includes(name));
        if (option) {
            if (!option.value) { options[option.key] = true; continue; }
            const raw = eq > 0 ? token.slice(eq + 1) : argv[(i += 1)];
            if (raw === undefined) throw usageError(spec, `у ${name} нет значения`);
            if (option.value === 'number') {
                const number = Number(raw);
                if (raw.trim() === '' || !Number.isFinite(number)) throw usageError(spec, `у ${name} нужно число, получено «${raw}»`);
                options[option.key] = number;
            } else options[option.key] = raw;
            continue;
        }
        if (token.startsWith('-') && token.length > 1 && !/^-[\d.]/u.test(token)) throw usageError(spec, `неизвестная опция ${token}`);
        positionals.push(token);
    }

    const required = spec.positionals.filter((p) => !p.optional);
    const hasRest = spec.positionals.some((p) => p.rest);
    if (positionals.length < required.length) {
        throw usageError(spec, `не хватает аргументов: ${required.slice(positionals.length).map((p) => p.name).join(', ')}`);
    }
    if (!hasRest && positionals.length > spec.positionals.length) {
        throw usageError(spec, `лишние аргументы: ${positionals.slice(spec.positionals.length).join(' ')}`);
    }

    const args: Record<string, string | string[] | undefined> = {};
    let list = [...positionals];
    // service call <имя> [<тип>] [<значения>]: тип можно опустить, если вторым идёт YAML.
    if (spec.id === 'service-call' && list.length === 2 && !TYPE_LIKE.test(list[1])) list = [list[0], '', list[1]];
    spec.positionals.forEach((p, index) => {
        if (p.rest) args[p.name] = list.slice(index);
        else args[p.name] = list[index] === '' ? undefined : list[index];
    });

    if (spec.id === 'topic-pub') {
        if (options.once && (options.rate !== undefined || options.times !== undefined)) throw usageError(spec, '--once нельзя сочетать с --rate и --times');
        if (typeof options.rate === 'number' && options.rate <= 0) throw usageError(spec, '--rate должна быть больше нуля');
    }
    if (spec.id === 'service-call' && typeof options.rate === 'number' && options.rate <= 0) throw usageError(spec, '--rate должна быть больше нуля');
    if (spec.id === 'topic-echo' && typeof options.n === 'number' && (!Number.isInteger(options.n) || options.n < 1)) throw usageError(spec, '-n: нужно целое число от 1');
    if (spec.id === 'topic-pub' && typeof options.times === 'number' && (!Number.isInteger(options.times) || options.times < 1)) throw usageError(spec, '--times: нужно целое число от 1');

    const node = isRaw ? parseNodeArgs((args[spec.positionals[2].name] as string[]) ?? [], spec) : undefined;
    return { kind: 'command', spec, args, options, node };
}

const BUILTINS: BuiltinName[] = ['help', 'clear', 'history', 'exit', 'source'];

/** Разбирает команду целиком; бросает ConsoleError с готовым текстом ошибки. */
export function parseCommandLine(line: string): ParsedLine {
    const tokens = tokenize(line);
    if (tokens.length === 0) return { kind: 'empty' };
    const [first, ...rest] = tokens;
    if ((BUILTINS as string[]).includes(first)) return { kind: 'builtin', name: first as BuiltinName, args: rest };
    if (first === '.') return { kind: 'builtin', name: 'source', args: rest };
    if (first !== 'ros2') {
        const near = closest(first, [...BUILTINS, 'ros2']);
        throw new ConsoleError(`bash: ${first}: команда не найдена`, near ? `Возможно, вы имели в виду «${near}». Список команд консоли: help` : 'Это консоль ros2: введите help');
    }
    if (rest.length === 0 || rest[0] === '-h' || rest[0] === '--help') return { kind: 'help', path: [] };
    const verb = rest[0];
    if (UNSUPPORTED_VERBS.includes(verb)) {
        throw new ConsoleError(`ros2 ${verb}: в симуляторе не поддерживается`, `Доступно: ${VERBS.join(', ')}`);
    }
    if (!VERBS.includes(verb)) {
        const near = closest(verb, VERBS);
        throw new ConsoleError(`ros2: ошибка: неизвестная команда '${verb}' (доступно: ${VERBS.join(', ')})`, near ? `Возможно, вы имели в виду «ros2 ${near}»` : 'ros2 --help - список команд');
    }
    const direct = findCommand([verb]);
    if (direct) return parseArguments(direct, rest.slice(1));
    const subs = subcommandsOf(verb);
    const sub = rest[1];
    if (sub === undefined) return { kind: 'help', path: [verb] };
    if (sub === '-h' || sub === '--help') return { kind: 'help', path: [verb] };
    const spec = subs.find((candidate) => candidate.path[1] === sub);
    if (!spec) {
        const near = closest(sub, subs.map((candidate) => candidate.path[1]));
        throw new ConsoleError(`ros2 ${verb}: ошибка: неизвестная команда '${sub}' (доступно: ${subs.map((s) => s.path[1]).join(', ')})`,
            near ? `Возможно, вы имели в виду «ros2 ${verb} ${near}»` : `ros2 ${verb} -h - справка`);
    }
    return parseArguments(spec, rest.slice(2));
}
