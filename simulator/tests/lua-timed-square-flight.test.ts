import { readFileSync } from 'node:fs';

// Execute the example in the real Lua VM with a deterministic event/clock harness.
// @ts-expect-error Fengari's transitive runtime dependency has no declarations.
import * as fengari from 'fengari';

test('timed square schedules one route despite repeated flight events', () => {
    const L = fengari.lauxlib.luaL_newstate();
    fengari.lualib.luaL_openlibs(L);
    const run = (code: string) => {
        const status = fengari.lauxlib.luaL_dostring(L, fengari.to_luastring(code));
        if (status !== fengari.lua.LUA_OK) {
            throw new Error(fengari.to_jsstring(fengari.lua.lua_tostring(L, -1)));
        }
    };
    try {
        run(`
            Ev = {MCE_PREFLIGHT=1, MCE_TAKEOFF=2, MCE_LANDING=3,
                  ENGINES_DISARM=4, TAKEOFF_COMPLETE=10, POINT_REACHED=11}
            now, timers, calls = 0, {}, {}
            Timer = {callLater=function(delay, fn)
                table.insert(timers, {at=now+delay, fn=fn})
            end}
            ap = {
                push=function(event) table.insert(calls, {event=event}) end,
                goToLocalPoint=function(x,y,z)
                    table.insert(calls, {x=x,y=y,z=z})
                end
            }
            function advance(time)
                now = time
                for i=#timers,1,-1 do
                    if timers[i].at <= now then
                        local timer = table.remove(timers, i)
                        timer.fn()
                    end
                end
            end
        `);
        run(readFileSync(new URL('../examples/timed-square-flight.lua', import.meta.url), 'utf8'));
        run(`
            assert(#calls == 1 and calls[1].event == Ev.MCE_PREFLIGHT)
            callback(99) -- unrelated preflight event must not schedule the route
            assert(#timers == 9)
            advance(1)
            assert(#calls == 2 and calls[2].event == Ev.MCE_TAKEOFF)
            now = 4.4
            callback(Ev.TAKEOFF_COMPLETE)
            assert(#calls == 3 and calls[3].z == 1)
            assert(#timers == 8)
            callback(Ev.TAKEOFF_COMPLETE) -- duplicate event must also be harmless
            callback(Ev.POINT_REACHED)
            assert(#timers == 8 and #calls == 3)
            local expected = {{0,1}, {1,1}, {1,-1}, {-1,-1}, {-1,1}, {0,1}}
            for i, point in ipairs(expected) do
                advance(10 + i*10)
                assert(#calls == 3+i)
                local call = calls[#calls]
                assert(call.x == point[1] and call.y == point[2] and call.z == 1)
                callback(Ev.POINT_REACHED)
                assert(#timers == 8-i)
            end
            advance(80)
            assert(calls[#calls].event == Ev.MCE_LANDING)
            callback(99)
            advance(90)
            assert(calls[#calls].event == Ev.ENGINES_DISARM)
            assert(#timers == 0 and #calls == 11)
        `);
    } finally {
        fengari.lua.lua_close(L);
    }
});
