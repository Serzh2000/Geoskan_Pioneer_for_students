/*
 * Dictionary of common Python errors in plain Russian.
 *
 * Syntax input: SyntaxError.msg ("expected ':'", "unexpected indent", ...).
 * Runtime input: a full traceback or just its last line ("NameError: name 'x'
 * is not defined"). The line is taken from the traceback ('File "<user-script>",
 * line 7') or from the caller. Also explains failures of the local Python
 * backend / external bridge. No DOM here: covered by tests/notice-messages.test.ts.
 */
import { atLine, code, type DictionaryEntry, type ErrorExplanation, type ExplainContext } from './types.js';

function lastLine(raw: string): string {
    const lines = String(raw || '').replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
    return lines[lines.length - 1] || '';
}

/** Line of the student's code inside a traceback. */
export function parsePythonTracebackLine(raw: string): number | null {
    const matches = [...String(raw || '').matchAll(/File "<user-script>", line (\d+)/g)];
    if (!matches.length) return null;
    return Number(matches[matches.length - 1][1]);
}

const SYNTAX_ENTRIES: DictionaryEntry[] = [
    {
        id: 'py.syntax.expectedColon',
        test: /expected ':'/,
        build: (_m, { line }) => ({
            title: 'Не хватает двоеточия',
            message: `${atLine(line)} в конце строки с ${code('if')}, ${code('for')}, ${code('while')} или ${code('def')} нужно двоеточие ${code(':')}. Поставьте его.`,
            example: 'if height > 1:\n    print("высоко")'
        })
    },
    {
        id: 'py.syntax.expectedIndentedBlock',
        test: /expected an indented block(?: after '([^']+)' statement on line (\d+))?/,
        build: (m, { line }) => ({
            title: 'Нужен отступ внутри блока',
            message: m[1]
                ? `После ${code(m[1])} из строки ${m[2]} команды внутри блока должны идти с отступом. Сдвиньте их вправо на 4 пробела.`
                : `${atLine(line)} команды внутри блока должны идти с отступом. Сдвиньте их вправо на 4 пробела.`,
            example: 'for i in range(3):\n    print(i)'
        })
    },
    {
        id: 'py.syntax.unexpectedIndent',
        test: /unexpected indent/,
        build: (_m, { line }) => ({
            title: 'Лишний отступ',
            message: `${atLine(line)} строка сдвинута вправо без причины. Уберите пробелы в начале: отступ нужен только внутри ${code('if')}, ${code('for')}, ${code('while')} и ${code('def')}.`
        })
    },
    {
        id: 'py.syntax.unindentMismatch',
        test: /unindent does not match any outer indentation level/,
        build: (_m, { line }) => ({
            title: 'Отступы не совпали',
            message: `${atLine(line)} отступ не совпадает с отступами выше. Выровняйте строку по соседним и не смешивайте пробелы с табуляцией.`
        })
    },
    {
        id: 'py.syntax.unterminatedString',
        test: /unterminated string literal|EOL while scanning string literal|unterminated triple-quoted string/,
        build: (_m, { line }) => ({
            title: 'Не закрыты кавычки',
            message: `${atLine(line)} текст открыт кавычкой, но не закрыт. Поставьте такую же кавычку в конце текста.`,
            example: 'print("Привет!")'
        })
    },
    {
        id: 'py.syntax.neverClosed',
        test: /'(.)' was never closed/,
        build: (m, { line }) => ({
            title: 'Не закрыта скобка',
            message: `Скобка ${code(m[1])}${line ? ` в строке ${line}` : ''} не закрыта. Добавьте закрывающую скобку ${code({ '(': ')', '[': ']', '{': '}' }[m[1]] || m[1])}.`
        })
    },
    {
        id: 'py.syntax.unmatchedBracket',
        test: /unmatched '(.)'/,
        build: (m, { line }) => ({
            title: 'Лишняя закрывающая скобка',
            message: `${atLine(line)} стоит лишняя скобка ${code(m[1])}: у неё нет пары. Удалите её или добавьте открывающую.`
        })
    },
    {
        id: 'py.syntax.missingComma',
        test: /Perhaps you forgot a comma/,
        build: (_m, { line }) => ({
            title: 'Возможно, пропущена запятая',
            message: `${atLine(line)} между значениями не хватает запятой. Проверьте списки и аргументы функций.`,
            example: 'pioneer.go_to_local_point(x=1, y=0, z=1)'
        })
    },
    {
        id: 'py.syntax.printParens',
        test: /Missing parentheses in call to 'print'/,
        build: (_m, { line }) => ({
            title: 'У print нужны скобки',
            message: `${atLine(line)} ${code('print')} пишется со скобками: ${code('print("текст")')}.`
        })
    },
    {
        id: 'py.syntax.cannotAssign',
        test: /cannot assign to (.+?)(?: here|$)/,
        build: (m, { line }) => ({
            title: 'Сюда нельзя записать значение',
            message: `${atLine(line)} знак ${code('=')} ставится после имени переменной, а не после ${m[1]}. Для сравнения используйте ${code('==')}.`,
            example: 'speed = 2\nif speed == 2:\n    ...'
        })
    },
    {
        id: 'py.syntax.invalidDecimal',
        test: /invalid decimal literal|invalid character/,
        build: (_m, { line }) => ({
            title: 'Странный символ в коде',
            message: `${atLine(line)} есть символ, который Python не понимает. Часто это русская буква, «умные» кавычки или цифра, склеенная с буквами.`
        })
    },
    {
        id: 'py.syntax.invalid',
        test: /invalid syntax/,
        build: (_m, { line }) => ({
            title: 'Python не понял запись',
            message: `${atLine(line)} Python не понял запись. Проверьте двоеточия, скобки, кавычки и запятые в этой строке и в строке выше.`
        })
    }
];

