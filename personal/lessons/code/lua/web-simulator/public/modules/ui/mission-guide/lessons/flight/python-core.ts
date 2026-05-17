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

export function getPythonCoreFlightLessons(): GuideLesson[] {
    return [
        {
            id: 'py-arm',
            chapterId: GUIDE_CHAPTER_IDS.flight,
            badge: 'Задание 3',
            title: 'Подготовить двигатели',
            goal: 'Соберите шаг подготовки в Python: вызовите `arm()` и выведите сообщение о готовности.',
            summary: 'Здесь важно понять, что без `arm()` следующие команды полета логически преждевременны.',
            lessonIntro: 'С этого урока начинается работа с полетными командами Python SDK. Прежде чем думать о взлете и маршруте, нужно понять обязательный подготовительный шаг `arm()`.',
            expectedOutcome: 'Скрипт вызывает `pioneer.arm()` и выводит сообщение о том, что двигатели готовы к старту.',
            builderHint: 'Даже если блоки стыкуются, `takeoff()` без `arm()` останется ошибкой логики API.',
            apiFocus: [
                apiFocus('pioneer.arm()', 'Переводит дрон в состояние готовности к полету. Без этого вызова последующие команды взлета преждевременны.', 'pioneer.arm()'),
                apiFocus('print(...)', 'Не управляет дроном, но помогает подтвердить, что нужный шаг в сценарии действительно достигнут.', 'print("Двигатели готовы")')
            ],
            targetBlockIds: ['py_arm', 'py_print'],
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
            chapterId: GUIDE_CHAPTER_IDS.flight,
            badge: 'Задание 4',
            title: 'Взлет с паузой',
            goal: 'Соберите базовый сценарий взлета: `arm()` -> пауза -> `takeoff()`.',
            summary: 'Пауза между подготовкой и взлетом помогает увидеть причинно-следственную связь команд.',
            lessonIntro: 'В этом уроке вы строите минимальный полетный сценарий: подготовка, короткая задержка и взлет. Это хорошая практика для понимания порядка команд и наблюдаемого поведения дрона.',
            expectedOutcome: 'Код вызывает `pioneer.arm()`, затем `time.sleep(1)`, затем `pioneer.takeoff()`.',
            builderHint: 'Если поставить `takeoff()` раньше паузы или вовсе до `arm()`, это будет логическая ошибка даже при корректном синтаксисе.',
            apiFocus: [
                apiFocus('pioneer.arm()', 'Подготавливает двигатели к полету и должен идти первым.', 'pioneer.arm()'),
                apiFocus('time.sleep(1)', 'Дает короткую паузу между подготовкой и взлетом, чтобы переход был наглядным.', 'time.sleep(1)'),
                apiFocus('pioneer.takeoff()', 'Отправляет команду взлета после подготовки.', 'pioneer.takeoff()')
            ],
            targetBlockIds: ['py_arm', 'py_time_sleep', 'py_takeoff'],
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
    ];
}
