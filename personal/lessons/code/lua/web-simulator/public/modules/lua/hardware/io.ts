import { getDroneFromLua } from '../../core/state.js';
import { log } from '../../shared/logging/logger.js';

export const gpio_new = function(L: any) {
    const lua = window.fengari.lua;
    const port = lua.lua_tointeger(L, 1);
    const pin = lua.lua_tointeger(L, 2);
    const mode = lua.lua_tointeger(L, 3);

    const isMagnetPin = (gpioPort: number, gpioPin: number) =>
        (gpioPort === 3 && gpioPin === 3) || (gpioPort === 1 && gpioPin === 1);

    const readNumberField = (state: any, field: string) => {
        lua.lua_getfield(state, 1, field);
        const value = lua.lua_tointeger(state, -1);
        lua.lua_pop(state, 1);
        return value;
    };

    const readBooleanField = (state: any, field: string) => {
        lua.lua_getfield(state, 1, field);
        const value = lua.lua_toboolean(state, -1);
        lua.lua_pop(state, 1);
        return value;
    };

    const writeState = (state: any, active: boolean) => {
        lua.lua_pushboolean(state, active ? 1 : 0);
        lua.lua_setfield(state, 1, '__state');

        const gpioPort = readNumberField(state, '__port');
        const gpioPin = readNumberField(state, '__pin');
        if (isMagnetPin(gpioPort, gpioPin)) {
            const simState = getDroneFromLua(state);
            simState.magnetGripper.active = active;
        }
    };

    window.fengari.lua.lua_newtable(L);

    lua.lua_pushinteger(L, port);
    lua.lua_setfield(L, -2, '__port');
    lua.lua_pushinteger(L, pin);
    lua.lua_setfield(L, -2, '__pin');
    lua.lua_pushinteger(L, mode);
    lua.lua_setfield(L, -2, '__mode');
    lua.lua_pushboolean(L, 0);
    lua.lua_setfield(L, -2, '__state');

    window.fengari.lua.lua_pushcfunction(L, (state: any) => {
        log('GPIO: read called', 'info');
        lua.lua_pushboolean(state, readBooleanField(state, '__state'));
        return 1;
    });
    window.fengari.lua.lua_setfield(L, -2, 'read');

    window.fengari.lua.lua_pushcfunction(L, (state: any) => {
        log('GPIO: set called', 'info');
        writeState(state, true);
        return 0;
    });
    window.fengari.lua.lua_setfield(L, -2, 'set');

    window.fengari.lua.lua_pushcfunction(L, (state: any) => {
        log('GPIO: reset called', 'info');
        writeState(state, false);
        return 0;
    });
    window.fengari.lua.lua_setfield(L, -2, 'reset');

    window.fengari.lua.lua_pushcfunction(L, (state: any) => {
        log('GPIO: write called', 'info');
        const active = lua.lua_toboolean(state, 2);
        writeState(state, active);
        return 0;
    });
    window.fengari.lua.lua_setfield(L, -2, 'write');

    window.fengari.lua.lua_pushcfunction(L, (state: any) => {
        log('GPIO: setFunction called', 'info');
        const nextMode = lua.lua_tointeger(state, 2);
        lua.lua_pushinteger(state, nextMode);
        lua.lua_setfield(state, 1, '__mode');
        return 0;
    });
    window.fengari.lua.lua_setfield(L, -2, 'setFunction');

    return 1;
};

export const uart_new = function(L: any) {
    window.fengari.lua.lua_newtable(L);
    const methods = ['read', 'write', 'bytesToRead', 'setBaudRate'];
    methods.forEach((method) => {
        window.fengari.lua.lua_pushcfunction(L, (state: any) => {
            if (method === 'read') window.fengari.lua.lua_pushstring(state, '');
            if (method === 'bytesToRead') window.fengari.lua.lua_pushinteger(state, 0);
            return (method === 'read' || method === 'bytesToRead') ? 1 : 0;
        });
        window.fengari.lua.lua_setfield(L, -2, method);
    });
    return 1;
};

export const spi_new = function(L: any) {
    window.fengari.lua.lua_newtable(L);
    const methods = ['read', 'write', 'exchange'];
    methods.forEach((method) => {
        window.fengari.lua.lua_pushcfunction(L, (state: any) => {
            log(`SPI: ${method} called`, 'info');
            if (method === 'read') window.fengari.lua.lua_pushstring(state, '');
            if (method === 'exchange') window.fengari.lua.lua_pushstring(state, '');
            return (method === 'read' || method === 'exchange') ? 1 : 0;
        });
        window.fengari.lua.lua_setfield(L, -2, method);
    });
    return 1;
};