const RUNTIME_ENTRIES: DictionaryEntry[] = [
    {
        // checkPythonSdkForDrone (python/browser-runtime.ts): у Мини 2 своя библиотека.
        id: 'py.runtime.sdkForMini2',
        test: /Пионер Мини 2 программируется через pioneer_sdk2/,
        build: (_m, { line }) => ({
            title: 'Мини 2 программируется через pioneer_sdk2',
            message: `${atLine(line)} подключается ${code('pioneer_sdk')} - библиотека Пионера Базового. У Пионера Мини 2 программа работает на его борту через ${code('pioneer_sdk2')}: курс в градусах, цвет 0..1, arm/takeoff/land ждут окончания действия.`,
            example: 'from pioneer_sdk2 import Pioneer\n\npioneer = Pioneer()\npioneer.arm()\npioneer.takeoff()'
        })
    },
    {
        id: 'py.runtime.sdk2ForBasic',
        test: /pioneer_sdk2 - библиотека Пионера Мини 2/,
        build: (_m, { line }) => ({
            title: 'pioneer_sdk2 - только для Мини 2',
            message: `${atLine(line)} подключается ${code('pioneer_sdk2')}, а выбран Пионер Базовый. Для него используйте ${code('pioneer_sdk')} или добавьте дрон «Мини 2» на панели «Рой».`,
            example: 'from pioneer_sdk import Pioneer'
        })
    },
    {
        id: 'py.runtime.nameError',
        test: /NameError: name '([^']+)' is not defined/,
        build: (m, { line }) => ({
            title: `Имя ${m[1]} не найдено`,
            message: `${atLine(line)} используется ${code(m[1])}, но Python такого имени не знает. Проверьте написание (большие и маленькие буквы различаются) и то, что переменная создана выше, а модуль подключён через ${code('import')}.`,
            example: `${m[1]} = 1\nprint(${m[1]})`
        })
    },
    {
        id: 'py.runtime.moduleNotFound',
        test: /(?:ModuleNotFoundError|ImportError): No module named '([^']+)'/,
        build: (m, { line }) => ({
            title: `Модуль ${m[1]} недоступен`,
            message: `${atLine(line)} подключается модуль ${code(m[1])}, которого нет в симуляторе. Проверьте название или используйте только ${code('pioneer_sdk')}, ${code('time')} и стандартные модули.`,
            example: 'from pioneer_sdk import Pioneer\nimport time'
        })
    },
    {
        id: 'py.runtime.importName',
        test: /ImportError: cannot import name '([^']+)'(?: from '([^']+)')?/,
        build: (m, { line }) => ({
            title: `Не найдено ${m[1]}`,
            message: `${atLine(line)} из ${m[2] ? code(m[2]) : 'модуля'} запрашивается ${code(m[1])}, но такого имени там нет. Проверьте написание.`
        })
    },
    {
        id: 'py.runtime.attributeError',
        test: /AttributeError: '([^']+)' object has no attribute '([^']+)'/,
        build: (m, { line }) => ({
            title: `Нет метода ${m[2]}`,
            message: `${atLine(line)} у объекта типа ${code(m[1])} нет ${code(m[2])}. Проверьте написание метода и справочник.`
        })
    },
    {
        id: 'py.runtime.attributeErrorModule',
        test: /AttributeError: module '([^']+)' has no attribute '([^']+)'/,
        build: (m, { line }) => ({
            title: `В ${m[1]} нет ${m[2]}`,
            message: `${atLine(line)} в модуле ${code(m[1])} нет ${code(m[2])}. Проверьте написание.`
        })
    },
    {
        id: 'py.runtime.noneType',
        test: /TypeError: 'NoneType' object (?:is not subscriptable|is not iterable|is not callable|has no attribute '([^']+)')|AttributeError: 'NoneType' object has no attribute '([^']+)'/,
        build: (_m, { line }) => ({
            title: 'Вместо значения — None',
            message: `${atLine(line)} работа идёт со значением None, то есть «ничего». Скорее всего, функция ничего не вернула или переменная не заполнена.`
        })
    },
    {
        id: 'py.runtime.unsupportedOperand',
        test: /TypeError: unsupported operand type\(s\) for ([^:]+): '([^']+)' and '([^']+)'/,
        build: (m, { line }) => ({
            title: 'Эти значения не сложить',
            message: `${atLine(line)} операция ${code(m[1].trim())} применена к значениям разных типов: ${m[2]} и ${m[3]}. Приведите их к одному типу, например через ${code('int(...)')} или ${code('str(...)')}.`,
            example: 'print("Высота: " + str(height))'
        })
    },
    {
        id: 'py.runtime.concatenate',
        test: /TypeError: can only concatenate str \(not "([^"]+)"\) to str/,
        build: (m, { line }) => ({
            title: 'Текст нельзя сложить с числом',
            message: `${atLine(line)} к тексту добавляется ${m[1]}. Преобразуйте значение в текст через ${code('str(...)')}.`,
            example: 'print("Высота: " + str(height))'
        })
    },
    {
        id: 'py.runtime.argCount',
        test: /TypeError: (\w+)\(\) (?:takes|missing|got)[^\n]*(?:argument|arguments)/,
        build: (m, { line, raw }) => {
            const missing = raw.match(/missing (\d+) required (?:positional )?arguments?: ([^\n]+)/);
            return {
                title: `Неверные аргументы у ${m[1]}`,
                message: missing
                    ? `${atLine(line)} в ${code(`${m[1]}(...)`)} не хватает значений: ${missing[2]}. Добавьте их в скобки.`
                    : `${atLine(line)} в ${code(`${m[1]}(...)`)} передано неверное количество или названия аргументов. Сверьтесь со справочником.`
            };
        }
    },
    {
        id: 'py.runtime.notCallable',
        test: /TypeError: '([^']+)' object is not callable/,
        build: (m, { line }) => ({
            title: 'Это не функция',
            message: `${atLine(line)} значение типа ${code(m[1])} вызывается как функция. Уберите скобки или проверьте, не затёрли ли вы имя функции переменной.`
        })
    },
    {
        id: 'py.runtime.typeError',
        test: /TypeError: (.+)/,
        build: (m, { line }) => ({
            title: 'Значение неподходящего типа',
            message: `${atLine(line)} значение не того типа: ${m[1].slice(0, 120)}. Проверьте, что числа, тексты и списки используются по назначению.`
        })
    },
    {
        id: 'py.runtime.zeroDivision',
        test: /ZeroDivisionError|division by zero/,
        build: (_m, { line }) => ({
            title: 'Деление на ноль',
            message: `${atLine(line)} число делится на ноль. Проверьте делитель перед делением.`,
            example: 'if count != 0:\n    average = total / count'
        })
    },
    {
        id: 'py.runtime.indexError',
        test: /IndexError: (?:list|tuple|string) index out of range/,
        build: (_m, { line }) => ({
            title: 'Элемента с таким номером нет',
            message: `${atLine(line)} запрашивается элемент списка, которого нет. Номера идут с нуля, а последний элемент — на единицу меньше длины списка.`
        })
    },
    {
        id: 'py.runtime.keyError',
        test: /KeyError: (.+)/,
        build: (m, { line }) => ({
            title: 'Нет такого ключа',
            message: `${atLine(line)} в словаре нет ключа ${code(m[1])}. Проверьте написание ключа.`
        })
    },
    {
        id: 'py.runtime.valueError',
        test: /ValueError: invalid literal for int\(\) with base 10: (.+)/,
        build: (m, { line }) => ({
            title: 'Это не число',
            message: `${atLine(line)} из значения ${code(m[1])} нельзя сделать целое число. Проверьте, что в нём только цифры.`
        })
    },
    {
        id: 'py.runtime.recursion',
        test: /RecursionError/,
        build: (_m, { line }) => ({
            title: 'Функция зовёт сама себя',
            message: `${atLine(line)} функция вызывает сама себя без конца. Добавьте условие, при котором она остановится.`
        })
    },
    {
        id: 'py.runtime.indentation',
        test: /IndentationError: (.+)/,
        build: (_m, { line }) => ({
            title: 'Проблема с отступами',
            message: `${atLine(line)} отступы расставлены неверно. Выровняйте строки внутри блока на одну и ту же глубину.`
        })
    },
    {
        id: 'py.runtime.localExit',
        test: /Локальный Python runtime завершился с кодом (\S+?)\.?$/m,
        build: (m) => ({
            title: 'Python на ПК остановился',
            message: `Программа закончилась с кодом ${m[1]}: внутри случилась ошибка. Её текст смотрите в бортжурнале, а потом запустите снова.`
        })
    },
    {
        id: 'py.bridge.unavailable',
        test: /Не удалось (?:получить статус локального Python runtime|получить события внешнего Python bridge|выполнить Python-код через локальный backend)|Локальный backend не смог запустить Python-код|Failed to fetch|NetworkError/i,
        build: () => ({
            title: 'Нет связи с Python на ПК',
            message: 'Симулятор не достучался до внешнего Python. Проверьте, что программа с Python запущена на этом же компьютере, и попробуйте ещё раз.',
            hint: 'Если вы запускаете Python из редактора, выберите «Встроенный Python» в настройках дрона — ему внешняя программа не нужна.'
        })
    }
];

