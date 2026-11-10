import type { Ros2ConfigName } from '../interfaces.js';
import type { Ros2Registry } from '../registry.js';
import type { ConsoleClock } from './clock.js';
import { formatLogLine, type LogItem } from './format.js';

/*
 * Выполнение разобранных команд против реестра ROS 2 (registry.ts). Ничего не знает про DOM: вывод идёт в ctx.write,
 * время - из ctx.clock (симулируемое), остановка (Ctrl+C) - через AbortSignal.
 */
export type OutputKind = 'out' | 'error' | 'warn' | 'muted';

export type ConsoleApi = Pick<Ros2Registry,
    'launch' | 'launchStatus' | 'stopNode' | 'nodeList' | 'nodeInfo' | 'topicList' | 'topicInfo' | 'topicEcho' | 'topicPub'
    | 'serviceList' | 'serviceType' | 'serviceCall' | 'paramList' | 'paramGet' | 'paramSet' | 'logTail'>;

export interface NodeState {
    /** Пользователь остановил узел Ctrl+C у ros2 launch / run: автозапуск выключен, пока он не запустит узел снова. */
    stopped: boolean;
}

export interface ConsoleContext {
    api: ConsoleApi;
    /** Конфиг борта выбранного дрона: mini2 или razero. */
    model: Ros2ConfigName;
    clock: ConsoleClock;
    write(text: string, kind?: OutputKind): void;
    clear(): void;
    state: NodeState;
    history(): readonly string[];
}

/** Эпоха меток времени ROS в симуляторе (1980-01-06, как у time() в pioneer_sdk2). */
export const ROS_EPOCH = 315964800;

export const stamp = (ctx: ConsoleContext) => ROS_EPOCH + ctx.clock.now();

export async function tail(ctx: ConsoleContext): Promise<LogItem[]> {
    try {
        return (await ctx.api.logTail(200)) as LogItem[];
    } catch {
        return [];
    }
}

export function writeNodeLogs(ctx: ConsoleContext, items: LogItem[], prefix: string): void {
    for (const item of items) {
        if (!item[1].startsWith('ros_pioneer_node') || item[0] === 'DEBUG') continue;
        ctx.write(`${prefix}${formatLogLine(item, stamp(ctx))}`, item[0] === 'WARN' || item[0] === 'ERROR' || item[0] === 'FATAL' ? 'warn' : 'muted');
    }
}
