/*
 * Таблица команд консоли `ros2`: одна на разбор аргументов, справку (`-h`) и дополнение по Tab.
 * Опции - подмножество настоящего ros2 (Jazzy); то, чего нет, перечислено в docs/ros2/emulation-notes.md (раздел «Консоль ros2»).
 */
export interface OptionSpec {
    flags: string[];
    key: string;
    /** Нет value - флаг без значения. */
    value?: 'string' | 'number';
    /** Имя значения в справке: --rate Hz. */
    metavar?: string;
    help: string;
}

export interface PositionalSpec {
    name: string;
    optional?: boolean;
    /** Забирает все оставшиеся аргументы. */
    rest?: boolean;
    /** Откуда брать варианты для Tab. */
    complete?: 'topic' | 'service' | 'node' | 'msg' | 'srv' | 'interface' | 'param' | 'package' | 'launchfile' | 'executable';
}

export interface CommandSpec {
    id: string;
    /** ['topic', 'echo'] */
    path: string[];
    summary: string;
    positionals: PositionalSpec[];
    options: OptionSpec[];
    /** Пример для справки. */
    example?: string;
}

const COUNT: OptionSpec = { flags: ['-c', '--count-nodes'], key: 'count', help: 'Только число' };

export const COMMANDS: CommandSpec[] = [
    {
        id: 'topic-list', path: ['topic', 'list'], summary: 'Список топиков', positionals: [],
        options: [
            { flags: ['-t', '--show-types'], key: 'types', help: 'Добавить тип сообщения' },
            { flags: ['-c', '--count-topics'], key: 'count', help: 'Только число топиков' }
        ],
        example: 'ros2 topic list -t'
    },
    {
        id: 'topic-info', path: ['topic', 'info'], summary: 'Тип топика, число издателей и подписчиков',
        positionals: [{ name: 'topic_name', complete: 'topic' }],
        options: [{ flags: ['-v', '--verbose'], key: 'verbose', help: 'Показать узлы-издатели и узлы-подписчики' }],
        example: 'ros2 topic info /geoscan/sensors/battery_state'
    },
    {
        id: 'topic-type', path: ['topic', 'type'], summary: 'Тип сообщения топика',
        positionals: [{ name: 'topic_name', complete: 'topic' }], options: []
    },
    {
        id: 'topic-find', path: ['topic', 'find'], summary: 'Топики заданного типа',
        positionals: [{ name: 'topic_type', complete: 'msg' }], options: []
    },
    {
        id: 'topic-echo', path: ['topic', 'echo'], summary: 'Печатать сообщения топика (Ctrl+C - остановить)',
        positionals: [{ name: 'topic_name', complete: 'topic' }, { name: 'message_type', optional: true, complete: 'msg' }],
        options: [
            { flags: ['--once'], key: 'once', help: 'Напечатать одно сообщение и выйти' },
            { flags: ['-n', '--count'], key: 'n', value: 'number', metavar: 'N', help: 'Напечатать N сообщений и выйти (в симуляторе; в ros2 такой опции нет)' },
            { flags: ['--field'], key: 'field', value: 'string', metavar: 'FIELD', help: 'Печатать только поле, например twist.linear.x' }
        ],
        example: 'ros2 topic echo /geoscan/sensors/battery_state --once'
    },
    {
        id: 'topic-pub', path: ['topic', 'pub'], summary: 'Опубликовать сообщение (Ctrl+C - остановить)',
        positionals: [{ name: 'topic_name', complete: 'topic' }, { name: 'message_type', complete: 'msg' }, { name: 'values', optional: true }],
        options: [
            { flags: ['-1', '--once'], key: 'once', help: 'Опубликовать одно сообщение и выйти' },
            { flags: ['-r', '--rate'], key: 'rate', value: 'number', metavar: 'Hz', help: 'Частота публикации, Гц (по умолчанию 1)' },
            { flags: ['-t', '--times'], key: 'times', value: 'number', metavar: 'N', help: 'Опубликовать N раз и выйти' }
        ],
        example: `ros2 topic pub --once /geoscan/flight/cmd_vel geometry_msgs/msg/TwistStamped "{header: {frame_id: 'base_link'}, twist: {linear: {x: 0.5}}}"`
    },
    {
        id: 'service-list', path: ['service', 'list'], summary: 'Список сервисов', positionals: [],
        options: [
            { flags: ['-t', '--show-types'], key: 'types', help: 'Добавить тип сервиса' },
            { flags: ['-c', '--count-services'], key: 'count', help: 'Только число сервисов' }
        ],
        example: 'ros2 service list -t'
    },
    {
        id: 'service-type', path: ['service', 'type'], summary: 'Тип сервиса',
        positionals: [{ name: 'service_name', complete: 'service' }], options: [],
        example: 'ros2 service type /geoscan/flight/arm'
    },
    {
        id: 'service-find', path: ['service', 'find'], summary: 'Сервисы заданного типа',
        positionals: [{ name: 'service_type', complete: 'srv' }], options: []
    },
    {
        id: 'service-call', path: ['service', 'call'], summary: 'Вызвать сервис',
        positionals: [{ name: 'service_name', complete: 'service' }, { name: 'service_type', optional: true, complete: 'srv' }, { name: 'values', optional: true }],
        options: [{ flags: ['-r', '--rate'], key: 'rate', value: 'number', metavar: 'Hz', help: 'Повторять вызов с частотой Hz (Ctrl+C - остановить)' }],
        example: 'ros2 service call /geoscan/flight/arm gs_interfaces/srv/Arm "{timeout: 5, retries: 0}"'
    },
    {
        id: 'interface-list', path: ['interface', 'list'], summary: 'Список типов сообщений и сервисов', positionals: [],
        options: [
            { flags: ['-m', '--only-msgs'], key: 'msgs', help: 'Только сообщения' },
            { flags: ['-s', '--only-srvs'], key: 'srvs', help: 'Только сервисы' }
        ]
    },
    {
        id: 'interface-show', path: ['interface', 'show'], summary: 'Поля сообщения или сервиса',
        positionals: [{ name: 'type', complete: 'interface' }], options: [],
        example: 'ros2 interface show gs_interfaces/srv/GoToLocalPoint'
    },
    { id: 'param-list', path: ['param', 'list'], summary: 'Параметры узлов', positionals: [{ name: 'node_name', optional: true, complete: 'node' }], options: [], example: 'ros2 param list' },
    {
        id: 'param-get', path: ['param', 'get'], summary: 'Значение параметра',
        positionals: [{ name: 'node_name', complete: 'node' }, { name: 'parameter_name', complete: 'param' }], options: [],
        example: 'ros2 param get /ros_pioneer_node board_name'
    },
    {
        id: 'param-set', path: ['param', 'set'], summary: 'Изменить параметр',
        positionals: [{ name: 'node_name', complete: 'node' }, { name: 'parameter_name', complete: 'param' }, { name: 'value' }], options: [],
        example: 'ros2 param set /ros_pioneer_node cargo true'
    },
    {
        id: 'param-dump', path: ['param', 'dump'], summary: 'Параметры узла в виде YAML-файла',
        positionals: [{ name: 'node_name', complete: 'node' }], options: []
    },
    { id: 'node-list', path: ['node', 'list'], summary: 'Список узлов', positionals: [], options: [COUNT] },
    { id: 'node-info', path: ['node', 'info'], summary: 'Топики и сервисы узла', positionals: [{ name: 'node_name', complete: 'node' }], options: [], example: 'ros2 node info /ros_pioneer_node' },
    {
        id: 'launch', path: ['launch'], summary: 'Запустить launch-файл пакета (Ctrl+C - остановить)',
        positionals: [{ name: 'package_name', complete: 'package' }, { name: 'launch_file_name', complete: 'launchfile' }, { name: 'launch_arguments', optional: true, rest: true }],
        options: [],
        example: 'ros2 launch gs_core pioneer_mini2_full_launch.py'
    },
    {
        id: 'run', path: ['run'], summary: 'Запустить исполняемый файл пакета (Ctrl+C - остановить)',
        positionals: [{ name: 'package_name', complete: 'package' }, { name: 'executable_name', complete: 'executable' }, { name: 'argv', optional: true, rest: true }],
        options: [],
        example: 'ros2 run gs_core ros_pioneer_node --ros-args --params-file mini2.yaml -p topics.gnss:=true'
    },
    { id: 'pkg-list', path: ['pkg', 'list'], summary: 'Список пакетов', positionals: [], options: [] },
    { id: 'pkg-executables', path: ['pkg', 'executables'], summary: 'Исполняемые файлы пакета', positionals: [{ name: 'package_name', optional: true, complete: 'package' }], options: [] },
    { id: 'action-list', path: ['action', 'list'], summary: 'Список действий (action)', positionals: [], options: [] }
];

