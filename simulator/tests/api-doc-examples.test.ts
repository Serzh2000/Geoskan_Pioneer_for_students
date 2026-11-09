/** Примеры в справочнике: Lua-примеры должны разбираться настоящим Fengari, у каждой записи есть пример и тег направления там, где он нужен. */
import fengari from 'fengari-web';
import fs from 'fs';
import { luaApiDocs } from '../public/modules/docs/lua-api-docs.js';
import { pythonApiDocs } from '../public/modules/docs/python-api-docs.js';

function luaSyntaxError(code: string): string | null {
    const L = fengari.lauxlib.luaL_newstate();
    fengari.lualib.luaL_openlibs(L);
    const status = fengari.lauxlib.luaL_loadstring(L, fengari.to_luastring(code));
    const message = status === fengari.lua.LUA_OK ? null : fengari.to_jsstring(fengari.lua.lua_tostring(L, -1));
    fengari.lua.lua_close(L);
    return message;
}

describe('примеры Lua-справочника', () => {
    const entries = Object.entries(luaApiDocs);
    test('у каждой записи есть пример (кроме событий-констант: у них пример — сравнение в callback)', () => {
        const missing = entries.filter(([, doc]) => !doc.example).map(([key]) => key);
        expect(missing).toEqual([]);
    });
    test('каждый пример разбирается как Lua', () => {
        const broken = entries.filter(([, doc]) => doc.example).map(([key, doc]) => ({ key, error: luaSyntaxError(doc.example!) })).filter(item => item.error);
        expect(broken).toEqual([]);
    });
});

describe('примеры Python-справочника', () => {
    test('у каждой записи есть пример', () => {
        const missing = Object.entries(pythonApiDocs).filter(([, doc]) => !doc.example).map(([key]) => key);
        expect(missing).toEqual([]);
    });
});

describe('пометки направления «в автопилот» / «от автопилота»', () => {
    // Официальная таблица событий: команды, которые программа отправляет автопилоту, и события, которые он присылает в callback.
    const TO = ['MCE_PREFLIGHT', 'MCE_TAKEOFF', 'MCE_LANDING', 'ENGINES_ARM', 'ENGINES_DISARM'];
    const FROM = ['ENGINES_STARTED', 'COPTER_LANDED', 'TAKEOFF_COMPLETE', 'POINT_REACHED', 'POINT_DECELERATION', 'LOW_VOLTAGE1', 'LOW_VOLTAGE2', 'SYNC_START', 'SHOCK', 'CONTROL_FAIL', 'ENGINE_FAIL'];

    test.each(TO)('Ev.%s помечено «в автопилот» и используется в ap.push', name => {
        const doc = luaApiDocs[`Ev.${name}`];
        expect(doc.direction).toBe('to-autopilot');
        expect(doc.example).toContain(`ap.push(Ev.${name})`);
    });

    test.each(FROM)('Ev.%s помечено «от автопилота» и разбирается в callback', name => {
        const doc = luaApiDocs[`Ev.${name}`];
        expect(doc.direction).toBe('from-autopilot');
        expect(doc.example).toContain('function callback(event)');
        expect(doc.example).toContain(`event == Ev.${name}`);
    });

    test('все команды ap.* помечены «в автопилот»', () => {
        for (const key of ['ap.push', 'ap.goToLocalPoint', 'ap.goToPoint', 'ap.updateYaw']) expect({ key, direction: luaApiDocs[key].direction }).toEqual({ key, direction: 'to-autopilot' });
    });

    test('команды Python SDK помечены «в автопилот», а чтения и проверки нет', () => {
        const commands = ['arm', 'disarm', 'takeoff', 'land', 'go_to_local_point', 'go_to_local_point_body_fixed', 'set_manual_speed', 'set_manual_speed_body_fixed', 'send_rc_channels', 'reboot_board'];
        for (const name of commands) expect({ name, direction: pythonApiDocs[`Pioneer.${name}`].direction }).toEqual({ name, direction: 'to-autopilot' });
        for (const name of ['point_reached', 'get_autopilot_state', 'get_local_position_lps', 'get_battery_status']) expect(pythonApiDocs[`Pioneer.${name}`].direction).toBeUndefined();
    });
});

describe('примеры Python вызывают существующие методы', () => {
    const source = fs.readFileSync('public/modules/python/pioneer-sdk-module.ts', 'utf8');
    const methods = new Set([...source.matchAll(/^ {4}(?:async )?def ([a-z][a-z0-9_]*)\(/gm)].map(match => match[1]));
    test('каждый вызов pioneer.* и camera.* в примерах есть в SDK симулятора', () => {
        const unknown: string[] = [];
        for (const [key, doc] of Object.entries(pythonApiDocs)) {
            for (const match of (doc.example ?? '').matchAll(/\b(?:pioneer|camera|stream|train)\.([a-z_][a-z0-9_]*)\(/g)) if (!methods.has(match[1])) unknown.push(`${key}: ${match[0]}`);
        }
        expect(unknown).toEqual([]);
    });
});
