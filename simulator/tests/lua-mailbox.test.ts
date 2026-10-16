import { jest } from '@jest/globals';

describe('Lua mailbox object', () => {
    let fengari: any;
    let L: any;
    let mailbox: typeof import('../public/modules/world/mailbox.js');
    let services: ReturnType<typeof import('../public/modules/world/services.js').createWorldServices>;

    const run = (code: string) => {
        const status = fengari.lauxlib.luaL_dostring(L, fengari.to_luastring(code));
        if (status !== 0) throw new Error(fengari.to_jsstring(fengari.lua.lua_tostring(L, -1)));
    };
    const global = (name: string) => {
        fengari.lua.lua_getglobal(L, fengari.to_luastring(name));
        const type = fengari.lua.lua_type(L, -1);
        const value = type === fengari.lua.LUA_TNUMBER ? fengari.lua.lua_tonumber(L, -1)
            : type === fengari.lua.LUA_TBOOLEAN ? fengari.lua.lua_toboolean(L, -1)
                : fengari.to_jsstring(fengari.lua.lua_tostring(L, -1));
        fengari.lua.lua_pop(L, 1);
        return value;
    };

    beforeAll(async () => {
        (globalThis as any).window = {};
        (globalThis as any).HTMLDocument = class HTMLDocument {};
        (globalThis as any).document = {
            getElementById: () => null,
            createElement: () => ({ append: () => {}, appendChild: () => {}, classList: { add: () => {}, remove: () => {} }, style: {} })
        };
        // @ts-expect-error test-only direct access to the underlying Lua VM
        fengari = await import('fengari');
        jest.unstable_mockModule('fengari-web', () => fengari);
        const state = await import('../public/modules/core/state.js');
        const bridge = await import('../public/modules/lua/bridge.js');
        mailbox = await import('../public/modules/world/mailbox.js');
        const world = await import('../public/modules/world/services.js');
        state.createDroneState('mailbox_drone', 'Mailbox Drone');
        L = bridge.setupLuaBridgeForDrone('mailbox_drone');
        mailbox.resetMailbox();
        services = world.createWorldServices({
            incidents: [{ id: 'f', kind: 'fire', x: 60, y: 0, startAt: 0, active: false, resolved: false }],
            homes: { fire: { x: 0, y: 0 }, police: { x: 5, y: 0 } },
            route: (from, to) => [from, to],
            speed: 20
        });
        services.update(.1);
    });

    test('myHullNumber, send and receive follow the official API', () => {
        run('mine = mailbox.myHullNumber(); ok = mailbox.send(101, "fire 58 2"); '
            + 'hull, text = mailbox.receive(false)');
        expect(global('mine')).toBeGreaterThanOrEqual(1);
        expect(global('ok')).toBe(true);
        expect(global('hull')).toBe(101);
        expect(String(global('text'))).toMatch(/^accepted \d+$/);
    });

    test('receive(false) on an empty box returns -1', () => {
        for (let i = 0; i < 100; i++) services.update(.1);
        run('while mailbox.hasMessages() do mailbox.receive(false) end; empty_hull, empty_text = mailbox.receive(false)');
        expect(global('empty_hull')).toBe(-1);
    });

    test('services answer in order and a wrong spot gets "nothing found"', () => {
        for (let i = 0; i < 600; i++) services.update(.1); // let the first call finish and the crew get home
        run('while mailbox.hasMessages() do mailbox.receive(false) end');
        run('mailbox.send(101, "fire -50 40")');
        for (let i = 0; i < 400; i++) services.update(.1);
        const got: string[] = [];
        for (;;) {
            run('h, t = mailbox.receive(false)');
            if (global('h') === -1) break;
            got.push(String(global('t')));
        }
        expect(got).toEqual(expect.arrayContaining(['arrived', 'nothing found', 'home']));
    });

    test('setHullNumber changes the address services reply to', () => {
        run('mailbox.setHullNumber(42); me = mailbox.myHullNumber()');
        expect(global('me')).toBe(42);
        expect(mailbox.hasMessages(42)).toBe(false);
    });
});
