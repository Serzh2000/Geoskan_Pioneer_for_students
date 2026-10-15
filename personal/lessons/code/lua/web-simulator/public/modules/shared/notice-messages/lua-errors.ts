/*
 * Dictionary of common Lua errors in plain Russian.
 *
 * Input is the raw message of the Lua interpreter (fengari) or of the simulator
 * ("fsm error: ...", "Константа ... должна использоваться с префиксом Ev."),
 * output is a title, a message with the cause and the next step, and an example.
 * The line number and the names of variables/functions from the original message
 * are kept so a student can find the place. No DOM here: the module is covered by
 * tests/notice-messages.test.ts.
 */
import { atLine, code, type DictionaryEntry, type ErrorExplanation, type ExplainContext } from './types.js';

const TYPE_NAMES: Record<string, string> = {
    nil: 'пустое значение (nil)',
    number: 'число',
    string: 'текст',
    table: 'таблица',
    boolean: 'логическое значение',
    function: 'функция',
    userdata: 'объект симулятора',
    thread: 'сопрограмма'
};

function typeName(raw: string): string {
    return TYPE_NAMES[raw] || raw;
}

/** Splits `[string "..."]:13: text` into the line and the text. */
export function parseLuaMessage(raw: string): { line: number | null; body: string } {
    const firstLine = String(raw || '')
        .replace(/\r/g, '')
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line && !/^stack traceback:/i.test(line)) || '';
    const match = firstLine.match(/^(?:\[string "[^"]*"\]|[^\s:]+):(\d+):\s*(.*)$/);
    if (match) return { line: Number(match[1]), body: match[2].trim() };
    return { line: null, body: firstLine };
}

/** `(global 'foo')`, `(local 'x')`, `(field 'y')`, `(method 'z')`, `(upvalue 'u')` -> what and which name. */
function parseVariableHint(body: string): { kind: string; name: string } | null {
    const match = body.match(/\((global|local|field|method|upvalue|constant) '([^']+)'\)/);
    return match ? { kind: match[1], name: match[2] } : null;
}

/** The token after "near": `near '='` -> `=`, `near <eof>` -> `<eof>`. */
function parseNear(body: string): string | null {
    const quoted = body.match(/near '(.*)'\s*$/);
    if (quoted) return quoted[1];
    return /near <eof>/.test(body) ? '<eof>' : null;
}

const BLOCK_NAMES: Record<string, string> = {
    'if': 'if',
    'function': 'function',
    'for': 'for',
    'while': 'while',
    'do': 'do',
    'repeat': 'repeat'
};

const UNAVAILABLE_LIBRARIES = new Set(['io', 'os', 'debug', 'package', 'require', 'dofile', 'loadfile', 'load', 'loadstring', 'collectgarbage']);

const SYNTAX_ENTRIES: DictionaryEntry[] = [
    {
        id: 'lua.syntax.callLaterCall',
        test: /'\)' expected \(to close '\(' at line \d+\) near 'end'/,
        build: () => ({
            title: 'Лишний end в Timer.callLater',
            message: 'Похоже, в `Timer.callLater(...)` вместо функции передан её вызов. Передайте имя функции без скобок или оберните вызов в `function() ... end`.',
            hint: 'В записи вроде `Timer.callLater(1, changeColor({0,1,0}) end)` появляется лишний `end`. Готовую функцию передают без скобок, а вызов с аргументами оборачивают в `function() ... end`.',
            example: 'Timer.callLater(1, blinkGreen)\nTimer.callLater(1, function() changeColor({0, 1, 0}) end)'
        })
    },
    {
        id: 'lua.syntax.brokenName',
        test: /unexpected symbol near 'or'/,
        build: (_m, { line }) => ({
            title: 'Имя разорвано пробелом',
            message: `${atLine(line)} слово \`or\` попало внутрь имени. Скорее всего, имя переменной или функции разбилось на две части. Склейте его обратно.`,
            hint: 'Например, вместо `changeColor` случайно написано `changeCol or`. Проверьте, нет ли пробела посреди имени.',
            example: 'changeColor({0, 1, 0})'
        })
    },
    {
        id: 'lua.syntax.strangeSymbol',
        test: /near '<\\\d+>/,
        build: (_m, { line }) => ({
            title: 'Необычный символ в коде',
            message: `${atLine(line)} есть символ, который Lua не понимает. Часто это русская буква, «умные» кавычки или длинное тире. Перепечатайте этот фрагмент вручную.`,
            hint: 'Код пишется английскими буквами и обычными прямыми кавычками "…". Русский текст допустим только внутри кавычек и комментариев.'
        })
    },
    {
        id: 'lua.syntax.missingEnd',
        test: /'end' expected(?: \(to close '(\w+)' at line (\d+)\))?/,
        build: (m, { line }) => {
            const opener = m[1] ? BLOCK_NAMES[m[1]] || m[1] : null;
            const openedAt = m[2] ? Number(m[2]) : null;
            const where = opener && openedAt
                ? `Блок ${code(opener)}, начатый в строке ${openedAt}, не закрыт.`
                : `${atLine(line)} не хватает слова ${code('end')}.`;
            return {
                title: 'Не хватает end',
                message: `${where} Добавьте ${code('end')} там, где блок должен закончиться.`,
                hint: `Каждому ${code('if')}, ${code('for')}, ${code('while')} и ${code('function')} нужен свой ${code('end')}. Удобно ставить его сразу после открытия блока и писать код между ними.`,
                example: 'if x > 0 then\n    print("положительное")\nend'
            };
        }
    },
    {
        id: 'lua.syntax.extraEnd',
        test: /<eof> expected near '(end|else|elseif|until)'/,
        build: (m, { line }) => ({
            title: m[1] === 'end' ? 'Лишний end' : `Лишнее слово ${m[1]}`,
            message: `${atLine(line)} слово ${code(m[1])} лишнее: все блоки перед ним уже закрыты. Удалите его или проверьте, не потерялось ли начало блока выше.`,
            hint: 'Посчитайте: сколько открывающих слов (`if`, `for`, `while`, `function`) и сколько `end`. Их должно быть поровну.'
        })
    },
    {
        id: 'lua.syntax.missingThen',
        test: /'then' expected/,
        build: (_m, { line }) => ({
            title: 'После условия нужно then',
            message: `${atLine(line)} после условия ${code('if')} пропущено слово ${code('then')}. Допишите его в конце строки с условием.`,
            example: 'if height > 1 then\n    print("высоко")\nend'
        })
    },
    {
        id: 'lua.syntax.missingDo',
        test: /'do' expected/,
        build: (_m, { line }) => ({
            title: 'После цикла нужно do',
            message: `${atLine(line)} после заголовка цикла пропущено слово ${code('do')}. Допишите его в конце строки.`,
            example: 'for i = 1, 3 do\n    print(i)\nend'
        })
    },
    {
        id: 'lua.syntax.missingUntil',
        test: /'until' expected/,
        build: (_m, { line }) => ({
            title: 'Цикл repeat не закрыт',
            message: `${atLine(line)} цикл ${code('repeat')} должен заканчиваться словом ${code('until')} с условием выхода. Добавьте его.`,
            example: 'repeat\n    sleep(0.1)\nuntil done'
        })
    },
    {
        id: 'lua.syntax.missingEquals',
        test: /'=' expected near/,
        build: (_m, { line }) => ({
            title: 'Не хватает знака =',
            message: `${atLine(line)} после имени ожидается ${code('=')}. Если это вызов функции, проверьте скобки: ${code('имя(...)')}.`,
            example: 'speed = 2\nleds:set(0, 1, 0, 0)'
        })
    },
    {
        id: 'lua.syntax.missingParen',
        test: /'\)' expected(?: \(to close '\(' at line (\d+)\))? near/,
        build: (m, { line }) => ({
            title: 'Не закрыта скобка',
            message: m[1]
                ? `Скобка, открытая в строке ${m[1]}, не закрыта. Добавьте ${code(')')} в конце выражения.`
                : `${atLine(line)} не хватает закрывающей скобки ${code(')')}. Проверьте, что каждой ${code('(')} есть пара.`
        })
    },
    {
        id: 'lua.syntax.missingBrace',
        test: /'\}' expected(?: \(to close '\{' at line (\d+)\))?/,
        build: (m, { line }) => ({
            title: 'Не закрыта таблица { }',
            message: m[1]
                ? `Таблица, начатая в строке ${m[1]}, не закрыта. Добавьте ${code('}')} и проверьте запятые между значениями.`
                : `${atLine(line)} не хватает ${code('}')}. Проверьте запятые между значениями в таблице.`,
            example: 'color = {1, 0, 0}'
        })
    },
    {
        id: 'lua.syntax.functionArgs',
        test: /function arguments expected near/,
        build: (_m, { line }) => ({
            title: 'У функции нет скобок',
            message: `${atLine(line)} после имени функции должны идти скобки ${code('(...)')}, даже если аргументов нет.`,
            example: 'ap.push(Ev.MCE_PREFLIGHT)'
        })
    },
    {
        id: 'lua.syntax.expectedName',
        test: /<name> expected near/,
        build: (_m, { line }) => ({
            title: 'Здесь нужно имя',
            message: `${atLine(line)} вместо имени стоит число или знак. Имя должно начинаться с буквы, например ${code('speed')}.`
        })
    },
    {
        id: 'lua.syntax.unfinishedString',
        test: /unfinished (?:long )?string/,
        build: (_m, { line }) => ({
            title: 'Не закрыты кавычки',
            message: `${atLine(line)} текст открыт кавычкой, но не закрыт. Поставьте такую же кавычку в конце текста.`,
            example: 'print("Привет!")'
        })
    },
    {
        id: 'lua.syntax.unfinishedComment',
        test: /unfinished long comment/,
        build: () => ({
            title: 'Не закрыт комментарий',
            message: 'Длинный комментарий открыт, но не закрыт. Закончите его знаками `]]`.'
        })
    },
    {
        id: 'lua.syntax.malformedNumber',
        test: /malformed number near '([^']*)'/,
        build: (m, { line }) => ({
            title: 'Число записано неверно',
            message: `${atLine(line)} число ${code(m[1])} написано неверно. Проверьте точку и лишние буквы внутри числа.`,
            example: 'x = 1.5'
        })
    },
    {
        id: 'lua.syntax.breakOutside',
        test: /break outside a loop/,
        build: (_m, { line }) => ({
            title: 'break вне цикла',
            message: `${atLine(line)} стоит ${code('break')}, но цикла вокруг нет. ${code('break')} работает только внутри ${code('for')} и ${code('while')}.`
        })
    },
    {
        id: 'lua.syntax.unexpectedEof',
        test: /unexpected symbol near <eof>/,
        build: () => ({
            title: 'Программа оборвалась',
            message: 'Файл закончился раньше, чем закончилась команда. Проверьте последнюю строку: возможно, не дописано выражение.'
        })
    },
    {
        id: 'lua.syntax.unexpectedSymbolEquals',
        test: /unexpected symbol near '='/,
        build: (_m, { line }) => ({
            title: 'Лишний знак =',
            message: `${atLine(line)} перед ${code('=')} должно стоять имя переменной. Возможно, имя пропущено или стоит лишняя запятая.`,
            example: 'speed = 2'
        })
    },
    {
        id: 'lua.syntax.unexpectedSymbol',
        test: /unexpected symbol near '([^']*)'/,
        build: (m, { line }) => ({
            title: 'Непонятный символ в строке',
            message: `${atLine(line)} Lua не понял ${code(m[1])}. Проверьте запятые, скобки и кавычки рядом с ним.`
        })
    },
    {
        id: 'lua.syntax.eofExpected',
        test: /<eof> expected near/,
        build: () => ({
            title: 'Лишний текст в конце',
            message: 'В конце программы есть незавершённая или лишняя конструкция. Проверьте последние строки.'
        })
    }
];

