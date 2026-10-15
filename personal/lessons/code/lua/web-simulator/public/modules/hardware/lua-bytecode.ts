import * as fengariModule from 'fengari-web';

/*
 * Lua source -> the bytecode file Pioneer Station writes to the drone (`luac -s`, Lua 5.3.3).
 * Fengari is already the simulator's Lua, and its 5.3 dump matches Station's luac in every instruction and size
 * (int 4, size_t 4, Instruction 4, lua_Integer 4, lua_Number 8 bytes). Two details differ and are patched here so the
 * result is byte-for-byte what luac produces:
 *   - string constants: luac tags a string of up to 40 characters as short (4), Fengari tags every string as long (20);
 *   - the main function: luac marks it is_vararg = 2, Fengari 1.
 * tests/lua-drone-bytecode.test.ts compares the output with real luac output on the shipped examples.
 */

const fengari = ('default' in fengariModule ? (fengariModule as { default: typeof fengariModule }).default : fengariModule) as {
    lua: any;
    lauxlib: any;
    lualib: any;
    to_luastring: (text: string) => Uint8Array;
    to_jsstring: (bytes: Uint8Array) => string;
};

const HEADER_SIZE = 29;
const TAG_NIL = 0;
const TAG_BOOLEAN = 1;
const TAG_NUMFLT = 3;
const TAG_SHRSTR = 4;
const TAG_NUMINT = 19;
const TAG_LNGSTR = 20;
const MAX_SHORT_STRING = 40;
const MAIN_IS_VARARG = 2;

export class LuaCompileError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'LuaCompileError';
    }
}

/** Walks a Lua 5.3 stripped dump and fixes the two details described above. Throws if the dump is not the expected shape. */
export function normalizeForDrone(dump: Uint8Array): Uint8Array {
    const bytes = Uint8Array.from(dump);
    const view = new DataView(bytes.buffer);
    const expectedHeader = [0x1b, 0x4c, 0x75, 0x61, 0x53, 0x00, 0x19, 0x93, 0x0d, 0x0a, 0x1a, 0x0a, 4, 4, 4, 4, 8];
    expectedHeader.forEach((value, index) => {
        if (bytes[index] !== value) throw new LuaCompileError('Байткод имеет неожиданный формат заголовка');
    });
    let p = HEADER_SIZE;
    const u8 = () => bytes[p++];
    const i32 = () => {
        const value = view.getInt32(p, true);
        p += 4;
        return value;
    };
    /** Skips a string; returns the offset of its length byte, or -1 for an empty one. */
    const skipString = () => {
        const at = p;
        let size = u8();
        if (size === 0xff) {
            size = view.getUint32(p, true);
            p += 4;
        }
        if (size === 0) return -1;
        p += size - 1;
        return at;
    };
    const stringLength = (at: number) => {
        const size = bytes[at];
        return (size === 0xff ? view.getUint32(at + 1, true) : size) - 1;
    };

    const walk = (isMain: boolean) => {
        skipString(); // source name (stripped)
        i32(); // linedefined
        i32(); // lastlinedefined
        u8(); // numparams
        if (isMain) bytes[p] = MAIN_IS_VARARG;
        p += 1; // is_vararg
        u8(); // maxstacksize
        const codeSize = i32();
        p += codeSize * 4; // code
        const constants = i32();
        for (let k = 0; k < constants; k += 1) {
            const tagAt = p;
            const tag = u8();
            if (tag === TAG_BOOLEAN) p += 1;
            else if (tag === TAG_NUMFLT) p += 8;
            else if (tag === TAG_NUMINT) p += 4;
            else if (tag === TAG_SHRSTR || tag === TAG_LNGSTR) {
                const at = skipString();
                if (at >= 0) bytes[tagAt] = stringLength(at) <= MAX_SHORT_STRING ? TAG_SHRSTR : TAG_LNGSTR;
            } else if (tag !== TAG_NIL) throw new LuaCompileError(`Неизвестный тип константы в байткоде: ${tag}`);
        }
        const upvalues = i32();
        p += upvalues * 2; // upvalue descriptors
        const protos = i32();
        for (let k = 0; k < protos; k += 1) walk(false);
        i32(); // lineinfo (empty when stripped)
        i32(); // locvars
        i32(); // upvalue names
    };

    p += 1; // number of upvalues of the main function
    walk(true);
    if (p !== bytes.length) throw new LuaCompileError('Байткод оказался длиннее разобранной структуры');
    return bytes;
}

/** Compiles Lua source to the bytecode the drone expects. Throws LuaCompileError with the interpreter's message on a syntax error. */
export function compileLuaForDrone(source: string): Uint8Array {
    const { lua, lauxlib, to_luastring, to_jsstring } = fengari;
    const L = lauxlib.luaL_newstate();
    const code = to_luastring(source);
    const status = lauxlib.luaL_loadbuffer(L, code, code.length, to_luastring('=script'));
    if (status !== lua.LUA_OK) {
        const raw = lua.lua_tostring(L, -1);
        throw new LuaCompileError(raw ? to_jsstring(raw) : 'Ошибка синтаксиса Lua');
    }
    const chunks: Uint8Array[] = [];
    const writer = (_state: unknown, piece: Uint8Array, size: number) => {
        chunks.push(piece.slice(0, size));
        return 0;
    };
    if (lua.lua_dump(L, writer, null, 1) !== 0) throw new LuaCompileError('Не удалось получить байткод');
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const dump = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        dump.set(chunk, offset);
        offset += chunk.length;
    }
    return normalizeForDrone(dump);
}
