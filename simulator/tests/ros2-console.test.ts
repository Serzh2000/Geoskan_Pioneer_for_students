/**
 * Консоль ros2: разбор строки и YAML, форматы вывода, дополнение по Tab, история и выполнение команд
 * против поддельного реестра. Настоящий Python и интерфейс проверяют ros2-console-ui.test.ts.
 */
import { describe, expect, jest, test } from '@jest/globals';
import { AbortedError, createPollingClock, raceAbort, type ConsoleClock } from '../public/modules/python/ros2/console/clock.js';
import { complete, EMPTY_COMPLETION_DATA, type CompletionData } from '../public/modules/python/ros2/console/complete.js';
import { ConsoleError } from '../public/modules/python/ros2/console/errors.js';
import { executeLine, isLongRunning, type ConsoleApi, type ConsoleContext, type OutputKind } from '../public/modules/python/ros2/console/executor.js';
import {
    diffLog, formatInterfaceList, formatNodeInfo, formatParamDump, formatParamGet, formatServiceCall, formatTopicInfo, formatTopicList, pickField, type LogItem
} from '../public/modules/python/ros2/console/format.js';
import { CommandHistory } from '../public/modules/python/ros2/console/history.js';
import { helpFor } from '../public/modules/python/ros2/console/help.js';
import { parseCommandLine, type ParsedLine } from '../public/modules/python/ros2/console/parser.js';
import { needsContinuation, scan, tokenize } from '../public/modules/python/ros2/console/tokenize.js';
import { parseMessageArgument, parseYaml } from '../public/modules/python/ros2/console/yaml.js';
import { Ros2Error } from '../public/modules/python/ros2/registry.js';

describe('tokenize', () => {
    test('кавычки, экранирование и комментарии как в bash', () => {
        expect(tokenize(`ros2 service call /a std_srvs/srv/Trigger "{}"`)).toEqual(['ros2', 'service', 'call', '/a', 'std_srvs/srv/Trigger', '{}']);
        expect(tokenize(`x "{a: 'map', b: \\"q\\"}" 'it''s'`)).toEqual(['x', `{a: 'map', b: "q"}`, 'its']);
        expect(tokenize('ros2 launch gs_core f.py     # узел автопилота и камеры')).toEqual(['ros2', 'launch', 'gs_core', 'f.py']);
        expect(tokenize('a#b c')).toEqual(['a#b', 'c']);
        expect(tokenize('a\\ b')).toEqual(['a b']);
        expect(tokenize('"" x')).toEqual(['', 'x']);
    });

    test('обратная косая и перевод строки склеивают строки, в кавычках перевод строки остаётся', () => {
        expect(tokenize('ros2 service call \\\n  /geoscan/flight/arm \\\n  gs_interfaces/srv/Arm "{timeout: 5}"'))
            .toEqual(['ros2', 'service', 'call', '/geoscan/flight/arm', 'gs_interfaces/srv/Arm', '{timeout: 5}']);
        expect(tokenize('x "a\nb"')).toEqual(['x', 'a\nb']);
        expect(tokenize('x "a\\\nb"')).toEqual(['x', 'ab']);
    });

    test('незавершённая строка: кавычка или \\ на конце', () => {
        expect(scan('ros2 topic pub "{a: 1').incomplete).toBe('quote');
        expect(scan("x 'abc").incomplete).toBe('quote');
        expect(scan('ros2 service \\').incomplete).toBe('backslash');
        expect(needsContinuation('ros2 service list')).toBe(false);
        expect(needsContinuation('ros2 service call a b "{timeout: 5,')).toBe(true);
        expect(() => tokenize('x "abc')).toThrow(ConsoleError);
    });
});

describe('yaml', () => {
    test('поточный стиль из документации', () => {
        expect(parseYaml("{x: 0.0, y: 0.0, z: 1.0, yaw: 0.0, time: 5, frame_id: 'map'}"))
            .toEqual({ x: 0, y: 0, z: 1, yaw: 0, time: 5, frame_id: 'map' });
        expect(parseYaml('{timeout: 5, retries: 0}')).toEqual({ timeout: 5, retries: 0 });
        expect(parseYaml('{}')).toEqual({});
        expect(parseYaml('{mode: 1, leds: [{r: 0.0, g: 1.0, b: 0.0, a: 1.0}], period: 0.0}'))
            .toEqual({ mode: 1, leds: [{ r: 0, g: 1, b: 0, a: 1 }], period: 0 });
        expect(parseYaml("{header: {frame_id: 'base_link'}, twist: {linear: {x: 0.5, y: 0.0, z: 0.0}, angular: {z: 0.0}}}"))
            .toEqual({ header: { frame_id: 'base_link' }, twist: { linear: { x: 0.5, y: 0, z: 0 }, angular: { z: 0 } } });
    });

    test('скаляры: числа, логические значения, null, строки', () => {
        expect(parseYaml('{a: true, b: False, c: null, d: ~, e: -1.5e2, f: 0x10, g: hello world, h: "x y", i: \'it\'\'s\'}'))
            .toEqual({ a: true, b: false, c: null, d: null, e: -150, f: 16, g: 'hello world', h: 'x y', i: "it's" });
        expect(parseYaml('{a: [1, 2.5, three], b: []}')).toEqual({ a: [1, 2.5, 'three'], b: [] });
        expect(parseYaml('{data: "a, b: c"}')).toEqual({ data: 'a, b: c' });
        expect(parseYaml('5')).toBe(5);
        expect(parseYaml('')).toBeNull();
    });

    test('блочный YAML с вложенностью и списками', () => {
        expect(parseYaml('x: 1.0\ny: 2\nframe_id: map')).toEqual({ x: 1, y: 2, frame_id: 'map' });
        expect(parseYaml('header:\n  frame_id: base_link\ntwist:\n  linear:\n    x: 0.5')).toEqual({ header: { frame_id: 'base_link' }, twist: { linear: { x: 0.5 } } });
        expect(parseYaml('mode: 1\nleds:\n  - r: 0.0\n    g: 1.0\n  - {r: 1.0}')).toEqual({ mode: 1, leds: [{ r: 0, g: 1 }, { r: 1 }] });
    });

    test('ошибки с понятным текстом', () => {
        expect(() => parseYaml('{x:1}')).toThrow(/после двоеточия нужен пробел/u);
        expect(() => parseYaml('{x: 1')).toThrow(/не закрыта фигурная скобка/u);
        expect(() => parseYaml('[1, 2')).toThrow(/квадратная скобка/u);
        expect(() => parseYaml("{x: 'a}")).toThrow(/кавычка/u);
        expect(() => parseYaml('{x: 1} лишнее')).toThrow(/лишний текст/u);
        expect(() => parseMessageArgument('[1, 2]')).toThrow(/словарём/u);
        expect(() => parseMessageArgument('hello')).toThrow(/словарём/u);
    });

    test('inf и nan уходят в реестр строками', () => {
        expect(parseMessageArgument('{a: .inf, b: -.inf, c: .nan}')).toEqual({ a: 'inf', b: '-inf', c: 'nan' });
        expect(parseMessageArgument(undefined)).toEqual({});
        expect(parseMessageArgument('  ')).toEqual({});
    });
});