/** Mission-level errors raised by the simulator itself (Russian text, not Lua interpreter text). */
function explainFsm(state: string, command: string): Omit<ErrorExplanation, 'id' | 'line'> {
    const upperState = state.toUpperCase();
    const upperCommand = command.toUpperCase();
    const stateLabels: Record<string, string> = {
        IDLE: 'стоит на земле',
        PREFLIGHT: 'готовится к полёту',
        TAKEOFF_PROCESS: 'взлетает',
        FLYING_HOVER: 'висит в воздухе',
        FLYING_MOVING: 'летит к точке',
        LANDING_PROCESS: 'садится'
    };
    const commandLabels: Record<string, string> = {
        MCE_PREFLIGHT: code('Ev.MCE_PREFLIGHT'),
        MCE_TAKEOFF: code('Ev.MCE_TAKEOFF'),
        MCE_LANDING: code('Ev.MCE_LANDING'),
        GO_TO_LOCAL_POINT: code('ap.goToLocalPoint(...)')
    };
    const stateLabel = stateLabels[upperState] || `в состоянии ${code(upperState)}`;
    const commandLabel = commandLabels[upperCommand] || code(upperCommand);

    if (upperCommand === 'MCE_PREFLIGHT' && upperState === 'PREFLIGHT') {
        return {
            title: 'Подготовка уже запущена',
            message: `Команда ${commandLabel} отправлена второй раз, а дрон уже готовится к полёту. Оставьте её один раз и дождитесь ${code('Ev.ENGINES_STARTED')}.`,
            hint: 'После предполётной подготовки дождитесь события ENGINES_STARTED и только потом отправляйте Ev.MCE_TAKEOFF.',
            example: 'ap.push(Ev.MCE_PREFLIGHT)\n\nfunction callback(event)\n    if event == Ev.ENGINES_STARTED then\n        ap.push(Ev.MCE_TAKEOFF)\n    end\nend'
        };
    }
    if (upperCommand === 'MCE_TAKEOFF' && upperState === 'IDLE') {
        return {
            title: 'Взлёт раньше подготовки',
            message: `Дрон ещё не готов к взлёту: он ${stateLabel}. Сначала отправьте ${code('Ev.MCE_PREFLIGHT')}, а взлёт запускайте по ${code('Ev.ENGINES_STARTED')}.`,
            example: 'ap.push(Ev.MCE_PREFLIGHT)\n\nfunction callback(event)\n    if event == Ev.ENGINES_STARTED then\n        ap.push(Ev.MCE_TAKEOFF)\n    end\nend'
        };
    }
    if (upperCommand === 'GO_TO_LOCAL_POINT' && upperState === 'TAKEOFF_PROCESS') {
        return {
            title: 'Маршрут слишком рано',
            message: `Дрон ещё взлетает, а ${commandLabel} уже отправлен. Перенесите его в ${code('callback(event)')} и запускайте по ${code('Ev.TAKEOFF_COMPLETE')}.`,
            example: 'function callback(event)\n    if event == Ev.TAKEOFF_COMPLETE then\n        ap.goToLocalPoint(1, 0, 1)\n    end\nend'
        };
    }
    const recommendations: Record<string, string> = {
        MCE_PREFLIGHT: 'Отправляйте её один раз, пока дрон стоит на земле.',
        MCE_TAKEOFF: `Отправляйте её после ${code('Ev.MCE_PREFLIGHT')}, лучше по событию ${code('Ev.ENGINES_STARTED')}.`,
        MCE_LANDING: 'Садиться можно только в воздухе, не во время взлёта.',
        GO_TO_LOCAL_POINT: `Запускайте маршрут после взлёта, по событию ${code('Ev.TAKEOFF_COMPLETE')}.`
    };
    return {
        title: 'Команда сейчас не подходит',
        message: `Команда ${commandLabel} не подходит: дрон ${stateLabel}. ${recommendations[upperCommand] || 'Проверьте порядок этапов миссии.'}`,
        hint: 'Порядок этапов: предполётная подготовка, взлёт, полёт по маршруту, посадка.'
    };
}

