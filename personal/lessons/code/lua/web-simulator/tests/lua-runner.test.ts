import { jest } from '@jest/globals';

describe('lua runner (runCoroutine)', () => {
    const LUA_OK = 0;
    const LUA_YIELD = 1;
    const LUA_ERRRUN = 2;
    const ERROR_STATUS = 'ОШИБКА';

    let createDroneState: typeof import('../public/modules/core/state.js').createDroneState;
    let resetState: typeof import('../public/modules/core/state.js').resetState;
    let onMissionNotices: typeof import('../public/modules/core/mission-notices.js').onMissionNotices;
    let runCoroutine: typeof import('../public/modules/lua/runner.js').runCoroutine;
    let drone: ReturnType<typeof import('../public/modules/core/state.js').createDroneState>;

    let resumeStatus = LUA_OK;
    let resumeErrorMessage = '';
    let stringToReturn = '';
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
                LUA_YIELD,
                lua_resume: () => {
                    if (resumeStatus !== LUA_OK && resumeStatus !== LUA_YIELD) {
                        stringToReturn = resumeErrorMessage;
                    }
                    return resumeStatus;
                },
                lua_tostring: () => stringToReturn,
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
        ({ onMissionNotices } = await import('../public/modules/core/mission-notices.js'));
        ({ runCoroutine } = await import('../public/modules/lua/runner.js'));

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

        drone = createDroneState('runner_test_drone', 'Runner Test Drone');
    });

    beforeEach(() => {
        resetState(drone.id);
        drone.running = true;
        drone.luaState = {};
        resumeStatus = LUA_OK;
        resumeErrorMessage = '';
        scriptFailureCalls.length = 0;
    });

    test('is a no-op when the drone is not running', () => {
        drone.running = false;
        expect(() => runCoroutine({}, {}, 0, drone.id, 'main chunk')).not.toThrow();
        expect(scriptFailureCalls).toHaveLength(0);
    });

    test('is a no-op when the drone has no active lua state', () => {
        drone.luaState = null;
        resumeStatus = LUA_ERRRUN;
        resumeErrorMessage = 'should never surface';
        expect(() => runCoroutine({}, {}, 0, drone.id, 'main chunk')).not.toThrow();
        expect(drone.running).toBe(true);
        expect(scriptFailureCalls).toHaveLength(0);
    });

    test('leaves the drone running when the coroutine yields', () => {
        resumeStatus = LUA_YIELD;
        runCoroutine({}, {}, 0, drone.id, 'main chunk');
        expect(drone.running).toBe(true);
        expect(scriptFailureCalls).toHaveLength(0);
    });

    test('marks the drone failed and emits a lua script-failure notice on a runtime error', () => {
        resumeStatus = LUA_ERRRUN;
        resumeErrorMessage = 'attempt to call a nil value (global \'perform\')';

        runCoroutine({}, {}, 0, drone.id, 'main chunk');

        expect(drone.running).toBe(false);
        expect(drone.status).toBe(ERROR_STATUS);
        expect(scriptFailureCalls).toHaveLength(1);

        const [language, error] = scriptFailureCalls[0];
        expect(language).toBe('lua');
        expect(String(error?.message || '')).toContain('attempt to call a nil value');
    });
});
