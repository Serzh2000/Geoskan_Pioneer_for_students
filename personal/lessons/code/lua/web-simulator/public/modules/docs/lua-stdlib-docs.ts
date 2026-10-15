import type { ApiDoc } from './api-docs-types.js';

/*
 * The parts of the standard Lua library that a learner reaches for first. They feed the editor's completion,
 * signature help and hover only; the "Справочник API" drawer keeps listing just the Pioneer API.
 * Descriptions are written for a student: what it does, in plain words, then the exact form.
 */
export const luaStdlibDocs: Record<string, ApiDoc> = {
    print: {
        desc: 'Печатает значения в бортжурнал. Удобно, чтобы проверить, что видит программа.',
        syntax: 'print(значение, ...)',
        params: 'любое число значений через запятую',
        returns: 'ничего',
        example: 'print("высота", Sensors.altitude())',
        kind: 'Function',
        insertText: 'print(${1:значение})',
        aliases: ['вывод', 'напечатать', 'показать', 'журнал', 'отладка']
    },
    tostring: {
        desc: 'Превращает значение в текст.',
        syntax: 'tostring(значение)',
        params: 'значение: число, логическое или другое',
        returns: 'строка',
        example: 'print("шаг " .. tostring(5))',
        kind: 'Function',
        insertText: 'tostring(${1:значение})',
        aliases: ['в текст', 'в строку']
    },
    tonumber: {
        desc: 'Превращает текст в число. Если это не число, возвращает nil.',
        syntax: 'tonumber(текст)',
        params: 'текст, например "12.5"',
        returns: 'число или nil',
        example: 'local x = tonumber("12.5")',
        kind: 'Function',
        insertText: 'tonumber(${1:текст})',
        aliases: ['в число']
    },
    type: {
        desc: 'Сообщает, какого типа значение: "number", "string", "table", "function", "nil", "boolean".',
        syntax: 'type(значение)',
        params: 'любое значение',
        returns: 'название типа (строка)',
        example: 'print(type(5)) -- number',
        kind: 'Function',
        insertText: 'type(${1:значение})',
        aliases: ['тип']
    },
    pairs: {
        desc: 'Перебирает все пары «ключ — значение» таблицы. Используется в цикле for.',
        syntax: 'pairs(таблица)',
        params: 'таблица',
        returns: 'итератор для цикла',
        example: 'for key, value in pairs(point) do print(key, value) end',
        kind: 'Function',
        insertText: 'pairs(${1:таблица})',
        aliases: ['перебор', 'цикл по таблице']
    },
    ipairs: {
        desc: 'Перебирает элементы списка по порядку: 1, 2, 3 и так далее.',
        syntax: 'ipairs(список)',
        params: 'таблица-список',
        returns: 'итератор для цикла',
        example: 'for i, p in ipairs(points) do print(i, p.x) end',
        kind: 'Function',
        insertText: 'ipairs(${1:список})',
        aliases: ['перебор списка', 'цикл по списку']
    },
    'math.pi': {
        desc: 'Число пи (3.14159…). Нужно для кругов и углов в радианах.',
        syntax: 'math.pi',
        returns: 'число',
        example: 'local half_turn = math.pi',
        kind: 'Constant',
        insertText: 'pi',
        aliases: ['пи', 'окружность', 'полоборота']
    },
    'math.sin': {
        desc: 'Синус угла. Угол задаётся в радианах.',
        syntax: 'math.sin(угол)',
        params: 'угол в радианах',
        returns: 'число от -1 до 1',
        example: 'local y = radius * math.sin(angle)',
        kind: 'Method',
        insertText: 'sin(${1:угол})',
        aliases: ['синус', 'тригонометрия', 'круг']
    },
    'math.cos': {
        desc: 'Косинус угла. Угол задаётся в радианах.',
        syntax: 'math.cos(угол)',
        params: 'угол в радианах',
        returns: 'число от -1 до 1',
        example: 'local x = radius * math.cos(angle)',
        kind: 'Method',
        insertText: 'cos(${1:угол})',
        aliases: ['косинус', 'тригонометрия', 'круг']
    },
    'math.tan': {
        desc: 'Тангенс угла. Угол задаётся в радианах.',
        syntax: 'math.tan(угол)',
        params: 'угол в радианах',
        returns: 'число',
        example: 'local k = math.tan(angle)',
        kind: 'Method',
        insertText: 'tan(${1:угол})',
        aliases: ['тангенс']
    },
    'math.atan': {
        desc: 'Угол по двум сторонам: куда смотреть, если цель смещена на x и y. Результат в радианах.',
        syntax: 'math.atan(y, x)',
        params: 'y и x: смещение цели по осям',
        returns: 'угол в радианах',
        example: 'local yaw = math.atan(dy, dx)',
        kind: 'Method',
        insertText: 'atan(${1:y}, ${2:x})',
        aliases: ['арктангенс', 'направление', 'курс на точку']
    },
    'math.sqrt': {
        desc: 'Квадратный корень. Пригодится для расстояния между точками.',
        syntax: 'math.sqrt(число)',
        params: 'число, не меньше нуля',
        returns: 'число',
        example: 'local d = math.sqrt(dx * dx + dy * dy)',
        kind: 'Method',
        insertText: 'sqrt(${1:число})',
        aliases: ['корень', 'расстояние']
    },
    'math.abs': {
        desc: 'Модуль числа: отбрасывает минус.',
        syntax: 'math.abs(число)',
        params: 'число',
        returns: 'число без знака минус',
        example: 'print(math.abs(-3)) -- 3',
        kind: 'Method',
        insertText: 'abs(${1:число})',
        aliases: ['модуль', 'без минуса']
    },
    'math.floor': {
        desc: 'Округляет число вниз до целого.',
        syntax: 'math.floor(число)',
        params: 'число',
        returns: 'целое число',
        example: 'print(math.floor(2.9)) -- 2',
        kind: 'Method',
        insertText: 'floor(${1:число})',
        aliases: ['округлить вниз', 'целая часть']
    },
    'math.ceil': {
        desc: 'Округляет число вверх до целого.',
        syntax: 'math.ceil(число)',
        params: 'число',
        returns: 'целое число',
        example: 'print(math.ceil(2.1)) -- 3',
        kind: 'Method',
        insertText: 'ceil(${1:число})',
        aliases: ['округлить вверх']
    },
    'math.max': {
        desc: 'Самое большое из чисел.',
        syntax: 'math.max(a, b, ...)',
        params: 'два и более числа',
        returns: 'число',
        example: 'local h = math.max(0.5, altitude)',
        kind: 'Method',
        insertText: 'max(${1:a}, ${2:b})',
        aliases: ['максимум', 'больше']
    },
    'math.min': {
        desc: 'Самое маленькое из чисел.',
        syntax: 'math.min(a, b, ...)',
        params: 'два и более числа',
        returns: 'число',
        example: 'local h = math.min(2, altitude)',
        kind: 'Method',
        insertText: 'min(${1:a}, ${2:b})',
        aliases: ['минимум', 'меньше']
    },
    'math.rad': {
        desc: 'Переводит градусы в радианы. Функции вроде math.sin и ap.updateYaw работают в радианах.',
        syntax: 'math.rad(градусы)',
        params: 'угол в градусах',
        returns: 'угол в радианах',
        example: 'ap.updateYaw(math.rad(90))',
        kind: 'Method',
        insertText: 'rad(${1:градусы})',
        aliases: ['градусы в радианы', 'перевести угол']
    },
    'math.deg': {
        desc: 'Переводит радианы в градусы.',
        syntax: 'math.deg(радианы)',
        params: 'угол в радианах',
        returns: 'угол в градусах',
        example: 'print(math.deg(math.pi)) -- 180',
        kind: 'Method',
        insertText: 'deg(${1:радианы})',
        aliases: ['радианы в градусы']
    },
    'math.random': {
        desc: 'Случайное число. Без аргументов от 0 до 1, с двумя целое в заданных границах.',
        syntax: 'math.random([от, до])',
        params: 'от и до (необязательно)',
        returns: 'число',
        example: 'local pause = math.random(1, 3)',
        kind: 'Method',
        insertText: 'random(${1:от}, ${2:до})',
        aliases: ['случайное', 'рандом', 'жребий']
    },
    'string.format': {
        desc: 'Собирает текст по образцу: %d для целого, %.2f для дробного с двумя знаками, %s для текста.',
        syntax: 'string.format(образец, значения...)',
        params: 'образец и значения, которые подставятся',
        returns: 'строка',
        example: 'print(string.format("высота %.2f м", h))',
        kind: 'Method',
        insertText: 'format(${1:"%.2f"}, ${2:значение})',
        aliases: ['форматирование', 'собрать текст', 'знаки после запятой']
    },
    'string.len': {
        desc: 'Длина текста: сколько в нём символов.',
        syntax: 'string.len(текст)',
        params: 'текст',
        returns: 'число',
        example: 'print(string.len("привет"))',
        kind: 'Method',
        insertText: 'len(${1:текст})',
        aliases: ['длина текста']
    },
    'table.insert': {
        desc: 'Добавляет элемент в конец списка (или в указанное место).',
        syntax: 'table.insert(список, [позиция,] значение)',
        params: 'список, значение',
        returns: 'ничего',
        example: 'table.insert(points, {x = 1, y = 2})',
        kind: 'Method',
        insertText: 'insert(${1:список}, ${2:значение})',
        aliases: ['добавить в список', 'добавить элемент']
    },
    'table.remove': {
        desc: 'Удаляет элемент из списка и возвращает его. Без позиции удаляет последний.',
        syntax: 'table.remove(список, [позиция])',
        params: 'список, позиция (необязательно)',
        returns: 'удалённое значение',
        example: 'local last = table.remove(points)',
        kind: 'Method',
        insertText: 'remove(${1:список})',
        aliases: ['удалить из списка', 'убрать элемент']
    },
    'table.unpack': {
        desc: 'Раскладывает список на отдельные значения. Например, цвет {r, g, b} на три числа.',
        syntax: 'table.unpack(список)',
        params: 'список',
        returns: 'значения списка по порядку',
        example: 'leds:set(0, table.unpack({1, 0, 0}))',
        kind: 'Method',
        insertText: 'unpack(${1:список})',
        aliases: ['распаковать', 'раскрыть список']
    }
};
