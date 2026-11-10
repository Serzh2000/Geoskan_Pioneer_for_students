import { ROS2_LAUNCH_FILES, type Ros2ConfigName } from '../interfaces.js';
import { AbortedError, raceAbort } from './clock.js';
import { ConsoleError } from './errors.js';
import { formatLogLine, diffLog } from './format.js';
import type { ParsedLine } from './parser.js';
import { GS_PACKAGES } from './specs.js';
import { stamp, tail, writeNodeLogs, type ConsoleContext } from './context.js';

/* ros2 launch и ros2 run: узел работает, пока команду не остановят. */
const LOG_POLL_SEC = 0.5;
const PIDS = { ros_pioneer_node: 2101, camera_node: 2102, camera_servo: 2103 };

function configOfLaunchFile(file: string): Ros2ConfigName | null {
    return (Object.entries(ROS2_LAUNCH_FILES).find(([, name]) => name === file)?.[0] as Ros2ConfigName | undefined) ?? null;
}

/** ros2 launch / ros2 run: узел работает, пока команду не остановят Ctrl+C. */
export async function foreground(parsed: Extract<ParsedLine, { kind: 'command' }>, ctx: ConsoleContext, signal: AbortSignal): Promise<void> {
    const { spec, args } = parsed;
    const isLaunch = spec.id === 'launch';
    const pkg = args.package_name as string;
    const target = (isLaunch ? args.launch_file_name : args.executable_name) as string;
    if (!(pkg in GS_PACKAGES)) {
        throw new ConsoleError(`Package '${pkg}' not found, searching: ['/opt/ros/jazzy']`, 'В симуляторе есть пакет gs_core (ros2 pkg list)');
    }
    let config: Ros2ConfigName = ctx.model;
    if (isLaunch) {
        const found = configOfLaunchFile(target);
        if (pkg !== 'gs_core' || !found) {
            throw new ConsoleError(`file '${target}' was not found in the share directory of package '${pkg}' which is at '/opt/ros/jazzy/share/${pkg}'`,
                `Launch-файлы gs_core: ${Object.values(ROS2_LAUNCH_FILES).join(', ')}`);
        }
        config = found;
    } else {
        if (!GS_PACKAGES[pkg].includes(target)) {
            throw new ConsoleError(`No executable found`, pkg === 'gs_core' ? 'У gs_core один исполняемый файл: ros_pioneer_node' : `Исполняемые файлы: ros2 pkg executables ${pkg}`);
        }
        if (pkg !== 'gs_core') throw new ConsoleError(`${target}: в симуляторе запускается только gs_core ros_pioneer_node`, 'Камеры эмулируются как часть Python · SDK2, отдельных узлов нет');
        const file = parsed.node?.paramsFile;
        if (file) {
            const base = file.split(/[\\/]/u).pop() ?? file;
            const known = base === 'mini2.yaml' ? 'mini2' : base === 'razero.yaml' ? 'razero' : null;
            if (!known) throw new ConsoleError(`[ERROR] Файл параметров не найден: ${file}`, 'В симуляторе доступны конфиги gs_core: mini2.yaml и razero.yaml (например --params-file mini2.yaml)');
            config = known;
        }
    }
    const parameters = parsed.node?.parameters ?? {};
    if (isLaunch && config !== ctx.model) ctx.write(`[WARNING] [launch]: файл рассчитан на борт ${config}, а у выбранного дрона конфиг ${ctx.model}`, 'warn');

    const status = await raceAbort(ctx.api.launchStatus(), signal);
    const restart = !status.running || status.config !== config || Object.keys(parameters).length > 0;
    const owned = restart;
    let info: { parameters: Record<string, unknown> } = { parameters: {} };
    if (restart) info = await raceAbort(ctx.api.launch({ config, parameters, restart: true }), signal);
    ctx.state.stopped = false;
    const boardName = String(info.parameters.board_name ?? (config === 'mini2' ? 'Pioneer Mini 2' : 'Razero'));

    const processes: Array<[string, number]> = [['ros_pioneer_node-1', PIDS.ros_pioneer_node]];
    if (isLaunch) {
        processes.push(['camera_node-2', PIDS.camera_node]);
        if (config === 'mini2') processes.push(['camera_servo-3', PIDS.camera_servo]);
        ctx.write('[INFO] [launch]: All log files can be found below /home/pioneer/.ros/log/sim', 'muted');
        ctx.write('[INFO] [launch]: Default logging verbosity is set to INFO', 'muted');
        for (const [label, pid] of processes) ctx.write(`[INFO] [${label}]: process started with pid [${pid}]`, 'muted');
    }
    const prefix = isLaunch ? '[ros_pioneer_node-1] ' : '';
    ctx.write(`${prefix}${formatLogLine(['INFO', 'ros_pioneer_node', `${boardName}: связь с автопилотом 127.0.0.1:20556 установлена`], stamp(ctx))}`, 'muted');
    if (!restart) ctx.write('(узел уже был запущен и остаётся тем же: перезапуск не нужен, параметры не заданы)', 'muted');

    let seen = await tail(ctx);
    try {
        for (;;) {
            await ctx.clock.sleep(LOG_POLL_SEC, signal);
            const now = await tail(ctx);
            writeNodeLogs(ctx, diffLog(seen, now), prefix);
            seen = now;
        }
    } catch (error) {
        if (!(error instanceof AbortedError)) throw error;
    }
    if (isLaunch) {
        ctx.write('[WARNING] [launch]: user interrupted with ctrl-c (SIGINT)', 'warn');
        for (const [label, pid] of [...processes].reverse()) ctx.write(`[INFO] [${label}]: process has finished cleanly [pid ${pid}]`, 'muted');
    } else {
        ctx.write(formatLogLine(['INFO', 'rclpy', 'signal_handler(signum=2)'], stamp(ctx)), 'muted');
    }
    if (owned) {
        await ctx.api.stopNode();
        ctx.state.stopped = true;
    } else {
        ctx.write('(узел остановлен не был: он работал до этой команды)', 'muted');
    }
}