function command(line: string): Extract<ParsedLine, { kind: 'command' }> {
    const parsed = parseCommandLine(line);
    if (parsed.kind !== 'command') throw new Error(`не команда: ${JSON.stringify(parsed)}`);
    return parsed;
}

describe('parser', () => {
    test('команды из документации', () => {
        expect(command('ros2 service list').spec.id).toBe('service-list');
        expect(command('ros2 service type /geoscan/flight/arm').args.service_name).toBe('/geoscan/flight/arm');
        expect(command('ros2 interface show gs_interfaces/srv/GoToLocalPoint').args.type).toBe('gs_interfaces/srv/GoToLocalPoint');
        expect(command('ros2 param list').spec.id).toBe('param-list');
        const call = command('ros2 service call /geoscan/flight/arm gs_interfaces/srv/Arm "{timeout: 5, retries: 0}"');
        expect(call.args).toEqual({ service_name: '/geoscan/flight/arm', service_type: 'gs_interfaces/srv/Arm', values: '{timeout: 5, retries: 0}' });
        const multi = command('ros2 service call \\\n /geoscan/flight/land \\\n std_srvs/srv/Trigger "{}"');
        expect(multi.args.service_type).toBe('std_srvs/srv/Trigger');
    });

    test('опции: флаги, значения, --opt=значение, отрицательные числа', () => {
        expect(command('ros2 topic list -t').options).toEqual({ types: true });
        expect(command('ros2 topic list --show-types --count-topics').options).toEqual({ types: true, count: true });
        expect(command('ros2 topic echo /a --once').options).toEqual({ once: true });
        expect(command('ros2 topic echo /a -n 3').options).toEqual({ n: 3 });
        expect(command('ros2 topic echo --field=twist.linear.x /a').options).toEqual({ field: 'twist.linear.x' });
        const pub = command('ros2 topic pub -r 2.5 /a std_msgs/msg/Float32 "{data: -1.5}"');
        expect(pub.options).toEqual({ rate: 2.5 });
        expect(command('ros2 topic pub --once /a std_msgs/msg/Int8 "{data: 1}"').options).toEqual({ once: true });
        expect(command('ros2 topic pub -1 /a std_msgs/msg/Int8 "{data: 1}"').options).toEqual({ once: true });
        expect(command('ros2 topic pub -t 3 /a std_msgs/msg/Int8 "{data: 1}"').options).toEqual({ times: 3 });
        expect(command('ros2 param set /ros_pioneer_node range_sensor.max_range -1.5').args.value).toBe('-1.5');
    });

    test('service call: тип можно опустить, значения - вторым аргументом', () => {
        const noType = command('ros2 service call /geoscan/flight/land "{}"');
        expect(noType.args).toEqual({ service_name: '/geoscan/flight/land', service_type: undefined, values: '{}' });
        const bare = command('ros2 service call /geoscan/flight/land');
        expect(bare.args.values).toBeUndefined();
        expect(command('ros2 service call /a std_srvs/Trigger').args.service_type).toBe('std_srvs/Trigger');
    });

    test('запуск: launch и run с параметрами узла', () => {
        const launch = command('ros2 launch gs_core pioneer_mini2_full_launch.py');
        expect(launch.args).toMatchObject({ package_name: 'gs_core', launch_file_name: 'pioneer_mini2_full_launch.py' });
        expect(launch.node).toEqual({ parameters: {} });
        expect(command('ros2 launch gs_core pioneer_razero_full_launch.py topics.gnss:=true').node?.parameters).toEqual({ 'topics.gnss': true });
        const run = command('ros2 run gs_core ros_pioneer_node --ros-args --params-file /path/to/mini2.yaml -p topics.gnss:=true -p range_sensor.max_range:=3.5 -p board_name:=Test');
        expect(run.node).toEqual({ paramsFile: '/path/to/mini2.yaml', parameters: { 'topics.gnss': true, 'range_sensor.max_range': 3.5, board_name: 'Test' } });
        expect(() => parseCommandLine('ros2 run gs_core ros_pioneer_node --foo')).toThrow(/после --ros-args/u);
        expect(() => parseCommandLine('ros2 run gs_core ros_pioneer_node --ros-args -r a:=b')).toThrow(/переназначение/u);
        expect(() => parseCommandLine('ros2 launch gs_core f.py gnss')).toThrow(/имя:=значение/u);
    });

    test('справка и встроенные команды', () => {
        expect(parseCommandLine('ros2 --help')).toEqual({ kind: 'help', path: [] });
        expect(parseCommandLine('ros2')).toEqual({ kind: 'help', path: [] });
        expect(parseCommandLine('ros2 topic')).toEqual({ kind: 'help', path: ['topic'] });
        expect(parseCommandLine('ros2 topic echo -h')).toEqual({ kind: 'help', path: ['topic', 'echo'] });
        expect(parseCommandLine('ros2 service -h')).toEqual({ kind: 'help', path: ['service'] });
        expect(parseCommandLine('help')).toEqual({ kind: 'builtin', name: 'help', args: [] });
        expect(parseCommandLine('clear').kind).toBe('builtin');
        expect(parseCommandLine('source /opt/ros/jazzy/setup.bash')).toEqual({ kind: 'builtin', name: 'source', args: ['/opt/ros/jazzy/setup.bash'] });
        expect(parseCommandLine('   ')).toEqual({ kind: 'empty' });
        expect(parseCommandLine('# просто комментарий')).toEqual({ kind: 'empty' });
    });

    test('ошибки: usage, подсказка с опечаткой', () => {
        expect(() => parseCommandLine('ros2 service call')).toThrow(/usage: ros2 service call .*\nros2 service call: ошибка: не хватает аргументов: service_name/u);
        expect(() => parseCommandLine('ros2 topic echo /a b c')).toThrow(/лишние аргументы: c/u);
        expect(() => parseCommandLine('ros2 topic list --nope')).toThrow(/неизвестная опция --nope/u);
        expect(() => parseCommandLine('ros2 topic echo /a -n abc')).toThrow(/нужно число/u);
        expect(() => parseCommandLine('ros2 topic echo /a -n')).toThrow(/нет значения/u);
        expect(() => parseCommandLine('ros2 topic pub --once -r 2 /a std_msgs/msg/Int8 "{}"')).toThrow(/нельзя сочетать/u);
        let error: unknown;
        try { parseCommandLine('ros2 topc list'); } catch (e) { error = e; }
        expect(error).toBeInstanceOf(ConsoleError);
        expect((error as ConsoleError).message).toContain("неизвестная команда 'topc'");
        expect((error as ConsoleError).hint).toContain('ros2 topic');
        try { parseCommandLine('ros2 service lst'); } catch (e) { error = e; }
        expect((error as ConsoleError).hint).toContain('ros2 service list');
        expect(() => parseCommandLine('ros2 bag record')).toThrow(/не поддерживается/u);
        expect(() => parseCommandLine('rosrun x y')).toThrow(/команда не найдена/u);
        expect(() => parseCommandLine('ros2 topic echo /a "unterminated')).toThrow(/кавычка/u);
    });

    test('справка по командам содержит usage и пример', () => {
        expect(helpFor(['service', 'call'])).toMatchInlineSnapshot(`
"usage: ros2 service call [-h] [-r Hz] service_name [service_type] [values]

Вызвать сервис

Аргументы:
  service_name
  service_type (необязательный)
  values (необязательный)

Опции:
  -h, --help            показать эту справку
  -r, --rate Hz         Повторять вызов с частотой Hz (Ctrl+C - остановить)

Пример:
  ros2 service call /geoscan/flight/arm gs_interfaces/srv/Arm "{timeout: 5, retries: 0}""
`);
        expect(helpFor(['topic'])).toContain('echo');
        expect(helpFor([])).toContain('Команды:');
    });
});

