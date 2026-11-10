/**
 * TS-фасад реестра ROS 2 для консоли (public/modules/python/ros2/registry.ts) поверх настоящего Python-реестра:
 * постоянный процесс CPython с поддельным миром играет роль Pyodide. Консоль работает без программы ученика.
 */
import { Ros2Error, Ros2Registry } from '../public/modules/python/ros2/registry.js';
import { PythonRos2Host, withRos2Python, python } from './helpers/ros2-runtime.js';

const hosts: PythonRos2Host[] = [];
afterAll(() => hosts.forEach((host) => host.close()));

function open(model: 'pioneer-mini2' | 'pioneer-basic' = 'pioneer-mini2', autoLaunch = true) {
    const host = new PythonRos2Host({ model, speed: 10 });
    hosts.push(host);
    return { host, registry: new Ros2Registry(host, 'drone-1', { autoLaunch }) };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Ros2Registry', () => {
    withRos2Python('узел запускается при первом обращении (autoLaunch); конфиг по модели дрона', async () => {
        const { registry } = open('pioneer-mini2');
        expect(await registry.launchStatus()).toEqual({ running: false, config: null });
        const nodes = await registry.nodeList();
        expect(nodes).toEqual(['/ros_pioneer_node']);
        expect(await registry.launchStatus()).toEqual({ running: true, config: 'mini2' });

        const basic = open('pioneer-basic');
        await basic.registry.nodeList();
        expect(await basic.registry.launchStatus()).toEqual({ running: true, config: 'razero' });
    });

    withRos2Python('без autoLaunch реестр пуст, пока узел не запущен', async () => {
        const { registry } = open('pioneer-mini2', false);
        expect(await registry.nodeList()).toEqual([]);
        expect(await registry.serviceList()).toEqual([]);
        await registry.launch({ restart: false });
        expect((await registry.serviceList()).length).toBe(19);
    });

    withRos2Python('списки топиков и сервисов с типами, информация о топике и узле', async () => {
        const { registry } = open();
        const topics = await registry.topicList();
        const cmdVel = topics.find((t) => t.name === '/geoscan/flight/cmd_vel');
        expect(cmdVel).toEqual({ name: '/geoscan/flight/cmd_vel', types: ['geometry_msgs/msg/TwistStamped'], publishers: 0, subscribers: 1 });
        expect(topics.some((t) => t.name.includes('/navigation/global/'))).toBe(false);

        const services = await registry.serviceList();
        expect(services.find((s) => s.name === '/geoscan/payload/led/set')?.types).toEqual(['gs_interfaces/srv/Led']);
        expect(await registry.serviceType('/geoscan/flight/takeoff')).toBe('std_srvs/srv/Trigger');
        expect(await registry.topicType('/geoscan/sensors/imu')).toBe('sensor_msgs/msg/Imu');
        const info = await registry.topicInfo('/geoscan/flight/fly_state');
        expect(info.publishers).toEqual([{ node: '/ros_pioneer_node', type: 'std_msgs/msg/Int8' }]);
        const node = await registry.nodeInfo('/ros_pioneer_node');
        expect(node.service_servers).toHaveLength(19);
        await expect(registry.topicInfo('/nope')).rejects.toBeInstanceOf(Ros2Error);
    });

    withRos2Python('полётный цикл из документации вызовами сервисов, без программы ученика', async () => {
        const { host, registry } = open();
        const arm = await registry.serviceCall('/geoscan/flight/arm', { timeout: 5, retries: 0 }, { type: 'gs_interfaces/srv/Arm' });
        expect(arm.response).toEqual({ success: true });
        expect(arm.request).toBe('gs_interfaces.srv.Arm_Request(timeout=5.0, retries=0)');
        expect((await registry.serviceCall('/geoscan/flight/takeoff')).response).toEqual({ success: true, message: '' });
        for (let i = 0; i < 100 && (await host.world()).fsm !== 'FLYING_HOVER'; i += 1) await sleep(50);
        const go = await registry.serviceCall('/geoscan/flight/go_to_local_point', { x: 0.0, y: 1.0, z: 1.0, yaw: 0.0, time: 5, frame_id: 'map' });
        expect(go.response).toEqual({ success: true });
        for (let i = 0; i < 200 && (await host.world()).pos[1] < 0.99; i += 1) await sleep(50);
        expect((await host.world()).pos[1]).toBeCloseTo(1, 1);
        expect((await registry.serviceCall('/geoscan/flight/land')).response.success).toBe(true);
        for (let i = 0; i < 100 && (await host.world()).fsm !== 'IDLE'; i += 1) await sleep(50);
        expect((await registry.serviceCall('/geoscan/flight/disarm')).yaml).toBe("success: true\nmessage: ''");
        expect((await host.world()).fsm).toBe('IDLE');
    });

    withRos2Python('ошибки возвращаются как Ros2Error с понятным текстом', async () => {
        const { registry } = open();
        await expect(registry.serviceCall('/geoscan/flight/arm', {}, { type: 'std_srvs/srv/Trigger' })).rejects.toThrow('Тип сервиса');
        await expect(registry.serviceCall('/geoscan/nothing')).rejects.toThrow('недоступен');
        await expect(registry.serviceCall('/geoscan/flight/arm', { nope: 1 })).rejects.toThrow('Неизвестное поле');
        await expect(registry.topicPub('/geoscan/unknown', {})).rejects.toThrow('укажите тип');
    });

    withRos2Python('echo и pub: чтение altitude, команда в cmd_vel', async () => {
        const { host, registry } = open();
        await registry.serviceCall('/geoscan/flight/arm', { timeout: 5, retries: 0 });
        await registry.serviceCall('/geoscan/flight/takeoff');
        for (let i = 0; i < 100 && (await host.world()).fsm !== 'FLYING_HOVER'; i += 1) await sleep(50);
        const echo = await registry.topicEcho('/geoscan/sensors/altitude', { count: 2, timeoutSec: 5 });
        expect(echo).toHaveLength(2);
        expect(echo[0].yaml).toBe('data: 1.0');
        const pub = await registry.topicPub('/geoscan/flight/cmd_vel', {
            header: { frame_id: 'base_link' }, twist: { linear: { x: 0.5, y: 0, z: 0 }, angular: { z: 0 } }
        }, { type: 'geometry_msgs/msg/TwistStamped' });
        expect(pub).toEqual({ published: 1, type: 'geometry_msgs/msg/TwistStamped', repr: expect.stringContaining('geometry_msgs.msg.TwistStamped(') });
        expect((await host.world()).calls.filter((c) => c[0] === 'speed')).toHaveLength(1);
    });

    withRos2Python('param list/get/set и перезапуск с topics.gnss:=true', async () => {
        const { registry } = open();
        const list = await registry.paramList();
        expect(Object.keys(list)).toEqual(['/ros_pioneer_node']);
        expect(list['/ros_pioneer_node']).toContain('board_name');
        expect(await registry.paramGet('/ros_pioneer_node', 'board_name')).toEqual({ type: 'string', value: 'Pioneer Mini 2' });
        expect((await registry.paramSet('/ros_pioneer_node', 'topics.gnss', true)).successful).toBe(false);
        expect((await registry.paramSet('/ros_pioneer_node', 'cargo', true)).successful).toBe(true);
        // cargo включили на лету - магнитный захват отвечает (в поддельном мире Мини 2 магнита нет, но модуль уже не «выключен»).
        expect((await registry.serviceCall('/geoscan/payload/cargo_set', { data: true })).response.success).toBe(false);

        const launched = await registry.launch({ parameters: { 'topics.gnss': true } });
        expect(launched.config).toBe('mini2');
        expect(launched.parameters['topics.gnss']).toBe(true);
        const names = (await registry.topicList()).map((t) => t.name);
        expect(names).toContain('/geoscan/navigation/global/position');
        expect(names).toContain('/geoscan/navigation/satellites');
        // Перезапуск вернул таблицу конфига: cargo снова выключен.
        expect((await registry.paramGet('/ros_pioneer_node', 'cargo')).value).toBe(false);
        await expect(registry.launch({ parameters: { 'topics.nothing': true } })).rejects.toThrow('Неизвестный параметр');
        await registry.stopNode();
        expect((await registry.launchStatus()).running).toBe(false);
    });

    withRos2Python('журнал ROS: отказы пишутся в logTail', async () => {
        const { registry } = open();
        await registry.serviceCall('/geoscan/flight/takeoff');
        const tail = await registry.logTail(5);
        expect(tail.some(([level, , text]) => level === 'ERROR' && text.includes('Взлёт отклонён'))).toBe(true);
    });

    test('интерфейсы: список и show не требуют Python', () => {
        expect(Ros2Registry.interfaceShow('gs_interfaces/srv/Arm')).toBe('float32 timeout\nint32 retries\n---\nbool success');
        expect(Ros2Registry.interfaceKind('std_msgs/msg/Int8')).toBe('msg');
        expect(Ros2Registry.interfaceKind('gs_interfaces/srv/Arm')).toBe('srv');
        expect(Ros2Registry.interfaceKind('nope/msg/X')).toBeNull();
        expect(Ros2Registry.normalizeInterfaceName('/std_msgs/Int8')).toBe('std_msgs/msg/Int8');
        const all = Ros2Registry.interfaceList();
        expect(all.srvs).toContain('gs_interfaces/srv/GoToLocalPoint');
        expect(all.msgs).toContain('gs_interfaces/msg/RcChannels');
        expect(Ros2Registry.launchFile('razero')).toBe('pioneer_razero_full_launch.py');
        expect(python === null || typeof python === 'string').toBe(true);
    });
});
