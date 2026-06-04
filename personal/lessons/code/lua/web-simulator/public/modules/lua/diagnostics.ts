import { createScriptFailureError, type ScriptFailureError } from '../app/script-execution-notice.js';
import { MCECommandDesc } from '../autopilot/mce-events.js';
import { getDroneFromLua } from '../core/state.js';
import type {
    CommandSource,
    DroneFsmState,
    DroneState,
    LuaApiCallRecord,
    LuaDiagnosticLevel,
    LuaDiagnosticsState
} from '../core/state.js';
import { log } from '../shared/logging/logger.js';

const MAX_RUNTIME_LOGS = 24;
const MAX_API_CALLS = 10;
const MAX_FSM_TRANSITIONS = 10;

function appendLimited<T>(items: T[], next: T, limit: number) {
    items.push(next);
    if (items.length > limit) {
        items.splice(0, items.length - limit);
    }
}

function mapLuaLogLevel(level: LuaDiagnosticLevel): 'info' | 'warn' | 'error' {
    if (level === 'error') return 'error';
    if (level === 'warn') return 'warn';
    return 'info';
}

function formatTickMs(timeMs: number) {
    return `t=${(timeMs / 1000).toFixed(3)}s`;
}

function getDroneTickMs(drone: DroneState) {
    return Math.round(drone.current_time * 1000);
}

function normalizeLocation(location: string | null | undefined) {
    return String(location || '').trim() || 'неизвестное место';
}

function normalizeText(value: string | null | undefined) {
    return String(value || '').replace(/\r/g, '').trim();
}

function getLuaDiagnosticsState(drone: DroneState): LuaDiagnosticsState {
    if (!drone.luaDiagnostics) {
        drone.luaDiagnostics = {
            currentPhase: null,
            recentLogs: [],
            recentApiCalls: [],
            fsmTransitions: [],
            lastErrorStack: null,
            lastFailureReason: null,
            lastFailureDetails: []
        };
    }
    return drone.luaDiagnostics;
}

function readLuaStringArg(L: any, index: number) {
    const value = window.fengari.lua.lua_tostring(L, index);
    return value ? window.fengari.to_jsstring(value) : '';
}

function readLuaNumberArg(L: any, index: number) {
    return Number(window.fengari.lua.lua_tonumber(L, index));
}

export function describeCommandId(commandId: number) {
    const label = MCECommandDesc[commandId] || 'Неизвестная команда';
    return `${commandId} (${label})`;
}

export function setLuaExecutionPhase(drone: DroneState, phase: string | null) {
    getLuaDiagnosticsState(drone).currentPhase = phase;
}

export function pushLuaRuntimeLog(
    drone: DroneState,
    level: LuaDiagnosticLevel,
    scope: string,
    message: string,
    location?: string | null
) {
    const timeMs = getDroneTickMs(drone);
    const entry = {
        timeMs,
        level,
        scope,
        message,
        location: location || null
    };
    appendLimited(getLuaDiagnosticsState(drone).recentLogs, entry, MAX_RUNTIME_LOGS);

    const locationSuffix = location ? ` @ ${location}` : '';
    log(`[Lua ${level.toUpperCase()}] ${scope}: ${message} (${formatTickMs(timeMs)})${locationSuffix}`, mapLuaLogLevel(level));
}

export function recordLuaApiCall(
    drone: DroneState,
    api: string,
    location: string,
    argumentsText: string
) {
    const timeMs = getDroneTickMs(drone);
    const entry = {
        timeMs,
        api,
        location,
        argumentsText,
        fsmState: drone.fsmState,
        commandSource: drone.currentCommandSource || 'direct'
    } as const;
    appendLimited(getLuaDiagnosticsState(drone).recentApiCalls, entry, MAX_API_CALLS);

    pushLuaRuntimeLog(
        drone,
        'debug',
        api,
        `Аргументы: ${argumentsText}; FSM=${drone.fsmState}; source=${entry.commandSource}`,
        location
    );
}

export function recordLuaFsmTransition(
    drone: DroneState,
    from: DroneFsmState,
    to: DroneFsmState,
    reason: string,
    source: CommandSource | 'system'
) {
    const timeMs = getDroneTickMs(drone);
    const entry = {
        timeMs,
        from,
        to,
        reason,
        source
    };
    appendLimited(getLuaDiagnosticsState(drone).fsmTransitions, entry, MAX_FSM_TRANSITIONS);
    pushLuaRuntimeLog(
        drone,
        'info',
        'FSM',
        `${from} -> ${to}; reason=${reason}; source=${source}`,
        null
    );
}

export function rememberLuaErrorStack(drone: DroneState, stack: string | null | undefined) {
    getLuaDiagnosticsState(drone).lastErrorStack = normalizeText(stack) || null;
}

export function rememberLuaFailureHint(drone: DroneState, reason: string, details: string[] = []) {
    const diagnostics = getLuaDiagnosticsState(drone);
    diagnostics.lastFailureReason = normalizeText(reason) || null;
    diagnostics.lastFailureDetails = details.map((line) => normalizeText(line)).filter(Boolean);
}

