import { jest } from '@jest/globals';

describe('python pioneer-js-bridge (pioneer_arm / pioneer_takeoff / pioneer_land)', () => {
    let createDroneState: typeof import('../public/modules/core/state.js').createDroneState;
    let resetState: typeof import('../public/modules/core/state.js').resetState;
    let setDroneFsmState: typeof import('../public/modules/autopilot/fsm.js').setDroneFsmState;
    let syncAutopilotRuntimeFromValues: typeof import('../public/modules/autopilot/params-runtime.js').syncAutopilotRuntimeFromValues;
    let installJsRuntimeAPI: typeof import('../public/modules/python/pioneer-js-bridge.js').installJsRuntimeAPI;
    let cancelledRuns: typeof import('../public/modules/python/runtime-shared.js').cancelledRuns;
    let drone: ReturnType<typeof import('../public/modules/core/state.js').createDroneState>;
    let w: any;

    beforeAll(async () => {
        const logsEl = {
            appendChild: () => {},
            scrollTop: 0,
            scrollHeight: 0
        };

        // The bridge module transitively pulls in fengari (for triggerLuaCallback) and the
        // three.js-based rendering stack (for showDronePrintBubble); neither is exercised by
        // pioneer_arm/pioneer_takeoff/pioneer_land themselves (they never touch drone.luaState
        // or the 3D scene), so a minimal structural stub is enough to satisfy the import graph.
        jest.unstable_mockModule('fengari-web', () => ({
            lua: {},
            lauxlib: {},
            lualib: {},
            to_luastring: (value: string) => value,
            to_jsstring: (value: unknown) => value
        }));

        w = { addEventListener: () => {} };
        (globalThis as any).window = w;
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

        ({ createDroneState, resetState } = await import('../public/modules/core/state.js'));
        ({ setDroneFsmState } = await import('../public/modules/autopilot/fsm.js'));
        ({ syncAutopilotRuntimeFromValues } = await import('../public/modules/autopilot/params-runtime.js'));
        ({ installJsRuntimeAPI } = await import('../public/modules/python/pioneer-js-bridge.js'));
        ({ cancelledRuns } = await import('../public/modules/python/runtime-shared.js'));

        installJsRuntimeAPI();
        drone = createDroneState('pioneer_bridge_test_drone', 'Pioneer Bridge Test Drone');
    });

    beforeEach(() => {
        resetState(drone.id);
        drone.running = true;
        syncAutopilotRuntimeFromValues({});
        delete cancelledRuns[drone.id];
    });

    test('pioneer_arm() moves an IDLE drone into PREFLIGHT', () => {
        const result = w.pioneer_arm(drone.id);

        expect(result).toBe(true);
        expect(drone.fsmState).toBe('PREFLIGHT');
        expect(drone.preflightDeadlineMs).not.toBeNull();
    });

    test('pioneer_arm() throws PYTHON_CANCELLED when the run has been cancelled', () => {
        cancelledRuns[drone.id] = true;

        expect(() => w.pioneer_arm(drone.id)).toThrow('PYTHON_CANCELLED');
        expect(drone.fsmState).toBe('IDLE');
    });

    test('pioneer_takeoff() moves a PREFLIGHT drone into TAKEOFF_PROCESS', () => {
        w.pioneer_arm(drone.id);
        drone.current_time += 1; // separate tick: PREFLIGHT + TAKEOFF in the same tick is rejected as simultaneous

        const result = w.pioneer_takeoff(drone.id);

        expect(result).toBe(true);
        expect(drone.fsmState).toBe('TAKEOFF_PROCESS');
        expect(drone.target_pos.z).toBeGreaterThanOrEqual(1);
    });

    test('pioneer_takeoff() is rejected (not thrown) when called before pioneer_arm()', () => {
        expect(drone.fsmState).toBe('IDLE');

        const result = w.pioneer_takeoff(drone.id);

        expect(result).toBe(false);
        expect(drone.fsmState).toBe('IDLE');
    });

    test('pioneer_land() moves an airborne drone into LANDING_PROCESS', () => {
        setDroneFsmState(drone, 'FLYING_HOVER');

        const result = w.pioneer_land(drone.id);

        expect(result).toBe(true);
        expect(drone.fsmState).toBe('LANDING_PROCESS');
    });

    test('pioneer_land() throws PYTHON_CANCELLED when the run has been cancelled', () => {
        setDroneFsmState(drone, 'FLYING_HOVER');
        cancelledRuns[drone.id] = true;

        expect(() => w.pioneer_land(drone.id)).toThrow('PYTHON_CANCELLED');
    });

    test('unlike ap.push(), the python mission calls never go through drone.command_queue', () => {
        // Known asymmetry flagged by a prior autopilot audit: the Lua bridge (ap_push, see
        // tests/lua-autopilot.test.ts) enqueues onto drone.command_queue, but the python
        // bridge calls enterPreflight/enterTakeoffProcess/enterLandingProcess directly and
        // never touches command_queue at all. Documented here, not fixed (out of scope).
        w.pioneer_arm(drone.id);
        drone.current_time += 1;
        w.pioneer_takeoff(drone.id);

        expect(drone.command_queue).toEqual([]);
    });
});
