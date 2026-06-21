describe('drone FSM validation', () => {
    let MCECommands: typeof import('../public/modules/autopilot/mce-events.js').MCECommands;
    let applyGoToLocalPointRequest: typeof import('../public/modules/autopilot/fsm.js').applyGoToLocalPointRequest;
    let beginEventCallbackPhase: typeof import('../public/modules/autopilot/fsm.js').beginEventCallbackPhase;
    let completeTakeoff: typeof import('../public/modules/autopilot/fsm.js').completeTakeoff;
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
    let syncAutopilotRuntimeFromValues: typeof import('../public/modules/autopilot/params-runtime.js').syncAutopilotRuntimeFromValues;
    let drone: ReturnType<typeof import('../public/modules/core/state.js').createDroneState>;
    const logLines: string[] = [];
    const ERROR_STATUS = '\u041e\u0428\u0418\u0411\u041a\u0410';

    function captureLogLine(node: any): string {
        const metaChildren = Array.isArray(node?.children?.[0]?.children) ? node.children[0].children : [];
        const tag = String(metaChildren[1]?.textContent || '').trim();
        const message = String(node?.children?.[1]?.textContent || node?.textContent || node?.innerHTML || '').trim();
        return tag && message ? `${tag}: ${message}` : message;
    }

    beforeAll(async () => {
        const logsEl = {
            appendChild(node: { innerHTML?: string }) {
                logLines.push(captureLogLine(node));
            },
            querySelector: () => null,
            replaceChildren(node: any) {
                if (Array.isArray(node?.children)) {
                    node.children.forEach((child: any) => logLines.push(captureLogLine(child)));
                } else if (node) {
                    logLines.push(captureLogLine(node));
                }
            },
            scrollTop: 0,
            scrollHeight: 0
        };
        const fragment = {
            children: [] as any[],
            appendChild(node: any) {
                fragment.children.push(node);
            }
        };

        (globalThis as any).window = {};
        (globalThis as any).document = {
            getElementById: (id: string) => (id === 'logs' ? logsEl : null),
            createDocumentFragment: () => fragment,
            createElement: () => {
                const node = {
                    className: '',
                    dataset: {},
                    innerHTML: '',
                    textContent: '',
                    children: [] as any[],
                    append(...parts: any[]) {
                        node.children.push(...parts);
                        node.textContent = node.children
                            .map((part) => String(part?.textContent || part?.innerHTML || ''))
                            .join('');
                    }
                };
                return node;
            }
        };

        await import('../public/modules/shared/logging/logger.js');
        ({ MCECommands } = await import('../public/modules/autopilot/mce-events.js'));
        ({
            applyGoToLocalPointRequest,
            beginEventCallbackPhase,
            completeTakeoff,
            enterLandingProcess,
            enterPreflight,
            enterTakeoffProcess,
            handlePreflightTimeout,
            queueMceCommand,
            setDroneFsmState,
            withCommandSource
        } = await import('../public/modules/autopilot/fsm.js'));
        ({ syncAutopilotRuntimeFromValues } = await import('../public/modules/autopilot/params-runtime.js'));
        ({ updateActiveFlight } = await import('../public/modules/physics/flight-update.js'));
        ({ createDroneState, resetState, simSettings } = await import('../public/modules/core/state.js'));
        ({ processCommandQueue } = await import('../public/modules/physics/commands.js'));
        drone = createDroneState('fsm_test_drone', 'FSM Test Drone');
    });

    beforeEach(() => {
        resetState(drone.id);
        drone.running = true;
        simSettings.gamepadConnected = false;
        syncAutopilotRuntimeFromValues({});
        logLines.length = 0;
    });

    test('stops simulation on instantaneous TAKEOFF -> goToLocalPoint sequence', () => {
        queueMceCommand(drone, MCECommands.MCE_TAKEOFF, 'direct');
        expect(() => applyGoToLocalPointRequest(drone, { x: 1, y: 0, z: 1 })).toThrow(
            'CRITICAL ERROR: Commands TAKEOFF, goToLocalPoint run at the same time. Split them with Timer.callLater(...) or callback(event).'
        );
        expect(drone.running).toBe(false);
        expect(drone.status).toBe(ERROR_STATUS);
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
        expect(logLines.some((line) => line.includes('WARNING: TAKEOFF command is ignored because the drone is not in PREFLIGHT.'))).toBe(true);
    });

    test('rejects goToLocalPoint on ground', () => {
        expect(applyGoToLocalPointRequest(drone, { x: 1, y: 2, z: 1 })).toBe(false);
        expect(drone.fsmState).toBe('IDLE');
        expect(logLines.some((line) => line.includes('CRITICAL WARNING: goToLocalPoint is rejected on the ground.'))).toBe(true);
    });

    test('throws detailed FSM error for goToLocalPoint during PREFLIGHT', () => {
        setDroneFsmState(drone, 'PREFLIGHT');

        expect(() => applyGoToLocalPointRequest(drone, { x: 1, y: 0, z: 1 })).toThrow(
            'FSM error: invalid transition from PREFLIGHT by command GO_TO_LOCAL_POINT'
        );
    });

    test('returns to IDLE after PREFLIGHT timeout', () => {
        expect(enterPreflight(drone)).toBe(true);
        drone.current_time = 3.1;

        expect(handlePreflightTimeout(drone)).toBe(true);
        expect(drone.fsmState).toBe('IDLE');
        expect(logLines.some((line) => line.includes('WARNING: Preflight timeout expired. The drone is returned to IDLE.'))).toBe(true);
    });

    test('blocks PREFLIGHT without RC when Copter_flyWithoutRc requires a radio link', () => {
        syncAutopilotRuntimeFromValues({
            Copter_flyWithoutRc: 1
        });

        expect(enterPreflight(drone)).toBe(false);
        expect(drone.fsmState).toBe('IDLE');
        expect(logLines.some((line) => line.includes('Copter_flyWithoutRc requires an active RC link.'))).toBe(true);
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
        expect(logLines.some((line) => line.includes('WARNING: LANDING overrides the active goToLocalPoint movement.'))).toBe(true);
    });

    test('ignores late timer command when FSM is incompatible', () => {
        setDroneFsmState(drone, 'LANDING_PROCESS');
        const accepted = withCommandSource(drone, 'timer', () => applyGoToLocalPointRequest(drone, { x: 1, y: 0, z: 1 }));

        expect(accepted).toBe(false);
        expect(logLines.some((line) => line.includes('WARNING: Delayed command was rejected because FSM state has already changed.'))).toBe(true);
    });

    test('accepts goToLocalPoint from timer when drone already hovers', () => {
        setDroneFsmState(drone, 'FLYING_HOVER');

        const accepted = withCommandSource(drone, 'timer', () => applyGoToLocalPointRequest(drone, { x: 1, y: 1, z: 1 }));

        expect(accepted).toBe(true);
        expect(drone.fsmState).toBe('FLYING_MOVING');
        expect(drone.target_pos).toEqual({ x: 1, y: 1, z: 1 });
    });

    test('accepts goToLocalPoint from timer during takeoff and starts planar movement early', () => {
        setDroneFsmState(drone, 'TAKEOFF_PROCESS');
        drone.target_pos = { x: 0, y: 0, z: 1.5 };

        const accepted = withCommandSource(drone, 'timer', () => applyGoToLocalPointRequest(drone, { x: 1, y: 1, z: 1 }));

        expect(accepted).toBe(true);
        expect(drone.fsmState).toBe('TAKEOFF_PROCESS');
        expect(drone.target_pos).toEqual({ x: 1, y: 1, z: 1.5 });
        expect(drone.pendingLocalPoint).toBe(true);
        expect(drone.pendingLocalPointSource).toBe('timer');
        expect(drone.pendingLocalPointTarget).toEqual({ x: 1, y: 1, z: 1 });
    });

    test('continues pending timer route after takeoff completes', () => {
        setDroneFsmState(drone, 'TAKEOFF_PROCESS');
        drone.pos = { x: 0.2, y: 0.1, z: 1 };
        drone.target_pos = { x: 1, y: 1, z: 1 };
        drone.pendingLocalPoint = true;
        drone.pendingLocalPointSource = 'timer';
        drone.pendingLocalPointTarget = { x: 2, y: 2, z: 1 };

        expect(completeTakeoff(drone)).toBe(true);

        expect(drone.fsmState).toBe('FLYING_MOVING');
        expect(drone.target_pos).toEqual({ x: 2, y: 2, z: 1 });
        expect(drone.pendingLocalPoint).toBe(false);
        expect(drone.pendingLocalPointSource).toBeNull();
        expect(drone.pendingLocalPointTarget).toBeNull();
    });

    test('throws detailed FSM error for TAKEOFF from flying state', () => {
        setDroneFsmState(drone, 'FLYING_MOVING');

        expect(() => enterTakeoffProcess(drone)).toThrow(
            'FSM error: invalid transition from FLYING_MOVING by command MCE_TAKEOFF'
        );
    });

    test('processes PREFLIGHT then TAKEOFF through queued MCE commands', () => {
        queueMceCommand(drone, MCECommands.MCE_PREFLIGHT, 'direct');
        beginEventCallbackPhase(drone);
        queueMceCommand(drone, MCECommands.MCE_TAKEOFF, 'direct');

        processCommandQueue(drone, drone.id);
        expect(drone.fsmState).toBe('PREFLIGHT');

        processCommandQueue(drone, drone.id);
        expect(drone.fsmState).toBe('TAKEOFF_PROCESS');
        expect(drone.target_pos.z).toBeGreaterThanOrEqual(1);
    });

    test('limits climb rate during TAKEOFF_PROCESS by Copter_pos_vTakeoff', () => {
        syncAutopilotRuntimeFromValues({
            Copter_pos_vUp: 3,
            Copter_pos_vTakeoff: 0.2
        });
        drone.fsmState = 'TAKEOFF_PROCESS';
        drone.pos.z = 0;
        drone.target_pos.z = 2;
        drone.target_alt = 2;
        drone.vel.z = 0;

        updateActiveFlight(drone, drone.id, 1, true, () => []);

        expect(drone.vel.z).toBeCloseTo(0.2, 5);
        expect(drone.pos.z).toBeCloseTo(0.2, 5);
    });

    test('limits descent rate near ground during LANDING_PROCESS by Copter_pos_vLanding', () => {
        syncAutopilotRuntimeFromValues({
            Copter_pos_vDown: 3,
            Copter_pos_vLanding: 0.1,
            Flight_com_landingAlt: 0.3
        });
        drone.fsmState = 'LANDING_PROCESS';
        drone.pos.z = 0.2;
        drone.target_pos.z = 0;
        drone.target_alt = 0;
        drone.vel.z = 0;

        updateActiveFlight(drone, drone.id, 1, true, () => []);

        expect(drone.vel.z).toBeCloseTo(-0.1, 5);
        expect(drone.pos.z).toBeCloseTo(0.1, 5);
    });
});
