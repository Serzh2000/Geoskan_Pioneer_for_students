/**
 * Преобразует сырые ошибки Lua/Python в понятные для ученика объяснения.
 * Модуль изолирован от UI и возвращает только структурированное описание.
 */
import type { ScriptLanguage } from '../../core/state.js';
import { getLastNonEmptyLine } from './error.js';
import type { HumanizedScriptFailure, ScriptFailureKind } from './types.js';

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

export function humanizeScriptFailure(language: ScriptLanguage, kind: ScriptFailureKind, message: string): HumanizedScriptFailure {
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