export const VERB_SUMMARIES: Record<string, string> = {
    action: 'Действия (action)',
    interface: 'Типы сообщений и сервисов',
    launch: 'Запуск launch-файлов',
    node: 'Узлы',
    param: 'Параметры узлов',
    pkg: 'Пакеты',
    run: 'Запуск исполняемых файлов',
    service: 'Сервисы',
    topic: 'Топики'
};

export const VERBS = Object.keys(VERB_SUMMARIES);

/** Команды, которые есть в настоящем ros2, но не в симуляторе: честный ответ вместо «неизвестная команда». */
export const UNSUPPORTED_VERBS = ['bag', 'component', 'daemon', 'doctor', 'extension_points', 'extensions', 'lifecycle', 'multicast', 'security', 'wtf'];

export const GS_PACKAGES: Record<string, string[]> = {
    gs_core: ['ros_pioneer_node'],
    gs_interfaces: [],
    gs_camera: ['camera_node', 'camera_servo']
};

export const PACKAGE_LIST = ['gs_camera', 'gs_core', 'gs_interfaces', 'geometry_msgs', 'rclpy', 'sensor_msgs', 'std_msgs', 'std_srvs'];

export function subcommandsOf(verb: string): CommandSpec[] {
    return COMMANDS.filter((command) => command.path[0] === verb && command.path.length > 1);
}

export function findCommand(path: string[]): CommandSpec | undefined {
    return COMMANDS.find((command) => command.path.length === path.length && command.path.every((part, i) => part === path[i]));
}