describe('форматы вывода', () => {
    test('списки топиков и информация', () => {
        const rows = [
            { name: '/geoscan/flight/fly_state', types: ['std_msgs/msg/Int8'], publishers: 1, subscribers: 0 },
            { name: '/geoscan/flight/cmd_vel', types: ['geometry_msgs/msg/TwistStamped'], publishers: 0, subscribers: 1 }
        ];
        expect(formatTopicList(rows, false)).toBe('/geoscan/flight/fly_state\n/geoscan/flight/cmd_vel');
        expect(formatTopicList(rows, true)).toBe('/geoscan/flight/fly_state [std_msgs/msg/Int8]\n/geoscan/flight/cmd_vel [geometry_msgs/msg/TwistStamped]');
        const info = { name: '/a', type: 'std_msgs/msg/Int8', types: ['std_msgs/msg/Int8'], publishers: [{ node: '/ros_pioneer_node', type: 'std_msgs/msg/Int8' }], subscribers: [] };
        expect(formatTopicInfo(info, false)).toBe('Type: std_msgs/msg/Int8\nPublisher count: 1\nSubscription count: 0');
        expect(formatTopicInfo(info, true)).toContain('Node name: ros_pioneer_node');
        expect(formatTopicInfo(info, true)).toContain('Endpoint type: PUBLISHER');
    });

    test('вызов сервиса печатается как у ros2', () => {
        expect(formatServiceCall({ request: 'gs_interfaces.srv.Arm_Request(timeout=5.0, retries=0)', response_repr: 'gs_interfaces.srv.Arm_Response(success=True)' }))
            .toBe('requester: making request: gs_interfaces.srv.Arm_Request(timeout=5.0, retries=0)\n\nresponse:\ngs_interfaces.srv.Arm_Response(success=True)\n');
    });

    test('параметры: get, dump с вложенностью, list', () => {
        expect(formatParamGet('string', 'Pioneer Mini 2')).toBe('String value is: Pioneer Mini 2');
        expect(formatParamGet('bool', true)).toBe('Boolean value is: True');
        expect(formatParamGet('integer', 2)).toBe('Integer value is: 2');
        expect(formatParamGet('double', 4)).toBe('Double value is: 4.0');
        expect(formatParamDump('/ros_pioneer_node', { board_name: 'Pioneer Mini 2', grab: true, 'topics.imu': true, 'range_sensor.max_range': 4, gtlp_version: 2 }))
            .toBe(['/ros_pioneer_node:', '  ros__parameters:', '    board_name: Pioneer Mini 2', '    grab: true', '    topics:', '      imu: true', '    range_sensor:', '      max_range: 4', '    gtlp_version: 2'].join('\n'));
    });

    test('узел, интерфейсы, поле сообщения', () => {
        expect(formatNodeInfo({ name: '/n', publishers: [{ topic: '/p', type: 'T' }], subscribers: [], service_servers: [{ name: '/s', type: 'S' }], service_clients: [] }))
            .toBe(['/n', '  Subscribers:', '  Publishers:', '    /p: T', '  Service Servers:', '    /s: S', '  Service Clients:', '  Action Servers:', '  Action Clients:'].join('\n'));
        expect(formatInterfaceList({ msgs: ['a/msg/A'], srvs: ['a/srv/B'] }, {})).toBe('Messages:\n    a/msg/A\nServices:\n    a/srv/B');
        expect(formatInterfaceList({ msgs: ['a/msg/A'], srvs: ['a/srv/B'] }, { srvs: true })).toBe('Services:\n    a/srv/B');
        expect(pickField({ twist: { linear: { x: 0.5 } } }, 'twist.linear.x')).toBe(0.5);
        expect(() => pickField({ a: 1 }, 'a.b')).toThrow('нет поля');
    });

    test('новые записи журнала, в том числе при обрезке начала', () => {
        const entry = (n: number): LogItem => ['INFO', 'ros_pioneer_node', `m${n}`];
        expect(diffLog([entry(1), entry(2)], [entry(1), entry(2), entry(3)])).toEqual([entry(3)]);
        expect(diffLog([entry(1), entry(2)], [entry(2), entry(3), entry(4)])).toEqual([entry(3), entry(4)]);
        expect(diffLog([], [entry(1)])).toEqual([entry(1)]);
        expect(diffLog([entry(1)], [entry(1)])).toEqual([]);
        expect(diffLog([entry(1), entry(2)], [entry(5)])).toEqual([entry(5)]);
    });
});

