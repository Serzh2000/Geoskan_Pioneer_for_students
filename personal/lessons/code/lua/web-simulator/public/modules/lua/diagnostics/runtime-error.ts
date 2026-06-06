/**
 * Сборка детализированных runtime-ошибок Lua на основе накопленной диагностики.
 * Преобразует сырой текст ошибки в структурированную форму для UI-уведомлений.
 */
import { createScriptFailureError, type ScriptFailureError } from '../../app/script-execution-notice.js';
import type { DroneState } from '../../core/state.js';
import {
    formatRecentApiCalls,
    getLuaDiagnosticsState,
    getLuaFsmHistoryLines,
    getRecentContextLines,
    normalizeText
} from './state.js';

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
