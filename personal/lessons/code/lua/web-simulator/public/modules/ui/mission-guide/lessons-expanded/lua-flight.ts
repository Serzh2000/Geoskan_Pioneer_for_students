import { createEventBlock, createStatementBlock, createTimerBlock } from '../lesson-builders.js';
import { compileLuaEvents, compileLuaLinear, compileLuaTimed } from '../lesson-compilers.js';
import { GUIDE_CHAPTER_IDS } from '../curriculum.js';
import { apiFocus } from '../lesson-state-helpers.js';
import type { GuideLesson } from '../types.js';

export function getLuaFlightExpandedLessons(): GuideLesson[] {
    return [
            {
            id: 'lua-route',
            chapterId: GUIDE_CHAPTER_IDS.flight,
            badge: 'Задание 7',
            title: 'Полет к точке после взлета',
            goal: 'Соберите FSM-цепочку, где `goToLocalPoint(...)` отправляется только после события `TAKEOFF_COMPLETE`.',
            summary: 'Задание выделяет навигационный переход как отдельную тему: маршрут запускается не сразу после взлета, а после подтверждения завершения набора высоты.',
            lessonIntro: 'В реальной логике миссии маршрут не должен начинаться в момент отправки взлета. Правильнее дождаться `TAKEOFF_COMPLETE`, и только затем переходить к команде полета в локальную точку.',
            expectedOutcome: 'Сценарий отправляет `PREFLIGHT`, по `ENGINES_STARTED` вызывает `TAKEOFF`, а по `TAKEOFF_COMPLETE` запускает `ap.goToLocalPoint(...)`.',
            builderHint: 'Следите за тем, чтобы `goToLocalPoint(...)` оказался в ветке `TAKEOFF_COMPLETE`, а не рядом с корневыми командами.',
            apiFocus: [
                apiFocus('Ev.TAKEOFF_COMPLETE', 'Это событие подтверждает, что взлет завершен и дрон может перейти к маршруту.', 'if event == Ev.TAKEOFF_COMPLETE then ... end'),
                apiFocus('ap.goToLocalPoint(x, y, z)', 'Запускает реальное перемещение дрона к локальной координате.', 'ap.goToLocalPoint(1, 0, 1)')
            ],
            targetBlockIds: ['lua_ap_push', 'lua_event_callback', 'lua_ap_push', 'lua_event_callback', 'lua_goto_local_point', 'lua_callback_open', 'lua_callback_end'],
            blocks: [
                createStatementBlock('lua8-preflight', 'PREFLIGHT', 'ap.push(Ev.MCE_PREFLIGHT)', 'Старт миссии.', 'setup', 'ap.push(Ev.MCE_PREFLIGHT)'),
                createEventBlock('lua8-engines', 'ждать ENGINES_STARTED', 'if event == Ev.ENGINES_STARTED', 'Открывает ветку взлета.', 'Ev.ENGINES_STARTED'),
                createStatementBlock('lua8-takeoff', 'TAKEOFF', 'ap.push(Ev.MCE_TAKEOFF)', 'Поднимает дрон.', 'action', 'ap.push(Ev.MCE_TAKEOFF)'),
                createEventBlock('lua8-complete', 'ждать TAKEOFF_COMPLETE', 'if event == Ev.TAKEOFF_COMPLETE', 'Только после него допустим маршрут.', 'Ev.TAKEOFF_COMPLETE'),
                createStatementBlock('lua8-goto', 'лететь к точке', 'ap.goToLocalPoint(1, 0, 1)', 'Целевой навигационный шаг.', 'action', 'ap.goToLocalPoint(1, 0, 1)'),
                createStatementBlock('lua8-print', 'сообщить о маршруте', 'print("Маршрут стартовал")', 'Допустимый лог, но не основной шаг.', 'check', 'print("Маршрут стартовал")'),
                createStatementBlock('lua_callback_open', 'открыть callback', 'function callback(event)', 'Открывает обязательную событийную функцию Lua-сценария.', 'setup', 'function callback(event)'),
                createStatementBlock('lua_callback_end', 'закрыть callback', 'end', 'Закрывает область function callback(event).', 'setup', 'end')
            ],
            links: [
                { label: 'Ev.TAKEOFF_COMPLETE', query: 'Ev.TAKEOFF_COMPLETE' },
                { label: 'ap.goToLocalPoint', query: 'ap.goToLocalPoint', previewKey: 'ap.goToLocalPoint' }
            ],
            solutionCode: `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ap.push(Ev.MCE_TAKEOFF)
    end

    if event == Ev.TAKEOFF_COMPLETE then
        ap.goToLocalPoint(1, 0, 1)
    end
end`,
            actionLabel: 'Открыть переход к точке',
            actionQuery: 'Ev.TAKEOFF_COMPLETE ap.goToLocalPoint',
            actionPreviewKey: 'ap.goToLocalPoint',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Маршрут отправляется без завершенного взлета',
                    reason: '`goToLocalPoint(...)` должен идти после `TAKEOFF_COMPLETE`, иначе дрон получает команду маршрута слишком рано.',
                    fix: 'Проверьте, что полет к точке находится в ветке `TAKEOFF_COMPLETE`.'
                }
            ],
            missingBlockDiagnostics: {
                lua_ap_push: {
                    kind: 'error',
                    title: 'Не хватает команд автопилота',
                    reason: 'Для урока нужны и старт подготовки, и команда взлета.',
                    fix: 'Добавьте блоки `PREFLIGHT` и `TAKEOFF`.'
                },
                lua_event_callback: {
                    kind: 'error',
                    title: 'Не хватает событийной ветки',
                    reason: 'Навигация должна быть привязана к событиям FSM, а не стоять в корне сценария.',
                    fix: 'Используйте ожидание `ENGINES_STARTED` и `TAKEOFF_COMPLETE`.'
                },
                lua_goto_local_point: {
                    kind: 'error',
                    title: 'Не добавлен переход к точке',
                    reason: 'Сценарий доходит до взлета, но не выполняет навигационную часть.',
                    fix: 'Добавьте `ap.goToLocalPoint(...)` в ветку `TAKEOFF_COMPLETE`.'
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
                lua_print: {
                    kind: 'warning',
                    title: 'Оставлен только лог вместо маршрута',
                    reason: '`print(...)` полезен как сопровождение, но не заменяет вызов `ap.goToLocalPoint(...)`.',
                    fix: 'Соберите полноценный маршрут, а лог оставьте только дополнительно.'
                }
            },
            orderRules: [
                {
                    before: 'lua_ap_push',
                    after: 'lua_event_callback',
                    title: 'Событие поставлено раньше старта миссии',
                    reason: 'Сначала должны уйти корневые команды автопилота, а затем ветки ожидания событий.',
                    fix: 'Начните сценарий с `PREFLIGHT`.'
                }
            ],
            compile: compileLuaEvents
        },
        {
            id: 'lua-point-confirm',
            chapterId: GUIDE_CHAPTER_IDS.flight,
            badge: 'Задание 8',
            title: 'Подтвердить достижение точки',
            goal: 'Расширьте маршрут: после `POINT_REACHED` выведите сообщение о достижении цели.',
            summary: 'Урок концентрируется на подтверждении результата маршрута и показывает, что событие точки полезно само по себе, даже до посадки.',
            lessonIntro: 'Частая ошибка начинающих заключается в том, что команда маршрута считается завершенной сразу после отправки. На самом деле нужно дождаться отдельного сигнала `POINT_REACHED` и только после него считать задачу выполненной.',
            expectedOutcome: 'Сценарий выполняет подготовку, взлет, полет к точке и по событию `POINT_REACHED` печатает сообщение о достижении цели.',
            builderHint: 'Ветка `POINT_REACHED` должна идти после ветки `TAKEOFF_COMPLETE`, потому что без маршрута событие точки просто не появится.',
            apiFocus: [
                apiFocus('Ev.POINT_REACHED', 'Подтверждает, что маршрут действительно выполнен.', 'if event == Ev.POINT_REACHED then ... end'),
                apiFocus('print(...)', 'В этом уроке лог нужен как подтверждение достижения навигационной цели.', 'print("Точка достигнута")')
            ],
            targetBlockIds: ['lua_ap_push', 'lua_event_callback', 'lua_ap_push', 'lua_event_callback', 'lua_goto_local_point', 'lua_event_callback', 'lua_print', 'lua_callback_open', 'lua_callback_end'],
            blocks: [
                createStatementBlock('lua9-preflight', 'PREFLIGHT', 'ap.push(Ev.MCE_PREFLIGHT)', 'Старт миссии.', 'setup', 'ap.push(Ev.MCE_PREFLIGHT)'),
                createEventBlock('lua9-engines', 'ждать ENGINES_STARTED', 'if event == Ev.ENGINES_STARTED', 'Стартовая ветка FSM.', 'Ev.ENGINES_STARTED'),
                createStatementBlock('lua9-takeoff', 'TAKEOFF', 'ap.push(Ev.MCE_TAKEOFF)', 'Взлет.', 'action', 'ap.push(Ev.MCE_TAKEOFF)'),
                createEventBlock('lua9-complete', 'ждать TAKEOFF_COMPLETE', 'if event == Ev.TAKEOFF_COMPLETE', 'Открывает маршрут.', 'Ev.TAKEOFF_COMPLETE'),
                createStatementBlock('lua9-goto', 'лететь к точке', 'ap.goToLocalPoint(1, 0, 1)', 'Навигационный шаг.', 'action', 'ap.goToLocalPoint(1, 0, 1)'),
                createEventBlock('lua9-point', 'ждать POINT_REACHED', 'if event == Ev.POINT_REACHED', 'Подтверждает достижение маршрута.', 'Ev.POINT_REACHED'),
                createStatementBlock('lua9-print', 'сообщить о точке', 'print("Точка достигнута")', 'Целевое подтверждение урока.', 'check', 'print("Точка достигнута")'),
                createStatementBlock('lua_callback_open', 'открыть callback', 'function callback(event)', 'Открывает обязательную событийную функцию Lua-сценария.', 'setup', 'function callback(event)'),
                createStatementBlock('lua_callback_end', 'закрыть callback', 'end', 'Закрывает область function callback(event).', 'setup', 'end')
            ],
            links: [
                { label: 'Ev.POINT_REACHED', query: 'Ev.POINT_REACHED' },
                { label: 'ap.goToLocalPoint', query: 'ap.goToLocalPoint', previewKey: 'ap.goToLocalPoint' }
            ],
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
end`,
            actionLabel: 'Открыть контроль точки',
            actionQuery: 'Ev.POINT_REACHED ap.goToLocalPoint print',
            actionPreviewKey: 'ap.goToLocalPoint',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Результат маршрута не подтвержден',
                    reason: 'Без отдельной ветки `POINT_REACHED` миссия не показывает, что маршрут действительно завершен.',
                    fix: 'Добавьте обработку `Ev.POINT_REACHED` с подтверждающим действием.'
                }
            ],
            missingBlockDiagnostics: {
                lua_goto_local_point: {
                    kind: 'error',
                    title: 'Нет полета к точке',
                    reason: 'Без маршрута событие `POINT_REACHED` не имеет смысла.',
                    fix: 'Добавьте `goToLocalPoint(...)` после `TAKEOFF_COMPLETE`.'
                },
                lua_print: {
                    kind: 'error',
                    title: 'Нет сообщения о достижении точки',
                    reason: 'Событие маршрута не подтверждено видимым действием.',
                    fix: 'Добавьте `print("Точка достигнута")` в ветку `POINT_REACHED`.'
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
            orderRules: [],
            compile: compileLuaEvents
        },
    ];
}
