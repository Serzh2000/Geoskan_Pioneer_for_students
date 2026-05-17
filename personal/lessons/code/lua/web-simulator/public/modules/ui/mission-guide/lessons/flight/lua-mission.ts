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

export function getLuaMissionLessons(): GuideLesson[] {
    return [
        {
            id: 'lua-mission',
            chapterId: GUIDE_CHAPTER_IDS.mission,
            badge: 'Задание 5',
            title: 'Полная миссия: взлет, точка, посадка',
            goal: 'Соберите полную FSM-цепочку: подготовка, взлет, переход к точке по событию `TAKEOFF_COMPLETE`, затем посадка после `POINT_REACHED`.',
            summary: 'Это первый цельный Lua-сценарий, в котором блоки соединяются по форме, но могут ошибаться по логике событий.',
            lessonIntro: 'Финальный Lua-урок собирает полную миссию из нескольких событий автопилота. Здесь уже важно понимать, какая команда должна жить в какой ветке `callback(event)` и почему.',
            expectedOutcome: 'Сценарий корректно распределяет `TAKEOFF`, `goToLocalPoint(...)` и `LANDING` по событиям `ENGINES_STARTED`, `TAKEOFF_COMPLETE` и `POINT_REACHED`.',
            builderHint: 'В этом задании почти все ошибки логические: блоки физически стыкуются, но одно неверное событие сразу переносит команду не в ту ветку `callback(event)`.',
            apiFocus: [
                apiFocus('ap.goToLocalPoint(x, y, z)', 'Отправляет дрон к локальной точке. В уроке эта команда должна запускаться только после завершения взлета.', 'ap.goToLocalPoint(1, 0, 1)'),
                apiFocus('Ev.TAKEOFF_COMPLETE', 'Событие окончания взлета. После него маршрут становится логически допустимым.', 'if event == Ev.TAKEOFF_COMPLETE then ... end'),
                apiFocus('Ev.POINT_REACHED и Ev.MCE_LANDING', 'Событие достижения точки подтверждает окончание маршрута, а команда посадки завершает миссию.', 'if event == Ev.POINT_REACHED then ap.push(Ev.MCE_LANDING) end')
            ],
            targetBlockIds: ['lua_ap_push', 'lua_event_callback', 'lua_ap_push', 'lua_event_callback', 'lua_goto_local_point', 'lua_event_callback', 'lua_ap_push', 'lua_callback_open', 'lua_callback_end'],
            blocks: [
                createStatementBlock('lua5-preflight', 'PREFLIGHT', 'ap.push(Ev.MCE_PREFLIGHT)', 'Старт миссии.', 'setup', 'ap.push(Ev.MCE_PREFLIGHT)'),
                createEventBlock('lua5-engines', 'ждать ENGINES_STARTED', 'if event == Ev.ENGINES_STARTED', 'Открывает ветку для взлета.', 'Ev.ENGINES_STARTED'),
                createStatementBlock('lua5-takeoff', 'TAKEOFF', 'ap.push(Ev.MCE_TAKEOFF)', 'Команда взлета.', 'action', 'ap.push(Ev.MCE_TAKEOFF)'),
                createEventBlock('lua5-complete', 'ждать TAKEOFF_COMPLETE', 'if event == Ev.TAKEOFF_COMPLETE', 'После этого события допустимо отправлять полет к точке.', 'Ev.TAKEOFF_COMPLETE'),
                createStatementBlock('lua5-goto', 'лететь к точке', 'ap.goToLocalPoint(1, 0, 1)', 'Переводит дрон в полет к локальной координате.', 'action', 'ap.goToLocalPoint(1, 0, 1)'),
                createEventBlock('lua5-point', 'ждать POINT_REACHED', 'if event == Ev.POINT_REACHED', 'Сигнал, что маршрут выполнен.', 'Ev.POINT_REACHED'),
                createStatementBlock('lua5-land', 'LANDING', 'ap.push(Ev.MCE_LANDING)', 'Завершает миссию посадкой.', 'action', 'ap.push(Ev.MCE_LANDING)'),
                createStatementBlock('lua5-print', 'сообщить о точке', 'print("Точка достигнута")', 'Отладочный вывод допустим, но не заменяет посадку.', 'check', 'print("Точка достигнута")'),
                createStatementBlock('lua_callback_open', 'открыть callback', 'function callback(event)', 'Открывает обязательную событийную функцию Lua-сценария.', 'setup', 'function callback(event)'),
                createStatementBlock('lua_callback_end', 'закрыть callback', 'end', 'Закрывает область function callback(event).', 'setup', 'end')
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
}
