import type { ScriptLanguage } from '../core/state.js';

export function renderIssuesHtml(language: ScriptLanguage, issues: string[]): string {
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

export function renderSimultaneousCommandsHtml(commands: string[]): string {
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

export function renderEarlyRouteHtml(): string {
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