describe('Tab', () => {
    const data: CompletionData = {
        topics: ['/geoscan/flight/cmd_vel', '/geoscan/flight/fly_state', '/geoscan/sensors/battery_state'],
        services: ['/geoscan/flight/arm', '/geoscan/flight/land', '/geoscan/flight/takeoff'],
        nodes: ['/ros_pioneer_node'],
        params: { '/ros_pioneer_node': ['board_name', 'grab', 'topics.gnss'] },
        msgs: ['std_msgs/msg/Int8', 'geometry_msgs/msg/TwistStamped'],
        srvs: ['gs_interfaces/srv/Arm', 'std_srvs/srv/Trigger']
    };
    const run = (line: string) => complete(line, line.length, data);

    test('команды и подкоманды', () => {
        expect(run('ro').line).toBe('ros2 ');
        expect(run('ros2 se').line).toBe('ros2 service ');
        expect(run('ros2 service ca').line).toBe('ros2 service call ');
        expect(run('ros2 t').line).toBe('ros2 topic ');
        expect(run('ros2 ').candidates).toContain('param');
    });

    test('имена из реестра: топики, сервисы, узлы, параметры, типы', () => {
        expect(run('ros2 topic echo /geoscan/s').line).toBe('ros2 topic echo /geoscan/sensors/battery_state ');
        const flight = run('ros2 topic echo /geoscan/flight/');
        expect(flight.line).toBe('ros2 topic echo /geoscan/flight/');
        expect(flight.candidates).toEqual(['/geoscan/flight/cmd_vel', '/geoscan/flight/fly_state']);
        expect(run('ros2 service call /geoscan/flight/ar').line).toBe('ros2 service call /geoscan/flight/arm ');
        expect(run('ros2 service call /geoscan/flight/arm gs_i').line).toBe('ros2 service call /geoscan/flight/arm gs_interfaces/srv/Arm ');
        expect(run('ros2 topic pub /a geo').line).toBe('ros2 topic pub /a geometry_msgs/msg/TwistStamped ');
        expect(run('ros2 param get /ros_pioneer_node b').line).toBe('ros2 param get /ros_pioneer_node board_name ');
        expect(run('ros2 node info /ro').line).toBe('ros2 node info /ros_pioneer_node ');
        expect(run('ros2 interface show gs_interfaces/srv/A').line).toBe('ros2 interface show gs_interfaces/srv/Arm ');
    });

    test('опции, launch и run', () => {
        expect(run('ros2 topic echo /geoscan/flight/fly_state --o').line).toBe('ros2 topic echo /geoscan/flight/fly_state --once ');
        expect(run('ros2 launch gs_co').line).toBe('ros2 launch gs_core ');
        expect(run('ros2 launch gs_core pioneer_m').line).toBe('ros2 launch gs_core pioneer_mini2_full_launch.py ');
        expect(run('ros2 run gs_core ros_p').line).toBe('ros2 run gs_core ros_pioneer_node ');
        expect(run('ros2 run gs_core ros_pioneer_node --ros-').line).toBe('ros2 run gs_core ros_pioneer_node --ros-args ');
    });

    test('внутри кавычек и без совпадений строка не меняется', () => {
        expect(run('ros2 service call /a b "{timeout: ').line).toBe('ros2 service call /a b "{timeout: ');
        expect(run('ros2 topic echo /zzz').candidates).toEqual([]);
        expect(complete('ros2 topic echo /geoscan/flight/c', 10, EMPTY_COMPLETION_DATA).candidates).toEqual([]);
    });
});

describe('история', () => {
    test('стрелки, черновик, повторы и лимит', () => {
        const history = new CommandHistory();
        history.push('ros2 service list');
        history.push('ros2 service list');
        history.push('');
        history.push('ros2 node list');
        expect(history.entries).toEqual(['ros2 service list', 'ros2 node list']);
        expect(history.previous('чер')).toBe('ros2 node list');
        expect(history.previous('чер')).toBe('ros2 service list');
        expect(history.previous('чер')).toBe('ros2 service list');
        expect(history.next('x')).toBe('ros2 node list');
        expect(history.next('x')).toBe('чер');
        expect(history.next('чер')).toBe('чер');
        const small = new CommandHistory([], 2);
        ['a', 'b', 'c'].forEach((line) => small.push(line));
        expect(small.entries).toEqual(['b', 'c']);
        expect(new CommandHistory(['x']).previous('')).toBe('x');
    });
});

// ---------------------------------------------------------------- выполнение

