/**
 * Эмуляция Swarm Kit (pioneer_swarm) на настоящем CPython против поддельного мира с несколькими дронами:
 * каждый метод API, Heartbeat (обнаружение и исчезновение), сообщения, телеметрия по подписке, домены,
 * две программы на двух дронах, ведущий и ведомый на pioneer_sdk2, close().
 */
import { runSwarm, withSwarmPython, type SwarmDroneSpec } from './helpers/swarm-runtime.js';

// Общая часть сценариев: юнит на дроне и перехват ошибок.
const PRE = `
import json, sys
from pioneer_swarm import PioneerSwarmUnit, SwarmUnitType

def unit(drone='d1', **kwargs):
    js.SIM_DRONE_ID = drone
    return PioneerSwarmUnit(**kwargs)

def err(fn):
    try:
        fn()
        return None
    except Exception as exc:
        return type(exc).__name__ + ': ' + str(exc)

async def aerr(coro):
    try:
        await coro
        return None
    except Exception as exc:
        return type(exc).__name__ + ': ' + str(exc)

async def registry(fn, **args):
    reply = json.loads(await sys.modules['_swarm_registry'].dispatch(fn, json.dumps(dict(args, drone='d1'))))
    return reply['result'] if reply['ok'] else 'ERROR: ' + reply['error']
`;

const THREE: SwarmDroneSpec[] = [
    { id: 'd1', name: 'Пионер Мини 2 · 1', machine_id: 'pioneer1' },
    { id: 'd2', name: 'Пионер Мини 2 · 2', machine_id: 'pioneer2' },
    { id: 'd3', name: 'Пионер Базовый 3', model: 'pioneer-basic', machine_id: 'pioneer3' }
];

function scenario(body: string): string {
    return `${PRE}\nasync def main():\n${body.split('\n').map((line) => `    ${line}`).join('\n')}\n`;
}

describe('pioneer_swarm: свойства и список соседей', () => {
    withSwarmPython('id, unit_type (None, затем AERO), get_unit_list без себя и в порядке номеров', () => {
        const run = runSwarm<Record<string, unknown>>(scenario(`
sw = unit()
r = {}
r['id'] = sw.id
r['id_type'] = type(sw.id).__name__
r['type0'] = repr(sw.unit_type)
r['list0'] = sw.get_unit_list()
await sim_sleep(0.3)
r['type_03'] = repr(sw.unit_type)
await sim_sleep(0.4)
r['type_07'] = sw.unit_type.name
r['is_enum'] = sw.unit_type is SwarmUnitType.AERO
r['members'] = [m.name for m in SwarmUnitType]
r['values'] = [m.value for m in SwarmUnitType]
r['list'] = sw.get_unit_list()
r['list_type'] = type(sw.get_unit_list()).__name__
return r
`), { drones: [...THREE, { id: 'd10', name: 'Пионер Мини 2 · 10', machine_id: 'pioneer10' }] });
        expect(run.error).toBeNull();
        const r = run.data;
        expect(r.id).toBe('pioneer1');
        expect(r.id_type).toBe('str');
        expect(r.type0).toBe('None');
        expect(r.list0).toEqual(['pioneer2', 'pioneer3', 'pioneer10']);
        expect(r.type_03).toBe('None');
        expect(r.type_07).toBe('AERO');
        expect(r.is_enum).toBe(true);
        expect(r.members).toEqual(['AERO', 'ROVER', 'MARINE', 'ROBOT', 'OTHER']);
        expect(r.values).toEqual(['aero', 'rover', 'marine', 'robot', 'other']);
        expect(r.list).toEqual(['pioneer2', 'pioneer3', 'pioneer10']);
        expect(r.list_type).toBe('list');
    });

    withSwarmPython('виртуальный сосед виден без программы; дрон на SDK1 в рое не появляется', () => {
        const run = runSwarm<Record<string, unknown>>(scenario(`
sw = unit()
return {'list': sw.get_unit_list(), 'running2': worlds['d2'].running}
`), { drones: [...THREE.slice(0, 2), { id: 'd4', name: 'Пионер Базовый 4', model: 'pioneer-basic', machine_id: 'pioneer4', sdk2: false }] });
        expect(run.error).toBeNull();
        expect(run.data).toEqual({ list: ['pioneer2'], running2: false });
    });
});