function explainSimultaneous(commandsRaw: string): Omit<ErrorExplanation, 'id' | 'line'> {

            const commands = Array.from(new Set(commandsRaw.split(',').map((value) => value.trim().toUpperCase()).filter(Boolean)));
            if (commands.length === 1 && commands[0] === 'PREFLIGHT') {
                return {
                    title: 'Подготовка запущена дважды',
                    message: `${code('Ev.MCE_PREFLIGHT')} отправлен два раза подряд. Оставьте один, а ${code('Ev.MCE_TAKEOFF')} запускайте по ${code('Ev.ENGINES_STARTED')}.`,
                    hint: `Подготовка запускается один раз. Дождитесь события ${code('Ev.ENGINES_STARTED')} и только потом отправляйте ${code('Ev.MCE_TAKEOFF')}.`,
                    example: 'ap.push(Ev.MCE_PREFLIGHT)\n\nfunction callback(event)\n    if event == Ev.ENGINES_STARTED then\n        ap.push(Ev.MCE_TAKEOFF)\n    end\nend'
                };
            }
            const labelMap: Record<string, string> = {
                PREFLIGHT: code('Ev.MCE_PREFLIGHT'),
                TAKEOFF: code('Ev.MCE_TAKEOFF'),
                LANDING: code('Ev.MCE_LANDING'),
                GOTOLOCALPOINT: code('ap.goToLocalPoint(...)')
            };
            const rendered = commands.map((command) => labelMap[command] || code(command)).join(', ');
            return {
                title: 'Команды наступают друг на друга',
                message: `Дрон получил сразу несколько команд миссии: ${rendered}. Разнесите их по этапам через ${code('Timer.callLater(...)')}, ${code('sleep(...)')} или ${code('callback(event)')}.`,
                hint: `Следующую команду отправляйте, когда пришло событие о завершении предыдущей: ${code('Ev.ENGINES_STARTED')}, ${code('Ev.TAKEOFF_COMPLETE')}, ${code('Ev.POINT_REACHED')}.`
            };
}

