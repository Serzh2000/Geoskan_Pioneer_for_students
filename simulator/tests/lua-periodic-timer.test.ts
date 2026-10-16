import { jest } from '@jest/globals';

describe('Lua periodic timer lifecycle', () => {
    let fengari: any;
    let createDroneState: typeof import('../public/modules/core/state.js').createDroneState;
    let resetState: typeof import('../public/modules/core/state.js').resetState;
    let timer_new: typeof import('../public/modules/lua/timers.js').timer_new;
    let drone: ReturnType<typeof import('../public/modules/core/state.js').createDroneState>;

    beforeAll(async () => {
        (globalThis as any).window = {};
        (globalThis as any).HTMLDocument = class HTMLDocument {};
        (globalThis as any).document = {
            getElementById: () => null,
            createElement: () => ({ append: () => {}, appendChild: () => {} })
        };
        // Fengari is shipped as a transitive runtime dependency without its own declaration file.
        // @ts-expect-error test-only direct access to the underlying Lua VM
        fengari = await import('fengari');
        jest.unstable_mockModule('fengari-web', () => fengari);
        ({ createDroneState, resetState } = await import('../public/modules/core/state.js'));
        ({ timer_new } = await import('../public/modules/lua/timers.js'));
        drone = createDroneState('periodic_timer_test', 'Periodic Timer Test');
    });

    test('Timer.new is stopped until :start() is called', () => {
        resetState(drone.id);
        const lua = fengari.lua;
        const L = fengari.lauxlib.luaL_newstate();
        lua.lua_pushstring(L, fengari.to_luastring(drone.id));
        lua.lua_setglobal(L, fengari.to_luastring('__DRONE_ID__'));
        lua.lua_pushnumber(L, 1);
        lua.lua_pushcfunction(L, () => 0);

        expect(timer_new(L)).toBe(1);
        const timerIndex = lua.lua_gettop(L);
        const timer = drone.timers[0];
        expect(timer.running).toBe(false);
        expect(timer.trigger_time).toBe(Number.POSITIVE_INFINITY);

        lua.lua_getfield(L, timerIndex, fengari.to_luastring('start'));
        lua.lua_pushvalue(L, timerIndex);
        expect(lua.lua_pcall(L, 1, 0, 0)).toBe(lua.LUA_OK);
        expect(timer.running).toBe(true);
        expect(timer.trigger_time).toBe(drone.current_time + (timer.period ?? 0));

        lua.lua_close(L);
    });
});
