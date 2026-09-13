import { jest } from '@jest/globals';

describe('lua runtime (runLuaScript / triggerLuaCallback)', () => {
    const LUA_OK = 0;
    const ERROR_STATUS = 'ОШИБКА';
    const CALLBACK_SCRIPT = 'function callback(event) end';

    let createDroneState: typeof import('../public/modules/core/state.js').createDroneState;
    let resetState: typeof import('../public/modules/core/state.js').resetState;
    let drones: typeof import('../public/modules/core/state.js').drones;
    let onMissionNotices: typeof import('../public/modules/core/mission-notices.js').onMissionNotices;
    let runLuaScript: typeof import('../public/modules/lua/runtime.js').runLuaScript;
    let triggerLuaCallback: typeof import('../public/modules/lua/runtime.js').triggerLuaCallback;
    let stopLuaScript: typeof import('../public/modules/lua/runtime.js').stopLuaScript;
    let MCECommands: typeof import('../public/modules/autopilot/mce-events.js').MCECommands;
    let drone: ReturnType<typeof import('../public/modules/core/state.js').createDroneState>;

    // --- fengari-web mock control knobs, mutated per-test ---
    const registry: Record<string, (L: any) => number> = {};
    let loadStringResult = 0;
    let doStringResult = 0;
    let resumeStatus = LUA_OK;
    let resumeErrorMessage = '';
    let resumeBehavior: ((fakeL: any) => void) | null = null;
    let pushedEventId = 0;
    let stringToReturn = '';
    let lastGlobalRequested = '';
    let callbackIsFunction = true;
    let pcallResult = 0;
    const scriptFailureCalls: Array<[string, any]> = [];

    beforeAll(async () => {
        const logsEl = {
            appendChild: () => {},
            scrollTop: 0,
            scrollHeight: 0
        };

        jest.unstable_mockModule('fengari-web', () => ({
            lua: {
                LUA_OK,
                LUA_YIELD: 1,
                LUA_REGISTRYINDEX: 1000,
                lua_register: (_L: any, name: string, fn: any) => {
                    registry[name] = fn;
                },
                lua_pushstring: () => {},
                lua_setglobal: () => {},
                lua_getglobal: (_L: any, name: string) => {
                    lastGlobalRequested = name;
                    if (name === '__DRONE_ID__') {
                        stringToReturn = drone.id;
                    }
                },
                lua_tostring: () => stringToReturn,
                lua_pop: () => {},
                lua_gettop: () => 1,
                lua_tointeger: () => pushedEventId,
                lua_tonumber: () => 0,
                lua_newthread: () => ({ kind: 'thread' }),
                lua_pushvalue: () => {},
                lua_xmove: () => {},
                lua_close: () => {},
                lua_resume: (_arg1: any, arg2: any) => {
                    if (resumeBehavior) resumeBehavior(arg2);
                    if (resumeStatus !== LUA_OK) {
                        stringToReturn = resumeErrorMessage;
                    }
                    return resumeStatus;
                },
                lua_isfunction: () => lastGlobalRequested === 'callback' && callbackIsFunction,
                lua_pushinteger: () => {},
                lua_pcall: () => {
                    if (pcallResult !== 0) {
                        stringToReturn = resumeErrorMessage;
                    }
                    return pcallResult;
                },
                lua_settop: () => {},
                lua_rawgeti: () => {},
                lua_isnumber: () => false,
                lua_pushnil: () => {}
            },
            lauxlib: {
                luaL_newstate: () => ({ kind: 'main' }),
                luaL_dostring: () => doStringResult,
                luaL_loadstring: () => loadStringResult,
                luaL_unref: () => {}
            },
            lualib: {
                luaL_openlibs: () => {}
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

        ({ createDroneState, resetState, drones } = await import('../public/modules/core/state.js'));
        ({ onMissionNotices } = await import('../public/modules/core/mission-notices.js'));
        ({ MCECommands } = await import('../public/modules/autopilot/mce-events.js'));
        ({ runLuaScript, triggerLuaCallback, stopLuaScript } = await import('../public/modules/lua/runtime.js'));

        onMissionNotices({
            scriptFailure: (language, error) => {
                scriptFailureCalls.push([language, error]);
            },
            missionGamepadOverride: () => {},
            missingCallbackMission: () => {},
            earlyRoute: () => {},
            simultaneousCommands: () => {},
            genericNotice: () => {}
        });

        drone = createDroneState('runtime_test_drone', 'Runtime Test Drone');
    });

    beforeEach(() => {
        resetState(drone.id);
        drone.running = true;
        loadStringResult = 0;
        doStringResult = 0;
        resumeStatus = LUA_OK;
        resumeErrorMessage = '';
        resumeBehavior = null;
        pushedEventId = MCECommands.MCE_PREFLIGHT;
        stringToReturn = '';
        lastGlobalRequested = '';
        callbackIsFunction = true;
        pcallResult = 0;
        scriptFailureCalls.length = 0;
    });

    describe('runLuaScript', () => {
        test('runs a valid script and updates drone state through the registered bridge', () => {
            // Simulate the Lua script calling ap.push(Ev.MCE_PREFLIGHT) by directly invoking
            // the js_ap_push function that setupLuaBridgeForDrone() registers with fengari.
            resumeBehavior = (fakeL: any) => {
                registry['js_ap_push'](fakeL);
            };

            runLuaScript(drone.id, CALLBACK_SCRIPT);

            expect(drone.running).toBe(true);
            expect(drone.luaState).toEqual({ kind: 'main' });
            expect(drones[drone.id].command_queue).toHaveLength(1);
            expect(drones[drone.id].command_queue[0]).toMatchObject({
                commandId: MCECommands.MCE_PREFLIGHT,
                source: 'direct'
            });
            expect(scriptFailureCalls).toHaveLength(0);
        });

        test('marks the drone failed and emits a lua script-failure notice on a runtime error', () => {
            resumeStatus = 2; // any non-OK, non-YIELD status
            resumeErrorMessage = 'attempt to call a nil value (global \'perform\')';

            runLuaScript(drone.id, CALLBACK_SCRIPT);

            expect(drone.running).toBe(false);
            expect(drone.status).toBe(ERROR_STATUS);
            expect(scriptFailureCalls).toHaveLength(1);

            const [language, error] = scriptFailureCalls[0];
            expect(language).toBe('lua');
            expect(String(error?.message || '')).toContain('attempt to call a nil value');
        });

        test('throws a syntax script-failure error and clears luaState when the script fails to compile', () => {
            loadStringResult = 1; // non-zero -> luaL_loadstring failed
            stringToReturn = "[string \"...\"]:3: unexpected symbol near ')'";

            expect(() => runLuaScript(drone.id, 'ap.push(')).toThrow(
                "unexpected symbol near ')'"
            );

            // Compile-time failures are surfaced synchronously to the caller (thrown), unlike
            // runtime errors which flip running/status and go through emitScriptFailure.
            expect(drone.luaState).toBeNull();
            expect(scriptFailureCalls).toHaveLength(0);
        });
    });

    describe('triggerLuaCallback', () => {
        beforeEach(() => {
            drone.luaState = { kind: 'main' };
        });

        test('invokes callback(event) without side effects when it succeeds', () => {
            callbackIsFunction = true;
            pcallResult = 0;

            expect(() => triggerLuaCallback(drone.id, 42)).not.toThrow();

            expect(drone.running).toBe(true);
            expect(scriptFailureCalls).toHaveLength(0);
        });

        test('is a no-op when the script has no callback(event) function defined', () => {
            callbackIsFunction = false;

            expect(() => triggerLuaCallback(drone.id, 42)).not.toThrow();

            expect(drone.running).toBe(true);
            expect(scriptFailureCalls).toHaveLength(0);
        });

        test('marks the drone failed and emits a lua script-failure notice when callback(event) errors', () => {
            callbackIsFunction = true;
            pcallResult = 1;
            resumeErrorMessage = 'division by zero';

            expect(() => triggerLuaCallback(drone.id, 7)).not.toThrow();

            expect(drone.running).toBe(false);
            expect(drone.status).toBe(ERROR_STATUS);
            expect(scriptFailureCalls).toHaveLength(1);

            const [language, error] = scriptFailureCalls[0];
            expect(language).toBe('lua');
            expect(String(error?.message || '')).toContain('division by zero');
        });

        test('is a no-op when the drone has no active lua state', () => {
            drone.luaState = null;
            expect(() => triggerLuaCallback(drone.id, 1)).not.toThrow();
            expect(scriptFailureCalls).toHaveLength(0);
        });
    });

    describe('stopLuaScript', () => {
        test('clears the drone lua state and timers without throwing', () => {
            drone.luaState = { kind: 'main' };
            drone.timers = [{ kind: 'sleep' } as any];

            expect(() => stopLuaScript(drone.id)).not.toThrow();

            expect(drone.luaState).toBeNull();
            expect(drone.timers).toEqual([]);
        });
    });
});
