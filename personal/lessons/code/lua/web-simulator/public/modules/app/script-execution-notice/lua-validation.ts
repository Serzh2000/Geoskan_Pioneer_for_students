/**
 * Эвристики валидации учебных Lua-сценариев перед запуском.
 * Собирает только предметные проблемы, без показа UI.
 */
import { scriptHasLuaEventCallback } from '../../lua/mission-guard.js';

function hasLuaEarlyRouteIssue(code: string) {
    // Timer-driven route start during TAKEOFF_PROCESS is intentionally supported.
    void code;
    return false;
}

function blankLuaText(text: string) {
    return text.replace(/[^\r\n]/g, ' ');
}

function stripLuaCommentsAndStrings(code: string) {
    return code.replace(
        /--\[(=*)\[[\s\S]*?\]\1\]|--[^\r\n]*|\[(=*)\[[\s\S]*?\]\2\]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
        blankLuaText
    );
}

// Only compare commands known to execute together. A function declaration is
// not an invocation: Path methods and event handlers run at different times.
function luaFunctionRanges(code: string) {
    const stack: Array<{ kind: string; start: number }> = [];
    const ranges: Array<{ start: number; end: number }> = [];
    for (const match of code.matchAll(/\b(function|if|do|repeat|end|until)\b/g)) {
        const kind = match[1];
        if (kind === 'end' || kind === 'until') {
            const block = stack.pop();
            if (block?.kind === 'function') ranges.push({ start: block.start, end: match.index! + kind.length });
        } else {
            stack.push({ kind, start: match.index! });
        }
    }
    return ranges;
}

function stripLuaManagedBlocks(code: string) {
    const ranges = luaFunctionRanges(code).sort((a, b) => a.start - b.start);
    let result = '';
    let offset = 0;
    for (const range of ranges) {
        if (range.start < offset) continue;
        result += code.slice(offset, range.start) + blankLuaText(code.slice(range.start, range.end));
        offset = range.end;
    }
    return result + code.slice(offset);
}