describe('pioneer_swarm: создание объекта', () => {
    withSwarmPython('проверка аргументов и machine_id', () => {
        const run = runSwarm<Record<string, unknown>>(scenario(`
r = {}
js.SIM_DRONE_ID = 'd1'
r['domain_type'] = err(lambda: PioneerSwarmUnit(domain_id='0'))
r['domain_bool'] = err(lambda: PioneerSwarmUnit(domain_id=True))
r['domain_range'] = err(lambda: PioneerSwarmUnit(domain_id=233))
r['domain_neg'] = err(lambda: PioneerSwarmUnit(domain_id=-1))
r['mid_type'] = err(lambda: PioneerSwarmUnit(machine_id=5))
r['mid_empty'] = err(lambda: PioneerSwarmUnit(machine_id='  '))
r['mid_chars'] = err(lambda: PioneerSwarmUnit(machine_id='a b'))
r['mid_digit'] = err(lambda: PioneerSwarmUnit(machine_id='1abc'))
r['sync_type'] = err(lambda: PioneerSwarmUnit(sync_wait_timeout_sec='5'))
js.SIM_DRONE_ID = 'ghost'
r['unknown_drone'] = err(lambda: PioneerSwarmUnit())
js.SIM_DRONE_ID = 'd4'
r['sdk1_drone'] = err(lambda: PioneerSwarmUnit())
a = unit('d1', machine_id='alpha')
b = unit('d2')
r['explicit_id'] = a.id
r['seen_by_other'] = b.get_unit_list()
r['duplicate'] = err(lambda: unit('d2', machine_id='alpha'))
r['ok_args'] = unit('d2', domain_id=0, machine_id=None, sync_wait_timeout_sec=2.5).id
a.close()
r['after_close_id'] = a.id
r['restored'] = b.get_unit_list()
return r
`), { drones: [...THREE.slice(0, 2), { id: 'd4', name: 'Пионер Базовый 4', model: 'pioneer-basic', machine_id: 'pioneer4', sdk2: false }] });
        expect(run.error).toBeNull();
        const r = run.data;
        expect(r.domain_type).toMatch(/^TypeError: .*domain_id/);
        expect(r.domain_bool).toMatch(/^TypeError/);
        expect(r.domain_range).toMatch(/^ValueError: .*domain_id/);
        expect(r.domain_neg).toMatch(/^ValueError/);
        expect(r.mid_type).toMatch(/^TypeError: .*machine_id/);
        expect(r.mid_empty).toMatch(/^RuntimeError: .*machine_id не определён/);
        expect(r.mid_chars).toMatch(/^ValueError: .*machine_id/);
        expect(r.mid_digit).toMatch(/^ValueError/);
        expect(r.sync_type).toMatch(/^TypeError/);
        // Без определённого machine_id объект не создаётся: нет такого дрона - RuntimeError, а не молчаливый юнит.
        expect(r.unknown_drone).toMatch(/^RuntimeError: .*не удалось определить machine_id/);
        expect(r.sdk1_drone).toMatch(/^RuntimeError: .*Python · SDK2/);
        expect(r.explicit_id).toBe('alpha');
        expect(r.seen_by_other).toEqual(['alpha']);
        expect(r.duplicate).toMatch(/^RuntimeError: .*'alpha' уже занят/);
        expect(r.ok_args).toBe('pioneer2');
        expect(r.after_close_id).toBe('alpha');
        expect(r.restored).toEqual(['pioneer1']);
    });
});

