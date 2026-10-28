import type { ChapterExamples } from '../example.js';

/* The waiting loops are the same in every Python example of the chapter, so they are written once. */
const PY_HEAD = `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)`;
const PY_WAIT_TAKEOFF = `while pioneer.get_autopilot_state() != "MISSION":
    time.sleep(0.05)`;
const PY_WAIT_POINT = `while not pioneer.point_reached():
    time.sleep(0.05)`;

/** Examples of the chapter, by lesson number. */
export const COORDINATES_EXAMPLES: ChapterExamples = {
    37: {
        theory: [
            'Взлёт — это подъём дрона с земли на небольшую рабочую высоту. Он начинается только после подготовки: команду взлёта отправляют, когда автопилот подтвердил, что моторы запущены.',
            'Подъём занимает время. Команда <lua>`Ev.MCE_TAKEOFF`</lua><py>`takeoff()`</py> лишь запускает его, а конец подъёма приходит позже: <lua>событием `Ev.TAKEOFF_COMPLETE`</lua><py>состоянием `MISSION`</py>.',
            'Поэтому сообщение «взлетаю» в журнале ничего не доказывает: дрон может ещё стоять на земле. Следующее действие запускайте только после подтверждения, а этапы удобно показывать цветом светодиода.',
            'В заготовках практики ожидания уже написаны за вас. <lua>За время следят флаг `finished` и таймер `Timer.callLater(360, ...)` в начале заготовки: если опыт не закончился, он печатает «тайм-аут».</lua><py>`wait_for(lambda: условие)` повторяет проверку каждые 0,05 секунды, пока условие не станет истинным (`lambda:` значит «проверяй вот это условие»), а `wait_point()` так же ждёт прибытия в точку, как цикл `while not pioneer.point_reached()`. Если ждать слишком долго, программа останавливается с ошибкой «тайм-аут ожидания».</py> Эти части менять не нужно.'
        ],
        lua: `local leds = Ledbar.new(29)

ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then
        leds:set(0, 0, 0, 1)
        print("Команда взлёта отправлена")
        ap.push(Ev.MCE_TAKEOFF)
    end
    if event == Ev.TAKEOFF_COMPLETE then
        leds:set(0, 0, 1, 0)
        print("Подъём закончен")
    end
end`,
        python: `${PY_HEAD}
pioneer.arm()
pioneer.led_control(0, 0, 0, 255)
print("Команда взлёта отправлена")
pioneer.takeoff()
${PY_WAIT_TAKEOFF}
pioneer.led_control(0, 0, 255, 0)
print("Подъём закончен")`,
        steps: [
            { lua: 'ap.push(Ev.MCE_PREFLIGHT)', python: 'pioneer.arm()', text: 'Сначала подготовка: автопилот запускает моторы. Без неё взлёт невозможен.' },
            { lua: 'ap.push(Ev.MCE_TAKEOFF)', python: 'pioneer.takeoff()', text: 'Команда взлёта только запускает подъём. Светодиод к этому моменту уже синий: подъём идёт, но не закончен.' },
            { lua: 'if event == Ev.TAKEOFF_COMPLETE then', python: PY_WAIT_TAKEOFF, text: 'Конец подъёма приходит отдельным подтверждением: <lua>событием `Ev.TAKEOFF_COMPLETE`</lua><py>состоянием `MISSION`</py>.' },
            { lua: 'leds:set(0, 0, 1, 0)', python: 'pioneer.led_control(0, 0, 255, 0)', text: 'Только после подтверждения светодиод становится зелёным: взлёт действительно завершён.' }
        ],
        watch: 'Светодиод сначала синий, высота дрона растёт постепенно, и только в конце подъёма свет становится зелёным, а в журнале появляется «Подъём закончен».'
    },
    38: {
        theory: [
            'Положение дрона задают три числа. `X` и `Y` — точка на плоскости земли, `Z` — высота над ней в метрах. Запись `(x, y, z)` — это адрес точки в пространстве.',
            'Каждое число отвечает за своё направление и меняется независимо от других. Если изменить только `Z`, дрон поднимется или опустится на месте, а если только `Y` — сдвинется вдоль одной оси.',
            'Чтобы понять, что делает каждая ось, меняйте за один раз одно число и смотрите, куда полетит дрон. Остальные координаты в это время оставляйте теми же.',
            'Команда <lua>`ap.goToLocalPoint(x, y, z)`</lua><py>`pioneer.go_to_local_point(x, y, z)`</py> отправляет дрон в точку; числа идут строго в порядке X, Y, Z. <lua>О прибытии автопилот сообщает событием `Ev.POINT_REACHED`</lua><py>О прибытии говорит `pioneer.point_reached()`: он становится `True`</py>, и только после него отправляют следующую цель.'
        ],
        lua: `local leds = Ledbar.new(29)
local phase = 0

ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then phase = 1; ap.goToLocalPoint(0, 2, 1) end
    if event == Ev.POINT_REACHED and phase == 1 then
        phase = 2
        ap.goToLocalPoint(0, 2, 3)
    end
end`,
        python: `${PY_HEAD}
pioneer.arm()
pioneer.takeoff()
${PY_WAIT_TAKEOFF}
pioneer.go_to_local_point(0, 2, 1)
${PY_WAIT_POINT}
pioneer.go_to_local_point(0, 2, 3)
${PY_WAIT_POINT}`,
        steps: [
            { lua: 'ap.goToLocalPoint(0, 2, 1)', python: 'pioneer.go_to_local_point(0, 2, 1)', text: 'Первая цель: X остаётся нулевым, Y равен 2, Z равен 1. Дрон смещается вдоль оси Y.' },
            { lua: 'if event == Ev.POINT_REACHED and phase == 1 then', python: PY_WAIT_POINT, text: 'Вторую цель отправляем только после прибытия в первую.' },
            { lua: 'ap.goToLocalPoint(0, 2, 3)', python: 'pioneer.go_to_local_point(0, 2, 3)', text: 'Во второй цели X и Y прежние, меняется только Z, поэтому дрон поднимается вертикально.' }
        ],
        watch: 'Дрон сначала летит вбок вдоль оси Y на высоте 1 метр, а потом поднимается вверх до 3 метров, не смещаясь в стороны.'
    },
    39: {
        theory: [
            'Знак координаты выбирает сторону от начала отсчёта. Плюс — в одну сторону вдоль оси, минус — в противоположную, а ноль — это сама точка отсчёта.',
            'Какая сторона положительная, определяют оси сцены, а не ваши представления «вперёд» или «влево». Проверьте это в симуляторе, а не угадывайте.',
            'Расстояние между точками `3` и `-3` равно шести метрам, а не трём: это модуль разности координат. Путь проходит через начало отсчёта.'
        ],
        lua: `local leds = Ledbar.new(29)
local phase = 0

ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then phase = 1; ap.goToLocalPoint(0, 3, 1) end
    if event == Ev.POINT_REACHED and phase == 1 then
        print("Y = +3: плюсовая сторона")
        phase = 2; ap.goToLocalPoint(0, -3, 1)
        return
    end
    if event == Ev.POINT_REACHED and phase == 2 then print("Y = -3: минусовая сторона") end
end`,
        python: `${PY_HEAD}
pioneer.arm()
pioneer.takeoff()
${PY_WAIT_TAKEOFF}
pioneer.go_to_local_point(0, 3, 1)
${PY_WAIT_POINT}
print("Y = +3: плюсовая сторона")
pioneer.go_to_local_point(0, -3, 1)
${PY_WAIT_POINT}
print("Y = -3: минусовая сторона")`,
        steps: [
            { lua: 'ap.goToLocalPoint(0, 3, 1)', python: 'pioneer.go_to_local_point(0, 3, 1)', text: 'Положительное значение Y: дрон уходит в одну сторону от начала отсчёта.' },
            { lua: 'print("Y = +3: плюсовая сторона")', python: 'print("Y = +3: плюсовая сторона")', text: 'Сообщение подписывает сторону сразу после прибытия, чтобы её не перепутать.' },
            { lua: 'ap.goToLocalPoint(0, -3, 1)', python: 'pioneer.go_to_local_point(0, -3, 1)', text: 'Отрицательное значение Y: дрон проходит через начало отсчёта и оказывается с другой стороны.' }
        ],
        watch: 'Дрон улетает на 3 метра в одну сторону вдоль оси Y, затем проходит через начало отсчёта и оказывается на 3 метра с другой стороны; в журнале подписаны обе стороны.'
    },
    40: {
        theory: [
            'Координаты всегда отсчитываются от какого-то начала и вдоль определённых осей — это система отсчёта. Пока вы не знаете, откуда считают, число `(1, 0, 1)` ничего не значит.',
            'Цель в <lua>`goToLocalPoint` и положение из `Sensors.lpsPosition()`</lua><py>`go_to_local_point` и положение из `get_local_position_lps()`</py> относятся к одной системе — к осям сцены. Цель — это адрес в сцене, а не сдвиг от текущего места.',
            'В этом симуляторе после сброса дрон стоит в начале осей `(0, 0, 0)`. Это совпадение, а не закон: положение старта лучше прочитать и сохранить, чем рассчитывать на нули.'
        ],
        lua: `local leds = Ledbar.new(29)
local x, y, z = Sensors.lpsPosition()
print("Старт: " .. x .. ", " .. y .. ", " .. z)

ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then ap.goToLocalPoint(0, 2, 1) end
    if event == Ev.POINT_REACHED then
        local px, py, pz = Sensors.lpsPosition()
        print("Цель (0, 2, 1), измерено: " .. px .. ", " .. py .. ", " .. pz)
    end
end`,
        python: `${PY_HEAD}
x, y, z = pioneer.get_local_position_lps()
print("Старт:", x, y, z)
pioneer.arm()
pioneer.takeoff()
${PY_WAIT_TAKEOFF}
pioneer.go_to_local_point(0, 2, 1)
${PY_WAIT_POINT}
x, y, z = pioneer.get_local_position_lps()
print("Цель (0, 2, 1), измерено:", x, y, z)`,
        steps: [
            { lua: 'local x, y, z = Sensors.lpsPosition()', python: 'x, y, z = pioneer.get_local_position_lps()', text: 'Положение читаем до подготовки, пока дрон стоит на старте. Это координаты сцены.' },
            { lua: 'ap.goToLocalPoint(0, 2, 1)', python: 'pioneer.go_to_local_point(0, 2, 1)', text: 'Цель задана в тех же координатах сцены: летим в точку (0, 2, 1), а не на 2 метра от текущего места.' },
            { lua: 'print("Цель (0, 2, 1), измерено: " .. px .. ", " .. py .. ", " .. pz)', python: 'print("Цель (0, 2, 1), измерено:", x, y, z)', text: 'После прибытия сравниваем измеренное положение с целью: система отсчёта у них одна.' }
        ],
        watch: 'В журнале сначала стартовые координаты, а после прилёта измеренные координаты близки к цели (0, 2, 1), потому что цель и измерение считаются в одной системе.'
    },
    41: {
        theory: [
            'Точка маршрута — это адрес цели `(x, y, z)`. Команда <lua>`ap.goToLocalPoint(x, y, z)`</lua><py>`go_to_local_point(x, y, z)`</py> сообщает автопилоту, куда лететь.',
            'Команда не переносит дрон мгновенно: в момент её отправки он ещё на старом месте. Автопилот строит движение к цели постепенно, и это занимает секунды.',
            'Отправлять команду можно только после окончания взлёта, когда дрон уже висит в воздухе. Прибытие в точку приходит отдельным подтверждением.'
        ],
        lua: `local leds = Ledbar.new(29)

ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then
        ap.goToLocalPoint(2, 1, 2)
        local x, y, z = Sensors.lpsPosition()
        print("Команда отправлена, дрон ещё здесь: " .. x .. ", " .. y .. ", " .. z)
    end
    if event == Ev.POINT_REACHED then
        local x, y, z = Sensors.lpsPosition()
        print("Дрон прибыл: " .. x .. ", " .. y .. ", " .. z)
    end
end`,
        python: `${PY_HEAD}
pioneer.arm()
pioneer.takeoff()
${PY_WAIT_TAKEOFF}
pioneer.go_to_local_point(2, 1, 2)
x, y, z = pioneer.get_local_position_lps()
print("Команда отправлена, дрон ещё здесь:", x, y, z)
${PY_WAIT_POINT}
x, y, z = pioneer.get_local_position_lps()
print("Дрон прибыл:", x, y, z)`,
        steps: [
            { lua: 'ap.goToLocalPoint(2, 1, 2)', python: 'pioneer.go_to_local_point(2, 1, 2)', text: 'Команда задаёт цель (2, 1, 2). Она только запускает движение.' },
            { lua: 'print("Команда отправлена, дрон ещё здесь: " .. x .. ", " .. y .. ", " .. z)', python: 'print("Команда отправлена, дрон ещё здесь:", x, y, z)', text: 'Сразу после команды положение почти прежнее: дрон ещё не успел двинуться.' },
            { lua: 'if event == Ev.POINT_REACHED then', python: PY_WAIT_POINT, text: 'Движение занимает время; прибытие подтверждается отдельно.' },
            { lua: 'print("Дрон прибыл: " .. x .. ", " .. y .. ", " .. z)', python: 'print("Дрон прибыл:", x, y, z)', text: 'Только теперь измеренное положение совпадает с целью.' }
        ],
        watch: 'Сразу после команды в журнале почти стартовые координаты, затем дрон медленно летит к (2, 1, 2), и лишь после прибытия координаты совпадают с целью.'
    },
    42: {
        theory: [
            '`Z` — это высота в системе сцены, от нулевого уровня земли. Дальномер <lua>`Sensors.range()`</lua><py>`get_dist_sensor_data()`</py> измеряет другое: расстояние от дрона вниз до поверхности под ним.',
            'Над ровной землёй эти два числа совпадают. Над холмом поверхность выше нуля, поэтому при той же `Z` просвет меньше: между дроном и холмом остаётся меньше места.',
            'Безопасная высота — это не только `Z`, но и просвет под дроном. Над неровной местностью сравнивайте оба числа.'
        ],
        lua: `local leds = Ledbar.new(29)

ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then
        local x, y, z = Sensors.lpsPosition()
        print("Над ровным местом: Z = " .. z .. ", просвет = " .. Sensors.range())
        ap.goToLocalPoint(6, 0, 2)
    end
    if event == Ev.POINT_REACHED then
        local x, y, z = Sensors.lpsPosition()
        print("Над холмом: Z = " .. z .. ", просвет = " .. Sensors.range())
    end
end`,
        python: `${PY_HEAD}
pioneer.arm()
pioneer.takeoff()
${PY_WAIT_TAKEOFF}
x, y, z = pioneer.get_local_position_lps()
print("Над ровным местом: Z =", z, "просвет =", pioneer.get_dist_sensor_data())
pioneer.go_to_local_point(6, 0, 2)
${PY_WAIT_POINT}
x, y, z = pioneer.get_local_position_lps()
print("Над холмом: Z =", z, "просвет =", pioneer.get_dist_sensor_data())`,
        steps: [
            { lua: 'print("Над ровным местом: Z = " .. z .. ", просвет = " .. Sensors.range())', python: 'print("Над ровным местом: Z =", z, "просвет =", pioneer.get_dist_sensor_data())', text: 'Над ровной землёй высота Z и показание дальномера одинаковы.' },
            { lua: 'ap.goToLocalPoint(6, 0, 2)', python: 'pioneer.go_to_local_point(6, 0, 2)', text: 'Летим к точке над холмом, который стоит в (6, 0).' },
            { lua: 'print("Над холмом: Z = " .. z .. ", просвет = " .. Sensors.range())', python: 'print("Над холмом: Z =", z, "просвет =", pioneer.get_dist_sensor_data())', text: 'Над холмом Z равна 2, а просвет меньше: дальномер видит поверхность холма, а не нулевой уровень.' }
        ],
        watch: 'В журнале над ровным местом Z и просвет равны, а над холмом при Z = 2 просвет заметно меньше: поверхность под дроном выше нуля.'
    },
    43: {
        theory: [
            'Расстояние до цели — это разность координат: целевое значение минус измеренное. Например, до цели `Y = 3` из положения `Y = 1` осталось `3 - 1 = 2` метра.',
            'Измеренное положение нужно читать заново на каждом шаге, иначе число никогда не изменится. По мере приближения разность уменьшается и у цели становится почти нулём.',
            'Знак тоже несёт смысл: плюс значит «цель ещё впереди по оси», минус — «цель уже позади». Пока мы следим за одной осью, этого достаточно.'
        ],
        lua: `local leds = Ledbar.new(29)
local arrived = false

function measure()
    if arrived then return end
    local x, y, z = Sensors.lpsPosition()
    print("До цели по Y: " .. (3 - y))
    Timer.callLater(1, measure)
end

ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then ap.goToLocalPoint(0, 3, 1); measure() end
    if event == Ev.POINT_REACHED then arrived = true end
end`,
        python: `${PY_HEAD}
pioneer.arm()
pioneer.takeoff()
${PY_WAIT_TAKEOFF}
pioneer.go_to_local_point(0, 3, 1)
while not pioneer.point_reached():
    x, y, z = pioneer.get_local_position_lps()
    print("До цели по Y:", 3 - y)
    time.sleep(1)`,
        steps: [
            { lua: 'ap.goToLocalPoint(0, 3, 1); measure()', python: 'pioneer.go_to_local_point(0, 3, 1)', text: 'Отправляем дрон к цели Y = 3 и сразу начинаем измерять оставшееся расстояние.' },
            { lua: 'local x, y, z = Sensors.lpsPosition()', python: 'x, y, z = pioneer.get_local_position_lps()', text: 'На каждом шаге читаем положение заново: цель не меняется, а измерение — да.' },
            { lua: 'print("До цели по Y: " .. (3 - y))', python: 'print("До цели по Y:", 3 - y)', text: 'Разность «цель минус измерение» показывает, сколько метров осталось вдоль оси Y.' },
            { lua: 'Timer.callLater(1, measure)', python: 'time.sleep(1)', text: 'Измеряем раз в секунду, пока дрон не прибыл.' }
        ],
        watch: 'Пока дрон летит к Y = 3, раз в секунду в журнале появляется число «До цели по Y», и оно убывает от трёх метров почти до нуля.'
    },
    44: {
        theory: [
            'Измерения положения и управление движением неточны: дрон останавливается рядом с целью, а не в математической точке. Поэтому вместо `3` координата может оказаться, например, `2.9987`.',
            'Условие «X равно ровно 3» из-за этого может не выполниться никогда. Надёжнее спросить, достаточно ли мала ошибка: <lua>`math.abs(3 - x) < 0.15`</lua><py>`abs(3 - x) < 0.15`</py> — «до цели меньше 15 сантиметров».',
            'Число `0.15` называется допуском. Он не меняет полёт, а лишь задаёт область, в которой мы считаем цель достигнутой. Допуск выбирают под задачу.'
        ],
        lua: `local leds = Ledbar.new(29)

ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then ap.goToLocalPoint(3, 0, 1) end
    if event == Ev.POINT_REACHED then
        local x, y, z = Sensors.lpsPosition()
        print("X = " .. x)
        print("Точное равенство X == 3: " .. tostring(x == 3))
        print("Допуск 0.15: " .. tostring(math.abs(3 - x) < 0.15))
    end
end`,
        python: `${PY_HEAD}
pioneer.arm()
pioneer.takeoff()
${PY_WAIT_TAKEOFF}
pioneer.go_to_local_point(3, 0, 1)
${PY_WAIT_POINT}
x, y, z = pioneer.get_local_position_lps()
print("X =", x)
print("Точное равенство X == 3:", x == 3)
print("Допуск 0.15:", abs(3 - x) < 0.15)`,
        steps: [
            { lua: 'ap.goToLocalPoint(3, 0, 1)', python: 'pioneer.go_to_local_point(3, 0, 1)', text: 'Цель по X равна 3. После прибытия проверим, насколько точно дрон в неё попал.' },
            { lua: 'print("X = " .. x)', python: 'print("X =", x)', text: 'Выводим измеренный X целиком, со всеми знаками после запятой.' },
            { lua: 'print("Точное равенство X == 3: " .. tostring(x == 3))', python: 'print("Точное равенство X == 3:", x == 3)', text: 'Проверка на точное равенство хрупкая: малейшая погрешность делает её ложной.' },
            { lua: 'math.abs(3 - x) < 0.15', python: 'abs(3 - x) < 0.15', text: 'Проверка с допуском спрашивает, меньше ли ошибка 15 сантиметров, и поэтому надёжно распознаёт прибытие.' }
        ],
        watch: 'После прибытия в журнале выводится измеренный X и две проверки: точное равенство с 3 и попадание в допуск 0.15; вторая надёжно показывает «истина».'
    },
    45: {
        theory: [
            'Курс (по-английски yaw) — это направление, куда повёрнут корпус дрона. Поворот на месте меняет курс, но не меняет `X`, `Y` и `Z`; от курса зависит, куда смотрит камера.',
            'Угол задают в радианах: 180 градусов — это `math.pi`, 90 градусов — `math.pi / 2`. Положительный и отрицательный углы означают повороты в разные стороны.',
            '<lua>Курс меняет команда `ap.updateYaw(угол)`.</lua><py>У команды движения есть параметр `yaw`: цель с прежними координатами и новым курсом.</py> Поворот занимает время, поэтому после него немного подождите.'
        ],
        lua: `local leds = Ledbar.new(29)

ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then ap.goToLocalPoint(1, 0, 1) end
    if event == Ev.POINT_REACHED then
        ap.updateYaw(math.pi)
        Timer.callLater(2, function()
            local x, y, z = Sensors.lpsPosition()
            print("Курс изменён, положение: " .. x .. ", " .. y .. ", " .. z)
        end)
    end
end`,
        python: `from pioneer_sdk import Pioneer
import math
import time

pioneer = Pioneer(simulator=True)
pioneer.arm()
pioneer.takeoff()
${PY_WAIT_TAKEOFF}
pioneer.go_to_local_point(1, 0, 1)
${PY_WAIT_POINT}
pioneer.go_to_local_point(1, 0, 1, yaw=math.pi)
time.sleep(2)
x, y, z = pioneer.get_local_position_lps()
print("Курс изменён, положение:", x, y, z)`,
        steps: [
            { lua: 'ap.goToLocalPoint(1, 0, 1)', python: 'pioneer.go_to_local_point(1, 0, 1)', text: 'Сначала обычный перелёт в точку (1, 0, 1).' },
            { lua: 'ap.updateYaw(math.pi)', python: 'pioneer.go_to_local_point(1, 0, 1, yaw=math.pi)', text: 'Поворот на 180 градусов: math.pi радиан. Координаты остаются прежними, меняется только курс.' },
            { lua: 'Timer.callLater(2, function()', python: 'time.sleep(2)', text: 'Даём дрону две секунды, чтобы корпус успел развернуться.' },
            { lua: 'print("Курс изменён, положение: " .. x .. ", " .. y .. ", " .. z)', python: 'print("Курс изменён, положение:", x, y, z)', text: 'Положение после поворота почти такое же, как до него: дрон развернулся на месте.' }
        ],
        watch: 'Дрон прилетает в точку (1, 0, 1), затем разворачивается на месте на 180 градусов, а в журнале видно, что координаты почти не изменились.'
    }
};
