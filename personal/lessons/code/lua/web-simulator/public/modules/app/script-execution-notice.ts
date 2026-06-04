import { log } from '../shared/logging/logger.js';
import type { ScriptLanguage } from '../core/state.js';
import {
    renderEarlyRouteHtml,
    renderIssuesHtml,
    renderScriptFailureHtml,
    renderSimultaneousCommandsHtml
} from './script-execution-notice-templates.js';

export type ScriptFailureKind = 'syntax' | 'runtime';

export type ScriptFailureError = Error & {
    scriptFailureKind?: ScriptFailureKind;
    scriptFailureLine?: number | null;
    scriptFailureColumn?: number | null;
    scriptFailureDetails?: string | null;
    scriptFailurePhase?: string | null;
    scriptFailureStack?: string | null;
    scriptFailureContextLines?: string[] | null;
    scriptFailureFsmHistory?: string[] | null;
};

type HumanizedScriptFailure = {
    summary: string;
    details?: string | null;
    rawDetails?: string | null;
    suppressTechnicalDetails?: boolean;
};

type NoticeSuppressionState = {
    simultaneousCommands: boolean;
    earlyRoute: boolean;
};

type ScenarioValidationResult = {
    issues: string[];
    blockingIssues: string[];
    shouldBlock: boolean;
};

export function createScriptFailureError(
    kind: ScriptFailureKind,
    message: string,
    options?: {
        line?: number | null;
        column?: number | null;
        details?: string | null;
        phase?: string | null;
        stack?: string | null;
        contextLines?: string[] | null;
        fsmHistory?: string[] | null;
    }
): ScriptFailureError {
    const error = new Error(message) as ScriptFailureError;
    error.name = kind === 'syntax' ? 'ScriptSyntaxError' : 'ScriptRuntimeError';
    error.scriptFailureKind = kind;
    error.scriptFailureLine = options?.line ?? null;
    error.scriptFailureColumn = options?.column ?? null;
    error.scriptFailureDetails = options?.details ?? null;
    error.scriptFailurePhase = options?.phase ?? null;
    error.scriptFailureStack = options?.stack ?? null;
    error.scriptFailureContextLines = options?.contextLines ?? null;
    error.scriptFailureFsmHistory = options?.fsmHistory ?? null;
    return error;
}

function normalizeScriptFailureError(error: unknown, fallbackKind: ScriptFailureKind): ScriptFailureError {
    if (error instanceof Error) {
        const typed = error as ScriptFailureError;
        typed.scriptFailureKind = typed.scriptFailureKind || fallbackKind;
        return typed;
    }

    return createScriptFailureError(fallbackKind, String(error));
}

function getLastNonEmptyLine(value: string): string {
    const lines = value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    return lines[lines.length - 1] || value.trim();
}