describe('Heartbeat: появление и исчезновение юнитов', () => {
    withSwarmPython('новый дрон появляется после первого Heartbeat, пропавший - через 3 с, дрон на SDK1 - тоже', () => {
        const run = runSwarm<Record<string, unknown>>(scenario(`
sw = unit()
r = {'start': sw.get_unit_list()}
add_drone(id='d3', name='Пионер Мини 2 · 3', machine_id='pioneer3')
r['add_now'] = sw.get_unit_list()
await sim_sleep(0.8)
r['add_later'] = sw.get_unit_list()
remove_drone('d2')
r['removed_now'] = sw.get_unit_list()
await sim_sleep(1.5)
r['removed_15'] = sw.get_unit_list()
await sim_sleep(2.2)
r['removed_37'] = sw.get_unit_list()
worlds['d3'].sdk2 = False
await sim_sleep(1.0)
r['sdk1_1'] = sw.get_unit_list()
await sim_sleep(3.0)
r['sdk1_4'] = sw.get_unit_list()
return r
`), { seconds: 60 });
        expect(run.error).toBeNull();
        const r = run.data;
        expect(r.start).toEqual(['pioneer2']);
        expect(r.add_now).toEqual(['pioneer2']);
        expect(r.add_later).toEqual(['pioneer2', 'pioneer3']);
        expect(r.removed_now).toEqual(['pioneer2', 'pioneer3']);
        expect(r.removed_15).toEqual(['pioneer2', 'pioneer3']);
        expect(r.removed_37).toEqual(['pioneer3']);
        expect(r.sdk1_1).toEqual(['pioneer3']);
        expect(r.sdk1_4).toEqual([]);
    });

    withSwarmPython('выключенный swarm-server (реестр) пропадает через 3 с и возвращается после включения', () => {
        const run = runSwarm<Record<string, unknown>>(scenario(`
sw = unit()
r = {}
await registry('set_online', machine_id='pioneer2', online=False)
await sim_sleep(1.0)
r['off_1'] = sw.get_unit_list()
await sim_sleep(3.0)
r['off_4'] = sw.get_unit_list()
r['row'] = (await registry('units'))
await registry('set_online', machine_id='pioneer2', online=True)
await sim_sleep(0.1)
r['on'] = sw.get_unit_list()
return r
`));
        expect(run.error).toBeNull();
        const r = run.data as { off_1: string[]; off_4: string[]; on: string[]; row: Array<{ machine_id: string; visible: boolean; online: boolean }> };
        expect(r.off_1).toEqual(['pioneer2']);
        expect(r.off_4).toEqual([]);
        expect(r.row.find((row) => row.machine_id === 'pioneer2')).toMatchObject({ visible: false, online: false });
        expect(r.on).toEqual(['pioneer2']);
    });
});

