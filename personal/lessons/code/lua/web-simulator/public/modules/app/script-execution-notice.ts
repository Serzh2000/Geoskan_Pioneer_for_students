import { log } from '../shared/logging/logger.js';
import type { ScriptLanguage } from '../core/state.js';
import {
    renderEarlyRouteHtml,
    renderIssuesHtml,
    renderSimultaneousCommandsHtml
} from './script-execution-notice-templates.js';

type NoticeSuppressionState = {
    simultaneousCommands: boolean;
    earlyRoute: boolean;
};

export function scriptHasVisibleDelay(language: ScriptLanguage, code: string) {
    const normalized = (code || '').toLowerCase();
    if (language === 'python') {
        return /\b(time|asyncio)\.sleep\s*\(/.test(normalized) || /\bawait\s+asyncio\.sleep\s*\(/.test(normalized);
    }
    return /\bsleep\s*\(/.test(normalized) || /\btimer\.(calllater|new)\s*\(/.test(normalized);
}

function hasLuaEarlyRouteIssue(code: string) {
    const normalized = (code || '').toLowerCase();
    const hasTakeoff = normalized.includes('ev.mce_takeoff');
    const hasGoTo = normalized.includes('ap.gotolocalpoint');
    const hasTakeoffCompleteRouteHandler = /if\s+event\s*==\s*ev\.takeoff_complete[\s\S]*?ap\.gotolocalpoint\s*\(/.test(normalized);
    const hasTimerBasedRoute = /timer\.calllater\s*\(\s*[0-9]*\.?[0-9]+\s*,\s*function\s*\([^)]*\)\s*[\s\S]*?ap\.gotolocalpoint\s*\(/.test(normalized);
    return hasTakeoff && hasGoTo && hasTimerBasedRoute && !hasTakeoffCompleteRouteHandler;
}

function countLuaBlockOpeners(line: string) {
    let count = 0;
    count += (line.match(/\bfunction\b/g) || []).length;
    count += (line.match(/\bif\b.*\bthen\b/g) || []).length;
    count += (line.match(/\bfor\b.*\bdo\b/g) || []).length;
    count += (line.match(/\bwhile\b.*\bdo\b/g) || []).length;
    return count;
}

function countLuaBlockClosers(line: string) {
    return (line.match(/\bend\b/g) || []).length;
}

function stripLuaManagedBlocks(code: string) {
    const lines = code.split(/\r?\n/);
    const remainingLines: string[] = [];
    let skipDepth = 0;

    for (const line of lines) {
        const trimmed = line.trim();

        if (skipDepth > 0) {
            skipDepth += countLuaBlockOpeners(trimmed);
            skipDepth -= countLuaBlockClosers(trimmed);
            if (skipDepth < 0) skipDepth = 0;
            continue;
        }

        const isCallbackStart = /^function\s+callback\s*\(/.test(trimmed);
        const isTimerFunctionStart = /timer\.(calllater|new)\s*\([\s\S]*\bfunction\b/.test(trimmed);

        if (isCallbackStart || isTimerFunctionStart) {
            skipDepth = 1;
            continue;
        }

        remainingLines.push(line);
    }

    return remainingLines.join('\n');
}

function collectLuaMissionCommandGroups(fragment: string): string[][] {
    const groups: string[][] = [];
    let currentGroup: string[] = [];

    for (const line of fragment.split(/\r?\n/)) {
        const normalizedLine = line.trim().toLowerCase();
        if (!normalizedLine) continue;

        if (/\bsleep\s*\(/.test(normalizedLine)) {
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

function collectLuaIssues(code: string): string[] {
    const normalized = (code || '').toLowerCase();
    const issues: string[] = [];
    const hasPreflight = normalized.includes('ev.mce_preflight');
    const hasTakeoff = normalized.includes('ev.mce_takeoff');
    const hasLanding = normalized.includes('ev.mce_landing');
    const hasGoTo = normalized.includes('ap.gotolocalpoint');
    const hasCallback = /function\s+callback\s*\(/.test(normalized);
    const hasTimer = /timer\.(calllater|new)\s*\(/.test(normalized);
    const hasSleep = /\bsleep\s*\(/.test(normalized);
    const hasLedbar = /ledbar\.new\s*\(/.test(normalized);
    const hasLedSet = /:set\s*\(/.test(normalized);

    if (hasLedbar && !hasLedSet) {
        issues.push('Led strip object is created, but `leds:set(...)` is never called.');
    }
    if (hasTakeoff && !hasPreflight) {
        issues.push('Takeoff command is used without `Ev.MCE_PREFLIGHT`. Start with the preflight stage.');
    }
    if (hasGoTo && !hasTakeoff) {
        issues.push('Route command is used before takeoff. Run `PREFLIGHT` and `TAKEOFF` first.');
    }
    if (hasLanding && !hasTakeoff) {
        issues.push('Landing command is used before takeoff. Check the mission order.');
    }
    if ((hasTakeoff || hasGoTo || hasLanding) && !hasTimer && !hasCallback && !hasSleep) {
        issues.push('Mission commands run back-to-back without pauses. Add `sleep(...)`, `Timer.callLater(...)`, or `callback(event)` between stages.');
    }
    if (hasLuaEarlyRouteIssue(code)) {
        issues.push('Route start is tied to `Timer.callLater(...)` instead of `TAKEOFF_COMPLETE`, so `goToLocalPoint(...)` may run while takeoff FSM is still active.');
    }

    const immediateControlCode = stripLuaManagedBlocks(normalized);
    for (const commands of collectLuaMissionCommandGroups(immediateControlCode)) {
        if (commands.length >= 2) {
            issues.push(`Multiple mission commands are issued in one step: ${commands.join(', ')}. Split them with \`sleep(...)\`, \`Timer.callLater(...)\`, or \`callback(event)\`.`);
            break;
        }
    }

    for (const [delay, commands] of collectLuaDelayedMissionCommands(normalized).entries()) {
        if (commands.length >= 2) {
            issues.push(`\`Timer.callLater(${delay})\` schedules multiple commands at once: ${commands.join(', ')}. Use separate timers or continue from \`callback(event)\`.`);
        }
    }

    return issues;
}

function getNoticeSuppressionState(): NoticeSuppressionState {
    const state = (window as any).__simulationNoticeSuppression;
    if (state && typeof state === 'object') {
        return state as NoticeSuppressionState;
    }

    const nextState: NoticeSuppressionState = {
        simultaneousCommands: false,
        earlyRoute: false
    };
    (window as any).__simulationNoticeSuppression = nextState;
    return nextState;
}

export function resetScriptExecutionNoticeState() {
    delete (window as any).__simulationNoticeSuppression;
}

function markSimultaneousNoticeAsShown() {
    getNoticeSuppressionState().simultaneousCommands = true;
}

function shouldSuppressSimultaneousNotice() {
    return getNoticeSuppressionState().simultaneousCommands;
}

function markEarlyRouteNoticeAsShown() {
    getNoticeSuppressionState().earlyRoute = true;
}

function shouldSuppressEarlyRouteNotice() {
    return getNoticeSuppressionState().earlyRoute;
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
    const timerPattern = /timer\.calllater\s*\(\s*([0-9]*\.?[0-9]+)\s*,\s*function\s*\([^)]*\)\s*([\s\S]*?)end\s*\)/g;
    for (const match of code.matchAll(timerPattern)) {
        const delay = match[1];
        const body = match[2] || '';
        const commands = collectLuaMissionCommands(body);
        if (!commands.length) continue;
        const bucket = grouped.get(delay) || [];
        bucket.push(...commands);
        grouped.set(delay, bucket);
    }
    return grouped;
}

function collectPythonIssues(code: string): string[] {
    const normalized = (code || '').toLowerCase();
    const issues: string[] = [];
    const hasArm = /(?:pioneer\.)?arm\s*\(/.test(normalized);
    const hasTakeoff = /(?:pioneer\.)?takeoff\s*\(/.test(normalized);
    const hasGoTo = /go_to_local_point\s*\(/.test(normalized);
    const hasLand = /(?:pioneer\.)?land\s*\(/.test(normalized);
    const hasPointReached = /point_reached\s*\(/.test(normalized);
    const hasSleep = /\b(time|asyncio)\.sleep\s*\(/.test(normalized) || /\bawait\s+asyncio\.sleep\s*\(/.test(normalized);
    const ledCalls = (normalized.match(/led_control\s*\(/g) || []).length;

    if (ledCalls > 1 && !hasSleep) {
        issues.push('Multiple `led_control(...)` calls run without `time.sleep(...)`. The color may change too fast.');
    }
    if (hasTakeoff && !hasArm) {
        issues.push('`takeoff()` is called without `arm()`. Arm the drone first.');
    }
    if (hasGoTo && !hasTakeoff) {
        issues.push('`go_to_local_point(...)` is called before `takeoff()`. Take off first.');
    }
    if (hasLand && !hasTakeoff) {
        issues.push('`land()` is called before takeoff. Check the command order.');
    }
    if ((hasTakeoff || hasGoTo || hasLand) && !hasSleep && !hasPointReached) {
        issues.push('Mission commands run without waiting. Add `time.sleep(...)` and/or `point_reached()` checks.');
    }
    if (hasGoTo && !hasPointReached && !hasSleep) {
        issues.push('There is no wait after `go_to_local_point(...)`. Add a `point_reached()` loop or a pause.');
    }

    return issues;
}

export function showScenarioValidationNotice(language: ScriptLanguage, code: string) {
    const issues = language === 'python' ? collectPythonIssues(code) : collectLuaIssues(code);
    if (!issues.length) return;

    if (language === 'lua') {
        const simultaneousIssue = issues.find((issue) =>
            issue.includes('at once')
            || issue.includes('Multiple mission commands')
        );
        if (simultaneousIssue) {
            markSimultaneousNoticeAsShown();
        }
        if (hasLuaEarlyRouteIssue(code)) {
            markEarlyRouteNoticeAsShown();
        }
    }

    const summary = issues.length === 1
        ? issues[0]
        : `Found ${issues.length} scenario issues. Fix them before launch.`;

    log(summary, 'warn');

    if (!(window as any).showSimulationNotice) return;

    (window as any).showSimulationNotice({
        title: 'Check Script Before Launch',
        message: summary,
        detailsHtml: renderIssuesHtml(language, issues),
        level: 'warn'
    });
}

export function warnAboutInstantExecution(language: ScriptLanguage) {
    const message = language === 'python'
        ? 'The script runs commands too fast. In Python you usually need pauses between `arm()`, `takeoff()`, `go_to_local_point()`, and `land()`.'
        : 'The script runs commands too fast. In Lua FSM, add pauses with `sleep(...)`, `Timer.callLater(...)`, or `callback(event)`.';

    log(message, 'warn');

    if (!(window as any).showSimulationNotice) return;

    (window as any).showSimulationNotice({
        title: 'Script Warning',
        message,
        detailsHtml: renderIssuesHtml(language, [message]),
        level: 'warn'
    });
}

export function showSimultaneousCommandsNotice(commands: string[]) {
    if (shouldSuppressSimultaneousNotice()) return;

    const uniqueCommands = Array.from(new Set(commands));
    const message = uniqueCommands.length > 1
        ? `Commands run at the same time: ${uniqueCommands.join(', ')}.`
        : `Command ${uniqueCommands[0] || 'mission'} runs together with another operation.`;

    if (!(window as any).showSimulationNotice) return;
    (window as any).showSimulationNotice({
        title: 'Commands Overlap',
        message,
        detailsHtml: renderSimultaneousCommandsHtml(uniqueCommands),
        level: 'warn'
    });
}

export function showEarlyRouteNotice() {
    if (shouldSuppressEarlyRouteNotice()) return;
    markEarlyRouteNoticeAsShown();

    const message = '`goToLocalPoint(...)` was sent before takeoff finished. Wait for `TAKEOFF_COMPLETE`.';

    log(message, 'warn');

    if (!(window as any).showSimulationNotice) return;
    (window as any).showSimulationNotice({
        title: 'Route Started Too Early',
        message,
        detailsHtml: renderEarlyRouteHtml(),
        level: 'warn'
    });
}
