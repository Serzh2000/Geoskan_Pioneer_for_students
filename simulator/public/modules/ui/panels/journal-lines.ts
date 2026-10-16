import type { LogRecord } from '../../shared/logging/logger.js';

/*
 * What the flight journal (Бортжурнал, editor-terminal.ts) prints for a log record.
 * The shared logger keeps every record; this module decides which ones a student
 * should see by default and what to call them:
 *   program - output of the student's program (print, Python output)
 *   flight  - autopilot commands and flight events (PREFLIGHT, TAKEOFF, LAND, POINT, battery, crash)
 *   warning / error - problems from any source
 *   system  - browser-side diagnostics ([3D-INIT], Opening panel ..., editor, camera, guide)
 * Only `system` is hidden until the "Системные" switch is on.
 */
export type JournalKind = 'program' | 'flight' | 'warning' | 'error' | 'system';

export interface JournalLine {
    kind: JournalKind;
    /** Short event label shown as a text chip (TAKEOFF, PRINT, ОШИБКА). */
    label: string;
}

type JournalSource = Pick<LogRecord, 'tag' | 'message' | 'tone' | 'category'>;

const MCE_COMMAND_LABELS: Record<string, string> = {
    MCE_PREFLIGHT: 'PREFLIGHT',
    MCE_TAKEOFF: 'TAKEOFF',
    MCE_LANDING: 'LAND',
    ENGINES_ARM: 'ARM',
    ENGINES_DISARM: 'DISARM'
};

// Russian descriptions logged by autopilot/mce-events.ts as "Команда MCE: <описание>".
const MCE_DESCRIPTION_LABELS: Record<string, string> = {
    'предполетная подготовка': 'PREFLIGHT',
    'предполётная подготовка': 'PREFLIGHT',
    'взлет': 'TAKEOFF',
    'взлёт': 'TAKEOFF',
    'посадка': 'LAND',
    'взвод двигателей': 'ARM',
    'отключение двигателей': 'DISARM'
};

const CRASH_PATTERN = /разбил|разруш|crash|авари/iu;

function describeAutopilotApiCall(message: string): string {
    const push = message.match(/ap\.push\(\s*(?:Ev\.)?([A-Z_]+)/u);
    if (push) return MCE_COMMAND_LABELS[push[1]] ?? push[1];
    if (/ap\.goTo(?:Local)?Point/u.test(message)) return 'POINT';
    if (/ap\.updateYaw/u.test(message)) return 'YAW';
    return 'AUTOPILOT';
}

export function describeLogEntry(entry: JournalSource): JournalLine {
    const tag = entry.tag.trim().toLowerCase();
    const isWarning = entry.tone === 'warn';

    if (entry.tone === 'error') {
        return { kind: 'error', label: CRASH_PATTERN.test(entry.message) ? 'АВАРИЯ' : 'ОШИБКА' };
    }

    if (tag === '[lua print]') return { kind: 'program', label: 'PRINT' };
    if (tag === '[python local]') return { kind: isWarning ? 'warning' : 'program', label: isWarning ? 'ВНИМАНИЕ' : 'PYTHON' };
    if (/^\[lua (?:info|warn|warning|log)\]$/u.test(tag)) {
        if (isWarning) return { kind: 'warning', label: 'ВНИМАНИЕ' };
        // Autopilot state changes are flight events; the rest of the Lua trace is developer diagnostics.
        if (/^FSM:\s*[A-Z_]+\s*->\s*[A-Z_]+/u.test(entry.message)) return { kind: 'flight', label: 'АВТОПИЛОТ' };
        return { kind: 'system', label: '' };
    }

    if (tag === '[lua ap]') {
        return { kind: 'flight', label: isWarning ? 'ВНИМАНИЕ' : describeAutopilotApiCall(entry.message) };
    }
    if (tag === 'команда mce') {
        return { kind: 'flight', label: MCE_DESCRIPTION_LABELS[entry.message.trim().toLowerCase()] ?? 'КОМАНДА' };
    }
    if (tag === '[ap params]') return isWarning ? { kind: 'warning', label: 'ВНИМАНИЕ' } : { kind: 'system', label: '' };
    if (tag === '[battery]') return { kind: isWarning ? 'warning' : 'flight', label: isWarning ? 'ВНИМАНИЕ' : 'BATTERY' };
    if (tag === '[physics]') {
        return { kind: 'flight', label: CRASH_PATTERN.test(entry.message) ? 'АВАРИЯ' : isWarning ? 'ВНИМАНИЕ' : 'ПОЛЁТ' };
    }
    if (tag === '[magnet]') return { kind: 'flight', label: 'MAGNET' };

    // Warnings the program itself raised (FSM warnings, script runtime) stay visible; scene and editor warnings are diagnostics.
    if (isWarning && (entry.category === 'script' || tag === 'warning')) return { kind: 'warning', label: 'ВНИМАНИЕ' };

    return { kind: 'system', label: '' };
}

export function isDefaultJournalLine(line: JournalLine): boolean {
    return line.kind !== 'system';
}

/** Flight seconds as mm:ss.t, the way the telemetry shows time: 3.2 -> "00:03.2". */
export function formatJournalTime(seconds: number | undefined): string {
    const safe = typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    const tenths = Math.floor(safe * 10);
    const minutes = Math.floor(tenths / 600);
    const secs = Math.floor((tenths % 600) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths % 10}`;
}

/** Student-facing text: developer diagnostics (reason/source tails, Lua chunk locations) are stripped. */
const FSM_STATE_RU: Record<string, string> = {
    IDLE: 'На земле', PREFLIGHT: 'Взвод', TAKEOFF_PROCESS: 'Взлёт', FLYING_HOVER: 'Висение',
    FLYING_MOVING: 'В полёте', LANDING_PROCESS: 'Посадка', CRASHED: 'Авария', DISARMED_FALL: 'Авария'
};

export function cleanJournalMessage(message: string): string {
    return message
        .replace(/^FSM:\s*([A-Z_]+)\s*->\s*([A-Z_]+).*$/u, (_m, a: string, b: string) => `${FSM_STATE_RU[a] ?? a} → ${FSM_STATE_RU[b] ?? b}`)
        .replace(/\s*@\s*\[string "[^"]*"\]:\d+\s*(?:\[[^\]]*\])?/gu, '')
        .replace(/\s*\[string "[^"]*"\]:\d+:?/gu, '')
        .replace(/;?\s*reason=[^;]+;?/gu, '')
        .replace(/;?\s*source=[^;()]+(?:\s*\(t=[^)]*\))?/gu, '')
        .replace(/\s*\(t=[0-9.]+s\)/gu, '')
        .replace(/\s*;\s*$/u, '')
        .replace(/\s{2,}/gu, ' ')
        .trim();
}