describe('Сообщения', () => {
    withSwarmPython('send_message_to_unit: False для неизвестного и себя, порядок FIFO, пустой ящик - None', () => {
        const run = runSwarm<Record<string, unknown>>(scenario(`
a = unit('d1')
b = unit('d2')
r = {}
r['unknown'] = a.send_message_to_unit('nobody', 'x')
r['self'] = a.send_message_to_unit('pioneer1', 'x')
r['empty'] = b.get_next_message()
r['sent'] = [a.send_message_to_unit('pioneer2', 'm%d' % i) for i in range(3)]
b.send_message_to_unit('pioneer1', 'ответ')
msgs = [b.get_next_message() for _ in range(4)]
r['msgs'] = msgs
r['kind'] = type(msgs[0]).__name__
r['reply'] = a.get_next_message()
r['reply_empty'] = a.get_next_message()
r['type_text'] = err(lambda: a.send_message_to_unit('pioneer2', 5))
r['type_id'] = err(lambda: a.send_message_to_unit(2, 'x'))
r['unicode'] = (a.send_message_to_unit('pioneer2', 'Привет, рой! 🚁'), b.get_next_message())
return r
`));
        expect(run.error).toBeNull();
        const r = run.data;
        expect(r.unknown).toBe(false);
        expect(r.self).toBe(false);
        expect(r.empty).toBeNull();
        expect(r.sent).toEqual([true, true, true]);
        expect(r.msgs).toEqual([['pioneer1', 'm0'], ['pioneer1', 'm1'], ['pioneer1', 'm2'], null]);
        expect(r.kind).toBe('tuple');
        expect(r.reply).toEqual(['pioneer2', 'ответ']);
        expect(r.reply_empty).toBeNull();
        expect(r.type_text).toMatch(/^TypeError: .*message/);
        expect(r.type_id).toMatch(/^TypeError: .*unit_id/);
        expect(r.unicode).toEqual([true, ['pioneer1', 'Привет, рой! 🚁']]);
    });

    withSwarmPython('ящик ограничен 100 сообщениями; письма соседу без программы ждут его; close() очищает ящик', () => {
        const run = runSwarm<Record<string, unknown>>(scenario(`
a = unit('d1')
r = {}
for i in range(5):
    a.send_message_to_unit('pioneer2', 'early%d' % i)
b = unit('d2')
r['early'] = b.get_next_message()
for i in range(105):
    a.send_message_to_unit('pioneer2', 'f%d' % i)
rows = await registry('units')
r['mailbox_len'] = [row['mailbox'] for row in rows if row['machine_id'] == 'pioneer2'][0]
r['first'] = b.get_next_message()
b.send_message_to_unit('pioneer1', 'to-a')
b.close()
a.send_message_to_unit('pioneer2', 'while-closed')
c = unit('d2')
r['after_close'] = c.get_next_message()
a.close()
c.send_message_to_unit('pioneer1', 'x')
r['closed_send'] = err(lambda: a.send_message_to_unit('pioneer2', 'x'))
return r
`));
        expect(run.error).toBeNull();
        const r = run.data;
        expect(r.early).toEqual(['pioneer1', 'early0']);
        expect(r.mailbox_len).toBe(100);
        // Из 4 оставшихся ранних и 105 новых в ящике последние 100: f5 ... f104.
        expect(r.first).toEqual(['pioneer1', 'f5']);
        // Ящик закрытого юнита очищен close(); письмо, пришедшее без программы, ждёт следующей, а потом очищается её close().
        expect(r.after_close).toEqual(['pioneer1', 'while-closed']);
        expect(r.closed_send).toMatch(/^RuntimeError: .*close/);
    });
});

