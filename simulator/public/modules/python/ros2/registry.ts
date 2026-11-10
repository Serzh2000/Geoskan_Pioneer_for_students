import {
    interfaceKind, interfaceList, interfaceShow, normalizeInterfaceName, ROS2_LAUNCH_FILES,
    type Ros2ConfigName, type Ros2ParamValue
} from './interfaces.js';

/*
 * Фасад над реестром ROS 2, который живёт в Python (модуль _ros2_registry, ros2/prelude-node.ts).
 * Для консоли `ros2`: списки топиков, сервисов, узлов и параметров с типами, `interface show`,
 * вызов сервиса, echo и pub топика - снаружи от программы ученика и без неё.
 *
 * Жизнь ros_pioneer_node: пока дрон есть в симуляторе и ему выбран язык «Python · SDK2» (Мини 2 или Базовый
 * с Radxa), узел запускается этим фасадом при первом обращении (autoLaunch, по умолчанию включён) или
 * программой ученика при rclpy.init() - как `ros2 launch gs_core pioneer_<борт>_full_launch.py`, который
 * уже работает, когда человек садится за терминал. Узел переживает программу ученика; перезапуск -
 * launch({ restart: true, parameters: { 'topics.gnss': true } }) (аналог `-p topics.gnss:=true`).
 *
 * Хост - то, что умеет вызвать Python: в браузере его делает browser-host.ts поверх Pyodide, в тестах -
 * постоянный процесс CPython (tests/helpers/ros2-runtime.ts). Время в таймаутах - симулируемые секунды.
 */
export interface Ros2Reply<T = unknown> {
    ok: boolean;
    result?: T;
    error?: string;
}

export interface Ros2Host {
    /** Вызывает функцию реестра (_REGISTRY в prelude-node.ts); args уже содержит drone. */
    call(fn: string, args: Record<string, unknown>): Promise<Ros2Reply>;
}

export class Ros2Error extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'Ros2Error';
    }
}

export interface Ros2TopicRow { name: string; types: string[]; publishers: number; subscribers: number }
export interface Ros2TopicInfo {
    name: string; type: string; types: string[];
    publishers: Array<{ node: string; type: string }>;
    subscribers: Array<{ node: string; type: string }>;
}
export interface Ros2ServiceRow { name: string; types: string[] }
export interface Ros2NodeInfo {
    name: string;
    publishers: Array<{ topic: string; type: string }>;
    subscribers: Array<{ topic: string; type: string }>;
    service_servers: Array<{ name: string; type: string }>;
    service_clients: Array<{ name: string; type: string }>;
}
export interface Ros2ServiceCallResult {
    type: string;
    /** Текст запроса как в `ros2 service call`: gs_interfaces.srv.Arm_Request(timeout=5.0, retries=0). */
    request: string;
    /** Ответ словарём; inf и nan приходят строками 'inf', '-inf', 'nan'. */
    response: Record<string, unknown>;
    response_repr: string;
    yaml: string;
}
export interface Ros2EchoItem { msg: Record<string, unknown>; yaml: string }
export interface Ros2LaunchInfo { config: Ros2ConfigName; parameters: Record<string, Ros2ParamValue> }

export interface Ros2RegistryOptions {
    /** Запускать ros_pioneer_node при первом обращении, если он ещё не работает. */
    autoLaunch?: boolean;
}

export class Ros2Registry {
    private readonly autoLaunch: boolean;

    constructor(private readonly host: Ros2Host, private readonly droneId: string, options: Ros2RegistryOptions = {}) {
        this.autoLaunch = options.autoLaunch ?? true;
    }

