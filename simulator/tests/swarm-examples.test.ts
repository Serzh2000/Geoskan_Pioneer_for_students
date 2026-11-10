/**
 * Примеры Swarm Kit (examples/python-onboard/swarm): каждый запускается как программа ученика - через тот же
 * преобразователь __SimAsyncify, что и в браузере, - на нужных дронах против поддельного мира. Примеры из двух частей
 * (ведущий/ведомый, ping/pong ...) лежат отдельными файлами и запускаются на разных дронах, как это делает ученик.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runSwarm, withSwarmPython, type SwarmDroneSpec } from './helpers/swarm-runtime.js';

const ROOT = path.resolve(process.cwd(), '..', 'examples', 'python-onboard', 'swarm');
const COPY = path.resolve(process.cwd(), 'examples-python-swarm');
const FILES = fs.existsSync(ROOT) ? fs.readdirSync(ROOT).filter((name) => name.endsWith('.py')).sort() : [];
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const literal = (file: string) => JSON.stringify(read(file));

const THREE: SwarmDroneSpec[] = [
    { id: 'd1', name: 'Пионер Мини 2 · 1', machine_id: 'pioneer1' },
    { id: 'd2', name: 'Пионер Мини 2 · 2', machine_id: 'pioneer2' },
    { id: 'd3', name: 'Пионер Базовый 3', model: 'pioneer-basic', machine_id: 'pioneer3' }
];

/** Запускает программы по порядку (сначала те, что ждут), дожидается всех. Порядок - как у ученика: сначала получатели. */
function runPrograms(programs: Array<[drone: string, file: string]>, options: { drones?: SwarmDroneSpec[]; seconds?: number; extra?: string } = {}) {
    const starts = programs.map(([drone, file], index) => `t${index} = await start('${drone}', ${literal(file)})`).join('\n    ');
    const waits = programs.map((_, index) => `await t${index}`).join('\n    ');
    return runSwarm(`
async def main():
    ${starts}
    ${options.extra ?? ''}
    ${waits}
`, { drones: options.drones ?? THREE, seconds: options.seconds ?? 300 });
}

