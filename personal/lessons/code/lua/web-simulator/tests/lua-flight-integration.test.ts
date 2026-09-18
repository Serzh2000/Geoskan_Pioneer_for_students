import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';

describe('Lua flight with the simulator bridge and timer scheduler', () => {
    let runtime: typeof import('../public/modules/lua/runtime.js');
    let fsm: typeof import('../public/modules/autopilot/fsm.js');
    let processCommandQueue: typeof import('../public/modules/physics/commands.js').processCommandQueue;
    let updatePhysics: typeof import('../public/modules/physics/index.js').updatePhysics;
    let drone: ReturnType<typeof import('../public/modules/core/state.js').createDroneState>;

    beforeAll(async () => {
        (globalThis as any).window = {};
        (globalThis as any).document = {
            getElementById: () => null,
            createElement: () => ({ append: () => {}, appendChild: () => {} })
        };
        // @ts-expect-error The underlying Lua VM has no TypeScript declarations.
        const fengari = await import('fengari');
        jest.unstable_mockModule('fengari-web', () => fengari);
        const state = await import('../public/modules/core/state.js');
        runtime = await import('../public/modules/lua/runtime.js');
        fsm = await import('../public/modules/autopilot/fsm.js');
        ({ processCommandQueue } = await import('../public/modules/physics/commands.js'));
        ({ updatePhysics } = await import('../public/modules/physics/index.js'));
        drone = state.createDroneState('flight_integration', 'Flight integration');
    });

    afterEach(() => runtime.stopLuaScript(drone.id));

    test('supports the official global HSV API and short positive delays', () => {
        drone.running = true;
        runtime.runLuaScript(drone.id, `
            local r, g, b = fromHSV(120, 100, 10)
            assert(r == 0 and math.abs(g - 0.1) < 0.000001 and b == 0)
            r, g, b = Ledbar.fromHSV(360, 100, 100)
            assert(r == 1 and g == 0 and b == 0)
            Timer.callLater(0.003, function() end)
        `);
        expect(drone.running).toBe(true);
        expect(drone.timers[0].trigger_time - drone.current_time).toBeCloseTo(0.003);
    });

    test('timed square runs once through landing and disarming', () => {
        drone.running = true;
        runtime.runLuaScript(drone.id, readFileSync(new URL('../examples/timed-square-flight.lua', import.meta.url), 'utf8'));
        processCommandQueue(drone, drone.id);
        expect(drone.fsmState).toBe('PREFLIGHT');
        expect(drone.timers).toHaveLength(9);
        drone.current_time = 1;
        runtime.updateTimers();
        processCommandQueue(drone, drone.id);
        expect(drone.fsmState).toBe('TAKEOFF_PROCESS');
        drone.current_time = 4.4;
        drone.pos = { ...drone.target_pos };
        fsm.completeTakeoff(drone);
        runtime.triggerLuaCallback(drone.id, 6);
        fsm.completePointReached(drone);
        runtime.triggerLuaCallback(drone.id, 10);
        expect(drone.timers).toHaveLength(8);
        const points = [[0, 1], [1, 1], [1, -1], [-1, -1], [-1, 1], [0, 1]];
        points.forEach(([x, y], index) => {
            drone.current_time = 20 + index * 10;
            runtime.updateTimers();
            expect(drone.running).toBe(true);
            expect(drone.target_pos).toEqual({ x, y, z: 1 });
            drone.pos = { ...drone.target_pos };
            fsm.completePointReached(drone);
            runtime.triggerLuaCallback(drone.id, 10);
            expect(drone.timers).toHaveLength(7 - index);
        });
        drone.current_time = 80;
        runtime.updateTimers();
        processCommandQueue(drone, drone.id);
        expect(drone.fsmState).toBe('LANDING_PROCESS');
        drone.pos.z = 0;
        fsm.completeLanding(drone);
        runtime.triggerLuaCallback(drone.id, 7);
        drone.current_time = 90;
        runtime.updateTimers();
        processCommandQueue(drone, drone.id);
        expect(drone.fsmState).toBe('IDLE');
        expect(drone.running).toBe(true);
        expect(drone.timers).toHaveLength(0);
    });

    test('accepts the real Pioneer callback route with delayed points', () => {
        drone.fsmState = 'IDLE';
        drone.status = 'IDLE';
        drone.current_time = 0;
        drone.timers = [];
        drone.command_queue = [];
        drone.tickCommandSignature = null;
        const script = `
            ap.push(Ev.MCE_PREFLIGHT)
            Timer.callLater(1, function()
                ap.push(Ev.MCE_TAKEOFF)
            end)

            function callback(event)
                if event == Ev.TAKEOFF_COMPLETE then
                    ap.goToLocalPoint(0, 0, 1)
                end
                Timer.callLater(20, function()
                    ap.goToLocalPoint(1, 0, 1)
                end)
                Timer.callLater(30, function()
                    ap.goToLocalPoint(1, 1, 1)
                end)
                Timer.callLater(40, function()
                    ap.goToLocalPoint(0, 1, 1)
                end)
                Timer.callLater(50, function()
                    ap.goToLocalPoint(0, 0, 1)
                end)
                Timer.callLater(90, function()
                    ap.push(Ev.ENGINES_DISARM)
                end)
            end
        `;
        drone.running = true;
        runtime.runLuaScript(drone.id, script);
        processCommandQueue(drone, drone.id);
        expect(drone.fsmState).toBe('PREFLIGHT');
        expect(drone.timers).toHaveLength(1);

        drone.current_time = 1;
        runtime.updateTimers();
        processCommandQueue(drone, drone.id);
        expect(drone.fsmState).toBe('TAKEOFF_PROCESS');
        drone.pos = { ...drone.target_pos };
        fsm.completeTakeoff(drone);
        runtime.triggerLuaCallback(drone.id, 6);
        expect(drone.timers).toHaveLength(5);
        expect(drone.luaDiagnostics.lastFailureReason).toBeNull();
    });

    test('runs the real route through the physics clock without timer warnings', () => {
        drone.fsmState = 'IDLE';
        drone.status = 'IDLE';
        drone.current_time = 0;
        drone.pos = { x: 0, y: 0, z: 0 };
        drone.timers = [];
        drone.command_queue = [];
        drone.tickCommandSignature = null;
        const script = `
            ap.push(Ev.MCE_PREFLIGHT)
            Timer.callLater(1, function() ap.push(Ev.MCE_TAKEOFF) end)
            function callback(event)
                if event == Ev.TAKEOFF_COMPLETE then ap.goToLocalPoint(0, 0, 1) end
                Timer.callLater(20, function() ap.goToLocalPoint(1, 0, 1) end)
                Timer.callLater(30, function() ap.goToLocalPoint(1, 1, 1) end)
                Timer.callLater(40, function() ap.goToLocalPoint(0, 1, 1) end)
                Timer.callLater(50, function() ap.goToLocalPoint(0, 0, 1) end)
                Timer.callLater(90, function() ap.push(Ev.ENGINES_DISARM) end)
            end
        `;
        drone.running = true;
        runtime.runLuaScript(drone.id, script);
        for (let tick = 0; tick < 2100; tick += 1) updatePhysics(0.05);
        expect(drone.luaDiagnostics.lastFailureReason).toBeNull();
        expect(drone.luaDiagnostics.recentLogs.filter(log => /warning|error/i.test(log.message))).toEqual([]);
    });
});
