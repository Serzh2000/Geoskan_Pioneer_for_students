import type { ChapterExamples } from '../example.js';

/** Examples of the chapter «Маленькие программы», by lesson number. */
export const CODE_EXAMPLES: ChapterExamples = {
    19: {
        theory: [
            'Переменная — это имя, под которым программа хранит значение. Запись `local green = 0.6` в Lua (в Python просто `green = 150`) означает: «запомни число и назови его green».',
            'Дальше имя пишется вместо числа: `leds:set(led_index, 0, green, 0)`. Кавычек вокруг имени нет: в кавычках это был бы уже текст, а не число. Одно и то же имя можно использовать сколько угодно раз.',
            'Польза в том, что значение меняется в одном месте. Поправьте число в верхней строке, и свет изменится, а строку с командой трогать не нужно. Имена выбирайте по смыслу: `green`, `led_index`, а не `a` и `b`.'
        ],
        lua: `local leds = Ledbar.new(29)

local led_index = 3
local green = 0.6
leds:set(led_index, 0, green, 0)

function callback(event)
end
`,
        python: `from pioneer_sdk import Pioneer

pioneer = Pioneer(simulator=True)

led_index = 3
green = 150
pioneer.led_control(led_index, 0, green, 0)
`,
        steps: [
            { lua: 'local led_index = 3', python: 'led_index = 3', text: 'Первая переменная хранит номер светодиода. Теперь число 3 имеет понятное имя.' },
            { lua: 'local green = 0.6', python: 'green = 150', text: 'Вторая переменная хранит яркость зелёного канала: чуть больше половины диапазона.' },
            { lua: 'leds:set(led_index, 0, green, 0)', python: 'pioneer.led_control(led_index, 0, green, 0)', text: 'В команде вместо чисел стоят имена без кавычек. Программа подставит значения, которые в них хранятся.' }
        ],
        watch: 'Светодиод 3 загорается зелёным средней яркости, остальные светодиоды остаются выключенными.'
    },
    20: {
        theory: [
            'Числа и текст в программе разные. Число (`0.5`) можно складывать и умножать. Строка — это текст в кавычках (`"Пионер"`), её выводят в журнал и склеивают с другим текстом.',
            'Число в журнале без подписи ничего не объясняет: «0.5» чего? Поэтому рядом с числом пишут подпись и единицы: `"скорость, м/с: "`. В Lua строки и числа склеивает `..`, а в Python число можно передать в `print` через запятую.',
            'Число из переменной можно и посчитать, и напечатать: `speed * 2` даёт новое число. Подписанные значения потом легко читать в журнале и сравнивать между запусками.'
        ],
        lua: `local leds = Ledbar.new(29)

local speed = 0.5
local name = "Пионер"
print(name)
print("скорость, м/с: " .. speed)
print("вдвое быстрее, м/с: " .. speed * 2)

function callback(event)
end
`,
        python: `from pioneer_sdk import Pioneer

pioneer = Pioneer(simulator=True)

speed = 0.5
name = "Пионер"
print(name)
print("скорость, м/с:", speed)
print("вдвое быстрее, м/с:", speed * 2)
`,
        steps: [
            { lua: 'local name = "Пионер"', python: 'name = "Пионер"', text: 'Строка в кавычках: это текст, с ним не считают, его только выводят и склеивают.' },
            { lua: 'print("скорость, м/с: " .. speed)', python: 'print("скорость, м/с:", speed)', text: 'Число выводится вместе с подписью и единицами измерения, чтобы запись в журнале была понятной.' },
            { lua: 'print("вдвое быстрее, м/с: " .. speed * 2)', python: 'print("вдвое быстрее, м/с:", speed * 2)', text: 'Число из переменной участвует в вычислении, а результат выводится с новой подписью.' }
        ],
        watch: 'В журнале три строки: имя, скорость 0.5 и удвоенная скорость 1.0 с подписями; дрон остаётся на месте.'
    },
    21: {
        theory: [
            'Выражение — это запись, из которой программа вычисляет новое значение: `maximum * 3 / 4`. Здесь `*` умножает, `/` делит, а результат можно сразу сохранить в переменную.',
            'Так удобно получать настройки от одного базового числа. Если максимальная яркость хранится в `maximum`, то три четверти яркости — это `maximum * 3 / 4`, и вручную считать не нужно.',
            'Перед запуском вычислите ответ в голове. Для Lua `1 * 3 / 4` даёт `0.75`, для Python `255 * 3 / 4` даёт `191.25`. Если результат на экране не совпал с вашим, ищите ошибку в записи выражения.'
        ],
        lua: `local leds = Ledbar.new(29)

local maximum = 1
local brightness = maximum * 3 / 4
print(brightness)
leds:set(2, 0, 0, brightness)

function callback(event)
end
`,
        python: `from pioneer_sdk import Pioneer

pioneer = Pioneer(simulator=True)

maximum = 255
brightness = maximum * 3 / 4
print(brightness)
pioneer.led_control(2, 0, 0, brightness)
`,
        steps: [
            { lua: 'local brightness = maximum * 3 / 4', python: 'brightness = maximum * 3 / 4', text: 'Выражение умножает максимум на 3 и делит на 4. Результат сохраняется в переменную brightness.' },
            { lua: 'print(brightness)', python: 'print(brightness)', text: 'Вычисленное число выводится в журнал, чтобы сравнить его с ответом, посчитанным вручную.' },
            { lua: 'leds:set(2, 0, 0, brightness)', python: 'pioneer.led_control(2, 0, 0, brightness)', text: 'Значение выражения становится синим каналом светодиода 2.' }
        ],
        watch: 'Светодиод 2 горит синим, довольно ярко, но не на максимум; в журнале число 0.75 (в Python 191.25).'
    },
    22: {
        theory: [
            'Ветвление позволяет программе выбрать одно из двух действий. После `if` стоит условие: если оно истинно, выполняется первая ветка, иначе — ветка после `else`. За один раз выполняется только одна ветка.',
            'Условием может быть просто переменная-флаг: `true` или `false` в Lua, `True` или `False` в Python. Lua закрывает всё ветвление словом `end`, а Python отличает ветки по отступам и двоеточию.',
            'Каждая ветка должна давать заметный результат, иначе непонятно, какая из них сработала. Поэтому проверяйте программу дважды: сначала с одним значением флага, потом с другим.'
        ],
        lua: `local leds = Ledbar.new(29)

local armed = true
if armed then
    leds:set(1, 0, 0, 1)
    print("двигатели готовы")
else
    leds:set(1, 1, 1, 0)
    print("двигатели не готовы")
end

function callback(event)
end
`,
        python: `from pioneer_sdk import Pioneer

pioneer = Pioneer(simulator=True)

armed = True
if armed:
    pioneer.led_control(1, 0, 0, 255)
    print("двигатели готовы")
else:
    pioneer.led_control(1, 255, 255, 0)
    print("двигатели не готовы")
`,
        steps: [
            { lua: 'local armed = true', python: 'armed = True', text: 'Флаг хранит ответ «да» или «нет». От него зависит, какая ветка выполнится.' },
            { lua: 'if armed then\n    leds:set(1, 0, 0, 1)\n    print("двигатели готовы")', python: 'if armed:\n    pioneer.led_control(1, 0, 0, 255)\n    print("двигатели готовы")', text: 'Первая ветка работает, когда флаг истинен: светодиод 1 становится синим и в журнал идёт сообщение.' },
            { lua: 'else\n    leds:set(1, 1, 1, 0)\n    print("двигатели не готовы")\nend', python: 'else:\n    pioneer.led_control(1, 255, 255, 0)\n    print("двигатели не готовы")', text: 'Ветка else работает при ложном флаге: светодиод 1 жёлтый. Поменяйте флаг и убедитесь, что выбор изменился.' }
        ],
        watch: 'Светодиод 1 загорается синим и в журнале «двигатели готовы»; если поменять флаг на ложный, будет жёлтый.'
    },
    23: {
        theory: [
            'Сравнение отвечает «да» или «нет». Знаки `<`, `>`, `<=`, `>=` проверяют, больше или меньше число, а `==` проверяет равенство. Результат сравнения подставляют в `if`.',
            'Самое важное — граница. Строгое `<` не включает само число: условие `distance < 5` для `distance = 5` ложно, а `distance <= 5` истинно. Одна лишняя черта меняет поведение ровно на границе.',
            'Поэтому проверяйте три случая: ниже границы, на границе и выше. И печатайте проверяемое число в журнал: по строке вроде `d:5` потом видно, какой цвет к какому значению относится.'
        ],
        lua: `local leds = Ledbar.new(29)

local distance = 5
print("d:" .. distance)
if distance < 5 then
    leds:set(1, 1, 0, 0)
else
    leds:set(1, 0, 1, 0)
end

function callback(event)
end
`,
        python: `from pioneer_sdk import Pioneer

pioneer = Pioneer(simulator=True)

distance = 5
print("d:" + str(distance))
if distance < 5:
    pioneer.led_control(1, 255, 0, 0)
else:
    pioneer.led_control(1, 0, 255, 0)
`,
        steps: [
            { lua: 'print("d:" .. distance)', python: 'print("d:" + str(distance))', text: 'Проверяемое число выводится в журнал: так видно, при каком значении получен цвет.' },
            { lua: 'if distance < 5 then', python: 'if distance < 5:', text: 'Строгое «меньше»: для значения ровно 5 условие ложно, потому что граница в него не входит.' },
            { lua: 'else\n    leds:set(1, 0, 1, 0)', python: 'else:\n    pioneer.led_control(1, 0, 255, 0)', text: 'На границе сработает else, поэтому светодиод зелёный. Замените `<` на `<=`, и на границе будет красный.' }
        ],
        watch: 'В журнале «d:5», светодиод 1 горит зелёным, потому что 5 не меньше 5; со знаком <= он был бы красным.'
    },
    24: {
        theory: [
            'Цикл повторяет одни и те же действия несколько раз, и не нужно писать строку четыре раза подряд. Переменная цикла (`index`) на каждом повторе получает следующее число.',
            'В Lua `for index = 0, 3 do` перебирает числа от 0 до 3 включительно: это четыре повтора. В Python `for index in range(4)` тоже даёт четыре повтора: 0, 1, 2, 3, но число в скобках само не выдаётся.',
            'Прежде чем запускать, ответьте себе на два вопроса: с какого числа цикл начинается и сколько раз он повторится. Номер повтора удобно сразу использовать как номер светодиода.'
        ],
        lua: `local leds = Ledbar.new(29)

for index = 0, 3 do
    leds:set(index, 0, 0, 1)
    print(index)
end

function callback(event)
end
`,
        python: `from pioneer_sdk import Pioneer

pioneer = Pioneer(simulator=True)

for index in range(4):
    pioneer.led_control(index, 0, 0, 255)
    print(index)
`,
        steps: [
            { lua: 'for index = 0, 3 do', python: 'for index in range(4):', text: 'Заголовок цикла: index получит значения 0, 1, 2, 3. Всего четыре повтора.' },
            { lua: 'leds:set(index, 0, 0, 1)', python: 'pioneer.led_control(index, 0, 0, 255)', text: 'Номер повтора служит номером светодиода, поэтому каждый повтор включает следующий светодиод синим.' },
            { lua: 'print(index)', python: 'print(index)', text: 'В журнал выводится номер повтора. Четыре строки: 0, 1, 2, 3.' }
        ],
        watch: 'Четыре светодиода с номерами 0-3 загораются синим, а в журнале четыре строки: 0, 1, 2, 3.'
    },
    25: {
        theory: [
            'Функция — это несколько действий под одним именем. Вы описываете её один раз, а потом запускаете, просто написав имя со скобками: `yellow_signal()`.',
            'Важно различать описание и вызов. Само описание ничего не выполняет, оно только запоминает, что делать. Пока вы не вызвали функцию, светодиод не изменится и сообщение не появится.',
            'В Lua тело функции заканчивается словом `end`, в Python тело отмечено отступом после двоеточия. Если одинаковые действия нужны в нескольких местах, лучше один раз описать функцию и вызывать её.'
        ],
        lua: `local leds = Ledbar.new(29)

local function yellow_signal()
    leds:set(2, 1, 1, 0)
    print("жёлтый")
end

print("функция описана")
yellow_signal()

function callback(event)
end
`,
        python: `from pioneer_sdk import Pioneer

pioneer = Pioneer(simulator=True)

def yellow_signal():
    pioneer.led_control(2, 255, 255, 0)
    print("жёлтый")

print("функция описана")
yellow_signal()
`,
        steps: [
            { lua: 'local function yellow_signal()\n    leds:set(2, 1, 1, 0)\n    print("жёлтый")\nend', python: 'def yellow_signal():\n    pioneer.led_control(2, 255, 255, 0)\n    print("жёлтый")', text: 'Описание функции: внутри два действия. Пока только запоминаются, но не выполняются.' },
            { lua: 'print("функция описана")', python: 'print("функция описана")', text: 'Это сообщение идёт до вызова: светодиод к этому моменту ещё не изменился.' },
            { lua: 'yellow_signal()', python: 'yellow_signal()', text: 'Вызов запускает сохранённые действия: светодиод 2 становится жёлтым и в журнал попадает «жёлтый».' }
        ],
        watch: 'Сначала в журнале «функция описана», затем «жёлтый», и только после вызова светодиод 2 загорается жёлтым.'
    },
    26: {
        theory: [
            'Параметр — это имя в скобках после названия функции. Оно получает значение при каждом вызове, так что одна функция работает с разными данными: `paint(1)` и `paint(3)`.',
            'Внутри функции параметр используется как обычная переменная. Здесь параметр `index` выбирает светодиод, а остальные числа в команде остаются постоянными.',
            'Не задавайте внутри тела то, что должно приходить через параметр, иначе все вызовы окажутся одинаковыми. Тело функции одно, а вызовов может быть сколько угодно, и у каждого свои данные.'
        ],
        lua: `local leds = Ledbar.new(29)

local function paint(index)
    leds:set(index, 0, 0, 1)
    print("светодиод " .. index)
end

paint(1)
paint(3)

function callback(event)
end
`,
        python: `from pioneer_sdk import Pioneer

pioneer = Pioneer(simulator=True)

def paint(index):
    pioneer.led_control(index, 0, 0, 255)
    print("светодиод", index)

paint(1)
paint(3)
`,
        steps: [
            { lua: 'local function paint(index)', python: 'def paint(index):', text: 'В скобках записан параметр index: функция ждёт, что ей передадут номер светодиода.' },
            { lua: 'leds:set(index, 0, 0, 1)', python: 'pioneer.led_control(index, 0, 0, 255)', text: 'Внутри функции параметр используется как обычное число. Именно он выбирает светодиод.' },
            { lua: 'paint(1)\npaint(3)', python: 'paint(1)\npaint(3)', text: 'Два вызова одной функции с разными значениями: сначала светодиод 1, затем светодиод 3.' }
        ],
        watch: 'Светодиоды 1 и 3 по очереди загораются синим, а в журнале две записи: «светодиод 1» и «светодиод 3».'
    },
    27: {
        theory: [
            'Список хранит несколько значений подряд, в заданном порядке. В Lua он записывается в фигурных скобках `{1, 3, 5}`, в Python — в квадратных `[1, 3, 5]`.',
            'Цикл по списку берёт элементы один за другим и делает с каждым одно и то же. В Lua это `for _, led_id in ipairs(ids) do`, в Python — `for led_id in ids:`. На каждом повторе `led_id` равен очередному элементу.',
            'Порядок обработки берётся из самого списка. Хотите другие светодиоды или другой порядок — меняете список, а цикл остаётся прежним.'
        ],
        lua: `local leds = Ledbar.new(29)

local ids = {1, 3, 5}
for _, led_id in ipairs(ids) do
    leds:set(led_id, 0, 1, 0)
    print(led_id)
end

function callback(event)
end
`,
        python: `from pioneer_sdk import Pioneer

pioneer = Pioneer(simulator=True)

ids = [1, 3, 5]
for led_id in ids:
    pioneer.led_control(led_id, 0, 255, 0)
    print(led_id)
`,
        steps: [
            { lua: 'local ids = {1, 3, 5}', python: 'ids = [1, 3, 5]', text: 'Список из трёх номеров светодиодов. Порядок элементов определяет порядок обработки.' },
            { lua: 'for _, led_id in ipairs(ids) do', python: 'for led_id in ids:', text: 'Цикл по списку: на каждом повторе led_id принимает значение очередного элемента.' },
            { lua: 'leds:set(led_id, 0, 1, 0)\n    print(led_id)', python: 'pioneer.led_control(led_id, 0, 255, 0)\n    print(led_id)', text: 'Тело цикла одинаково для всех элементов: светодиод включается зелёным, а его номер идёт в журнал.' }
        ],
        watch: 'Светодиоды 1, 3 и 5 загораются зелёным, а в журнале три записи: 1, 3, 5 именно в таком порядке.'
    }
};