function manualClock(): ConsoleClock & { time: number } {
    const clock = {
        time: 0,
        now() { return clock.time; },
        async sleep(seconds: number, signal: AbortSignal) {
            if (signal.aborted) throw new AbortedError();
            clock.time += seconds;
            await new Promise((resolve) => setTimeout(resolve, 1));
            if (signal.aborted) throw new AbortedError();
        }
    };
    return clock;
}

const NODE = '/ros_pioneer_node';
const PARAMS: Record<string, unknown> = { board_name: 'Pioneer Mini 2', cargo: false, 'topics.gnss': false };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Mocked = { [K in keyof ConsoleApi]: jest.Mock<(...args: any[]) => any> };

function fakeApi(overrides: Partial<Record<keyof ConsoleApi, unknown>> = {}) {
    let running = true;
    let config: string | null = 'mini2';
    const logs: LogItem[] = [];
    const api = {
        launchStatus: jest.fn(async () => ({ running, config })),
        launch: jest.fn(async (options: { config?: string; parameters?: Record<string, unknown> } = {}) => {
            running = true;
            config = options.config ?? 'mini2';
            return { config, parameters: { board_name: config === 'mini2' ? 'Pioneer Mini 2' : 'Razero', ...(options.parameters ?? {}) } };
        }),
        stopNode: jest.fn(async () => { running = false; return true; }),
        nodeList: jest.fn(async () => (running ? [NODE] : [])),
        nodeInfo: jest.fn(async () => ({ name: NODE, publishers: [{ topic: '/geoscan/flight/fly_state', type: 'std_msgs/msg/Int8' }], subscribers: [], service_servers: [{ name: '/geoscan/flight/arm', type: 'gs_interfaces/srv/Arm' }], service_clients: [] })),
        topicList: jest.fn(async () => [
            { name: '/geoscan/flight/fly_state', types: ['std_msgs/msg/Int8'], publishers: 1, subscribers: 0 },
            { name: '/geoscan/sensors/battery_state', types: ['sensor_msgs/msg/BatteryState'], publishers: 1, subscribers: 0 }
        ]),
        topicInfo: jest.fn(async (name: string) => {
            if (name !== '/geoscan/flight/fly_state') throw new Ros2Error(`Топик не найден: ${name}`);
            return { name, type: 'std_msgs/msg/Int8', types: ['std_msgs/msg/Int8'], publishers: [{ node: NODE, type: 'std_msgs/msg/Int8' }], subscribers: [] };
        }),
        topicEcho: jest.fn(async (_name: string, options: { count?: number } = {}) => Array.from({ length: Math.min(options.count ?? 1, 2) }, (_, i) => ({ msg: { data: i }, yaml: `data: ${i}` }))),
        topicPub: jest.fn(async (_name: string, _msg: unknown, options: { type?: string } = {}) => ({ published: 1, type: options.type ?? 'std_msgs/msg/Int8', repr: `std_msgs.msg.Int8(data=1)` })),
        serviceList: jest.fn(async () => [
            { name: '/geoscan/flight/arm', types: ['gs_interfaces/srv/Arm'] },
            { name: '/geoscan/flight/takeoff', types: ['std_srvs/srv/Trigger'] }
        ]),
        serviceType: jest.fn(async (name: string) => {
            if (name !== '/geoscan/flight/arm') throw new Ros2Error(`Сервис не найден: ${name}`);
            return 'gs_interfaces/srv/Arm';
        }),
        serviceCall: jest.fn(async (name: string, request: Record<string, unknown>) => {
            if (name !== '/geoscan/flight/arm') throw new Ros2Error(`Сервис ${name} недоступен`);
            if ('nope' in request) throw new Ros2Error("Неизвестное поле 'nope' в gs_interfaces/srv/Arm");
            logs.push(['WARN', 'ros_pioneer_node', 'arm: пример причины отказа']);
            return { type: 'gs_interfaces/srv/Arm', request: `gs_interfaces.srv.Arm_Request(timeout=${Number(request.timeout).toFixed(1)}, retries=${request.retries})`, response: { success: true }, response_repr: 'gs_interfaces.srv.Arm_Response(success=True)', yaml: 'success: true' };
        }),
        paramList: jest.fn(async () => ({ [NODE]: Object.keys(PARAMS) })),
        paramGet: jest.fn(async (_node: string, name: string) => {
            if (!(name in PARAMS)) throw new Ros2Error(`Параметр не объявлен: ${name}`);
            const value = PARAMS[name];
            return { type: typeof value === 'boolean' ? 'bool' : 'string', value };
        }),
        paramSet: jest.fn(async (_node: string, name: string) => (name.startsWith('topics.')
            ? { successful: false, reason: `Параметр ${name} читается при старте: нужен перезапуск узла` }
            : { successful: true, reason: '' })),
        logTail: jest.fn(async () => logs.map((item) => [...item] as LogItem)),
        ...overrides
    };
    return { api: api as unknown as ConsoleApi & Mocked, setRunning: (value: boolean) => { running = value; }, logs };
}

function setup(overrides: Partial<Record<keyof ConsoleApi, unknown>> = {}, model: 'mini2' | 'razero' = 'mini2') {
    const fake = fakeApi(overrides);
    const out: Array<{ text: string; kind: OutputKind }> = [];
    const cleared = jest.fn();
    const clock = manualClock();
    const ctx: ConsoleContext = {
        api: fake.api, model, clock, state: { stopped: false },
        write: (text, kind = 'out') => { out.push({ text, kind }); },
        clear: cleared, history: () => ['ros2 node list']
    };
    const text = () => out.map((item) => item.text).join('\n');
    const exec = async (line: string, signal = new AbortController().signal) => executeLine(parseCommandLine(line), ctx, signal);
    return { ...fake, ctx, out, text, exec, clock, cleared };
}

