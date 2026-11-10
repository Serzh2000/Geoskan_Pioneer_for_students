/**
 * Вкладка «ROS 2» нижней панели: DOM-тесты на поддельном реестре и полётный цикл из документации
 * через консоль на настоящем Python (постоянный процесс с поддельным миром, как у ros2-registry.test.ts).
 */
import { afterAll, afterEach, describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
// @ts-expect-error The project's DOM tests use jsdom without @types/jsdom.
import { JSDOM } from 'jsdom';
import { createPollingClock } from '../public/modules/python/ros2/console/clock.js';
import type { ConsoleApi } from '../public/modules/python/ros2/console/executor.js';
import { Ros2Registry } from '../public/modules/python/ros2/registry.js';
import { FLIGHT_CYCLE_QUEUE, FLIGHT_CYCLE_TEXT, initRos2Console, type Ros2ConsoleDeps } from '../public/modules/ui/panels/ros2-console.js';
import { PythonRos2Host, withRos2Python } from './helpers/ros2-runtime.js';

const globalNames = ['document', 'window', 'HTMLElement', 'Event', 'KeyboardEvent', 'navigator'];
const originals = new Map(globalNames.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
afterEach(() => originals.forEach((value, name) => {
    if (value) Object.defineProperty(globalThis, name, value);
    else Reflect.deleteProperty(globalThis, name);
}));

const hosts: PythonRos2Host[] = [];
afterAll(() => hosts.forEach((host) => host.close()));

const markup = readFileSync(new URL('../public/fragments/panels/editor-terminal.html', import.meta.url), 'utf8');

function mount(deps: Ros2ConsoleDeps, onAvailability: (available: boolean) => void = () => undefined) {
    const dom = new JSDOM(`<!doctype html><body>${markup}</body>`);
    for (const name of globalNames) Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
    const page = dom.window.document as Document;
    const panel = page.getElementById('editor-terminal')!;
    const handle = initRos2Console(panel, onAvailability, deps)!;
    const input = page.getElementById('terminal-ros2-input') as HTMLInputElement;
    const stream = page.getElementById('terminal-ros2-stream')!;
    const intro = page.getElementById('terminal-ros2-intro')!;
    const key = (init: KeyboardEventInit & { key: string }) => {
        const event = new dom.window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
        input.dispatchEvent(event);
        return event;
    };
    const submit = () => page.getElementById('terminal-ros2-form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    const type = async (text: string) => {
        input.value = text;
        submit();
        await handle.idle();
    };
    const until = async (check: () => boolean, ms = 3000) => {
        const end = Date.now() + ms;
        while (!check() && Date.now() < end) await new Promise((resolve) => setTimeout(resolve, 5));
        if (!check()) throw new Error(`не дождались; вывод:\n${stream.textContent}`);
    };
    return { dom, page, panel, handle, input, stream, intro, key, submit, type, until, text: () => stream.textContent ?? '' };
}

function fakeDeps(api: Partial<Record<keyof ConsoleApi, unknown>> = {}, patch: Partial<Ros2ConsoleDeps> = {}): Ros2ConsoleDeps {
    const full = {
        launchStatus: jest.fn(async () => ({ running: true, config: 'mini2' })),
        launch: jest.fn(async () => ({ config: 'mini2', parameters: {} })),
        stopNode: jest.fn(async () => true),
        logTail: jest.fn(async () => []),
        nodeList: jest.fn(async () => ['/ros_pioneer_node']),
        topicList: jest.fn(async () => [{ name: '/geoscan/flight/fly_state', types: ['std_msgs/msg/Int8'], publishers: 1, subscribers: 0 }]),
        serviceList: jest.fn(async () => [{ name: '/geoscan/flight/arm', types: ['gs_interfaces/srv/Arm'] }, { name: '/geoscan/flight/land', types: ['std_srvs/srv/Trigger'] }]),
        paramList: jest.fn(async () => ({ '/ros_pioneer_node': ['board_name'] })),
        topicEcho: jest.fn(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); return [{ msg: { data: 1 }, yaml: 'data: 1' }]; }),
        ...api
    } as unknown as ConsoleApi;
    return {
        droneId: () => 'drone-1', droneName: () => 'Дрон 1', isAvailable: () => true, config: () => 'mini2',
        api: () => full, clock: () => createPollingClock(() => performance.now() / 1000, 2), isWarm: () => true, fsmState: () => undefined,
        ...patch
    };
}

