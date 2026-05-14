import type { ScriptLanguage } from '../api-docs/sections.js';
import { createEventBlock, createStatementBlock, createTimerBlock } from './lesson-builders.js';
import { compileLuaEvents, compileLuaLinear, compileLuaTimed, compilePython } from './lesson-compilers.js';
import {
    LUA_LED_SEQUENCE_EXAMPLE,
    LUA_LED_SINGLE_EXAMPLE,
    LUA_MISSION_EXAMPLE,
    LUA_PREFLIGHT_EXAMPLE,
    LUA_TAKEOFF_EXAMPLE,
    PYTHON_ARM_EXAMPLE,
    PYTHON_LED_SEQUENCE_EXAMPLE,
    PYTHON_LED_SINGLE_EXAMPLE,
    PYTHON_MISSION_EXAMPLE,
    PYTHON_TAKEOFF_EXAMPLE
} from './snippets.js';
import type { GuideLesson, GuideLessonState } from './types.js';

export { evaluateLesson, getLessonCode } from './lesson-evaluation.js';
export type {
    DragPayload,
    GuideBlock,
    GuideDiagnostic,
    GuideEvaluation,
    GuideLesson,
    GuideLessonState,
    GuideMethodLink,
    RenderMissionGuidePanel,
    RuntimeBanner
} from './types.js';

export function getGuideLessonState(language: ScriptLanguage): GuideLessonState {
    return language === 'python' ? getPythonState() : getLuaState();
}