describe('executeLine: простые команды', () => {
    test('service list / type / interface show / param list / node list', async () => {
        const t = setup();
        await t.exec('ros2 service list');
        expect(t.text()).toBe('/geoscan/flight/arm\n/geoscan/flight/takeoff');
        t.out.length = 0;
        await t.exec('ros2 service list -t');
        expect(t.text()).toBe('/geoscan/flight/arm [gs_interfaces/srv/Arm]\n/geoscan/flight/takeoff [std_srvs/srv/Trigger]');
        t.out.length = 0;
        await t.exec('ros2 service type /geoscan/flight/arm');
        expect(t.text()).toBe('gs_interfaces/srv/Arm');
        t.out.length = 0;
        await t.exec('ros2 interface show gs_interfaces/srv/Arm');
        expect(t.text()).toBe('float32 timeout\nint32 retries\n---\nbool success');
        t.out.length = 0;
        await t.exec('ros2 param list');
        expect(t.text()).toBe('/ros_pioneer_node:\n  board_name\n  cargo\n  topics.gnss');
        t.out.length = 0;
        await t.exec('ros2 node list');
        expect(t.text()).toBe('/ros_pioneer_node');
        t.out.length = 0;
        await t.exec('ros2 node info /ros_pioneer_node');
        expect(t.text()).toContain('Service Servers:\n    /geoscan/flight/arm: gs_interfaces/srv/Arm');
        t.out.length = 0;
        await t.exec('ros2 topic info /geoscan/flight/fly_state');
        expect(t.text()).toBe('Type: std_msgs/msg/Int8\nPublisher count: 1\nSubscription count: 0');
        t.out.length = 0;
        await t.exec('ros2 service find std_srvs/srv/Trigger');
        expect(t.text()).toBe('/geoscan/flight/takeoff');
    });

    test('service call печатает запрос и ответ как ros2, затем строки журнала узла', async () => {
        const t = setup();
        await t.exec('ros2 service call /geoscan/flight/arm gs_interfaces/srv/Arm "{timeout: 5, retries: 0}"');
        expect(t.out[0].text).toBe('requester: making request: gs_interfaces.srv.Arm_Request(timeout=5.0, retries=0)\n\nresponse:\ngs_interfaces.srv.Arm_Response(success=True)\n');
        expect(t.out[1]).toMatchObject({ kind: 'warn' });
        expect(t.out[1].text).toContain('[ros_pioneer_node-1] [WARN]');
        expect(t.out[1].text).toContain('arm: пример причины отказа');
        expect(t.api.serviceCall).toHaveBeenCalledWith('/geoscan/flight/arm', { timeout: 5, retries: 0 }, { type: 'gs_interfaces/srv/Arm' });
    });

    test('короткий тип, без типа и без аргументов', async () => {
        const t = setup();
        await t.exec('ros2 service call /geoscan/flight/arm gs_interfaces/Arm "{timeout: 1, retries: 2}"');
        expect(t.api.serviceCall).toHaveBeenLastCalledWith('/geoscan/flight/arm', { timeout: 1, retries: 2 }, { type: 'gs_interfaces/srv/Arm' });
        await t.exec('ros2 service call /geoscan/flight/arm "{timeout: 1, retries: 2}"');
        expect(t.api.serviceCall).toHaveBeenLastCalledWith('/geoscan/flight/arm', { timeout: 1, retries: 2 }, { type: undefined });
        await t.exec('ros2 service call /geoscan/flight/arm std_srvs/srv/Trigger');
        expect(t.api.serviceCall).toHaveBeenLastCalledWith('/geoscan/flight/arm', {}, { type: 'std_srvs/srv/Trigger' });
    });

    test('param get / set / dump', async () => {
        const t = setup();
        await t.exec('ros2 param get /ros_pioneer_node board_name');
        expect(t.text()).toBe('String value is: Pioneer Mini 2');
        t.out.length = 0;
        await t.exec('ros2 param get ros_pioneer_node cargo');
        expect(t.text()).toBe('Boolean value is: False');
        t.out.length = 0;
        await t.exec('ros2 param set /ros_pioneer_node cargo true');
        expect(t.api.paramSet).toHaveBeenLastCalledWith('/ros_pioneer_node', 'cargo', true);
        expect(t.text()).toBe('Set parameter successful');
        t.out.length = 0;
        await t.exec('ros2 param set /ros_pioneer_node topics.gnss true');
        expect(t.out[0]).toMatchObject({ kind: 'error', text: expect.stringContaining('Setting parameter failed') });
        expect(t.out[1].text).toContain('ros2 run gs_core ros_pioneer_node --ros-args -p topics.gnss:=true');
        t.out.length = 0;
        await t.exec('ros2 param dump /ros_pioneer_node');
        expect(t.text()).toBe(['/ros_pioneer_node:', '  ros__parameters:', '    board_name: Pioneer Mini 2', '    cargo: false', '    topics:', '      gnss: false'].join('\n'));
    });

    test('встроенные команды: help, clear, history, source, exit', async () => {
        const t = setup();
        await t.exec('help');
        expect(t.text()).toContain('ros2 service call');
        await t.exec('clear');
        expect(t.cleared).toHaveBeenCalled();
        t.out.length = 0;
        await t.exec('history');
        expect(t.text()).toBe('   1  ros2 node list');
        t.out.length = 0;
        await t.exec('source /opt/ros/jazzy/setup.bash');
        await t.exec('ros2 action list');
        expect(t.out).toEqual([]);
        await t.exec('ros2 --help');
        expect(t.text()).toContain('service');
        await t.exec('ros2 pkg executables gs_core');
        expect(t.out[t.out.length - 1].text).toBe('gs_core ros_pioneer_node');
        await t.exec('ros2 interface list -s');
        expect(t.out[t.out.length - 1].text).toContain('gs_interfaces/srv/Arm');
        expect(t.out[t.out.length - 1].text).not.toContain('Messages:');
    });
});