function extractLuaLine(value: string): number | null {
    const match = value.match(/:(\d+):/);
    return match ? Number(match[1]) : null;
}

function extractPrimaryMessage(value: string): string {
    const lines = normalizeText(value)
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    for (const line of lines) {
        if (/^stack traceback:/i.test(line)) continue;
        if (/^\[string .+\]:\d+:/i.test(line)) return line;
        return line;
    }

    return 'Не удалось определить причину ошибки Lua.';
}

function extractTraceback(value: string): string | null {
    const normalized = normalizeText(value);
    const start = normalized.toLowerCase().indexOf('stack traceback:');
    if (start === -1) return null;
    return normalized.slice(start).trim() || null;
}

function collectTechnicalDetailLines(value: string, primary: string): string[] {
    return normalizeText(value)
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && line !== primary && !/^stack traceback:/i.test(line));
}

function isOpaqueLuaRuntimeValue(value: string | null | undefined) {
    const normalized = normalizeText(value);
    if (!normalized) return true;
    if (/^\d+$/.test(normalized)) return true;
    if (/^(true|false|null|undefined)$/i.test(normalized)) return true;
    return false;
}

function formatRecentApiCalls(drone: DroneState): string[] {
    return getLuaDiagnosticsState(drone).recentApiCalls
        .slice(-3)
        .map((entry) => `${entry.api}(${entry.argumentsText}) из ${entry.location}; FSM=${entry.fsmState}; source=${entry.commandSource}; ${formatTickMs(entry.timeMs)}.`);
}

function getMissionCommandToken(commandId: number): string {
    switch (commandId) {
        case 1:
            return 'Ev.MCE_PREFLIGHT';
        case 2:
            return 'Ev.MCE_TAKEOFF';
        case 3:
            return 'Ev.MCE_LANDING';
        default:
            return describeCommandId(commandId);
    }
}

function extractEventCommandId(argumentsText: string): number | null {
    const match = argumentsText.match(/event=(\d+)/i);
    return match ? Number(match[1]) : null;
}

function extractTimerDelay(argumentsText: string): string | null {
    const match = argumentsText.match(/^([0-9]*\.?[0-9]+)/);
    return match ? match[1] : null;
}

function formatCompactApiContextLine(
    entry: LuaApiCallRecord,
    options?: { previousEntry?: LuaApiCallRecord | null; seenMissionCommands?: Set<string> }
): string {
    if (entry.api === 'ap.push') {
        const commandId = extractEventCommandId(entry.argumentsText);
        const token = commandId === null ? 'команда миссии' : getMissionCommandToken(commandId);
        const previousCommandId = options?.previousEntry?.api === 'ap.push'
            ? extractEventCommandId(previousEntry.argumentsText)
            : null;
        const seenMissionCommands = options?.seenMissionCommands || new Set<string>();

        if (
            (previousCommandId !== null && previousCommandId === commandId)
            || seenMissionCommands.has(token)
        ) {
            return `Повторно отправлена команда ${token} без ожидания следующего этапа.`;
        }
        return `Отправлена команда ${token}.`;
    }

    if (entry.api === 'Timer.callLater') {
        const delay = extractTimerDelay(entry.argumentsText);
        return delay
            ? `Запланирован Timer.callLater(${delay}s, ...), но его callback еще не успел выполниться.`
            : 'Запланирован Timer.callLater(...), но его callback еще не успел выполниться.';
    }

    if (entry.api === 'sleep') {
        const delay = extractTimerDelay(entry.argumentsText);
        return delay
            ? `Сценарий поставил паузу sleep(${delay}s).`
            : 'Сценарий поставил паузу sleep(...).';
    }

    return `${entry.api} вызван из состояния ${entry.fsmState}.`;
}

function buildSimultaneousCommandsContextLines(drone: DroneState): string[] {
    const recentApiCalls = getLuaDiagnosticsState(drone).recentApiCalls.slice(-3);
    const seenMissionCommands = new Set<string>();
    const actionLines = recentApiCalls.map((entry, index) => {
        const prefix = index === 0 ? 'Сначала' : index === recentApiCalls.length - 1 ? 'Затем' : 'Потом';
        const line = formatCompactApiContextLine(entry, {
            previousEntry: recentApiCalls[index - 1] || null,
            seenMissionCommands
        });
        if (entry.api === 'ap.push') {
            const commandId = extractEventCommandId(entry.argumentsText);
            const token = commandId === null ? 'команда миссии' : getMissionCommandToken(commandId);
            seenMissionCommands.add(token);
        }
        return `${prefix}: ${line}`;
    });

    return [
        ...actionLines,
        'После этого сценарий остановлен, потому что команды миссии пересеклись в одном шаге.'
    ];
}

