describe('drone FSM validation', () => {
    let MCECommands: typeof import('../public/modules/autopilot/mce-events.js').MCECommands;
    let applyGoToLocalPointRequest: typeof import('../public/modules/autopilot/fsm.js').applyGoToLocalPointRequest;
    let beginEventCallbackPhase: typeof import('../public/modules/autopilot/fsm.js').beginEventCallbackPhase;
    let enterLandingProcess: typeof import('../public/modules/autopilot/fsm.js').enterLandingProcess;
    let enterPreflight: typeof import('../public/modules/autopilot/fsm.js').enterPreflight;
    let enterTakeoffProcess: typeof import('../public/modules/autopilot/fsm.js').enterTakeoffProcess;
    let handlePreflightTimeout: typeof import('../public/modules/autopilot/fsm.js').handlePreflightTimeout;
    let queueMceCommand: typeof import('../public/modules/autopilot/fsm.js').queueMceCommand;
    let setDroneFsmState: typeof import('../public/modules/autopilot/fsm.js').setDroneFsmState;
    let updateActiveFlight: typeof import('../public/modules/physics/flight-update.js').updateActiveFlight;
    let withCommandSource: typeof import('../public/modules/autopilot/fsm.js').withCommandSource;
    let createDroneState: typeof import('../public/modules/core/state.js').createDroneState;
    let resetState: typeof import('../public/modules/core/state.js').resetState;
    let simSettings: typeof import('../public/modules/core/state.js').simSettings;
    let processCommandQueue: typeof import('../public/modules/physics/commands.js').processCommandQueue;
    let drone: ReturnType<typeof import('../public/modules/core/state.js').createDroneState>;
    const logLines: string[] = [];

    beforeAll(async () => {
        const logsEl = {
            appendChild(node: { innerHTML?: string }) {
                logLines.push(String(node.innerHTML || ''));
            },
            querySelector: () => null,
            scrollTop: 0,
            scrollHeight: 0
        };

        (globalThis as any).window = {};
        (globalThis as any).document = {
            getElementById: (id: string) => (id === 'logs' ? logsEl : null),
            createElement: () => ({
                className: '',
                innerHTML: '',
                textContent: '',
                append: () => {}
            })
        };

        await import('../public/modules/shared/logging/logger.js');
        ({ MCECommands } = await import('../public/modules/autopilot/mce-events.js'));
        ({
            applyGoToLocalPointRequest,
            beginEventCallbackPhase,
            enterLandingProcess,
            enterPreflight,
            enterTakeoffProcess,
            handlePreflightTimeout,
            queueMceCommand,
            setDroneFsmState,
            withCommandSource
        } = await import('../public/modules/autopilot/fsm.js'));
        ({ updateActiveFlight } = await import('../public/modules/physics/flight-update.js'));
        ({ createDroneState, resetState, simSettings } = await import('../public/modules/core/state.js'));
        ({ processCommandQueue } = await import('../public/modules/physics/commands.js'));
        drone = createDroneState('fsm_test_drone', 'FSM Test Drone');
    });

    beforeEach(() => {
        resetState(drone.id);
        drone.running = true;
        simSettings.gamepadConnected = false;
        logLines.length = 0;
    });

    test('stops simulation on instantaneous TAKEOFF -> goToLocalPoint -> LANDING sequence', () => {
        queueMceCommand(drone, MCECommands.MCE_TAKEOFF, 'direct');
        applyGoToLocalPointRequest(drone, { x: 1, y: 0, z: 1 });

        expect(() => queueMceCommand(drone, MCECommands.MCE_LANDING, 'direct')).toThrow(
            'CRITICAL ERROR: ˜˜˜˜˜˜ ˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜˜˜˜˜! ˜˜˜ ˜˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜˜ ˜˜˜ ˜˜˜˜˜˜˜˜˜˜˜˜˜ Timer.callLater. ˜ ˜˜˜˜˜˜˜˜˜˜ ˜˜˜˜ ˜˜˜˜˜˜˜˜˜˜˜˜˜ ˜˜˜ ˜˜˜˜˜˜˜ ˜˜˜ ˜˜˜˜˜˜.'
        );
        expect(drone.running).toBe(false);
        expect(drone.status).toBe('˜˜˜˜˜˜');
    });

    test('allows next command from a new callback(event) phase in the same tick', () => {
        queueMceCommand(drone, MCECommands.MCE_PREFLIGHT, 'direct');

        expect(() => {
            beginEventCallbackPhase(drone);
            queueMceCommand(drone, MCECommands.MCE_TAKEOFF, 'direct');
        }).not.toThrow();

        expect(drone.command_queue.map((entry) => entry.commandId)).toEqual([
            MCECommands.MCE_PREFLIGHT,
            MCECommands.MCE_TAKEOFF
        ]);
    });

    test('ignores TAKEOFF outside PREFLIGHT', () => {
        expect(enterTakeoffProcess(drone)).toBe(false);
        expect(drone.fsmState).toBe('IDLE');
        expect(logLines.some((line) => line.includes('WARNING: ˜˜˜˜˜˜˜ ˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜˜˜˜˜˜˜˜: ˜˜˜˜˜˜ ˜˜ ˜˜˜˜˜˜˜˜'))).toBe(true);
    });

    test('rejects goToLocalPoint on ground', () => {
        expect(applyGoToLocalPointRequest(drone, { x: 1, y: 2, z: 1 })).toBe(false);
        expect(drone.fsmState).toBe('IDLE');
        expect(logLines.some((line) => line.includes('CRITICAL WARNING: ˜˜˜˜˜˜˜ goToLocalPoint ˜˜˜˜˜˜˜ ˜˜ ˜˜˜˜˜!'))).toBe(true);
    });

    test('throws detailed FSM error for goToLocalPoint during PREFLIGHT', () => {
        setDroneFsmState(drone, 'PREFLIGHT');

        expect(() => applyGoToLocalPointRequest(drone, { x: 1, y: 0, z: 1 })).toThrow(
            '˜˜˜˜˜˜ FSM: ˜˜˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜ ˜˜ ˜˜˜˜˜˜˜˜˜ PREFLIGHT ˜˜˜˜˜ ˜˜˜˜˜˜˜ GO_TO_LOCAL_POINT'
        );
    });

    test('returns to IDLE after PREFLIGHT timeout', () => {
        expect(enterPreflight(drone)).toBe(true);
        drone.current_time = 3.1;

        expect(handlePreflightTimeout(drone)).toBe(true);
        expect(drone.fsmState).toBe('IDLE');
        expect(logLines.some((line) => line.includes('WARNING: ˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜ ˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜.'))).toBe(true);
    });

    test('keeps manual RC arming latched without PREFLIGHT timeout while arm switch stays active', () => {
        simSettings.gamepadConnected = true;
        drone.rcChannels[4] = 1000;
        drone.rcChannels[5] = 2000;

        updateActiveFlight(drone, drone.id, 0.016, false, () => []);
        expect(drone.fsmState).toBe('PREFLIGHT');
        expect(drone.preflightDeadlineMs).toBeNull();

        drone.current_time = 10;
        expect(handlePreflightTimeout(drone)).toBe(false);
        expect(drone.fsmState).toBe('PREFLIGHT');
    });

    test('landing overwrites active movement without delay', () => {
        setDroneFsmState(drone, 'FLYING_HOVER');
        expect(applyGoToLocalPointRequest(drone, { x: 2, y: 0, z: 1 })).toBe(true);

        expect(enterLandingProcess(drone)).toBe(true);
        expect(drone.fsmState).toBe('LANDING_PROCESS');
        expect(logLines.some((line) => line.includes('WARNING: ˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜ (LANDING) ˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜ ˜ ˜˜˜˜˜'))).toBe(true);
    });

    test('ignores late timer command when FSM is incompatible', () => {
        setDroneFsmState(drone, 'LANDING_PROCESS');
        const accepted = withCommandSource(drone, 'timer', () => applyGoToLocalPointRequest(drone, { x: 1, y: 0, z: 1 }));

        expect(accepted).toBe(false);
        expect(logLines.some((line) => line.includes('WARNING: ˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜ ˜˜˜˜˜˜. ˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜˜'))).toBe(true);
    });

    test('accepts goToLocalPoint from timer when drone already hovers', () => {
        setDroneFsmState(drone, 'FLYING_HOVER');

        const accepted = withCommandSource(drone, 'timer', () => applyGoToLocalPointRequest(drone, { x: 1, y: 1, z: 1 }));

        expect(accepted).toBe(true);
        expect(drone.fsmState).toBe('FLYING_MOVING');
        expect(drone.target_pos).toEqual({ x: 1, y: 1, z: 1 });
    });

    test('throws detailed FSM error for TAKEOFF from flying state', () => {
        setDroneFsmState(drone, 'FLYING_MOVING');

        expect(() => enterTakeoffProcess(drone)).toThrow(
            '˜˜˜˜˜˜ FSM: ˜˜˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜ ˜˜ ˜˜˜˜˜˜˜˜˜ FLYING_MOVING ˜˜˜˜˜ ˜˜˜˜˜˜˜ MCE_TAKEOFF'
        );
    });

    test('processes PREFLIGHT then TAKEOFF through queued MCE commands', () => {
        queueMceCommand(drone, MCECommands.MCE_PREFLIGHT, 'direct');
        queueMceCommand(drone, MCECommands.MCE_TAKEOFF, 'direct');

        processCommandQueue(drone, drone.id);
        expect(drone.fsmState).toBe('PREFLIGHT');

        processCommandQueue(drone, drone.id);
        expect(drone.fsmState).toBe('TAKEOFF_PROCESS');
        expect(drone.target_pos.z).toBeGreaterThanOrEqual(1);
    });
});
