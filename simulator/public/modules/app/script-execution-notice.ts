/**
 * Показывает уведомления о проблемах запуска и выполнения сценариев.
 * Файл оставляет только orchestration-логику и публичный API.
 */
import { log } from '../shared/logging/logger.js';
import type { ScriptLanguage } from '../core/state.js';
import { onMissionNotices } from '../core/mission-notices.js';
import {
    renderEarlyRouteHtml,
    renderIssuesHtml,
    renderScriptFailureHtml,
    renderSimultaneousCommandsHtml
} from './script-execution-notice-templates.js';
import {
    earlyRouteNotice,
    gamepadOverrideNotice,
    missingCallbackNotice,
    scenarioBlockedNotice,
    scenarioWarningNotice,
    simultaneousCommandsNotice
} from '../shared/notice-messages/catalog.js';
import type { NoticeAction } from '../shared/notice-messages/types.js';
import { createScriptFailureError, normalizeScriptFailureError } from './script-execution-notice/error.js';
import { humanizeScriptFailure } from './script-execution-notice/humanize.js';
import { collectLuaBlockingIssues, collectLuaIssues, detectLuaEarlyRouteIssue } from './script-execution-notice/lua-validation.js';
import { collectPythonIssues } from './script-execution-notice/python-validation.js';
import {
    markEarlyRouteNoticeAsShown,
    markMissingCallbackNoticeAsShown,
    markSimultaneousNoticeAsShown,
    resetScriptExecutionNoticeState,
    shouldSuppressEarlyRouteNotice,
    shouldSuppressMissingCallbackNotice,
    shouldSuppressSimultaneousNotice
} from './script-execution-notice/state.js';
import type { ScenarioValidationResult, ScriptFailureKind } from './script-execution-notice/types.js';

export type { ScriptFailureError } from './script-execution-notice/types.js';
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

