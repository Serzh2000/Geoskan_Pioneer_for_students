import type { ApiDoc } from './api-docs-types.js';

/*
 * The parts of Python that a learner reaches for first, for the editor's completion, signature help and hover.
 * The Pioneer SDK keeps its own table (python-api-docs.ts).
 */
export const pythonStdlibDocs: Record<string, ApiDoc> = {
    print: {
        desc: 'Печатает значения в бортжурнал. Удобно, чтобы проверить, что видит программа.',
        syntax: 'print(значение, ...)',
        params: 'любое число значений через запятую',
        returns: 'ничего',
        example: 'print("высота", pioneer.get_dist_sensor_data())',
        kind: 'Function',
        insertText: 'print(${1:значение})',
        aliases: ['вывод', 'напечатать', 'показать', 'журнал', 'отладка']
    },
    range: {
        desc: 'Числа подряд для цикла for: range(5) даёт 0, 1, 2, 3, 4.',
        syntax: 'range([от,] до[, шаг])',
        params: 'до (не включая), от и шаг — необязательно',
        returns: 'последовательность чисел',
        example: 'for i in range(4):\n    print(i)',
        kind: 'Function',
        insertText: 'range(${1:5})',
        aliases: ['повторить', 'цикл', 'раз']
    },
    len: {
        desc: 'Длина списка или текста: сколько в нём элементов.',
        syntax: 'len(список_или_текст)',
        params: 'список или строка',
        returns: 'число',
        example: 'print(len(points))',
        kind: 'Function',
        insertText: 'len(${1:список})',
        aliases: ['длина', 'сколько элементов']
    },
    int: {
        desc: 'Превращает значение в целое число. Дробную часть отбрасывает.',
        syntax: 'int(значение)',
        params: 'число или текст',
        returns: 'целое число',
        example: 'n = int("12")',
        kind: 'Function',
        insertText: 'int(${1:значение})',
        aliases: ['в целое', 'целое число']
    },
    float: {
        desc: 'Превращает значение в дробное число.',
        syntax: 'float(значение)',
        params: 'число или текст',
        returns: 'дробное число',
        example: 'x = float("1.5")',
        kind: 'Function',
        insertText: 'float(${1:значение})',
        aliases: ['в дробное', 'вещественное']
    },
    str: {
        desc: 'Превращает значение в текст.',
        syntax: 'str(значение)',
        params: 'любое значение',
        returns: 'строка',
        example: 'print("шаг " + str(5))',
        kind: 'Function',
        insertText: 'str(${1:значение})',
        aliases: ['в текст', 'в строку']
    },
    round: {
        desc: 'Округляет число до нужного количества знаков после запятой.',
        syntax: 'round(число[, знаков])',
        params: 'число, знаков (необязательно)',
        returns: 'число',
        example: 'print(round(2.567, 1)) # 2.6',
        kind: 'Function',
        insertText: 'round(${1:число}, ${2:2})',
        aliases: ['округлить']
    },
    abs: {
        desc: 'Модуль числа: отбрасывает минус.',
        syntax: 'abs(число)',
        params: 'число',
        returns: 'число без знака минус',
        example: 'print(abs(-3)) # 3',
        kind: 'Function',
        insertText: 'abs(${1:число})',
        aliases: ['модуль', 'без минуса']
    },
    max: {
        desc: 'Самое большое из значений.',
        syntax: 'max(a, b, ...)',
        params: 'два и более значения или список',
        returns: 'значение',
        example: 'h = max(0.5, altitude)',
        kind: 'Function',
        insertText: 'max(${1:a}, ${2:b})',
        aliases: ['максимум', 'больше']
    },
    min: {
        desc: 'Самое маленькое из значений.',
        syntax: 'min(a, b, ...)',
        params: 'два и более значения или список',
        returns: 'значение',
        example: 'h = min(2, altitude)',
        kind: 'Function',
        insertText: 'min(${1:a}, ${2:b})',
        aliases: ['минимум', 'меньше']
    },
    'time.sleep': {
        desc: 'Ждёт указанное число секунд. Программа в это время стоит на месте, а дрон продолжает лететь.',
        syntax: 'time.sleep(секунды)',
        params: 'секунды, можно дробные',
        returns: 'ничего',
        example: 'time.sleep(2)',
        kind: 'Method',
        insertText: 'sleep(${1:1})',
        aliases: ['пауза', 'подождать', 'ждать', 'задержка']
    },
    'math.pi': {
        desc: 'Число пи (3.14159…). Нужно для кругов и углов в радианах.',
        syntax: 'math.pi',
        returns: 'число',
        example: 'half_turn = math.pi',
        kind: 'Constant',
        insertText: 'pi',
        aliases: ['пи', 'окружность']
    },
    'math.sin': {
        desc: 'Синус угла. Угол задаётся в радианах.',
        syntax: 'math.sin(угол)',
        params: 'угол в радианах',
        returns: 'число от -1 до 1',
        example: 'y = radius * math.sin(angle)',
        kind: 'Method',
        insertText: 'sin(${1:угол})',
        aliases: ['синус', 'тригонометрия', 'круг']
    },
    'math.cos': {
        desc: 'Косинус угла. Угол задаётся в радианах.',
        syntax: 'math.cos(угол)',
        params: 'угол в радианах',
        returns: 'число от -1 до 1',
        example: 'x = radius * math.cos(angle)',
        kind: 'Method',
        insertText: 'cos(${1:угол})',
        aliases: ['косинус', 'тригонометрия', 'круг']
    },
    'math.sqrt': {
        desc: 'Квадратный корень. Пригодится для расстояния между точками.',
        syntax: 'math.sqrt(число)',
        params: 'число, не меньше нуля',
        returns: 'число',
        example: 'd = math.sqrt(dx * dx + dy * dy)',
        kind: 'Method',
        insertText: 'sqrt(${1:число})',
        aliases: ['корень', 'расстояние']
    },
    'math.radians': {
        desc: 'Переводит градусы в радианы.',
        syntax: 'math.radians(градусы)',
        params: 'угол в градусах',
        returns: 'угол в радианах',
        example: 'yaw = math.radians(90)',
        kind: 'Method',
        insertText: 'radians(${1:градусы})',
        aliases: ['градусы в радианы', 'перевести угол']
    }
};
