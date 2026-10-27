import type { ChapterExamples } from '../example.js';

/* The waiting loops are the same in every Python example of the chapter, so they are written once. */
const PY_HEAD = `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)`;
const PY_WAIT_TAKEOFF = `while pioneer.get_autopilot_state() != "MISSION":
    time.sleep(0.05)`;
const PY_WAIT_POINT = `while not pioneer.point_reached():
    time.sleep(0.05)`;
const PY_WAIT_LANDED = `while pioneer.get_autopilot_state() != "DISARMED":
    time.sleep(0.05)`;
/** The same waiting loop inside a function or a loop body. */
const indent = (code: string): string => code.replace(/^/gm, '    ');

/** Examples of the chapter, by lesson number. */
export const ROUTES_EXAMPLES: ChapterExamples = {
    46: {
        theory: [
            'Команда движения лишь отправляет цель. Она ничего не говорит о том, что дрон уже долетел: пока вы читаете следующую строку программы, он ещё в пути.',
            'Прибытие подтверждает автопилот: в Lua приходит событие `Ev.POINT_REACHED`, в Python `point_reached()` возвращает `True`. Только после этого следующее действие имеет смысл.',
            'Сообщение «прибыл» выводите именно в этот момент. Если напечатать его сразу после команды, журнал будет врать: дрон ещё летит.'
        ],
        lua: `local leds = Ledbar.new(29)

ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then
        ap.goToLocalPoint(0, 3, 1)
        print("Команда отправлена")
    end
    if event == Ev.POINT_REACHED then
        print("Прибыл в точку")
        leds:set(0, 0, 1, 0)
    end
end`,
        python: `${PY_HEAD}
pioneer.arm()
pioneer.takeoff()
${PY_WAIT_TAKEOFF}
pioneer.go_to_local_point(0, 3, 1)
print("Команда отправлена")
${PY_WAIT_POINT}
print("Прибыл в точку")
pioneer.led_control(0, 0, 255, 0)`,
        steps: [
            { lua: 'ap.goToLocalPoint(0, 3, 1)', python: 'pioneer.go_to_local_point(0, 3, 1)', text: 'Отправляем цель. Дрон только начинает движение.' },
            { lua: 'print("Команда отправлена")', python: 'print("Команда отправлена")', text: 'Это сообщение описывает отправку, а не прибытие: оно появится сразу.' },
            { lua: 'if event == Ev.POINT_REACHED then', python: PY_WAIT_POINT, text: 'Ждём подтверждения: событие в Lua, цикл с point_reached() в Python.' },
            { lua: 'print("Прибыл в точку")', python: 'print("Прибыл в точку")', text: 'Сообщение о прибытии выводим только после подтверждения; рядом включаем зелёный светодиод.' }
        ],
        watch: 'Сообщение «Команда отправлена» появляется сразу, а «Прибыл в точку» и зелёный светодиод — только когда дрон долетел до (0, 3, 1).'
    },
    47: {
        theory: [
            'Маршрут из двух точек — это две команды движения, идущие по порядку. Вторую цель отправляют только тогда, когда подтверждено прибытие в первую.',
            'Если отправить обе команды подряд, автопилот просто заменит первую цель второй, и первая точка будет пропущена. Порядок команд в тексте программы не гарантирует порядок посещения.',
            'В Lua номер этапа хранит переменная `phase`: по ней обработчик понимает, какое по счёту прибытие пришло. В Python порядок задаёт сама последовательность строк и ожидание после каждой команды.'
        ],
        lua: `local leds = Ledbar.new(29)
local phase = 0

ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then phase = 1; ap.goToLocalPoint(3, 0, 1) end
    if event == Ev.POINT_REACHED then
        print("Прибыл, этап " .. phase)
        if phase == 1 then phase = 2; ap.goToLocalPoint(3, -2, 1) end
    end
end`,
        python: `${PY_HEAD}
pioneer.arm()
pioneer.takeoff()
${PY_WAIT_TAKEOFF}
pioneer.go_to_local_point(3, 0, 1)
${PY_WAIT_POINT}
print("Прибыл, этап 1")
pioneer.go_to_local_point(3, -2, 1)
${PY_WAIT_POINT}
print("Прибыл, этап 2")`,
        steps: [
            { lua: 'phase = 1; ap.goToLocalPoint(3, 0, 1)', python: 'pioneer.go_to_local_point(3, 0, 1)', text: 'Первая цель. В Lua заодно запоминаем, что идёт первый этап.' },
            { lua: 'print("Прибыл, этап " .. phase)', python: 'print("Прибыл, этап 1")', text: 'Прибытие в первую точку подтверждено и записано в журнал.' },
            { lua: 'if phase == 1 then phase = 2; ap.goToLocalPoint(3, -2, 1) end', python: 'pioneer.go_to_local_point(3, -2, 1)', text: 'Вторая цель отправляется только после первого прибытия. В Lua это условие по номеру этапа.' }
        ],
        watch: 'Дрон сначала долетает до (3, 0, 1), в журнале появляется «этап 1», и только потом он летит к (3, -2, 1) и пишет «этап 2».'
    },
    48: {
        theory: [
            'Ломаная — это путь из прямых отрезков, соединённых вершинами. Угол — самая короткая ломаная: два отрезка и одна вершина между ними.',
            'Прямая от старта к финишу и путь через вершину заканчиваются в одной точке, но дрон летит по разным линиям. Форму пути определяют все точки, в которых дрон побывал, а не только последняя.',
            'Чтобы вершина действительно была посещена, дождитесь прибытия в неё и только потом отправляйте следующую цель. Вершину удобно отметить светодиодом.'
        ],
        lua: `local leds = Ledbar.new(29)
local phase = 0

ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then phase = 1; ap.goToLocalPoint(-2, 0, 1) end
    if event == Ev.POINT_REACHED and phase == 1 then
        print("Вершина угла")
        leds:set(0, 1, 1, 0)
        phase = 2; ap.goToLocalPoint(-2, -3, 1)
        return
    end
    if event == Ev.POINT_REACHED and phase == 2 then print("Угол пройден") end
end`,
        python: `${PY_HEAD}
pioneer.arm()
pioneer.takeoff()
${PY_WAIT_TAKEOFF}
pioneer.go_to_local_point(-2, 0, 1)
${PY_WAIT_POINT}
print("Вершина угла")
pioneer.led_control(0, 255, 255, 0)
pioneer.go_to_local_point(-2, -3, 1)
${PY_WAIT_POINT}
print("Угол пройден")`,
        steps: [
            { lua: 'ap.goToLocalPoint(-2, 0, 1)', python: 'pioneer.go_to_local_point(-2, 0, 1)', text: 'Первый отрезок ведёт к вершине угла (-2, 0, 1).' },
            { lua: 'leds:set(0, 1, 1, 0)', python: 'pioneer.led_control(0, 255, 255, 0)', text: 'В вершине дрон действительно побывал: светодиод становится жёлтым.' },
            { lua: 'ap.goToLocalPoint(-2, -3, 1)', python: 'pioneer.go_to_local_point(-2, -3, 1)', text: 'Второй отрезок меняет направление: теперь меняется Y, а X остаётся прежним.' },
            { lua: 'print("Угол пройден")', python: 'print("Угол пройден")', text: 'Маршрут закончен после прибытия в конечную точку.' }
        ],
        watch: 'Дрон летит к вершине (-2, 0, 1), там светодиод становится жёлтым, затем дрон поворачивает и летит к (-2, -3, 1); след полёта образует угол.'
    },
    49: {
        theory: [
            'Квадрат — это четыре отрезка и четыре вершины. Чтобы замкнуть его, нужно побывать в каждой вершине по очереди и вернуться в начальную точку.',
            'Все вершины строятся из знакомых чисел: у квадрата со стороной 3 координаты меняются на 3, а одна из них на каждом отрезке остаётся прежней. Высоту удобно держать одинаковой.',
            'Каждую вершину подтверждайте отдельно. Если пропустить промежуточную, дрон срежет угол, и фигура уже не будет квадратом. Повторяющийся кусок удобно оформить функцией.'
        ],
        lua: `local leds = Ledbar.new(29)
local phase = 0

ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then phase = 1; ap.goToLocalPoint(-3, 0, 1) end
    if event == Ev.POINT_REACHED then
        phase = phase + 1
        if phase == 2 then ap.goToLocalPoint(-3, -3, 1) end
        if phase == 3 then ap.goToLocalPoint(0, -3, 1) end
        if phase == 4 then ap.goToLocalPoint(0, 0, 1) end
        if phase == 5 then print("Квадрат замкнут") end
    end
end`,
        python: `${PY_HEAD}

def fly(x, y):
    pioneer.go_to_local_point(x, y, 1)
${indent(PY_WAIT_POINT)}

pioneer.arm()
pioneer.takeoff()
${PY_WAIT_TAKEOFF}
fly(-3, 0)
fly(-3, -3)
fly(0, -3)
fly(0, 0)
print("Квадрат замкнут")`,
        steps: [
            { lua: 'phase = 1; ap.goToLocalPoint(-3, 0, 1)', python: 'fly(-3, 0)', text: 'Первая сторона квадрата идёт вдоль оси X в отрицательную сторону.' },
            { lua: 'phase = phase + 1', python: `def fly(x, y):\n    pioneer.go_to_local_point(x, y, 1)\n${indent(PY_WAIT_POINT)}`, text: 'Каждое прибытие переводит программу к следующему этапу. В Python это делает функция fly: она отправляет цель и ждёт прибытия.' },
            { lua: 'if phase == 3 then ap.goToLocalPoint(0, -3, 1) end', python: 'fly(0, -3)', text: 'Третья вершина. Каждая новая точка меняет одну координату относительно предыдущей.' },
            { lua: 'if phase == 5 then print("Квадрат замкнут") end', python: 'print("Квадрат замкнут")', text: 'После возвращения в (0, 0, 1) все четыре стороны пройдены.' }
        ],
        watch: 'Дрон обходит квадрат со стороной 3 метра, поворачивая в каждой вершине, и возвращается в начальную точку; в конце в журнале «Квадрат замкнут».'
    },
    50: {
        theory: [
            'Маршрут можно разделить на данные и логику. Данные — список точек; логика — одно правило: «долететь до следующей точки и после прибытия взять следующую».',
            'В Lua список — таблица `points`, а переменная `i` хранит номер текущей точки. В Python список обходят циклом `for point in points`: внутри цикла команда и ожидание прибытия.',
            'Теперь, чтобы изменить маршрут, достаточно изменить список: добавить, убрать или поменять точку. Алгоритм ожидания остаётся прежним.'
        ],
        lua: `local leds = Ledbar.new(29)
local points = {{1, 0, 1}, {1, 1, 1}, {2, 1, 1}, {2, 2, 1}, {3, 2, 1}}
local i = 0

function nextPoint()
    i = i + 1
    if points[i] then ap.goToLocalPoint(points[i][1], points[i][2], points[i][3])
    else print("Маршрут закончен") end
end

ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then nextPoint() end
    if event == Ev.POINT_REACHED then print("Прибыл в точку " .. i); nextPoint() end
end`,
        python: `${PY_HEAD}
points = [(1, 0, 1), (1, 1, 1), (2, 1, 1), (2, 2, 1), (3, 2, 1)]
pioneer.arm()
pioneer.takeoff()
${PY_WAIT_TAKEOFF}
for point in points:
    pioneer.go_to_local_point(*point)
${indent(PY_WAIT_POINT)}
    print("Прибыл в точку", point)
print("Маршрут закончен")`,
        steps: [
            { lua: 'local points = {{1, 0, 1}, {1, 1, 1}, {2, 1, 1}, {2, 2, 1}, {3, 2, 1}}', python: 'points = [(1, 0, 1), (1, 1, 1), (2, 1, 1), (2, 2, 1), (3, 2, 1)]', text: 'Все точки маршрута записаны в одном списке: «лесенка» из пяти точек. Это данные.' },
            { lua: 'i = i + 1', python: 'for point in points:', text: 'Алгоритм берёт точки по очереди: в Lua увеличивает номер i, в Python цикл сам переходит к следующему элементу.' },
            { lua: 'ap.goToLocalPoint(points[i][1], points[i][2], points[i][3])', python: 'pioneer.go_to_local_point(*point)', text: 'Одна и та же команда летит к очередной точке списка. В Python звёздочка раскладывает тройку на x, y и z.' },
            { lua: 'if event == Ev.POINT_REACHED then print("Прибыл в точку " .. i); nextPoint() end', python: indent(PY_WAIT_POINT), text: 'После подтверждения прибытия берём следующую точку. Когда точки кончились, маршрут закончен.' }
        ],
        watch: 'Дрон проходит пять точек «лесенкой» одну за другой, в журнале после каждой точки появляется сообщение, а в конце — «Маршрут закончен».'
    },
    51: {
        theory: [
            '«Домой» — это не обязательно точка `(0, 0)`. Это положение, в котором дрон стоял до взлёта. Его нужно измерить и сохранить в переменные, пока дрон ещё на земле.',
            'Сохранённые `homeX` и `homeY` можно использовать и как цель возвращения, и как опорную точку: например, `homeX + 3` — на три метра дальше старта по X.',
            'Если стартовая площадка окажется не в нулях, маршрут всё равно вернётся именно на неё. Буквальные `(0, 0)` в таком случае отправили бы дрон в другое место.'
        ],
        lua: `local leds = Ledbar.new(29)
local homeX, homeY, homeZ = Sensors.lpsPosition()
local phase = 0

ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then phase = 1; ap.goToLocalPoint(homeX + 3, homeY - 2, 1) end
    if event == Ev.POINT_REACHED and phase == 1 then
        print("Возвращаюсь домой: " .. homeX .. ", " .. homeY)
        phase = 2; ap.goToLocalPoint(homeX, homeY, 1)
    end
end`,
        python: `${PY_HEAD}
homeX, homeY, homeZ = pioneer.get_local_position_lps()
pioneer.arm()
pioneer.takeoff()
${PY_WAIT_TAKEOFF}
pioneer.go_to_local_point(homeX + 3, homeY - 2, 1)
${PY_WAIT_POINT}
print("Возвращаюсь домой:", homeX, homeY)
pioneer.go_to_local_point(homeX, homeY, 1)
${PY_WAIT_POINT}`,
        steps: [
            { lua: 'local homeX, homeY, homeZ = Sensors.lpsPosition()', python: 'homeX, homeY, homeZ = pioneer.get_local_position_lps()', text: 'Дом запоминаем до подготовки, пока дрон стоит на старте.' },
            { lua: 'ap.goToLocalPoint(homeX + 3, homeY - 2, 1)', python: 'pioneer.go_to_local_point(homeX + 3, homeY - 2, 1)', text: 'Первая цель строится от дома: на 3 метра дальше по X и на 2 метра меньше по Y.' },
            { lua: 'print("Возвращаюсь домой: " .. homeX .. ", " .. homeY)', python: 'print("Возвращаюсь домой:", homeX, homeY)', text: 'После прибытия сообщаем, какую сохранённую точку берём целью.' },
            { lua: 'ap.goToLocalPoint(homeX, homeY, 1)', python: 'pioneer.go_to_local_point(homeX, homeY, 1)', text: 'Последняя цель — сохранённые X и Y на высоте 1 метр, то есть точно над стартовой площадкой.' }
        ],
        watch: 'Дрон отлетает на 3 метра по X и на 2 метра по Y от стартовой площадки, затем возвращается ровно на неё и зависает над ней на высоте 1 метр.'
    },
    52: {
        theory: [
            'Посадка — это снижение до поверхности и остановка. Команда посадки (`Ev.MCE_LANDING` в Lua, `land()` в Python) только запускает этот процесс: в момент отправки дрон ещё в воздухе.',
            'Завершение подтверждает автопилот: событие `Ev.COPTER_LANDED` в Lua или состояние `DISARMED` в Python. Только после него можно считать, что дрон стоит на земле.',
            'Садиться нужно после прибытия в нужную точку. Если отправить посадку раньше, дрон начнёт снижаться, не долетев, и сядет не там, где вы планировали.'
        ],
        lua: `local leds = Ledbar.new(29)

ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then ap.goToLocalPoint(2, 2, 2) end
    if event == Ev.POINT_REACHED then
        print("Начинаю посадку")
        ap.push(Ev.MCE_LANDING)
    end
    if event == Ev.COPTER_LANDED then
        leds:set(0, 0, 1, 0)
        print("Посадка завершена")
    end
end`,
        python: `${PY_HEAD}
pioneer.arm()
pioneer.takeoff()
${PY_WAIT_TAKEOFF}
pioneer.go_to_local_point(2, 2, 2)
${PY_WAIT_POINT}
print("Начинаю посадку")
pioneer.land()
${PY_WAIT_LANDED}
pioneer.led_control(0, 0, 255, 0)
print("Посадка завершена")`,
        steps: [
            { lua: 'ap.goToLocalPoint(2, 2, 2)', python: 'pioneer.go_to_local_point(2, 2, 2)', text: 'Сначала долетаем до места посадки: точка (2, 2, 2) находится над площадкой на высоте 2 метра.' },
            { lua: 'ap.push(Ev.MCE_LANDING)', python: 'pioneer.land()', text: 'Посадку запускаем только после подтверждения прибытия. Команда начинает снижение, но не заканчивает его.' },
            { lua: 'if event == Ev.COPTER_LANDED then', python: PY_WAIT_LANDED, text: 'Конец посадки подтверждается отдельно: событием COPTER_LANDED в Lua или состоянием DISARMED в Python.' },
            { lua: 'print("Посадка завершена")', python: 'print("Посадка завершена")', text: 'Только после подтверждения пишем, что дрон сел, и включаем зелёный светодиод.' }
        ],
        watch: 'Дрон долетает до (2, 2, 2), в журнале появляется «Начинаю посадку», дрон плавно снижается, и только после касания земли загорается зелёный светодиод.'
    },
    53: {
        theory: [
            'Полный полёт собирается из знакомых этапов: подготовка, взлёт, движение к точке, посадка. Новых команд здесь нет, важна последовательность.',
            'Каждый этап запускается только после подтверждения предыдущего: моторы запущены, взлёт завершён, точка достигнута, дрон сел. Если что-то пошло не так, видно, на каком этапе программа остановилась.',
            'Фиксированная пауза вместо подтверждения — риск: если этап занял больше времени, следующая команда придёт слишком рано. Цвет светодиода удобно использовать как индикатор этапа.'
        ],
        lua: `local leds = Ledbar.new(29)

ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then leds:set(0, 0, 0, 1); ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then ap.goToLocalPoint(-1, 2, 1.5) end
    if event == Ev.POINT_REACHED then ap.push(Ev.MCE_LANDING) end
    if event == Ev.COPTER_LANDED then
        leds:set(0, 0, 1, 0)
        print("Миссия завершена")
    end
end`,
        python: `${PY_HEAD}
pioneer.arm()
pioneer.led_control(0, 0, 0, 255)
pioneer.takeoff()
${PY_WAIT_TAKEOFF}
pioneer.go_to_local_point(-1, 2, 1.5)
${PY_WAIT_POINT}
pioneer.land()
${PY_WAIT_LANDED}
pioneer.led_control(0, 0, 255, 0)
print("Миссия завершена")`,
        steps: [
            { lua: 'ap.push(Ev.MCE_PREFLIGHT)', python: 'pioneer.arm()', text: 'Этап 1: подготовка. Когда моторы запущены, светодиод становится синим и горит до конца полёта.' },
            { lua: 'ap.push(Ev.MCE_TAKEOFF)', python: 'pioneer.takeoff()', text: 'Этап 2: взлёт, после подтверждения подготовки.' },
            { lua: 'ap.goToLocalPoint(-1, 2, 1.5)', python: 'pioneer.go_to_local_point(-1, 2, 1.5)', text: 'Этап 3: полёт в точку (-1, 2, 1.5) после подтверждения взлёта.' },
            { lua: 'ap.push(Ev.MCE_LANDING)', python: 'pioneer.land()', text: 'Этап 4: посадка начинается только после подтверждения прибытия.' },
            { lua: 'print("Миссия завершена")', python: 'print("Миссия завершена")', text: 'Итог выводим после подтверждённой посадки, когда светодиод стал зелёным.' }
        ],
        watch: 'Светодиод синий с начала подготовки, дрон взлетает, летит к (-1, 2, 1.5), снижается и садится; зелёный свет и «Миссия завершена» появляются только после посадки.'
    },
    54: {
        theory: [
            'Один удачный запуск мог получиться случайно. Чтобы доверять программе, повторите ту же миссию несколько раз из одинаковых условий и сравните результаты.',
            'Перед каждым опытом сбрасывайте симулятор в исходное состояние и не меняйте код. Если менять код между запусками, вы сравниваете уже разные программы.',
            'Удобно, когда программа сама записывает итог, например координаты точки посадки. Тогда повторы сравниваются по числам в журнале, а не на глаз.'
        ],
        lua: `local leds = Ledbar.new(29)

ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then ap.goToLocalPoint(2, -1, 1) end
    if event == Ev.POINT_REACHED then ap.push(Ev.MCE_LANDING) end
    if event == Ev.COPTER_LANDED then
        local x, y, z = Sensors.lpsPosition()
        print("Посадка в точке: " .. x .. ", " .. y .. ", " .. z)
    end
end`,
        python: `${PY_HEAD}
pioneer.arm()
pioneer.takeoff()
${PY_WAIT_TAKEOFF}
pioneer.go_to_local_point(2, -1, 1)
${PY_WAIT_POINT}
pioneer.land()
${PY_WAIT_LANDED}
x, y, z = pioneer.get_local_position_lps()
print("Посадка в точке:", x, y, z)`,
        steps: [
            { lua: 'ap.goToLocalPoint(2, -1, 1)', python: 'pioneer.go_to_local_point(2, -1, 1)', text: 'Миссия не меняется от запуска к запуску: взлёт, точка (2, -1, 1), посадка.' },
            { lua: 'ap.push(Ev.MCE_LANDING)', python: 'pioneer.land()', text: 'Посадка начинается после подтверждения прибытия, как в прошлых уроках.' },
            { lua: 'local x, y, z = Sensors.lpsPosition()', python: 'x, y, z = pioneer.get_local_position_lps()', text: 'После посадки читаем итоговое положение: именно эти числа сравниваем между опытами.' },
            { lua: 'print("Посадка в точке: " .. x .. ", " .. y .. ", " .. z)', python: 'print("Посадка в точке:", x, y, z)', text: 'Запись в журнале делает результат опыта измеримым и сравнимым.' }
        ],
        watch: 'При каждом запуске дрон повторяет один и тот же полёт, и в журнале появляется строка «Посадка в точке» с почти одинаковыми числами от опыта к опыту.'
    }
};