describe('Телеметрия', () => {
    withSwarmPython('get_telemetry_from_unit: None для неизвестного, словарь потоков, события, копии', () => {
        const run = runSwarm<Record<string, unknown>>(scenario(`
a = unit('d1')
r = {}
worlds['d2'].pos = [1.5, -2.0, 0.7]
worlds['d2'].yaw = 0.5
worlds['d2'].battery = 7.4
r['unknown'] = await a.get_telemetry_from_unit('zzz', timeout_sec=1.0)
r['self'] = await a.get_telemetry_from_unit('pioneer1', timeout_sec=1.0)
r['subs_before'] = (await registry('unit_info', machine_id='pioneer2'))['subscribers']
t_before = wall_sim()
first = await a.get_telemetry_from_unit('pioneer2', timeout_sec=0)
r['first'] = [first[0].name, first[1]]
r['zero_timeout_sim_time'] = wall_sim() - t_before
info = await registry('unit_info', machine_id='pioneer2')
r['subs_during'] = sorted(set(info['subscribers'].values())), len(info['subscribers'])
t_before = wall_sim()
result = await a.get_telemetry_from_unit('pioneer2', timeout_sec=5.0)
r['wait_sim_time'] = wall_sim() - t_before
kind, tel = result
r['kind'] = kind.name
r['keys'] = sorted(tel.keys())
p = tel['navigation/local/position']
r['pos'] = [p.x, p.y, p.z]
r['pos_type'] = type(p).__module__ + '.' + type(p).__name__
r['yaw'] = tel['navigation/local/yaw'].data
r['alt'] = tel['sensors/altitude'].data
r['volt'] = tel['sensors/battery_state'].voltage
r['fly'] = tel['flight/fly_state'].data
r['status'] = tel['navigation/local/status'].status
r['imu_az'] = tel['sensors/imu'].linear_acceleration.z
r['no_event'] = 'flight/callback_event' not in tel
tel['navigation/local/position'].x = 99.0
again = await a.get_telemetry_from_unit('pioneer2', timeout_sec=0)
r['copy_safe'] = again[1]['navigation/local/position'].x
# события полёта: запуск моторов соседа
js.pioneer_arm('d2')
await sim_sleep(0.4)
tel2 = (await a.get_telemetry_from_unit('pioneer2', timeout_sec=1.0))[1]
r['event'] = tel2['flight/callback_event'].data
r['fly_after_arm'] = tel2['flight/fly_state'].data
# подписка снимается при close()
a.close()
r['subs_after'] = (await registry('unit_info', machine_id='pioneer2'))['subscribers']
return r
`));
        expect(run.error).toBeNull();
        const r = run.data as Record<string, any>;
        expect(r.unknown).toBeNull();
        expect(r.self).toBeNull();
        expect(r.subs_before).toEqual({});
        expect(r.first).toEqual(['AERO', {}]);
        expect(r.zero_timeout_sim_time).toBeLessThan(0.2);
        // Потоки льются на сеть только пока есть подписчик: по одному на каждый объявленный поток.
        expect(r.subs_during).toEqual([[1], 9]);
        expect(r.wait_sim_time).toBeGreaterThan(0.05);
        expect(r.wait_sim_time).toBeLessThan(1.0);
        expect(r.kind).toBe('AERO');
        expect(r.keys).toEqual([
            'flight/fly_state', 'navigation/local/position', 'navigation/local/status', 'navigation/local/velocity',
            'navigation/local/yaw', 'sensors/altitude', 'sensors/battery_state', 'sensors/imu'
        ]);
        expect(r.pos).toEqual([1.5, -2.0, 0.7]);
        expect(r.pos_type).toBe('geometry_msgs.msg.Point');
        expect(r.yaw).toBeCloseTo(0.5, 6);
        expect(r.alt).toBeCloseTo(0.7, 6);
        expect(r.volt).toBeCloseTo(7.4, 6);
        expect(r.fly).toBe(0);
        expect(r.status).toBe(3);
        expect(r.imu_az).toBeCloseTo(9.81, 3);
        expect(r.no_event).toBe(true);
        expect(r.copy_safe).toBe(1.5);
        expect(r.event).toBe(8);
        expect(r.fly_after_arm).toBe(1);
        expect(r.subs_after).toEqual({});
    });

    withSwarmPython('таймауты: короче первого сэмпла - пустой словарь, None - ждёт все потоки, сосед пропал - None', () => {
        const run = runSwarm<Record<string, unknown>>(scenario(`
a = unit('d1')
r = {}
t0 = wall_sim()
short = await a.get_telemetry_from_unit('pioneer2', timeout_sec=0.05)
r['short_keys'] = len(short[1])
r['short_elapsed'] = wall_sim() - t0
b = PioneerSwarmUnit()
full = await b.get_telemetry_from_unit('pioneer2', timeout_sec=None)
r['full_keys'] = len(full[1])
c = PioneerSwarmUnit()
neg = await aerr(c.get_telemetry_from_unit('pioneer2', timeout_sec=-1))
r['negative'] = neg
r['bad_timeout'] = await aerr(c.get_telemetry_from_unit('pioneer2', timeout_sec='5'))
r['bad_id'] = await aerr(c.get_telemetry_from_unit(7))
# сосед исчезает во время ожидания: данных нет и не будет - через 3 с юнит пропадает, ответ None
worlds['d2'].state = lambda: None
d = PioneerSwarmUnit()
task = asyncio.ensure_future(d.get_telemetry_from_unit('pioneer2', timeout_sec=60.0))
await sim_sleep(0.5)
remove_drone('d2')
r['vanished'] = await asyncio.wait_for(task, timeout=5)
return r
`), { seconds: 90 });
        expect(run.error).toBeNull();
        const r = run.data as Record<string, any>;
        expect(r.short_keys).toBe(0);
        expect(r.short_elapsed).toBeGreaterThanOrEqual(0.05);
        expect(r.short_elapsed).toBeLessThan(0.5);
        expect(r.full_keys).toBe(8);
        expect(r.negative).toMatch(/^ValueError/);
        expect(r.bad_timeout).toMatch(/^TypeError/);
        expect(r.bad_id).toMatch(/^TypeError/);
        expect(r.vanished).toBeNull();
    });

    withSwarmPython('без телеметрии Swarm Kit не тянет ROS 2: сообщения подгружаются при первом запросе', () => {
        const run = runSwarm<Record<string, unknown>>(`
import sys
async def main():
    before = ['pioneer_swarm' in sys.modules, 'rclpy' in sys.modules]
    from pioneer_swarm import PioneerSwarmUnit
    js.SIM_DRONE_ID = 'd1'
    worlds['d1'].running = True
    a = PioneerSwarmUnit()
    a.get_unit_list()
    mid = ['pioneer_swarm' in sys.modules, 'rclpy' in sys.modules]
    await a.get_telemetry_from_unit('pioneer2', timeout_sec=1.0)
    return [before, mid, 'geometry_msgs.msg' in sys.modules]
`);
        expect(run.error).toBeNull();
        expect(run.data).toEqual([[false, false], [true, false], true]);
    });
});

