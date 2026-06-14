/**
 * Показывает уведомления о проблемах запуска и выполнения сценариев.
 * Файл оставляет только orchestration-логику и публичный API.
 */
import { log } from '../shared/logging/logger.js';
import type { ScriptLanguage } from '../core/state.js';
import {
    renderEarlyRouteHtml,
    renderIssuesHtml,
    renderScriptFailureHtml,
    renderSimultaneousCommandsHtml
} from './script-execution-notice-templates.js';
import { createScriptFailureError, normalizeScriptFailureError } from './script-execution-notice/error.js';
import { humanizeScriptFailure } from './script-execution-notice/humanize.js';
import { collectLuaBlockingIssues, collectLuaIssues, detectLuaEarlyRouteIssue } from './script-execution-notice/lua-validation.js';
import { collectPythonIssues } from './script-execution-notice/python-validation.js';
import {
    markEarlyRouteNoticeAsShown,
    markSimultaneousNoticeAsShown,
    resetScriptExecutionNoticeState,
    shouldSuppressEarlyRouteNotice,
    shouldSuppressSimultaneousNotice
} from './script-execution-notice/state.js';
import type { ScenarioValidationResult, ScriptFailureError, ScriptFailureKind } from './script-execution-notice/types.js';

export type { ScenarioValidationResult, ScriptFailureError, ScriptFailureKind } from './script-execution-notice/types.js';
export { createScriptFailureError, resetScriptExecutionNoticeState };

function isSimultaneousCommandsFailureNotice(
    language: ScriptLanguage,
    kind: ScriptFailureKind,
    message: string,
    summary: string
) {
    if (language !== 'lua' || kind !== 'runtime') return false;
    const combined = `${summary}\n${message}`.toLowerCase();
    return (
        combined.includes('команды миссии запущены одновременно')
        || combined.includes('несколько команд миссии стартуют одновременно')
        || combined.includes('simultaneous mission commands')
        || combined.includes('run at the same time')
    );
}

export function showScriptFailureNotice(
    language: ScriptLanguage,
    error: unknown,
    fallbackKind: ScriptFailureKind = 'runtime'
) {
    const resolved = normalizeScriptFailureError(error, fallbackKind);
    const kind = resolved.scriptFailureKind || fallbackKind;
    const humanized = humanizeScriptFailure(language, kind, resolved.message);
    const title = kind === 'syntax'
        ? 'Синтаксическая ошибка'
        : 'Ошибка выполнения';
    const message = humanized.summary;
    const technicalDetails = humanized.suppressTechnicalDetails
        ? null
        : (resolved.scriptFailureDetails || humanized.rawDetails || null);

    log(
        kind === 'syntax'
            ? `Синтаксическая ошибка ${language.toUpperCase()}: ${resolved.message}`
            : `Ошибка выполнения ${language.toUpperCase()}: ${resolved.message}`,
        'error'
    );

    if (typeof resolved.scriptFailureLine === 'number') {
        (window as any).highlightEditorProblem?.({
            line: resolved.scriptFailureLine,
            column: resolved.scriptFailureColumn,
            message: humanized.summary
        });
    }

    if (isSimultaneousCommandsFailureNotice(language, kind, resolved.message, humanized.summary)) {
        if (shouldSuppressSimultaneousNotice()) {
            return;
        }
        markSimultaneousNoticeAsShown();
    }

    if (!(window as any).showSimulationNotice) return;

    (window as any).showSimulationNotice({
        title,
        message,
        detailsHtml: renderScriptFailureHtml(language, kind, humanized.summary, {
            line: resolved.scriptFailureLine,
            column: resolved.scriptFailureColumn,
            note: humanized.details,
            details: technicalDetails,
            phase: resolved.scriptFailurePhase,
            stack: resolved.scriptFailureStack,
            contextLines: resolved.scriptFailureContextLines,
            fsmHistory: resolved.scriptFailureFsmHistory
        }),
        level: 'error'
    });
}

