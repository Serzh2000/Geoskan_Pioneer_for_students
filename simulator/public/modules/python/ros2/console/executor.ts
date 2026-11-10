import { interfaceKind, interfaceList, interfaceShow, normalizeInterfaceName, ROS2_LAUNCH_FILES } from '../interfaces.js';
import { Ros2Error } from '../registry.js';
import { AbortedError, raceAbort } from './clock.js';
import { ConsoleError } from './errors.js';
import {
    diffLog, formatFieldValue, formatInterfaceList, formatNodeInfo, formatParamDump, formatParamGet, formatParamList,
    formatPubLine, formatServiceCall, formatServiceList, formatTopicInfo, formatTopicList, pickField
} from './format.js';
import { CONSOLE_HELP, helpFor } from './help.js';
import { foreground } from './foreground.js';
import { type ParsedLine } from './parser.js';
import { tail, writeNodeLogs, type ConsoleContext } from './context.js';
import { GS_PACKAGES, PACKAGE_LIST } from './specs.js';
import { parseMessageArgument, parseYaml } from './yaml.js';

const ECHO_CHUNK_SEC = 0.25;
const WAIT_CHUNK_SEC = 2;
/** Команда работает, пока её не остановят: интерфейс отключает озвучивание потока и показывает «Ctrl+C». */
export function isLongRunning(parsed: ParsedLine): boolean {
    if (parsed.kind !== 'command') return false;
    const { spec, options } = parsed;
    switch (spec.id) {
        case 'topic-echo': return !options.once && options.n === undefined;
        case 'topic-pub': return !options.once && options.times === undefined;
        case 'service-call': return options.rate !== undefined;
        case 'launch': case 'run': return true;
        default: return false;
    }
}

const nodeName = (name: string) => (name.startsWith('/') ? name : `/${name}`);

export async function ensureNodeRunning(ctx: ConsoleContext): Promise<void> {
    const status = await ctx.api.launchStatus();
    if (status.running) { ctx.state.stopped = false; return; }
    if (!ctx.state.stopped) await ctx.api.launch({ restart: false });
}

function hintFor(message: string, parsed: ParsedLine, ctx: ConsoleContext): string | undefined {
    if (/не найден/u.test(message) && /Топик|топик/u.test(message)) return 'Список топиков: ros2 topic list -t';
    if (/недоступен/u.test(message)) {
        return ctx.state.stopped ? 'Узел остановлен: запустите его, ros2 launch gs_core ' + ROS2_LAUNCH_FILES[ctx.model] : 'Список сервисов: ros2 service list';
    }
    if (/Сервис не найден/u.test(message)) return 'Список сервисов: ros2 service list';
    if (/Неизвестное поле|Неизвестный тип|Тип сервиса/u.test(message)) {
        const type = parsed.kind === 'command' ? parsed.args.service_type ?? parsed.args.message_type : undefined;
        return typeof type === 'string' ? `Поля типа: ros2 interface show ${type}` : 'Поля типа: ros2 interface show <тип>';
    }
    if (/Нет ответа/u.test(message)) return 'Если сервис реализует ваша программа, ей нужно крутить spin (rclpy.spin / spin_once)';
    if (/не запущен/u.test(message)) return `Запустите узел: ros2 launch gs_core ${ROS2_LAUNCH_FILES[ctx.model]}`;
    if (/Узел не найден/u.test(message)) return 'Список узлов: ros2 node list';
    if (/Параметр не объявлен/u.test(message)) return 'Параметры узла: ros2 param list';
    if (/перезапуск/u.test(message)) return 'Параметры топиков и борта читаются при старте: ros2 run gs_core ros_pioneer_node --ros-args -p topics.gnss:=true';
    return undefined;
}

/** Выполняет строку; ошибки печатает сама. Возвращает false, если команду прервали. */
export type { ConsoleApi, ConsoleContext, NodeState, OutputKind } from './context.js';
export { ROS_EPOCH } from './context.js';

export async function executeLine(parsed: ParsedLine, ctx: ConsoleContext, signal: AbortSignal): Promise<boolean> {
    try {
        await run(parsed, ctx, signal);
        return true;
    } catch (error) {
        if (error instanceof AbortedError) return false;
        if (error instanceof ConsoleError) {
            ctx.write(error.message, 'error');
            if (error.hint) ctx.write(`Подсказка: ${error.hint}`, 'muted');
        } else if (error instanceof Ros2Error) {
            ctx.write(error.message, 'error');
            const hint = hintFor(error.message, parsed, ctx);
            if (hint) ctx.write(`Подсказка: ${hint}`, 'muted');
        } else {
            ctx.write(`Внутренняя ошибка консоли: ${error instanceof Error ? error.message : String(error)}`, 'error');
        }
        return true;
    }
}

