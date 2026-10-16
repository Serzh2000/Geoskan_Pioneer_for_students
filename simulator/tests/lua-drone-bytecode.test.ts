import { readFileSync } from 'node:fs';
import { compileLuaForDrone, LuaCompileError } from '../public/modules/hardware/lua-bytecode.js';

/* Reference output of Pioneer Station's own luac (5.3.3, `-s`), produced once and stored as fixtures. */
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/lua-drone-bytecode.json', import.meta.url), 'utf-8')) as Record<
    string,
    { source: string; hex: string }
>;

const toHex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');

describe('Lua bytecode for the drone', () => {
    for (const [name, { source, hex }] of Object.entries(fixtures)) {
        it(`${name} is byte-for-byte what luac produces`, () => {
            expect(toHex(compileLuaForDrone(source))).toBe(hex);
        });
    }

    it('reports a syntax error with the line number', () => {
        expect(() => compileLuaForDrone('local x = = 1')).toThrow(LuaCompileError);
        expect(() => compileLuaForDrone('\n\nlocal x = = 1')).toThrow(/script:3:/);
    });
});
