import { log } from '../shared/logging/logger.js';
import type { ScriptLanguage } from '../core/state.js';

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

function collectLuaIssues(code: string): string[] {
    const normalized = (code || '').toLowerCase();
    const issues: string[] = [];
    const hasPreflight = normalized.includes('ev.mce_preflight');
    const hasTakeoff = normalized.includes('ev.mce_takeoff');
    const hasLanding = normalized.includes('ev.mce_landing');
    const hasGoTo = normalized.includes('ap.gotolocalpoint');
    const hasCallback = /function\s+callback\s*\(/.test(normalized);
    const hasTimer = /timer\.(calllater|new)\s*\(/.test(normalized);
    const hasLedbar = /ledbar\.new\s*\(/.test(normalized);
    const hasLedSet = /:set\s*\(/.test(normalized);
    const hasTakeoffCompleteRouteHandler = /if\s+event\s*==\s*ev\.takeoff_complete[\s\S]*?ap\.gotolocalpoint\s*\(/.test(normalized);
    const hasTimerBasedRoute = /timer\.calllater\s*\(\s*[0-9]*\.?[0-9]+\s*,\s*function\s*\([^)]*\)\s*[\s\S]*?ap\.gotolocalpoint\s*\(/.test(normalized);

    if (hasLedbar && !hasLedSet) {
        issues.push('Создана светодиодная лента, но ни одному диоду не назначен цвет через leds:set(...).');
    }
    if (hasTakeoff && !hasPreflight) {
        issues.push('Команда взлета найдена без Ev.MCE_PREFLIGHT. Сначала нужна предполетная подготовка.');
    }
    if (hasGoTo && !hasTakeoff) {
        issues.push('Полет к локальной точке найден без шага взлета. Сначала выполните PREFLIGHT и TAKEOFF.');
    }
    if (hasLanding && !hasTakeoff) {
        issues.push('Посадка есть, а явного взлета нет. Проверьте логику сценария.');
    }
    if ((hasTakeoff || hasGoTo || hasLanding) && !hasTimer && !hasCallback) {
        issues.push('Миссия не разведена по шагам: добавьте Timer.callLater(...) или callback(event), иначе команды уйдут слишком быстро.');
    }
    if (hasTakeoff && hasGoTo && hasTimerBasedRoute && !hasTakeoffCompleteRouteHandler) {
        issues.push('Маршрут запускается по Timer.callLater(...), но не привязан к событию TAKEOFF_COMPLETE. Первый goToLocalPoint(...) может прийти слишком рано и будет отклонен FSM.');
    }

    const immediateControlCode = normalized
        .replace(/timer\.calllater\s*\(\s*[0-9]*\.?[0-9]+\s*,\s*function\s*\([^)]*\)\s*[\s\S]*?end\s*\)/g, ' ')
        .replace(/function\s+callback\s*\([^)]*\)\s*[\s\S]*?end/g, ' ');
    const immediateCommands = collectLuaMissionCommands(immediateControlCode);
    if (immediateCommands.length >= 2) {
        issues.push(`Несколько управляющих команд запускаются сразу: ${immediateCommands.join(', ')}. Разнесите их через Timer.callLater(...) или callback(event).`);
    }

    for (const [delay, commands] of collectLuaDelayedMissionCommands(normalized).entries()) {
        if (commands.length >= 2) {
            issues.push(`В Timer.callLater(${delay}) одновременно запланированы команды ${commands.join(', ')}. Разнесите их по разным задержкам или этапам callback(event).`);
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
        issues.push('Несколько команд led_control(...) идут подряд без time.sleep(...). Цвета сменятся слишком быстро.');
    }
    if (hasTakeoff && !hasArm) {
        issues.push('Найден takeoff() без arm(). Перед взлетом сначала подготовьте двигатели.');
    }
    if (hasGoTo && !hasTakeoff) {
        issues.push('Найден go_to_local_point(...), но в сценарии нет takeoff(). Сначала дрон должен взлететь.');
    }
    if (hasLand && !hasTakeoff) {
        issues.push('Найдена посадка без взлета. Проверьте порядок шагов.');
    }
    if ((hasTakeoff || hasGoTo || hasLand) && !hasSleep && !hasPointReached) {
        issues.push('Миссия выполняется без пауз и ожиданий. Добавьте time.sleep(...) и/или проверку point_reached().');
    }
    if (hasGoTo && !hasPointReached && !hasSleep) {
        issues.push('После go_to_local_point(...) нет ожидания достижения точки. Добавьте цикл с point_reached() или паузы.');
    }

    return issues;
}

function renderIssuesHtml(language: ScriptLanguage, issues: string[]): string {
    const example = language === 'python'
        ? `if pioneer.arm():
    time.sleep(1)
    pioneer.takeoff()

time.sleep(3)
pioneer.go_to_local_point(x=1, y=0, z=1)

while not pioneer.point_reached():
    time.sleep(0.05)

pioneer.land()`
        : `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ap.push(Ev.MCE_TAKEOFF)
    end
    if event == Ev.TAKEOFF_COMPLETE then
        ap.goToLocalPoint(1, 0, 1)
    end
    if event == Ev.POINT_REACHED then
        ap.push(Ev.MCE_LANDING)
    end
end`;

    return `
        <div class="simulation-notice__list">
            ${issues.map((issue) => `<div>${issue}</div>`).join('')}
        </div>
        <button type="button" class="simulation-notice__action" data-simulation-action="open-mission-guide">Открыть 5 учебных заданий</button>
        <div class="simulation-notice__code">${example}</div>
    `;
}

function renderSimultaneousCommandsHtml(commands: string[]) {
    const uniqueCommands = Array.from(new Set(commands));
    const example = `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ap.push(Ev.MCE_TAKEOFF)
    end
    if event == Ev.TAKEOFF_COMPLETE then
        ap.goToLocalPoint(1, 0, 1)
    end
    if event == Ev.POINT_REACHED then
        ap.push(Ev.MCE_LANDING)
    end
end`;

    return `
        <div class="simulation-notice__list">
            <div class="is-critical">Одновременно вызваны команды: ${uniqueCommands.join(', ')}.</div>
            <div>Команды должны быть разнесены по времени и запускаться по этапам.</div>
            <div>Используйте разные задержки в Timer.callLater(...) или запускайте следующий шаг из callback(event).</div>
        </div>
        <button type="button" class="simulation-notice__action" data-simulation-action="open-mission-guide">Открыть 5 учебных заданий</button>
        <div class="simulation-notice__code">${example}</div>
    `;
}

function renderEarlyRouteHtml() {
    const example = `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ap.push(Ev.MCE_TAKEOFF)
    end
    if event == Ev.TAKEOFF_COMPLETE then
        ap.goToLocalPoint(1, 1, 1)
    end
    if event == Ev.POINT_REACHED then
        ap.goToLocalPoint(0, 0, 1)
    end
end`;

    return `
        <div class="simulation-notice__list">
            <div class="is-critical">Маршрут отправлен слишком рано: дрон еще не завершил взлет.</div>
            <div>Во время PREFLIGHT и TAKEOFF_PROCESS команда goToLocalPoint(...) отклоняется конечным автоматом.</div>
            <div>Не привязывайте старт маршрута к Timer.callLater(...), если момент завершения взлета еще не подтвержден.</div>
            <div>Запускайте первый переход по событию callback(Ev.TAKEOFF_COMPLETE), а следующий шаг - по callback(Ev.POINT_REACHED).</div>
        </div>
        <button type="button" class="simulation-notice__action" data-simulation-action="open-mission-guide">Открыть 5 учебных заданий</button>
        <div class="simulation-notice__code">${example}</div>
    `;
}

export function showScenarioValidationNotice(language: ScriptLanguage, code: string) {
    const issues = language === 'python' ? collectPythonIssues(code) : collectLuaIssues(code);
    if (!issues.length) return;

    if (language === 'lua') {
        const simultaneousIssue = issues.find((issue) =>
            issue.includes('одновременно')
            || issue.includes('запускаются сразу')
        );
        if (simultaneousIssue) {
            markSimultaneousNoticeAsShown();
        }
        const earlyRouteIssue = issues.find((issue) =>
            issue.includes('takeoff_complete')
            || issue.includes('слишком рано')
        );
        if (earlyRouteIssue) {
            markEarlyRouteNoticeAsShown();
        }
    }

    const summary = issues.length === 1
        ? issues[0]
        : `Найдено ${issues.length} подсказки по сценарию. Лучше исправить их до запуска.`;

    log(summary, 'warn');

    if (!(window as any).showSimulationNotice) return;

    (window as any).showSimulationNotice({
        title: 'Проверьте сценарий перед запуском',
        message: summary,
        detailsHtml: renderIssuesHtml(language, issues),
        level: 'warn'
    });
}

export function warnAboutInstantExecution(language: ScriptLanguage) {
    const message = language === 'python'
        ? 'Сценарий выполняет команды почти мгновенно. Для полета нужны паузы между arm(), takeoff(), go_to_local_point() и land().'
        : 'Сценарий отправляет команды мгновенно. Для FSM дрона разводите шаги через Timer.callLater(...) или callback(event).';

    log(message, 'warn');

    if (!(window as any).showSimulationNotice) return;

    (window as any).showSimulationNotice({
        title: 'Предупреждение по таймингам',
        message,
        detailsHtml: renderIssuesHtml(language, [message]),
        level: 'warn'
    });
}

export function showSimultaneousCommandsNotice(commands: string[]) {
    if (shouldSuppressSimultaneousNotice()) return;

    const uniqueCommands = Array.from(new Set(commands));
    const message = uniqueCommands.length > 1
        ? `Одновременно вызваны команды: ${uniqueCommands.join(', ')}.`
        : `Команда ${uniqueCommands[0] || 'миссии'} вызвана одновременно с другой операцией.`;

    if (!(window as any).showSimulationNotice) return;
    (window as any).showSimulationNotice({
        title: 'Конфликт одновременных команд',
        message,
        detailsHtml: renderSimultaneousCommandsHtml(uniqueCommands),
        level: 'warn'
    });
}

export function showEarlyRouteNotice() {
    if (shouldSuppressEarlyRouteNotice()) return;
    markEarlyRouteNoticeAsShown();

    const message = 'Команда goToLocalPoint(...) пришла до завершения взлета. Дождитесь события TAKEOFF_COMPLETE.';

    log(message, 'warn');

    if (!(window as any).showSimulationNotice) return;
    (window as any).showSimulationNotice({
        title: 'Маршрут запущен слишком рано',
        message,
        detailsHtml: renderEarlyRouteHtml(),
        level: 'warn'
    });
}