function stripInlineCode(text: string): string {
    return text.replace(/`/g, '');
}

export function showScriptFailureNotice(
    language: ScriptLanguage,
    error: unknown,
    fallbackKind: ScriptFailureKind = 'runtime'
) {
    const resolved = normalizeScriptFailureError(error, fallbackKind);
    const kind = resolved.scriptFailureKind || fallbackKind;
    const line = typeof resolved.scriptFailureLine === 'number' ? resolved.scriptFailureLine : null;
    const humanized = humanizeScriptFailure(language, kind, resolved.message, line);
    const knownLine = line ?? humanized.line ?? null;
    const title = humanized.title || (kind === 'syntax' ? 'В коде опечатка' : 'Программа остановилась');
    const message = humanized.summary;
    const technicalDetails = humanized.suppressTechnicalDetails
        ? null
        : (resolved.scriptFailureDetails || humanized.rawDetails || null);

    // The journal gets the plain-language version; the raw interpreter text stays in the details card.
    log(`${title}${knownLine ? ` (строка ${knownLine})` : ''}: ${stripInlineCode(message)}`, 'error');

    if (typeof knownLine === 'number') {
        (window as any).highlightEditorProblem?.({
            line: knownLine,
            column: resolved.scriptFailureColumn,
            message: stripInlineCode(humanized.summary)
        });
    }

    if (isSimultaneousCommandsFailureNotice(language, kind, resolved.message, humanized.summary)) {
        if (shouldSuppressSimultaneousNotice()) {
            return;
        }
        markSimultaneousNoticeAsShown();
    }

    if (!(window as any).showSimulationNotice) return;

    const actions: NoticeAction[] = typeof knownLine === 'number'
        ? [{ kind: 'show-line', label: 'Показать строку', line: knownLine, column: resolved.scriptFailureColumn, message: stripInlineCode(humanized.summary) }]
        : [];

    (window as any).showSimulationNotice({
        title,
        message,
        detailsHtml: renderScriptFailureHtml(language, kind, humanized.summary, {
            line: knownLine,
            column: resolved.scriptFailureColumn,
            note: humanized.details,
            example: humanized.example,
            details: technicalDetails,
            phase: resolved.scriptFailurePhase,
            stack: resolved.scriptFailureStack,
            contextLines: resolved.scriptFailureContextLines,
            fsmHistory: resolved.scriptFailureFsmHistory
        }),
        level: 'error',
        actions
    });
}

function hasLuaEarlyRouteIssue(code: string) {
    return detectLuaEarlyRouteIssue(code);
}

function hasLuaMissingCallbackIssue(issues: string[]) {
    return issues.some((issue) =>
        issue.includes('function callback(event)')
        && issue.includes('только первую команду миссии')
    );
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
        if (hasLuaMissingCallbackIssue(issues)) {
            markMissingCallbackNoticeAsShown();
        }
    }

    const text = result.shouldBlock
        ? scenarioBlockedNotice(result.blockingIssues)
        : scenarioWarningNotice(issues);

    log(`${text.title}: ${stripInlineCode(text.message)}`, result.shouldBlock ? 'error' : 'warn');

    if (!(window as any).showSimulationNotice) return result;

    (window as any).showSimulationNotice({
        ...text,
        detailsHtml: renderIssuesHtml(language, issues)
    });

    return result;
}

export function showSimultaneousCommandsNotice(commands: string[]) {
    if (shouldSuppressSimultaneousNotice()) return;
    markSimultaneousNoticeAsShown();

    if (!(window as any).showSimulationNotice) return;
    (window as any).showSimulationNotice({
        ...simultaneousCommandsNotice(commands),
        detailsHtml: renderSimultaneousCommandsHtml(commands)
    });
}

export function showEarlyRouteNotice() {
    if (shouldSuppressEarlyRouteNotice()) return;
    markEarlyRouteNoticeAsShown();

    const text = earlyRouteNotice();
    log(`${text.title}: ${stripInlineCode(text.message)}`, 'warn');

    if (!(window as any).showSimulationNotice) return;
    (window as any).showSimulationNotice({
        ...text,
        detailsHtml: renderEarlyRouteHtml()
    });
}

export function showMissingCallbackMissionNotice(apiName?: string) {
    if (shouldSuppressMissingCallbackNotice()) return;
    markMissingCallbackNoticeAsShown();

    const text = missingCallbackNotice(apiName);
    log(`${text.title}: ${stripInlineCode(text.message)}`, 'warn');

    if (!(window as any).showSimulationNotice) return;
    (window as any).showSimulationNotice({
        ...text,
        detailsHtml: renderIssuesHtml('lua', [
            'События `Ev.ENGINES_STARTED`, `Ev.TAKEOFF_COMPLETE` и `Ev.POINT_REACHED` приходят в функцию `callback(event)`.',
            'Без неё автопилоту некому сообщить, что этап закончился, поэтому дальше он не идёт.',
            apiName
                ? `Вызов \`${apiName}\` пропущен.`
                : 'Следующая команда автопилота пропущена.'
        ])
    });
}

// Подключает ядро (physics/lua/autopilot) к показу тостов через шину
// core/mission-notices.ts — вызывается один раз при старте приложения (main.ts).
export function wireMissionNotices(): void {
    onMissionNotices({
        scriptFailure: showScriptFailureNotice,
        missionGamepadOverride: showMissionGamepadOverrideNotice,
        missingCallbackMission: showMissingCallbackMissionNotice,
        earlyRoute: showEarlyRouteNotice,
        simultaneousCommands: showSimultaneousCommandsNotice,
        genericNotice: (title, message, level) => {
            if (!(window as any).showSimulationNotice) return;
            (window as any).showSimulationNotice({ title, message, level });
        }
    });
}

export function showMissionGamepadOverrideNotice() {
    const text = gamepadOverrideNotice();

    log(`${text.title}: ${stripInlineCode(text.message)}`, 'warn');

    if (!(window as any).showSimulationNotice) return;
    (window as any).showSimulationNotice({
        ...text,
        detailsHtml: renderIssuesHtml('lua', [
            'Пока миссия выполняет взлёт, маршрут или посадку, симулятор сам ведёт дрон в режиме AUTO.',
            'Когда миссия закончится, пульт снова начнёт управлять дроном.',
            'Если нужно лететь вручную прямо сейчас, остановите программу или переведите CH5 в другое положение.'
        ])
    });
}
