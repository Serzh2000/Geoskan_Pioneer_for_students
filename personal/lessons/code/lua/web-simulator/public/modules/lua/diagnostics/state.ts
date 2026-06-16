/**
 * Базовые операции над состоянием Lua-диагностики дрона.
 * Здесь живут логи, API-вызовы, история FSM и связанные helper-утилиты.
 */
import { MCECommandDesc } from '../../autopilot/mce-events.js';
import type {
    CommandSource,
    DroneFsmState,
    DroneState,
    LuaDiagnosticLevel,
    LuaDiagnosticsState
} from '../../core/state.js';
import { log } from '../../shared/logging/logger.js';

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

export function formatTickMs(timeMs: number) {
    return `t=${(timeMs / 1000).toFixed(3)}s`;
}

function getDroneTickMs(drone: DroneState) {
    return Math.round(drone.current_time * 1000);
}

export function normalizeLocation(location: string | null | undefined) {
    return String(location || '').trim() || 'неизвестное место';
}

export function normalizeText(value: string | null | undefined) {
    return String(value || '').replace(/\r/g, '').trim();
}

export function getLuaDiagnosticsState(drone: DroneState): LuaDiagnosticsState {
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

    if (level === 'debug') {
        return;
    }

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
    entry: (typeof getLuaDiagnosticsState extends (...args: any[]) => infer R ? R : never)['recentApiCalls'][number],
    options?: {
        previousEntry?: ((typeof getLuaDiagnosticsState extends (...args: any[]) => infer R ? R : never)['recentApiCalls'][number]) | null;
        seenMissionCommands?: Set<string>;
    }
): string {
    if (entry.api === 'ap.push') {
        const commandId = extractEventCommandId(entry.argumentsText);
        const token = commandId === null ? 'команда миссии' : getMissionCommandToken(commandId);
        const previousCommandId = options?.previousEntry?.api === 'ap.push'
            ? extractEventCommandId(options.previousEntry.argumentsText)
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

export function formatRecentApiCalls(drone: DroneState): string[] {
    return getLuaDiagnosticsState(drone).recentApiCalls
        .slice(-3)
        .map((entry) => `${entry.api}(${entry.argumentsText}) из ${entry.location}; FSM=${entry.fsmState}; source=${entry.commandSource}; ${formatTickMs(entry.timeMs)}.`);
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

export function getRecentContextLines(
    drone: DroneState,
    options?: { compact?: boolean; simultaneousCommands?: boolean }
): string[] {
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
