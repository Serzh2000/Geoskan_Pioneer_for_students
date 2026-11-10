import { VERB_SUMMARIES, VERBS, findCommand, subcommandsOf, type CommandSpec } from './specs.js';

/* Справка консоли: usage в формате argparse настоящего ros2, пояснения по-русски. */

export function usageOf(spec: CommandSpec): string {
    const options = spec.options.map((option) => {
        return `[${option.flags[0]}${option.value ? ` ${option.metavar ?? option.key}` : ''}]`;
    });
    const positionals = spec.positionals.map((p) => (p.optional ? `[${p.name}${p.rest ? ' ...' : ''}]` : p.name));
    return `usage: ros2 ${spec.path.join(' ')} [-h] ${[...options, ...positionals].join(' ')}`.replace(/\s+$/u, '');
}

function pad(text: string, width: number): string {
    return text.length >= width ? `${text}  ` : text.padEnd(width + 2);
}

export function commandHelp(spec: CommandSpec): string {
    const lines = [usageOf(spec), '', spec.summary];
    if (spec.positionals.length) {
        lines.push('', 'Аргументы:');
        for (const p of spec.positionals) lines.push(`  ${p.name}${p.optional ? ' (необязательный)' : ''}`);
    }
    lines.push('', 'Опции:', `  ${pad('-h, --help', 20)}показать эту справку`);
    for (const option of spec.options) {
        lines.push(`  ${pad(option.flags.join(', ') + (option.value ? ` ${option.metavar ?? ''}` : ''), 20)}${option.help}`);
    }
    if (spec.example) lines.push('', 'Пример:', `  ${spec.example}`);
    return lines.join('\n');
}

export function verbHelp(verb: string): string {
    const subs = subcommandsOf(verb);
    if (!subs.length) {
        const spec = findCommand([verb]);
        return spec ? commandHelp(spec) : mainHelp();
    }
    const width = Math.max(...subs.map((s) => s.path[1].length));
    return [
        `usage: ros2 ${verb} [-h] Call \`ros2 ${verb} <command> -h\` for more detailed usage. ...`,
        '',
        VERB_SUMMARIES[verb] ?? '',
        '',
        'Опции:',
        `  ${pad('-h, --help', 12)}показать эту справку`,
        '',
        'Команды:',
        ...subs.map((s) => `  ${s.path[1].padEnd(width + 2)}${s.summary}`)
    ].join('\n');
}

export function mainHelp(): string {
    const width = Math.max(...VERBS.map((v) => v.length));
    return [
        'usage: ros2 [-h] Call `ros2 <command> -h` for more detailed usage. ...',
        '',
        'ros2 в симуляторе: узел ros_pioneer_node (пакет gs_core) выбранного дрона в режиме «Python · SDK2».',
        '',
        'Команды:',
        ...VERBS.map((verb) => `  ${verb.padEnd(width + 2)}${VERB_SUMMARIES[verb]}`),
        '',
        'Справка по команде: ros2 <команда> -h, например ros2 service call -h'
    ].join('\n');
}

/** Справка по пути команды: [] - общая, ['topic'] - группа, ['topic', 'echo'] - команда. */
export function helpFor(path: string[]): string {
    if (path.length === 0) return mainHelp();
    const spec = findCommand(path);
    if (spec) return commandHelp(spec);
    return verbHelp(path[0]);
}

export const CONSOLE_HELP = [
    'Команды консоли',
    '  ros2 <команда> ...   как на настоящем Пионере (gs_core, ROS 2 Jazzy); ros2 --help - список',
    '  help                 эта подсказка',
    '  clear                очистить экран (Ctrl+L)',
    '  history              команды, введённые раньше',
    '',
    'Клавиши',
    '  Enter - выполнить, \\ в конце строки - продолжение на следующей',
    '  Ctrl+C - остановить echo, pub -r, launch и run',
    '  ↑ ↓ - история, Tab - дополнить (на пустой строке Tab выходит из консоли)',
    '',
    'Основное',
    '  ros2 service list                          сервисы gs_core',
    '  ros2 service type <сервис>                 тип сервиса',
    '  ros2 service call <сервис> <тип> "{...}"   вызвать сервис',
    '  ros2 interface show <тип>                  поля запроса и ответа',
    '  ros2 topic list -t                         топики с типами',
    '  ros2 topic echo <топик> [--once] [-n N]    печатать сообщения',
    '  ros2 topic pub [--once|-r Гц] <топик> <тип> "{...}"',
    '  ros2 param list | get | set | dump         параметры ros_pioneer_node',
    '  ros2 node list | info                      узлы',
    '  ros2 launch gs_core pioneer_mini2_full_launch.py',
    '  ros2 run gs_core ros_pioneer_node --ros-args --params-file mini2.yaml -p topics.gnss:=true'
].join('\n');