async function run(parsed: ParsedLine, ctx: ConsoleContext, signal: AbortSignal): Promise<void> {
    if (parsed.kind === 'empty') return;
    if (parsed.kind === 'builtin') {
        switch (parsed.name) {
            case 'help': ctx.write(CONSOLE_HELP); break;
            case 'clear': ctx.clear(); break;
            case 'history': ctx.history().forEach((line, index) => ctx.write(`${String(index + 1).padStart(4)}  ${line}`)); break;
            case 'exit': ctx.write('Консоль не закрывается командой: скройте панель терминала (Ctrl+J).', 'muted'); break;
            default: break; // source ... - окружение ROS в симуляторе уже настроено
        }
        return;
    }
    if (parsed.kind === 'help') {
        ctx.write(helpFor(parsed.path));
        return;
    }

    const { spec, args, options } = parsed;
    const str = (name: string) => args[name] as string;
    // Команды без борта: описания интерфейсов лежат в TS.
    if (spec.id === 'interface-list') {
        ctx.write(formatInterfaceList(interfaceList(), { msgs: Boolean(options.msgs), srvs: Boolean(options.srvs) }));
        return;
    }
    if (spec.id === 'interface-show') {
        const text = interfaceShow(str('type'));
        if (text === null) throw new ConsoleError(`Не найден интерфейс '${str('type')}'`, 'Список типов: ros2 interface list');
        ctx.write(text);
        return;
    }
    if (spec.id === 'pkg-list') { ctx.write([...PACKAGE_LIST].sort().join('\n')); return; }
    if (spec.id === 'pkg-executables') {
        const pkg = args.package_name as string | undefined;
        if (pkg && !(pkg in GS_PACKAGES) && !PACKAGE_LIST.includes(pkg)) throw new ConsoleError(`Package '${pkg}' not found`, 'Список пакетов: ros2 pkg list');
        const entries = Object.entries(GS_PACKAGES).filter(([name]) => !pkg || name === pkg);
        ctx.write(entries.flatMap(([name, executables]) => executables.map((exe) => `${name} ${exe}`)).join('\n'));
        return;
    }
    if (spec.id === 'action-list') return;
    if (spec.id === 'launch' || spec.id === 'run') {
        await foreground(parsed, ctx, signal);
        return;
    }

    await raceAbort(ensureNodeRunning(ctx), signal);
    const api = ctx.api;
    switch (spec.id) {
        case 'topic-list': {
            const rows = await raceAbort(api.topicList(), signal);
            ctx.write(options.count ? String(rows.length) : formatTopicList(rows, Boolean(options.types)));
            return;
        }
        case 'topic-info': {
            ctx.write(formatTopicInfo(await raceAbort(api.topicInfo(str('topic_name')), signal), Boolean(options.verbose)));
            return;
        }
        case 'topic-type': {
            ctx.write((await raceAbort(api.topicInfo(str('topic_name')), signal)).type);
            return;
        }
        case 'topic-find': {
            const wanted = normalizeInterfaceName(str('topic_type'));
            const rows = await raceAbort(api.topicList(), signal);
            ctx.write(rows.filter((row) => row.types.includes(wanted)).map((row) => row.name).join('\n'));
            return;
        }
        case 'topic-echo': return echo(parsed, ctx, signal);
        case 'topic-pub': return publish(parsed, ctx, signal);
        case 'service-list': {
            const rows = await raceAbort(api.serviceList(), signal);
            ctx.write(options.count ? String(rows.length) : formatServiceList(rows, Boolean(options.types)));
            return;
        }
        case 'service-type': {
            ctx.write(await raceAbort(api.serviceType(str('service_name')), signal));
            return;
        }
        case 'service-find': {
            const wanted = normalizeInterfaceName(str('service_type'));
            const rows = await raceAbort(api.serviceList(), signal);
            ctx.write(rows.filter((row) => row.types.includes(wanted)).map((row) => row.name).join('\n'));
            return;
        }
        case 'service-call': return call(parsed, ctx, signal);
        case 'param-list': {
            const node = args.node_name as string | undefined;
            ctx.write(formatParamList(await raceAbort(api.paramList(node ? nodeName(node) : undefined), signal)));
            return;
        }
        case 'param-get': {
            const reply = await raceAbort(api.paramGet(nodeName(str('node_name')), str('parameter_name')), signal);
            ctx.write(formatParamGet(reply.type, reply.value));
            return;
        }
        case 'param-set': {
            const value = parseYaml(str('value'));
            if (value === null || typeof value === 'object') throw new ConsoleError('Значение параметра: число, true/false или строка', 'Пример: ros2 param set /ros_pioneer_node cargo true');
            const reply = await raceAbort(api.paramSet(nodeName(str('node_name')), str('parameter_name'), value), signal);
            ctx.write(reply.successful ? 'Set parameter successful' : `Setting parameter failed: ${reply.reason}`, reply.successful ? 'out' : 'error');
            if (!reply.successful) {
                const hint = hintFor(reply.reason, parsed, ctx);
                if (hint) ctx.write(`Подсказка: ${hint}`, 'muted');
            }
            return;
        }
        case 'param-dump': {
            const node = nodeName(str('node_name'));
            const names = (await raceAbort(api.paramList(node), signal))[node] ?? [];
            const values: Record<string, unknown> = {};
            for (const name of names) values[name] = (await raceAbort(api.paramGet(node, name), signal)).value;
            ctx.write(formatParamDump(node, values));
            return;
        }
        case 'node-list': {
            const nodes = await raceAbort(api.nodeList(), signal);
            ctx.write(options.count ? String(nodes.length) : nodes.join('\n'));
            return;
        }
        case 'node-info': {
            ctx.write(formatNodeInfo(await raceAbort(api.nodeInfo(nodeName(str('node_name'))), signal)));
            return;
        }
        default:
            throw new ConsoleError(`Команда ros2 ${spec.path.join(' ')} не реализована`);
    }
}

