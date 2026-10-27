import type { ChapterExamples } from '../example.js';

/** Examples of the chapter «Время и события», by lesson number. */
export const TIME_EXAMPLES: ChapterExamples = {
    28: {
        theory: [
            'Команда светодиода выполняется мгновенно. Если за ней сразу идёт следующая, глаз успеет увидеть только последний цвет. Чтобы цвета различались, между ними нужны паузы.',
            'В Python пауза — это `time.sleep(1)`: программа стоит на месте одну секунду, а потом идёт дальше. Поэтому команды и паузы читаются сверху вниз, как сценарий.',
            'В Lua программа не стоит на месте. Вместо паузы вы заводите таймеры: `Timer.callLater(1, ...)` обещает выполнить действие через секунду и сразу идёт дальше. Отсчёт каждого таймера идёт от момента, когда вы его завели.'
        ],
        lua: `local leds = Ledbar.new(29)

leds:set(1, 1, 0, 1)
Timer.callLater(1, function() leds:set(1, 1, 1, 0) end)
Timer.callLater(2, function() leds:set(1, 1, 1, 1) end)

function callback(event)
end
`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

pioneer.led_control(1, 255, 0, 255)
time.sleep(1)
pioneer.led_control(1, 255, 255, 0)
time.sleep(1)
pioneer.led_control(1, 255, 255, 255)
`,
        steps: [
            { lua: 'leds:set(1, 1, 0, 1)', python: 'pioneer.led_control(1, 255, 0, 255)', text: 'Первый цвет, пурпурный, включается сразу: перед ним ждать не нужно.' },
            { lua: 'Timer.callLater(1, function() leds:set(1, 1, 1, 0) end)', python: 'time.sleep(1)\npioneer.led_control(1, 255, 255, 0)', text: 'Через секунду после старта светодиод становится жёлтым. Для Python это пауза, затем команда; для Lua — таймер.' },
            { lua: 'Timer.callLater(2, function() leds:set(1, 1, 1, 1) end)', python: 'time.sleep(1)\npioneer.led_control(1, 255, 255, 255)', text: 'Ещё через секунду светодиод становится белым. Каждый цвет успевает продержаться заметное время.' }
        ],
        watch: 'Светодиод 1 по очереди светится пурпурным, через секунду жёлтым, ещё через секунду белым.'
    },
    29: {
        theory: [
            'Отложенный сигнал — это действие, которое случится позже, а не в тот момент, когда строка прочитана. В Lua так работает `Timer.callLater(2, function() ... end)`: функция внутри будет выполнена через 2 секунды.',
            'Важно отличать момент, когда вы завели таймер, от момента, когда он сработал. Сообщение «таймер заведён» появляется сразу, а светодиод и второе сообщение — только через две секунды.',
            'В Python то же самое делается проще: `time.sleep(2)` останавливает программу, и всё, что записано ниже, происходит уже после паузы. Сообщение о сигнале ставьте вместе с самим сигналом, тогда оно ему не противоречит.'
        ],
        lua: `local leds = Ledbar.new(29)

print("таймер заведён")
Timer.callLater(2, function()
    leds:set(1, 1, 0, 1)
    print("сработало через 2 секунды")
end)

function callback(event)
end
`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

print("таймер заведён")
time.sleep(2)
pioneer.led_control(1, 255, 0, 255)
print("сработало через 2 секунды")
`,
        steps: [
            { lua: 'print("таймер заведён")', python: 'print("таймер заведён")', text: 'Сообщение выводится сразу: на этот момент ничего ещё не включено.' },
            { lua: 'Timer.callLater(2, function()', python: 'time.sleep(2)', text: 'Здесь начинается ожидание в две секунды: в Lua это таймер, в Python — пауза.' },
            { lua: 'leds:set(1, 1, 0, 1)\n    print("сработало через 2 секунды")', python: 'pioneer.led_control(1, 255, 0, 255)\nprint("сработало через 2 секунды")', text: 'Отложенное действие: светодиод 1 становится пурпурным, и сразу после этого пишется сообщение.' }
        ],
        watch: 'Сначала в журнале «таймер заведён», две секунды ничего не происходит, затем светится светодиод 1 и идёт второе сообщение.'
    },
    30: {
        theory: [
            'Два таймера в Lua работают независимо: оба отсчитывают время от момента, когда их завели. Если завести их подряд с задержками 1 и 3, они сработают через 1 и через 3 секунды от старта.',
            'Паузы в Python идут друг за другом и складываются. `time.sleep(1)`, затем `time.sleep(2)` дают второй сигнал на третьей секунде, а не на второй.',
            'Поэтому в Lua пишут общее время от начала опыта, а в Python — только промежуток после предыдущего действия. Прежде чем запускать, посчитайте на бумаге, в какую секунду что включится.'
        ],
        lua: `local leds = Ledbar.new(29)

Timer.callLater(1, function() leds:set(2, 1, 1, 0) end)
Timer.callLater(3, function() leds:set(3, 1, 1, 1) end)

function callback(event)
end
`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

time.sleep(1)
pioneer.led_control(2, 255, 255, 0)
time.sleep(2)
pioneer.led_control(3, 255, 255, 255)
`,
        steps: [
            { lua: 'Timer.callLater(1, function() leds:set(2, 1, 1, 0) end)', python: 'time.sleep(1)\npioneer.led_control(2, 255, 255, 0)', text: 'Первый сигнал: на первой секунде светодиод 2 становится жёлтым.' },
            { lua: 'Timer.callLater(3, function() leds:set(3, 1, 1, 1) end)', python: 'time.sleep(2)\npioneer.led_control(3, 255, 255, 255)', text: 'Второй сигнал на третьей секунде от старта. В Lua это число 3, в Python это две секунды после первого сигнала.' }
        ],
        watch: 'На первой секунде светодиод 2 становится жёлтым, на третьей секунде светодиод 3 становится белым.'
    },
    31: {
        theory: [
            'Мигание — это повторяющийся ритм: свет включили, подождали, выключили, подождали и повторили. Время одного полного повторения называют периодом.',
            'У мигания две части: светлая и тёмная. Если свет горит 0.2 секунды, а темнота длится 0.6, то период равен 0.8 секунды. Светлая часть одна и та же, меняется только пауза между миганиями.',
            'В Python мигание — цикл с двумя паузами внутри. В Lua внутри цикла заводят два таймера на каждое мигание: включение в момент `i * 0.8` и выключение на 0.2 секунды позже.'
        ],
        lua: `local leds = Ledbar.new(29)

for i = 0, 2 do
    Timer.callLater(i * 0.8, function() leds:set(1, 0, 1, 0) end)
    Timer.callLater(i * 0.8 + 0.2, function() leds:set(1, 0, 0, 0) end)
end

function callback(event)
end
`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

for i in range(3):
    pioneer.led_control(1, 0, 255, 0)
    time.sleep(0.2)
    pioneer.led_control(1, 0, 0, 0)
    time.sleep(0.6)
`,
        steps: [
            { lua: 'for i = 0, 2 do', python: 'for i in range(3):', text: 'Цикл на три мигания. Номер повтора i в Lua пригодится для расчёта моментов времени.' },
            { lua: 'Timer.callLater(i * 0.8, function() leds:set(1, 0, 1, 0) end)', python: 'pioneer.led_control(1, 0, 255, 0)\n    time.sleep(0.2)', text: 'Светлая часть: зелёный свет горит 0.2 секунды. Каждое следующее мигание начинается на 0.8 секунды позже.' },
            { lua: 'Timer.callLater(i * 0.8 + 0.2, function() leds:set(1, 0, 0, 0) end)', python: 'pioneer.led_control(1, 0, 0, 0)\n    time.sleep(0.6)', text: 'Тёмная часть: светодиод гаснет и остаётся тёмным 0.6 секунды. В сумме период равен 0.8 секунды.' }
        ],
        watch: 'Светодиод 1 коротко вспыхивает зелёным три раза с заметными тёмными промежутками и в конце остаётся выключенным.'
    },
    32: {
        theory: [
            'Событие — это сообщение автопилота о том, что что-то произошло. Вы не знаете заранее, в какой момент оно придёт, поэтому заранее описываете реакцию: что сделать, когда событие случится.',
            'В Lua реакция — это функция `callback(event)`. Автопилот сам вызывает её и передаёт номер события. Подтверждение подготовки двигателей приходит как `Ev.ENGINES_STARTED`.',
            'В Python реакции описывать не нужно: команда `pioneer.arm()` возвращает результат, а `if pioneer.arm():` выполняет тело только тогда, когда подготовка принята. Описание реакции без самой команды ничего не запускает.'
        ],
        lua: `local leds = Ledbar.new(29)

ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        leds:set(1, 0, 0, 1)
        print("arm принят")
    end
end
`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

if pioneer.arm():
    pioneer.led_control(1, 0, 0, 255)
    print("arm принят")
`,
        steps: [
            { lua: 'ap.push(Ev.MCE_PREFLIGHT)', python: 'if pioneer.arm():', text: 'Отправляется команда подготовки двигателей. Именно она вызывает событие подтверждения.' },
            { lua: 'function callback(event)\n    if event == Ev.ENGINES_STARTED then', python: 'pioneer.led_control(1, 0, 0, 255)', text: 'В Lua автопилот вызывает callback, когда подготовка принята. В Python тело `if` выполняется после принятия.' },
            { lua: 'print("arm принят")', python: 'print("arm принят")', text: 'Сообщение выводится только после подтверждения, а не вместе с отправкой команды.' }
        ],
        watch: 'Светодиод 1 становится синим, а в журнале появляется «arm принят»; дрон остаётся на земле.'
    },
    33: {
        theory: [
            'Автопилот присылает разные уведомления, а не только о готовности. Если реагировать на каждое одинаково, программа начнёт «готовиться» от чужих событий. Поэтому событие нужно сначала проверить.',
            'В Lua проверка пишется внутри обработчика: `if event == Ev.ENGINES_STARTED then`. Всё, что внутри `if`, выполняется только для этого события, остальные уведомления игнорируются.',
            'В Python похожая проверка смотрит на состояние: `pioneer.get_autopilot_state() == "ARMED"`. Состояние `ARMED` означает, что подготовка двигателей принята. Фильтр связывает действие с конкретным событием.'
        ],
        lua: `local leds = Ledbar.new(29)

ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    print("пришло событие " .. event)
    if event == Ev.ENGINES_STARTED then
        leds:set(2, 0, 1, 1)
        print("двигатели запущены")
    end
end
`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

pioneer.arm()
state = pioneer.get_autopilot_state()
print("состояние: " + state)
if state == "ARMED":
    pioneer.led_control(2, 0, 255, 255)
    print("двигатели запущены")
`,
        steps: [
            { lua: 'print("пришло событие " .. event)', python: 'state = pioneer.get_autopilot_state()\nprint("состояние: " + state)', text: 'Сначала смотрим, что именно пришло: номер события в Lua, состояние автопилота в Python.' },
            { lua: 'if event == Ev.ENGINES_STARTED then', python: 'if state == "ARMED":', text: 'Фильтр: действие допускается только для нужного события или состояния.' },
            { lua: 'leds:set(2, 0, 1, 1)', python: 'pioneer.led_control(2, 0, 255, 255)', text: 'Голубой сигнал на светодиоде 2 включается только после прохождения фильтра.' }
        ],
        watch: 'В журнале видно, что пришло, затем «двигатели запущены», и светодиод 2 загорается голубым.'
    },
    34: {
        theory: [
            'Программа может помнить, на каком она этапе: старт, подготовка, готовность. Для этого заводят переменную `phase` и меняют её при каждом переходе. Всё, что делает программа, может зависеть от этой переменной.',
            'Каждый переход стоит записывать в журнал: `"этап: " .. phase`. По журналу потом видно, в каком порядке шла программа и где она могла остановиться.',
            'В Lua переменную меняет обработчик события: объявлена она выше, а присваивание происходит в `callback`, когда событие придёт. В Python присваивание просто идёт после команды `pioneer.arm()`.'
        ],
        lua: `local leds = Ledbar.new(29)

local phase = "старт"
print("этап: " .. phase)
ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        phase = "двигатели запущены"
        print("этап: " .. phase)
    end
end
`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

phase = "старт"
print("этап: " + phase)
pioneer.arm()
phase = "двигатели запущены"
print("этап: " + phase)
`,
        steps: [
            { lua: 'local phase = "старт"\nprint("этап: " .. phase)', python: 'phase = "старт"\nprint("этап: " + phase)', text: 'Начальный этап запомнен в переменной и записан в журнал.' },
            { lua: 'ap.push(Ev.MCE_PREFLIGHT)', python: 'pioneer.arm()', text: 'Отправляется подготовка двигателей: она переведёт программу к следующему этапу.' },
            { lua: 'phase = "двигатели запущены"\n        print("этап: " .. phase)', python: 'phase = "двигатели запущены"\nprint("этап: " + phase)', text: 'После подтверждения та же переменная получает новое значение, и переход записывается в журнал.' }
        ],
        watch: 'В журнале две записи подряд: «этап: старт», затем «этап: двигатели запущены»; дрон остаётся на земле.'
    },
    35: {
        theory: [
            'Ожидание без конца опасно: если событие не придёт, программа будет ждать вечно. Тайм-аут — это предел ожидания. Когда он вышел, а нужного результата нет, программа сообщает о проблеме и идёт дальше.',
            'В Lua тайм-аут — это обычный таймер: `Timer.callLater(2, ...)` через две секунды проверяет флаг `ready`. Если флаг всё ещё ложный, значит, события не было.',
            'В Python ждут в цикле `while`: вычисляют крайний срок `deadline = time.monotonic() + 2` и повторяют короткие паузы, пока срок не вышел. Потом проверяют, пришёл ли результат.'
        ],
        lua: `local leds = Ledbar.new(29)

local ready = false
Timer.callLater(2, function()
    if not ready then
        leds:set(0, 1, 0, 0)
        print("не дождались за 2 секунды")
    end
end)

function callback(event)
end
`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

ready = False
deadline = time.monotonic() + 2
while not ready and time.monotonic() < deadline:
    time.sleep(0.05)
if not ready:
    pioneer.led_control(0, 255, 0, 0)
    print("не дождались за 2 секунды")
`,
        steps: [
            { lua: 'local ready = false', python: 'ready = False', text: 'Флаг «готово». В этом опыте его никто не включит, поэтому ожидание закончится только по тайм-ауту.' },
            { lua: 'Timer.callLater(2, function()', python: 'deadline = time.monotonic() + 2\nwhile not ready and time.monotonic() < deadline:\n    time.sleep(0.05)', text: 'Предел ожидания в две секунды. В Lua его отсчитывает таймер, в Python цикл ждёт короткими паузами до крайнего срока.' },
            { lua: 'if not ready then\n        leds:set(0, 1, 0, 0)\n        print("не дождались за 2 секунды")', python: 'if not ready:\n    pioneer.led_control(0, 255, 0, 0)\n    print("не дождались за 2 секунды")', text: 'Когда срок вышел, а готовности нет, светодиод 0 становится красным и пишется сообщение. Программа не зависает.' }
        ],
        watch: 'Две секунды ничего не происходит, затем светодиод 0 становится красным и появляется «не дождались за 2 секунды».'
    },
    36: {
        theory: [
            'Фиксированная пауза «подождём две секунды и считаем, что готово» — это угадывание. Двигатели могут стартовать быстрее или медленнее, и пауза этого не узнаёт. Надёжнее ждать подтверждения.',
            'Правильный порядок такой: отправили команду, ждёте подтверждения не дольше срока, потом проверяете результат. Подтверждение пришло — идём дальше, не пришло — сообщаем об ошибке.',
            'В Lua подтверждение ставит флаг `ready = true` в обработчике, а таймер проверяет его по сроку. В Python цикл опрашивает `get_autopilot_state()` до срока, а затем проверяет, достигнуто ли состояние `ARMED`.'
        ],
        lua: `local leds = Ledbar.new(29)

local ready = false
ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ready = true
        leds:set(2, 0, 0, 1)
        print("подтверждение пришло")
    end
end

Timer.callLater(2, function()
    if not ready then print("подтверждения нет") end
end)
`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

pioneer.arm()
deadline = time.monotonic() + 2
while pioneer.get_autopilot_state() != "ARMED" and time.monotonic() < deadline:
    time.sleep(0.05)
if pioneer.get_autopilot_state() == "ARMED":
    pioneer.led_control(2, 0, 0, 255)
    print("подтверждение пришло")
else:
    print("подтверждения нет")
`,
        steps: [
            { lua: 'local ready = false\nap.push(Ev.MCE_PREFLIGHT)', python: 'pioneer.arm()', text: 'Отправляется подготовка. В Lua флаг ready пока ложный, в Python начинается отсчёт ожидания.' },
            { lua: 'ready = true\n        leds:set(2, 0, 0, 1)\n        print("подтверждение пришло")', python: 'while pioneer.get_autopilot_state() != "ARMED" and time.monotonic() < deadline:\n    time.sleep(0.05)', text: 'Ждём именно подтверждения: в Lua его принимает обработчик, в Python его ждёт цикл не дольше срока.' },
            { lua: 'Timer.callLater(2, function()\n    if not ready then print("подтверждения нет") end', python: 'else:\n    print("подтверждения нет")', text: 'Запасной исход: если подтверждения нет к сроку, программа сообщает об этом, а не молчит и не зависает.' }
        ],
        watch: 'Светодиод 2 загорается синим, как только подготовка принята, а в журнале «подтверждение пришло» без сообщения об отсутствии.'
    }
};