function humanizeLuaFsmRuntimeMessage(state: string, command: string, message: string): HumanizedScriptFailure {
    const upperState = String(state || '').toUpperCase();
    const upperCommand = String(command || '').toUpperCase();
    const stateLabels: Record<string, string> = {
        IDLE: 'на земле (`IDLE`)',
        PREFLIGHT: 'в предполетной подготовке (`PREFLIGHT`)',
        TAKEOFF_PROCESS: 'в процессе взлета (`TAKEOFF_PROCESS`)',
        FLYING_HOVER: 'в режиме висения (`FLYING_HOVER`)',
        FLYING_MOVING: 'в полете по маршруту (`FLYING_MOVING`)',
        LANDING_PROCESS: 'в процессе посадки (`LANDING_PROCESS`)'
    };
    const commandLabels: Record<string, string> = {
        MCE_PREFLIGHT: '`Ev.MCE_PREFLIGHT`',
        MCE_TAKEOFF: '`Ev.MCE_TAKEOFF`',
        MCE_LANDING: '`Ev.MCE_LANDING`',
        GO_TO_LOCAL_POINT: '`ap.goToLocalPoint(...)`'
    };
    const stateLabel = stateLabels[upperState] || `в состоянии \`${upperState}\``;
    const commandLabel = commandLabels[upperCommand] || `\`${upperCommand}\``;

    if (upperCommand === 'MCE_PREFLIGHT' && upperState === 'PREFLIGHT') {
        return {
            summary: 'Повторный `Ev.MCE_PREFLIGHT`: предполетная подготовка уже запущена.',
            details: 'Уберите повторную команду `Ev.MCE_PREFLIGHT`. После нее дождитесь события `Ev.ENGINES_STARTED` и только потом отправляйте `Ev.MCE_TAKEOFF`.',
            rawDetails: message
        };
    }

    if (upperCommand === 'MCE_TAKEOFF' && upperState === 'IDLE') {
        return {
            summary: 'Команда `Ev.MCE_TAKEOFF` отклонена: дрон еще не прошел предполетную подготовку.',
            details: 'Сначала отправьте `Ev.MCE_PREFLIGHT`. Надежнее запускать `Ev.MCE_TAKEOFF` из `callback(event)` при событии `Ev.ENGINES_STARTED`.',
            rawDetails: message
        };
    }

    if (upperCommand === 'GO_TO_LOCAL_POINT' && upperState === 'TAKEOFF_PROCESS') {
        return {
            summary: 'Маршрут нельзя запускать во время взлета: дрон еще не достиг полетного режима.',
            details: 'Перенесите `ap.goToLocalPoint(...)` в обработчик `callback(event)` и запускайте его по событию `Ev.TAKEOFF_COMPLETE`.',
            rawDetails: message
        };
    }

    const recommendations: Record<string, string> = {
        MCE_PREFLIGHT: 'Команду `Ev.MCE_PREFLIGHT` отправляйте один раз, когда дрон находится на земле и еще не начал предполетную подготовку.',
        MCE_TAKEOFF: 'Команду `Ev.MCE_TAKEOFF` отправляйте только после `Ev.MCE_PREFLIGHT`. Надежнее запускать ее из `callback(event)` при событии `Ev.ENGINES_STARTED`.',
        MCE_LANDING: 'Команду `Ev.MCE_LANDING` отправляйте только когда дрон уже находится в воздухе. Не запускайте посадку во время взлета.',
        GO_TO_LOCAL_POINT: 'Маршрут через `ap.goToLocalPoint(...)` запускайте только после завершения взлета. Надежнее делать это по событию `Ev.TAKEOFF_COMPLETE`.'
    };
    return {
        summary: `Команда ${commandLabel} сейчас недоступна: дрон находится ${stateLabel}.`,
        details: recommendations[upperCommand] || 'Проверьте порядок команд и дождитесь подходящего состояния полетного автомата.',
        rawDetails: message
    };
}

function humanizeLuaSyntaxMessage(message: string): HumanizedScriptFailure | null {
    if (/'\)' expected \(to close '\(' at line \d+\) near 'end'/.test(message)) {
        return {
            summary: 'Похоже, в `Timer.callLater(...)` передан вызов уже существующей функции, а не callback.',
            details: 'В записи вроде `Timer.callLater(1, changeColor({0,1,0}) end)` обычно появляется лишний `end`. Если нужно передать уже готовую функцию, пишите так: `Timer.callLater(1, blinkGreen)`. Если нужно вызвать `changeColor({0,1,0})` позже, оберните вызов в `function() ... end`: `Timer.callLater(1, function() changeColor({0,1,0}) end)`.',
            rawDetails: message
        };
    }
    if (/unexpected symbol near 'or'/.test(message)) {
        return {
            summary: 'Похоже, имя переменной или функции разорвано пробелом.',
            details: 'Например, вы могли случайно написать `changeCol or` вместо `changeColor`. Проверьте, не попало ли слово `or` внутрь имени или не разбился ли идентификатор на две части.',
            rawDetails: message
        };
    }
    if (/'end' expected/.test(message)) {
        return {
            summary: 'Не хватает `end` для закрытия блока `if`, `function`, `for` или `while`.',
            rawDetails: message
        };
    }
    if (/unexpected symbol near/.test(message)) {
        return {
            summary: 'В строке есть лишний или недопустимый символ. Проверьте запятые, скобки и кавычки.',
            rawDetails: message
        };
    }
    if (/unfinished string near/.test(message)) {
        return {
            summary: 'Похоже, не закрыта строка в кавычках.',
            rawDetails: message
        };
    }
    if (/<eof> expected near/.test(message)) {
        return {
            summary: 'В конце файла есть лишний текст или незавершенная конструкция.',
            rawDetails: message
        };
    }
    return null;
}