const RUNTIME_ENTRIES: DictionaryEntry[] = [
    {
        id: 'lua.runtime.fsmTransition',
        test: /fsm error:\s*invalid transition from\s+([A-Z_]+)\s+by command\s+([A-Z_]+)/i,
        build: (m) => explainFsm(m[1], m[2])
    },
    {
        id: 'lua.runtime.fsmGeneric',
        test: /fsm error:/i,
        build: () => ({
            title: 'Команда не в свой черёд',
            message: 'Эта команда не подходит к текущему этапу полёта. Соблюдайте порядок: подготовка, взлёт, маршрут, посадка.'
        })
    },
    {
        id: 'lua.runtime.evMissingPrefix',
        test: /константа [`"]?([A-Z0-9_]+)[`"]? должна использоваться с префиксом [`"]?Ev\.[`"]?/i,
        build: (m) => {
            const name = m[1].toUpperCase();
            return {
                title: `Нужно писать Ev.${name}`,
                message: `Константу ${code(name)} нужно писать с префиксом: ${code(`Ev.${name}`)}. Замените её везде в условиях и вызовах.`,
                example: `if event == Ev.${name} then\n    ...\nend`
            };
        }
    },
    {
        id: 'lua.runtime.evUnknown',
        test: /событие или команда [`"]?([A-Z0-9_]+)[`"]? отсутствует в справочнике lua api/i,
        build: (m) => {
            const name = m[1].toUpperCase();
            return {
                title: 'Такого события нет',
                message: `Название ${code(name)} не найдено среди событий и команд. Проверьте написание в справочнике и пишите ${code('Ev.ИМЯ')}.`,
                hint: 'Частая причина — опечатка в одной букве, например MCE_TAKOFF вместо MCE_TAKEOFF. Правильные названия есть в «Справочнике API» (кнопка в шапке редактора).'
            };
        }
    },
    {
        id: 'lua.runtime.simultaneous',
        test: /команды миссии запущены одновременно без паузы:\s*([A-Za-z_,\s]+)\./i,
        build: (m) => explainSimultaneous(m[1])
    },
    {
        id: 'lua.runtime.simultaneousEnglish',
        test: /Commands ([A-Za-z_,\s]+?) run at the same time/i,
        build: (m) => explainSimultaneous(m[1])
    },
    {
        id: 'lua.runtime.infiniteLoop',
        test: /зависла в (?:бесконечном )?цикле|infinite loop|too long without yielding/i,
        build: () => ({
            title: 'Цикл не даёт дрону лететь',
            message: `Цикл крутится без остановки и без ожидания, поэтому симулятор остановил программу. Добавьте в цикл ${code('sleep(0.1)')} или условие выхода.`,
            hint: 'Внутри бесконечного цикла нужна пауза, иначе всё время уходит на цикл и дрон не получает управление.',
            example: 'while true do\n    sleep(0.1)\nend'
        })
    },
    {
        id: 'lua.runtime.stackOverflow',
        test: /stack overflow/i,
        build: (_m, { line }) => ({
            title: 'Функция зовёт сама себя',
            message: `${atLine(line)} функция вызывает сама себя без конца. Добавьте условие, при котором она остановится.`
        })
    },
    {
        id: 'lua.runtime.callNil',
        test: /attempt to call a nil value(?: \((global|local|field|method|upvalue) '([^']+)'\))?/,
        build: (m, { line }) => {
            const name = m[2];
            if (name && UNAVAILABLE_LIBRARIES.has(name)) {
                return {
                    title: 'Эта функция недоступна',
                    message: `${atLine(line)} вызывается ${code(name)}, но в симуляторе она недоступна. Задачу можно решить командами автопилота и таймерами.`
                };
            }
            if (!name) {
                return {
                    title: 'Вызвана несуществующая функция',
                    message: `${atLine(line)} вызывается то, чего нет. Проверьте имя функции: Lua различает большие и маленькие буквы.`
                };
            }
            const what = m[1] === 'method' || m[1] === 'field' ? 'метода' : 'функции';
            return {
                title: m[1] === 'method' || m[1] === 'field' ? `Нет метода ${name}` : `Нет функции ${name}`,
                message: `${atLine(line)} вызывается ${code(name)}, но такого ${what} нет. Проверьте написание: Lua различает большие и маленькие буквы.`,
                hint: 'Если функция ваша, она должна быть объявлена выше места вызова. Если это команда симулятора, сверьте имя со справочником.',
                example: `function ${name}()\n    -- ...\nend\n\n${name}()`
            };
        }
    },
    {
        id: 'lua.runtime.callNonFunction',
        test: /attempt to call a (number|string|table|boolean) value(?: \((global|local|field|method|upvalue) '([^']+)'\))?/,
        build: (m, { line }) => ({
            title: m[3] ? `${m[3]} — это не функция` : 'Это не функция',
            message: `${atLine(line)} со скобками вызывается ${m[3] ? code(m[3]) : 'значение'}, но это ${typeName(m[1])}. Уберите скобки или проверьте, не затёрли ли вы имя функции переменной.`
        })
    },
    {
        id: 'lua.runtime.indexNil',
        test: /attempt to index a nil value/,
        build: (m, { line, raw }) => {
            const variable = parseVariableHint(raw);
            const name = variable?.name;
            if (name && UNAVAILABLE_LIBRARIES.has(name)) {
                return {
                    title: 'Эта часть Lua недоступна',
                    message: `${atLine(line)} используется ${code(name)}, но в симуляторе такого набора функций нет. Используйте команды автопилота и таймеры.`
                };
            }
            if (name) {
                return {
                    title: `${name} пока пусто`,
                    message: `${atLine(line)} у ${code(name)} запрашивается поле или метод, но в ${code(name)} ничего нет (nil). Создайте и заполните её до этой строки.`,
                    hint: 'Так бывает, если переменная не создана, написана с опечаткой или функция ничего не вернула.',
                    example: `${name} = {}\n${name}.x = 1`
                };
            }
            return {
                title: 'Обращение к пустому значению',
                message: `${atLine(line)} запрашивается поле у значения, которого нет (nil). Проверьте, что переменная создана и в ней что-то лежит.`
            };
        }
    },
    {
        id: 'lua.runtime.arithmetic',
        test: /attempt to perform arithmetic on (?:a |an )?(\w+) value/,
        build: (m, { line, raw }) => {
            const variable = parseVariableHint(raw);
            const name = variable?.name;
            const typeLabel = typeName(m[1]);
            const target = name ? `${code(name)} — ${typeLabel}` : `в расчёте ${typeLabel}`;
            return {
                title: m[1] === 'nil' ? 'Считаем с пустым значением' : 'Считать можно только числа',
                message: `${atLine(line)} в расчёте участвует ${m[1] === 'nil' ? (name ? `${code(name)}, а в ней пусто (nil)` : 'пустое значение (nil)') : target}. ${name ? `Задайте ${code(name)} число до этой строки.` : 'Проверьте, что все части расчёта — числа.'}`,
                hint: 'Пустое значение появляется, когда переменная не создана или имя написано с опечаткой. Текст вроде "5" тоже не число: используйте tonumber("5").',
                example: name ? `${name} = 1\nresult = ${name} + 2` : 'speed = 1\nresult = speed + 2'
            };
        }
    },
    {
        id: 'lua.runtime.compare',
        test: /attempt to compare (?:two )?(\w+)(?: with (\w+)| values)/,
        build: (m, { line }) => {
            const first = m[1];
            const second = m[2] || m[1];
            const hasNil = first === 'nil' || second === 'nil';
            return {
                title: hasNil ? 'Сравнение с пустым значением' : 'Сравниваются разные типы',
                message: hasNil
                    ? `${atLine(line)} число сравнивается с пустым значением (nil). Проверьте, что переменная в условии создана и получила значение до сравнения.`
                    : `${atLine(line)} сравниваются ${typeName(first)} и ${typeName(second)}. Сравнивать с ${code('<')} и ${code('>')} можно только два числа или два текста.`,
                example: 'height = 0\nif height < 1 then\n    ...\nend'
            };
        }
    },
    {
        id: 'lua.runtime.concatenate',
        test: /attempt to concatenate (?:a |an )?(\w+) value/,
        build: (m, { line, raw }) => {
            const name = parseVariableHint(raw)?.name;
            return {
                title: 'Склеить не получилось',
                message: `${atLine(line)} к тексту через ${code('..')} добавляется ${name ? code(name) : 'значение'}, а это ${typeName(m[1])}. ${m[1] === 'nil' ? 'Сначала задайте значение переменной.' : `Оберните в ${code('tostring(...)')}.`}`,
                example: 'print("Высота: " .. tostring(height))'
            };
        }
    },
    {
        id: 'lua.runtime.length',
        test: /attempt to get length of (?:a |an )?(\w+) value/,
        build: (m, { line }) => ({
            title: 'У значения нет длины',
            message: `${atLine(line)} запрашивается длина через ${code('#')} у значения типа «${typeName(m[1])}». Длину можно узнать только у текста и таблицы.`
        })
    },
    {
        id: 'lua.runtime.badArgument',
        test: /bad argument #(\d+) to '([^']+)'(?: \((.*)\))?/,
        build: (m, { line }) => {
            const detail = m[3] || '';
            const typed = detail.match(/(\w+) expected, got (\w+|no value)/);
            const reason = typed
                ? `ожидается ${typeName(typed[1])}, а передано ${typed[2] === 'no value' ? 'ничего' : typeName(typed[2])}`
                : detail || 'передан неподходящий аргумент';
            return {
                title: `Неверный аргумент у ${m[2]}`,
                message: `${atLine(line)} в ${code(`${m[2]}(...)`)} аргумент №${m[1]}: ${reason}. Проверьте порядок и количество значений в скобках.`,
                hint: 'Частая причина — переменная с этим значением ещё пустая (nil) или написана с опечаткой.'
            };
        }
    },
    {
        id: 'lua.runtime.forLoop',
        test: /'for' (initial value|limit|step) must be a number/,
        build: (m, { line }) => {
            const part = m[1] === 'initial value' ? 'начало' : m[1] === 'limit' ? 'конец' : 'шаг';
            return {
                title: 'В цикле for нужно число',
                message: `${atLine(line)} ${part} счётчика ${code('for')} не число. Проверьте значения в заголовке цикла.`,
                example: 'for i = 1, 5 do\n    print(i)\nend'
            };
        }
    },
    {
        id: 'lua.runtime.divideByZero',
        test: /attempt to perform 'n(?:\/\/|%%?)0'/,
        build: (_m, { line }) => ({
            title: 'Деление на ноль',
            message: `${atLine(line)} число делится на ноль. Проверьте делитель перед делением.`
        })
    },
    {
        id: 'lua.runtime.noIntegerRepresentation',
        test: /number has no integer representation/,
        build: (_m, { line }) => ({
            title: 'Нужно целое число',
            message: `${atLine(line)} там, где ждут целое число, передано дробное. Округлите его через ${code('math.floor(...)')}.`
        })
    }
];

