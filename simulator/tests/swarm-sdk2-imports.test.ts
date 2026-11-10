/**
 * pioneer_swarm (Swarm Kit) - часть SDK2: импорт разрешён в режиме pioneer_sdk2 (Мини 2 и Базовый с Radxa)
 * и отклоняется в режиме pioneer_sdk (SDK1) понятной русской ошибкой, как и rclpy.
 */
let drones: Record<string, unknown>;
let checkPythonSdkForDrone: (droneId: string, code: string) => void;
let swarmUnitRows: () => Array<{ drone: string; machine_id: string; name: string; model: string }>;
let swarmStateOf: (id: string) => Record<string, unknown> | null;
let installSwarmRuntimeAPI: (w: Record<string, unknown>) => void;
let advanceSimClock: (dt: number) => void;

beforeAll(async () => {
    const g = globalThis as Record<string, unknown>;
    if (!g.window) g.window = globalThis;
    drones = (await import('../public/modules/core/state.js')).drones as never;
    checkPythonSdkForDrone = (await import('../public/modules/python/browser-runtime.js')).checkPythonSdkForDrone;
    const bridge = await import('../public/modules/python/pioneer-swarm-bridge.js');
    swarmUnitRows = bridge.swarmUnitRows;
    swarmStateOf = bridge.swarmStateOf as never;
    installSwarmRuntimeAPI = bridge.installSwarmRuntimeAPI;
    advanceSimClock = (await import('../public/modules/physics/sim-clock.js')).advanceSimClock;
    for (const id of Object.keys(drones)) delete drones[id];
    drones['mini'] = { id: 'mini', name: 'Пионер Мини 2 · 1', model: 'pioneer-mini2', current_time: 1.5, pos: { x: 1, y: 2, z: 3 }, vel: { x: 0, y: 0, z: 0 }, accel: { x: 0, y: 0, z: 9.8 }, gyro: { x: 0, y: 0, z: 0 }, orientation: { roll: 0, pitch: 0, yaw: 0.5 }, fsmState: 'IDLE', status: 'OK', batteryVoltage: 7.9 };
    drones['basic-sdk2'] = { id: 'basic-sdk2', name: 'Пионер Базовый 2', model: 'pioneer-basic', pythonSdk: 'pioneer_sdk2' };
    drones['basic-sdk1'] = { id: 'basic-sdk1', name: 'Пионер Базовый 3', model: 'pioneer-basic' };
});

describe('Swarm Kit внутри SDK2', () => {
    const IMPORTS = ['from pioneer_swarm import PioneerSwarmUnit', 'import pioneer_swarm', 'from pioneer_swarm import PioneerSwarmUnit, SwarmUnitType'];

    test.each(IMPORTS)('SDK2: «%s» разрешён и на Мини 2, и на Базовом с Radxa', (line) => {
        for (const id of ['mini', 'basic-sdk2']) expect(() => checkPythonSdkForDrone(id, line)).not.toThrow();
    });

    test.each(IMPORTS)('SDK1: «%s» отклоняется и подсказывает «Python · SDK2»', (line) => {
        expect(() => checkPythonSdkForDrone('basic-sdk1', `import time\n${line}`)).toThrow(/Python · SDK2/);
        expect(() => checkPythonSdkForDrone('basic-sdk1', line)).toThrow(/Swarm Kit/);
    });

    test('номер строки указывает на импорт; импорты pioneer_sdk и pioneer_sdk2 ведут себя как раньше', () => {
        try {
            checkPythonSdkForDrone('basic-sdk1', 'import time\n\nfrom pioneer_swarm import PioneerSwarmUnit');
            throw new Error('не бросило');
        } catch (error) {
            expect(JSON.stringify(error)).toContain('3');
        }
        expect(() => checkPythonSdkForDrone('basic-sdk1', 'from pioneer_sdk import Pioneer')).not.toThrow();
        expect(() => checkPythonSdkForDrone('basic-sdk1', 'from pioneer_sdk2 import Pioneer')).toThrow(/Python · SDK1/);
        // Слово pioneer_swarm в тексте не принимается за импорт pioneer_sdk.
        expect(() => checkPythonSdkForDrone('basic-sdk1', '# pioneer_swarm - рой\nfrom pioneer_sdk import Pioneer')).not.toThrow();
    });

    test('мост: на связи только дроны с pioneer_sdk2, machine_id по именам', () => {
        expect(swarmUnitRows()).toEqual([
            { drone: 'mini', machine_id: 'pioneer1', name: 'Пионер Мини 2 · 1', model: 'pioneer-mini2' },
            { drone: 'basic-sdk2', machine_id: 'pioneer2', name: 'Пионер Базовый 2', model: 'pioneer-basic' }
        ]);
        expect(swarmStateOf('mini')).toMatchObject({ fsm: 'IDLE', time: 1.5, pos: [1, 2, 3], battery: 7.9 });
        expect(swarmStateOf('нет-такого')).toBeNull();
    });

    test('мост: функции окна отдают JSON, общие часы симуляции и признак существования дрона', () => {
        const w: Record<string, (...args: unknown[]) => unknown> = {};
        installSwarmRuntimeAPI(w as never);
        expect(JSON.parse(String(w.swarm_units()))).toHaveLength(2);
        expect(JSON.parse(String(w.swarm_state('mini'))).pos).toEqual([1, 2, 3]);
        expect(w.swarm_state('нет-такого')).toBe('');
        const before = w.swarm_clock() as number;
        advanceSimClock(0.25);
        expect((w.swarm_clock() as number) - before).toBeCloseTo(0.25, 9);
        expect([w.swarm_exists('mini'), w.swarm_exists('basic-sdk1'), w.swarm_exists('нет-такого')]).toEqual([true, true, false]);
    });
});
