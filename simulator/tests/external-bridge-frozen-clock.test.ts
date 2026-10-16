import { jest } from '@jest/globals';

/**
 * Регрессия на idle-bridge-sync: внешний Python/IDLE управляет дроном, пока вкладка
 * симулятора находится в фоне.
 *
 * В фоне браузер полностью останавливает requestAnimationFrame, поэтому updatePhysics не
 * вызывается и drone.current_time (СИМУЛИРОВАННОЕ время) замирает. Защита от одновременных
 * команд сравнивает команды по тику именно этого времени, из-за чего arm() и takeoff(),
 * разнесённые в реальности на секунды, попадали в один тик и роняли миссию в IDLE с
 * CRITICAL ERROR — а поллинг моста гасил исключение молча.
 *
 * Тест воспроизводит именно замерший таймер: current_time не меняется между командами.
 */
describe('external bridge commands with a frozen simulation clock (backgrounded tab)', () => {
    const TEST_DRONE_ID = 'drone_1';

    let drones: typeof import('../public/modules/core/state.js').drones;
    let ensureDronePythonConnectionSettings: typeof import('../public/modules/core/state.js').ensureDronePythonConnectionSettings;
    let resetState: typeof import('../public/modules/core/state.js').resetState;
    let installJsRuntimeAPI: typeof import('../public/modules/python/pioneer-js-bridge.js').installJsRuntimeAPI;
    let applyExternalEvent: typeof import('../public/modules/python/external-bridge-runtime.js').applyExternalEvent;
    let updateActiveFlight: typeof import('../public/modules/physics/flight-update.js').updateActiveFlight;
    let checkPhysicsEvents: typeof import('../public/modules/physics/events.js').checkPhysicsEvents;
    let bridgeState: import('../public/modules/python/external-bridge-binding.js').ExternalBridgeState;

    let nextEventId = 0;

    function makeEvent(method: string, args: unknown[] = [], kwargs: Record<string, unknown> = {}) {
        nextEventId += 1;
        return {
            id: nextEventId,
            sessionId: 'frozen-clock-session',
            timestamp: new Date().toISOString(),
            droneName: 'pioneer',
            droneIp: '127.0.0.1',
            mavlinkPort: 8001,
            connectionMethod: 'udpout' as const,
            device: '/dev/serial0',
            baud: 115200,
            method,
            args,
            kwargs
        };
    }

    const allowAll = () => true;

    beforeAll(async () => {
        const logsEl = { appendChild: () => {}, scrollTop: 0, scrollHeight: 0 };

        jest.unstable_mockModule('fengari-web', () => ({
            lua: {},
            lauxlib: {},
            lualib: {},
            to_luastring: (value: string) => value,
            to_jsstring: (value: unknown) => value
        }));

        (globalThis as any).window = { addEventListener: () => {}, dispatchEvent: () => {} };
        (globalThis as any).document = {
            getElementById: (id: string) => (id === 'logs' ? logsEl : null),
            createElement: () => ({
                className: '',
                textContent: '',
                style: {},
                classList: { add: () => {}, remove: () => {} },
                append: () => {}
            }),
            addEventListener: () => {}
        };
        (globalThis as any).performance = globalThis.performance || { now: () => Date.now() };

        ({ drones, ensureDronePythonConnectionSettings, resetState } = await import('../public/modules/core/state.js'));
        ({ installJsRuntimeAPI } = await import('../public/modules/python/pioneer-js-bridge.js'));
        ({ applyExternalEvent } = await import('../public/modules/python/external-bridge-runtime.js'));
        ({ updateActiveFlight } = await import('../public/modules/physics/flight-update.js'));
        ({ checkPhysicsEvents } = await import('../public/modules/physics/events.js'));

        installJsRuntimeAPI();
    });

    beforeEach(() => {
        resetState(TEST_DRONE_ID);
        const connection = ensureDronePythonConnectionSettings(TEST_DRONE_ID);
        connection.allowExternalBridge = true;
        connection.ip = '192.168.4.1';
        connection.mavlinkPort = 8001;
        connection.cameraPort = 18001;
        connection.connectionMethod = 'udpout';
        bridgeState = { nextAfterId: 0, timerId: null, bindings: new Map() };
        nextEventId = 0;
    });

    test('arm -> takeoff -> go_to_local_point are not treated as one tick when current_time never advances', () => {
        const drone = drones[TEST_DRONE_ID];
        drone.current_time = 0;

        applyExternalEvent(bridgeState, makeEvent('__init__'), allowAll);
        expect(drone.running).toBe(true);

        // Ни одна из команд не должна бросать: в реальности они разнесены на секунды,
        // и только замерший симулированный таймер делал их "одновременными".
        applyExternalEvent(bridgeState, makeEvent('arm'), allowAll);
        expect(drone.fsmState).toBe('PREFLIGHT');

        // Таймер симуляции стоит — это и есть фоновая вкладка.
        expect(drone.current_time).toBe(0);

        applyExternalEvent(bridgeState, makeEvent('takeoff'), allowAll);
        expect(drone.fsmState).toBe('TAKEOFF_PROCESS');
        expect(drone.status).not.toBe('ОШИБКА');

        expect(drone.current_time).toBe(0);

        applyExternalEvent(bridgeState, makeEvent('go_to_local_point', [], { x: 2, y: 2, z: 2, yaw: 0 }), allowAll);
        expect(drone.fsmState).not.toBe('IDLE');
        expect(drone.status).not.toBe('ОШИБКА');
    });

    test('the drone actually climbs and moves to the commanded point once physics runs', () => {
        const drone = drones[TEST_DRONE_ID];
        drone.current_time = 0;

        applyExternalEvent(bridgeState, makeEvent('__init__'), allowAll);
        applyExternalEvent(bridgeState, makeEvent('arm'), allowAll);
        applyExternalEvent(bridgeState, makeEvent('takeoff'), allowAll);
        applyExternalEvent(bridgeState, makeEvent('go_to_local_point', [], { x: 2, y: 2, z: 2, yaw: 0 }), allowAll);

        expect(drone.pos.z).toBe(0);

        // Вкладка снова на переднем плане: физика идёт, дрон обязан реально взлететь и
        // доехать до точки (2, 2, 2).
        for (let step = 0; step < 4000; step += 1) {
            const prevPos = { ...drone.pos };
            drone.current_time += 0.016;
            updateActiveFlight(drone, TEST_DRONE_ID, 0.016, true, () => []);
            checkPhysicsEvents(drone, prevPos);
        }

        expect(drone.pos.z).toBeGreaterThan(1.5);
        expect(drone.pos.x).toBeGreaterThan(1.5);
        expect(drone.pos.y).toBeGreaterThan(1.5);
    });
});
