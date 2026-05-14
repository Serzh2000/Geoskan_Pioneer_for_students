import { log } from '../shared/logging/logger.js';
import type { ScriptLanguage } from '../core/state.js';

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

    return issues;
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

export function showScenarioValidationNotice(language: ScriptLanguage, code: string) {
    const issues = language === 'python' ? collectPythonIssues(code) : collectLuaIssues(code);
    if (!issues.length) return;

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