function collectLuaMissionCommands(fragment: string): string[] {
    const commands: string[] = [];
    const pushMatches = [...fragment.matchAll(/ap\.push\s*\(\s*ev\.(mce_preflight|mce_takeoff|mce_landing)/g)];
    for (const [, command] of pushMatches) {
        if (command === 'mce_preflight') commands.push('PREFLIGHT');
        if (command === 'mce_takeoff') commands.push('TAKEOFF');
        if (command === 'mce_landing') commands.push('LANDING');
    }
    const goToMatches = fragment.match(/ap\.gotolocalpoint\s*\(/g) || [];
    for (let i = 0; i < goToMatches.length; i += 1) {
        commands.push('goToLocalPoint');
    }
    return commands;
}

function collectLuaDelayedMissionCommands(code: string): Map<string, string[]> {
    const grouped = new Map<string, string[]>();
    const ranges = luaFunctionRanges(code);
    const timerPattern = /timer\.calllater\s*\(\s*([0-9]*\.?[0-9]+)\s*,\s*(function)\s*\([^)]*\)/g;
    for (const match of code.matchAll(timerPattern)) {
        // Timers inside helper functions may be registered in different calls
        // or exclusive branches. Equal delays do not establish equal deadlines.
        if (ranges.some(range => range.start < match.index! && range.end > match.index!)) continue;
        const functionStart = match.index! + match[0].indexOf('function');
        const range = ranges.find(candidate => candidate.start === functionStart);
        if (!range) continue;
        const delay = String(Number(match[1]));
        const body = code.slice(match.index! + match[0].length, range.end - 3);
        const commands = collectLuaMissionCommands(stripLuaManagedBlocks(body));
        if (!commands.length) continue;
        const bucket = grouped.get(delay) || [];
        bucket.push(...commands);
        grouped.set(delay, bucket);
    }
    return grouped;
}

function hasLuaAutopilotMissionApiUsage(code: string) {
    const normalized = (code || '').toLowerCase();
    return (
        /ap\.push\s*\(/.test(normalized)
        || /ap\.gotopoint\s*\(/.test(normalized)
        || /ap\.gotolocalpoint\s*\(/.test(normalized)
        || /ap\.updateyaw\s*\(/.test(normalized)
    );
}

// Разделители шагов миссии: `sleep(` — старый учебный Lua, `action[` —
// начало нового состояния FSM генератора pioneer_* (targets/lua-fsm.ts,
// targets/compile.ts; см. docs/blockly-unification-plan.md §4.3, §7 фаза 7
// шаг 5, пересмотрено 2026-09-13 — FSM вместо корутины, см. §2.1). Каждый
// блок-ожидание завершает текущее состояние и открывает следующее, поэтому
// граница state-таблицы — это и есть граница шага миссии: без этого
// разделителя команды из РАЗНЫХ сегментов (например, PREFLIGHT в action["__s0"]
// и TAKEOFF в action["__s1"]) слиплись бы в один шаг с двумя командами.
// Маркеры __wait_event(.../__wait_seconds(, которыми размечали шаги до
// перехода на FSM, в готовый Lua больше не попадают вовсе (это только
// внутренний сигнал компилятора, см. targets/lua-fsm.ts) — здесь их
// заменяет граница action[...].
const MISSION_STEP_SEPARATOR_PATTERN = /\bsleep\s*\(|\baction\s*\[/;

function collectLuaMissionCommandGroups(fragment: string): string[][] {
    const groups: string[][] = [];
    let currentGroup: string[] = [];

    for (const line of fragment.split(/\r?\n/)) {
        const normalizedLine = line.trim().toLowerCase();
        if (!normalizedLine) continue;

        if (MISSION_STEP_SEPARATOR_PATTERN.test(normalizedLine)) {
            if (currentGroup.length) {
                groups.push(currentGroup);
                currentGroup = [];
            }
            continue;
        }

        const commands = collectLuaMissionCommands(normalizedLine);
        if (commands.length) {
            currentGroup.push(...commands);
        }
    }

    if (currentGroup.length) {
        groups.push(currentGroup);
    }

    return groups;
}

export function collectLuaIssues(code: string): string[] {
    const normalized = stripLuaCommentsAndStrings(code || '').toLowerCase();
    const issues: string[] = [];
    const hasPreflight = normalized.includes('ev.mce_preflight');
    const hasTakeoff = normalized.includes('ev.mce_takeoff');
    const hasLanding = normalized.includes('ev.mce_landing');
    const hasGoTo = normalized.includes('ap.gotolocalpoint');
    const hasCallback = scriptHasLuaEventCallback(code);
    const hasTimer = /timer\.(calllater|new)\s*\(/.test(normalized);
    const hasSleep = /\bsleep\s*\(/.test(normalized);
    const hasLedbar = /ledbar\.new\s*\(/.test(normalized);
    const hasLedSet = /:set\s*\(/.test(normalized);

    if (hasLedbar && !hasLedSet) {
        issues.push('Лента светодиодов создана, но `leds:set(...)` ни разу не вызывается.');
    }
    // callback(event) is required for event-driven continuation, but it is
    // not required when the script sequences commands with Timer.callLater()
    // (a valid pattern used by Pioneer Station examples). Do not report its
    // absence as a generic launch problem here.
    if (hasTakeoff && !hasPreflight) {
        issues.push('Команда взлета используется без `Ev.MCE_PREFLIGHT`. Начните со стадии предполета.');
    }
    if (hasGoTo && !hasTakeoff) {
        issues.push('Маршрут запускается до взлета. Сначала выполните `PREFLIGHT` и `TAKEOFF`.');
    }
    if (hasLanding && !hasTakeoff) {
        issues.push('Посадка запускается до взлета. Проверьте порядок команд миссии.');
    }
    if ((hasTakeoff || hasGoTo || hasLanding) && !hasTimer && !hasCallback && !hasSleep) {
        issues.push('Команды миссии запускаются подряд без пауз. Добавьте между этапами `sleep(...)`, `Timer.callLater(...)` или `callback(event)`.');
    }
    if (/timer\.calllater\s*\(\s*[^,]+,\s*(?!function\b)[a-z_][\w.:]*\s*\(/i.test(code || '')) {
        issues.push('В `Timer.callLater(...)` передан результат вызова функции, поэтому она выполняется сразу. Передайте сам callback, например `blinkGreen` или `function() ... end`.');
    }

    const immediateControlCode = stripLuaManagedBlocks(normalized);
    for (const commands of collectLuaMissionCommandGroups(immediateControlCode)) {
        if (commands.length >= 2) {
            issues.push(`В одном шаге запускаются несколько команд миссии: ${commands.join(', ')}. Разделите их через \`sleep(...)\`, \`Timer.callLater(...)\` или \`callback(event)\`.`);
            break;
        }
    }

    for (const [delay, commands] of collectLuaDelayedMissionCommands(normalized).entries()) {
        if (commands.length >= 2) {
            issues.push(`\`Timer.callLater(${delay})\` ставит несколько команд одновременно: ${commands.join(', ')}. Разнесите их по разным таймерам или продолжайте сценарий из \`callback(event)\`.`);
        }
    }

    return issues;
}

export function collectLuaBlockingIssues(code: string): string[] {
    const normalized = (code || '').toLowerCase();
    const issues: string[] = [];

    const whileTrueBodies = [...normalized.matchAll(/\bwhile\s+true\s+do\b([\s\S]*?)\bend\b/g)];
    if (whileTrueBodies.some((match) => !/\bsleep\s*\(/.test(match[1] || ''))) {
        issues.push(
            '\u0412 `while true do` \u043d\u0435\u0442 `sleep(...)`, \u043f\u043e\u044d\u0442\u043e\u043c\u0443 \u0446\u0438\u043a\u043b \u043d\u0435 \u0443\u0441\u0442\u0443\u043f\u0430\u0435\u0442 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u0441\u0438\u043c\u0443\u043b\u044f\u0442\u043e\u0440\u0443 \u0438 \u043c\u043e\u0436\u0435\u0442 \u043c\u0433\u043d\u043e\u0432\u0435\u043d\u043d\u043e \u0437\u0430\u0432\u0438\u0441\u0438\u0442\u044c \u0437\u0430\u043f\u0443\u0441\u043a.'
        );
    }

    return issues;
}

export function detectLuaEarlyRouteIssue(code: string): boolean {
    return hasLuaEarlyRouteIssue(code);
}