function getRecentContextLines(drone: DroneState, options?: { compact?: boolean; simultaneousCommands?: boolean }): string[] {
    const diagnostics = getLuaDiagnosticsState(drone);
    if (options?.compact && options.simultaneousCommands) {
        return buildSimultaneousCommandsContextLines(drone);
    }

    const recentCalls = formatRecentApiCalls(drone);
    const callLines = recentCalls.map((line, index) =>
        index === recentCalls.length - 1 ? `Последний вызов API: ${line}` : `Предыдущий вызов API: ${line}`
    );

    const recentLogs = options?.compact
        ? diagnostics.recentLogs.filter((entry) => entry.level !== 'debug')
        : diagnostics.recentLogs;
    const logLines = recentLogs
        .slice(-4)
        .map((entry) => `[${entry.level.toUpperCase()}] ${entry.scope}: ${entry.message}${entry.location ? ` @ ${entry.location}` : ''} (${formatTickMs(entry.timeMs)})`);

    return [...callLines, ...logLines].filter(Boolean);
}

export function getLuaFsmHistoryLines(drone: DroneState): string[] {
    return getLuaDiagnosticsState(drone).fsmTransitions
        .slice(-6)
        .map((entry) => (
            entry.from === entry.to
                ? `${formatTickMs(entry.timeMs)}: состояние осталось ${entry.to} (${entry.reason}; source=${entry.source})`
                : `${formatTickMs(entry.timeMs)}: ${entry.from} -> ${entry.to} (${entry.reason}; source=${entry.source})`
        ));
}

function buildFallbackReason(drone: DroneState): { summary: string; details: string[] } | null {
    const diagnostics = getLuaDiagnosticsState(drone);
    if (diagnostics.lastFailureReason) {
        return {
            summary: diagnostics.lastFailureReason,
            details: diagnostics.lastFailureDetails
        };
    }

    const recentLogs = diagnostics.recentLogs.slice(-4).map((entry) => entry.message);
    const simultaneous = recentLogs.find((line) => /simultaneous mission commands|run at the same time/i.test(line));
    if (simultaneous) {
        return {
            summary: 'Команды миссии запущены одновременно без паузы, поэтому сценарий аварийно остановлен.',
            details: [
                'Разнесите команды по разным этапам через `Timer.callLater(...)`, `sleep(...)` или `callback(event)`.',
                ...formatRecentApiCalls(drone).slice(-2)
            ]
        };
    }

    return null;
}

function isSimultaneousCommandsFailure(reason: string | null | undefined) {
    return /команды миссии запущены одновременно без паузы|simultaneous mission commands|run at the same time/i.test(normalizeText(reason));
}

export function createLuaRuntimeFailureError(
    drone: DroneState,
    phase: string,
    rawError: string
): ScriptFailureError {
    const normalized = normalizeText(rawError) || 'Неизвестная ошибка выполнения Lua.';
    const opaqueRuntimeValue = isOpaqueLuaRuntimeValue(normalized);
    const fallback = opaqueRuntimeValue ? buildFallbackReason(drone) : null;
    const primary = fallback?.summary || extractPrimaryMessage(normalized);
    const stackCandidate = extractTraceback(normalized) || getLuaDiagnosticsState(drone).lastErrorStack;
    const stack = isOpaqueLuaRuntimeValue(stackCandidate) ? null : stackCandidate;
    const technicalDetails = [
        ...(fallback?.details || []),
        ...collectTechnicalDetailLines(normalized, primary)
    ].filter((line, index, items) => items.indexOf(line) === index);

    return createScriptFailureError('runtime', primary, {
        line: extractLuaLine(primary) ?? (!opaqueRuntimeValue ? extractLuaLine(normalized) : null),
        details: technicalDetails.join('\n') || null,
        phase,
        stack,
        contextLines: getRecentContextLines(drone, {
            compact: Boolean(fallback),
            simultaneousCommands: isSimultaneousCommandsFailure(fallback?.summary || primary)
        }),
        fsmHistory: getLuaFsmHistoryLines(drone)
    });
}

export const js_diag_log = function(L: any) {
    const drone = getDroneFromLua(L);
    const level = (readLuaStringArg(L, 1) || 'info').toLowerCase() as LuaDiagnosticLevel;
    const scope = readLuaStringArg(L, 2) || 'Lua';
    const message = readLuaStringArg(L, 3) || 'Пустое диагностическое сообщение';
    const location = readLuaStringArg(L, 4) || null;
    pushLuaRuntimeLog(drone, level, scope, message, location);
    return 0;
};

export const js_diag_record_api_call = function(L: any) {
    const drone = getDroneFromLua(L);
    const api = readLuaStringArg(L, 1) || 'unknown';
    const location = normalizeLocation(readLuaStringArg(L, 2));
    const argumentsText = readLuaStringArg(L, 3) || '';
    recordLuaApiCall(drone, api, location, argumentsText);
    return 0;
};

export const js_diag_get_fsm_state = function(L: any) {
    const drone = getDroneFromLua(L);
    window.fengari.lua.lua_pushstring(L, window.fengari.to_luastring(drone.fsmState));
    return 1;
};

export const js_diag_describe_mce = function(L: any) {
    const commandId = readLuaNumberArg(L, 1);
    window.fengari.lua.lua_pushstring(L, window.fengari.to_luastring(describeCommandId(commandId)));
    return 1;
};
