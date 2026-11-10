/**
 * TS-фасад сети роя (swarm/registry.ts) для консоли: хост - постоянный процесс CPython с несколькими дронами.
 * Фасад работает без программы ученика (swarm-server есть у каждого дрона с pioneer_sdk2) и с ней.
 */
import { SwarmError, SwarmRegistry } from '../public/modules/python/swarm/registry.js';
import { PythonSwarmHost, python } from './helpers/swarm-runtime.js';

const describeWithPython = python ? describe : describe.skip;

describeWithPython('SwarmRegistry', () => {
    let host: PythonSwarmHost;
    let swarm: SwarmRegistry;

    beforeAll(() => {
        host = new PythonSwarmHost({
            drones: [
                { id: 'd1', name: 'Пионер Мини 2 · 1', machine_id: 'pioneer1' },
                { id: 'd2', name: 'Пионер Мини 2 · 2', machine_id: 'pioneer2' },
                { id: 'd3', name: 'Пионер Базовый 3', model: 'pioneer-basic', machine_id: 'pioneer3' }
            ]
        });
        swarm = new SwarmRegistry(host, 'd1');
    });

    afterAll(() => host.close());

    test('units: все юниты сети, виртуальные соседи без программ видны', async () => {
        const rows = await swarm.units();
        expect(rows.map((row) => row.machine_id)).toEqual(['pioneer1', 'pioneer2', 'pioneer3']);
        expect(rows[0]).toMatchObject({ drone: 'd1', type: 'aero', domain: 0, visible: true, online: true, present: true, mailbox: 0, instances: 0, subscribers: {} });
        expect(rows.map((row) => row.model)).toEqual(['pioneer-mini2', 'pioneer-mini2', 'pioneer-basic']);
    });

    test('unitInfo: каталог потоков из Heartbeat и число подписчиков', async () => {
        const info = await swarm.unitInfo('pioneer2');
        expect(info.heartbeat).toMatchObject({ type: 'aero', period: 1 });
        expect(info.heartbeat.streams).toEqual(info.catalog.map((stream) => stream.name));
        expect(info.catalog.map((stream) => stream.name)).toEqual([
            'navigation/local/position', 'navigation/local/velocity', 'navigation/local/yaw', 'navigation/local/status',
            'sensors/imu', 'sensors/altitude', 'sensors/battery_state', 'flight/fly_state', 'flight/callback_event'
        ]);
        expect(info.catalog.every((stream) => stream.subscribers === 0)).toBe(true);
        expect(info.catalog.find((stream) => stream.name === 'flight/callback_event')?.period).toBeNull();
    });

    test('unitInfo, mailbox и send для неизвестного юнита - SwarmError с русским текстом', async () => {
        await expect(swarm.unitInfo('pioneer77')).rejects.toThrow(SwarmError);
        await expect(swarm.mailbox('pioneer77')).rejects.toThrow("Юнит 'pioneer77' не найден в сети роя");
        await expect(swarm.send('pioneer77', 'x')).rejects.toThrow(/не найден/);
    });

    test('send и mailbox: письмо «с земли», ящик виден без извлечения', async () => {
        expect(await swarm.send('pioneer2', 'привет с земли')).toBe(true);
        expect(await swarm.send('pioneer2', 'второе', 'оператор')).toBe(true);
        expect(await swarm.mailbox('pioneer2')).toEqual([['console', 'привет с земли'], ['оператор', 'второе']]);
        expect((await swarm.units()).find((row) => row.machine_id === 'pioneer2')?.mailbox).toBe(2);
    });

    test('telemetry: временная подписка снимает потоки и возвращает repr сообщений', async () => {
        const result = await swarm.telemetry('pioneer3', 3);
        expect(result.type).toBe('aero');
        expect(Object.keys(result.streams)).toHaveLength(8);
        expect(result.streams['navigation/local/position']).toBe('geometry_msgs.msg.Point(x=0.0, y=0.0, z=0.0)');
        // После запроса подписчиков не осталось: потоки на сеть не льются.
        expect((await swarm.unitInfo('pioneer3')).subscribers).toEqual({});
    });

    test('программа ученика на дроне: объект виден в instances, подписка - в subscribers, письма доходят', async () => {
        await host.start('d2', `
from pioneer_swarm import PioneerSwarmUnit
import time
swarm = PioneerSwarmUnit()
swarm.get_telemetry_from_unit('pioneer3', timeout_sec=0)
while True:
    message = swarm.get_next_message()
    if message is not None:
        print('получил', message)
    time.sleep(0.1)
`);
        await host.wait(1);
        const row = (await swarm.units()).find((item) => item.machine_id === 'pioneer2');
        expect(row).toMatchObject({ instances: 1 });
        // Письма, пришедшие до запуска программы, дождались её: ящик был очищен читателем.
        expect(row?.mailbox).toBe(0);
        const target = await swarm.unitInfo('pioneer3');
        expect(target.catalog.filter((stream) => stream.subscribers === 1)).toHaveLength(9);
        await swarm.send('pioneer2', 'из консоли');
        await host.wait(1);
        expect((await host.world()).out.d2).toEqual(expect.arrayContaining([
            "получил ('console', 'привет с земли')", "получил ('оператор', 'второе')", "получил ('console', 'из консоли')"
        ]));
    });

    test('setOnline: выключенный swarm-server пропадает из видимых через 3 с, включённый возвращается', async () => {
        await swarm.setOnline('pioneer3', false);
        await host.wait(1);
        expect((await swarm.units()).find((row) => row.machine_id === 'pioneer3')).toMatchObject({ visible: true, online: false });
        await host.wait(3);
        const off = (await swarm.units()).find((row) => row.machine_id === 'pioneer3');
        expect(off).toMatchObject({ visible: false, online: false });
        expect(off!.age).toBeGreaterThan(3);
        await expect(swarm.send('pioneer3', 'x')).rejects.toThrow(/не найден/);
        await swarm.setOnline('pioneer3', true);
        expect((await swarm.units()).find((row) => row.machine_id === 'pioneer3')).toMatchObject({ visible: true, online: true });
    });

    test('setDomain: домен swarm-server юнита; clock идёт вперёд', async () => {
        expect((await swarm.setDomain('pioneer3', 5)).domain).toBe(5);
        expect((await swarm.units()).map((row) => row.domain)).toEqual([0, 0, 5]);
        await swarm.setDomain('pioneer3', 0);
        const before = await swarm.clock();
        await host.wait(2);
        expect(await swarm.clock()).toBeGreaterThan(before + 1.5);
    });

    test('удалённый дрон исчезает после тайм-аута, добавленный - после первого Heartbeat', async () => {
        await host.removeDrone('d3');
        await host.wait(4);
        expect((await swarm.units()).map((row) => row.machine_id)).toEqual(['pioneer1', 'pioneer2']);
        await host.addDrone({ id: 'd4', name: 'Пионер Мини 2 · 4', machine_id: 'pioneer4' });
        await host.wait(1);
        expect((await swarm.units()).find((row) => row.machine_id === 'pioneer4')).toMatchObject({ visible: true });
    });

    test('reset закрывает объекты программ и забывает сеть', async () => {
        expect(await swarm.reset()).toBe(true);
        const rows = await swarm.units();
        expect(rows.every((row) => row.instances === 0 && row.mailbox === 0)).toBe(true);
    });
});