describe('executeLine: ошибки с подсказками', () => {
    test('ошибки реестра печатаются красным, под ними подсказка', async () => {
        const t = setup();
        await t.exec('ros2 topic info /nope');
        expect(t.out[0]).toEqual({ text: 'Топик не найден: /nope', kind: 'error' });
        expect(t.out[1].text).toContain('ros2 topic list -t');
        t.out.length = 0;
        await t.exec('ros2 service call /geoscan/nothing std_srvs/srv/Trigger');
        expect(t.out[0].kind).toBe('error');
        expect(t.out[1].text).toContain('ros2 service list');
        t.out.length = 0;
        await t.exec('ros2 service call /geoscan/flight/arm gs_interfaces/srv/Arm "{nope: 1}"');
        expect(t.out[1].text).toContain('ros2 interface show gs_interfaces/srv/Arm');
        t.out.length = 0;
        await t.exec('ros2 param get /ros_pioneer_node zzz');
        expect(t.out[1].text).toContain('ros2 param list');
    });

    test('ошибки YAML и типов до обращения к реестру', async () => {
        const t = setup();
        await t.exec('ros2 service call /geoscan/flight/arm gs_interfaces/srv/Arm "{timeout:5}"');
        expect(t.out[0].text).toContain('после двоеточия нужен пробел');
        expect(t.api.serviceCall).not.toHaveBeenCalled();
        t.out.length = 0;
        await t.exec('ros2 service call /a nope/srv/Nothing "{}"');
        expect(t.out[0].text).toBe('The passed service type is invalid');
        t.out.length = 0;
        await t.exec('ros2 topic pub --once /a std_msgs/srv/Trigger "{}"');
        expect(t.out[0].text).toBe('The passed message type is invalid');
        t.out.length = 0;
        await t.exec('ros2 interface show nope/msg/Nothing');
        expect(t.out[0].text).toContain("Не найден интерфейс 'nope/msg/Nothing'");
        expect(t.out[1].text).toContain('ros2 interface list');
    });

    test('узел остановлен Ctrl+C: списки пусты, вызов подсказывает ros2 launch', async () => {
        const t = setup();
        t.setRunning(false);
        t.ctx.state.stopped = true;
        await t.exec('ros2 service list');
        expect(t.api.launch).not.toHaveBeenCalled();
        t.api.serviceCall.mockRejectedValueOnce(new Ros2Error('Сервис /geoscan/flight/arm недоступен'));
        await t.exec('ros2 service call /geoscan/flight/arm gs_interfaces/srv/Arm "{}"');
        expect(t.out[t.out.length - 1].text).toContain('ros2 launch gs_core pioneer_mini2_full_launch.py');
    });

    test('без остановки узел запускается при первой команде (как будто launch уже работает)', async () => {
        const t = setup();
        t.setRunning(false);
        await t.exec('ros2 node list');
        expect(t.api.launch).toHaveBeenCalledWith({ restart: false });
    });
});