function humanizeLuaRuntimeMessage(message: string): HumanizedScriptFailure | null {
    const fsmTransitionMatch = message.match(/fsm error:\s*invalid transition from\s+([A-Z_]+)\s+by command\s+([A-Z_]+)/i);
    if (fsmTransitionMatch) {
        return humanizeLuaFsmRuntimeMessage(fsmTransitionMatch[1], fsmTransitionMatch[2], message);
    }
    const simultaneousCommandsMatch = message.match(/команды миссии запущены одновременно без паузы:\s*([A-Z_,\s]+)\./i);
    if (simultaneousCommandsMatch) {
        const commands = simultaneousCommandsMatch[1]
            .split(',')
            .map((value) => value.trim().toUpperCase())
            .filter(Boolean);
        const uniqueCommands = Array.from(new Set(commands));

        if (uniqueCommands.length === 1 && uniqueCommands[0] === 'PREFLIGHT') {
            return {
                summary: 'Предполетная подготовка запущена повторно.',
                details: 'Вы отправили `Ev.MCE_PREFLIGHT` дважды без ожидания следующего этапа. Оставьте `Ev.MCE_PREFLIGHT` только один раз, а `Ev.MCE_TAKEOFF` запускайте после события `Ev.ENGINES_STARTED`.',
                suppressTechnicalDetails: true
            };
        }

        const labelMap: Record<string, string> = {
            PREFLIGHT: '`Ev.MCE_PREFLIGHT`',
            TAKEOFF: '`Ev.MCE_TAKEOFF`',
            LANDING: '`Ev.MCE_LANDING`',
            GOTOLOCALPOINT: '`ap.goToLocalPoint(...)`'
        };
        const renderedCommands = uniqueCommands.map((command) => labelMap[command] || `\`${command}\``);
        return {
            summary: 'Несколько команд миссии стартуют одновременно.',
            details: `Не запускайте в одном шаге ${renderedCommands.join(', ')}. Между этапами добавьте \`sleep(...)\`, \`Timer.callLater(...)\` или переход через \`callback(event)\`.`,
            suppressTechnicalDetails: true
        };
    }
    if (/attempt to call a nil value/.test(message)) {
        return {
            summary: 'Скрипт пытается вызвать функцию или метод, которых не существует.',
            details: 'Проверьте имя функции, объекта и API-вызова. Часто это опечатка в имени или обращение к методу у неправильного объекта.',
            rawDetails: message
        };
    }
    if (/attempt to index a nil value/.test(message)) {
        return {
            summary: 'Скрипт обращается к полю или методу у значения `nil`.',
            details: 'Обычно это значит, что переменная не была создана, функция вернула `nil` или объект еще не инициализирован.',
            rawDetails: message
        };
    }
    if (/bad argument #\d+/.test(message)) {
        return {
            summary: 'В функцию передан аргумент неподходящего типа или формата.',
            details: 'Проверьте порядок аргументов, их количество и типы. Например, вместо числа могло прийти `nil` или строка.',
            rawDetails: message
        };
    }
    if (/attempt to perform arithmetic on/.test(message)) {
        return {
            summary: 'Невозможно выполнить арифметическую операцию с текущими значениями.',
            details: 'Проверьте, что в вычислениях участвуют числа, а не `nil`, строки или неинициализированные переменные.',
            rawDetails: message
        };
    }
    if (/fsm error:/i.test(message)) {
        return {
            summary: 'Команда конфликтует с текущим состоянием полетного автомата.',
            details: 'Проверьте порядок этапов миссии: `PREFLIGHT` -> `TAKEOFF` -> полет по маршруту -> `LANDING`.',
            rawDetails: message
        };
    }
    return null;
}

