import { describe, expect, test } from '@jest/globals';
import { explainLuaError, luaDictionaryIds, parseLuaMessage } from '../public/modules/shared/notice-messages/lua-errors.js';
import { explainPythonError, parsePythonTracebackLine, pythonDictionaryIds } from '../public/modules/shared/notice-messages/python-errors.js';
import {
    batteryCriticalNotice,
    batteryLowNotice,
    droneUploadedNotice,
    explainDroneError,
    missingCallbackNotice,
    scenarioBlockedNotice,
    simultaneousCommandsNotice
} from '../public/modules/shared/notice-messages/catalog.js';

/** Words that must never reach a student: raw interpreter jargon and blaming. */
const FORBIDDEN = [/attempt to/i, /unexpected symbol/i, /Traceback/, /\bfatal\b/i, /критическая ошибка/i, /вы ошиблись/i, /вы неправильно/i];

function wordCount(text: string): number {
    return text.trim().split(/\s+/).length;
}

describe('Lua syntax errors', () => {
    const cases: Array<[string, string, string, string[], number | null]> = [
        // [raw message, id, title, message fragments, line]
        ["[string \"...\"]:4: unexpected symbol near '='", 'lua.syntax.unexpectedSymbolEquals', 'Лишний знак =', ['В строке 4', '`=`'], 4],
        ["[string \"...\"]:7: unexpected symbol near ')'", 'lua.syntax.unexpectedSymbol', 'Непонятный символ в строке', ['В строке 7', '`)`'], 7],
        ["[string \"...\"]:9: 'end' expected (to close 'if' at line 3) near <eof>", 'lua.syntax.missingEnd', 'Не хватает end', ['Блок `if`, начатый в строке 3'], 9],
        ["[string \"...\"]:2: 'then' expected near 'print'", 'lua.syntax.missingThen', 'После условия нужно then', ['В строке 2', '`then`'], 2],
        ["[string \"...\"]:5: 'do' expected near 'x'", 'lua.syntax.missingDo', 'После цикла нужно do', ['`do`'], 5],
        ["[string \"...\"]:6: unfinished string near '\"abc'", 'lua.syntax.unfinishedString', 'Не закрыты кавычки', ['В строке 6'], 6],
        ["[string \"...\"]:8: <eof> expected near 'end'", 'lua.syntax.extraEnd', 'Лишний end', ['`end` лишнее'.replace('лишнее', 'лишнее')], 8],
        ["[string \"...\"]:3: ')' expected near 'x'", 'lua.syntax.missingParen', 'Не закрыта скобка', ['`)`'], 3],
        ["[string \"...\"]:3: '=' expected near 'x'", 'lua.syntax.missingEquals', 'Не хватает знака =', ['`=`'], 3],
        ["[string \"...\"]:1: malformed number near '12abc'", 'lua.syntax.malformedNumber', 'Число записано неверно', ['`12abc`'], 1],
        ["[string \"...\"]:2: unexpected symbol near '<\\208>'", 'lua.syntax.strangeSymbol', 'Необычный символ в коде', ['русская буква'], 2],
        ["[string \"...\"]:11: ')' expected (to close '(' at line 10) near 'end'", 'lua.syntax.callLaterCall', 'Лишний end в Timer.callLater', ['Timer.callLater'], 11],
        ["[string \"...\"]:7: unexpected symbol near 'or'", 'lua.syntax.brokenName', 'Имя разорвано пробелом', ['`or`'], 7]
    ];

    test.each(cases)('%s', (raw, id, title, fragments, line) => {
        const result = explainLuaError('syntax', raw);
        expect(result).not.toBeNull();
        expect(result!.id).toBe(id);
        expect(result!.title).toBe(title);
        expect(result!.line).toBe(line);
        for (const fragment of fragments) expect(result!.message).toContain(fragment);
    });

    test('uses the caller line when the message has none', () => {
        const result = explainLuaError('syntax', "unexpected symbol near ')'", { line: 12 });
        expect(result!.message).toContain('В строке 12');
    });

    test('returns null for unknown text', () => {
        expect(explainLuaError('syntax', 'something nobody expected')).toBeNull();
    });
});