describe('executeLine: потоки', () => {
    test('topic echo --once, -n N и --field', async () => {
        const t = setup();
        await t.exec('ros2 topic echo /geoscan/flight/fly_state --once');
        expect(t.text()).toBe('data: 0\n---');
        expect(t.api.topicEcho).toHaveBeenLastCalledWith('/geoscan/flight/fly_state', { count: 1, timeoutSec: 2, type: undefined });
        t.out.length = 0;
        await t.exec('ros2 topic echo /geoscan/flight/fly_state -n 2');
        expect(t.text()).toBe('data: 0\n---\ndata: 1\n---');
        t.out.length = 0;
        await t.exec('ros2 topic echo /geoscan/flight/fly_state --once --field data');
        expect(t.text()).toBe('0\n---');
        t.out.length = 0;
        await t.exec('ros2 topic echo /geoscan/flight/fly_state --once --field no.such');
        expect(t.out[0].kind).toBe('error');
    });

    test('topic echo без --once печатает поток, пока не нажмут Ctrl+C', async () => {
        const t = setup();
        const controller = new AbortController();
        const parsed = parseCommandLine('ros2 topic echo /geoscan/flight/fly_state');
        expect(isLongRunning(parsed)).toBe(true);
        let rounds = 0;
        t.api.topicEcho.mockImplementation(async () => {
            rounds += 1;
            if (rounds === 3) controller.abort();
            return [{ msg: { data: rounds }, yaml: `data: ${rounds}` }];
        });
        const finished = await executeLine(parsed, t.ctx, controller.signal);
        expect(finished).toBe(false);
        expect(t.out.map((item) => item.text)).toContain('data: 1\n---');
        expect(t.out.length).toBeGreaterThanOrEqual(2);
    });

    test('молчащий топик: через 3 с симуляции печатается подсказка', async () => {
        const t = setup();
        const controller = new AbortController();
        let rounds = 0;
        t.api.topicEcho.mockImplementation(async () => {
            rounds += 1;
            if (rounds > 3) controller.abort();
            return [];
        });
        await executeLine(parseCommandLine('ros2 topic echo /geoscan/flight/fly_state --once'), t.ctx, controller.signal);
        expect(t.out.filter((item) => item.kind === 'muted')).toHaveLength(1);
        expect(t.out[0].text).toContain('сообщений пока нет');
    });

    test('topic pub: --once, -t N, -r с остановкой', async () => {
        const t = setup();
        await t.exec(`ros2 topic pub --once /geoscan/flight/fly_state std_msgs/msg/Int8 "{data: 1}"`);
        expect(t.text()).toBe('publisher: beginning loop\npublishing #1: std_msgs.msg.Int8(data=1)\n');
        expect(t.api.topicPub).toHaveBeenCalledWith('/geoscan/flight/fly_state', { data: 1 }, { type: 'std_msgs/msg/Int8', once: true });
        t.out.length = 0;
        const start = t.clock.time;
        await t.exec(`ros2 topic pub -t 3 -r 2 /geoscan/flight/fly_state std_msgs/msg/Int8 "{data: 1}"`);
        expect(t.out.filter((item) => item.text.startsWith('publishing #'))).toHaveLength(3);
        expect(t.clock.time - start).toBeCloseTo(1, 5);
        // -r без -t: идёт, пока не остановят
        t.out.length = 0;
        const controller = new AbortController();
        const parsed = parseCommandLine(`ros2 topic pub -r 10 /a std_msgs/msg/Int8 "{data: 1}"`);
        expect(isLongRunning(parsed)).toBe(true);
        t.api.topicPub.mockImplementation(async () => {
            if (t.out.length >= 4) controller.abort();
            return { published: 1, type: 'std_msgs/msg/Int8', repr: 'R' };
        });
        await executeLine(parsed, t.ctx, controller.signal);
        expect(t.out.filter((item) => item.text.startsWith('publishing #')).length).toBeGreaterThanOrEqual(3);
        expect(isLongRunning(parseCommandLine('ros2 topic pub --once /a std_msgs/msg/Int8 "{}"'))).toBe(false);
        expect(isLongRunning(parseCommandLine('ros2 service list'))).toBe(false);
    });

    test('service call -r повторяется по симуляторному времени', async () => {
        const t = setup();
        const controller = new AbortController();
        let calls = 0;
        t.api.serviceCall.mockImplementation(async () => {
            calls += 1;
            if (calls === 3) controller.abort();
            return { type: 'x', request: 'Q', response: {}, response_repr: 'R', yaml: '' };
        });
        await executeLine(parseCommandLine('ros2 service call -r 2 /geoscan/flight/arm gs_interfaces/srv/Arm "{}"'), t.ctx, controller.signal);
        expect(calls).toBe(3);
    });

    test('launch: печатает как ros2 launch, работает до Ctrl+C, затем останавливает узел, который запустил сам', async () => {
        const t = setup();
        t.setRunning(false);
        const controller = new AbortController();
        const done = executeLine(parseCommandLine('ros2 launch gs_core pioneer_mini2_full_launch.py'), t.ctx, controller.signal);
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(t.api.launch).toHaveBeenCalledWith({ config: 'mini2', parameters: {}, restart: true });
        expect(t.text()).toContain('[INFO] [ros_pioneer_node-1]: process started with pid [2101]');
        expect(t.text()).toContain('[INFO] [camera_servo-3]: process started with pid');
        controller.abort();
        await done;
        expect(t.text()).toContain('user interrupted with ctrl-c (SIGINT)');
        expect(t.text()).toContain('[INFO] [ros_pioneer_node-1]: process has finished cleanly [pid 2101]');
        expect(t.api.stopNode).toHaveBeenCalled();
        expect(t.ctx.state.stopped).toBe(true);
    });

    test('launch razero: без camera_servo; уже работающий узел не перезапускается и не останавливается', async () => {
        const t = setup({}, 'razero');
        t.api.launchStatus.mockResolvedValue({ running: true, config: 'razero' });
        const controller = new AbortController();
        const done = executeLine(parseCommandLine('ros2 launch gs_core pioneer_razero_full_launch.py'), t.ctx, controller.signal);
        await new Promise((resolve) => setTimeout(resolve, 20));
        controller.abort();
        await done;
        expect(t.text()).not.toContain('camera_servo');
        expect(t.text()).toContain('camera_node-2');
        expect(t.api.launch).not.toHaveBeenCalled();
        expect(t.api.stopNode).not.toHaveBeenCalled();
        expect(t.ctx.state.stopped).toBe(false);
    });

    test('run с параметрами: перезапуск с конфигом из файла и -p', async () => {
        const t = setup();
        const controller = new AbortController();
        const done = executeLine(parseCommandLine('ros2 run gs_core ros_pioneer_node --ros-args --params-file /home/pioneer/razero.yaml -p topics.gnss:=true'), t.ctx, controller.signal);
        await new Promise((resolve) => setTimeout(resolve, 20));
        controller.abort();
        await done;
        expect(t.api.launch).toHaveBeenCalledWith({ config: 'razero', parameters: { 'topics.gnss': true }, restart: true });
        expect(t.text()).toContain('связь с автопилотом');
        expect(t.text()).not.toContain('process started');
    });

    test('launch и run: понятные ошибки', async () => {
        const t = setup();
        await t.exec('ros2 launch nope f.py');
        expect(t.out[0].text).toContain("Package 'nope' not found");
        t.out.length = 0;
        await t.exec('ros2 launch gs_core nothing.py');
        expect(t.out[0].text).toContain("file 'nothing.py' was not found in the share directory of package 'gs_core'");
        expect(t.out[1].text).toContain('pioneer_mini2_full_launch.py');
        t.out.length = 0;
        await t.exec('ros2 run gs_core nothing');
        expect(t.out[0].text).toBe('No executable found');
        t.out.length = 0;
        await t.exec('ros2 run gs_core ros_pioneer_node --ros-args --params-file /tmp/custom.yaml');
        expect(t.out[0].text).toContain('Файл параметров не найден');
        expect(t.out[1].text).toContain('mini2.yaml');
        expect(t.api.launch).not.toHaveBeenCalled();
    });
});

describe('clock', () => {
    test('raceAbort отдаёт результат или прерывание', async () => {
        const controller = new AbortController();
        await expect(raceAbort(Promise.resolve(5), controller.signal)).resolves.toBe(5);
        const slow = new Promise<number>(() => undefined);
        const pending = raceAbort(slow, controller.signal);
        controller.abort();
        await expect(pending).rejects.toBeInstanceOf(AbortedError);
        await expect(raceAbort(Promise.resolve(1), controller.signal)).rejects.toBeInstanceOf(AbortedError);
    });

    test('часы по функции времени ждут симулируемые секунды и слушают отмену', async () => {
        let time = 0;
        const clock = createPollingClock(() => time, 1);
        const controller = new AbortController();
        const timer = setInterval(() => { time += 0.5; }, 2);
        await clock.sleep(1, controller.signal);
        expect(time).toBeGreaterThanOrEqual(1);
        const waiting = clock.sleep(1000, controller.signal);
        controller.abort();
        await expect(waiting).rejects.toBeInstanceOf(AbortedError);
        clearInterval(timer);
    });
});
