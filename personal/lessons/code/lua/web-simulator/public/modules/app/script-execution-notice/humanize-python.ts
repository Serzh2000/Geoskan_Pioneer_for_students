import { getLastNonEmptyLine } from './error.js';
import type { HumanizedScriptFailure } from './types.js';

export function humanizePythonSyntaxMessage(message: string): HumanizedScriptFailure | null {
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

export function humanizePythonRuntimeMessage(message: string): HumanizedScriptFailure | null {
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
