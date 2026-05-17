import { createEventBlock, createStatementBlock, createTimerBlock } from '../../lesson-builders.js';
import { compileLuaEvents, compileLuaLinear, compileLuaTimed, compilePython } from '../../lesson-compilers.js';
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
} from '../../snippets.js';
import type { GuideLesson, GuideLessonState } from '../../types.js';
import { GUIDE_CHAPTER_IDS } from '../../curriculum.js';
import { apiFocus } from '../../lesson-state-helpers.js';

export function getLuaLedLessons(): GuideLesson[] {
    return [
        {
            id: 'lua-led-single',
            chapterId: GUIDE_CHAPTER_IDS.foundations,
            badge: 'Задание 1',
            title: 'Зажечь один светодиод',
            goal: 'Соберите минимальный Lua-сценарий: сначала создайте `Ledbar(29)`, затем задайте красный цвет первому диоду.',
            summary: 'Учимся связывать инициализацию устройства и первый вызов `leds:set(...)`, используя `Ledbar.new(29)`.',
            lessonIntro: 'В этом уроке вы знакомитесь с самой простой цепочкой управления периферией: сначала нужно создать объект светодиодной ленты через `Ledbar.new(29)`, а потом вызвать метод, который меняет состояние конкретного диода.',
            expectedOutcome: 'Скрипт создает объект `Ledbar(29)` и сразу окрашивает один светодиод в красный.',
            builderHint: 'Все паззлы физически совместимы, но логически правильная цепочка здесь короткая: `Ledbar(29)` и одна установка цвета.',
            apiFocus: [
                apiFocus('Ledbar.new(count)', 'Создает объект светодиодной ленты. Для стабильной работы здесь используем `Ledbar.new(29)`.', 'local leds = Ledbar.new(29)'),
                apiFocus('leds:set(index, r, g, b)', 'Меняет цвет конкретного светодиода. В этом уроке нужен первый диод и красный цвет.', 'leds:set(0, 1, 0, 0)')
            ],
            targetBlockIds: ['lua_ledbar_new', 'lua_led_set', 'lua_callback_open', 'lua_callback_end'],
            blocks: [
                createStatementBlock('lua-ledbar', 'создать Ledbar', 'local leds = Ledbar.new(29)', 'Инициализирует светодиодную ленту через `Ledbar.new(29)`, без этого дальнейшие обращения к `leds:set(...)` не имеют смысла.', 'setup', 'local leds = Ledbar.new(29)'),
                createStatementBlock('lua-led-red', 'задать красный цвет', 'leds:set(0, 1, 0, 0)', 'Правильный целевой блок задания: первый диод загорается красным.', 'action', 'leds:set(0, 1, 0, 0)'),
                createStatementBlock('lua-led-blue', 'задать синий цвет', 'leds:set(0, 0, 0, 1)', 'Рабочая команда API, но для этого задания она приводит к неверному результату.', 'action', 'leds:set(0, 0, 0, 1)'),
                createTimerBlock('lua-wait-led', 'подождать 0.5 c', 'Timer.callLater(0.5, ...)', 'Пауза полезна для анимации, но в этом стартовом задании она не нужна.', 0.5),
                createStatementBlock('lua-led-print', 'вывести сообщение', 'print("LED готов")', 'Сообщение допустимо технически, но не относится к учебной цели задания.', 'check', 'print("LED готов")'),
                createStatementBlock('lua_callback_open', 'открыть callback', 'function callback(event)', 'Открывает обязательную событийную функцию Lua-сценария.', 'setup', 'function callback(event)'),
                createStatementBlock('lua_callback_end', 'закрыть callback', 'end', 'Закрывает область function callback(event).', 'setup', 'end')
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
                },
                'lua_callback_open': {
                    kind: 'error',
                    title: 'Не открыт callback',
                    reason: 'В интерактивном учебнике `function callback(event)` должен быть отдельным открывающим блоком.',
                    fix: 'Добавьте блок `открыть callback` перед событийной логикой.'
                },
                'lua_callback_end': {
                    kind: 'error',
                    title: 'Не закрыт callback',
                    reason: 'Конструкция `function callback(event)` должна завершаться отдельным независимым блоком `end`.',
                    fix: 'Добавьте блок `закрыть callback` после содержимого callback.'
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
            chapterId: GUIDE_CHAPTER_IDS.foundations,
            badge: 'Задание 2',
            title: 'Световая анимация с таймерами',
            goal: 'Соберите анимацию на одном диоде: через 1 секунду синий, через 2 секунды зеленый, через 3 секунды красный.',
            summary: 'Таймеры идут друг за другом в основной ветке, а каждый цвет лежит внутри своего `callback`.',
            lessonIntro: 'Теперь одного вызова `leds:set(...)` уже недостаточно. В этом уроке правильная схема такая: сначала создается `Ledbar`, затем идут три блока `Timer.callLater(...)` подряд. Внутри каждого `callback` лежит только свой `leds:set(...)`. Для стабильной работы в реальном Pioneer здесь используем `Ledbar.new(29)`.',
            expectedOutcome: 'Скрипт создает `Ledbar(29)`, через 1 секунду включает синий цвет, через 2 секунды от старта переключает тот же диод на зеленый, а через 3 секунды от старта включает красный.',
            builderHint: 'Собирайте так: `Ledbar(29)`, затем три таймера подряд со значениями `1`, `2`, `3`. Внутри первого синий, внутри второго зеленый, внутри третьего красный.',
            apiFocus: [
                apiFocus('Timer.callLater(seconds, callback)', 'Запускает отложенный callback. В этом уроке три таймера стоят последовательно и срабатывают через 1, 2 и 3 секунды от старта.', 'Timer.callLater(1.0, function() ... end)'),
                apiFocus('leds:set(index, r, g, b)', 'Каждый цвет лежит внутри своего таймера. Все три кадра включают один и тот же диод `0`.', 'leds:set(0, 0, 1, 0)')
            ],
            targetBlockIds: ['lua_ledbar_new', 'lua_timer_calllater', 'lua_led_set', 'lua_timer_calllater', 'lua_led_set', 'lua_timer_calllater', 'lua_led_set', 'lua_callback_open', 'lua_callback_end'],
            blocks: [
                createStatementBlock('lua2-ledbar', 'создать Ledbar', 'local leds = Ledbar.new(29)', 'Для этого урока используем `Ledbar.new(29)`, чтобы светодиоды корректно работали в реальном Pioneer.', 'setup', 'local leds = Ledbar.new(29)'),
                createTimerBlock('lua2-wait-a', 'сработать через 1 c', 'Timer.callLater(1.0, ...)', 'Первый таймер запускает синий кадр через 1 секунду от старта.', 1),
                createStatementBlock('lua2-blue', 'показать синий', 'leds:set(0, 0, 0, 1)', 'Первый кадр анимации через 1 секунду.', 'action', 'leds:set(0, 0, 0, 1)'),
                createTimerBlock('lua2-wait-b', 'сработать через 2 c', 'Timer.callLater(2.0, ...)', 'Второй таймер запускает зеленый кадр через 2 секунды от старта.', 2),
                createStatementBlock('lua2-green', 'показать зеленый', 'leds:set(0, 0, 1, 0)', 'Второй кадр через 2 секунды от старта.', 'action', 'leds:set(0, 1, 0, 0)'),
                createTimerBlock('lua2-wait-c', 'сработать через 3 c', 'Timer.callLater(3.0, ...)', 'Третий таймер запускает красный кадр через 3 секунды от старта.', 3),
                createStatementBlock('lua2-red', 'показать красный', 'leds:set(0, 1, 0, 0)', 'Третий кадр через 3 секунды от старта.', 'action', 'leds:set(0, 1, 0, 0)'),
                createStatementBlock('lua2-white', 'показать белый', 'leds:set(0, 1, 1, 1)', 'Корректная LED-команда, но она не входит в эталонную анимацию.', 'action', 'leds:set(0, 1, 1, 1)'),
                createStatementBlock('lua2-print', 'вывести статус', 'print("animation step")', 'Полезно для отладки, но не заменяет паузы и цвета.', 'check', 'print("animation step")'),
                createStatementBlock('lua_callback_open', 'открыть callback', 'function callback(event)', 'Открывает обязательную событийную функцию Lua-сценария.', 'setup', 'function callback(event)'),
                createStatementBlock('lua_callback_end', 'закрыть callback', 'end', 'Закрывает область function callback(event).', 'setup', 'end')
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
                    fix: 'Вернитесь к схеме с тремя таймерами подряд: `1`, `2`, `3`, и с цветами внутри их `callback`.'
                }
            ],
            missingBlockDiagnostics: {
                'lua2-ledbar': {
                    kind: 'error',
                    title: 'Не создана светодиодная лента',
                    reason: 'Без `Ledbar.new(29)` остальные шаги анимации логически некуда применять.',
                    fix: 'Поставьте блок `создать Ledbar` первым и оставьте в нем число `29`.'
                },
                'lua2-wait-a': {
                    kind: 'error',
                    title: 'Пропущена первая пауза',
                    reason: 'Синий кадр должен включаться через 1 секунду от старта.',
                    fix: 'Добавьте первый таймер со значением `1` и поместите внутрь него синий цвет.'
                },
                'lua2-blue': {
                    kind: 'error',
                    title: 'Не задан первый кадр',
                    reason: 'Через 1 секунду от старта должен включаться синий кадр, иначе теряется начало сценария.',
                    fix: 'Добавьте блок `показать синий` внутрь первого таймера.'
                },
                'lua2-wait-b': {
                    kind: 'error',
                    title: 'Пропущена вторая пауза',
                    reason: 'Зеленый кадр должен включаться через 2 секунды от старта.',
                    fix: 'Добавьте второй таймер со значением `2` и поместите внутрь него зеленый цвет.'
                },
                'lua2-green': {
                    kind: 'error',
                    title: 'Пропущен второй кадр',
                    reason: 'Без зеленого блока анимация не демонстрирует второй шаг через 2 секунды от старта.',
                    fix: 'Добавьте блок `показать зеленый` внутрь второго таймера.'
                },
                'lua2-wait-c': {
                    kind: 'error',
                    title: 'Пропущена третья пауза',
                    reason: 'Красный кадр должен включаться через 3 секунды от старта.',
                    fix: 'Добавьте третий таймер со значением `3` и поместите внутрь него красный цвет.'
                },
                'lua2-red': {
                    kind: 'error',
                    title: 'Пропущен финальный кадр',
                    reason: 'Без красного шага анимация не завершается контрольным цветом через 3 секунды.',
                    fix: 'Добавьте блок `показать красный` внутрь третьего таймера.'
                },
                'lua_callback_open': {
                    kind: 'error',
                    title: 'Не открыт callback',
                    reason: 'В интерактивном учебнике `function callback(event)` должен быть отдельным открывающим блоком.',
                    fix: 'Добавьте блок `открыть callback` перед событийной логикой.'
                },
                'lua_callback_end': {
                    kind: 'error',
                    title: 'Не закрыт callback',
                    reason: 'Конструкция `function callback(event)` должна завершаться отдельным независимым блоком `end`.',
                    fix: 'Добавьте блок `закрыть callback` после содержимого callback.'
                }
            },
            extraBlockDiagnostics: {
                'lua2-white': {
                    kind: 'warning',
                    title: 'Добавлен лишний цвет',
                    reason: 'Белый цвет является рабочим API-вызовом, но ломает учебную последовательность из трех заданных кадров.',
                    fix: 'Удалите белый блок, чтобы анимация осталась: 1 секунда синий, 2 секунды зеленый, 3 секунды красный.'
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
                    after: 'lua2-wait-a',
                    title: 'Первый таймер стоит до создания ленты',
                    reason: 'Блок `Timer.callLater(...)` не должен идти раньше `Ledbar.new(29)`.',
                    fix: 'Переместите `создать Ledbar` в начало.'
                },
                {
                    before: 'lua2-wait-a',
                    after: 'lua2-wait-b',
                    title: 'Нарушен порядок таймеров',
                    reason: 'После таймера на 1 секунду должен идти таймер на 2 секунды.',
                    fix: 'Поставьте второй таймер после первого в основной ветке.'
                },
                {
                    before: 'lua2-wait-b',
                    after: 'lua2-wait-c',
                    title: 'Нарушен порядок последнего таймера',
                    reason: 'После таймера на 2 секунды должен идти таймер на 3 секунды.',
                    fix: 'Поставьте третий таймер после второго в основной ветке.'
                }
            ],
            compile: compileLuaTimed
        },
    ];
}