describe('Домены роя', () => {
    withSwarmPython('юниты разных доменов не видят друг друга, сообщения и телеметрия не доходят', () => {
        const run = runSwarm<Record<string, unknown>>(scenario(`
r = {}
a = unit('d1', domain_id=1)
b = unit('d2', domain_id=1)
c = unit('d3', domain_id=2)
r['a'] = a.get_unit_list()
r['b'] = b.get_unit_list()
r['c'] = c.get_unit_list()
r['cross_msg'] = a.send_message_to_unit('pioneer3', 'x')
r['cross_tel'] = await a.get_telemetry_from_unit('pioneer3', timeout_sec=0.5)
r['same_msg'] = a.send_message_to_unit('pioneer2', 'hi')
r['same_read'] = b.get_next_message()
# swarm-server соседа без программы остаётся в домене 0, пока ему не задали другой
add_drone(id='d4', name='Пионер Мини 2 · 4', machine_id='pioneer4')
a.get_unit_list()
await sim_sleep(0.8)
r['virtual_d0'] = a.get_unit_list()
await registry('set_domain', machine_id='pioneer4', domain=1)
r['virtual_d1'] = a.get_unit_list()
a.close()
b.close()
c.close()
d = unit('d1')
r['default_domain_after_close'] = d.get_unit_list()
return r
`), { drones: THREE });
        expect(run.error).toBeNull();
        const r = run.data;
        expect(r.a).toEqual(['pioneer2']);
        expect(r.b).toEqual(['pioneer1']);
        expect(r.c).toEqual([]);
        expect(r.cross_msg).toBe(false);
        expect(r.cross_tel).toBeNull();
        expect(r.same_msg).toBe(true);
        expect(r.same_read).toEqual(['pioneer1', 'hi']);
        expect(r.virtual_d0).toEqual(['pioneer2']);
        expect(r.virtual_d1).toEqual(['pioneer2', 'pioneer4']);
        // После close() дроны вернулись в домен 0; pioneer4 настроен на домен 1 и в нём остался.
        expect(r.default_domain_after_close).toEqual(['pioneer2', 'pioneer3']);
    });
});

