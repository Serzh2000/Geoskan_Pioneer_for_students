/**
 * Эвристики валидации учебных Lua-сценариев перед запуском.
 * Собирает только предметные проблемы, без показа UI.
 */
import { scriptHasLuaEventCallback } from '../../lua/mission-guard.js';

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

function hasLuaAutopilotMissionApiUsage(code: string) {
    const normalized = (code || '').toLowerCase();
    return (
        /ap\.push\s*\(/.test(normalized)
        || /ap\.gotopoint\s*\(/.test(normalized)
        || /ap\.gotolocalpoint\s*\(/.test(normalized)
        || /ap\.updateyaw\s*\(/.test(normalized)
    );
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

export function collectLuaIssues(code: string): string[] {
    const normalized = (code || '').toLowerCase();
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
    if (hasLuaAutopilotMissionApiUsage(code) && !hasCallback) {
        issues.push(
            'В сценарии нет `function callback(event) ... end`. Симулятор выполнит только первую команду миссии, а следующие команды автопилота проигнорирует, потому что подтверждающие события некому обработать в Lua.'
        );
    }
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
    if (hasLuaEarlyRouteIssue(code)) {
        issues.push('Маршрут привязан к `Timer.callLater(...)`, а не к `TAKEOFF_COMPLETE`, поэтому `goToLocalPoint(...)` может выполниться, пока FSM взлета еще активен.');
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
