import type { CompletionDocEntry } from './types.js';

/*
 * Templates and keywords for the editor's completion. A template is a whole construct with the places to fill in
 * (Tab moves between them), so a student types "for" and gets a working loop instead of remembering its shape.
 * The Russian words in `aliases` are what a student may type instead of the English keyword.
 */

function template(label: string, insertText: string, documentation: string, aliases: string[], detail: string, example?: string): CompletionDocEntry {
    return {
        label,
        kind: 'Snippet',
        insertText,
        documentation,
        detail,
        filterText: [label, ...aliases].join(' '),
        sortText: `3_${label}`,
        example
    };
}

function keyword(label: string, documentation: string, aliases: string[] = []): CompletionDocEntry {
    return {
        label,
        kind: 'Keyword',
        insertText: label,
        documentation,
        filterText: [label, ...aliases].join(' '),
        sortText: `5_${label}`
    };
}

export const LUA_SNIPPETS: CompletionDocEntry[] = [
    template('if', 'if ${1:условие} then\n\t$0\nend', 'Выполнить блок, только если условие верно.', ['если', 'условие'], 'if … then … end'),
    template('ifelse', 'if ${1:условие} then\n\t${2}\nelse\n\t$0\nend', 'Если условие верно, выполнится первый блок, иначе второй.', ['если иначе', 'условие', 'else'], 'if … else … end'),
    template('for', 'for ${1:i} = ${2:1}, ${3:10} do\n\t$0\nend', 'Повторить блок несколько раз: i пробегает числа от первого до последнего.', ['цикл', 'повторить', 'счётчик', 'раз'], 'for i = 1, 10 do … end', 'for i = 1, 4 do\n  print(i)\nend'),
    template('for-pairs', 'for ${1:ключ}, ${2:значение} in pairs(${3:таблица}) do\n\t$0\nend', 'Перебрать все пары «ключ — значение» таблицы.', ['цикл по таблице', 'перебор'], 'for k, v in pairs(t) do … end'),
    template('for-ipairs', 'for ${1:i}, ${2:элемент} in ipairs(${3:список}) do\n\t$0\nend', 'Перебрать элементы списка по порядку.', ['цикл по списку', 'перебор списка'], 'for i, x in ipairs(list) do … end'),
    template('while', 'while ${1:условие} do\n\t$0\n\tsleep(${2:0.1})\nend', 'Повторять, пока условие верно. Внутри цикла нужна пауза sleep, иначе дрон не успеет лететь.', ['пока', 'цикл'], 'while … do … end'),
    template('repeat', 'repeat\n\t$0\nuntil ${1:условие}', 'Повторять, пока условие не станет верным. Тело выполнится хотя бы раз.', ['повторять', 'до тех пор'], 'repeat … until …'),
    template('function', 'function ${1:имя}(${2})\n\t$0\nend', 'Своя функция: набор команд под одним именем. Вызывается как имя().', ['функция', 'процедура', 'своя команда'], 'function имя(параметры) … end'),
    template('local', 'local ${1:имя} = ${2:значение}', 'Новая переменная: имя, под которым хранится значение.', ['переменная', 'создать', 'запомнить'], 'local имя = значение'),
    template(
        'callback',
        'function callback(event)\n\tif event == Ev.${1:POINT_REACHED} then\n\t\t$0\n\tend\nend',
        'Функция, которую автопилот вызывает, когда что-то произошло: дрон взлетел, долетел до точки и так далее.',
        ['событие', 'обратный вызов', 'обработчик', 'реакция'],
        'function callback(event) … end'
    ),
    template(
        'шаблон: взлёт',
        'ap.push(Ev.MCE_PREFLIGHT)\nTimer.callLater(${1:2}, function()\n\tap.push(Ev.MCE_TAKEOFF)\n\t$0\nend)',
        'Подготовка к полёту, а через пару секунд взлёт.',
        ['takeoff', 'старт', 'взлет', 'начало программы'],
        'подготовка и взлёт'
    ),
    template(
        'шаблон: полёт в точку',
        'ap.goToLocalPoint(${1:1}, ${2:0}, ${3:1})\n$0',
        'Лететь в точку (x, y, z) в метрах от места взлёта.',
        ['точка', 'лететь', 'go to point'],
        'ap.goToLocalPoint(x, y, z)'
    )
];