function getLuaState(): GuideLessonState {
    const lessons: GuideLesson[] = [
        {
            id: 'lua-led-single',
            badge: 'Задание 1',
            title: 'Зажечь один светодиод',
            goal: 'Соберите минимальный Lua-сценарий: сначала создайте `Ledbar`, затем задайте красный цвет первому диоду.',
            summary: 'Учимся связывать инициализацию устройства и первый вызов `leds:set(...)`.',
            expectedOutcome: 'Скрипт создает объект `Ledbar` и сразу окрашивает один светодиод в красный.',
            builderHint: 'Все паззлы физически совместимы, но логически правильная цепочка здесь короткая: только создание ленты и установка цвета.',
            targetBlockIds: ['lua-ledbar', 'lua-led-red'],
            blocks: [
                createStatementBlock('lua-ledbar', 'создать Ledbar', 'local leds = Ledbar.new(4)', 'Инициализирует светодиодную ленту, без этого дальнейшие обращения к `leds:set(...)` не имеют смысла.', 'setup', 'local leds = Ledbar.new(4)'),
                createStatementBlock('lua-led-red', 'задать красный цвет', 'leds:set(0, 1, 0, 0)', 'Правильный целевой блок задания: первый диод загорается красным.', 'action', 'leds:set(0, 1, 0, 0)'),
                createStatementBlock('lua-led-blue', 'задать синий цвет', 'leds:set(0, 0, 0, 1)', 'Рабочая команда API, но для этого задания она приводит к неверному результату.', 'action', 'leds:set(0, 0, 0, 1)'),
                createTimerBlock('lua-wait-led', 'подождать 0.5 c', 'Timer.callLater(0.5, ...)', 'Пауза полезна для анимации, но в этом стартовом задании она не нужна.', 0.5),
                createStatementBlock('lua-led-print', 'вывести сообщение', 'print("LED готов")', 'Сообщение допустимо технически, но не относится к учебной цели задания.', 'check', 'print("LED готов")')
            ],
            links: [
                { label: 'Ledbar.new', query: 'Ledbar.new' },
                { label: 'leds:set', query: 'leds:set Ledbar' }
            ],
            solutionCode: LUA_LED_SINGLE_EXAMPLE,
            actionLabel: 'Открыть LED API',
            actionQuery: 'Ledbar.new leds:set',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Цвет назначен до создания `Ledbar`',
                    reason: '`leds:set(...)` обращается к объекту, который еще не создан, поэтому логика сценария нарушается.',
                    fix: 'Поставьте блок `создать Ledbar` первым.'
                },
                {
                    kind: 'warning',
                    title: 'Выбран другой цвет',
                    reason: 'Команда рабочая, но задание требует именно красный индикатор как контрольный результат.',
                    fix: 'Замените дополнительный цвет на блок `задать красный цвет`.'
                },
                {
                    kind: 'warning',
                    title: 'Добавлена лишняя пауза',
                    reason: 'Пауза не ломает синтаксис, но делает задание сложнее без пользы и скрывает основную идею инициализации.',
                    fix: 'Оставьте только создание ленты и вызов `leds:set(...)`.'
                }
            ],
            missingBlockDiagnostics: {
                'lua-ledbar': {
                    kind: 'error',
                    title: 'Пропущено создание `Ledbar`',
                    reason: 'Без `Ledbar.new(...)` объект `leds` не существует, поэтому команды установки цвета не на что применить.',
                    fix: 'Добавьте блок `создать Ledbar` в начало последовательности.'
                },
                'lua-led-red': {
                    kind: 'error',
                    title: 'Целевой цвет не задан',
                    reason: 'Сценарий не содержит команды `leds:set(0, 1, 0, 0)`, поэтому красный светодиод не включится.',
                    fix: 'Добавьте блок `задать красный цвет` после инициализации ленты.'
                }
            },
            extraBlockDiagnostics: {
                'lua-led-blue': {
                    kind: 'warning',
                    title: 'Использован неверный цвет',
                    reason: 'Команда `leds:set(0, 0, 0, 1)` корректна, но приводит к синему индикатору вместо требуемого красного.',
                    fix: 'Удалите синий блок или замените его на `задать красный цвет`.'
                },
                'lua-wait-led': {
                    kind: 'warning',
                    title: 'Анимационная пауза здесь лишняя',
                    reason: 'В первом задании нет последовательности смены кадров, поэтому `Timer.callLater(...)` не нужен.',
                    fix: 'Уберите паузу и оставьте только инициализацию и одну установку цвета.'
                },
                'lua-led-print': {
                    kind: 'warning',
                    title: 'Сообщение не заменяет вызов API',
                    reason: '`print(...)` лишь выводит текст и не управляет светодиодами, поэтому цель задания не достигается.',
                    fix: 'Используйте его только дополнительно, а основную цепочку соберите из `Ledbar.new(...)` и `leds:set(...)`.'
                }
            },
            orderRules: [
                {
                    before: 'lua-ledbar',
                    after: 'lua-led-red',
                    title: 'Цвет вызывается раньше инициализации',
                    reason: 'Логика Pioneer API нарушена: сначала должен появиться объект `Ledbar`, а уже потом можно обращаться к `leds:set(...)`.',
                    fix: 'Переместите блок `создать Ledbar` выше блока установки цвета.'
                }
            ],
            compile: compileLuaLinear
        },
        {
            id: 'lua-led-sequence',
            badge: 'Задание 2',
            title: 'Световая анимация с таймерами',
            goal: 'Соберите анимацию из трех состояний: синий, затем зеленый, затем красный, разделяя шаги таймерами.',
            summary: 'Закрепляем идею, что в Lua-миссиях шаги должны быть разведены по времени.',
            expectedOutcome: 'Скрипт последовательно вызывает `leds:set(...)`, а таймеры раздвигают смену кадров на 0.5 и 1.0 секунды.',
            builderHint: 'Пауза создает новый временной слой. Все блоки после нее попадают в `Timer.callLater(...)` до следующей паузы.',
            targetBlockIds: ['lua2-ledbar', 'lua2-blue', 'lua2-wait-a', 'lua2-green', 'lua2-wait-b', 'lua2-red'],
            blocks: [
                createStatementBlock('lua2-ledbar', 'создать Ledbar', 'local leds = Ledbar.new(4)', 'Без инициализации анимацию выводить некуда.', 'setup', 'local leds = Ledbar.new(4)'),
                createStatementBlock('lua2-blue', 'показать синий', 'leds:set(0, 0, 0, 1)', 'Первый кадр анимации.', 'action', 'leds:set(0, 0, 0, 1)'),
                createTimerBlock('lua2-wait-a', 'подождать 0.5 c', 'Timer.callLater(0.5, ...)', 'Создает второй шаг по времени.', 0.5),
                createStatementBlock('lua2-green', 'показать зеленый', 'leds:set(1, 0, 1, 0)', 'Второй кадр после первой паузы.', 'action', 'leds:set(1, 0, 1, 0)'),
                createTimerBlock('lua2-wait-b', 'подождать еще 0.5 c', 'Timer.callLater(1.0, ...)', 'Сдвигает третий кадр на суммарную секунду.', 0.5),
                createStatementBlock('lua2-red', 'показать красный', 'leds:set(2, 1, 0, 0)', 'Третий кадр анимации.', 'action', 'leds:set(2, 1, 0, 0)'),
                createStatementBlock('lua2-white', 'показать белый', 'leds:set(0, 1, 1, 1)', 'Корректная LED-команда, но она не входит в эталонную анимацию.', 'action', 'leds:set(0, 1, 1, 1)'),
                createStatementBlock('lua2-print', 'вывести статус', 'print("animation step")', 'Полезно для отладки, но не заменяет паузы и цвета.', 'check', 'print("animation step")')
            ],
            links: [
                { label: 'Timer.callLater', query: 'Timer.callLater' },
                { label: 'leds:set', query: 'leds:set Ledbar' }
            ],
            solutionCode: LUA_LED_SEQUENCE_EXAMPLE,
            actionLabel: 'Открыть таймеры',
            actionQuery: 'Timer.callLater leds:set',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Кадры идут без пауз',
                    reason: 'Если поставить несколько `leds:set(...)` подряд, визуально останется только последнее состояние.',
                    fix: 'Разведите смену цветов блоками ожидания.'
                },
                {
                    kind: 'error',
                    title: 'Инициализация стоит не первой',
                    reason: 'Как и в первом задании, к `leds:set(...)` нельзя обращаться до `Ledbar.new(...)`.',
                    fix: 'Начните цепочку с блока `создать Ledbar`.'
                },
                {
                    kind: 'warning',
                    title: 'Построен другой сценарий цвета',
                    reason: 'Команда рабочая, но результат не совпадает с эталонной анимацией урока.',
                    fix: 'Вернитесь к цепочке синий -> пауза -> зеленый -> пауза -> красный.'
                }
            ],
            missingBlockDiagnostics: {
                'lua2-ledbar': {
                    kind: 'error',
                    title: 'Не создана светодиодная лента',
                    reason: 'Без `Ledbar.new(...)` остальные шаги анимации логически некуда применять.',
                    fix: 'Поставьте блок `создать Ledbar` первым.'
                },
                'lua2-blue': {
                    kind: 'error',
                    title: 'Не задан первый кадр',
                    reason: 'Анимация должна начинаться с синего состояния, иначе теряется исходная точка сценария.',
                    fix: 'Добавьте блок `показать синий` сразу после инициализации.'
                },
                'lua2-wait-a': {
                    kind: 'error',
                    title: 'Пропущена первая пауза',
                    reason: 'Переход к зеленому произойдет слишком быстро и сольется с предыдущим кадром.',
                    fix: 'Вставьте блок `подождать 0.5 c` между синим и зеленым.'
                },
                'lua2-green': {
                    kind: 'error',
                    title: 'Пропущен второй кадр',
                    reason: 'Без зеленого блока анимация не демонстрирует переход между цветами.',
                    fix: 'Добавьте блок `показать зеленый` после первой паузы.'
                },
                'lua2-wait-b': {
                    kind: 'error',
                    title: 'Пропущена вторая пауза',
                    reason: 'Красный кадр должен появиться позже зеленого, иначе они схлопнутся.',
                    fix: 'Добавьте блок `подождать еще 0.5 c` перед последним цветом.'
                },
                'lua2-red': {
                    kind: 'error',
                    title: 'Пропущен финальный кадр',
                    reason: 'Без красного шага анимация не завершается контрольным цветом.',
                    fix: 'Добавьте блок `показать красный` после второй паузы.'
                }
            },
            extraBlockDiagnostics: {
                'lua2-white': {
                    kind: 'warning',
                    title: 'Добавлен лишний цвет',
                    reason: 'Белый цвет является рабочим API-вызовом, но ломает учебную последовательность из трех заданных кадров.',
                    fix: 'Удалите белый блок, чтобы анимация осталась синий -> зеленый -> красный.'
                },
                'lua2-print': {
                    kind: 'warning',
                    title: 'Отладочный вывод не управляет временем',
                    reason: '`print(...)` не создает задержку и не меняет LED-состояние, поэтому не решает задачу анимации.',
                    fix: 'Используйте таймеры и вызовы `leds:set(...)`.'
                }
            },
            orderRules: [
                {
                    before: 'lua2-ledbar',
                    after: 'lua2-blue',
                    title: 'Первый цвет стоит до создания ленты',
                    reason: 'Блок `leds:set(...)` не должен выполняться раньше `Ledbar.new(...)`.',
                    fix: 'Переместите `создать Ledbar` в начало.'
                },
                {
                    before: 'lua2-blue',
                    after: 'lua2-wait-a',
                    title: 'После синего отсутствует временной разрыв',
                    reason: 'Первая пауза должна идти сразу за первым цветом, иначе логика анимации не читается.',
                    fix: 'Поставьте блок ожидания сразу после синего кадра.'
                },
                {
                    before: 'lua2-wait-a',
                    after: 'lua2-green',
                    title: 'Зеленый кадр не привязан к первой паузе',
                    reason: 'Зеленый цвет должен быть действием внутри первого отложенного шага, а не раньше него.',
                    fix: 'Переместите `показать зеленый` ниже первой паузы.'
                },
                {
                    before: 'lua2-green',
                    after: 'lua2-wait-b',
                    title: 'Вторая пауза стоит не на своем месте',
                    reason: 'Между зеленым и красным нужен еще один временной переход.',
                    fix: 'Разместите вторую паузу после зеленого блока.'
                },
                {
                    before: 'lua2-wait-b',
                    after: 'lua2-red',
                    title: 'Красный кадр выполняется слишком рано',
                    reason: 'Последний цвет должен сработать после суммарной секунды ожидания.',
                    fix: 'Поставьте красный блок после второй паузы.'
                }
            ],
            compile: compileLuaTimed
        },
        {
            id: 'lua-preflight',
            badge: 'Задание 3',
            title: 'Предполетная подготовка',
            goal: 'Соберите событийну цепочку: отправьте `PREFLIGHT`, дождитесь `ENGINES_STARTED` и только затем сообщите об успехе.',
            summary: 'Показываем, что для миссий Pioneer шаги часто строятся вокруг событий FSM.',
            expectedOutcome: 'Скрипт запускает `Ev.MCE_PREFLIGHT`, а сообщение переносит в обработчик `callback(event)` для `Ev.ENGINES_STARTED`.',
            builderHint: 'Блок ожидания события открывает ветку `callback(event)`. Все следующие действия относятся к этому событию, пока вы не вставите другое ожидание.',
            targetBlockIds: ['lua3-preflight', 'lua3-engines', 'lua3-print'],
            blocks: [
                createStatementBlock('lua3-preflight', 'отправить PREFLIGHT', 'ap.push(Ev.MCE_PREFLIGHT)', 'Обязательный старт для миссий Lua через FSM Pioneer.', 'setup', 'ap.push(Ev.MCE_PREFLIGHT)'),
                createEventBlock('lua3-engines', 'ждать ENGINES_STARTED', 'if event == Ev.ENGINES_STARTED', 'С этого события начинается безопасный переход к следующим шагам миссии.', 'Ev.ENGINES_STARTED'),
                createStatementBlock('lua3-print', 'показать сообщение', 'print("Двигатели запущены")', 'Сообщает, что предполетная подготовка завершилась успешно.', 'check', 'print("Двигатели запущены")'),
                createStatementBlock('lua3-takeoff', 'отправить TAKEOFF', 'ap.push(Ev.MCE_TAKEOFF)', 'Рабочая команда API, но для текущего урока преждевременная.', 'action', 'ap.push(Ev.MCE_TAKEOFF)'),
                createEventBlock('lua3-point', 'ждать POINT_REACHED', 'if event == Ev.POINT_REACHED', 'Полезно только после полета к точке, поэтому сейчас это лишняя логика.', 'Ev.POINT_REACHED')
            ],
            links: [
                { label: 'ap.push', query: 'ap.push', previewKey: 'ap.push' },
                { label: 'Ev.MCE_PREFLIGHT', query: 'Ev.MCE_PREFLIGHT' },
                { label: 'Ev.ENGINES_STARTED', query: 'Ev.ENGINES_STARTED' }
            ],
            solutionCode: LUA_PREFLIGHT_EXAMPLE,
            actionLabel: 'Открыть старт миссии',
            actionQuery: 'ap.push Ev.MCE_PREFLIGHT Ev.ENGINES_STARTED',
            actionPreviewKey: 'ap.push',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Нет шага `PREFLIGHT`',
                    reason: 'FSM дрона не получает обязательную предполетную команду, поэтому дальнейшие действия считаются нелогичными.',
                    fix: 'Добавьте `ap.push(Ev.MCE_PREFLIGHT)` первым.'
                },
                {
                    kind: 'error',
                    title: 'Действие вынесено из события',
                    reason: 'Сообщение или следующий шаг миссии должны происходить после `Ev.ENGINES_STARTED`, а не сразу при старте.',
                    fix: 'Поставьте блок ожидания `ENGINES_STARTED` перед действием.'
                },
                {
                    kind: 'warning',
                    title: 'Слишком ранний `TAKEOFF`',
                    reason: 'В этом задании мы изучаем только подготовку, поэтому взлет уводит внимание и ломает обучающую цель.',
                    fix: 'Оставьте взлет для следующего урока.'
                }
            ],
            missingBlockDiagnostics: {
                'lua3-preflight': {
                    kind: 'error',
                    title: 'Не отправлена предполетная команда',
                    reason: 'Без `ap.push(Ev.MCE_PREFLIGHT)` двигатели не переходят в состояние запуска.',
                    fix: 'Добавьте блок `отправить PREFLIGHT` в начало цепочки.'
                },
                'lua3-engines': {
                    kind: 'error',
                    title: 'Нет ожидания запуска двигателей',
                    reason: 'Сценарий не отслеживает `Ev.ENGINES_STARTED`, поэтому действие выполняется без подтверждения готовности.',
                    fix: 'Поставьте блок `ждать ENGINES_STARTED` после `PREFLIGHT`.'
                },
                'lua3-print': {
                    kind: 'warning',
                    title: 'Не показан результат подготовки',
                    reason: 'Технически миссия стартует, но ученик не видит подтверждение, что событие реально поймано.',
                    fix: 'Добавьте блок `показать сообщение` после ожидания события.'
                }
            },
            extraBlockDiagnostics: {
                'lua3-takeoff': {
                    kind: 'warning',
                    title: 'Взлет добавлен раньше времени',
                    reason: 'Команда `Ev.MCE_TAKEOFF` рабочая, но это уже следующий урок и она меняет учебный смысл задания.',
                    fix: 'Уберите `TAKEOFF` и сосредоточьтесь на `PREFLIGHT` + `ENGINES_STARTED`.'
                },
                'lua3-point': {
                    kind: 'warning',
                    title: 'Лишнее ожидание точки',
                    reason: '`Ev.POINT_REACHED` никогда не наступит, если в сценарии не было полета к точке.',
                    fix: 'Удалите этот блок из третьего задания.'
                }
            },
            orderRules: [
                {
                    before: 'lua3-preflight',
                    after: 'lua3-engines',
                    title: 'Сначала надо отправить `PREFLIGHT`',
                    reason: 'Ожидание `ENGINES_STARTED` без запуска предполетной подготовки не отражает реальную логику FSM.',
                    fix: 'Поставьте `отправить PREFLIGHT` перед ожиданием события.'
                },
                {
                    before: 'lua3-engines',
                    after: 'lua3-print',
                    title: 'Сообщение срабатывает не по событию',
                    reason: 'Вывод должен выполняться после `Ev.ENGINES_STARTED`, иначе вы сообщаете об успехе раньше факта запуска двигателей.',
                    fix: 'Переместите блок `показать сообщение` ниже ожидания `ENGINES_STARTED`.'
                }
            ],
            compile: compileLuaEvents
        },
        {
            id: 'lua-takeoff',
            badge: 'Задание 4',
            title: 'Правильный взлет',
            goal: 'Добавьте к `PREFLIGHT` вторую ключевую команду: `TAKEOFF` должен отправляться только после `ENGINES_STARTED`.',
            summary: 'Учимся выстраивать причинно-следственную цепочку в коллбэке FSM.',
            expectedOutcome: 'Команда `Ev.MCE_TAKEOFF` попадает внутрь ветки `if event == Ev.ENGINES_STARTED then ... end`.',
            builderHint: 'Если `TAKEOFF` стоит выше ожидания события, он уйдет в корень скрипта и нарушит порядок вызовов API.',
            targetBlockIds: ['lua4-preflight', 'lua4-engines', 'lua4-takeoff'],
            blocks: [
                createStatementBlock('lua4-preflight', 'отправить PREFLIGHT', 'ap.push(Ev.MCE_PREFLIGHT)', 'Обязательная предполетная команда.', 'setup', 'ap.push(Ev.MCE_PREFLIGHT)'),
                createEventBlock('lua4-engines', 'ждать ENGINES_STARTED', 'if event == Ev.ENGINES_STARTED', 'Открывает безопасный момент для команды взлета.', 'Ev.ENGINES_STARTED'),
                createStatementBlock('lua4-takeoff', 'отправить TAKEOFF', 'ap.push(Ev.MCE_TAKEOFF)', 'Целевая команда взлета.', 'action', 'ap.push(Ev.MCE_TAKEOFF)'),
                createEventBlock('lua4-point', 'ждать TAKEOFF_COMPLETE', 'if event == Ev.TAKEOFF_COMPLETE', 'Полезно для следующего урока, но здесь лишнее.', 'Ev.TAKEOFF_COMPLETE'),
                createStatementBlock('lua4-land', 'отправить LANDING', 'ap.push(Ev.MCE_LANDING)', 'Команда посадки рабочая, но без маршрута преждевременна.', 'action', 'ap.push(Ev.MCE_LANDING)')
            ],
            links: [
                { label: 'Ev.MCE_TAKEOFF', query: 'Ev.MCE_TAKEOFF' },
                { label: 'Ev.ENGINES_STARTED', query: 'Ev.ENGINES_STARTED' },
                { label: 'ap.push', query: 'ap.push', previewKey: 'ap.push' }
            ],
            solutionCode: LUA_TAKEOFF_EXAMPLE,
            actionLabel: 'Открыть взлет',
            actionQuery: 'Ev.MCE_TAKEOFF Ev.ENGINES_STARTED ap.push',
            actionPreviewKey: 'ap.push',
            errorCatalog: [
                {
                    kind: 'error',
                    title: '`TAKEOFF` идет без подготовки',
                    reason: 'Команда взлета до `PREFLIGHT` и до `ENGINES_STARTED` нарушает протокол FSM Pioneer.',
                    fix: 'Соберите цепочку `PREFLIGHT` -> `ENGINES_STARTED` -> `TAKEOFF`.'
                },
                {
                    kind: 'warning',
                    title: 'Добавлена посадка без маршрута',
                    reason: 'Посадка технически рабочая, но в этом уроке она не подтверждает понимание логики взлета.',
                    fix: 'Удалите `LANDING` и сосредоточьтесь на трех ключевых блоках.'
                }
            ],
            missingBlockDiagnostics: {
                'lua4-preflight': {
                    kind: 'error',
                    title: 'Пропущен `PREFLIGHT`',
                    reason: 'Без `Ev.MCE_PREFLIGHT` дрон не проходит обязательный этап подготовки.',
                    fix: 'Добавьте блок `отправить PREFLIGHT` первым.'
                },
                'lua4-engines': {
                    kind: 'error',
                    title: 'Не ожидается `ENGINES_STARTED`',
                    reason: 'Сценарий пытается взлететь без подтверждения запуска двигателей.',
                    fix: 'Поставьте блок ожидания `ENGINES_STARTED` перед `TAKEOFF`.'
                },
                'lua4-takeoff': {
                    kind: 'error',
                    title: 'Команда взлета отсутствует',
                    reason: 'Подготовка есть, но ключевой целевой шаг урока не выполняется.',
                    fix: 'Добавьте блок `отправить TAKEOFF` после ожидания события.'
                }
            },
            extraBlockDiagnostics: {
                'lua4-point': {
                    kind: 'warning',
                    title: 'Лишнее ожидание `TAKEOFF_COMPLETE`',
                    reason: 'Этот шаг нужен в следующем задании, где после взлета начинается полет к точке.',
                    fix: 'Уберите блок из четвертого урока.'
                },
                'lua4-land': {
                    kind: 'warning',
                    title: 'Ранняя посадка',
                    reason: 'Посадка без промежуточной логики не помогает проверить корректный взлет.',
                    fix: 'Удалите `LANDING` из этой цепочки.'
                }
            },
            orderRules: [
                {
                    before: 'lua4-preflight',
                    after: 'lua4-engines',
                    title: 'Ожидание запуска стоит раньше старта миссии',
                    reason: 'Сначала нужно отправить `PREFLIGHT`, чтобы событие `ENGINES_STARTED` вообще могло произойти.',
                    fix: 'Поставьте `PREFLIGHT` перед ожиданием события.'
                },
                {
                    before: 'lua4-engines',
                    after: 'lua4-takeoff',
                    title: '`TAKEOFF` выполняется не после `ENGINES_STARTED`',
                    reason: 'Команда взлета должна жить внутри обработчика события запуска двигателей.',
                    fix: 'Перетащите `отправить TAKEOFF` ниже блока `ждать ENGINES_STARTED`.'
                }
            ],
            compile: compileLuaEvents
        },
        {
            id: 'lua-mission',
            badge: 'Задание 5',
            title: 'Полная миссия: взлет, точка, посадка',
            goal: 'Соберите полную FSM-цепочку: подготовка, взлет, переход к точке по событию `TAKEOFF_COMPLETE`, затем посадка после `POINT_REACHED`.',
            summary: 'Это первый цельный Lua-сценарий, в котором блоки соединяются по форме, но могут ошибаться по логике событий.',
            expectedOutcome: 'Сценарий корректно распределяет `TAKEOFF`, `goToLocalPoint(...)` и `LANDING` по событиям `ENGINES_STARTED`, `TAKEOFF_COMPLETE` и `POINT_REACHED`.',
            builderHint: 'В этом задании почти все ошибки логические: блоки физически стыкуются, но одно неверное событие сразу переносит команду не в ту ветку `callback(event)`.',
            targetBlockIds: ['lua5-preflight', 'lua5-engines', 'lua5-takeoff', 'lua5-complete', 'lua5-goto', 'lua5-point', 'lua5-land'],
            blocks: [
                createStatementBlock('lua5-preflight', 'PREFLIGHT', 'ap.push(Ev.MCE_PREFLIGHT)', 'Старт миссии.', 'setup', 'ap.push(Ev.MCE_PREFLIGHT)'),
                createEventBlock('lua5-engines', 'ждать ENGINES_STARTED', 'if event == Ev.ENGINES_STARTED', 'Открывает ветку для взлета.', 'Ev.ENGINES_STARTED'),
                createStatementBlock('lua5-takeoff', 'TAKEOFF', 'ap.push(Ev.MCE_TAKEOFF)', 'Команда взлета.', 'action', 'ap.push(Ev.MCE_TAKEOFF)'),
                createEventBlock('lua5-complete', 'ждать TAKEOFF_COMPLETE', 'if event == Ev.TAKEOFF_COMPLETE', 'После этого события допустимо отправлять полет к точке.', 'Ev.TAKEOFF_COMPLETE'),
                createStatementBlock('lua5-goto', 'лететь к точке', 'ap.goToLocalPoint(1, 0, 1)', 'Переводит дрон в полет к локальной координате.', 'action', 'ap.goToLocalPoint(1, 0, 1)'),
                createEventBlock('lua5-point', 'ждать POINT_REACHED', 'if event == Ev.POINT_REACHED', 'Сигнал, что маршрут выполнен.', 'Ev.POINT_REACHED'),
                createStatementBlock('lua5-land', 'LANDING', 'ap.push(Ev.MCE_LANDING)', 'Завершает миссию посадкой.', 'action', 'ap.push(Ev.MCE_LANDING)'),
                createStatementBlock('lua5-print', 'сообщить о точке', 'print("Точка достигнута")', 'Отладочный вывод допустим, но не заменяет посадку.', 'check', 'print("Точка достигнута")')
            ],
            links: [
                { label: 'ap.goToLocalPoint', query: 'ap.goToLocalPoint', previewKey: 'ap.goToLocalPoint' },
                { label: 'Ev.TAKEOFF_COMPLETE', query: 'Ev.TAKEOFF_COMPLETE' },
                { label: 'Ev.POINT_REACHED', query: 'Ev.POINT_REACHED' },
                { label: 'Ev.MCE_LANDING', query: 'Ev.MCE_LANDING' }
            ],
            solutionCode: LUA_MISSION_EXAMPLE,
            actionLabel: 'Открыть полную миссию',
            actionQuery: 'ap.goToLocalPoint Ev.TAKEOFF_COMPLETE Ev.POINT_REACHED Ev.MCE_LANDING',
            actionPreviewKey: 'ap.goToLocalPoint',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Полет к точке стоит до взлета',
                    reason: '`ap.goToLocalPoint(...)` логически допустим только после завершения взлета.',
                    fix: 'Разместите полет под событием `TAKEOFF_COMPLETE`.'
                },
                {
                    kind: 'error',
                    title: 'Посадка стоит не после `POINT_REACHED`',
                    reason: 'Если отправить `LANDING` раньше, маршрут не будет завершен корректно.',
                    fix: 'Поставьте посадку после блока `ждать POINT_REACHED`.'
                },
                {
                    kind: 'error',
                    title: 'Нарушена цепочка событий FSM',
                    reason: 'Каждая команда должна висеть на своем событии: `TAKEOFF` на `ENGINES_STARTED`, `goToLocalPoint(...)` на `TAKEOFF_COMPLETE`, `LANDING` на `POINT_REACHED`.',
                    fix: 'Проверьте порядок ожиданий и действий.'
                }
            ],
            missingBlockDiagnostics: {
                'lua5-preflight': {
                    kind: 'error',
                    title: 'Нет команды `PREFLIGHT`',
                    reason: 'Миссия не может стартовать без первоначальной подготовки.',
                    fix: 'Добавьте блок `PREFLIGHT` первым.'
                },
                'lua5-engines': {
                    kind: 'error',
                    title: 'Нет ожидания `ENGINES_STARTED`',
                    reason: 'Без этого события взлет отправляется без подтверждения готовности двигателей.',
                    fix: 'Поставьте блок `ждать ENGINES_STARTED` сразу после `PREFLIGHT`.'
                },
                'lua5-takeoff': {
                    kind: 'error',
                    title: 'Не отправлен `TAKEOFF`',
                    reason: 'Без взлета миссия не может перейти к полету в точку.',
                    fix: 'Добавьте блок `TAKEOFF` после `ENGINES_STARTED`.'
                },
                'lua5-complete': {
                    kind: 'error',
                    title: 'Нет ожидания `TAKEOFF_COMPLETE`',
                    reason: 'Команда перехода к точке должна запускаться после завершения взлета, а не сразу.',
                    fix: 'Добавьте блок `ждать TAKEOFF_COMPLETE` перед полетом к точке.'
                },
                'lua5-goto': {
                    kind: 'error',
                    title: 'Не задан полет к точке',
                    reason: 'Без `ap.goToLocalPoint(...)` маршрут урока остается незавершенным.',
                    fix: 'Добавьте блок `лететь к точке` после `TAKEOFF_COMPLETE`.'
                },
                'lua5-point': {
                    kind: 'error',
                    title: 'Нет ожидания `POINT_REACHED`',
                    reason: 'Посадка должна запускаться после подтверждения достижения координаты.',
                    fix: 'Добавьте блок `ждать POINT_REACHED` перед `LANDING`.'
                },
                'lua5-land': {
                    kind: 'error',
                    title: 'Не добавлена посадка',
                    reason: 'Сценарий выполняет взлет и маршрут, но не завершает миссию безопасной посадкой.',
                    fix: 'Добавьте блок `LANDING` после `POINT_REACHED`.'
                }
            },
            extraBlockDiagnostics: {
                'lua5-print': {
                    kind: 'warning',
                    title: 'Оставлен только отладочный вывод',
                    reason: '`print(...)` полезен для наблюдения, но он не заменяет реальный шаг посадки.',
                    fix: 'Используйте сообщение только дополнительно, не вместо `LANDING`.'
                }
            },
            orderRules: [
                {
                    before: 'lua5-preflight',
                    after: 'lua5-engines',
                    title: 'Цепочка начинается не с `PREFLIGHT`',
                    reason: 'FSM-сценарий всегда должен стартовать с команды предполетной подготовки.',
                    fix: 'Поставьте `PREFLIGHT` в начало.'
                },
                {
                    before: 'lua5-engines',
                    after: 'lua5-takeoff',
                    title: '`TAKEOFF` стоит не в ветке `ENGINES_STARTED`',
                    reason: 'Взлет должен отправляться только после запуска двигателей.',
                    fix: 'Разместите `TAKEOFF` сразу после ожидания `ENGINES_STARTED`.'
                },
                {
                    before: 'lua5-complete',
                    after: 'lua5-goto',
                    title: 'Полет к точке отправляется слишком рано',
                    reason: '`ap.goToLocalPoint(...)` должен ждать события `TAKEOFF_COMPLETE`.',
                    fix: 'Переместите блок `лететь к точке` после `ждать TAKEOFF_COMPLETE`.'
                },
                {
                    before: 'lua5-point',
                    after: 'lua5-land',
                    title: 'Посадка не привязана к достижению точки',
                    reason: '`LANDING` должен отправляться после `POINT_REACHED`, иначе маршрут завершается преждевременно.',
                    fix: 'Поставьте блок `LANDING` после `ждать POINT_REACHED`.'
                }
            ],
            compile: compileLuaEvents
        }
    ];

    return {
        activeLessonId: lessons[0].id,
        heroEyebrow: 'Lua, 5 интерактивных страниц',
        heroTitle: 'Краткое руководство: Scratch-подобные паззлы на реальном Pioneer API',
        heroText: 'Каждая страница это самостоятельное учебное задание. Пользователь собирает цепочку из настоящих API-команд, получает пояснение логических ошибок и может сразу загрузить сгенерированный Lua-сценарий в симулятор.',
        heroFlow: 'LED -> таймеры -> PREFLIGHT -> TAKEOFF -> goto point -> LANDING',
        lessons
    };
}