    private async invoke<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
        const reply = await this.host.call(fn, { drone: this.droneId, ...args });
        if (!reply.ok) throw new Ros2Error(reply.error ?? 'Ошибка реестра ROS 2');
        return reply.result as T;
    }

    private async running<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
        if (this.autoLaunch) {
            const status = await this.invoke<{ running: boolean }>('launch_status');
            if (!status.running) await this.invoke('launch', { restart: false });
        }
        return this.invoke<T>(fn, args);
    }

    // ---- ros_pioneer_node
    /** Запускает (или перезапускает) ros_pioneer_node. config по умолчанию - по модели дрона. */
    launch(options: { config?: Ros2ConfigName; parameters?: Record<string, Ros2ParamValue>; restart?: boolean } = {}): Promise<Ros2LaunchInfo> {
        return this.invoke('launch', { config: options.config ?? null, parameters: options.parameters ?? null, restart: options.restart ?? true });
    }

    launchStatus(): Promise<{ running: boolean; config: Ros2ConfigName | null }> {
        return this.invoke('launch_status');
    }

    stopNode(): Promise<boolean> {
        return this.invoke('stop');
    }

    /** Имя launch-файла для конфига: pioneer_mini2_full_launch.py и т. п. */
    static launchFile(config: Ros2ConfigName): string {
        return ROS2_LAUNCH_FILES[config];
    }

    // ---- ros2 node / topic / service / param
    nodeList(): Promise<string[]> {
        return this.running('node_list');
    }

    nodeInfo(name: string): Promise<Ros2NodeInfo> {
        return this.running('node_info', { node: name });
    }

    topicList(): Promise<Ros2TopicRow[]> {
        return this.running('topic_list');
    }

    topicInfo(name: string): Promise<Ros2TopicInfo> {
        return this.running('topic_info', { name });
    }

    async topicType(name: string): Promise<string> {
        return (await this.topicInfo(name)).type;
    }

    /** ros2 topic echo: ждёт count сообщений не дольше timeoutSec симулируемых секунд. */
    topicEcho(name: string, options: { count?: number; timeoutSec?: number; type?: string } = {}): Promise<Ros2EchoItem[]> {
        return this.running('topic_echo', { name, count: options.count ?? 1, timeout_sec: options.timeoutSec ?? 5, type: options.type ?? null });
    }

    /** ros2 topic pub: msg - словарь полей; once - одно сообщение, иначе times штук с частотой rate Гц. */
    topicPub(name: string, msg: Record<string, unknown>, options: { type?: string; once?: boolean; times?: number; rate?: number } = {}): Promise<{ published: number; type: string; repr: string }> {
        return this.running('topic_pub', { name, msg, type: options.type ?? null, once: options.once ?? true, times: options.times ?? 1, rate: options.rate ?? 1 });
    }

    serviceList(): Promise<Ros2ServiceRow[]> {
        return this.running('service_list');
    }

    serviceType(name: string): Promise<string> {
        return this.running('service_type', { name });
    }

    /** ros2 service call: request - словарь полей запроса (числа приводятся к типу поля). */
    serviceCall(name: string, request: Record<string, unknown> = {}, options: { type?: string; timeoutSec?: number } = {}): Promise<Ros2ServiceCallResult> {
        return this.running('service_call', { name, request, type: options.type ?? null, timeout_sec: options.timeoutSec ?? 10 });
    }

    /** ros2 param list: { '/ros_pioneer_node': ['board_name', ...] }. */
    paramList(node?: string): Promise<Record<string, string[]>> {
        return this.running('param_list', { node: node ?? null });
    }

    paramGet(node: string, name: string): Promise<{ type: string; value: unknown }> {
        return this.running('param_get', { node, name });
    }

    paramSet(node: string, name: string, value: unknown): Promise<{ successful: boolean; reason: string }> {
        return this.running('param_set', { node, name, value });
    }

    /** Последние строки журнала ROS (то, что печатают get_logger().info и т. п.). */
    logTail(count = 50): Promise<Array<[string, string, string]>> {
        return this.invoke('log_tail', { count });
    }

    // ---- ros2 interface (без Python: описания лежат в interfaces.ts)
    static interfaceList = interfaceList;
    static interfaceShow = interfaceShow;
    static interfaceKind = interfaceKind;
    static normalizeInterfaceName = normalizeInterfaceName;
}