describe('close()', () => {
    withSwarmPython('повторный close безвреден, дальше методы бросают RuntimeError, id остаётся, подписки и экземпляры сняты', () => {
        const run = runSwarm<Record<string, unknown>>(scenario(`
a = unit()
b = PioneerSwarmUnit()
r = {}
await sim_sleep(0.7)
r['type_before'] = a.unit_type.name
await a.get_telemetry_from_unit('pioneer2', timeout_sec=0)
r['instances_before'] = [row['instances'] for row in await registry('units') if row['machine_id'] == 'pioneer1'][0]
r['close_1'] = a.close()
r['close_2'] = a.close()
r['id_after'] = a.id
r['type_after'] = a.unit_type.name
r['list'] = err(lambda: a.get_unit_list())
r['send'] = err(lambda: a.send_message_to_unit('pioneer2', 'x'))
r['next'] = err(lambda: a.get_next_message())
r['tel'] = await aerr(a.get_telemetry_from_unit('pioneer2'))
r['other_alive'] = b.get_unit_list()
rows = await registry('units')
r['instances_after'] = [row['instances'] for row in rows if row['machine_id'] == 'pioneer1'][0]
r['subs'] = [row['subscribers'] for row in rows if row['machine_id'] == 'pioneer2'][0]
b.close()
c = PioneerSwarmUnit(domain_id=3)
r['domain_open'] = [row['domain'] for row in await registry('units') if row['machine_id'] == 'pioneer1'][0]
c.close()
r['domain_closed'] = [row['domain'] for row in await registry('units') if row['machine_id'] == 'pioneer1'][0]
return r
`));
        expect(run.error).toBeNull();
        const r = run.data as Record<string, any>;
        expect(r.type_before).toBe('AERO');
        expect(r.instances_before).toBe(2);
        expect(r.close_1).toBeNull();
        expect(r.close_2).toBeNull();
        expect(r.id_after).toBe('pioneer1');
        expect(r.type_after).toBe('AERO');
        for (const key of ['list', 'send', 'next', 'tel']) expect(r[key]).toMatch(/^RuntimeError: PioneerSwarmUnit закрыт/);
        expect(r.other_alive).toEqual(['pioneer2']);
        expect(r.instances_after).toBe(1);
        expect(r.subs).toEqual({});
        expect(r.domain_open).toBe(3);
        expect(r.domain_closed).toBe(0);
    });

    withSwarmPython('программа, не вызвавшая close(), закрывается раннером: swarm-server дрона остаётся в сети', () => {
        const run = runSwarm<Record<string, unknown>>(scenario(`
task = await start('d2', '''
from pioneer_swarm import PioneerSwarmUnit
swarm = PioneerSwarmUnit(domain_id=4)
swarm.send_message_to_unit('pioneer1', 'не закрыл')
''')
await task
observer = unit('d1')
rows = await registry('units')
row = [x for x in rows if x['machine_id'] == 'pioneer2'][0]
return {'instances': row['instances'], 'domain': row['domain'], 'visible': row['visible'], 'neighbours': observer.get_unit_list()}
`));
        expect(run.error).toBeNull();
        expect(run.errors).toEqual({});
        expect(run.data).toEqual({ instances: 0, domain: 0, visible: true, neighbours: ['pioneer2'] });
    });

    withSwarmPython('«Стоп» прерывает ожидание телеметрии без ошибки', () => {
        const run = runSwarm<Record<string, unknown>>(scenario(`
worlds['d2'].state = lambda: None
task = await start('d1', '''
from pioneer_swarm import PioneerSwarmUnit
swarm = PioneerSwarmUnit()
swarm.get_telemetry_from_unit('pioneer2', timeout_sec=None)
print('не должно напечататься')
''')
await sim_sleep(1)
r = {'waiting': not task.done()}
js.cancelled.add('d1')
await asyncio.wait_for(task, timeout=5)
r['done'] = task.done()
return r
`));
        expect(run.error).toBeNull();
        expect(run.errors).toEqual({});
        expect(run.data).toEqual({ waiting: true, done: true });
        expect(run.out.d1 ?? []).toEqual([]);
    });
});