function lookup(entries: DictionaryEntry[], raw: string, context: ExplainContext): ErrorExplanation | null {
    const { line: parsedLine, body } = parseLuaMessage(raw);
    const line = parsedLine ?? (typeof context.line === 'number' ? context.line : null);
    const haystacks = [body, String(raw || '')];
    for (const entry of entries) {
        for (const haystack of haystacks) {
            const match = haystack.match(entry.test);
            if (match) {
                const built = entry.build(match, { line, raw: haystack });
                return { id: entry.id, line, ...built };
            }
        }
    }
    return null;
}

export function explainLuaSyntaxError(raw: string, context: ExplainContext = {}): ErrorExplanation | null {
    return lookup(SYNTAX_ENTRIES, raw, context);
}

export function explainLuaRuntimeError(raw: string, context: ExplainContext = {}): ErrorExplanation | null {
    return lookup(RUNTIME_ENTRIES, raw, context);
}

export function explainLuaError(kind: 'syntax' | 'runtime', raw: string, context: ExplainContext = {}): ErrorExplanation | null {
    return kind === 'syntax' ? explainLuaSyntaxError(raw, context) : explainLuaRuntimeError(raw, context);
}

export const luaDictionaryIds = {
    syntax: SYNTAX_ENTRIES.map((entry) => entry.id),
    runtime: RUNTIME_ENTRIES.map((entry) => entry.id)
};

// Exposed for tests of the small parsers.
export const __luaParsers = { parseVariableHint, parseNear };
