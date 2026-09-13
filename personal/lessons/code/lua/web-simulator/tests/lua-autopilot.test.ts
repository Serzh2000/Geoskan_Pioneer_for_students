import { jest } from '@jest/globals';

describe('lua autopilot bridge (ap_push / ap_goToLocalPoint)', () => {
    const ERROR_STATUS = 'ОШИБКА';
    const TEST_DRONE_ID = 'autopilot_test_drone';

    let createDroneState: typeof import('../public/modules/core/state.js').createDroneState;
    let resetState: typeof import('../public/modules/core/state.js').resetState;
    let setDroneFsmState: typeof import('../public/modules/autopilot/fsm.js').setDroneFsmState;
    let resetLuaMissionGuard: typeof import('../public/modules/lua/mission-guard.js').resetLuaMissionGuard;
    let MCECommands: typeof import('../public/modules/autopilot/mce-events.js').MCECommands;
    let ap_push: typeof import('../public/modules/lua/autopilot.js').ap_push;
    let ap_goToLocalPoint: typeof import('../public/modules/lua/autopilot.js').ap_goToLocalPoint;
    let setLocalFrameOrigin: typeof import('../public/modules/lua/autopilot.js').setLocalFrameOrigin;
    let drone: ReturnType<typeof import('../public/modules/core/state.js').createDroneState>;

    // --- fengari-web mock control knobs ---
    let topValue = 4;
    const tointegerValues: Record<number, number> = {};
    const tonumberValues: Record<number, number> = {};
    const FAKE_L = { marker: 'fake-lua-state' };

    beforeAll(async () => {
        const logsEl = {
            appendChild: () => {},
            scrollTop: 0,
            scrollHeight: 0
        };

        jest.unstable_mockModule('fengari-web', () => ({
            lua: {
                lua_gettop: () => topValue,
                lua_tointeger: (_L: any, index: number) => tointegerValues[index] ?? 0,
                lua_tonumber: (_L: any, index: number) => tonumberValues[index] ?? 0,
                lua_getglobal: () => {},
                lua_tostring: () => TEST_DRONE_ID,
                lua_pop: () => {}
            },
            to_luastring: (value: string) => value,
            to_jsstring: (value: unknown) => value
        }));

        (globalThis as any).window = {};
        (globalThis as any).document = {
            getElementById: (id: string) => (id === 'logs' ? logsEl : null),
            createElement: () => ({
                className: '',
                textContent: '',
                append: () => {}
            })
        };

        ({ createDroneState, resetState } = await import('../public/modules/core/state.js'));
        ({ setDroneFsmState } = await import('../public/modules/autopilot/fsm.js'));
        ({ resetLuaMissionGuard } = await import('../public/modules/lua/mission-guard.js'));
        ({ MCECommands } = await import('../public/modules/autopilot/mce-events.js'));
        ({ ap_push, ap_goToLocalPoint, setLocalFrameOrigin } = await import('../public/modules/lua/autopilot.js'));

        drone = createDroneState(TEST_DRONE_ID, 'Autopilot Test Drone');
    });

    beforeEach(() => {
        resetState(drone.id);
        drone.running = true;
        // Bypass the "first mission command without callback(event)" guard so tests
        // focus purely on the push/queue mechanism rather than the mission-guard rules
        // (those are covered separately in tests/lua-mission-guard.test.ts).
        resetLuaMissionGuard(drone, 'function callback(event) end');
        setLocalFrameOrigin(0, 0, 0);
        topValue = 4;
        for (const key of Object.keys(tointegerValues)) delete tointegerValues[Number(key)];
        for (const key of Object.keys(tonumberValues)) delete tonumberValues[Number(key)];
    });

    describe('ap_push', () => {
        test('enqueues the MCE command onto drone.command_queue', () => {
            tointegerValues[1] = MCECommands.MCE_PREFLIGHT;

            const result = ap_push(FAKE_L);

            expect(result).toBe(0);
            expect(drone.command_queue).toHaveLength(1);
            expect(drone.command_queue[0]).toMatchObject({
                commandId: MCECommands.MCE_PREFLIGHT,
                source: 'direct'
            });
        });

        test('does nothing when called without arguments', () => {
            topValue = 0;

            ap_push(FAKE_L);

            expect(drone.command_queue).toHaveLength(0);
        });

        test('throws the simultaneous-commands error when two conflicting commands are pushed in the same tick', () => {
            drone.current_time = 1.0;
            tointegerValues[1] = MCECommands.MCE_PREFLIGHT;
            ap_push(FAKE_L);
            expect(drone.command_queue).toHaveLength(1);

            tointegerValues[1] = MCECommands.MCE_TAKEOFF;
            expect(() => ap_push(FAKE_L)).toThrow(/run at the same time/);

            expect(drone.running).toBe(false);
            expect(drone.status).toBe(ERROR_STATUS);
            expect(drone.fsmState).toBe('IDLE');
            expect(drone.command_queue).toEqual([]);
        });

        test('allows the SDK-compatible takeoff -> goToLocalPoint command pairing in the same tick', () => {
            // Mirrors tests/fsm.test.ts's "allows SDK-compatible instantaneous TAKEOFF ->
            // goToLocalPoint sequence": recordTickCommand() treats (takeoff, goToLocalPoint)
            // as a compatible same-tick pair, so this must not hit the simultaneous-commands
            // guard even though the drone is still IDLE (the FSM transition itself is a
            // separate concern, asserted on its own in the "ap_goToLocalPoint" tests below).
            drone.current_time = 2.0;
            tointegerValues[1] = MCECommands.MCE_TAKEOFF;
            ap_push(FAKE_L);
            expect(drone.command_queue).toHaveLength(1);

            tonumberValues[1] = 1;
            tonumberValues[2] = 0;
            tonumberValues[3] = 1;
            topValue = 3;

            expect(() => ap_goToLocalPoint(FAKE_L)).not.toThrow();
            expect(drone.running).toBe(true);
        });
    });

    describe('ap_goToLocalPoint', () => {
        test('accepts the request while hovering and moves the drone toward the target', () => {
            setDroneFsmState(drone, 'FLYING_HOVER');
            tonumberValues[1] = 1;
            tonumberValues[2] = 2;
            tonumberValues[3] = 3;
            topValue = 3;

            ap_goToLocalPoint(FAKE_L);

            expect(drone.fsmState).toBe('FLYING_MOVING');
            expect(drone.target_pos).toEqual({ x: 1, y: 2, z: 3 });
        });

        test('honors a non-zero local frame origin', () => {
            setLocalFrameOrigin(10, 20, 0);
            setDroneFsmState(drone, 'FLYING_HOVER');
            tonumberValues[1] = 1;
            tonumberValues[2] = 1;
            tonumberValues[3] = 1;
            topValue = 3;

            ap_goToLocalPoint(FAKE_L);

            expect(drone.target_pos).toEqual({ x: 11, y: 21, z: 1 });
        });

        test('is rejected on the ground and does not throw', () => {
            expect(drone.fsmState).toBe('IDLE');
            tonumberValues[1] = 1;
            tonumberValues[2] = 1;
            tonumberValues[3] = 1;
            topValue = 3;

            expect(() => ap_goToLocalPoint(FAKE_L)).not.toThrow();

            expect(drone.fsmState).toBe('IDLE');
        });

        test('does nothing when called with fewer than 3 arguments', () => {
            topValue = 2;
            setDroneFsmState(drone, 'FLYING_HOVER');
            const originalTarget = { ...drone.target_pos };

            ap_goToLocalPoint(FAKE_L);

            expect(drone.target_pos).toEqual(originalTarget);
        });
    });
});