describe('Lua runtime errors', () => {
    const cases: Array<[string, string, string, string[]]> = [
        ["[string \"...\"]:12: attempt to call a nil value (global 'goTo')", 'lua.runtime.callNil', 'Нет функции goTo', ['В строке 12', '`goTo`', 'большие и маленькие буквы']],
        ["[string \"...\"]:3: attempt to call a nil value (method 'sett')", 'lua.runtime.callNil', 'Нет метода sett', ['В строке 3', '`sett`']],
        ["[string \"...\"]:3: attempt to call a nil value (global 'os')", 'lua.runtime.callNil', 'Эта функция недоступна', ['`os`']],
        ["[string \"...\"]:5: attempt to index a nil value (local 'leds')", 'lua.runtime.indexNil', 'leds пока пусто', ['В строке 5', '`leds`']],
        ["[string \"...\"]:5: attempt to index a nil value (global 'io')", 'lua.runtime.indexNil', 'Эта часть Lua недоступна', ['`io`']],
        ["[string \"...\"]:8: attempt to perform arithmetic on a nil value (global 'speed')", 'lua.runtime.arithmetic', 'Считаем с пустым значением', ['В строке 8', '`speed`', 'nil']],
        ["[string \"...\"]:8: attempt to perform arithmetic on a string value", 'lua.runtime.arithmetic', 'Считать можно только числа', ['текст']],
        ['[string "..."]:9: attempt to compare number with nil', 'lua.runtime.compare', 'Сравнение с пустым значением', ['В строке 9', 'nil']],
        ['[string "..."]:9: attempt to compare two nil values', 'lua.runtime.compare', 'Сравнение с пустым значением', ['В строке 9']],
        ['[string "..."]:9: attempt to compare string with number', 'lua.runtime.compare', 'Сравниваются разные типы', ['текст', 'число']],
        ["[string \"...\"]:4: attempt to concatenate a nil value (local 'h')", 'lua.runtime.concatenate', 'Склеить не получилось', ['`h`', 'пустое значение']],
        ["[string \"...\"]:6: bad argument #1 to 'push' (number expected, got nil)", 'lua.runtime.badArgument', 'Неверный аргумент у push', ['аргумент №1', 'ожидается число', 'пустое значение']],
        ['[string "..."]:2: stack overflow', 'lua.runtime.stackOverflow', 'Функция зовёт сама себя', ['В строке 2']],
        ['Похоже, программа зависла в бесконечном цикле', 'lua.runtime.infiniteLoop', 'Цикл не даёт дрону лететь', ['sleep(0.1)']],
        ['Похоже, программа зависла в цикле без ожидания', 'lua.runtime.infiniteLoop', 'Цикл не даёт дрону лететь', ['sleep(0.1)']],
        ['FSM error: invalid transition from IDLE by command MCE_TAKEOFF', 'lua.runtime.fsmTransition', 'Взлёт раньше подготовки', ['Ev.MCE_PREFLIGHT']],
        ['FSM error: invalid transition from TAKEOFF_PROCESS by command GO_TO_LOCAL_POINT', 'lua.runtime.fsmTransition', 'Маршрут слишком рано', ['Ev.TAKEOFF_COMPLETE']],
        ['Команды миссии запущены одновременно без паузы: PREFLIGHT, PREFLIGHT.', 'lua.runtime.simultaneous', 'Подготовка запущена дважды', ['два раза']],
        ['CRITICAL ERROR: Commands TAKEOFF, goToLocalPoint run at the same time. Split them.', 'lua.runtime.simultaneousEnglish', 'Команды наступают друг на друга', ['Ev.MCE_TAKEOFF', 'ap.goToLocalPoint']],
        ['Константа `TAKEOFF_COMPLETE` должна использоваться с префиксом `Ev.`: `Ev.TAKEOFF_COMPLETE`.', 'lua.runtime.evMissingPrefix', 'Нужно писать Ev.TAKEOFF_COMPLETE', ['`Ev.TAKEOFF_COMPLETE`']],
        ['Событие или команда `MCE_TAKOFF` отсутствует в справочнике Lua API.', 'lua.runtime.evUnknown', 'Такого события нет', ['MCE_TAKOFF']]
    ];

    test.each(cases)('%s', (raw, id, title, fragments) => {
        const result = explainLuaError('runtime', raw);
        expect(result).not.toBeNull();
        expect(result!.id).toBe(id);
        expect(result!.title).toBe(title);
        for (const fragment of fragments) expect(result!.message).toContain(fragment);
    });

    test('keeps the line and the variable name from the raw message', () => {
        const result = explainLuaError('runtime', "[string \"...\"]:21: attempt to perform arithmetic on a nil value (global 'height')");
        expect(result!.line).toBe(21);
        expect(result!.message).toContain('height');
        expect(result!.example).toContain('height');
    });
});

