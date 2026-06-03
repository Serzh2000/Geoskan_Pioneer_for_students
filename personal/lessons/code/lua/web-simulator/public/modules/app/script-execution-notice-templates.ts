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
        <button type="button" class="simulation-notice__action" data-simulation-action="open-mission-guide">Открыть 5 шагов миссии</button>
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
            <div class="is-critical">Несколько команд запущены одновременно: ${uniqueCommands.join(', ')}.</div>
            <div>Команды миссии нужно выполнять по этапам и дожидаться завершения шага.</div>
            <div>Используйте паузы через Timer.callLater(...) или продолжайте сценарий из callback(event).</div>
        </div>
        <button type="button" class="simulation-notice__action" data-simulation-action="open-mission-guide">Открыть 5 шагов миссии</button>
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
            <div class="is-critical">Маршрут запущен слишком рано: взлет еще не завершен.</div>
            <div>На этапах PREFLIGHT и TAKEOFF_PROCESS команда goToLocalPoint(...) может нарушить выполнение сценария.</div>
            <div>Не запускайте маршрут из Timer.callLater(...), если взлет еще продолжается.</div>
            <div>Безопаснее начинать маршрут из callback(Ev.TAKEOFF_COMPLETE), а продолжение - из callback(Ev.POINT_REACHED).</div>
        </div>
        <button type="button" class="simulation-notice__action" data-simulation-action="open-mission-guide">Открыть 5 шагов миссии</button>
        <div class="simulation-notice__code">${example}</div>
    `;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function renderScriptFailureHtml(
    language: ScriptLanguage,
    kind: 'syntax' | 'runtime',
    message: string,
    options?: {
        line?: number | null;
        column?: number | null;
        note?: string | null;
        details?: string | null;
    }
): string {
    const location: string[] = [];
    if (typeof options?.line === 'number') {
        location.push(`Строка: ${options.line}`);
    }
    if (typeof options?.column === 'number') {
        location.push(`Колонка: ${options.column}`);
    }

    const hint = kind === 'syntax'
        ? (
            language === 'python'
                ? 'Скрипт не запускается из-за синтаксиса. Проверьте двоеточия, отступы, скобки и закрытие строк.'
                : 'Скрипт не запускается из-за синтаксиса. Проверьте `end`, скобки, запятые и закрытие строк.'
        )
        : (
            language === 'python'
                ? 'Скрипт начал выполняться, но затем остановился из-за ошибки выполнения. Часто это неверное имя, пустое значение или операция.'
                : 'Скрипт начал выполняться, но затем остановился из-за ошибки выполнения. Часто это пустое значение, неверный аргумент или конфликт FSM.'
        );

    const detailLines = [
        `<div>${escapeHtml(hint)}</div>`,
        location.length ? `<div>${escapeHtml(location.join(' | '))}</div>` : '',
        `<div class="is-critical">${escapeHtml(message)}</div>`,
        options?.note ? `<div>${escapeHtml(options.note)}</div>` : '',
        options?.details ? `<div>${escapeHtml(options.details)}</div>` : ''
    ].filter(Boolean);

    return `
        <div class="simulation-notice__list">
            ${detailLines.join('')}
        </div>
    `;
}
