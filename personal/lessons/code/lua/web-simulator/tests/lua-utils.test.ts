import { jest } from '@jest/globals';

describe('lua utils error decoding', () => {
    let luaToStr: typeof import('../public/modules/lua/utils.js').luaToStr;

    beforeAll(async () => {
        const logsEl = {
            appendChild: () => {},
            scrollTop: 0,
            scrollHeight: 0
        };

        jest.unstable_mockModule('fengari-web', () => ({
            lua: {
                lua_gettop: () => 0,
                lua_tostring: () => null
            },
            to_jsstring: (value: unknown) => {
                if (typeof value === 'string') {
                    return value;
                }
                throw new Error('not a direct lua string');
            }
        }));
        (globalThis as any).document = {
            getElementById: (id: string) => (id === 'logs' ? logsEl : null),
            createElement: () => ({
                className: '',
                textContent: ''
            })
        };

        ({ luaToStr } = await import('../public/modules/lua/utils.js'));
    });

    test('decodes numeric byte arrays into readable UTF-8 text', () => {
        const message = Array.from(new TextEncoder().encode('[string "ap.push(Ev.MCE_PREFLIGHT)"]:1: Константа `MCE_PREFLIGHT` должна использоваться с префиксом `Ev.`: `Ev.MCE_PREFLIGHT`.'));

        expect(luaToStr(message, null)).toContain('Константа `MCE_PREFLIGHT`');
        expect(luaToStr(message, null)).toContain('`Ev.MCE_PREFLIGHT`');
    });

    test('decodes array-like fengari error objects instead of showing raw bytes', () => {
        const encoded = Array.from(new TextEncoder().encode('attempt to call a nil value'));
        const luaLikeObject = Object.assign({ length: encoded.length }, encoded);

        expect(luaToStr(luaLikeObject, null)).toBe('attempt to call a nil value');
    });
});