export function scriptHasVisibleDelay(language: ScriptLanguage, code: string) {
    const normalized = (code || '').toLowerCase();
    if (language === 'python') {
        return /\b(time|asyncio)\.sleep\s*\(/.test(normalized) || /\bawait\s+asyncio\.sleep\s*\(/.test(normalized);
    }
    return /\bsleep\s*\(/.test(normalized) || /\btimer\.(calllater|new)\s*\(/.test(normalized);
}

function hasLuaEarlyRouteIssue(code: string) {
    return detectLuaEarlyRouteIssue(code);
}

function collectScenarioValidationResult(language: ScriptLanguage, code: string): ScenarioValidationResult {
    const issues = Array.from(new Set(language === 'python' ? collectPythonIssues(code) : collectLuaIssues(code)));
    const blockingIssues = Array.from(new Set(language === 'lua' ? collectLuaBlockingIssues(code) : []));
    return {
        issues,
        blockingIssues,
        shouldBlock: blockingIssues.length > 0
    };
}

export function validateScenarioBeforeLaunch(language: ScriptLanguage, code: string): ScenarioValidationResult {
    return collectScenarioValidationResult(language, code);
}

export function showScenarioValidationNotice(language: ScriptLanguage, code: string): ScenarioValidationResult {
    const result = collectScenarioValidationResult(language, code);
    const issues = [...result.blockingIssues, ...result.issues];
    if (!issues.length) return result;

    if (language === 'lua') {
        const simultaneousIssue = issues.find((issue) =>
            issue.includes('одновременно')
            || issue.includes('несколько команд миссии')
        );
        if (simultaneousIssue) {
            markSimultaneousNoticeAsShown();
        }
        if (hasLuaEarlyRouteIssue(code)) {
            markEarlyRouteNoticeAsShown();
        }
    }

    const summary = result.shouldBlock
        ? (
            result.blockingIssues.length === 1
                ? 'Найден опасный сценарий. Исправьте его перед запуском.'
                : `Найдено ${result.blockingIssues.length} опасных сценария. Исправьте их перед запуском.`
        )
        : (
            issues.length === 1
                ? 'Найдена проблема в сценарии. Проверьте код перед запуском.'
                : `Найдено ${issues.length} проблем в сценарии. Проверьте код перед запуском.`
        );

    log(summary, result.shouldBlock ? 'error' : 'warn');

    if (!(window as any).showSimulationNotice) return result;

    (window as any).showSimulationNotice({
        title: result.shouldBlock ? '\u0417\u0430\u043f\u0443\u0441\u043a \u0437\u0430\u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0430\u043d' : 'Проверьте сценарий перед запуском',
        message: summary,
        detailsHtml: renderIssuesHtml(language, issues),
        level: result.shouldBlock ? 'error' : 'warn'
    });

    return result;
}

export function warnAboutInstantExecution(language: ScriptLanguage) {
    const message = language === 'python'
        ? 'Скрипт выполняет команды слишком быстро. В Python обычно нужны паузы между `arm()`, `takeoff()`, `go_to_local_point()` и `land()`.'
        : 'Скрипт выполняет команды слишком быстро. В Lua FSM добавьте паузы через `sleep(...)`, `Timer.callLater(...)` или `callback(event)`.';

    log(message, 'warn');

    if (!(window as any).showSimulationNotice) return;

    (window as any).showSimulationNotice({
        title: 'Предупреждение о сценарии',
        message,
        detailsHtml: renderIssuesHtml(language, [message]),
        level: 'warn'
    });
}

export function showSimultaneousCommandsNotice(commands: string[]) {
    if (shouldSuppressSimultaneousNotice()) return;
    markSimultaneousNoticeAsShown();

    const uniqueCommands = Array.from(new Set(commands));
    const message = uniqueCommands.length > 1
        ? `Команды выполняются одновременно: ${uniqueCommands.join(', ')}.`
        : `Команда ${uniqueCommands[0] || 'миссии'} выполняется одновременно с другой операцией.`;

    if (!(window as any).showSimulationNotice) return;
    (window as any).showSimulationNotice({
        title: 'Команды пересекаются',
        message,
        detailsHtml: renderSimultaneousCommandsHtml(uniqueCommands),
        level: 'warn'
    });
}

export function showEarlyRouteNotice() {
    if (shouldSuppressEarlyRouteNotice()) return;
    markEarlyRouteNoticeAsShown();

    const message = '`goToLocalPoint(...)` отправлен до завершения взлета. Дождитесь `TAKEOFF_COMPLETE`.';

    log(message, 'warn');

    if (!(window as any).showSimulationNotice) return;
    (window as any).showSimulationNotice({
        title: 'Маршрут запущен слишком рано',
        message,
        detailsHtml: renderEarlyRouteHtml(),
        level: 'warn'
    });
}

export function showMissionGamepadOverrideNotice() {
    const message = 'Подключенный пульт переведен в ручной режим, поэтому на время активной миссии RC override отключен.';

    log(message, 'warn');

    if (!(window as any).showSimulationNotice) return;
    (window as any).showSimulationNotice({
        title: 'Миссия получила приоритет над RC',
        message,
        detailsHtml: renderIssuesHtml('lua', [
            'Пока миссия выполняет взлет, маршрут или посадку, симулятор принудительно ведет дрон в AUTO.',
            'После завершения миссии ручное управление с пульта снова начнет влиять на полет.',
            'Если нужен ручной полет прямо сейчас, остановите сценарий или переведите CH5 в подходящее положение.'
        ]),
        level: 'warn'
    });
}