export const LUA_KEYWORDS: CompletionDocEntry[] = [
    keyword('end', 'Закрывает блок: if, for, while или function.', ['конец']),
    keyword('then', 'Начало блока после условия if.'),
    keyword('do', 'Начало блока цикла for или while.'),
    keyword('else', 'Блок, который выполнится, если условие не верно.', ['иначе']),
    keyword('elseif', 'Ещё одно условие после if.', ['иначе если']),
    keyword('return', 'Вернуть значение из функции и выйти из неё.', ['вернуть']),
    keyword('break', 'Выйти из цикла.', ['прервать', 'выйти']),
    keyword('true', 'Логическое «да».', ['истина', 'да']),
    keyword('false', 'Логическое «нет».', ['ложь', 'нет']),
    keyword('nil', 'Пустое значение: «ничего».', ['пусто', 'ничего']),
    keyword('and', 'Оба условия верны.', ['и']),
    keyword('or', 'Хотя бы одно условие верно.', ['или']),
    keyword('not', 'Наоборот: «не».', ['не'])
];

export const PYTHON_SNIPPETS: CompletionDocEntry[] = [
    template('for', 'for ${1:i} in range(${2:5}):\n\t$0', 'Повторить блок несколько раз: i пробегает числа от 0 до последнего.', ['цикл', 'повторить', 'счётчик', 'раз'], 'for i in range(5): …', 'for i in range(4):\n    print(i)'),
    template('if', 'if ${1:условие}:\n\t$0', 'Выполнить блок, только если условие верно.', ['если', 'условие'], 'if условие: …'),
    template('ifelse', 'if ${1:условие}:\n\t${2:pass}\nelse:\n\t$0', 'Если условие верно, выполнится первый блок, иначе второй.', ['если иначе', 'условие', 'else'], 'if … else …'),
    template('while', 'while ${1:условие}:\n\t$0\n\ttime.sleep(${2:0.1})', 'Повторять, пока условие верно. Внутри нужна пауза, иначе цикл займёт всю программу.', ['пока', 'цикл'], 'while условие: …'),
    template('def', 'def ${1:имя}(${2}):\n\t$0', 'Своя функция: набор команд под одним именем. Вызывается как имя().', ['функция', 'процедура', 'своя команда'], 'def имя(параметры): …'),
    template('try', 'try:\n\t$0\nexcept ${1:Exception} as ${2:error}:\n\tprint(${2:error})', 'Попробовать выполнить блок и обработать ошибку, не останавливая программу.', ['ошибка', 'перехват', 'исключение'], 'try … except …'),
    template(
        'import-pioneer',
        'from pioneer_sdk import Pioneer\nimport time\n\npioneer = Pioneer()\n$0',
        'Подключение к дрону: это нужно в начале программы на Python.',
        ['импорт', 'подключение', 'начало программы', 'pioneer_sdk'],
        'from pioneer_sdk import Pioneer'
    ),
    template(
        'шаблон: взлёт и посадка',
        'pioneer.arm()\npioneer.takeoff()\ntime.sleep(${1:3})\npioneer.land()\n$0',
        'Запустить моторы, взлететь, повисеть несколько секунд и приземлиться.',
        ['takeoff', 'старт', 'взлет', 'посадка'],
        'arm, takeoff, land'
    )
];

export const PYTHON_KEYWORDS: CompletionDocEntry[] = [
    keyword('import', 'Подключить библиотеку.', ['импорт', 'подключить']),
    keyword('from', 'Взять из библиотеки нужное: from библиотека import имя.'),
    keyword('return', 'Вернуть значение из функции и выйти из неё.', ['вернуть']),
    keyword('break', 'Выйти из цикла.', ['прервать', 'выйти']),
    keyword('continue', 'Перейти к следующему шагу цикла.', ['пропустить']),
    keyword('elif', 'Ещё одно условие после if.', ['иначе если']),
    keyword('else', 'Блок, который выполнится, если условие не верно.', ['иначе']),
    keyword('True', 'Логическое «да».', ['истина', 'да']),
    keyword('False', 'Логическое «нет».', ['ложь', 'нет']),
    keyword('None', 'Пустое значение: «ничего».', ['пусто', 'ничего']),
    keyword('and', 'Оба условия верны.', ['и']),
    keyword('or', 'Хотя бы одно условие верно.', ['или']),
    keyword('not', 'Наоборот: «не».', ['не']),
    keyword('pass', 'Ничего не делать (заглушка для пустого блока).', ['пропуск', 'заглушка'])
];
