import type { GuideTextLesson } from '../../types.js';
import { GUIDE_CHAPTER_IDS } from '../../curriculum.js';
import { apiFocus } from '../support/state-helpers.js';

// Text-track Lua lessons: the same 10 curriculum topics as the Blockly Lua
// track, but repackaged for hand-typed raw Lua code instead of block
// assembly. Teaching content (title/goal/theory/API focus/solution) is
// copied verbatim from the Blockly lesson sources; only `id`, `topicId` and
// `starterCode` are new here.
export function getLuaTextLessons(): GuideTextLesson[] {
    return [
        {
            id: 'lua-led-single-text',
            topicId: 'led-single',
            chapterId: GUIDE_CHAPTER_IDS.foundations,
            badge: 'Задание 1',
            title: 'Включить красную подсветку',
            goal: 'Соберите минимальный Lua-сценарий, который инициализирует `Ledbar.new(29)` и включает красный только на первом светодиоде.',
            summary: 'Первый шаг знакомит с объектом Ledbar и линейным выполнением скрипта в Pioneer.',
            lessonIntro: 'В Lua сначала создайте объект Ledbar на 29 светодиодов, а затем вызовите `set`. Нумерация начинается с нуля, поэтому первый светодиод имеет индекс `0`.',
            expectedOutcome: 'Первый светодиод на ленте дрона загорится красным цветом.',
            builderHint: 'Без циклов: в этом уроке нужен только один вызов `leds:set` для диода `0`.',
            apiFocus: [
                apiFocus('Ledbar.new(count)', 'Инициализирует ленту на заданное количество светодиодов.', 'local leds = Ledbar.new(29)'),
                apiFocus('leds:set(index, r, g, b)', 'Меняет цвет светодиода по индексу. В этом уроке нужен только первый светодиод: индекс `0`, цвет `(1, 0, 0)`.', 'leds:set(0, 1, 0, 0)')
            ],
            links: [
                { label: 'Ledbar.new', query: 'Ledbar.new Ledbar' },
                { label: 'leds:set', query: 'leds:set Ledbar' }
            ],
            starterCode: `-- TODO: создайте Ledbar.new(29) и включите красный цвет на первом светодиоде (индекс 0)

function callback(event)
end`,
            solutionCode: `local leds = Ledbar.new(29)
leds:set(0, 1, 0, 0)

function callback(event)
end`
        },
        {
            id: 'lua-led-sequence-text',
            topicId: 'led-sequence',
            chapterId: GUIDE_CHAPTER_IDS.foundations,
            badge: 'Задание 2',
            title: 'Мигание с таймерами',
            goal: 'Соберите последовательность с использованием `Timer.callLater`.',
            summary: 'В Lua нет блокирующего `sleep`, поэтому для пауз используются таймеры.',
            lessonIntro: 'Таймеры планируют выполнение функции через заданное время, не останавливая основной поток.',
            expectedOutcome: 'Первый светодиод на ленте дрона последовательно меняет цвет: сначала синий, затем зеленый, затем красный — каждая смена происходит с задержкой около секунды.',
            builderHint: 'Следите за временем в таймерах: 1с, 2с, 3с (отсчет от начала выполнения).',
            apiFocus: [
                apiFocus('Timer.callLater(delay, func)', 'Выполняет функцию через delay секунд.', 'Timer.callLater(1.0, function() ... end)')
            ],
            links: [
                { label: 'Timer.callLater', query: 'Timer.callLater' },
                { label: 'leds:set', query: 'leds:set Ledbar' }
            ],
            starterCode: `local leds = Ledbar.new(29)

-- TODO: через Timer.callLater поочередно включите синий (через 1с), зеленый (через 2с) и красный (через 3с) цвета на первом светодиоде

function callback(event)
end`,
            solutionCode: `local leds = Ledbar.new(29)

Timer.callLater(1.0, function()
    leds:set(0, 0, 0, 1)
end)

Timer.callLater(2.0, function()
    leds:set(0, 0, 1, 0)
end)

Timer.callLater(3.0, function()
    leds:set(0, 1, 0, 0)
end)

function callback(event)
end`
        },
        {
            id: 'lua-led-confirm-text',
            topicId: 'led-confirm',
            chapterId: GUIDE_CHAPTER_IDS.foundations,
            badge: 'Задание 3',
            title: 'Световой сигнал с подтверждением',
            goal: 'Соберите короткий сценарий индикации: создайте `Ledbar(29)`, включите зеленый сигнал и выведите текстовое подтверждение.',
            summary: 'Урок связывает визуальную индикацию и простой лог, чтобы ученик видел и физический, и текстовый результат выполнения.',
            lessonIntro: 'Здесь вы тренируете полезную привычку: подтверждать важный шаг миссии сразу двумя каналами. Светодиод показывает состояние на модели дрона, а `print(...)` помогает отследить тот же этап в консоли симулятора.',
            expectedOutcome: 'На ленте загорится зеленый индикатор, а в журнале появится сообщение, подтверждающее готовность сигнала.',
            builderHint: 'Логика линейная: сначала инициализация периферии, затем управление цветом, затем текстовое подтверждение.',
            apiFocus: [
                apiFocus('Ledbar.new(count)', 'Создает объект светодиодной ленты, который нужен для дальнейшего управления цветом. Для этих уроков используем `Ledbar.new(29)`.', 'local leds = Ledbar.new(29)'),
                apiFocus('leds:set(index, r, g, b)', 'Меняет цвет светодиода и выступает визуальным индикатором состояния.', 'leds:set(0, 0, 1, 0)'),
                apiFocus('print(...)', 'Не управляет дроном напрямую, но полезен как журнал шага миссии.', 'print("Сигнал готов")')
            ],
            links: [
                { label: 'Ledbar.new', query: 'Ledbar.new' },
                { label: 'leds:set', query: 'leds:set Ledbar' },
                { label: 'print', query: 'lua print' }
            ],
            starterCode: `local leds = Ledbar.new(29)

-- TODO: включите зеленый цвет на первом светодиоде и выведите print("Сигнал готов")

function callback(event)
end`,
            solutionCode: `local leds = Ledbar.new(29)
leds:set(0, 0, 1, 0)
print("Сигнал готов")

function callback(event)
end`
        },
        {
            id: 'lua-led-delayed-text',
            topicId: 'led-delayed',
            chapterId: GUIDE_CHAPTER_IDS.foundations,
            badge: 'Задание 4',
            title: 'Отложенный световой отклик',
            goal: 'Соберите сценарий, где после создания `Ledbar(29)` через таймер включается синий сигнал и печатается сообщение о срабатывании.',
            summary: 'Урок показывает, как использовать `Timer.callLater(...)` для реакции с задержкой, не блокируя основной поток сценария.',
            lessonIntro: 'Задание моделирует типичную ситуацию: действие должно произойти не сразу, а после паузы. В Lua это удобно оформлять через таймер с вложенным callback, в который и помещаются полезные действия.',
            expectedOutcome: 'Через небольшую паузу после запуска сценария на ленте загорится синий индикатор, и в журнале появится сообщение о срабатывании отложенного сигнала.',
            builderHint: 'В линейной части оставьте только создание `Ledbar`. Все остальные шаги должны жить внутри таймера.',
            apiFocus: [
                apiFocus('Timer.callLater(seconds, callback)', 'Позволяет отложить выполнение блока действий без блокировки всего сценария.', 'Timer.callLater(1.0, function() ... end)'),
                apiFocus('leds:set(...) и print(...)', 'В этом уроке оба действия должны быть вложены в callback таймера.', 'leds:set(1, 0, 0, 1)')
            ],
            links: [
                { label: 'Timer.callLater', query: 'Timer.callLater' },
                { label: 'leds:set', query: 'leds:set Ledbar' }
            ],
            starterCode: `local leds = Ledbar.new(29)

-- TODO: через Timer.callLater(1.0, ...) включите синий цвет на втором светодиоде (индекс 1) и выведите print("Таймер сработал")

function callback(event)
end`,
            solutionCode: `local leds = Ledbar.new(29)

Timer.callLater(1.0, function()
    leds:set(1, 0, 0, 1)
    print("Таймер сработал")
end)

function callback(event)
end`
        },
        {
            id: 'lua-preflight-text',
            topicId: 'preflight',
            chapterId: GUIDE_CHAPTER_IDS.flight,
            badge: 'Задание 3',
            title: 'Предполетная подготовка',
            goal: 'Соберите событийну цепочку: отправьте `PREFLIGHT`, дождитесь `ENGINES_STARTED` и только затем сообщите об успехе.',
            summary: 'Показываем, что для миссий Pioneer шаги часто строятся вокруг событий FSM.',
            lessonIntro: 'Начиная с этого урока, вы переходите от LED-команд к автопилоту. Здесь важно не просто вызвать команду, а дождаться правильного события от конечного автомата дрона.',
            expectedOutcome: 'Дрон начнет предполетную подготовку, а после того как двигатели запустятся, в журнале появится сообщение об успешном завершении этого этапа.',
            builderHint: 'Блок ожидания события открывает ветку `callback(event)`. Все следующие действия относятся к этому событию, пока вы не вставите другое ожидание.',
            apiFocus: [
                apiFocus('ap.push(Ev.MCE_PREFLIGHT)', 'Отправляет автопилоту команду предполетной подготовки. Это стартовый шаг для FSM-сценария.', 'ap.push(Ev.MCE_PREFLIGHT)'),
                apiFocus('Ev.ENGINES_STARTED', 'Событие, которое сигнализирует о запуске двигателей. Только после него уместно переходить к следующим действиям миссии.', 'if event == Ev.ENGINES_STARTED then ... end')
            ],
            links: [
                { label: 'ap.push', query: 'ap.push', previewKey: 'ap.push' },
                { label: 'Ev.MCE_PREFLIGHT', query: 'Ev.MCE_PREFLIGHT' },
                { label: 'Ev.ENGINES_STARTED', query: 'Ev.ENGINES_STARTED' }
            ],
            starterCode: `-- TODO: отправьте ap.push(Ev.MCE_PREFLIGHT), затем в callback дождитесь события Ev.ENGINES_STARTED и выведите print('Двигатели запущены')

function callback(event)
end`,
            solutionCode: `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        print('Двигатели запущены')
    end
end`
        },
        {
            id: 'lua-takeoff-text',
            topicId: 'takeoff',
            chapterId: GUIDE_CHAPTER_IDS.flight,
            badge: 'Задание 4',
            title: 'Правильный взлет',
            goal: 'Добавьте к `PREFLIGHT` вторую ключевую команду: `TAKEOFF` должен отправляться только после `ENGINES_STARTED`.',
            summary: 'Учимся выстраивать причинно-следственную цепочку в коллбэке FSM.',
            lessonIntro: 'В этом уроке вы связываете две команды автопилота: подготовку и взлет. Главная идея не в самих командах, а в правильной причинно-следственной последовательности между ними.',
            expectedOutcome: 'Дрон выполнит предполетную подготовку и взлетит сразу, как только двигатели подтвердят запуск — не раньше и не позже.',
            builderHint: 'Если `TAKEOFF` стоит выше ожидания события, он уйдет в корень скрипта и нарушит порядок вызовов API.',
            apiFocus: [
                apiFocus('Ev.MCE_TAKEOFF', 'Команда взлета. Ее нельзя отправлять раньше, чем двигатели перейдут в состояние готовности.', 'ap.push(Ev.MCE_TAKEOFF)'),
                apiFocus('Ev.ENGINES_STARTED', 'Контрольное событие, которое отделяет подготовку от безопасного взлета.', 'if event == Ev.ENGINES_STARTED then ... end')
            ],
            links: [
                { label: 'Ev.MCE_TAKEOFF', query: 'Ev.MCE_TAKEOFF' },
                { label: 'Ev.ENGINES_STARTED', query: 'Ev.ENGINES_STARTED' },
                { label: 'ap.push', query: 'ap.push', previewKey: 'ap.push' }
            ],
            starterCode: `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    -- TODO: после события Ev.ENGINES_STARTED отправьте ap.push(Ev.MCE_TAKEOFF)
end`,
            solutionCode: `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ap.push(Ev.MCE_TAKEOFF)
    end
end`
        },
        {
            id: 'lua-route-text',
            topicId: 'route',
            chapterId: GUIDE_CHAPTER_IDS.flight,
            badge: 'Задание 7',
            title: 'Полет к точке после взлета',
            goal: 'Соберите FSM-цепочку, где `goToLocalPoint(...)` отправляется только после события `TAKEOFF_COMPLETE`.',
            summary: 'Задание выделяет навигационный переход как отдельную тему: маршрут запускается не сразу после взлета, а после подтверждения завершения набора высоты.',
            lessonIntro: 'В реальной логике миссии маршрут не должен начинаться в момент отправки взлета. Правильнее дождаться `TAKEOFF_COMPLETE`, и только затем переходить к команде полета в локальную точку.',
            expectedOutcome: 'Дрон пройдет предполетную подготовку, взлетит и, только полностью завершив набор высоты, отправится к заданной точке маршрута.',
            builderHint: 'Следите за тем, чтобы `goToLocalPoint(...)` оказался в ветке `TAKEOFF_COMPLETE`, а не рядом с корневыми командами.',
            apiFocus: [
                apiFocus('Ev.TAKEOFF_COMPLETE', 'Это событие подтверждает, что взлет завершен и дрон может перейти к маршруту.', 'if event == Ev.TAKEOFF_COMPLETE then ... end'),
                apiFocus('ap.goToLocalPoint(x, y, z)', 'Запускает реальное перемещение дрона к локальной координате.', 'ap.goToLocalPoint(1, 0, 1)')
            ],
            links: [
                { label: 'Ev.TAKEOFF_COMPLETE', query: 'Ev.TAKEOFF_COMPLETE' },
                { label: 'ap.goToLocalPoint', query: 'ap.goToLocalPoint', previewKey: 'ap.goToLocalPoint' }
            ],
            starterCode: `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ap.push(Ev.MCE_TAKEOFF)
    end

    -- TODO: после события Ev.TAKEOFF_COMPLETE отправьте дрон к точке через ap.goToLocalPoint(1, 0, 1)
end`,
            solutionCode: `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ap.push(Ev.MCE_TAKEOFF)
    end

    if event == Ev.TAKEOFF_COMPLETE then
        ap.goToLocalPoint(1, 0, 1)
    end
end`
        },
        {
            id: 'lua-point-confirm-text',
            topicId: 'point-confirm',
            chapterId: GUIDE_CHAPTER_IDS.flight,
            badge: 'Задание 8',
            title: 'Подтвердить достижение точки',
            goal: 'Расширьте маршрут: после `POINT_REACHED` выведите сообщение о достижении цели.',
            summary: 'Урок концентрируется на подтверждении результата маршрута и показывает, что событие точки полезно само по себе, даже до посадки.',
            lessonIntro: 'Частая ошибка начинающих заключается в том, что команда маршрута считается завершенной сразу после отправки. На самом деле нужно дождаться отдельного сигнала `POINT_REACHED` и только после него считать задачу выполненной.',
            expectedOutcome: 'Дрон подготовится, взлетит и долетит до точки маршрута, а в журнале появится сообщение, подтверждающее, что цель действительно достигнута.',
            builderHint: 'Ветка `POINT_REACHED` должна идти после ветки `TAKEOFF_COMPLETE`, потому что без маршрута событие точки просто не появится.',
            apiFocus: [
                apiFocus('Ev.POINT_REACHED', 'Подтверждает, что маршрут действительно выполнен.', 'if event == Ev.POINT_REACHED then ... end'),
                apiFocus('print(...)', 'В этом уроке лог нужен как подтверждение достижения навигационной цели.', 'print("Точка достигнута")')
            ],
            links: [
                { label: 'Ev.POINT_REACHED', query: 'Ev.POINT_REACHED' },
                { label: 'ap.goToLocalPoint', query: 'ap.goToLocalPoint', previewKey: 'ap.goToLocalPoint' }
            ],
            starterCode: `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ap.push(Ev.MCE_TAKEOFF)
    end

    if event == Ev.TAKEOFF_COMPLETE then
        ap.goToLocalPoint(1, 0, 1)
    end

    -- TODO: после события Ev.POINT_REACHED выведите print("Точка достигнута")
end`,
            solutionCode: `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ap.push(Ev.MCE_TAKEOFF)
    end

    if event == Ev.TAKEOFF_COMPLETE then
        ap.goToLocalPoint(1, 0, 1)
    end

    if event == Ev.POINT_REACHED then
        print("Точка достигнута")
    end
end`
        },
        {
            id: 'lua-mission-text',
            topicId: 'mission',
            chapterId: GUIDE_CHAPTER_IDS.mission,
            badge: 'Задание 5',
            title: 'Полная миссия: взлет, точка, посадка',
            goal: 'Соберите полную FSM-цепочку: подготовка, взлет, переход к точке по событию `TAKEOFF_COMPLETE`, затем посадка после `POINT_REACHED`.',
            summary: 'Это первый цельный Lua-сценарий, в котором блоки соединяются по форме, но могут ошибаться по логике событий.',
            lessonIntro: 'Финальный Lua-урок собирает полную миссию из нескольких событий автопилота. Здесь уже важно понимать, какая команда должна жить в какой ветке `callback(event)` и почему.',
            expectedOutcome: 'Дрон подготовится, взлетит, долетит до заданной точки и приземлится — каждый следующий шаг миссии начнется только после подтверждения предыдущего.',
            builderHint: 'В этом задании почти все ошибки логические: блоки физически стыкуются, но одно неверное событие сразу переносит команду не в ту ветку `callback(event)`.',
            apiFocus: [
                apiFocus('ap.goToLocalPoint(x, y, z)', 'Отправляет дрон к локальной точке. В уроке эта команда должна запускаться только после завершения взлета.', 'ap.goToLocalPoint(1, 0, 1)'),
                apiFocus('Ev.TAKEOFF_COMPLETE', 'Событие окончания взлета. После него маршрут становится логически допустимым.', 'if event == Ev.TAKEOFF_COMPLETE then ... end'),
                apiFocus('Ev.POINT_REACHED и Ev.MCE_LANDING', 'Событие достижения точки подтверждает окончание маршрута, а команда посадки завершает миссию.', 'if event == Ev.POINT_REACHED then ap.push(Ev.MCE_LANDING) end')
            ],
            links: [
                { label: 'ap.goToLocalPoint', query: 'ap.goToLocalPoint', previewKey: 'ap.goToLocalPoint' },
                { label: 'Ev.TAKEOFF_COMPLETE', query: 'Ev.TAKEOFF_COMPLETE' },
                { label: 'Ev.POINT_REACHED', query: 'Ev.POINT_REACHED' },
                { label: 'Ev.MCE_LANDING', query: 'Ev.MCE_LANDING' }
            ],
            starterCode: `-- TODO: соберите полную FSM-миссию: PREFLIGHT -> дождаться ENGINES_STARTED -> TAKEOFF -> дождаться TAKEOFF_COMPLETE -> goToLocalPoint(1, 0, 1) -> дождаться POINT_REACHED -> LANDING

function callback(event)
end`,
            solutionCode: `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ap.push(Ev.MCE_TAKEOFF)
    end

    if event == Ev.TAKEOFF_COMPLETE then
        ap.goToLocalPoint(1, 0, 1)
    end

    if event == Ev.POINT_REACHED then
        ap.push(Ev.MCE_LANDING)
    end
end`
        },
        {
            id: 'lua-landing-text',
            topicId: 'landing',
            chapterId: GUIDE_CHAPTER_IDS.mission,
            badge: 'Задание 9',
            title: 'Посадка после подтверждения точки',
            goal: 'Соберите миссию, в которой посадка вызывается только после события `POINT_REACHED`.',
            summary: 'Это предпоследний шаг полной миссии: ученик закрепляет, что завершение маршрута тоже должно быть событийным и подтвержденным.',
            lessonIntro: 'Правильная посадка начинается не просто "когда кажется, что дрон уже долетел", а после события, которое подтверждает достижение нужной координаты. Этот урок делает акцент именно на безопасном завершении сценария.',
            expectedOutcome: 'Дрон подготовится, взлетит, долетит до точки маршрута и приземлится сразу после подтверждения, что точка достигнута — не раньше.',
            builderHint: 'Если `LANDING` стоит в корне или рядом с `TAKEOFF`, это почти всегда означает логическую ошибку.',
            apiFocus: [
                apiFocus('Ev.MCE_LANDING', 'Завершает миссию и должен отправляться только после подтверждения конца маршрута.', 'ap.push(Ev.MCE_LANDING)'),
                apiFocus('Ev.POINT_REACHED', 'Сигнал, который разрешает завершить маршрут посадкой.', 'if event == Ev.POINT_REACHED then ... end')
            ],
            links: [
                { label: 'Ev.MCE_LANDING', query: 'Ev.MCE_LANDING' },
                { label: 'Ev.POINT_REACHED', query: 'Ev.POINT_REACHED' }
            ],
            starterCode: `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ap.push(Ev.MCE_TAKEOFF)
    end

    if event == Ev.TAKEOFF_COMPLETE then
        ap.goToLocalPoint(1, 0, 1)
    end

    -- TODO: после события Ev.POINT_REACHED отправьте команду посадки ap.push(Ev.MCE_LANDING)
end`,
            solutionCode: `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ap.push(Ev.MCE_TAKEOFF)
    end

    if event == Ev.TAKEOFF_COMPLETE then
        ap.goToLocalPoint(1, 0, 1)
    end

    if event == Ev.POINT_REACHED then
        ap.push(Ev.MCE_LANDING)
    end
end`
        }
    ];
}