describe('примеры Swarm Kit', () => {
    test('набор: 10 тем, понятные имена, копия в simulator/examples-python-swarm совпадает', () => {
        expect(FILES.length).toBeGreaterThanOrEqual(10);
        expect(FILES.every((name) => /^swarm_\d\d_[a-z0-9_]+\.py$/.test(name))).toBe(true);
        expect(new Set(FILES.map((name) => name.slice(6, 8))).size).toBe(10);
        for (const file of FILES) expect(fs.readFileSync(path.join(COPY, file), 'utf8')).toBe(read(file));
        expect(fs.readdirSync(COPY).filter((name) => name.endsWith('.py'))).toEqual(FILES);
    });

    test.each(FILES)('%s: начинается с комментария-описания, использует pioneer_swarm и закрывает соединение', (file) => {
        const code = read(file);
        expect(code.startsWith('#')).toBe(true);
        expect(code).toMatch(/^from pioneer_swarm import PioneerSwarmUnit/m);
        expect(code).toMatch(/swarm\.close\(\)/);
        // Части одного примера называют друг друга в шапке: ученик знает, что запускать на втором дроне.
        if (/_(ping|pong|sender|receiver|leader|follower|commander|wingman|conductor|player|searcher|rescuer)\.py$/.test(file)) expect(code.split('\n').slice(0, 4).join(' ')).toMatch(/swarm_\d\d_\w+\.py/);
    });

    withSwarmPython('01: печатает свой id, тип AERO и список соседей', () => {
        const run = runPrograms([['d1', 'swarm_01_who_is_here.py']]);
        expect(run.error).toBeNull();
        expect(run.errors).toEqual({});
        const out = run.out.d1;
        expect(out[0]).toBe('Я: pioneer1');
        expect(out[1]).toContain('SwarmUnitType.AERO');
        expect(out.slice(2)).toEqual([0, 1, 2, 3, 4].map((second) => `${second} соседей: 2 ['pioneer2', 'pioneer3']`));
    });

    withSwarmPython('02: ping-pong - пять ответов', () => {
        const run = runPrograms([['d2', 'swarm_02_ping_pong_pong.py'], ['d1', 'swarm_02_ping_pong_ping.py']], { drones: THREE.slice(0, 2) });
        expect(run.error).toBeNull();
        expect(run.errors).toEqual({});
        expect(run.out.d1.filter((line) => line.startsWith('Ответ от pioneer2 : pong'))).toHaveLength(5);
        expect(run.out.d2.filter((line) => line.startsWith('Получил от pioneer1 : ping'))).toHaveLength(5);
    });

    withSwarmPython('03: рассылка - письмо получили оба соседа, несуществующему юниту - False', () => {
        const run = runPrograms([['d2', 'swarm_03_broadcast_receiver.py'], ['d3', 'swarm_03_broadcast_receiver.py'], ['d1', 'swarm_03_broadcast_sender.py']]);
        expect(run.error).toBeNull();
        expect(run.errors).toEqual({});
        expect(run.out.d1).toEqual(['Соседей: 2 , доставлено: 2', 'Юниту pioneer99: False']);
        expect(run.out.d2).toContain('pioneer2 получил от pioneer1 : Всем привет от pioneer1');
        expect(run.out.d3).toContain('pioneer3 получил сообщений: 1');
    });

    withSwarmPython('04: телеметрия соседей - позиция, высота, батарея, состояние полёта', () => {
        const run = runPrograms([['d1', 'swarm_04_neighbour_telemetry.py']], { extra: "worlds['d2'].pos = [1.5, -2.0, 0.0]" });
        expect(run.error).toBeNull();
        expect(run.errors).toEqual({});
        const out = run.out.d1;
        expect(out).toContain('pioneer2 : позиция (1.50, -2.00, 0.00) м');
        expect(out.some((line) => line.includes('батарея 7.90 В') && line.includes('состояние полёта 0'))).toBe(true);
        expect(out.some((line) => line.startsWith('pioneer3 : позиция'))).toBe(true);
        expect(out.find((line) => line.includes('потоков: 8'))).toContain('navigation/local/position');
    });

    withSwarmPython('05: ведомый держится в метре позади ведущего, оба садятся', () => {
        const run = runPrograms([['d2', 'swarm_05_follow_follower.py'], ['d1', 'swarm_05_follow_leader.py']], { drones: THREE.slice(0, 2) });
        expect(run.error).toBeNull();
        expect(run.errors).toEqual({});
        expect(run.out.d1.filter((line) => line.startsWith('Ведущий в точке'))).toHaveLength(4);
        expect(run.worlds.d1.fsm).toBe('IDLE');
        expect(run.worlds.d2.fsm).toBe('IDLE');
        expect(run.worlds.d2.pos[0]).toBeCloseTo(run.worlds.d1.pos[0] - 1, 0);
        expect(run.worlds.d2.pos[1]).toBeCloseTo(run.worlds.d1.pos[1], 0);
    });

    withSwarmPython('06: синхронный взлёт - все ведомые готовы, взлетают после отсчёта и садятся', () => {
        const run = runPrograms([['d2', 'swarm_06_sync_takeoff_wingman.py'], ['d3', 'swarm_06_sync_takeoff_wingman.py'], ['d1', 'swarm_06_sync_takeoff_commander.py']]);
        expect(run.error).toBeNull();
        expect(run.errors).toEqual({});
        expect(run.out.d1).toEqual(expect.arrayContaining(['pioneer2 готов', 'pioneer3 готов', 'Взлёт через 3', 'Взлёт через 1', 'Все в воздухе']));
        expect(run.out.d2).toContain('pioneer2 в воздухе');
        expect(run.out.d3).toContain('pioneer3 в воздухе');
        const takeoffs = run.calls.filter((call) => call[1] === 'takeoff');
        expect(takeoffs).toHaveLength(3);
        for (const drone of ['d1', 'd2', 'd3']) expect(run.worlds[drone].fsm).toBe('IDLE');
    });

    withSwarmPython('06: если командира нет, ведомый не взлетает', () => {
        const run = runSwarm(`
async def main():
    task = await start('d2', ${literal('swarm_06_sync_takeoff_wingman.py')})
    await sim_sleep(5)
    js.cancelled.add('d2')
    await task
`, { drones: THREE.slice(0, 2) });
        expect(run.errors).toEqual({});
        expect(run.calls.filter((call) => call[1] === 'takeoff')).toEqual([]);
    });

    withSwarmPython('07: световое шоу - игроки повторяют цвета дирижёра и гаснут по «off»', () => {
        const run = runPrograms([['d2', 'swarm_07_led_show_player.py'], ['d3', 'swarm_07_led_show_player.py'], ['d1', 'swarm_07_led_show_conductor.py']]);
        expect(run.error).toBeNull();
        expect(run.errors).toEqual({});
        expect(run.out.d2).toEqual(expect.arrayContaining(['pioneer2 : red', 'pioneer2 : green', 'pioneer2 : blue', 'pioneer2 : white', 'pioneer2 : off']));
        const colours = (drone: string) => run.calls.filter((call) => call[0] === drone && call[1] === 'led').map((call) => (call[2] as number[]).slice(1));
        expect(colours('d3').slice(0, 4)).toEqual([[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 255]]);
        for (const drone of ['d1', 'd2', 'd3']) expect(run.worlds[drone].leds['255']).toEqual([0, 0, 0]);
    });

    withSwarmPython('08: строй - ведомые занимают свои места относительно ведущего', () => {
        const run = runPrograms([['d2', 'swarm_08_formation_follower.py'], ['d3', 'swarm_08_formation_follower.py'], ['d1', 'swarm_05_follow_leader.py']], { seconds: 400 });
        expect(run.error).toBeNull();
        expect(run.errors).toEqual({});
        expect(run.out.d2[0]).toBe('pioneer2 : моё место в строю -1.0 1.0');
        expect(run.out.d3[0]).toBe('pioneer3 : моё место в строю -1.0 -1.0');
        const [lx, ly] = run.worlds.d1.pos;
        expect(run.worlds.d2.pos[0]).toBeCloseTo(lx - 1, 0);
        expect(run.worlds.d2.pos[1]).toBeCloseTo(ly + 1, 0);
        expect(run.worlds.d3.pos[0]).toBeCloseTo(lx - 1, 0);
        expect(run.worlds.d3.pos[1]).toBeCloseTo(ly - 1, 0);
    });

    withSwarmPython('09: поиск и спасение - разведчик находит точку, спасатель прилетает к ней и зажигает зелёный', () => {
        const run = runPrograms([['d2', 'swarm_09_rescue_rescuer.py'], ['d1', 'swarm_09_rescue_searcher.py']], { drones: THREE.slice(0, 2), seconds: 400 });
        expect(run.error).toBeNull();
        expect(run.errors).toEqual({});
        const found = run.out.d1.find((line) => line.startsWith('Пострадавший найден около'));
        expect(found).toBeDefined();
        const [fx, fy] = found!.split(' ').slice(-2).map(Number);
        expect(Math.hypot(fx - 2, fy - 2)).toBeLessThan(0.9);
        expect(run.out.d2).toContain('Спасатель на месте');
        expect(run.worlds.d2.pos[0]).toBeCloseTo(fx, 0);
        expect(run.worlds.d2.pos[1]).toBeCloseTo(fy, 0);
        expect(run.worlds.d2.leds['255']).toEqual([0, 255, 0]);
        expect(run.worlds.d1.fsm).toBe('IDLE');
        expect(run.worlds.d2.fsm).toBe('IDLE');
    });

    withSwarmPython('10: монитор замечает, что юнит пропал (через ~3 с после удаления дрона)', () => {
        const run = runPrograms([['d1', 'swarm_10_monitor.py']], { extra: 'await sim_sleep(6)\n    remove_drone("d2")' });
        expect(run.error).toBeNull();
        expect(run.errors).toEqual({});
        const out = run.out.d1;
        expect(out).toEqual(expect.arrayContaining(['+ в сети: pioneer2', '+ в сети: pioneer3', '- пропал: pioneer2']));
        expect(out.some((line) => line.startsWith('   pioneer3: высота 0.00 м, батарея 7.90 В'))).toBe(true);
        expect(out.indexOf('- пропал: pioneer2')).toBeGreaterThan(out.indexOf('+ в сети: pioneer2'));
    });
});