function lookup(entries: DictionaryEntry[], raw: string, context: ExplainContext): ErrorExplanation | null {
    const text = String(raw || '').replace(/\r/g, '');
    const line = parsePythonTracebackLine(text) ?? (typeof context.line === 'number' ? context.line : null);
    const last = lastLine(text);
    for (const entry of entries) {
        for (const haystack of [last, text]) {
            const match = haystack.match(entry.test);
            if (match) {
                const built = entry.build(match, { line, raw: text });
                return { id: entry.id, line, ...built };
            }
        }
    }
    return null;
}

export function explainPythonSyntaxError(raw: string, context: ExplainContext = {}): ErrorExplanation | null {
    return lookup(SYNTAX_ENTRIES, raw, context);
}

export function explainPythonRuntimeError(raw: string, context: ExplainContext = {}): ErrorExplanation | null {
    return lookup(RUNTIME_ENTRIES, raw, context);
}

export function explainPythonError(kind: 'syntax' | 'runtime', raw: string, context: ExplainContext = {}): ErrorExplanation | null {
    return kind === 'syntax' ? explainPythonSyntaxError(raw, context) : explainPythonRuntimeError(raw, context);
}

export const pythonDictionaryIds = {
    syntax: SYNTAX_ENTRIES.map((entry) => entry.id),
    runtime: RUNTIME_ENTRIES.map((entry) => entry.id)
};
