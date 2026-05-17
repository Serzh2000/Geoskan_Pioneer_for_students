import { createEventBlock, createStatementBlock, createTimerBlock } from '../lesson-builders.js';
import { compileLuaEvents, compileLuaLinear, compileLuaTimed } from '../lesson-compilers.js';
import { GUIDE_CHAPTER_IDS } from '../curriculum.js';
import { apiFocus } from '../lesson-state-helpers.js';
import type { GuideLesson } from '../types.js';

export function getLuaMissionExpandedLessons(): GuideLesson[] {
    return [
            {
            id: 'lua-landing',
            chapterId: GUIDE_CHAPTER_IDS.mission,
            badge: 'Задание 9',
            title: 'Посадка после подтверждения точки',
            goal: 'Соберите миссию, в которой посадка вызывается только после события `POINT_REACHED`.',
            summary: 'Это предпоследний шаг полной миссии: ученик закрепляет, что завершение маршрута тоже должно быть событийным и подтвержденным.',
            lessonIntro: 'Правильная посадка начинается не просто "когда кажется, что дрон уже долетел", а после события, которое подтверждает достижение нужной координаты. Этот урок делает акцент именно на безопасном завершении сценария.',
            expectedOutcome: 'Сценарий выполняет подготовку, взлет, полет к точке и по `POINT_REACHED` отправляет `LANDING`.',
            builderHint: 'Если `LANDING` стоит в корне или рядом с `TAKEOFF`, это почти всегда означает логическую ошибку.',
            apiFocus: [
                apiFocus('Ev.MCE_LANDING', 'Завершает миссию и должен отправляться только после подтверждения конца маршрута.', 'ap.push(Ev.MCE_LANDING)'),
                apiFocus('Ev.POINT_REACHED', 'Сигнал, который разрешает завершить маршрут посадкой.', 'if event == Ev.POINT_REACHED then ... end')
            ],
            targetBlockIds: ['lua_ap_push', 'lua_event_callback', 'lua_ap_push', 'lua_event_callback', 'lua_goto_local_point', 'lua_event_callback', 'lua_ap_push', 'lua_callback_open', 'lua_callback_end'],
            blocks: [
                createStatementBlock('lua10-preflight', 'PREFLIGHT', 'ap.push(Ev.MCE_PREFLIGHT)', 'Старт подготовки.', 'setup', 'ap.push(Ev.MCE_PREFLIGHT)'),
                createEventBlock('lua10-engines', 'ждать ENGINES_STARTED', 'if event == Ev.ENGINES_STARTED', 'Ветка запуска двигателей.', 'Ev.ENGINES_STARTED'),
                createStatementBlock('lua10-takeoff', 'TAKEOFF', 'ap.push(Ev.MCE_TAKEOFF)', 'Взлет.', 'action', 'ap.push(Ev.MCE_TAKEOFF)'),
                createEventBlock('lua10-complete', 'ждать TAKEOFF_COMPLETE', 'if event == Ev.TAKEOFF_COMPLETE', 'Открывает маршрут.', 'Ev.TAKEOFF_COMPLETE'),
                createStatementBlock('lua10-goto', 'лететь к точке', 'ap.goToLocalPoint(1, 0, 1)', 'Перемещение к цели.', 'action', 'ap.goToLocalPoint(1, 0, 1)'),
                createEventBlock('lua10-point', 'ждать POINT_REACHED', 'if event == Ev.POINT_REACHED', 'Подтверждает завершение маршрута.', 'Ev.POINT_REACHED'),
                createStatementBlock('lua10-land', 'LANDING', 'ap.push(Ev.MCE_LANDING)', 'Безопасное завершение миссии.', 'action', 'ap.push(Ev.MCE_LANDING)'),
                createStatementBlock('lua_callback_open', 'открыть callback', 'function callback(event)', 'Открывает обязательную событийную функцию Lua-сценария.', 'setup', 'function callback(event)'),
                createStatementBlock('lua_callback_end', 'закрыть callback', 'end', 'Закрывает область function callback(event).', 'setup', 'end')
            ],
            links: [
                { label: 'Ev.MCE_LANDING', query: 'Ev.MCE_LANDING' },
                { label: 'Ev.POINT_REACHED', query: 'Ev.POINT_REACHED' }
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
        ap.push(Ev.MCE_LANDING)
    end
end`,
            actionLabel: 'Открыть посадку',
            actionQuery: 'Ev.MCE_LANDING Ev.POINT_REACHED',
            actionPreviewKey: 'ap.push',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Посадка не привязана к событию точки',
                    reason: 'Если отправить `LANDING` раньше, миссия завершится преждевременно и потеряет навигационную логику.',
                    fix: 'Оставьте посадку только в обработчике `POINT_REACHED`.'
                }
            ],
            missingBlockDiagnostics: {
                lua_goto_local_point: {
                    kind: 'error',
                    title: 'Нет маршрута до посадки',
                    reason: 'Урок проверяет завершение именно после полета к точке, а не сразу после взлета.',
                    fix: 'Добавьте `goToLocalPoint(...)` перед обработкой `POINT_REACHED`.'
                },
                lua_ap_push: {
                    kind: 'error',
                    title: 'Не хватает обязательных команд',
                    reason: 'Для урока нужна не только подготовка, но и финальная команда посадки.',
                    fix: 'Соберите полный набор команд автопилота.'
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
        }
    ];
}