function humanizePythonSyntaxMessage(message: string): HumanizedScriptFailure | null {
    if (/expected ':'/.test(message)) {
        return {
            summary: 'После конструкции Python требуется двоеточие `:`.',
            rawDetails: message
        };
    }
    if (/unexpected indent/.test(message)) {
        return {
            summary: 'В строке найден лишний отступ.',
            rawDetails: message
        };
    }
    if (/unindent does not match any outer indentation level/.test(message)) {
        return {
            summary: 'Отступ не совпадает с предыдущим уровнем блока. Проверьте пробелы и табы.',
            rawDetails: message
        };
    }
    if (/unterminated string literal|EOL while scanning string literal/.test(message)) {
        return {
            summary: 'Похоже, не закрыта строка в кавычках.',
            rawDetails: message
        };
    }
    if (/was never closed/.test(message)) {
        return {
            summary: 'Одна из скобок не была закрыта.',
            rawDetails: message
        };
    }
    if (/invalid syntax/.test(message)) {
        return {
            summary: 'В коде есть синтаксическая ошибка. Проверьте строку и соседние выражения.',
            rawDetails: message
        };
    }
    return null;
}

function humanizePythonRuntimeMessage(message: string): HumanizedScriptFailure | null {
    const primaryLine = getLastNonEmptyLine(message);
    if (/nameerror: .* is not defined/i.test(primaryLine)) {
        return {
            summary: 'Используется имя переменной или функции, которое не определено.',
            rawDetails: primaryLine
        };
    }
    if (/attributeerror: .* has no attribute /i.test(primaryLine)) {
        return {
            summary: 'У объекта нет запрошенного поля или метода.',
            rawDetails: primaryLine
        };
    }
    if (/zerodivisionerror: division by zero/i.test(primaryLine) || /division by zero/i.test(primaryLine)) {
        return {
            summary: 'В коде выполняется деление на ноль.',
            rawDetails: primaryLine
        };
    }
    if (/typeerror: unsupported operand/i.test(primaryLine)) {
        return {
            summary: 'Используются несовместимые типы данных в одной операции.',
            rawDetails: primaryLine
        };
    }
    if (/indexerror:/i.test(primaryLine)) {
        return {
            summary: 'Вы обращаетесь к элементу по индексу вне границ списка.',
            rawDetails: primaryLine
        };
    }
    if (/keyerror:/i.test(primaryLine)) {
        return {
            summary: 'Вы обращаетесь к ключу, которого нет в словаре.',
            rawDetails: primaryLine
        };
    }
    return null;
}

function humanizeScriptFailure(language: ScriptLanguage, kind: ScriptFailureKind, message: string): HumanizedScriptFailure {
    const normalizedMessage = String(message || '').trim();
    const humanized = language === 'python'
        ? (kind === 'syntax' ? humanizePythonSyntaxMessage(normalizedMessage) : humanizePythonRuntimeMessage(normalizedMessage))
        : (kind === 'syntax' ? humanizeLuaSyntaxMessage(normalizedMessage) : humanizeLuaRuntimeMessage(normalizedMessage));

    if (humanized) {
        return humanized;
    }

    return {
        summary: getLastNonEmptyLine(normalizedMessage) || 'Не удалось распознать тип ошибки.',
        rawDetails: normalizedMessage
    };
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
        issues.push('Лента светодиодов создана, но `leds:set(...)` ни разу не вызывается.');
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

function collectLuaBlockingIssues(code: string): string[] {
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
        issues.push('Несколько вызовов `led_control(...)` идут без `time.sleep(...)`. Цвет может меняться слишком быстро.');
    }
    if (hasTakeoff && !hasArm) {
        issues.push('`takeoff()` вызывается без `arm()`. Сначала взведите дрон.');
    }
    if (hasGoTo && !hasTakeoff) {
        issues.push('`go_to_local_point(...)` вызывается до `takeoff()`. Сначала выполните взлет.');
    }
    if (hasLand && !hasTakeoff) {
        issues.push('`land()` вызывается до взлета. Проверьте порядок команд.');
    }
    if ((hasTakeoff || hasGoTo || hasLand) && !hasSleep && !hasPointReached) {
        issues.push('Команды миссии выполняются без ожидания. Добавьте `time.sleep(...)` и/или проверки `point_reached()`.');
    }
    if (hasGoTo && !hasPointReached && !hasSleep) {
        issues.push('После `go_to_local_point(...)` нет ожидания. Добавьте цикл с `point_reached()` или паузу.');
    }

    return issues;
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
