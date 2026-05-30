describe('lua sleep runtime', () => {
    let createDroneState: typeof import('../public/modules/core/state.js').createDroneState;
    let resetState: typeof import('../public/modules/core/state.js').resetState;
    let updateTimers: typeof import('../public/modules/lua/index.js').updateTimers;
    let js_sleep: typeof import('../public/modules/lua/timers.js').js_sleep;
    let drone: ReturnType<typeof import('../public/modules/core/state.js').createDroneState>;
    const fakeMainState = { kind: 'main' };
    const fakeThread = { kind: 'thread' };
    const observedSources: Array<string | null> = [];

    beforeAll(async () => {
        const logsEl = {
            appendChild: () => {},
            querySelector: () => null,
            scrollTop: 0,
            scrollHeight: 0
        };

        (globalThis as any).window = {
            fengari: {
                lua: {
                    LUA_OK: 0,
                    LUA_YIELD: 1,
                    LUA_REGISTRYINDEX: 1,
                    lua_gettop: () => 1,
                    lua_getglobal: () => {},
                    lua_tostring: () => 'lua_sleep_test_drone',
                    lua_pop: () => {},
                    lua_tonumber: () => 0.5,
                    lua_yield: () => 1,
                    lua_resume: () => {
                        observedSources.push(drone.currentCommandSource);
                        return 0;
                    },
                    lua_isnumber: () => false,
                    lua_newthread: () => ({})
                },
                lauxlib: {
                    luaL_unref: () => {}
                },
                to_luastring: (value: string) => value,
                to_jsstring: (value: string) => value
            }
        };
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
        ({ createDroneState, resetState } = await import('../public/modules/core/state.js'));
        ({ updateTimers } = await import('../public/modules/lua/index.js'));
        ({ js_sleep } = await import('../public/modules/lua/timers.js'));
        drone = createDroneState('lua_sleep_test_drone', 'Lua Sleep Test Drone');
    });

    beforeEach(() => {
        resetState(drone.id);
        drone.running = true;
        drone.luaState = fakeMainState;
        observedSources.length = 0;
    });

    test('schedules sleep through simulation timers and resumes as timer source', () => {
        expect(js_sleep(fakeThread)).toBe(1);
        expect(drone.timers).toHaveLength(1);
        expect(drone.timers[0]).toMatchObject({
            kind: 'sleep',
            running: true,
            one_shot: true,
            trigger_time: 0.5,
            resume_thread: fakeThread
        });

        drone.current_time = 0.49;
        updateTimers();
        expect(observedSources).toEqual([]);
        expect(drone.timers).toHaveLength(1);

        drone.current_time = 0.5;
        updateTimers();
        expect(observedSources).toEqual(['timer']);
        expect(drone.currentCommandSource).toBeNull();
        expect(drone.timers).toHaveLength(0);
    });
});