describe('Программы на разных дронах', () => {
    withSwarmPython('юнит привязывается к дрону программы, даже если после неё стартовала программа другого дрона', () => {
        const run = runSwarm<Record<string, unknown>>(scenario(`
slow = await start('d1', '''
import time
from pioneer_swarm import PioneerSwarmUnit
time.sleep(0.5)
swarm = PioneerSwarmUnit()
print('slow', swarm.id)
''')
fast = await start('d2', '''
from pioneer_swarm import PioneerSwarmUnit
swarm = PioneerSwarmUnit()
print('fast', swarm.id)
''')
await slow
await fast
`));
        expect(run.error).toBeNull();
        expect(run.errors).toEqual({});
        expect(run.out.d1).toEqual(['slow pioneer1']);
        expect(run.out.d2).toEqual(['fast pioneer2']);
    });

    withSwarmPython('ping-pong: две программы обмениваются сообщениями', () => {
        const run = runSwarm(scenario(`
pong = await start('d2', '''
from pioneer_swarm import PioneerSwarmUnit
import time
swarm = PioneerSwarmUnit()
for _ in range(200):
    message = swarm.get_next_message()
    if message is not None:
        sender, text = message
        print('получил', sender, text)
        swarm.send_message_to_unit(sender, 'pong')
        break
    time.sleep(0.05)
swarm.close()
''')
ping = await start('d1', '''
from pioneer_swarm import PioneerSwarmUnit
import time
swarm = PioneerSwarmUnit()
print('отправил', swarm.send_message_to_unit('pioneer2', 'ping'))
reply = None
for _ in range(200):
    reply = swarm.get_next_message()
    if reply is not None:
        break
    time.sleep(0.05)
print('ответ', reply)
swarm.close()
''')
await ping
await pong
`));
        expect(run.error).toBeNull();
        expect(run.errors).toEqual({});
        expect(run.out.d1).toEqual(['отправил True', "ответ ('pioneer2', 'pong')"]);
        expect(run.out.d2).toEqual(['получил pioneer1 ping']);
    });

    withSwarmPython('ведущий и ведомый: ведомый читает позицию ведущего и летит рядом на pioneer_sdk2', () => {
        const run = runSwarm(scenario(`
follower = await start('d2', '''
from pioneer_sdk2 import Pioneer
from pioneer_swarm import PioneerSwarmUnit
import time
pioneer = Pioneer()
swarm = PioneerSwarmUnit()
pioneer.arm()
pioneer.takeoff()
for _ in range(40):
    result = swarm.get_telemetry_from_unit('pioneer1', timeout_sec=2.0)
    if result is not None:
        position = result[1]['navigation/local/position']
        pioneer.go_to_local_point(x=position.x - 1.0, y=position.y, z=1.0)
    time.sleep(0.5)
print('следую за', round(position.x, 1), round(position.y, 1))
pioneer.land()
swarm.close()
''')
leader = await start('d1', '''
from pioneer_sdk2 import Pioneer
from pioneer_swarm import PioneerSwarmUnit
import time
pioneer = Pioneer()
swarm = PioneerSwarmUnit()
pioneer.arm()
pioneer.takeoff()
pioneer.go_to_local_point(x=3, y=2, z=1)
while not pioneer.point_reached():
    time.sleep(0.1)
time.sleep(3)
pioneer.land()
swarm.close()
''')
await leader
await follower
`), { seconds: 200 });
        expect(run.error).toBeNull();
        expect(run.errors).toEqual({});
        expect(run.out.d2).toEqual(['следую за 3.0 2.0']);
        // Ведомый приземлился там, где был в конце: в метре позади ведущего по оси x.
        expect(run.worlds.d1.pos[0]).toBeCloseTo(3, 1);
        expect(run.worlds.d1.pos[1]).toBeCloseTo(2, 1);
        expect(run.worlds.d2.pos[0]).toBeCloseTo(2, 1);
        expect(run.worlds.d2.pos[1]).toBeCloseTo(2, 1);
        expect(run.worlds.d1.fsm).toBe('IDLE');
        expect(run.worlds.d2.fsm).toBe('IDLE');
    });

    withSwarmPython('программа не мешает чужим: ожидание телеметрии на одном дроне, второй летит', () => {
        const run = runSwarm(scenario(`
waiter = await start('d1', '''
from pioneer_swarm import PioneerSwarmUnit
swarm = PioneerSwarmUnit()
result = swarm.get_telemetry_from_unit('pioneer2', timeout_sec=30)
print('данные', result[1]['navigation/local/position'].z > 0.5)
''')
flyer = await start('d2', '''
from pioneer_sdk2 import Pioneer
import time
pioneer = Pioneer()
pioneer.arm()
pioneer.takeoff()
time.sleep(2)
pioneer.land()
''')
await flyer
await waiter
`));
        expect(run.error).toBeNull();
        expect(run.errors).toEqual({});
        expect(run.worlds.d2.fsm).toBe('IDLE');
        expect(run.out.d1?.length).toBe(1);
    });
});