async function echo(parsed: Extract<ParsedLine, { kind: 'command' }>, ctx: ConsoleContext, signal: AbortSignal): Promise<void> {
    const { args, options } = parsed;
    const name = args.topic_name as string;
    const type = args.message_type ? normalizeInterfaceName(args.message_type as string) : undefined;
    if (type && interfaceKind(type) !== 'msg') throw new ConsoleError('The passed message type is invalid', 'Типы сообщений: ros2 interface list -m');
    const total = options.once ? 1 : typeof options.n === 'number' ? options.n : Number.POSITIVE_INFINITY;
    const field = typeof options.field === 'string' ? options.field : undefined;
    const bounded = Number.isFinite(total);
    let printed = 0;
    let idle = 0;
    let hinted = false;
    while (printed < total) {
        const want = bounded ? total - printed : 1000;
        const chunk = bounded ? WAIT_CHUNK_SEC : ECHO_CHUNK_SEC;
        const items = await raceAbort(ctx.api.topicEcho(name, { count: want, timeoutSec: chunk, type }), signal);
        for (const item of items) {
            if (field) {
                try {
                    ctx.write(`${formatFieldValue(pickField(item.msg, field))}\n---`);
                } catch (error) {
                    throw new ConsoleError(error instanceof Error ? error.message : String(error), `Поля типа: ros2 interface show <тип топика> (ros2 topic type ${name})`);
                }
            } else ctx.write(`${item.yaml}\n---`);
            printed += 1;
        }
        if (items.length === 0) {
            idle += chunk;
            if (idle >= 3 && !hinted) {
                hinted = true;
                ctx.write('(сообщений пока нет: топик молчит или симуляция на паузе; Ctrl+C - остановить)', 'muted');
            }
        } else idle = 0;
    }
}

async function publish(parsed: Extract<ParsedLine, { kind: 'command' }>, ctx: ConsoleContext, signal: AbortSignal): Promise<void> {
    const { args, options } = parsed;
    const name = args.topic_name as string;
    const type = normalizeInterfaceName(args.message_type as string);
    if (interfaceKind(type) !== 'msg') throw new ConsoleError('The passed message type is invalid', 'Типы сообщений: ros2 interface list -m');
    const msg = parseMessageArgument(args.values as string | undefined, 'сообщение');
    const once = Boolean(options.once);
    const times = once ? 1 : typeof options.times === 'number' ? options.times : Number.POSITIVE_INFINITY;
    const rate = typeof options.rate === 'number' ? options.rate : 1;
    ctx.write('publisher: beginning loop');
    for (let index = 1; index <= times; index += 1) {
        const reply = await raceAbort(ctx.api.topicPub(name, msg, { type, once: true }), signal);
        ctx.write(formatPubLine(index, reply.repr));
        if (index < times) await ctx.clock.sleep(1 / rate, signal);
    }
}

async function call(parsed: Extract<ParsedLine, { kind: 'command' }>, ctx: ConsoleContext, signal: AbortSignal): Promise<void> {
    const { args, options } = parsed;
    const name = args.service_name as string;
    const type = args.service_type ? normalizeInterfaceName(args.service_type as string) : undefined;
    if (type && interfaceKind(type) !== 'srv') throw new ConsoleError('The passed service type is invalid', 'Типы сервисов: ros2 interface list -s');
    const request = parseMessageArgument(args.values as string | undefined, 'запрос');
    const rate = typeof options.rate === 'number' ? options.rate : null;
    do {
        const before = await tail(ctx);
        const result = await raceAbort(ctx.api.serviceCall(name, request, { type }), signal);
        ctx.write(formatServiceCall(result));
        writeNodeLogs(ctx, diffLog(before, await tail(ctx)), '[ros_pioneer_node-1] ');
        if (rate !== null) await ctx.clock.sleep(1 / rate, signal);
    } while (rate !== null);
}
