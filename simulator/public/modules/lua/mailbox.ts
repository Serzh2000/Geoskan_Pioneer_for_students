import * as fengari from 'fengari-web';
import { getDroneFromLua } from '../core/state.js';
import { droneHull, hasMessages, receiveMessage, sendMessage, setDroneHull } from '../world/mailbox.js';

/*
 * Lua side of `mailbox` (see the official "Объект mailbox" docs). The simulator has no network, so
 * connect() only validates its arguments and reports success.
 */
const lua = fengari.lua;

function self(L: any) {
    return droneHull(getDroneFromLua(L).id);
}

export const mailbox_connect = (L: any) => {
    lua.lua_pushinteger(L, self(L));
    lua.lua_pushstring(L, fengari.to_luastring('ok'));
    return 2;
};

export const mailbox_hasMessages = (L: any) => {
    lua.lua_pushboolean(L, hasMessages(self(L)));
    return 1;
};

export const mailbox_myHullNumber = (L: any) => {
    lua.lua_pushinteger(L, self(L));
    return 1;
};

export const mailbox_setHullNumber = (L: any) => {
    try {
        setDroneHull(getDroneFromLua(L).id, lua.lua_tointeger(L, 1));
        lua.lua_pushboolean(L, true);
        return 1;
    } catch (error) {
        lua.lua_pushnil(L);
        lua.lua_pushstring(L, fengari.to_luastring(error instanceof Error ? error.message : String(error)));
        return 2;
    }
};

export const mailbox_send = (L: any) => {
    const to = lua.lua_tonumber(L, 1);
    const text = lua.lua_isnumber(L, 2) && lua.lua_type(L, 2) === lua.LUA_TNUMBER
        ? lua.lua_tonumber(L, 2)
        : fengari.to_jsstring(lua.lua_tostring(L, 2) ?? fengari.to_luastring(''));
    sendMessage(self(L), to, text);
    lua.lua_pushboolean(L, true);
    return 1;
};

/** hull, message — or -1 when the buffer is empty and blocking is false. */
export const mailbox_receive = (L: any) => {
    const message = receiveMessage(self(L));
    if (!message) {
        lua.lua_pushinteger(L, -1);
        lua.lua_pushinteger(L, -1);
        return 2;
    }
    lua.lua_pushinteger(L, message.from);
    if (typeof message.text === 'number') lua.lua_pushnumber(L, message.text);
    else lua.lua_pushstring(L, fengari.to_luastring(message.text));
    return 2;
};