describe('вкладка ROS 2: ввод и вывод', () => {
    test('команда, вывод, приглашение, история и очистка', async () => {
        const deps = fakeDeps();
        const ui = mount(deps);
        expect(ui.page.getElementById('terminal-ros2-prompt')!.textContent).toBe('pioneer@mini2:~$');
        expect(ui.intro.hidden).toBe(false);
        await ui.type('ros2 service list');
        expect(ui.intro.hidden).toBe(true);
        expect(ui.text()).toContain('pioneer@mini2:~$ ros2 service list');
        expect(ui.text()).toContain('/geoscan/flight/arm');
        expect(ui.text()).toContain('/geoscan/flight/land');
        await ui.type('ros2 foo');
        expect(ui.text()).toContain("неизвестная команда 'foo'");
        expect(ui.stream.querySelector('.terminal-console-line--error')).not.toBeNull();
        // история: ↑ достаёт последние команды, ↓ возвращает черновик
        ui.input.value = 'ros2 nod';
        ui.key({ key: 'ArrowUp' });
        expect(ui.input.value).toBe('ros2 foo');
        ui.key({ key: 'ArrowUp' });
        expect(ui.input.value).toBe('ros2 service list');
        ui.key({ key: 'ArrowDown' });
        ui.key({ key: 'ArrowDown' });
        expect(ui.input.value).toBe('ros2 nod');
        // Ctrl+L и clear возвращают пустое состояние
        ui.key({ key: 'l', code: 'KeyL', ctrlKey: true });
        expect(ui.stream.childElementCount).toBe(0);
        expect(ui.intro.hidden).toBe(false);
        await ui.type('help');
        expect(ui.text()).toContain('Команды консоли');
        await ui.type('clear');
        expect(ui.stream.childElementCount).toBe(0);
    });

    test('продолжение строки через \\ и вставка нескольких строк', async () => {
        const ui = mount(fakeDeps());
        await ui.type('ros2 service \\');
        expect(ui.page.getElementById('terminal-ros2-prompt')!.textContent).toBe('>');
        await ui.type('  list');
        expect(ui.page.getElementById('terminal-ros2-prompt')!.textContent).toBe('pioneer@mini2:~$');
        expect(ui.text()).toContain('> ');
        expect(ui.text()).toContain('/geoscan/flight/arm');

        const paste = new ui.dom.window.Event('paste', { bubbles: true, cancelable: true }) as Event & { clipboardData?: unknown };
        paste.clipboardData = { getData: () => 'ros2 node list\nros2 service list\n' };
        ui.input.dispatchEvent(paste);
        await ui.handle.idle();
        expect(paste.defaultPrevented).toBe(true);
        expect(ui.text().match(/\/ros_pioneer_node/gu)?.length).toBe(1);
        expect(ui.text().match(/\/geoscan\/flight\/land/gu)?.length).toBe(2);
    });

    test('Ctrl+C останавливает echo; во время потока поток не озвучивается', async () => {
        const ui = mount(fakeDeps());
        ui.input.value = 'ros2 topic echo /geoscan/flight/fly_state';
        ui.submit();
        await ui.until(() => ui.text().includes('data: 1'));
        expect(ui.stream.getAttribute('aria-live')).toBe('off');
        expect(ui.input.readOnly).toBe(true);
        expect((ui.page.getElementById('terminal-ros2-stop') as HTMLElement).hidden).toBe(false);
        ui.key({ key: 'c', code: 'KeyC', ctrlKey: true });
        await ui.handle.idle();
        expect(ui.text()).toContain('^C');
        expect(ui.input.readOnly).toBe(false);
        expect((ui.page.getElementById('terminal-ros2-stop') as HTMLElement).hidden).toBe(true);
        await new Promise((resolve) => setTimeout(resolve, 5));
        expect(ui.stream.getAttribute('aria-live')).toBe('polite');
        // кнопка Ctrl+C для касаний делает то же
        ui.input.value = 'ros2 topic echo /geoscan/flight/fly_state';
        ui.submit();
        await ui.until(() => ui.input.readOnly);
        (ui.page.getElementById('terminal-ros2-stop') as HTMLButtonElement).click();
        await ui.handle.idle();
        expect(ui.input.readOnly).toBe(false);
    });

    test('Ctrl+C на непустой строке сбрасывает её, как в bash', async () => {
        const ui = mount(fakeDeps());
        ui.input.value = 'ros2 serv';
        ui.key({ key: 'c', code: 'KeyC', ctrlKey: true });
        expect(ui.input.value).toBe('');
        expect(ui.text()).toContain('ros2 serv^C');
    });

    test('Tab дополняет по именам из реестра и не запирает фокус', async () => {
        const ui = mount(fakeDeps());
        ui.input.value = 'ros2 se';
        const first = ui.key({ key: 'Tab' });
        expect(first.defaultPrevented).toBe(true);
        await ui.until(() => ui.input.value === 'ros2 service ');
        ui.input.value = 'ros2 service call /geoscan/flight/ar';
        ui.key({ key: 'Tab' });
        await ui.until(() => ui.input.value === 'ros2 service call /geoscan/flight/arm ');
        // неоднозначно: вариантов два, печатаются списком
        ui.input.value = 'ros2 service call /geoscan/flight/';
        ui.key({ key: 'Tab' });
        await ui.until(() => ui.text().includes('/geoscan/flight/arm  /geoscan/flight/land'));
        // ничего не нашлось: первый Tab молча ничего не делает, второй уходит дальше по странице
        ui.input.value = 'ros2 zzz';
        expect(ui.key({ key: 'Tab' }).defaultPrevented).toBe(true);
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(ui.key({ key: 'Tab' }).defaultPrevented).toBe(false);
        // пустая строка: Tab всегда уходит дальше
        ui.input.value = '';
        expect(ui.key({ key: 'Tab' }).defaultPrevented).toBe(false);
    });

    test('пустое состояние: справка, примеры, копирование и выполнение по кнопке', async () => {
        const written: string[] = [];
        const ui = mount(fakeDeps());
        Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async (text: string) => { written.push(text); } } } });
        expect(ui.intro.textContent).toContain('Консоль ROS 2');
        expect(ui.intro.textContent).toContain('ros2 service list');
        expect(ui.intro.textContent).toContain('Ctrl+C');
        const buttons = [...ui.intro.querySelectorAll<HTMLButtonElement>('button')];
        expect(buttons.length).toBeGreaterThanOrEqual(8);
        expect(buttons.every((button) => button.getAttribute('aria-label'))).toBe(true);
        buttons.find((button) => button.getAttribute('aria-label') === 'Копировать: Сервисы дрона')!.click();
        await new Promise((resolve) => setTimeout(resolve, 5));
        expect(written).toEqual(['ros2 service list']);
        expect(ui.page.getElementById('terminal-ros2-status')!.textContent).toBe('');
        buttons.find((button) => button.getAttribute('aria-label') === 'Выполнить: Сервисы дрона')!.click();
        await ui.handle.idle();
        expect(ui.text()).toContain('/geoscan/flight/arm');
        expect(ui.intro.hidden).toBe(true);
        expect(FLIGHT_CYCLE_TEXT.split('\n')).toHaveLength(5);
        expect(FLIGHT_CYCLE_QUEUE.filter((item) => typeof item === 'string')).toHaveLength(5);
    });

    test('вкладка доступна только в режиме SDK2; смена дрона прерывает команду', async () => {
        let available = true;
        let drone = 'drone-1';
        const seen: boolean[] = [];
        const ui = mount(fakeDeps({}, { isAvailable: () => available, droneId: () => drone, droneName: () => drone }), (value) => seen.push(value));
        expect(seen).toEqual([true]);
        await ui.type('ros2 node list');
        ui.input.value = 'ros2 topic echo /geoscan/flight/fly_state';
        ui.submit();
        await ui.until(() => ui.input.readOnly);
        drone = 'drone-2';
        ui.handle.sync();
        await ui.handle.idle();
        expect(ui.text()).toContain('^C');
        expect(ui.text()).toContain('— дрон: drone-2 —');
        available = false;
        ui.handle.sync();
        expect(seen).toEqual([true, false]);
        await ui.type('ros2 node list');
        expect(ui.text()).toContain('Python · SDK2');
        const pane = ui.page.getElementById('terminal-ros2-pane')!;
        expect(pane.getAttribute('role')).toBe('tabpanel');
        expect(ui.page.getElementById('terminal-tab-ros2')!.getAttribute('aria-controls')).toBe('terminal-ros2-pane');
    });

    test('панель без вкладки ROS 2 в разметке не ломает инициализацию', () => {
        const dom = new JSDOM('<!doctype html><body><aside id="editor-terminal"></aside></body>');
        Object.defineProperty(globalThis, 'document', { configurable: true, value: dom.window.document });
        expect(initRos2Console(dom.window.document.getElementById('editor-terminal') as HTMLElement, () => undefined, fakeDeps())).toBeNull();
    });
});

