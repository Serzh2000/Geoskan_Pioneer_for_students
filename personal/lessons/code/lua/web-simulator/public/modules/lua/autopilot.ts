import { getDroneFromLua } from '../core/state.js';
import { log } from '../shared/logging/logger.js';
import { pushCommand } from '../autopilot/mce-events.js';
import { applyGoToLocalPointRequest, getCommandSource, queueMceCommand } from '../autopilot/fsm.js';
import { showMissingCallbackMissionNotice } from '../app/script-execution-notice.js';
import { describeCommandId, pushLuaRuntimeLog } from './diagnostics.js';
import { allowLuaMissionCommand } from './mission-guard.js';

let localFrameOrigin = { x: 0, y: 0, z: 0 };

function ensureLuaMissionCommandAllowed(simState: ReturnType<typeof getDroneFromLua>, apiName: string) {
    if (allowLuaMissionCommand(simState)) return true;

    const warning = `В сценарии нет function callback(event), поэтому после первой команды миссии вызов ${apiName} проигнорирован. Автопилот не сможет доставить подтверждающие события обратно в Lua.`;
    pushLuaRuntimeLog(simState, 'warn', apiName, warning, null);
    log(`[Lua AP] ${warning}`, 'warn');

    if (!simState.luaMissingCallbackNoticeShown) {
        simState.luaMissingCallbackNoticeShown = true;
        showMissingCallbackMissionNotice(apiName);
    }

    return false;
}

export function setLocalFrameOrigin(x: number, y: number, z: number) {
    localFrameOrigin = { x, y, z };
    log(`AP: Локальная система координат установлена в (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`, 'info');
}

export const ap_push = function(L: any) {
    if (window.fengari.lua.lua_gettop(L) < 1) return 0;
    const event = window.fengari.lua.lua_tointeger(L, 1);
    const simState = getDroneFromLua(L);
    if (!ensureLuaMissionCommandAllowed(simState, `ap.push(${describeCommandId(event)})`)) return 0;
    pushLuaRuntimeLog(
        simState,
        'debug',
        'ap.push/js',
        `Подготовка команды ${describeCommandId(event)}; FSM=${simState.fsmState}; source=${getCommandSource(simState)}`,
        null
    );
    queueMceCommand(simState, event, getCommandSource(simState));
    pushCommand(event);
    log(`[Lua AP] ap.push(${event}) - Команда добавлена в очередь; FSM=${simState.fsmState}`, 'info');
    return 0;
};

export const ap_goToPoint = function(L: any) {
    if (window.fengari.lua.lua_gettop(L) < 3) return 0;
    const lat = window.fengari.lua.lua_tonumber(L, 1);
    const lon = window.fengari.lua.lua_tonumber(L, 2);
    const alt = window.fengari.lua.lua_tonumber(L, 3);
    const simState = getDroneFromLua(L);
    if (!ensureLuaMissionCommandAllowed(simState, 'ap.goToPoint(...)')) return 0;
    const accepted = applyGoToLocalPointRequest(simState, {
        x: (lon - 304206500) * 0.01,
        y: (lat - 600859810) * 0.01,
        z: alt
    });
    if (accepted) {
        log(`[Lua AP] ap.goToPoint(${lat}, ${lon}, ${alt}) - Полет GPS запущен; FSM=${simState.fsmState}`, 'info');
    }
    return 0;
};

export const ap_goToLocalPoint = function(L: any) {
    if (window.fengari.lua.lua_gettop(L) < 3) return 0;
    const x = window.fengari.lua.lua_tonumber(L, 1);
    const y = window.fengari.lua.lua_tonumber(L, 2);
    const z = window.fengari.lua.lua_tonumber(L, 3);
    const time = (window.fengari.lua.lua_gettop(L) >= 4) ? window.fengari.lua.lua_tonumber(L, 4) : 0;
    
    const simState = getDroneFromLua(L);
    if (!ensureLuaMissionCommandAllowed(simState, 'ap.goToLocalPoint(...)')) return 0;
    const target = {
        x: localFrameOrigin.x + x,
        y: localFrameOrigin.y + y,
        z: localFrameOrigin.z + z
    };
    const accepted = applyGoToLocalPointRequest(simState, target);
    if (accepted && getCommandSource(simState) !== 'timer') {
        log(`[Lua AP] ap.goToLocalPoint(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) -> глобально (${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)})${time > 0 ? ' за ' + time + 'с' : ''}; FSM=${simState.fsmState}`, 'info');
    }
    return 0;
};

export const ap_updateYaw = function(L: any) {
    if (window.fengari.lua.lua_gettop(L) < 1) return 0;
    const yaw = window.fengari.lua.lua_tonumber(L, 1);
    const simState = getDroneFromLua(L);
    simState.target_yaw = yaw;
    if (getCommandSource(simState) !== 'timer') {
        log(`[Lua AP] ap.updateYaw(${yaw.toFixed(2)} рад)`, 'info');
    }
    return 0;
};