describe('Python errors', () => {
    const syntaxCases: Array<[string, string, string, number | null, string[]]> = [
        ["expected ':'", 'py.syntax.expectedColon', 'Не хватает двоеточия', 3, ['В строке 3', '`:`']],
        ['unexpected indent', 'py.syntax.unexpectedIndent', 'Лишний отступ', 4, ['В строке 4']],
        ["expected an indented block after 'if' statement on line 2", 'py.syntax.expectedIndentedBlock', 'Нужен отступ внутри блока', 3, ['`if`', 'строки 2', '4 пробела']],
        ['unindent does not match any outer indentation level', 'py.syntax.unindentMismatch', 'Отступы не совпали', 5, ['В строке 5']],
        ['unterminated string literal (detected at line 6)', 'py.syntax.unterminatedString', 'Не закрыты кавычки', 6, ['В строке 6']],
        ["'(' was never closed", 'py.syntax.neverClosed', 'Не закрыта скобка', 7, ['`(`', '`)`']],
        ['invalid syntax. Perhaps you forgot a comma?', 'py.syntax.missingComma', 'Возможно, пропущена запятая', 8, ['В строке 8']],
        ['invalid syntax', 'py.syntax.invalid', 'Python не понял запись', 9, ['В строке 9']]
    ];

    test.each(syntaxCases)('syntax: %s', (raw, id, title, line, fragments) => {
        const result = explainPythonError('syntax', raw, { line });
        expect(result).not.toBeNull();
        expect(result!.id).toBe(id);
        expect(result!.title).toBe(title);
        for (const fragment of fragments) expect(result!.message).toContain(fragment);
    });

    const traceback = (line: number, last: string) =>
        `Traceback (most recent call last):\n  File "<user-script>", line ${line}, in <module>\n${last}`;

    const runtimeCases: Array<[string, string, string, string[]]> = [
        [traceback(5, "NameError: name 'speed' is not defined"), 'py.runtime.nameError', 'Имя speed не найдено', ['В строке 5', '`speed`']],
        [traceback(2, "ModuleNotFoundError: No module named 'numpyy'"), 'py.runtime.moduleNotFound', 'Модуль numpyy недоступен', ['`numpyy`']],
        [traceback(3, "TypeError: unsupported operand type(s) for +: 'int' and 'str'"), 'py.runtime.unsupportedOperand', 'Эти значения не сложить', ['int и str', 'str(...)']],
        [traceback(3, 'TypeError: can only concatenate str (not "int") to str'), 'py.runtime.concatenate', 'Текст нельзя сложить с числом', ['str(...)']],
        [traceback(4, "TypeError: takeoff() missing 1 required positional argument: 'height'"), 'py.runtime.argCount', 'Неверные аргументы у takeoff', ['height']],
        [traceback(4, "AttributeError: 'Pioneer' object has no attribute 'takof'"), 'py.runtime.attributeError', 'Нет метода takof', ['`Pioneer`']],
        [traceback(6, 'ZeroDivisionError: division by zero'), 'py.runtime.zeroDivision', 'Деление на ноль', ['В строке 6']],
        [traceback(7, 'IndexError: list index out of range'), 'py.runtime.indexError', 'Элемента с таким номером нет', ['с нуля']],
        [traceback(8, "KeyError: 'x'"), 'py.runtime.keyError', 'Нет такого ключа', ["'x'"]],
        [traceback(9, "ValueError: invalid literal for int() with base 10: 'abc'"), 'py.runtime.valueError', 'Это не число', ["'abc'"]],
        ['Локальный Python runtime завершился с кодом 1.', 'py.runtime.localExit', 'Python на ПК остановился', ['кодом 1']],
        ['Не удалось получить статус локального Python runtime.', 'py.bridge.unavailable', 'Нет связи с Python на ПК', ['на этом же компьютере']]
    ];

    test.each(runtimeCases)('runtime: %s', (raw, id, title, fragments) => {
        const result = explainPythonError('runtime', raw);
        expect(result).not.toBeNull();
        expect(result!.id).toBe(id);
        expect(result!.title).toBe(title);
        for (const fragment of fragments) expect(result!.message).toContain(fragment);
    });

    test('reads the student line out of a traceback', () => {
        expect(parsePythonTracebackLine(traceback(17, 'NameError: name \'a\' is not defined'))).toBe(17);
        expect(parsePythonTracebackLine('NameError')).toBeNull();
    });
});

