import { createEventBlock, createStatementBlock, createTimerBlock } from '../lesson-builders.js';
import { compileLuaEvents, compileLuaLinear, compileLuaTimed } from '../lesson-compilers.js';
import { GUIDE_CHAPTER_IDS } from '../curriculum.js';
import { apiFocus } from '../lesson-state-helpers.js';
import type { GuideLesson } from '../types.js';

export function getLuaFoundationsExpandedLessons(): GuideLesson[] {
    return [
        {
            id: 'lua-led-confirm',
            chapterId: GUIDE_CHAPTER_IDS.foundations,
            badge: 'Задание 3',
            title: 'Световой сигнал с подтверждением',
            goal: 'Соберите короткий сценарий индикации: создайте `Ledbar(29)`, включите зеленый сигнал и выведите текстовое подтверждение.',
            summary: 'Урок связывает визуальную индикацию и простой лог, чтобы ученик видел и физический, и текстовый результат выполнения.',
            lessonIntro: 'Здесь вы тренируете полезную привычку: подтверждать важный шаг миссии сразу двумя каналами. Светодиод показывает состояние на модели дрона, а `print(...)` помогает отследить тот же этап в консоли симулятора.',
            expectedOutcome: 'Сценарий создает `Ledbar`, включает зеленый индикатор и выводит сообщение о готовности сигнала.',
            builderHint: 'Логика линейная: сначала инициализация периферии, затем управление цветом, затем текстовое подтверждение.',
            apiFocus: [
                apiFocus('Ledbar.new(count)', 'Создает объект светодиодной ленты, который нужен для дальнейшего управления цветом. Для этих уроков используем `Ledbar.new(29)`.', 'local leds = Ledbar.new(29)'),
                apiFocus('leds:set(index, r, g, b)', 'Меняет цвет светодиода и выступает визуальным индикатором состояния.', 'leds:set(0, 0, 1, 0)'),
                apiFocus('print(...)', 'Не управляет дроном напрямую, но полезен как журнал шага миссии.', 'print("Сигнал готов")')
            ],
            targetBlockIds: ['lua_ledbar_new', 'lua_led_set', 'lua_print', 'lua_callback_open', 'lua_callback_end'],
            blocks: [
                createStatementBlock('lua6-ledbar', 'создать Ledbar', 'local leds = Ledbar.new(29)', 'Готовит объект светодиодной ленты через `Ledbar.new(29)`.', 'setup', 'local leds = Ledbar.new(29)'),
                createStatementBlock('lua6-green', 'включить зеленый', 'leds:set(0, 0, 1, 0)', 'Целевой сигнал урока.', 'action', 'leds:set(0, 0, 1, 0)'),
                createStatementBlock('lua6-print', 'сообщить о сигнале', 'print("Сигнал готов")', 'Текстовое подтверждение выполнения.', 'check', 'print("Сигнал готов")'),
                createTimerBlock('lua6-wait', 'подождать 1 c', 'Timer.callLater(1.0, ...)', 'Таймер здесь не обязателен и только усложняет сценарий.', 1),
                createStatementBlock('lua_callback_open', 'открыть callback', 'function callback(event)', 'Открывает обязательную событийную функцию Lua-сценария.', 'setup', 'function callback(event)'),
                createStatementBlock('lua_callback_end', 'закрыть callback', 'end', 'Закрывает область function callback(event).', 'setup', 'end')
            ],
            links: [
                { label: 'Ledbar.new', query: 'Ledbar.new' },
                { label: 'leds:set', query: 'leds:set Ledbar' },
                { label: 'print', query: 'lua print' }
            ],
            solutionCode: `local leds = Ledbar.new(29)
leds:set(0, 0, 1, 0)
print("Сигнал готов")

function callback(event)
end`,
            actionLabel: 'Открыть индикацию и лог',
            actionQuery: 'Ledbar.new leds:set print',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Индикация вызвана без подготовки ленты',
                    reason: 'Если не создать `Ledbar`, последующие команды цвета не к чему применять.',
                    fix: 'Поставьте `Ledbar.new(...)` первым шагом.'
                }
            ],
            missingBlockDiagnostics: {
                lua_ledbar_new: {
                    kind: 'error',
                    title: 'Не создан объект `Ledbar`',
                    reason: 'Без инициализации ленты урок не показывает работу периферии.',
                    fix: 'Добавьте блок создания `Ledbar` в начало.'
                },
                lua_led_set: {
                    kind: 'error',
                    title: 'Нет светового подтверждения',
                    reason: 'Урок требует не только текст, но и видимый зеленый сигнал.',
                    fix: 'Добавьте блок `leds:set(...)` после создания ленты.'
                },
                lua_print: {
                    kind: 'warning',
                    title: 'Не выведено текстовое подтверждение',
                    reason: 'Свет загорается, но пользователь не видит сопутствующий лог выполнения.',
                    fix: 'Добавьте `print(...)` в конец цепочки.'
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
                lua_timer_calllater: {
                    kind: 'warning',
                    title: 'Лишний таймер',
                    reason: 'В этом упражнении нет многошаговой анимации, поэтому задержка не нужна.',
                    fix: 'Уберите `Timer.callLater(...)` и оставьте прямую последовательность.'
                }
            },
            orderRules: [
                {
                    before: 'lua_ledbar_new',
                    after: 'lua_led_set',
                    title: 'Цвет задан раньше инициализации',
                    reason: 'Сначала нужно создать `Ledbar`, и только потом обращаться к `leds:set(...)`.',
                    fix: 'Переместите блок создания ленты выше блока цвета.'
                },
                {
                    before: 'lua_led_set',
                    after: 'lua_print',
                    title: 'Сообщение появляется раньше сигнала',
                    reason: 'Текст должен подтверждать уже выполненное LED-действие, а не предшествовать ему.',
                    fix: 'Поставьте `print(...)` после `leds:set(...)`.'
                }
            ],
            compile: compileLuaLinear
        },
        {
            id: 'lua-led-delayed',
            chapterId: GUIDE_CHAPTER_IDS.foundations,
            badge: 'Задание 4',
            title: 'Отложенный световой отклик',
            goal: 'Соберите сценарий, где после создания `Ledbar(29)` через таймер включается синий сигнал и печатается сообщение о срабатывании.',
            summary: 'Урок показывает, как использовать `Timer.callLater(...)` для реакции с задержкой, не блокируя основной поток сценария.',
            lessonIntro: 'Задание моделирует типичную ситуацию: действие должно произойти не сразу, а после паузы. В Lua это удобно оформлять через таймер с вложенным callback, в который и помещаются полезные действия.',
            expectedOutcome: 'Сценарий создает `Ledbar`, а затем через `Timer.callLater(...)` включает синий LED и выводит сообщение о срабатывании.',
            builderHint: 'В линейной части оставьте только создание `Ledbar`. Все остальные шаги должны жить внутри таймера.',
            apiFocus: [
                apiFocus('Timer.callLater(seconds, callback)', 'Позволяет отложить выполнение блока действий без блокировки всего сценария.', 'Timer.callLater(1.0, function() ... end)'),
                apiFocus('leds:set(...) и print(...)', 'В этом уроке оба действия должны быть вложены в callback таймера.', 'leds:set(1, 0, 0, 1)')
            ],
            targetBlockIds: ['lua_ledbar_new', 'lua_timer_calllater', 'lua_led_set', 'lua_print', 'lua_callback_open', 'lua_callback_end'],
            blocks: [
                createStatementBlock('lua7-ledbar', 'создать Ledbar', 'local leds = Ledbar.new(29)', 'Подготавливает периферию через `Ledbar.new(29)`.', 'setup', 'local leds = Ledbar.new(29)'),
                createTimerBlock('lua7-timer', 'сработать через 1 c', 'Timer.callLater(1.0, ...)', 'Контейнер для отложенных действий.', 1),
                createStatementBlock('lua7-blue', 'включить синий', 'leds:set(1, 0, 0, 1)', 'LED-индикация внутри callback.', 'action', 'leds:set(1, 0, 0, 1)'),
                createStatementBlock('lua7-print', 'сообщить о таймере', 'print("Таймер сработал")', 'Текстовое подтверждение события.', 'check', 'print("Таймер сработал")'),
                createStatementBlock('lua_callback_open', 'открыть callback', 'function callback(event)', 'Открывает обязательную событийную функцию Lua-сценария.', 'setup', 'function callback(event)'),
                createStatementBlock('lua_callback_end', 'закрыть callback', 'end', 'Закрывает область function callback(event).', 'setup', 'end')
            ],
            links: [
                { label: 'Timer.callLater', query: 'Timer.callLater' },
                { label: 'leds:set', query: 'leds:set Ledbar' }
            ],
            solutionCode: `local leds = Ledbar.new(29)

Timer.callLater(1.0, function()
    leds:set(1, 0, 0, 1)
    print("Таймер сработал")
end)

function callback(event)
end`,
            actionLabel: 'Открыть отложенные действия',
            actionQuery: 'Timer.callLater leds:set print',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Отложенное действие не собрано',
                    reason: 'Без `Timer.callLater(...)` урок теряет основной смысл и превращается в обычную линейную команду.',
                    fix: 'Оберните полезные действия в блок таймера.'
                }
            ],
            missingBlockDiagnostics: {
                lua_ledbar_new: {
                    kind: 'error',
                    title: 'Нет инициализации `Ledbar`',
                    reason: 'Даже отложенный callback должен работать с уже созданной лентой.',
                    fix: 'Добавьте `Ledbar.new(...)` в начало.'
                },
                lua_timer_calllater: {
                    kind: 'error',
                    title: 'Не добавлен таймер',
                    reason: 'Урок специально проверяет отложенное действие, а не мгновенный вызов.',
                    fix: 'Добавьте `Timer.callLater(...)` после создания ленты.'
                },
                lua_led_set: {
                    kind: 'error',
                    title: 'Нет светового действия внутри таймера',
                    reason: 'Callback есть, но он не показывает наблюдаемый результат.',
                    fix: 'Добавьте `leds:set(...)` внутрь таймера.'
                },
                lua_print: {
                    kind: 'warning',
                    title: 'Нет текстового подтверждения таймера',
                    reason: 'Сигнал появится, но лог не покажет, что callback действительно был вызван.',
                    fix: 'Добавьте `print(...)` после LED-команды.'
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
            extraBlockDiagnostics: {},
            orderRules: [
                {
                    before: 'lua_ledbar_new',
                    after: 'lua_timer_calllater',
                    title: 'Таймер идет раньше инициализации',
                    reason: 'Отложенный callback должен опираться на уже созданный объект `Ledbar`.',
                    fix: 'Поставьте создание ленты первым.'
                }
            ],
            compile: compileLuaTimed
        },
    ];
}
