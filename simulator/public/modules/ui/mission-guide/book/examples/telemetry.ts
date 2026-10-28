import type { ChapterExamples } from '../example.js';

/** Examples of the chapter, by lesson number. */
export const TELEMETRY_EXAMPLES: ChapterExamples = {
    64: {
        theory: [
            '**Телеметрия** — это данные, которые дрон сообщает о себе сам: где он находится, на какой высоте, в каком состоянии. Команды говорят, чего мы хотим, а телеметрия — что произошло на самом деле.',
            'Положение читается командой <lua>`Sensors.lpsPosition()`</lua><py>`get_local_position_lps()`</py>. Она даёт три числа x, y, z — координаты в метрах в системе сцены.',
            'Прочитанное значение не обновляется само. Чтобы узнать положение на новом этапе, команду нужно вызвать заново: так можно сравнить землю, взлёт и прибытие.'
        ],
        lua: `function report(label)
    local x, y, z = Sensors.lpsPosition()
    print(label .. ": " .. x .. ", " .. y .. ", " .. z)
end
report("на земле")
ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then report("после взлёта"); ap.goToLocalPoint(0, 3, 1.5) end
    if event == Ev.POINT_REACHED then report("в точке") end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)
def report(label):
    x, y, z = pioneer.get_local_position_lps()
    print(label + ": " + str(x) + ", " + str(y) + ", " + str(z))
report("на земле")
pioneer.arm(); pioneer.takeoff()
while pioneer.get_autopilot_state() != "MISSION":
    time.sleep(0.1)
report("после взлёта")
pioneer.go_to_local_point(0, 3, 1.5)
while not pioneer.point_reached():
    time.sleep(0.1)
report("в точке")`,
        steps: [
            { lua: 'local x, y, z = Sensors.lpsPosition()', python: 'x, y, z = pioneer.get_local_position_lps()', text: 'Читаем три координаты текущего положения. Функция вызывает измерение каждый раз заново.' },
            { lua: 'report("на земле")', python: 'report("на земле")', text: 'Первое измерение делаем до запуска двигателей: дрон стоит на земле, высота около нуля.' },
            { lua: 'report("после взлёта"); ap.goToLocalPoint(0, 3, 1.5)', python: 'report("после взлёта")', text: 'Второе измерение — после подтверждённого взлёта: высота уже не нулевая, хотя цель мы ещё не отправляли.' },
            { lua: 'if event == Ev.POINT_REACHED then report("в точке") end', python: 'report("в точке")', text: 'Третье измерение — после прибытия: числа близки к цели (0, 3, 1.5), но это именно измеренное, а не заданное положение.' }
        ],
        watch: 'В журнале три строки с положением: на земле все числа около нуля, после взлёта высота уже не нулевая, а в точке числа близки к цели (0, 3, 1.5).'
    },
    65: {
        theory: [
            'Одно измерение — это снимок. Чтобы увидеть движение, измеряют много раз с одинаковой паузой. Время между измерениями называют **периодом опроса**.',
            'Маленький период даёт подробную картину, но быстро заполняет журнал. Большой период экономнее, зато можно пропустить быстрое изменение. Период выбирают под задачу.',
            'Период — это секунды между измерениями, а не частота. Период 0.5 с означает два измерения в секунду, период 0.2 с — пять. Чем период меньше, тем измерений больше.'
        ],
        lua: `local period = 0.5
local finished = false
local count = 0
function measure()
    if finished then return end
    local x, y, z = Sensors.lpsPosition()
    count = count + 1
    print("Z = " .. z)
    Timer.callLater(period, measure)
end
ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then ap.goToLocalPoint(0, 0, 1.5); measure() end
    if event == Ev.POINT_REACHED then finished = true; print("Измерений: " .. count) end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)
period = 0.5
count = 0
pioneer.arm(); pioneer.takeoff()
while pioneer.get_autopilot_state() != "MISSION":
    time.sleep(0.1)
pioneer.go_to_local_point(0, 0, 1.5)
while not pioneer.point_reached():
    x, y, z = pioneer.get_local_position_lps()
    count += 1
    print("Z = " + str(z))
    time.sleep(period)
print("Измерений: " + str(count))`,
        steps: [
            { lua: 'local period = 0.5', python: 'period = 0.5', text: 'Период опроса вынесен в переменную: его удобно менять и сравнивать результаты.' },
            { lua: 'local x, y, z = Sensors.lpsPosition()', python: 'x, y, z = pioneer.get_local_position_lps()', text: 'Каждый проход цикла делает новое измерение положения во время подъёма.' },
            { lua: 'Timer.callLater(period, measure)', python: 'time.sleep(period)', text: 'Затем ждём один период и повторяем измерение, пока дрон не прибудет.' },
            { lua: 'print("Измерений: " .. count)', python: 'print("Измерений: " + str(count))', text: 'В конце печатаем, сколько измерений удалось сделать: при другом периоде число будет другим.' }
        ],
        watch: 'Пока дрон поднимается, в журнале каждые полсекунды появляется новая высота Z, а в конце печатается число измерений; при периоде 0.2 строк станет примерно вдвое больше.'
    },
    66: {
        theory: [
            'Иногда измерения нет: датчик ещё не ответил или данные не дошли. В программе для этого есть отдельное значение: <lua>`nil`</lua><py>`None`</py> — «ничего нет».',
            'Ноль — это настоящее число: высота 0 м значит «дрон на земле». Если подставить ноль вместо отсутствующих данных, программа сделает неверный вывод и не заметит проблему.',
            'Поэтому сначала проверяем, есть ли значение (<lua>`== nil`</lua><py>`is None`</py>), и только потом сравниваем его с порогами. Проверка на отсутствие данных идёт первой в цепочке условий.'
        ],
        lua: `function describe(height)
    if height == nil then
        print("Нет данных")
    elseif height < 0.2 then
        print("На земле: " .. height)
    else
        print("В воздухе: " .. height)
    end
end
describe(nil)
describe(0)
describe(1.5)`,
        python: `def describe(height):
    if height is None:
        print("Нет данных")
    elif height < 0.2:
        print("На земле: " + str(height))
    else:
        print("В воздухе: " + str(height))

describe(None)
describe(0)
describe(1.5)`,
        steps: [
            { lua: 'if height == nil then', python: 'if height is None:', text: 'Первая проверка: есть ли вообще значение. Только если его нет, выводим «Нет данных».' },
            { lua: 'elseif height < 0.2 then', python: 'elif height < 0.2:', text: 'Сравнение с порогом выполняется только для настоящего числа, поэтому ошибки сравнения не будет.' },
            { lua: 'describe(nil)', python: 'describe(None)', text: 'Три вызова: данных нет, высота ноль и высота в воздухе. Первые два результата разные.' }
        ],
        watch: 'В журнале три разные строки: «Нет данных», «На земле: 0» и «В воздухе: 1.5»; отсутствие данных не превращается в высоту 0.'
    },
    67: {
        theory: [
            'Команда взлёта или движения только просит дрон что-то сделать. Достиг ли он нужной высоты, показывает лишь новое измерение.',
            'Условие по измерению записывается так: прочитали z и сравнили с порогом. Порог берём чуть ниже цели, то есть цель минус допуск, потому что точно в цель дрон почти никогда не попадает.',
            'Пока условие не выполнено, измеряем снова через небольшую паузу. Когда выполнено — включаем сигнал или переходим к следующему этапу.'
        ],
        lua: `local leds = Ledbar.new(29)
local target, tolerance = 1.5, 0.1
function measure()
    local x, y, z = Sensors.lpsPosition()
    if z >= target - tolerance then
        leds:set(1, 0, 0, 1)
        print("Высота набрана: " .. z)
    else
        Timer.callLater(0.2, measure)
    end
end
ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then ap.goToLocalPoint(0, 0, target); measure() end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)
target, tolerance = 1.5, 0.1
pioneer.arm(); pioneer.takeoff()
while pioneer.get_autopilot_state() != "MISSION":
    time.sleep(0.1)
pioneer.go_to_local_point(0, 0, target)
x, y, z = pioneer.get_local_position_lps()
while z < target - tolerance:
    time.sleep(0.2)
    x, y, z = pioneer.get_local_position_lps()
pioneer.led_control(1, 0, 0, 255)
print("Высота набрана: " + str(z))`,
        steps: [
            { lua: 'local target, tolerance = 1.5, 0.1', python: 'target, tolerance = 1.5, 0.1', text: 'Цель по высоте и допуск. Порог готовности будет на 0.1 м ниже цели.' },
            { lua: 'if z >= target - tolerance then', python: 'while z < target - tolerance:', text: 'Условие смотрит на только что измеренную высоту z, а не на отправленную цель.' },
            { lua: 'Timer.callLater(0.2, measure)', python: 'time.sleep(0.2)', text: 'Пока высота не набрана, ждём 0.2 секунды и измеряем снова.' },
            { lua: 'leds:set(1, 0, 0, 1)', python: 'pioneer.led_control(1, 0, 0, 255)', text: 'Когда измерение подтвердило высоту, включаем синий светодиод номер 1.' }
        ],
        watch: 'Дрон поднимается к 1.5 м, а синий светодиод загорается только после того, как измеренная высота дошла до порога 1.4 м; в журнале строка с этой высотой.'
    },
    68: {
        theory: [
            '**Ошибка положения** — это разность между целью и измерением: `цель - x`. Она показывает, сколько ещё осталось пролететь по этой координате.',
            'Знак ошибки важен. Плюс означает, что цель дальше по направлению оси, минус — что цель в обратную сторону. Модуль ошибки показывает расстояние, а знак — сторону.',
            'Ошибку вычисляем заново по каждому новому измерению. По мере подхода к цели она уменьшается по модулю к нулю, а при перелёте меняет знак.'
        ],
        lua: `local targetX = -1.5
local finished = false
function measure()
    if finished then return end
    local x, y, z = Sensors.lpsPosition()
    print("Ошибка X: " .. (targetX - x))
    Timer.callLater(0.5, measure)
end
ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then ap.goToLocalPoint(targetX, 0, 1.2); measure() end
    if event == Ev.POINT_REACHED then finished = true; print("Ошибка почти нулевая") end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)
target_x = -1.5
pioneer.arm(); pioneer.takeoff()
while pioneer.get_autopilot_state() != "MISSION":
    time.sleep(0.1)
pioneer.go_to_local_point(target_x, 0, 1.2)
while not pioneer.point_reached():
    x, y, z = pioneer.get_local_position_lps()
    print("Ошибка X: " + str(target_x - x))
    time.sleep(0.5)
print("Ошибка почти нулевая")`,
        steps: [
            { lua: 'local targetX = -1.5', python: 'target_x = -1.5', text: 'Цель по X отрицательная: дрон должен сместиться в сторону минуса.' },
            { lua: 'print("Ошибка X: " .. (targetX - x))', python: 'print("Ошибка X: " + str(target_x - x))', text: 'Ошибка — цель минус измеренное X. Сначала она отрицательная, потому что цель лежит в сторону -X.' },
            { lua: 'Timer.callLater(0.5, measure)', python: 'time.sleep(0.5)', text: 'Через полсекунды измеряем снова и получаем новую, меньшую по модулю ошибку.' }
        ],
        watch: 'В журнале ошибка X начинается около -1.5 и с каждой строкой уменьшается по модулю к нулю; знак минус показывает, что цель лежит в сторону -X.'
    },
    69: {
        theory: [
            'Измерения колеблются: ошибка около границы может прыгать с +0.02 на -0.02. Если на каждую смену знака отдавать команду, дрон начнёт дёргаться из стороны в сторону.',
            '**Зона допуска** — диапазон около нуля, внутри которого мы ничего не делаем. Решений получается три: ошибка больше допуска — идём в одну сторону, меньше минус допуска — в другую, иначе стоим.',
            'Допуск выбирают по точности системы. Слишком маленький не гасит дрожание, слишком большой делает дрон вялым: он перестаёт исправлять заметную ошибку.'
        ],
        lua: `local tolerance = 0.15
for _, err in ipairs({0.3, 0.05, -0.08, -0.4, 0.12}) do
    local side = "в зоне, стоим"
    if err > tolerance then side = "в сторону +X"
    elseif err < -tolerance then side = "в сторону -X" end
    print(err .. ": " .. side)
end`,
        python: `tolerance = 0.15
for err in [0.3, 0.05, -0.08, -0.4, 0.12]:
    side = "в зоне, стоим"
    if err > tolerance:
        side = "в сторону +X"
    elif err < -tolerance:
        side = "в сторону -X"
    print(str(err) + ": " + side)`,
        steps: [
            { lua: 'local tolerance = 0.15', python: 'tolerance = 0.15', text: 'Допуск задаёт ширину зоны покоя: ошибки от -0.15 до 0.15 нас не беспокоят.' },
            { lua: 'if err > tolerance then side = "в сторону +X"', python: 'if err > tolerance:', text: 'Большая положительная ошибка означает движение в сторону +X.' },
            { lua: 'elseif err < -tolerance then side = "в сторону -X" end', python: 'elif err < -tolerance:', text: 'Большая отрицательная ошибка означает движение в сторону -X; всё остальное остаётся «в зоне».' }
        ],
        watch: 'В журнале для каждой из пяти ошибок видно решение: 0.05, -0.08 и 0.12 дают «в зоне, стоим», а 0.3 и -0.4 — движение в нужную сторону.'
    },
    70: {
        theory: [
            'Контроллер вычисляет команду из ошибки, например: скорость равна коэффициенту, умноженному на ошибку. Но при большой ошибке такая скорость может оказаться опасно большой.',
            'Поэтому результат зажимают в допустимый диапазон: `min` берёт меньшее из значения и верхнего предела, `max` — большее из значения и нижнего. Вместе получается <lua>`math.max(-limit, math.min(limit, value))`</lua><py>`max(-limit, min(limit, value))`</py>.',
            'Допустимые значения остаются как есть, обрезается только то, что вышло за границы. Расчёт удобно проверять на числах ещё до подключения моторов.'
        ],
        lua: `local limit, k = 0.3, 0.5
for _, err in ipairs({-2, -0.4, 0.2, 1.5}) do
    local raw = err * k
    local command = math.max(-limit, math.min(limit, raw))
    print(raw .. " -> " .. command)
end`,
        python: `limit, k = 0.3, 0.5
for err in [-2, -0.4, 0.2, 1.5]:
    raw = err * k
    command = max(-limit, min(limit, raw))
    print(str(raw) + " -> " + str(command))`,
        steps: [
            { lua: 'local raw = err * k', python: 'raw = err * k', text: 'Сначала считаем команду без ограничений: ошибка, умноженная на коэффициент.' },
            { lua: 'local command = math.max(-limit, math.min(limit, raw))', python: 'command = max(-limit, min(limit, raw))', text: 'Затем зажимаем её между -limit и limit: всё лишнее обрезается.' },
            { lua: 'print(raw .. " -> " .. command)', python: 'print(str(raw) + " -> " + str(command))', text: 'Печатаем исходное и ограниченное значения рядом, чтобы увидеть, где ограничение сработало.' }
        ],
        watch: 'В журнале четыре строки: -1.0 превращается в -0.3, 0.75 в 0.3, а малые значения -0.2 и 0.1 остаются без изменений.'
    },
    71: {
        theory: [
            'Когда ожидание заканчивается, важно знать причину: цель достигнута или время вышло. Без этого по журналу не понять, что пошло не так.',
            'Ожидание ограничивают сроком — это тайм-аут. В цикле проверяем два условия: цель достигнута — выходим с одной причиной; срок вышел — выходим с другой.',
            'В сообщение сразу записываем причину, этап миссии и последнее измерение. Тогда по одной строке видно, где и почему остановились.'
        ],
        lua: `local wanted = 2.5
local passed = 0
function measure()
    local x, y, z = Sensors.lpsPosition()
    if z >= wanted then
        print("Остановка: высота достигнута, Z = " .. z)
    elseif passed >= 3 then
        print("Остановка: тайм-аут, этап: набор высоты, Z = " .. z)
    else
        passed = passed + 0.2
        Timer.callLater(0.2, measure)
    end
end
ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then ap.goToLocalPoint(0, 0, 1.5); measure() end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)
wanted = 2.5
pioneer.arm(); pioneer.takeoff()
while pioneer.get_autopilot_state() != "MISSION":
    time.sleep(0.1)
pioneer.go_to_local_point(0, 0, 1.5)
deadline = time.monotonic() + 3
reason = "тайм-аут, этап: набор высоты"
while time.monotonic() < deadline:
    x, y, z = pioneer.get_local_position_lps()
    if z >= wanted:
        reason = "высота достигнута"
        break
    time.sleep(0.2)
print("Остановка: " + reason + ", Z = " + str(z))`,
        steps: [
            { lua: 'local wanted = 2.5', python: 'wanted = 2.5', text: 'Высота, которую мы ждём. Она намеренно больше цели полёта, чтобы показать тайм-аут.' },
            { lua: 'if z >= wanted then', python: 'if z >= wanted:', text: 'Первая причина остановки: измерение подтвердило нужную высоту.' },
            { lua: 'elseif passed >= 3 then', python: 'while time.monotonic() < deadline:', text: 'Вторая причина: прошло три секунды, а высоты всё нет. Срок ограничивает ожидание.' },
            { lua: 'print("Остановка: тайм-аут, этап: набор высоты, Z = " .. z)', python: 'print("Остановка: " + reason + ", Z = " + str(z))', text: 'Сообщение хранит причину, этап и последнее измеренное Z.' }
        ],
        watch: 'Дрон поднимается к 1.5 м, но ждём 2.5 м, поэтому через три секунды в журнале строка с причиной «тайм-аут» и измеренной высотой; если wanted уменьшить до 1.4, причина станет «высота достигнута».'
    },
    72: {
        theory: [
            '**Отчёт полёта** — это короткая запись: что мы хотели, что измерили и чем всё закончилось. Одной строки «успех» мало: она ничем не подтверждена.',
            'Цель и измерение записываем отдельно и с подписями. Если читать положение заново на каждом этапе, отчёт покажет реальный путь дрона: старт, прибытие, посадку.',
            'Разность цели и измеренного положения показывает, насколько точно дрон прибыл. Если она в допуске, вывод «миссия выполнена» подкреплён данными.'
        ],
        lua: `function report(label)
    local x, y, z = Sensors.lpsPosition()
    print(label .. ": " .. x .. ", " .. y .. ", " .. z)
end
report("Старт")
print("Цель: 0, 2, 1")
ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then ap.goToLocalPoint(0, 2, 1) end
    if event == Ev.POINT_REACHED then
        report("Прибытие")
        local x, y, z = Sensors.lpsPosition()
        print("Отклонение по Y: " .. (2 - y))
        ap.push(Ev.MCE_LANDING)
    end
    if event == Ev.COPTER_LANDED then report("После посадки") end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)
def report(label):
    x, y, z = pioneer.get_local_position_lps()
    print(label + ": " + str(x) + ", " + str(y) + ", " + str(z))
report("Старт")
print("Цель: 0, 2, 1")
pioneer.arm(); pioneer.takeoff()
while pioneer.get_autopilot_state() != "MISSION":
    time.sleep(0.1)
pioneer.go_to_local_point(0, 2, 1)
while not pioneer.point_reached():
    time.sleep(0.1)
report("Прибытие")
x, y, z = pioneer.get_local_position_lps()
print("Отклонение по Y: " + str(2 - y))
pioneer.land()
while pioneer.get_autopilot_state() != "DISARMED":
    time.sleep(0.1)
report("После посадки")`,
        steps: [
            { lua: 'print("Цель: 0, 2, 1")', python: 'print("Цель: 0, 2, 1")', text: 'Намерение записываем до движения, отдельной строкой с подписью «Цель».' },
            { lua: 'report("Прибытие")', python: 'report("Прибытие")', text: 'После подтверждённого прибытия читаем положение заново: это измеренный результат.' },
            { lua: 'print("Отклонение по Y: " .. (2 - y))', python: 'print("Отклонение по Y: " + str(2 - y))', text: 'Сравниваем цель с измерением: чем меньше отклонение, тем точнее прибытие.' },
            { lua: 'if event == Ev.COPTER_LANDED then report("После посадки") end', python: 'report("После посадки")', text: 'Последнее измерение берём после остановки на земле, когда посадка подтверждена.' }
        ],
        watch: 'В журнале по порядку строки «Старт», «Цель», «Прибытие», отклонение по Y и «После посадки»; дрон взлетает, летит к (0, 2, 1) и садится.'
    }
};