describe('полётный цикл из документации через консоль (настоящий Python)', () => {
    withRos2Python('arm, takeoff, go_to_local_point, land, disarm: ответы и состояние дрона', async () => {
        const host = new PythonRos2Host({ model: 'pioneer-mini2', speed: 10 });
        hosts.push(host);
        const registry = new Ros2Registry(host, 'drone-1', { autoLaunch: false });
        const deps: Ros2ConsoleDeps = {
            droneId: () => 'drone-1', droneName: () => 'Дрон 1', isAvailable: () => true, config: () => 'mini2', api: () => registry,
            clock: () => createPollingClock(() => performance.now() / 100, 5), isWarm: () => true,
            fsmState: async () => (await host.world()).fsm
        };
        const ui = mount(deps);

        // Узел уже «запущен»: список сервисов виден сразу, без ros2 launch.
        await ui.type('ros2 service list');
        expect(ui.text()).toContain('/geoscan/flight/arm');
        expect(ui.text()).toContain('/geoscan/payload/led/set');
        await ui.type('ros2 service type /geoscan/flight/arm');
        expect(ui.text()).toContain('gs_interfaces/srv/Arm');
        await ui.type('ros2 interface show gs_interfaces/srv/GoToLocalPoint');
        expect(ui.text()).toContain('string frame_id');
        await ui.type('ros2 param list');
        expect(ui.text()).toContain('board_name');
        await ui.type('ros2 topic list -t');
        expect(ui.text()).toContain('/geoscan/sensors/battery_state [sensor_msgs/msg/BatteryState]');
        await ui.type('ros2 topic echo /geoscan/sensors/battery_state --once');
        expect(ui.text()).toMatch(/voltage: [\d.]+\n/u);
        expect(ui.text()).toContain('---');
        await ui.type('ros2 topic info /geoscan/flight/fly_state');
        expect(ui.text()).toContain('Publisher count: 1');

        ui.handle.enqueue(FLIGHT_CYCLE_QUEUE);
        await ui.handle.idle();
        const text = ui.text();
        expect(text).toContain('requester: making request: gs_interfaces.srv.Arm_Request(timeout=5.0, retries=0)');
        expect(text.match(/gs_interfaces\.srv\.Arm_Response\(success=True\)/gu)).toHaveLength(1);
        expect(text.match(/std_srvs\.srv\.Trigger_Response\(success=True, message=''\)/gu)).toHaveLength(3);
        expect(text).toContain('gs_interfaces.srv.GoToLocalPoint_Response(success=True)');
        expect(text).not.toContain('success=False');

        const world = await host.world();
        expect(world.fsm).toBe('IDLE');
        expect(world.calls.map((call) => call[0])).toEqual(expect.arrayContaining(['arm', 'takeoff', 'go_to', 'land', 'disarm']));
        const order = world.calls.map((call) => call[0]).filter((name) => ['arm', 'takeoff', 'go_to', 'land', 'disarm'].includes(name as string));
        expect(order).toEqual(['arm', 'takeoff', 'go_to', 'land', 'disarm']);
        const goTo = world.calls.find((call) => call[0] === 'go_to')![1] as number[];
        expect(goTo.slice(0, 3)).toEqual([0, 0, 1]);
    }, 120_000);

    withRos2Python('topic pub -r и Ctrl+C: cmd_vel уходит дрону, остановка прекращает публикацию; launch -p перезапускает узел', async () => {
        const host = new PythonRos2Host({ model: 'pioneer-mini2', speed: 10 });
        hosts.push(host);
        const registry = new Ros2Registry(host, 'drone-1', { autoLaunch: false });
        const deps: Ros2ConsoleDeps = {
            droneId: () => 'drone-1', droneName: () => 'Дрон 1', isAvailable: () => true, config: () => 'mini2', api: () => registry,
            clock: () => createPollingClock(() => performance.now() / 100, 5), isWarm: () => true, fsmState: async () => (await host.world()).fsm
        };
        const ui = mount(deps);
        await ui.type('ros2 service call /geoscan/flight/arm gs_interfaces/srv/Arm "{timeout: 5, retries: 0}"');
        await ui.type('ros2 service call /geoscan/flight/takeoff std_srvs/srv/Trigger "{}"');
        for (let i = 0; i < 100 && (await host.world()).fsm !== 'FLYING_HOVER'; i += 1) await new Promise((resolve) => setTimeout(resolve, 50));

        ui.input.value = `ros2 topic pub -r 10 /geoscan/flight/cmd_vel geometry_msgs/msg/TwistStamped "{header: {frame_id: 'base_link'}, twist: {linear: {x: 0.5, y: 0.0, z: 0.0}, angular: {z: 0.0}}}"`;
        ui.submit();
        await ui.until(() => (ui.text().match(/publishing #/gu)?.length ?? 0) >= 3, 8000);
        ui.key({ key: 'c', code: 'KeyC', ctrlKey: true });
        await ui.handle.idle();
        expect(ui.text()).toContain('publisher: beginning loop');
        expect(ui.text()).toContain('publishing #1: geometry_msgs.msg.TwistStamped(');
        const sent = (await host.world()).calls.filter((call) => call[0] === 'speed').length;
        expect(sent).toBeGreaterThanOrEqual(3);
        await new Promise((resolve) => setTimeout(resolve, 300));
        expect((await host.world()).calls.filter((call) => call[0] === 'speed').length).toBe(sent);

        // ros2 run ... -p topics.gnss:=true: узел перезапускается, топики GNSS появляются; Ctrl+C останавливает узел
        ui.input.value = 'ros2 run gs_core ros_pioneer_node --ros-args --params-file mini2.yaml -p topics.gnss:=true';
        ui.submit();
        await ui.until(() => ui.text().includes('связь с автопилотом'), 8000);
        expect((await registry.topicList()).map((row) => row.name)).toContain('/geoscan/navigation/global/position');
        ui.key({ key: 'c', code: 'KeyC', ctrlKey: true });
        await ui.handle.idle();
        expect((await registry.launchStatus()).running).toBe(false);
        await ui.type('ros2 topic list');
        expect(ui.text().trimEnd().endsWith('ros2 topic list')).toBe(true);
        // ros2 launch поднимает узел снова
        ui.input.value = 'ros2 launch gs_core pioneer_mini2_full_launch.py';
        ui.submit();
        await ui.until(() => ui.text().includes('process started with pid [2101]'), 8000);
        expect((await registry.launchStatus()).running).toBe(true);
        ui.key({ key: 'c', code: 'KeyC', ctrlKey: true });
        await ui.handle.idle();
        expect(ui.text()).toContain('process has finished cleanly [pid 2101]');
    }, 120_000);
});
