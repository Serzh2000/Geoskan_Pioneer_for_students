import { createEventBlock, createStatementBlock, createTimerBlock } from './lesson-builders.js';
import { compileLuaEvents, compileLuaLinear, compileLuaTimed } from './lesson-compilers.js';
import {
    LUA_LED_SEQUENCE_EXAMPLE,
    LUA_LED_SINGLE_EXAMPLE
} from './snippets.js';
import type { GuideLesson } from './types.js';
import { GUIDE_CHAPTER_IDS } from './curriculum.js';
import { apiFocus } from './lesson-state-helpers.js';

export function getLuaLedLessons(): GuideLesson[] {
    return [
        {
            id: 'lua-led-single',
            chapterId: GUIDE_CHAPTER_IDS.foundations,
            badge: 'Задание 1',
            title: 'Включить красную подсветку',
            goal: 'Соберите минимальный Lua-сценарий, который инициализирует `Ledbar.new(29)` и зажигает красный цвет.',
            summary: 'Первый шаг знакомит с объектом Ledbar и линейным выполнением скрипта в Pioneer.',
            lessonIntro: 'В Lua нужно сначала создать объект Ledbar, указав количество светодиодов (29), а затем вызвать метод `set`.',
            expectedOutcome: 'Создается `leds = Ledbar.new(29)` и вызывается `leds:set(0, 1, 0, 0)`.',
            builderHint: 'Не забудьте сначала добавить блок инициализации Ledbar, а затем уже команду включения цвета.',
            apiFocus: [
                apiFocus('Ledbar.new(count)', 'Инициализирует ленту на заданное количество светодиодов.', 'local leds = Ledbar.new(29)'),
                apiFocus('leds:set(index, r, g, b)', 'Меняет цвет. В этом уроке нужен красный сигнал (1, 0, 0).', 'leds:set(0, 1, 0, 0)')
            ],
            targetBlockIds: ['lua_ledbar', 'lua_led_set'],
            blocks: [
                createStatementBlock('lua1-ledbar', 'создать Ledbar', 'local leds = Ledbar.new(29)', 'Инициализация объекта.', 'setup', 'local leds = Ledbar.new(29)'),
                createStatementBlock('lua1-red', 'красный LED', 'leds:set(0, 1, 0, 0)', 'Включение красного цвета.', 'action', 'leds:set(0, 1, 0, 0)'),
                createStatementBlock('lua1-blue', 'синий LED', 'leds:set(0, 0, 0, 1)', 'Включение синего цвета.', 'action', 'leds:set(0, 0, 0, 1)')
            ],
            links: [
                { label: 'Ledbar.new', query: 'Ledbar.new Ledbar' },
                { label: 'leds:set', query: 'leds:set Ledbar' }
            ],
            solutionCode: LUA_LED_SINGLE_EXAMPLE,
            actionLabel: 'Открыть API Ledbar',
            actionQuery: 'Ledbar.new leds:set',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Порядок команд нарушен',
                    reason: 'Метод `leds:set` вызывается до того, как был создан объект `Ledbar`.',
                    fix: 'Переместите инициализацию Ledbar в начало.'
                }
            ],
            missingBlockDiagnostics: {
                'lua1-ledbar': {
                    kind: 'error',
                    title: 'Нет инициализации Ledbar',
                    reason: 'Не создан объект Ledbar.',
                    fix: 'Добавьте блок `создать Ledbar`.'
                },
                'lua1-red': {
                    kind: 'error',
                    title: 'Нет команды включения красного',
                    reason: 'Не вызывается метод `leds:set` с красным цветом.',
                    fix: 'Добавьте блок `красный LED`.'
                }
            },
            extraBlockDiagnostics: {
                'lua1-blue': {
                    kind: 'warning',
                    title: 'Выбран другой цвет',
                    reason: 'В задании требуется включить красный цвет.',
                    fix: 'Удалите синий блок и оставьте красный.'
                }
            },
            orderRules: [
                {
                    before: 'lua_ledbar',
                    after: 'lua_led_set',
                    title: 'Порядок инициализации',
                    reason: 'Сначала нужно создать Ledbar.',
                    fix: 'Переместите блок создания Ledbar выше вызова `set`.'
                }
            ],
            compile: compileLuaLinear
        },
        {
            id: 'lua-led-sequence',
            chapterId: GUIDE_CHAPTER_IDS.foundations,
            badge: 'Задание 2',
            title: 'Мигание с таймерами',
            goal: 'Соберите последовательность с использованием `Timer.callLater`.',
            summary: 'В Lua нет блокирующего `sleep`, поэтому для пауз используются таймеры.',
            lessonIntro: 'Таймеры планируют выполнение функции через заданное время, не останавливая основной поток.',
            expectedOutcome: 'Код включает синий, через секунду зеленый, и еще через секунду красный.',
            builderHint: 'Следите за временем в таймерах: 1с, 2с, 3с (отсчет от начала выполнения).',
            apiFocus: [
                apiFocus('Timer.callLater(delay, func)', 'Выполняет функцию через delay секунд.', 'Timer.callLater(1.0, function() ... end)')
            ],
            targetBlockIds: ['lua_ledbar', 'lua_callback_open', 'lua_callback_end', 'lua_timer', 'lua_led_set', 'lua_timer', 'lua_led_set', 'lua_timer', 'lua_led_set'],
            blocks: [
                createStatementBlock('lua2-ledbar', 'создать Ledbar', 'local leds = Ledbar.new(29)', 'Инициализация.', 'setup', 'local leds = Ledbar.new(29)'),
                createTimerBlock('lua2-wait-a', 'подождать 1 с', 'Timer.callLater(1.0, ...)', 'Пауза 1с.', 1),
                createStatementBlock('lua2-blue', 'синий LED', 'leds:set(0, 0, 0, 1)', 'Включение синего.', 'action', 'leds:set(0, 0, 0, 1)'),
                createTimerBlock('lua2-wait-b', 'подождать 2 с', 'Timer.callLater(2.0, ...)', 'Пауза 2с.', 2),
                createStatementBlock('lua2-green', 'зеленый LED', 'leds:set(0, 0, 1, 0)', 'Включение зеленого.', 'action', 'leds:set(0, 0, 1, 0)'),
                createTimerBlock('lua2-wait-c', 'подождать 3 с', 'Timer.callLater(3.0, ...)', 'Пауза 3с.', 3),
                createStatementBlock('lua2-red', 'красный LED', 'leds:set(0, 1, 0, 0)', 'Включение красного.', 'action', 'leds:set(0, 1, 0, 0)'),
                createStatementBlock('lua_callback_open', 'создать callback', 'function callback(event)', 'Определение функции.', 'setup', 'function callback(event)'),
                createStatementBlock('lua_callback_end', 'закрыть callback', 'end', 'Закрытие функции.', 'setup', 'end')
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
                    title: 'Порядок команд нарушен',
                    reason: 'Цвета включаются в неверном порядке.',
                    fix: 'Внимательно проверьте таймеры.'
                }
            ],
            missingBlockDiagnostics: {
                'lua2-ledbar': { kind: 'error', title: 'Нет инициализации Ledbar', reason: 'Нужен объект Ledbar.', fix: 'Добавьте Ledbar.new(29).' },
                'lua2-wait-a': { kind: 'error', title: 'Нет таймера 1с', reason: 'Пропущен таймер.', fix: 'Добавьте таймер.' },
                'lua2-blue': { kind: 'error', title: 'Нет синего', reason: 'Пропущен синий цвет.', fix: 'Добавьте синий.' },
                'lua2-wait-b': { kind: 'error', title: 'Нет таймера 2с', reason: 'Пропущен таймер.', fix: 'Добавьте таймер.' },
                'lua2-green': { kind: 'error', title: 'Нет зеленого', reason: 'Пропущен зеленый цвет.', fix: 'Добавьте зеленый.' },
                'lua2-wait-c': { kind: 'error', title: 'Нет таймера 3с', reason: 'Пропущен таймер.', fix: 'Добавьте таймер.' },
                'lua2-red': { kind: 'error', title: 'Нет красного', reason: 'Пропущен красный цвет.', fix: 'Добавьте красный.' },
                'lua_callback_open': { kind: 'error', title: 'Нет функции callback', reason: 'Нужен callback.', fix: 'Добавьте функцию callback.' },
                'lua_callback_end': { kind: 'error', title: 'Нет конца callback', reason: 'Callback не закрыт.', fix: 'Добавьте end.' }
            },
            extraBlockDiagnostics: {},
            orderRules: [],
            compile: compileLuaTimed
        }
    ];
}
