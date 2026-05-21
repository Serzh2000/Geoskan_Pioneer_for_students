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
            badge: ' 1',
            title: '  ',
            goal: '  Lua-:   `Ledbar(29)`,      .',
            summary: '       `leds:set(...)`,  `Ledbar.new(29)`.',
            lessonIntro: '          :        `Ledbar.new(29)`,    ,     .',
            expectedOutcome: '   `Ledbar(29)`       .',
            builderHint: '   ,      : `Ledbar(29)`    .',
            apiFocus: [
                apiFocus('Ledbar.new(count)', '   .      `Ledbar.new(29)`.', 'local leds = Ledbar.new(29)'),
                apiFocus('leds:set(index, r, g, b)', '   .         .', 'leds:set(0, 1, 0, 0)')
            ],
            targetBlockIds: ['lua_ledbar_new', 'lua_led_set', 'lua_callback_open', 'lua_callback_end'],
            blocks: [
                createStatementBlock('lua-ledbar', ' Ledbar', 'local leds = Ledbar.new(29)', '    `Ledbar.new(29)`,      `leds:set(...)`   .', 'setup', 'local leds = Ledbar.new(29)'),
                createStatementBlock('lua-led-red', '  ', 'leds:set(0, 1, 0, 0)', '   :    .', 'action', 'leds:set(0, 1, 0, 0)'),
                createStatementBlock('lua-led-blue', '  ', 'leds:set(0, 0, 0, 1)', '  API,         .', 'action', 'leds:set(0, 0, 0, 1)'),
                createTimerBlock('lua-wait-led', ' 0.5 c', 'Timer.callLater(0.5, ...)', '   ,        .', 0.5),
                createStatementBlock('lua-led-print', ' ', 'print("LED ")', '  ,       .', 'check', 'print("LED ")'),
                createStatementBlock('lua_callback_open', ' callback', 'function callback(event)', '    Lua-.', 'setup', 'function callback(event)'),
                createStatementBlock('lua_callback_end', ' callback', 'end', '  function callback(event).', 'setup', 'end')
            ],
            links: [
                { label: 'Ledbar.new', query: 'Ledbar.new' },
                { label: 'leds:set', query: 'leds:set Ledbar' }
            ],
            solutionCode: LUA_LED_SINGLE_EXAMPLE,
            actionLabel: ' LED API',
            actionQuery: 'Ledbar.new leds:set',
            errorCatalog: [
                {
                    kind: 'error',
                    title: '    `Ledbar`',
                    reason: '`leds:set(...)`   ,    ,    .',
                    fix: '  ` Ledbar` .'
                },
                {
                    kind: 'warning',
                    title: '  ',
                    reason: ' ,         .',
                    fix: '     `  `.'
                },
                {
                    kind: 'warning',
                    title: '  ',
                    reason: '   ,           .',
                    fix: '      `leds:set(...)`.'
                }
            ],
            missingBlockDiagnostics: {
                'lua-ledbar': {
                    kind: 'error',
                    title: '  `Ledbar`',
                    reason: ' `Ledbar.new(...)`  `leds`  ,        .',
                    fix: '  ` Ledbar`   .'
                },
                'lua-led-red': {
                    kind: 'error',
                    title: '   ',
                    reason: '    `leds:set(0, 1, 0, 0)`,     .',
                    fix: '  `  `   .'
                },
                'lua_callback_open': {
                    kind: 'error',
                    title: '  callback',
                    reason: '   `function callback(event)`     .',
                    fix: '  ` callback`   .'
                },
                'lua_callback_end': {
                    kind: 'error',
                    title: '  callback',
                    reason: ' `function callback(event)`      `end`.',
                    fix: '  ` callback`   callback.'
                }
            },
            extraBlockDiagnostics: {
                'lua-led-blue': {
                    kind: 'warning',
                    title: '  ',
                    reason: ' `leds:set(0, 0, 0, 1)` ,        .',
                    fix: '       `  `.'
                },
                'lua-wait-led': {
                    kind: 'warning',
                    title: '   ',
                    reason: '      ,  `Timer.callLater(...)`  .',
                    fix: '         .'
                },
                'lua-led-print': {
                    kind: 'warning',
                    title: '    API',
                    reason: '`print(...)`       ,     .',
                    fix: '   ,      `Ledbar.new(...)`  `leds:set(...)`.'
                }
            },
            orderRules: [
                {
                    before: 'lua-ledbar',
                    after: 'lua-led-red',
                    title: '   ',
                    reason: ' Pioneer API :     `Ledbar`,       `leds:set(...)`.',
                    fix: '  ` Ledbar`    .'
                }
            ],
            compile: compileLuaLinear
        },
        {
            id: 'lua-led-sequence',
            chapterId: GUIDE_CHAPTER_IDS.foundations,
            badge: ' 2',
            title: '   ',
            goal: '    :  1  ,  2  ,  3  .',
            summary: '       ,       `callback`.',
            lessonIntro: '   `leds:set(...)`  .      :   `Ledbar`,     `Timer.callLater(...)` .   `callback`    `leds:set(...)`.      Pioneer   `Ledbar.new(29)`.',
            expectedOutcome: '  `Ledbar(29)`,  1    ,  2         ,   3     .',
            builderHint: ' : `Ledbar(29)`,       `1`, `2`, `3`.   ,   ,   .',
            apiFocus: [
                apiFocus('Timer.callLater(seconds, callback)', '  callback.           1, 2  3   .', 'Timer.callLater(1.0, function() ... end)'),
                apiFocus('leds:set(index, r, g, b)', '     .          `0`.', 'leds:set(0, 0, 1, 0)')
            ],
            targetBlockIds: ['lua_ledbar_new', 'lua_timer_calllater', 'lua_led_set', 'lua_timer_calllater', 'lua_led_set', 'lua_timer_calllater', 'lua_led_set', 'lua_callback_open', 'lua_callback_end'],
            blocks: [
                createStatementBlock('lua2-ledbar', ' Ledbar', 'local leds = Ledbar.new(29)', '    `Ledbar.new(29)`,       Pioneer.', 'setup', 'local leds = Ledbar.new(29)'),
                createTimerBlock('lua2-wait-a', '  1 c', 'Timer.callLater(1.0, ...)', '      1   .', 1),
                createStatementBlock('lua2-blue', ' ', 'leds:set(0, 0, 0, 1)', '    1 .', 'action', 'leds:set(0, 0, 0, 1)'),
                createTimerBlock('lua2-wait-b', '  2 c', 'Timer.callLater(2.0, ...)', '      2   .', 2),
                createStatementBlock('lua2-green', ' ', 'leds:set(0, 0, 1, 0)', '   2   .', 'action', 'leds:set(0, 1, 0, 0)'),
                createTimerBlock('lua2-wait-c', '  3 c', 'Timer.callLater(3.0, ...)', '      3   .', 3),
                createStatementBlock('lua2-red', ' ', 'leds:set(0, 1, 0, 0)', '   3   .', 'action', 'leds:set(0, 1, 0, 0)'),
                createStatementBlock('lua2-white', ' ', 'leds:set(0, 1, 1, 1)', ' LED-,       .', 'action', 'leds:set(0, 1, 1, 1)'),
                createStatementBlock('lua2-print', ' ', 'print("animation step")', '  ,      .', 'check', 'print("animation step")'),
                createStatementBlock('lua_callback_open', ' callback', 'function callback(event)', '    Lua-.', 'setup', 'function callback(event)'),
                createStatementBlock('lua_callback_end', ' callback', 'end', '  function callback(event).', 'setup', 'end')
            ],
            links: [
                { label: 'Timer.callLater', query: 'Timer.callLater' },
                { label: 'leds:set', query: 'leds:set Ledbar' }
            ],
            solutionCode: LUA_LED_SEQUENCE_EXAMPLE,
            actionLabel: ' ',
            actionQuery: 'Timer.callLater leds:set',
            errorCatalog: [
                {
                    kind: 'error',
                    title: '   ',
                    reason: '   `leds:set(...)` ,     .',
                    fix: '    .'
                },
                {
                    kind: 'error',
                    title: '   ',
                    reason: '    ,  `leds:set(...)`    `Ledbar.new(...)`.',
                    fix: '    ` Ledbar`.'
                },
                {
                    kind: 'warning',
                    title: '   ',
                    reason: ' ,        .',
                    fix: '      : `1`, `2`, `3`,      `callback`.'
                }
            ],
            missingBlockDiagnostics: {
                'lua2-ledbar': {
                    kind: 'error',
                    title: '   ',
                    reason: ' `Ledbar.new(29)`      .',
                    fix: '  ` Ledbar`       `29`.'
                },
                'lua2-wait-a': {
                    kind: 'error',
                    title: '  ',
                    reason: '     1   .',
                    fix: '     `1`      .'
                },
                'lua2-blue': {
                    kind: 'error',
                    title: '   ',
                    reason: ' 1       ,    .',
                    fix: '  ` `   .'
                },
                'lua2-wait-b': {
                    kind: 'error',
                    title: '  ',
                    reason: '     2   .',
                    fix: '     `2`      .'
                },
                'lua2-green': {
                    kind: 'error',
                    title: '  ',
                    reason: '         2   .',
                    fix: '  ` `   .'
                },
                'lua2-wait-c': {
                    kind: 'error',
                    title: '  ',
                    reason: '     3   .',
                    fix: '     `3`      .'
                },
                'lua2-red': {
                    kind: 'error',
                    title: '  ',
                    reason: '         3 .',
                    fix: '  ` `   .'
                },
                'lua_callback_open': {
                    kind: 'error',
                    title: '  callback',
                    reason: '   `function callback(event)`     .',
                    fix: '  ` callback`   .'
                },
                'lua_callback_end': {
                    kind: 'error',
                    title: '  callback',
                    reason: ' `function callback(event)`      `end`.',
                    fix: '  ` callback`   callback.'
                }
            },
            extraBlockDiagnostics: {
                'lua2-white': {
                    kind: 'warning',
                    title: '  ',
                    reason: '    API-,        .',
                    fix: '  ,   : 1  , 2  , 3  .'
                },
                'lua2-print': {
                    kind: 'warning',
                    title: '    ',
                    reason: '`print(...)`       LED-,     .',
                    fix: '    `leds:set(...)`.'
                }
            },
            orderRules: [
                {
                    before: 'lua2-ledbar',
                    after: 'lua2-wait-a',
                    title: '     ',
                    reason: ' `Timer.callLater(...)`     `Ledbar.new(29)`.',
                    fix: ' ` Ledbar`  .'
                },
                {
                    before: 'lua2-wait-a',
                    after: 'lua2-wait-b',
                    title: '  ',
                    reason: '   1      2 .',
                    fix: '       .'
                },
                {
                    before: 'lua2-wait-b',
                    after: 'lua2-wait-c',
                    title: '   ',
                    reason: '   2      3 .',
                    fix: '       .'
                }
            ],
            compile: compileLuaTimed
        },
    ];
}