describe('Student-facing wording rules', () => {
    const everything: Array<{ title: string; message: string; hint?: string }> = [];

    test('collect explanations', () => {
        const luaSamples = [
            "[string \"...\"]:4: unexpected symbol near '='",
            "[string \"...\"]:9: 'end' expected (to close 'if' at line 3) near <eof>",
            "[string \"...\"]:12: attempt to call a nil value (global 'goTo')",
            "[string \"...\"]:5: attempt to index a nil value (local 'leds')",
            "[string \"...\"]:8: attempt to perform arithmetic on a nil value (global 'speed')",
            '[string "..."]:9: attempt to compare number with nil',
            "[string \"...\"]:6: bad argument #1 to 'push' (number expected, got nil)",
            'Похоже, программа зависла в бесконечном цикле',
            'FSM error: invalid transition from IDLE by command MCE_TAKEOFF'
        ];
        for (const raw of luaSamples) {
            const kind = /^\[string "\.\.\."\]:\d+: ('|<|unexpected)/.test(raw) ? 'syntax' : 'runtime';
            const result = explainLuaError(kind, raw);
            expect(result).not.toBeNull();
            everything.push(result!);
        }
        everything.push(batteryLowNotice(25, '7.10'), batteryCriticalNotice(8, '6.85'), missingCallbackNotice('ap.push'), simultaneousCommandsNotice(['TAKEOFF', 'LANDING']));
        everything.push(scenarioBlockedNotice(['Цикл без sleep.']));
        everything.push(explainDroneError({ code: 'timeout', message: 'Дрон не отвечает.' }), droneUploadedNotice(1024, 'борт №3'));
        expect(everything.length).toBeGreaterThan(10);
    });

    test('titles are short and everyday', () => {
        for (const item of everything) {
            expect(wordCount(item.title)).toBeLessThanOrEqual(6);
            for (const pattern of FORBIDDEN) expect(item.title).not.toMatch(pattern);
        }
    });

    test('bodies have no raw interpreter jargon and stay short', () => {
        for (const item of everything) {
            for (const pattern of FORBIDDEN) expect(item.message).not.toMatch(pattern);
            const sentences = item.message.split(/(?<=[.!?])\s+/).filter(Boolean);
            expect(sentences.length).toBeLessThanOrEqual(4);
        }
    });

    test('dictionary ids are unique', () => {
        for (const ids of [luaDictionaryIds.syntax, luaDictionaryIds.runtime, pythonDictionaryIds.syntax, pythonDictionaryIds.runtime]) {
            expect(new Set(ids).size).toBe(ids.length);
        }
    });

    test('Lua message parser strips the chunk prefix', () => {
        expect(parseLuaMessage('[string "..."]:13: oops')).toEqual({ line: 13, body: 'oops' });
        expect(parseLuaMessage('plain')).toEqual({ line: null, body: 'plain' });
    });
});

describe('Real drone errors', () => {
    test('maps link failures to short titles', () => {
        expect(explainDroneError({ name: 'NotFoundError' }).title).toBe('Дрон не выбран');
        expect(explainDroneError({ name: 'NotFoundError' }).level).toBe('info');
        expect(explainDroneError({ message: 'Не удалось открыть порт дрона. Закройте Pioneer Station' }).title).toBe('Порт дрона занят');
        expect(explainDroneError({ code: 'timeout', message: 'Дрон не отвечает. Проверьте, что Pioneer Station закрыта' }).title).toBe('Дрон не отвечает');
        expect(explainDroneError({ code: 'refused', message: 'Дрон отклонил запись файла на позиции 0 (код 3).' }).title).toBe('Дрон не принял запись');
        expect(explainDroneError({ name: 'SerialUnavailableError', message: 'Этот браузер не умеет работать с USB-портами. Откройте симулятор в Chrome или Edge.' }).title).toBe('Нужен Chrome или Edge');
    });

    test('a Lua compile error on upload explains the cause and offers to show the line', () => {
        const result = explainDroneError({ name: 'LuaCompileError', message: "[string \"x\"]:7: unexpected symbol near '='" });
        expect(result.title).toBe('Программа не загружена');
        expect(result.message).toContain('В строке 7');
        expect(result.actions).toEqual([{ kind: 'show-line', label: 'Показать строку', line: 7 }]);
    });

    test('unknown failures fall back to a title for the attempted action', () => {
        expect(explainDroneError({ message: '' }, 'start').title).toBe('Программа не запущена');
        expect(explainDroneError({ message: 'weird' }, 'connect').title).toBe('Дрон не подключился');
    });

    test('upload success names the size and the next step', () => {
        const result = droneUploadedNotice(512, 'борт №2');
        expect(result.level).toBe('success');
        expect(result.message).toContain('512');
        expect(result.message).toContain('«Дрон»');
    });
});
