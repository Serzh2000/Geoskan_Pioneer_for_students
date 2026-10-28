import type { LessonExample } from '../example.js';

/** Examples of the extra practice tasks and the Blockly assignments, by topic (led-single, led-sequence, led-confirm, led-delayed, preflight, takeoff, route, point-confirm, mission, landing). */
export const TOPIC_EXAMPLES: Record<string, LessonExample> = {
    'led-single': {
        theory: [
            'Светодиод на дроне включается одной командой, в которой записано всё сразу: какой по счёту светодиод и какого цвета. Цвет складывается из трёх чисел: красного, зелёного и синего.',
            'Счёт светодиодов начинается с нуля: первый имеет номер `0`, второй — `1`. Яркость каждого цвета задаётся от <lua>0 до 1</lua><py>0 до 255</py>. Нули означают, что этот цвет выключен.',
            '<lua>Перед первой командой нужно создать ленту: `Ledbar.new(29)`. В блоках это «создать линейку светодиодов» с числом 29, а под ним — блок «установить для светодиода» с номером и тремя цветами.</lua><py>В блоках достаточно одного блока «Задать цвет светодиодов»: в нём номер светодиода (id) и три цвета R, G, B от 0 до 255.</py>'
        ],
        lua: `local leds = Ledbar.new(29)
leds:set(2, 0, 0, 1)

function callback(event)
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

pioneer.led_control(led_id=2, r=0, g=0, b=255)`,
        steps: [
            { lua: 'local leds = Ledbar.new(29)', text: 'Создаём ленту из 29 светодиодов. Без неё нечем управлять подсветкой.' },
            { lua: 'leds:set(2, 0, 0, 1)', python: 'pioneer.led_control(led_id=2, r=0, g=0, b=255)', text: 'Третий светодиод (номер 2) получает синий цвет: красный и зелёный равны нулю, синий включён на полную яркость.' }
        ],
        watch: 'На ленте дрона загорится один светодиод синим цветом, остальные останутся выключенными.'
    },
    'led-sequence': {
        theory: [
            'Команды выполняются почти мгновенно, поэтому три смены цвета подряд сольются в одну: глаз увидит только последний цвет. Чтобы смену можно было разглядеть, между командами нужны паузы.',
            '<py>Пауза записывается прямо в цепочке: `time.sleep(1.5)` останавливает программу на полторы секунды.</py><lua>Остановки программы нет: вы планируете действие на будущее через `Timer.callLater(1.5, ...)`, и остальная программа не ждёт.</lua>',
            '<lua>Время таймеров отсчитывается от запуска программы, а не от предыдущего таймера: цвета через 1.5 и 3 секунды означают «в полторы» и «в три», а не «полторы плюс три». В блоках это «через … сек сделать».</lua><py>Каждая пауза отсчитывается от предыдущей команды, поэтому два ожидания по полторы секунды дают три секунды от старта. В блоках это «Заснуть на … сек» между блоками цвета.</py>'
        ],
        lua: `local leds = Ledbar.new(29)
leds:set(2, 1, 0, 0)

Timer.callLater(1.5, function()
    leds:set(2, 1, 1, 0)
end)

Timer.callLater(3.0, function()
    leds:set(2, 0, 1, 0)
end)

function callback(event)
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

pioneer.led_control(led_id=2, r=255, g=0, b=0)
time.sleep(1.5)
pioneer.led_control(led_id=2, r=255, g=255, b=0)
time.sleep(1.5)
pioneer.led_control(led_id=2, r=0, g=255, b=0)`,
        steps: [
            { lua: 'leds:set(2, 1, 0, 0)', python: 'pioneer.led_control(led_id=2, r=255, g=0, b=0)', text: 'Сразу включаем красный, как на светофоре.' },
            { lua: 'Timer.callLater(1.5, function()\n    leds:set(2, 1, 1, 0)\nend)', python: 'time.sleep(1.5)\npioneer.led_control(led_id=2, r=255, g=255, b=0)', text: 'Через полторы секунды красный и зелёный вместе дают жёлтый. <py>Для этого программа ждёт.</py><lua>Для этого действие откладывается на таймер.</lua>' },
            { lua: 'Timer.callLater(3.0, function()\n    leds:set(2, 0, 1, 0)\nend)', python: 'time.sleep(1.5)\npioneer.led_control(led_id=2, r=0, g=255, b=0)', text: 'К третьей секунде от старта включается зелёный.<py> Это вторая пауза в полторы секунды после жёлтого.</py>' }
        ],
        watch: 'Один светодиод ведёт себя как светофор: сначала красный, через полторы секунды жёлтый, ещё через полторы зелёный.'
    },
    'led-confirm': {
        theory: [
            'Сообщение в журнале и цвет на ленте — два независимых канала. `print(...)` лишь записывает текст: он не проверяет, что светодиод действительно загорелся, и не знает, какого он цвета.',
            'Поэтому пишите сообщение сразу после команды, на которую оно ссылается, и сверяйте его с тем, что видите на сцене. Если текст есть, а цвета нет, значит ошибка в команде цвета, а не в журнале.',
            '<lua>В блоках это «установить для светодиода» и под ним «print» с текстом; пара «открыть/закрыть взаимодействие с автопилотом» нужна проверке в конце программы даже здесь, где автопилот не используется.</lua><py>В блоках это «Задать цвет светодиодов» и под ним «print», пара блоков не нужна.</py>'
        ],
        lua: `local leds = Ledbar.new(29)
leds:set(1, 1, 1, 0)
print("Жёлтый сигнал включён")

function callback(event)
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

pioneer.led_control(led_id=1, r=255, g=255, b=0)
print("Жёлтый сигнал включён")`,
        steps: [
            { lua: 'leds:set(1, 1, 1, 0)', python: 'pioneer.led_control(led_id=1, r=255, g=255, b=0)', text: 'Включаем жёлтый цвет на втором светодиоде (номер 1): красный и зелёный на полную яркость.' },
            { lua: 'print("Жёлтый сигнал включён")', python: 'print("Жёлтый сигнал включён")', text: 'Сообщение идёт сразу за командой цвета. Оно подтверждает только то, что программа дошла до этой строки.' }
        ],
        watch: 'В журнале появится «Жёлтый сигнал включён», а на ленте загорится жёлтый светодиод: сверьте текст с цветом на сцене.'
    },
    'led-delayed': {
        theory: [
            'Отложенное действие выполняется не сразу, а после паузы. Всё, что должно произойти «в тот же момент», нужно держать вместе: и цвет, и сообщение про него.',
            '<lua>Оба действия кладут внутрь одного `Timer.callLater(...)`. Если `print` оставить снаружи, он выполнится сразу при запуске и соврёт: сообщение будет, а светодиода ещё нет.</lua><py>Порядок строк и есть порядок во времени: сначала `time.sleep(...)`, потом цвет, потом `print`. Если `print` поставить до паузы, он выполнится сразу и соврёт: сообщение будет, а светодиода ещё нет.</py>',
            '<lua>В блоках: «через … сек сделать», а внутрь него — «установить для светодиода» и «print».</lua><py>В блоках: «Заснуть на … сек», затем «Задать цвет светодиодов» и «print».</py> Всё, что напечатано до паузы, проверка считает сообщением, пришедшим раньше сигнала, поэтому до паузы ничего не печатайте.'
        ],
        lua: `local leds = Ledbar.new(29)

Timer.callLater(2.0, function()
    leds:set(3, 1, 0, 1)
    print("Сигнал включён")
end)

function callback(event)
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

time.sleep(2)
pioneer.led_control(led_id=3, r=255, g=0, b=255)
print("Сигнал включён")`,
        steps: [
            { lua: 'Timer.callLater(2.0, function()', python: 'time.sleep(2)', text: 'Две секунды ожидания. <lua>Программа не стоит на месте, а планирует вложенный блок на потом.</lua><py>Программа просто ждёт.</py>' },
            { lua: 'leds:set(3, 1, 0, 1)\n    print("Сигнал включён")', python: 'pioneer.led_control(led_id=3, r=255, g=0, b=255)\nprint("Сигнал включён")', text: 'После паузы четвёртый светодиод (номер 3) загорается пурпурным (красный плюс синий), и сразу за ним идёт сообщение.' }
        ],
        watch: 'Первые две секунды на ленте и в журнале ничего не происходит, потом загорается пурпурный светодиод и приходит «Сигнал включён».'
    },
    preflight: {
        theory: [
            'Предполётная подготовка запускает двигатели, но команда лишь отправляется автопилоту, а выполняется не мгновенно. Сразу после неё нельзя считать, что дрон готов.',
            'Готовность подтверждает автопилот. <lua>Он присылает событие `Ev.ENGINES_STARTED` в функцию `callback(event)`, и именно внутри проверки `if event == Ev.ENGINES_STARTED` можно сообщать о запуске.</lua><py>`pioneer.arm()` возвращает `True`, когда подготовка принята.</py>',
            '<lua>В блоках сначала ставят «отправить событие автопилоту» → предполётная подготовка, затем «открыть взаимодействие с автопилотом», блок «если получено событие» → моторы запущены с «print» внутри и в конце «закрыть взаимодействие с автопилотом».</lua><py>В блоках порядок короткий: «Предполетная подготовка», затем «print».</py>'
        ],
        lua: `ap.push(Ev.MCE_PREFLIGHT)
print("Команда подготовки отправлена")

function callback(event)
    if event == Ev.ENGINES_STARTED then
        print("Моторы подтвердили запуск")
    end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

print("Команда подготовки отправлена")
if pioneer.arm():
    print("Моторы подтвердили запуск")`,
        steps: [
            { lua: 'ap.push(Ev.MCE_PREFLIGHT)\nprint("Команда подготовки отправлена")', python: 'print("Команда подготовки отправлена")', text: 'Команда отправлена, но это ещё не готовность: сообщение здесь говорит только о том, что команда ушла.' },
            { lua: 'if event == Ev.ENGINES_STARTED then\n        print("Моторы подтвердили запуск")\n    end', python: 'if pioneer.arm():\n    print("Моторы подтвердили запуск")', text: 'Второе сообщение выводится только после подтверждения: <lua>по событию от автопилота</lua><py>по результату `arm()`</py>.' }
        ],
        watch: 'В журнале сначала появится «Команда подготовки отправлена», а чуть позже «Моторы подтвердили запуск».'
    },
    takeoff: {
        theory: [
            'Взлёт — это процесс, а не мгновенное действие: команда отправляется, дрон начинает подниматься и некоторое время находится в состоянии взлёта. Закончился ли взлёт, нужно узнавать отдельно.',
            'Порядок строгий: сначала подготовка, затем подтверждение готовности, и только потом взлёт.<lua> Команда `ap.push(Ev.MCE_TAKEOFF)` стоит внутри `if event == Ev.ENGINES_STARTED`, а не рядом с подготовкой, иначе дрон получит обе команды сразу.</lua><py> Взлёт идёт после проверенного `pioneer.arm()` и короткой паузы, а не рядом с подготовкой, иначе дрон получит обе команды сразу.</py>',
            '<lua>Конец взлёта подтверждает событие `Ev.TAKEOFF_COMPLETE`. В блоках взлёт кладут внутрь события «моторы запущены».</lua><py>Конец взлёта узнают, опрашивая `pioneer.get_autopilot_state()` в цикле, пока состояние не станет `"MISSION"`. В блоках порядок такой: «Предполетная подготовка», «Заснуть на … сек», «Взлет».</py>'
        ],
        lua: `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        print("Готовы, взлетаем")
        ap.push(Ev.MCE_TAKEOFF)
    end

    if event == Ev.TAKEOFF_COMPLETE then
        print("Взлёт завершён")
    end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

if pioneer.arm():
    print("Готовы, взлетаем")
    time.sleep(2)
    pioneer.takeoff()
    while pioneer.get_autopilot_state() != "MISSION":
        time.sleep(0.1)
    print("Взлёт завершён")`,
        steps: [
            { lua: 'if event == Ev.ENGINES_STARTED then\n        print("Готовы, взлетаем")\n        ap.push(Ev.MCE_TAKEOFF)\n    end', python: 'if pioneer.arm():\n    print("Готовы, взлетаем")\n    time.sleep(2)\n    pioneer.takeoff()', text: 'Взлёт отправляется только после подготовки. <lua>Его запускает подтверждение двигателей.</lua><py>Его запускает проверенный `arm()` и пауза.</py>' },
            { lua: 'if event == Ev.TAKEOFF_COMPLETE then\n        print("Взлёт завершён")\n    end', python: 'while pioneer.get_autopilot_state() != "MISSION":\n        time.sleep(0.1)\n    print("Взлёт завершён")', text: 'Пока дрон поднимается, взлёт ещё не закончен. Сообщение выводится только после подтверждения: <lua>события от автопилота</lua><py>смены состояния</py>.' }
        ],
        watch: 'Дрон запустит двигатели и поднимется над площадкой; сообщение «Взлёт завершён» появится уже после того, как он завис на высоте.'
    },
    route: {
        theory: [
            'Точка маршрута задаётся тремя числами в метрах относительно места старта: `x` — вперёд, `y` — влево, `z` — высота. Значит, точка `(2, 1, 1.5)` лежит на два метра вперёд, на метр влево и на полтора метра над землёй.',
            'Лететь к точке можно только после взлёта.<lua> Команду `ap.goToLocalPoint(...)` кладут внутрь `if event == Ev.TAKEOFF_COMPLETE`, отдельной веткой под веткой с `ENGINES_STARTED`, а не внутрь неё.</lua><py> Команду полёта ставят после ожидания: дрону нужно время закончить взлёт.</py>',
            '<lua>В блоках это отдельный блок «если получено событие» → взлёт завершён с блоком «ap.goToLocalPoint» внутри.</lua><py>Между взлётом и полётом нужна пауза: `time.sleep(3)` оставляет дрону время подняться. В блоках после взлёта ставят «Заснуть на … сек» и «Лететь в локальные координаты» с числами X, Y, Z.</py>'
        ],
        lua: `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ap.push(Ev.MCE_TAKEOFF)
    end

    if event == Ev.TAKEOFF_COMPLETE then
        print("Летим к точке 2, 1, 1.5")
        ap.goToLocalPoint(2, 1, 1.5)
    end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

pioneer.arm()
time.sleep(2)
pioneer.takeoff()
time.sleep(3)
print("Летим к точке 2, 1, 1.5")
pioneer.go_to_local_point(x=2, y=1, z=1.5)`,
        steps: [
            { lua: 'if event == Ev.ENGINES_STARTED then\n        ap.push(Ev.MCE_TAKEOFF)\n    end', python: 'pioneer.arm()\ntime.sleep(2)\npioneer.takeoff()', text: 'Подготовка и взлёт уже знакомы: взлёт идёт после подготовки.' },
            { lua: 'if event == Ev.TAKEOFF_COMPLETE then', python: 'time.sleep(3)', text: 'Дрону даётся закончить взлёт: <lua>по событию от автопилота</lua><py>по паузе в три секунды</py>.' },
            { lua: 'ap.goToLocalPoint(2, 1, 1.5)', python: 'pioneer.go_to_local_point(x=2, y=1, z=1.5)', text: 'Команда полёта: два метра вперёд, метр влево, высота полтора метра.' }
        ],
        watch: 'Дрон взлетит, затем сместится вперёд и немного влево и повиснет на высоте около полутора метров.'
    },
    'point-confirm': {
        theory: [
            'Команда полёта к точке только запускает движение: она не ждёт, пока дрон прилетит. Если сразу после неё написать «долетели», сообщение появится, когда дрон ещё в пути.',
            'Прибытие подтверждается отдельно. <lua>Автопилот присылает событие `Ev.POINT_REACHED`, и сообщение пишут внутри `if event == Ev.POINT_REACHED`.</lua><py>После команды ставят цикл `while not pioneer.point_reached()` с короткой паузой внутри.</py>',
            '<lua>Событие точки приходит только после начала полёта, поэтому в блоках его ветка стоит третьей, после «взлёт завершён».</lua><py>В блоках за полётом к точке идёт «Ожидать достижения точки», а за ним «print».</py> Сверяйте сообщение с тем, где дрон находится на сцене.'
        ],
        lua: `local leds = Ledbar.new(29)
ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ap.push(Ev.MCE_TAKEOFF)
    end

    if event == Ev.TAKEOFF_COMPLETE then
        ap.goToLocalPoint(0, 2, 1.2)
    end

    if event == Ev.POINT_REACHED then
        leds:set(0, 0, 1, 0)
        print("Прибыли в точку 0, 2")
    end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

pioneer.arm()
time.sleep(2)
pioneer.takeoff()
time.sleep(3)
pioneer.go_to_local_point(x=0, y=2, z=1.2)
while not pioneer.point_reached():
    time.sleep(0.1)
pioneer.led_control(led_id=0, r=0, g=255, b=0)
print("Прибыли в точку 0, 2")`,
        steps: [
            { lua: 'ap.goToLocalPoint(0, 2, 1.2)', python: 'pioneer.go_to_local_point(x=0, y=2, z=1.2)', text: 'Команда отправляет дрон на два метра влево на высоте 1.2 м. Она лишь начинает полёт.' },
            { lua: 'if event == Ev.POINT_REACHED then', python: 'while not pioneer.point_reached():\n    time.sleep(0.1)', text: 'Здесь программа ждёт подтверждения прибытия: <lua>это обработчик события</lua><py>это цикл с короткой паузой</py>.' },
            { lua: 'leds:set(0, 0, 1, 0)\n        print("Прибыли в точку 0, 2")', python: 'pioneer.led_control(led_id=0, r=0, g=255, b=0)\nprint("Прибыли в точку 0, 2")', text: 'Только после подтверждения загорается зелёный светодиод и пишется сообщение.' }
        ],
        watch: 'Пока дрон летит влево, журнал молчит; зелёный светодиод и сообщение о прибытии появляются, когда дрон уже завис над точкой.'
    },
    mission: {
        theory: [
            'Полная миссия — это цепочка этапов: подготовка, взлёт, полёт к точке, посадка. Каждый следующий этап запускают по подтверждению предыдущего, а не «через сколько-то секунд на глаз».',
            '<lua>Каждому этапу соответствует своя ветка в `callback(event)`: моторы запущены → взлёт, взлёт завершён → точка, точка достигнута → дальше. Чтобы одно и то же событие могло значить разное, заведите счётчик, например `leg`.</lua><py>Программа пишется сверху вниз: после каждой команды полёта стоит ожидание `point_reached()`, и только потом идёт следующий этап.</py>',
            'В этом примере миссия из двух точек: после первой дрон летит ко второй, а после второй садится. <lua>В блоках — три ветки «если получено событие».</lua><py>В блоках — цепочка «Предполетная подготовка», «Заснуть», «Взлет», «Заснуть», «Лететь в локальные координаты», «Ожидать достижения точки», «Посадка».</py>'
        ],
        lua: `local leg = 0
ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ap.push(Ev.MCE_TAKEOFF)
    end

    if event == Ev.TAKEOFF_COMPLETE then
        ap.goToLocalPoint(1, 1, 1)
    end

    if event == Ev.POINT_REACHED then
        leg = leg + 1
        print("Точка " .. leg .. " достигнута")
        if leg == 1 then
            ap.goToLocalPoint(-1, 1, 1)
        else
            ap.push(Ev.MCE_LANDING)
        end
    end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

pioneer.arm()
time.sleep(2)
pioneer.takeoff()
time.sleep(3)

pioneer.go_to_local_point(x=1, y=1, z=1)
while not pioneer.point_reached():
    time.sleep(0.1)
print("Точка 1 достигнута")

pioneer.go_to_local_point(x=-1, y=1, z=1)
while not pioneer.point_reached():
    time.sleep(0.1)
print("Точка 2 достигнута")

pioneer.land()`,
        steps: [
            { lua: 'ap.push(Ev.MCE_PREFLIGHT)', python: 'pioneer.arm()\ntime.sleep(2)\npioneer.takeoff()\ntime.sleep(3)', text: 'Подготовка и взлёт: основа любой миссии.' },
            { lua: 'ap.goToLocalPoint(1, 1, 1)', python: 'pioneer.go_to_local_point(x=1, y=1, z=1)', text: 'Первая точка: метр вперёд, метр влево, высота метр.' },
            { lua: 'leg = leg + 1\n        print("Точка " .. leg .. " достигнута")', python: 'print("Точка 1 достигнута")', text: 'После прибытия сообщаем о ней.<lua> Счётчик показывает, какая это по счёту точка.</lua>' },
            { lua: 'ap.goToLocalPoint(-1, 1, 1)', python: 'pioneer.go_to_local_point(x=-1, y=1, z=1)', text: 'Вторая точка: метр назад от старта и метр влево, с тем же ожиданием прибытия.' },
            { lua: 'ap.push(Ev.MCE_LANDING)', python: 'pioneer.land()', text: 'После второй точки миссия заканчивается посадкой.' }
        ],
        watch: 'Дрон взлетит, пролетит две точки по очереди (в журнале появятся «Точка 1» и «Точка 2»), затем сядет.'
    },
    landing: {
        theory: [
            'Посадку запускают после подтверждённого прибытия, а не «когда кажется, что дрон уже долетел». Если команда посадки окажется рядом со взлётом или на пути к точке, дрон сядет, не долетев.',
            'Но и команда посадки — лишь запуск процесса. Конец посадки подтверждает <lua>событие `Ev.COPTER_LANDED`</lua><py>состояние `"DISARMED"` в `get_autopilot_state()`</py>: только после него миссию можно считать завершённой.',
            '<lua>В блоках посадку кладут внутрь события «точка достигнута».</lua><py>В блоках «Посадка» ставят после «Ожидать достижения точки».</py> Сообщение о завершении миссии выводят после подтверждения посадки, а не сразу за командой.'
        ],
        lua: `local leds = Ledbar.new(29)
ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ap.push(Ev.MCE_TAKEOFF)
    end

    if event == Ev.TAKEOFF_COMPLETE then
        ap.goToLocalPoint(2, 0, 1.2)
    end

    if event == Ev.POINT_REACHED then
        print("Садимся")
        ap.push(Ev.MCE_LANDING)
    end

    if event == Ev.COPTER_LANDED then
        leds:set(0, 0, 1, 0)
        print("Посадка подтверждена")
    end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)

pioneer.arm()
time.sleep(2)
pioneer.takeoff()
time.sleep(3)
pioneer.go_to_local_point(x=2, y=0, z=1.2)
while not pioneer.point_reached():
    time.sleep(0.1)

print("Садимся")
pioneer.land()
while pioneer.get_autopilot_state() != "DISARMED":
    time.sleep(0.1)
pioneer.led_control(led_id=0, r=0, g=255, b=0)
print("Посадка подтверждена")`,
        steps: [
            { lua: 'ap.goToLocalPoint(2, 0, 1.2)', python: 'pioneer.go_to_local_point(x=2, y=0, z=1.2)', text: 'Маршрут к точке в двух метрах впереди: после неё дрон должен дождаться подтверждения прибытия.' },
            { lua: 'if event == Ev.POINT_REACHED then\n        print("Садимся")\n        ap.push(Ev.MCE_LANDING)\n    end', python: 'print("Садимся")\npioneer.land()', text: 'Посадка запускается только после прибытия в точку. <lua>Она лежит внутри ветки с `POINT_REACHED`.</lua><py>Она стоит после цикла ожидания.</py>' },
            { lua: 'if event == Ev.COPTER_LANDED then\n        leds:set(0, 0, 1, 0)\n        print("Посадка подтверждена")\n    end', python: 'while pioneer.get_autopilot_state() != "DISARMED":\n    time.sleep(0.1)\npioneer.led_control(led_id=0, r=0, g=255, b=0)\nprint("Посадка подтверждена")', text: 'Пока дрон снижается, посадка ещё не подтверждена. Зелёный светодиод и сообщение появляются только после того, как он на земле.' }
        ],
        watch: 'Дрон долетит до точки, начнёт снижение, и только когда коснётся земли, загорится зелёный светодиод и придёт «Посадка подтверждена».'
    }
};