function getPythonState(): GuideLessonState {
    const lessons: GuideLesson[] = [
        {
            id: 'py-led-single',
            badge: 'Задание 1',
            title: 'Включить красную подсветку',
            goal: 'Соберите минимальный Python-сценарий, который использует `pioneer.led_control(...)` для включения красного цвета.',
            summary: 'Первый шаг знакомит с прямым вызовом метода Pioneer SDK.',
            expectedOutcome: 'Код импортирует Pioneer SDK, создает `pioneer = Pioneer(simulator=True)` и вызывает `pioneer.led_control(r=255, g=0, b=0)`.',
            builderHint: 'Пролог Python добавляется автоматически. В рабочую область нужно собрать только смысловую последовательность методов.',
            targetBlockIds: ['py1-red'],
            blocks: [
                createStatementBlock('py1-red', 'красный LED', 'pioneer.led_control(r=255, g=0, b=0)', 'Эталонная команда урока.', 'action', 'pioneer.led_control(r=255, g=0, b=0)'),
                createStatementBlock('py1-blue', 'синий LED', 'pioneer.led_control(r=0, g=0, b=255)', 'Рабочий вызов, но неверный для цели задания.', 'action', 'pioneer.led_control(r=0, g=0, b=255)'),
                createStatementBlock('py1-sleep', 'пауза 0.5 c', 'time.sleep(0.5)', 'Пауза допустима, но для одного цвета она не нужна.', 'wait', 'time.sleep(0.5)'),
                createStatementBlock('py1-takeoff', 'takeoff()', 'pioneer.takeoff()', 'Настоящая команда, но она не относится к LED-упражнению.', 'action', 'pioneer.takeoff()')
            ],
            links: [
                { label: 'Pioneer.led_control', query: 'Pioneer.led_control' }
            ],
            solutionCode: PYTHON_LED_SINGLE_EXAMPLE,
            actionLabel: 'Открыть LED API',
            actionQuery: 'Pioneer.led_control',
            errorCatalog: [
                {
                    kind: 'warning',
                    title: 'Выбран другой цвет',
                    reason: 'Метод `led_control(...)` рабочий, но урок проверяет именно красный индикатор как контрольный результат.',
                    fix: 'Оставьте только блок `красный LED`.'
                },
                {
                    kind: 'warning',
                    title: 'Добавлены лишние шаги миссии',
                    reason: '`takeoff()` или пауза здесь не помогают понять базовый вызов `led_control(...)`.',
                    fix: 'Соберите цепочку из одного LED-блока.'
                }
            ],
            missingBlockDiagnostics: {
                'py1-red': {
                    kind: 'error',
                    title: 'Нет целевого вызова `led_control(...)`',
                    reason: 'Без команды `pioneer.led_control(r=255, g=0, b=0)` задание не выполняет красную подсветку.',
                    fix: 'Добавьте блок `красный LED` в рабочую область.'
                }
            },
            extraBlockDiagnostics: {
                'py1-blue': {
                    kind: 'warning',
                    title: 'Использован неверный цвет',
                    reason: 'Синий светодиод это корректный вызов Pioneer SDK, но не тот результат, который требуется в уроке.',
                    fix: 'Удалите синий блок и оставьте красный.'
                },
                'py1-sleep': {
                    kind: 'warning',
                    title: 'Пауза не нужна для одиночного LED-вызова',
                    reason: 'Одно изменение цвета можно выполнить сразу, без дополнительного ожидания.',
                    fix: 'Уберите `time.sleep(0.5)` из первого задания.'
                },
                'py1-takeoff': {
                    kind: 'warning',
                    title: 'Команда полета лишняя',
                    reason: '`pioneer.takeoff()` технически рабочий, но не относится к упражнению про подсветку.',
                    fix: 'Сосредоточьтесь только на `led_control(...)`.'
                }
            },
            compile: compilePython
        },
        {
            id: 'py-led-sequence',
            badge: 'Задание 2',
            title: 'Мигание с паузами',
            goal: 'Соберите Python-последовательность из трех цветов, разделенных паузами `time.sleep(...)`.',
            summary: 'Показываем, почему несколько вызовов подряд без задержек визуально не читаются.',
            expectedOutcome: 'Код последовательно вызывает `pioneer.led_control(...)`, а между изменениями цвета стоят две паузы по 0.5 секунды.',
            builderHint: 'В этом уроке порядок критичен: цвет -> пауза -> цвет -> пауза -> цвет.',
            targetBlockIds: ['py2-blue', 'py2-wait-a', 'py2-green', 'py2-wait-b', 'py2-red'],
            blocks: [
                createStatementBlock('py2-blue', 'синий LED', 'pioneer.led_control(r=0, g=0, b=255)', 'Первый кадр последовательности.', 'action', 'pioneer.led_control(r=0, g=0, b=255)'),
                createStatementBlock('py2-wait-a', 'пауза 0.5 c', 'time.sleep(0.5)', 'Дает глазу время увидеть первый цвет.', 'wait', 'time.sleep(0.5)'),
                createStatementBlock('py2-green', 'зеленый LED', 'pioneer.led_control(r=0, g=255, b=0)', 'Второй кадр.', 'action', 'pioneer.led_control(r=0, g=255, b=0)'),
                createStatementBlock('py2-wait-b', 'еще пауза 0.5 c', 'time.sleep(0.5)', 'Разводит второй и третий кадры.', 'wait', 'time.sleep(0.5)'),
                createStatementBlock('py2-red', 'красный LED', 'pioneer.led_control(r=255, g=0, b=0)', 'Финальный кадр.', 'action', 'pioneer.led_control(r=255, g=0, b=0)'),
                createStatementBlock('py2-takeoff', 'takeoff()', 'pioneer.takeoff()', 'Рабочая команда, но не часть LED-анимации.', 'action', 'pioneer.takeoff()')
            ],
            links: [
                { label: 'Pioneer.led_control', query: 'Pioneer.led_control' },
                { label: 'time.sleep', query: 'time.sleep' }
            ],
            solutionCode: PYTHON_LED_SEQUENCE_EXAMPLE,
            actionLabel: 'Открыть паузы',
            actionQuery: 'Pioneer.led_control time.sleep',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Цвета идут подряд без пауз',
                    reason: 'Несколько `led_control(...)` без `time.sleep(...)` сменятся почти мгновенно, и пользователь увидит только последний цвет.',
                    fix: 'Обязательно вставляйте паузу между сменами цветов.'
                },
                {
                    kind: 'warning',
                    title: 'Добавлен лишний шаг полета',
                    reason: '`takeoff()` не относится к демонстрации LED-анимации и запутывает учебную цепочку.',
                    fix: 'Уберите команды полета из второго урока.'
                }
            ],
            missingBlockDiagnostics: {
                'py2-blue': {
                    kind: 'error',
                    title: 'Нет первого синего кадра',
                    reason: 'Сценарий теряет стартовую точку анимации.',
                    fix: 'Добавьте блок `синий LED` в начало.'
                },
                'py2-wait-a': {
                    kind: 'error',
                    title: 'Пропущена первая пауза',
                    reason: 'Без первой задержки синий и зеленый кадры сливаются.',
                    fix: 'Поставьте `пауза 0.5 c` между синим и зеленым.'
                },
                'py2-green': {
                    kind: 'error',
                    title: 'Нет зеленого кадра',
                    reason: 'Последовательность цветов неполная.',
                    fix: 'Добавьте блок `зеленый LED` после первой паузы.'
                },
                'py2-wait-b': {
                    kind: 'error',
                    title: 'Пропущена вторая пауза',
                    reason: 'Без второй задержки красный цвет включится слишком быстро после зеленого.',
                    fix: 'Добавьте вторую паузу перед красным кадром.'
                },
                'py2-red': {
                    kind: 'error',
                    title: 'Нет финального красного кадра',
                    reason: 'Анимация не завершается контрольным цветом урока.',
                    fix: 'Добавьте блок `красный LED` после второй паузы.'
                }
            },
            extraBlockDiagnostics: {
                'py2-takeoff': {
                    kind: 'warning',
                    title: 'Команда `takeoff()` здесь лишняя',
                    reason: 'Этот вызов не помогает изучить работу `led_control(...)` и `time.sleep(...)`.',
                    fix: 'Уберите `takeoff()` из LED-упражнения.'
                }
            },
            orderRules: [
                {
                    before: 'py2-blue',
                    after: 'py2-wait-a',
                    title: 'После первого цвета нет паузы',
                    reason: 'Пауза должна идти сразу за синим кадром, иначе анимация теряет читаемость.',
                    fix: 'Переместите первую паузу сразу после синего блока.'
                },
                {
                    before: 'py2-wait-a',
                    after: 'py2-green',
                    title: 'Зеленый цвет идет не после первой паузы',
                    reason: 'Порядок цветовых кадров нарушен.',
                    fix: 'Поставьте `зеленый LED` сразу после первой паузы.'
                },
                {
                    before: 'py2-green',
                    after: 'py2-wait-b',
                    title: 'Вторая пауза стоит не после зеленого',
                    reason: 'Между зеленым и красным кадрами нужен отдельный разрыв по времени.',
                    fix: 'Разместите вторую паузу после зеленого блока.'
                },
                {
                    before: 'py2-wait-b',
                    after: 'py2-red',
                    title: 'Красный цвет включается слишком рано',
                    reason: 'Он должен завершать анимацию после второй задержки.',
                    fix: 'Переместите красный блок ниже второй паузы.'
                }
            ],
            compile: compilePython
        },
        {
            id: 'py-arm',
            badge: 'Задание 3',
            title: 'Подготовить двигатели',
            goal: 'Соберите шаг подготовки в Python: вызовите `arm()` и выведите сообщение о готовности.',
            summary: 'Здесь важно понять, что без `arm()` следующие команды полета логически преждевременны.',
            expectedOutcome: 'Скрипт вызывает `pioneer.arm()` и выводит сообщение о том, что двигатели готовы к старту.',
            builderHint: 'Даже если блоки стыкуются, `takeoff()` без `arm()` останется ошибкой логики API.',
            targetBlockIds: ['py3-arm', 'py3-print'],
            blocks: [
                createStatementBlock('py3-arm', 'arm()', 'pioneer.arm()', 'Переводит дрон в состояние готовности к взлету.', 'setup', 'pioneer.arm()'),
                createStatementBlock('py3-print', 'сообщить о готовности', 'print("Двигатели готовы")', 'Дает пользователю обратную связь о выполнении шага.', 'check', 'print("Двигатели готовы")'),
                createStatementBlock('py3-takeoff', 'takeoff()', 'pioneer.takeoff()', 'Настоящая команда, но для этого урока преждевременная.', 'action', 'pioneer.takeoff()'),
                createStatementBlock('py3-land', 'land()', 'pioneer.land()', 'Рабочая команда API, но без взлета ее смысл теряется.', 'action', 'pioneer.land()')
            ],
            links: [
                { label: 'Pioneer.arm', query: 'Pioneer.arm', previewKey: 'Pioneer.arm' }
            ],
            solutionCode: PYTHON_ARM_EXAMPLE,
            actionLabel: 'Открыть arm()',
            actionQuery: 'Pioneer.arm',
            actionPreviewKey: 'Pioneer.arm',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Пропущен `arm()`',
                    reason: 'Без `pioneer.arm()` следующие команды полета не проходят этап подготовки.',
                    fix: 'Всегда начинайте цепочку со `starling`-шага arm.'
                },
                {
                    kind: 'warning',
                    title: 'Добавлен `takeoff()` раньше времени',
                    reason: 'В этом уроке проверяется только подготовка двигателей, а не полет.',
                    fix: 'Оставьте взлет для следующего упражнения.'
                }
            ],
            missingBlockDiagnostics: {
                'py3-arm': {
                    kind: 'error',
                    title: 'Не вызван `arm()`',
                    reason: 'Дрон не переводится в состояние готовности, поэтому смысл задания теряется.',
                    fix: 'Добавьте блок `arm()` в начало цепочки.'
                },
                'py3-print': {
                    kind: 'warning',
                    title: 'Нет сообщения о результате',
                    reason: 'Подготовка выполняется, но пользователь не видит явного подтверждения.',
                    fix: 'Добавьте блок `сообщить о готовности` после `arm()`.'
                }
            },
            extraBlockDiagnostics: {
                'py3-takeoff': {
                    kind: 'warning',
                    title: '`takeoff()` рано добавлен в цепочку',
                    reason: 'Он нужен в следующем уроке и сейчас нарушает учебную фокусировку.',
                    fix: 'Удалите `takeoff()` из третьего задания.'
                },
                'py3-land': {
                    kind: 'warning',
                    title: '`land()` без взлета бессмысленен',
                    reason: 'Команда посадки не должна появляться в сценарии подготовки двигателей.',
                    fix: 'Оставьте только `arm()` и сообщение.'
                }
            },
            orderRules: [
                {
                    before: 'py3-arm',
                    after: 'py3-print',
                    title: 'Сообщение идет раньше подготовки',
                    reason: 'Подтверждение готовности должно выводиться после команды `arm()`, а не до нее.',
                    fix: 'Поставьте блок сообщения ниже `arm()`.'
                }
            ],
            compile: compilePython
        },
        {
            id: 'py-takeoff',
            badge: 'Задание 4',
            title: 'Взлет с паузой',
            goal: 'Соберите базовый сценарий взлета: `arm()` -> пауза -> `takeoff()`.',
            summary: 'Пауза между подготовкой и взлетом помогает увидеть причинно-следственную связь команд.',
            expectedOutcome: 'Код вызывает `pioneer.arm()`, затем `time.sleep(1)`, затем `pioneer.takeoff()`.',
            builderHint: 'Если поставить `takeoff()` раньше паузы или вовсе до `arm()`, это будет логическая ошибка даже при корректном синтаксисе.',
            targetBlockIds: ['py4-arm', 'py4-wait', 'py4-takeoff'],
            blocks: [
                createStatementBlock('py4-arm', 'arm()', 'pioneer.arm()', 'Первый обязательный шаг.', 'setup', 'pioneer.arm()'),
                createStatementBlock('py4-wait', 'пауза 1 c', 'time.sleep(1)', 'Дает дрону время на переход к взлету и делает сценарий наблюдаемым.', 'wait', 'time.sleep(1)'),
                createStatementBlock('py4-takeoff', 'takeoff()', 'pioneer.takeoff()', 'Команда взлета.', 'action', 'pioneer.takeoff()'),
                createStatementBlock('py4-goto', 'go_to_local_point()', 'pioneer.go_to_local_point(x=1, y=0, z=1)', 'Настоящий полетный вызов, но уже относится к следующему уроку.', 'action', 'pioneer.go_to_local_point(x=1, y=0, z=1)')
            ],
            links: [
                { label: 'Pioneer.takeoff', query: 'Pioneer.takeoff', previewKey: 'Pioneer.takeoff' },
                { label: 'time.sleep', query: 'time.sleep takeoff arm' }
            ],
            solutionCode: PYTHON_TAKEOFF_EXAMPLE,
            actionLabel: 'Открыть takeoff()',
            actionQuery: 'Pioneer.takeoff time.sleep Pioneer.arm',
            actionPreviewKey: 'Pioneer.takeoff',
            errorCatalog: [
                {
                    kind: 'error',
                    title: '`takeoff()` без `arm()`',
                    reason: 'Взлет без подготовки нарушает базовую логику Pioneer API.',
                    fix: 'Всегда ставьте `arm()` первым.'
                },
                {
                    kind: 'warning',
                    title: 'Нет временного разрыва',
                    reason: 'Без паузы команды выполняются почти мгновенно и труднее понять, почему именно дрон взлетает.',
                    fix: 'Добавьте `time.sleep(1)` между `arm()` и `takeoff()`.'
                }
            ],
            missingBlockDiagnostics: {
                'py4-arm': {
                    kind: 'error',
                    title: 'Не вызван `arm()`',
                    reason: 'Без подготовки взлетный сценарий логически неполон.',
                    fix: 'Добавьте `arm()` в начало.'
                },
                'py4-wait': {
                    kind: 'warning',
                    title: 'Между шагами нет паузы',
                    reason: 'Команды уходят подряд, и учебный сценарий становится менее понятным.',
                    fix: 'Вставьте блок `пауза 1 c` между `arm()` и `takeoff()`.'
                },
                'py4-takeoff': {
                    kind: 'error',
                    title: 'Не добавлен `takeoff()`',
                    reason: 'Подготовка есть, но сам взлет не выполняется.',
                    fix: 'Добавьте блок `takeoff()` после паузы.'
                }
            },
            extraBlockDiagnostics: {
                'py4-goto': {
                    kind: 'warning',
                    title: 'Маршрут добавлен до изучения взлета',
                    reason: '`go_to_local_point(...)` нужен только после того, как базовый сценарий взлета уже собран.',
                    fix: 'Удалите блок полета к точке из четвертого урока.'
                }
            },
            orderRules: [
                {
                    before: 'py4-arm',
                    after: 'py4-wait',
                    title: 'Пауза стоит раньше `arm()`',
                    reason: 'Сначала нужно подготовить двигатели, а затем делать осмысленную задержку.',
                    fix: 'Поставьте `arm()` первым.'
                },
                {
                    before: 'py4-wait',
                    after: 'py4-takeoff',
                    title: '`takeoff()` идет без паузы после подготовки',
                    reason: 'Урок специально тренирует связку `arm()` -> `time.sleep(...)` -> `takeoff()`.',
                    fix: 'Разместите `takeoff()` после блока паузы.'
                }
            ],
            compile: compilePython
        },
        {
            id: 'py-mission',
            badge: 'Задание 5',
            title: 'Маршрут с ожиданием точки и посадкой',
            goal: 'Соберите полноценную Python-миссию: `arm()`, `takeoff()`, ожидание, `go_to_local_point(...)`, цикл `point_reached()` и `land()`.',
            summary: 'В финальном уроке блоки все еще совместимы по форме, но любая ошибка порядка нарушает логику сценария.',
            expectedOutcome: 'Сценарий последовательно подготавливает дрон, взлетает, летит к точке, ждет `point_reached()` и завершает полет посадкой.',
            builderHint: 'Особенно следите за блоком ожидания точки: без него посадка может уйти до завершения перемещения.',
            targetBlockIds: ['py5-arm', 'py5-wait-start', 'py5-takeoff', 'py5-wait-flight', 'py5-goto', 'py5-reached', 'py5-land'],
            blocks: [
                createStatementBlock('py5-arm', 'arm()', 'pioneer.arm()', 'Подготовка двигателей.', 'setup', 'pioneer.arm()'),
                createStatementBlock('py5-wait-start', 'пауза 1 c', 'time.sleep(1)', 'Разделяет подготовку и взлет.', 'wait', 'time.sleep(1)'),
                createStatementBlock('py5-takeoff', 'takeoff()', 'pioneer.takeoff()', 'Команда взлета.', 'action', 'pioneer.takeoff()'),
                createStatementBlock('py5-wait-flight', 'подождать 3 c', 'time.sleep(3)', 'Дает дрону набрать высоту перед маршрутом.', 'wait', 'time.sleep(3)'),
                createStatementBlock('py5-goto', 'go_to_local_point()', 'pioneer.go_to_local_point(x=1, y=0, z=1)', 'Команда полета к локальной точке.', 'action', 'pioneer.go_to_local_point(x=1, y=0, z=1)'),
                createStatementBlock('py5-reached', 'ждать point_reached()', 'while not pioneer.point_reached():\n    time.sleep(0.05)', 'Ожидает фактическое завершение перемещения.', 'wait', 'while not pioneer.point_reached():\n    time.sleep(0.05)'),
                createStatementBlock('py5-land', 'land()', 'pioneer.land()', 'Безопасно завершает миссию.', 'action', 'pioneer.land()'),
                createStatementBlock('py5-led', 'сигнал LED', 'pioneer.led_control(r=0, g=255, b=0)', 'Дополнительный рабочий вызов, но он не обязателен для урока маршрута.', 'check', 'pioneer.led_control(r=0, g=255, b=0)')
            ],
            links: [
                { label: 'Pioneer.go_to_local_point', query: 'Pioneer.go_to_local_point', previewKey: 'Pioneer.go_to_local_point' },
                { label: 'Pioneer.point_reached', query: 'Pioneer.point_reached', previewKey: 'Pioneer.point_reached' },
                { label: 'Pioneer.land', query: 'Pioneer.land', previewKey: 'Pioneer.land' }
            ],
            solutionCode: PYTHON_MISSION_EXAMPLE,
            actionLabel: 'Открыть полную миссию',
            actionQuery: 'Pioneer.go_to_local_point Pioneer.point_reached Pioneer.land',
            actionPreviewKey: 'Pioneer.go_to_local_point',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Полет к точке идет до взлета',
                    reason: '`go_to_local_point(...)` без предварительного `takeoff()` нарушает базовую логику миссии.',
                    fix: 'Сначала соберите `arm()` -> `takeoff()`, затем переходите к маршруту.'
                },
                {
                    kind: 'error',
                    title: 'Нет ожидания `point_reached()`',
                    reason: 'Если сразу после `go_to_local_point(...)` поставить `land()`, посадка может начаться до завершения полета.',
                    fix: 'Добавьте цикл ожидания `while not pioneer.point_reached(): ...`.'
                },
                {
                    kind: 'warning',
                    title: 'Лишние дополнительные вызовы',
                    reason: 'Вспомогательные команды вроде `led_control(...)` допустимы, но не должны скрывать основную учебную цепочку.',
                    fix: 'Сначала соберите эталонную миссию, затем экспериментируйте.'
                }
            ],
            missingBlockDiagnostics: {
                'py5-arm': {
                    kind: 'error',
                    title: 'Нет `arm()`',
                    reason: 'Миссия начинается без подготовки двигателей.',
                    fix: 'Добавьте блок `arm()` первым.'
                },
                'py5-wait-start': {
                    kind: 'warning',
                    title: 'Пропущена стартовая пауза',
                    reason: 'Учебный сценарий теряет наглядность и команды выполняются слишком плотно.',
                    fix: 'Вставьте `time.sleep(1)` между `arm()` и `takeoff()`.'
                },
                'py5-takeoff': {
                    kind: 'error',
                    title: 'Нет `takeoff()`',
                    reason: 'Без взлета маршрут к точке нелогичен.',
                    fix: 'Добавьте блок `takeoff()` после первой паузы.'
                },
                'py5-wait-flight': {
                    kind: 'warning',
                    title: 'Нет паузы перед маршрутом',
                    reason: 'Маршрут к точке лучше отправлять после набора высоты.',
                    fix: 'Добавьте блок `подождать 3 c` перед `go_to_local_point(...)`.'
                },
                'py5-goto': {
                    kind: 'error',
                    title: 'Нет команды полета к точке',
                    reason: 'Миссия не выполняет маршрутную часть.',
                    fix: 'Добавьте `go_to_local_point()` после паузы полета.'
                },
                'py5-reached': {
                    kind: 'error',
                    title: 'Нет ожидания `point_reached()`',
                    reason: 'Сценарий не проверяет, что точка реально достигнута.',
                    fix: 'Добавьте блок `ждать point_reached()` перед посадкой.'
                },
                'py5-land': {
                    kind: 'error',
                    title: 'Нет `land()`',
                    reason: 'Маршрут выполнен не до конца: отсутствует безопасное завершение полета.',
                    fix: 'Добавьте блок `land()` в конец.'
                }
            },
            extraBlockDiagnostics: {
                'py5-led': {
                    kind: 'warning',
                    title: 'Дополнительный LED-сигнал не обязателен',
                    reason: 'Он не ломает код, но может отвлекать от основного порядка миссии.',
                    fix: 'Сначала соберите базовую миссию без дополнительных эффектов.'
                }
            },
            orderRules: [
                {
                    before: 'py5-arm',
                    after: 'py5-wait-start',
                    title: 'Первая пауза стоит раньше `arm()`',
                    reason: 'Сначала нужно подготовить дрон, и только потом делать осмысленную задержку.',
                    fix: 'Поставьте `arm()` перед первой паузой.'
                },
                {
                    before: 'py5-wait-start',
                    after: 'py5-takeoff',
                    title: '`takeoff()` идет не после стартовой паузы',
                    reason: 'Учебная логика требует явного разрыва между подготовкой и взлетом.',
                    fix: 'Переместите `takeoff()` после первой паузы.'
                },
                {
                    before: 'py5-wait-flight',
                    after: 'py5-goto',
                    title: 'Маршрут отправляется слишком рано',
                    reason: 'Команда `go_to_local_point(...)` должна идти после паузы на набор высоты.',
                    fix: 'Поставьте маршрут ниже блока `подождать 3 c`.'
                },
                {
                    before: 'py5-reached',
                    after: 'py5-land',
                    title: 'Посадка стоит раньше ожидания точки',
                    reason: '`land()` должен завершать миссию только после подтверждения `point_reached()`.',
                    fix: 'Переместите `land()` ниже блока ожидания точки.'
                }
            ],
            compile: compilePython
        }
    ];

    return {
        activeLessonId: lessons[0].id,
        heroEyebrow: 'Python, 5 интерактивных страниц',
        heroTitle: 'Краткое руководство: паззл-сценарии Pioneer SDK для Python',
        heroText: 'На каждой странице пользователь собирает из готовых блоков реальные команды Pioneer API, получает подробную диагностику логических ошибок и может сразу загрузить runnable Python-код в симулятор.',
        heroFlow: 'led_control -> sleep -> arm -> takeoff -> go_to_local_point -> point_reached -> land',
        lessons
    };
}
