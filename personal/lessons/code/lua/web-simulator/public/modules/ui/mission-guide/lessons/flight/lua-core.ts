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

export function getLuaCoreFlightLessons(): GuideLesson[] {
    return [
        {
            id: 'lua-preflight',
            chapterId: GUIDE_CHAPTER_IDS.flight,
            badge: 'Задание 3',
            title: 'Предполетная подготовка',
            goal: 'Соберите событийну цепочку: отправьте `PREFLIGHT`, дождитесь `ENGINES_STARTED` и только затем сообщите об успехе.',
            summary: 'Показываем, что для миссий Pioneer шаги часто строятся вокруг событий FSM.',
            lessonIntro: 'Начиная с этого урока, вы переходите от LED-команд к автопилоту. Здесь важно не просто вызвать команду, а дождаться правильного события от конечного автомата дрона.',
            expectedOutcome: 'Скрипт запускает `Ev.MCE_PREFLIGHT`, а сообщение переносит в обработчик `callback(event)` для `Ev.ENGINES_STARTED`.',
            builderHint: 'Блок ожидания события открывает ветку `callback(event)`. Все следующие действия относятся к этому событию, пока вы не вставите другое ожидание.',
            apiFocus: [
                apiFocus('ap.push(Ev.MCE_PREFLIGHT)', 'Отправляет автопилоту команду предполетной подготовки. Это стартовый шаг для FSM-сценария.', 'ap.push(Ev.MCE_PREFLIGHT)'),
                apiFocus('Ev.ENGINES_STARTED', 'Событие, которое сигнализирует о запуске двигателей. Только после него уместно переходить к следующим действиям миссии.', 'if event == Ev.ENGINES_STARTED then ... end')
            ],
            targetBlockIds: ['lua_ap_push', 'lua_event_callback', 'lua_print', 'lua_callback_open', 'lua_callback_end'],
            blocks: [
                createStatementBlock('lua3-preflight', 'отправить PREFLIGHT', 'ap.push(Ev.MCE_PREFLIGHT)', 'Обязательный старт для миссий Lua через FSM Pioneer.', 'setup', 'ap.push(Ev.MCE_PREFLIGHT)'),
                createEventBlock('lua3-engines', 'ждать ENGINES_STARTED', 'if event == Ev.ENGINES_STARTED', 'С этого события начинается безопасный переход к следующим шагам миссии.', 'Ev.ENGINES_STARTED'),
                createStatementBlock('lua3-print', 'показать сообщение', 'print("Двигатели запущены")', 'Сообщает, что предполетная подготовка завершилась успешно.', 'check', 'print("Двигатели запущены")'),
                createStatementBlock('lua3-takeoff', 'отправить TAKEOFF', 'ap.push(Ev.MCE_TAKEOFF)', 'Рабочая команда API, но для текущего урока преждевременная.', 'action', 'ap.push(Ev.MCE_TAKEOFF)'),
                createEventBlock('lua3-point', 'ждать POINT_REACHED', 'if event == Ev.POINT_REACHED', 'Полезно только после полета к точке, поэтому сейчас это лишняя логика.', 'Ev.POINT_REACHED'),
                createStatementBlock('lua_callback_open', 'открыть callback', 'function callback(event)', 'Открывает обязательную событийную функцию Lua-сценария.', 'setup', 'function callback(event)'),
                createStatementBlock('lua_callback_end', 'закрыть callback', 'end', 'Закрывает область function callback(event).', 'setup', 'end')
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
            chapterId: GUIDE_CHAPTER_IDS.flight,
            badge: 'Задание 4',
            title: 'Правильный взлет',
            goal: 'Добавьте к `PREFLIGHT` вторую ключевую команду: `TAKEOFF` должен отправляться только после `ENGINES_STARTED`.',
            summary: 'Учимся выстраивать причинно-следственную цепочку в коллбэке FSM.',
            lessonIntro: 'В этом уроке вы связываете две команды автопилота: подготовку и взлет. Главная идея не в самих командах, а в правильной причинно-следственной последовательности между ними.',
            expectedOutcome: 'Команда `Ev.MCE_TAKEOFF` попадает внутрь ветки `if event == Ev.ENGINES_STARTED then ... end`.',
            builderHint: 'Если `TAKEOFF` стоит выше ожидания события, он уйдет в корень скрипта и нарушит порядок вызовов API.',
            apiFocus: [
                apiFocus('Ev.MCE_TAKEOFF', 'Команда взлета. Ее нельзя отправлять раньше, чем двигатели перейдут в состояние готовности.', 'ap.push(Ev.MCE_TAKEOFF)'),
                apiFocus('Ev.ENGINES_STARTED', 'Контрольное событие, которое отделяет подготовку от безопасного взлета.', 'if event == Ev.ENGINES_STARTED then ... end')
            ],
            targetBlockIds: ['lua_ap_push', 'lua_event_callback', 'lua_ap_push', 'lua_callback_open', 'lua_callback_end'],
            blocks: [
                createStatementBlock('lua4-preflight', 'отправить PREFLIGHT', 'ap.push(Ev.MCE_PREFLIGHT)', 'Обязательная предполетная команда.', 'setup', 'ap.push(Ev.MCE_PREFLIGHT)'),
                createEventBlock('lua4-engines', 'ждать ENGINES_STARTED', 'if event == Ev.ENGINES_STARTED', 'Открывает безопасный момент для команды взлета.', 'Ev.ENGINES_STARTED'),
                createStatementBlock('lua4-takeoff', 'отправить TAKEOFF', 'ap.push(Ev.MCE_TAKEOFF)', 'Целевая команда взлета.', 'action', 'ap.push(Ev.MCE_TAKEOFF)'),
                createEventBlock('lua4-point', 'ждать TAKEOFF_COMPLETE', 'if event == Ev.TAKEOFF_COMPLETE', 'Полезно для следующего урока, но здесь лишнее.', 'Ev.TAKEOFF_COMPLETE'),
                createStatementBlock('lua4-land', 'отправить LANDING', 'ap.push(Ev.MCE_LANDING)', 'Команда посадки рабочая, но без маршрута преждевременна.', 'action', 'ap.push(Ev.MCE_LANDING)'),
                createStatementBlock('lua_callback_open', 'открыть callback', 'function callback(event)', 'Открывает обязательную событийную функцию Lua-сценария.', 'setup', 'function callback(event)'),
                createStatementBlock('lua_callback_end', 'закрыть callback', 'end', 'Закрывает область function callback(event).', 'setup', 'end')
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
    ];
}
