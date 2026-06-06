import type { ScriptLanguage } from '../core/state.js';

function renderLuaMissionStateGuideHtml(): string {
    return `
        <div class="simulation-notice__section">
            <div class="simulation-notice__section-title">Порядок состояний дрона</div>
            <div class="simulation-notice__list">
                <div><code>IDLE</code> -> <code>PREFLIGHT</code> -> <code>TAKEOFF_PROCESS</code> -> <code>FLYING_HOVER</code> -> <code>FLYING_MOVING</code> -> <code>LANDING_PROCESS</code> -> <code>IDLE</code></div>
                <div>Команды сценария должны идти в том же порядке: сначала <code>Ev.MCE_PREFLIGHT</code>, затем <code>Ev.MCE_TAKEOFF</code>, потом маршрут <code>ap.goToLocalPoint(...)</code>, и только после завершения полета <code>Ev.MCE_LANDING</code>.</div>
                <div>Если нужно дождаться следующего этапа, продолжайте сценарий из <code>callback(event)</code>: <code>Ev.ENGINES_STARTED</code> -> <code>Ev.TAKEOFF_COMPLETE</code> -> <code>Ev.POINT_REACHED</code>.</div>
            </div>
        </div>
    `;
}

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
        ${language === 'lua' ? renderLuaMissionStateGuideHtml() : ''}
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

function normalizeNoticeText(value: string | null | undefined): string {
    return String(value || '').replace(/\r/g, '').trim();
}

function buildScriptFailureLocation(line?: number | null, column?: number | null): string | null {
    const parts: string[] = [];
    if (typeof line === 'number') {
        parts.push(`строка ${line}`);
    }
    if (typeof column === 'number') {
        parts.push(`колонка ${column}`);
    }
    return parts.length ? `Место ошибки: ${parts.join(', ')}.` : null;
}

function collectScriptFailureTechnicalDetails(
    details: string | null | undefined,
    ignoredLines: string[]
): string[] {
    const ignored = new Set(
        ignoredLines
            .map((line) => normalizeNoticeText(line).toLowerCase())
            .filter(Boolean)
    );

    return normalizeNoticeText(details)
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => {
            if (!line) return false;
            if (/^\d+$/.test(line)) return false;
            return !ignored.has(line.toLowerCase());
        });
}

type FailureSectionLine = string | {
    text: string;
    critical?: boolean;
};

function renderFailureSection(title: string, lines: FailureSectionLine[]): string {
    const items = lines.filter((line) => {
        if (!line) return false;
        if (typeof line === 'string') return Boolean(line);
        return Boolean(line.text);
    });
    if (!items.length) return '';
    return `
        <div class="simulation-notice__section">
            <div class="simulation-notice__section-title">${escapeHtml(title)}</div>
            <div class="simulation-notice__list">
                ${items.map((line) => {
                    const resolved = typeof line === 'string' ? { text: line, critical: false } : line;
                    return `<div${resolved.critical ? ' class="is-critical"' : ''}>${escapeHtml(resolved.text)}</div>`;
                }).join('')}
            </div>
        </div>
    `;
}

function renderFailureStack(stack: string | null | undefined): string {
    const normalized = normalizeNoticeText(stack);
    if (!normalized || /^\d+$/.test(normalized)) return '';
    return `
        <div class="simulation-notice__section">
            <div class="simulation-notice__section-title">Стек вызовов</div>
            <div class="simulation-notice__code">${escapeHtml(normalized)}</div>
        </div>
    `;
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
        phase?: string | null;
        stack?: string | null;
        contextLines?: string[] | null;
        fsmHistory?: string[] | null;
    }
): string {
    const location = buildScriptFailureLocation(options?.line, options?.column);

    const hint = kind === 'syntax'
        ? (
            language === 'python'
                ? 'Скрипт не запускается из-за синтаксической ошибки. Проверьте двоеточия, отступы, скобки и закрытие строк.'
                : 'Скрипт не запускается из-за синтаксической ошибки. Проверьте `end`, скобки, запятые и закрытие строк.'
        )
        : (
            language === 'python'
                ? 'Скрипт стартовал, но остановился во время выполнения. Часто причина в неверном имени, пустом значении или неподходящей операции.'
                : 'Скрипт стартовал, но остановился во время выполнения. Часто причина в `nil`, неверном аргументе или конфликте состояний FSM.'
        );

    const technicalDetails = collectScriptFailureTechnicalDetails(options?.details, [
        message,
        options?.note || '',
        location || ''
    ]);

    const detailLines: FailureSectionLine[] = [
        hint,
        location || '',
        options?.phase ? `Фаза выполнения: ${options.phase}` : '',
        { text: message, critical: true },
        options?.note || '',
        ...technicalDetails.map((line) => `Техническая деталь: ${line}`)
    ].filter(Boolean);

    return `
        ${renderFailureSection('Сводка', detailLines)}
        ${renderFailureSection('Контекст выполнения', options?.contextLines || [])}
        ${renderFailureSection('История FSM', options?.fsmHistory || [])}
        ${renderFailureStack(options?.stack)}
    `;
}
